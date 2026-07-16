#!/usr/bin/env python
"""Script to reconstruct digital or scanned legal PDFs into structured Vietnamese Markdown.

Optimized for Vietnamese language processing and RAG indexing structure.
Uses GPT-4o-mini (Vision and Text modes) for OCR correction and formatting.
"""

import argparse
import base64
import json
import logging
import os
import re
import sys
import unicodedata
from pathlib import Path
import yaml

# Ensure backend root is on sys.path
_backend_root = Path(__file__).resolve().parent.parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

try:
    import fitz  # PyMuPDF
    from tqdm import tqdm
except ImportError:
    print("Error: Missing dependencies. Please run 'uv add pymupdf tqdm'")
    sys.exit(1)

from app.core.config import settings
from openai import OpenAI

# Configure logging (use UTF-8 to avoid CP1252 encoding errors on Windows)
_log_stream = open(sys.stdout.fileno(), mode="w", encoding="utf-8", errors="replace", closefd=False)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(_log_stream)],
)
logger = logging.getLogger("pdf_reconstructor")



# ---------------------------------------------------------------------------
# LLM Prompts
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_METADATA = """Bạn là một chuyên gia pháp luật Việt Nam. Nhiệm vụ của bạn là trích xuất thông tin siêu dữ liệu (metadata) từ trang đầu tiên của một văn bản pháp luật dưới dạng JSON.

Hãy trả về một đối tượng JSON duy nhất chứa các trường sau:
1. id: Mã định danh viết thường, dùng dấu gạch dưới thay cho khoảng trắng, không dấu tiếng Việt (ví dụ: luat_nha_o_2023, bo_luat_dan_su_2015).
2. title: Tên chính thức của luật/văn bản (ví dụ: "Luật Nhà ở", "Bộ luật Dân sự").
3. so_hieu: Số hiệu của văn bản (ví dụ: "27/2023/QH15").
4. ngay_ban_hanh: Ngày ban hành định dạng YYYY-MM-DD.
5. ngay_hieu_luc: Ngày có hiệu lực định dạng YYYY-MM-DD.
6. co_quan_ban_hanh: Cơ quan ban hành (ví dụ: "Quốc hội", "Chính phủ").
7. loai_van_ban: Loại văn bản (ví dụ: "Luật", "Nghị định", "Thông tư").
8. linh_vuc: Lĩnh vực pháp luật (ví dụ: "Dân sự", "Đất đai", "Bất động sản").
9. trang_thai: Trạng thái hiệu lực (ví dụ: "Có hiệu lực", "Còn hiệu lực").

Chỉ trả về chuỗi JSON thô, không bọc trong ký tự Markdown ```json."""

SYSTEM_PROMPT_TEXT = """Bạn là một chuyên gia số hóa và định dạng văn bản luật Việt Nam.
Nhiệm vụ của bạn là chuyển đổi văn bản thô (có thể bị lỗi font, lỗi chính tả do trích xuất từ PDF) sang định dạng Markdown sạch sẽ, tuân thủ cấu trúc của hệ thống.

YÊU CẦU ĐỊNH DẠNG:
1. KHÔNG được tự ý thay đổi nội dung luật, không thêm thắt ý kiến cá nhân hay tóm tắt.
2. Sửa toàn bộ lỗi phông chữ tiếng Việt, lỗi chính tả, lỗi khoảng trắng do quá trình trích xuất PDF (ví dụ: lỗi font chữ, mất dấu tiếng Việt, chữ bị dính hoặc cách nhau không đúng).
3. Cấu trúc lại văn bản theo chuẩn Markdown sau:
   - Tên Luật/Văn bản viết ở tiêu đề chính cấp 1 (#) nếu xuất hiện ở trang này.
   - Chương, Mục viết ở cấp 2 (## Chương..., ## Mục...).
   - Các Điều viết ở cấp 3 (### Điều <số>. <Tên Điều>). Ví dụ: ### Điều 1. Phạm vi điều chỉnh
   - Các Khoản viết ở dạng danh sách đánh số dạng '1. ', '2. ' ở dòng mới (không thụt lề).
   - Các Điểm viết dưới dạng 'a) ', 'b) ', 'c) ' thụt lề 3 khoảng trắng so với dòng khoản.
4. Nếu một câu hoặc điều khoản bị ngắt lửng lơ ở cuối trang, hãy viết chính xác nội dung hiển thị trên trang và không cố tự ý hoàn thiện phần bị thiếu.
5. Trả về DUY NHẤT mã Markdown thô, không giải thích, không bọc trong block ```markdown."""

SYSTEM_PROMPT_VISION = """Bạn là một chuyên gia số hóa và định dạng văn bản luật Việt Nam qua hình ảnh.
Nhiệm vụ của bạn là đọc hình ảnh trang PDF được cung cấp (là bản quét PDF) và chuyển đổi chính xác toàn bộ nội dung của trang đó sang định dạng Markdown chuẩn RAG.

YÊU CẦU ĐỊNH DẠNG & ĐỘ CHÍNH XÁC:
1. Đọc kỹ và chính xác từng từ tiếng Việt từ hình ảnh. Tuyệt đối không được viết sai lỗi chính tả hay bỏ sót nội dung nào.
2. Định dạng cấu trúc trang luật theo chuẩn Markdown sau:
   - Tên Luật/Văn bản viết ở tiêu đề chính cấp 1 (#) nếu xuất hiện ở trang này.
   - Chương, Mục viết ở cấp 2 (## Chương..., ## Mục...).
   - Các Điều viết ở cấp 3 (### Điều <số>. <Tên Điều>). Ví dụ: ### Điều 1. Phạm vi điều chỉnh
   - Các Khoản viết ở dạng danh sách đánh số dạng '1. ', '2. ' ở dòng mới (không thụt lề).
   - Các Điểm viết dưới dạng 'a) ', 'b) ', 'c) ' thụt lề 3 khoảng trắng so với dòng khoản.
3. Nếu trang bắt đầu hoặc kết thúc lửng lơ giữa một câu hay một điều luật, hãy giữ nguyên trạng thái lửng lơ đó, không tự ý sáng tạo hay điền nốt câu bị ngắt.
4. Trả về DUY NHẤT mã Markdown thô của trang được chụp, không giải thích, không bọc trong block ```markdown."""



# ---------------------------------------------------------------------------
# Core Helper Functions
# ---------------------------------------------------------------------------

def clean_vietnamese_text(text: str) -> str:
    """Normalize text to Unicode NFC form to standardize Vietnamese diacritics."""
    if not text:
        return ""
    return unicodedata.normalize("NFC", text)


def _normalize_for_match(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s]", " ", text)
    return re.sub(r"\s+", " ", text.lower()).strip()


def has_meaningful_text(text: str) -> bool:
    """Return True when extracted page text is worth sending to the LLM."""
    cleaned = text.strip()
    if not cleaned:
        return False
    if re.fullmatch(r"\d+", cleaned):
        return False
    letters = re.sub(r"[^\w]", "", cleaned, flags=re.UNICODE)
    return len(letters) >= 10


def _extract_h1_title(markdown: str) -> str | None:
    for line in markdown.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line[2:].strip()
    return None


def output_switches_document(output: str, expected_title: str) -> bool:
    """Detect when model output jumps to a different legal document."""
    h1 = _extract_h1_title(output)
    if not h1:
        return False
    return _normalize_for_match(h1) != _normalize_for_match(expected_title)


def output_matches_source(output: str, source: str) -> bool:
    """Check reconstructed output still aligns with the original page text."""
    if not source.strip():
        return True
    norm_out = _normalize_for_match(output)
    norm_src = _normalize_for_match(source)
    src_words = [w for w in re.findall(r"\w+", norm_src) if len(w) > 1]
    if not src_words:
        return True
    key_phrase = " ".join(src_words[:6])
    return key_phrase in norm_out


def validate_page_output(
    page_md: str,
    source_text: str,
    expected_title: str,
    page_num: int,
    mode: str,
) -> str:
    """Validate or fall back to source text when model output looks unreliable."""
    if not page_md.strip():
        if source_text.strip() and mode == "text":
            return f"<!-- FALLBACK PAGE {page_num} -->\n\n{source_text}"
        return page_md

    if output_switches_document(page_md, expected_title):
        if mode == "vision":
            return f"<!-- REJECTED PAGE {page_num}: document title mismatch -->\n\n"
        if source_text.strip():
            return f"<!-- FALLBACK PAGE {page_num} -->\n\n{source_text}"
        return f"<!-- REJECTED PAGE {page_num}: document title mismatch -->\n\n"

    if mode == "text" and source_text.strip() and not output_matches_source(page_md, source_text):
        return f"<!-- FALLBACK PAGE {page_num} -->\n\n{source_text}"

    return page_md


def is_scanned_pdf(doc: fitz.Document, check_pages: int = 5) -> bool:
    """Detect if a PDF is a scanned document (images) or text-based.

    Checks the average character count of the first few pages.
    """
    total_chars = 0
    pages_to_check = min(check_pages, len(doc))
    for i in range(pages_to_check):
        page = doc[i]
        total_chars += len(page.get_text().strip())
    
    avg_chars = total_chars / pages_to_check if pages_to_check > 0 else 0
    # If average characters per page is very low (e.g. < 100), it's likely scanned.
    return avg_chars < 100





def extract_metadata(first_page_text: str, client: OpenAI) -> dict:
    """Use GPT-4o-mini to extract legal metadata from the first page text."""
    first_page_text = clean_vietnamese_text(first_page_text)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_METADATA},
                {"role": "user", "content": f"Dưới đây là văn bản trang đầu:\n\n{first_page_text}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        metadata = json.loads(response.choices[0].message.content)
        return metadata
    except Exception as e:
        logger.error(f"Failed to extract metadata using text LLM: {e}")
        return {}


def extract_metadata_from_image(image_bytes: bytes, client: OpenAI) -> dict:
    """Use GPT-4o-mini to extract legal metadata from the first page image."""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_METADATA},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Trích xuất metadata từ ảnh trang đầu tiên này:"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        metadata = json.loads(response.choices[0].message.content)
        return metadata
    except Exception as e:
        logger.error(f"Failed to extract metadata using vision LLM: {e}")
        return {}


def process_page_text(text: str, page_num: int, client: OpenAI) -> str:
    """Reconstruct a text page using GPT-4o-mini."""
    text = clean_vietnamese_text(text)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_TEXT},
                {"role": "user", "content": f"Trang {page_num}:\n\n{text}"}
            ],
            temperature=0.0
        )
        return clean_vietnamese_text(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"Error processing page {page_num} in text mode: {e}")
        return f"\n\n<!-- LỖI TRANG {page_num}: {e} -->\n\n{text}"


def process_page_vision(image_bytes: bytes, page_num: int, client: OpenAI) -> str:
    """Reconstruct a scanned page using GPT-4o-mini vision model."""
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT_VISION},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Đây là ảnh của Trang {page_num}. Hãy số hóa sang Markdown:"},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.0
        )
        return clean_vietnamese_text(response.choices[0].message.content.strip())
    except Exception as e:
        logger.error(f"Error processing page {page_num} in vision mode: {e}")
        return f"\n\n<!-- LỖI TRANG {page_num} TRONG PHÂN TÍCH ẢNH: {e} -->\n\n"

# ---------------------------------------------------------------------------
# Progress Tracking (Resume Support)
# ---------------------------------------------------------------------------

PROGRESS_FILE_NAME = ".reconstruct_progress.json"


def _load_progress(output_dir: Path, known_pdfs: list[Path] | None = None) -> dict:
    """Load progress state from the output directory.

    If no progress file exists yet, scan existing .md output files to
    auto-detect previously completed reconstructions (from runs before
    the progress-tracking feature was added).
    """
    progress_file = output_dir / PROGRESS_FILE_NAME
    if progress_file.exists():
        try:
            return json.loads(progress_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            logger.warning(f"Could not read progress file, starting fresh: {e}")

    # No progress file → scan existing output files
    progress = _scan_existing_outputs(output_dir, known_pdfs)
    if progress:
        _save_progress(output_dir, progress)
    return progress


def _scan_existing_outputs(output_dir: Path, known_pdfs: list[Path] | None = None) -> dict:
    """Scan existing .md files in output_dir and build progress entries.

    Strategy (in order):
    1. Read YAML frontmatter ``source_pdf`` field (new files have this).
    2. Fallback: fuzzy-match the .md filename stem against known PDF stems
       (handles files from runs before progress tracking was added).
    """
    progress: dict = {}
    md_files = list(output_dir.glob("*.md"))
    if not md_files:
        return progress

    # Build a normalized stem -> pdf_name lookup from known PDFs
    pdf_stem_map: dict[str, str] = {}
    if known_pdfs:
        for p in known_pdfs:
            norm_stem = p.stem.lower().replace(" ", "_").replace("-", "_")
            pdf_stem_map[norm_stem] = p.name

    for md_file in md_files:
        try:
            text = md_file.read_text(encoding="utf-8", errors="replace")
            source_pdf = None

            # Try 1: read source_pdf from YAML frontmatter
            if text.startswith("---"):
                end_idx = text.index("---", 3)
                frontmatter = yaml.safe_load(text[3:end_idx])
                if isinstance(frontmatter, dict):
                    source_pdf = frontmatter.get("source_pdf")

            # Try 2: match md stem against known PDF stems
            if not source_pdf and pdf_stem_map:
                md_stem = md_file.stem.lower().replace(" ", "_").replace("-", "_")
                for pdf_norm_stem, pdf_name in pdf_stem_map.items():
                    # Check if the md_stem is a substring of the pdf stem or vice-versa
                    if md_stem in pdf_norm_stem or pdf_norm_stem in md_stem:
                        source_pdf = pdf_name
                        break

            if source_pdf:
                progress[source_pdf] = {
                    "status": "completed",
                    "pdf_name": source_pdf,
                    "output_file": md_file.name,
                    "total_pages": 0,
                }
        except Exception:
            continue

    if progress:
        logger.info(
            f"🔍 Auto-detected {len(progress)} previously completed file(s) "
            f"from existing outputs (no progress file found)"
        )
    return progress


def _save_progress(output_dir: Path, progress: dict) -> None:
    """Persist progress state to the output directory."""
    progress_file = output_dir / PROGRESS_FILE_NAME
    progress_file.write_text(
        json.dumps(progress, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _pdf_progress_key(pdf_file: Path) -> str:
    """Generate a stable key for tracking a PDF file across runs.

    Uses just the filename (not full path) so the key is stable
    regardless of which working directory the script is invoked from.
    """
    return pdf_file.name


# ---------------------------------------------------------------------------
# CLI Command Execution
# ---------------------------------------------------------------------------

def reconstruct_single_pdf(
    pdf_file: Path,
    output_dir: Path,
    client: OpenAI,
    mode: str,
    max_pages: int | None = None,
    progress: dict | None = None,
) -> None:
    pdf_key = _pdf_progress_key(pdf_file)

    # ── Check resume state ──────────────────────────────────────────
    file_state = (progress or {}).get(pdf_key, {})
    if file_state.get("status") == "completed":
        logger.info(f"⏭ Bỏ qua (đã hoàn thành): {pdf_file.name}")
        return

    logger.info(f"Opening PDF: {pdf_file.name}")
    doc = fitz.open(pdf_file)
    total_pages = len(doc)
    logger.info(f"Total pages: {total_pages}")

    # Determine mode
    if mode == "auto":
        is_scanned = is_scanned_pdf(doc)
        actual_mode = "vision" if is_scanned else "text"
        logger.info(f"Auto-detection classified PDF as: {'SCANNED (vision)' if is_scanned else 'DIGITAL (text)'}")
    else:
        actual_mode = mode
        logger.info(f"Using manual mode: {actual_mode}")

    limit_pages = min(max_pages, total_pages) if max_pages is not None else total_pages
    logger.info(f"Will process {limit_pages} pages.")

    # ── Restore previous partial work if resuming ───────────────────
    start_page = 0
    reconstructed_pages: list[str] = []
    meta_defaults: dict = {}

    if file_state.get("status") == "in_progress":
        start_page = file_state.get("last_completed_page", 0)
        reconstructed_pages = file_state.get("pages", [])
        meta_defaults = file_state.get("metadata", {})
        clean_id = meta_defaults.get("id", pdf_file.stem.lower().replace(" ", "_"))
        logger.info(
            f"▶ Tiếp tục từ trang {start_page + 1}/{limit_pages} "
            f"({len(reconstructed_pages)} trang đã xử lý trước đó)"
        )

    # ── Metadata extraction (only if not resuming) ──────────────────
    if not meta_defaults:
        logger.info("Extracting document metadata for YAML frontmatter...")
        meta: dict = {}
        if actual_mode == "text":
            first_page_text = doc[0].get_text()
            meta = extract_metadata(first_page_text, client)
        else:
            pix = doc[0].get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            meta = extract_metadata_from_image(img_bytes, client)

        meta_defaults = {
            "id": meta.get("id") or Path(pdf_file).stem.lower().replace(" ", "_"),
            "title": clean_vietnamese_text(meta.get("title") or pdf_file.stem),
            "source_pdf": pdf_file.name,
            "so_hieu": clean_vietnamese_text(meta.get("so_hieu") or "Chưa rõ"),
            "ngay_ban_hanh": meta.get("ngay_ban_hanh") or "YYYY-MM-DD",
            "ngay_hieu_luc": meta.get("ngay_hieu_luc") or "YYYY-MM-DD",
            "co_quan_ban_hanh": clean_vietnamese_text(meta.get("co_quan_ban_hanh") or "Quốc hội"),
            "loai_van_ban": clean_vietnamese_text(meta.get("loai_van_ban") or "Luật"),
            "linh_vuc": clean_vietnamese_text(meta.get("linh_vuc") or "Chưa rõ"),
            "trang_thai": clean_vietnamese_text(meta.get("trang_thai") or "Có hiệu lực"),
        }

        clean_id = meta_defaults["id"].lower().strip().replace(" ", "_")
        meta_defaults["id"] = clean_id

        # ── Check if output file already exists (from a previous run) ──
        output_file = output_dir / f"{clean_id}.md"
        if output_file.exists():
            logger.info(f"⏭ Bỏ qua (file output đã tồn tại): {output_file.name} ← {pdf_file.name}")
            if progress is not None:
                progress[pdf_key] = {
                    "status": "completed",
                    "pdf_name": pdf_file.name,
                    "output_file": output_file.name,
                    "total_pages": 0,
                }
                _save_progress(output_dir, progress)
            return

    # ── Process pages (with per-page checkpointing) ─────────────────
    logger.info(f"Processing pages in {actual_mode.upper()} mode...")

    for i in tqdm(range(start_page, limit_pages), desc=f"Số hóa {pdf_file.name}",
                  initial=start_page, total=limit_pages):
        page = doc[i]
        page_num = i + 1

        if actual_mode == "text":
            page_text = page.get_text()
            page_md = process_page_text(page_text, page_num, client)
        else:
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            page_md = process_page_vision(img_bytes, page_num, client)

        if page_md.strip():
            reconstructed_pages.append(clean_vietnamese_text(page_md))

        # ── Save checkpoint after every page ────────────────────────
        if progress is not None:
            progress[pdf_key] = {
                "status": "in_progress",
                "pdf_name": pdf_file.name,
                "last_completed_page": i + 1,
                "total_pages": limit_pages,
                "metadata": meta_defaults,
                "pages": reconstructed_pages,
            }
            _save_progress(output_dir, progress)

    # ── Assemble final content ──────────────────────────────────────
    assembled_body = "\n\n".join(reconstructed_pages)

    yaml_header = yaml.dump(meta_defaults, allow_unicode=True, sort_keys=False).strip()
    final_output = f"---\n{yaml_header}\n---\n\n{assembled_body}\n"

    clean_id = meta_defaults["id"]
    output_file = output_dir / f"{clean_id}.md"
    logger.info(f"Writing reconstructed Markdown to: {output_file.absolute()}")
    output_file.write_text(final_output, encoding="utf-8")

    # ── Mark as completed ───────────────────────────────────────────
    if progress is not None:
        progress[pdf_key] = {
            "status": "completed",
            "pdf_name": pdf_file.name,
            "output_file": str(output_file.name),
            "total_pages": limit_pages,
        }
        _save_progress(output_dir, progress)

    logger.info(f"✅ PDF reconstruction completed successfully for: {pdf_file.name}!")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reconstruct legal PDF files (digital or scans) into RAG-compliant Vietnamese Markdown."
    )
    parser.add_argument(
        "pdf_path",
        type=str,
        help="Path to the source PDF file or a directory containing multiple PDF files."
    )
    parser.add_argument(
        "-o", "--output-dir",
        type=str,
        default=None,
        help="Target folder to save the Markdown output (defaults to backend's app/rag/data)."
    )
    parser.add_argument(
        "--mode",
        choices=["auto", "text", "vision"],
        default="auto",
        help="PDF processing mode: 'text' for digital PDFs, 'vision' for scanned PDFs, 'auto' for auto-detection."
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Maximum pages to process per PDF file (useful for testing and debugging)."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        default=False,
        help="Reset progress tracking and re-process all files from scratch."
    )
    args = parser.parse_args()

    input_path = Path(args.pdf_path)
    if not input_path.exists():
        logger.error(f"Input path not found: {input_path}")
        sys.exit(1)

    # Initialize OpenAI Client using keys from settings
    if not settings.openai_api_key:
        logger.error("OPENAI_API_KEY is not set in settings/environment variables.")
        sys.exit(1)

    client = OpenAI(api_key=settings.openai_api_key)

    # Set output directory
    if args.output_dir:
        output_dir = Path(args.output_dir)
    else:
        # Default target dir: backend/app/rag/data
        output_dir = _backend_root / "app" / "rag" / "data"

    output_dir.mkdir(parents=True, exist_ok=True)

    # ── Collect PDF file list ───────────────────────────────────────
    pdf_files: list[Path] = []
    if input_path.is_file():
        if input_path.suffix.lower() != ".pdf":
            logger.error(f"File is not a PDF: {input_path}")
            sys.exit(1)
        pdf_files = [input_path]
    elif input_path.is_dir():
        pdf_files = list(input_path.glob("**/*.pdf")) + list(input_path.glob("**/*.PDF"))
        pdf_files = sorted(set(pdf_files), key=lambda p: p.name)
        if not pdf_files:
            logger.warning(f"No PDF files found in directory: {input_path}")
            sys.exit(0)

    # ── Load or reset progress ──────────────────────────────────────
    if args.reset:
        progress: dict = {}
        progress_file = output_dir / PROGRESS_FILE_NAME
        if progress_file.exists():
            progress_file.unlink()
            logger.info("🗑 Progress file deleted. Re-processing all files.")
    else:
        progress = _load_progress(output_dir, known_pdfs=pdf_files)
        if progress:
            completed = sum(1 for v in progress.values() if v.get("status") == "completed")
            in_progress = sum(1 for v in progress.values() if v.get("status") == "in_progress")
            logger.info(
                f"📋 Loaded progress: {completed} completed, {in_progress} in-progress"
            )

    # ── Process PDFs ────────────────────────────────────────────────
    logger.info(f"Found {len(pdf_files)} PDF file(s) to process.")
    for pdf_file in pdf_files:
        try:
            logger.info(f"Processing PDF file: {pdf_file.name}")
            reconstruct_single_pdf(pdf_file, output_dir, client, args.mode, args.max_pages, progress)
        except Exception as e:
            logger.error(f"Failed to process {pdf_file.name}: {e}")

    # ── Final summary ───────────────────────────────────────────────
    completed = sum(1 for v in progress.values() if v.get("status") == "completed")
    in_progress = sum(1 for v in progress.values() if v.get("status") == "in_progress")
    logger.info(f"🏁 Done — {completed} completed, {in_progress} in-progress (will resume on next run)")


if __name__ == "__main__":
    main()
