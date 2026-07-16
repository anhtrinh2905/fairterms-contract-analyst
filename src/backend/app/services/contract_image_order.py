"""Heuristics for ordering multi-image contract uploads."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.services.gemini_ocr_service import (
    are_pages_near_duplicate,
    merge_markdown_pages_dedup,
    normalize_whitespace,
    trim_overlapping_tail,
)

DEFAULT_MAX_IMAGES = 30

PAGE_NUMBER_RE = re.compile(
    r"(?:Trang|Page)\s*(\d+)\s*(?:/|\s+of\s+|\s*/\s*)\s*(\d+)",
    re.IGNORECASE,
)
ARTICLE_RE = re.compile(r"(?:Điều|ĐIỀU)\s*(\d+)", re.IGNORECASE)
FILENAME_NUMBER_RE = re.compile(r"(\d+)")
TITLE_MARKERS = ("hợp đồng", "cộng hòa", "cộng hòa xã hội chủ nghĩa")
SIGNATURE_MARKERS = ("ký tên", "ký, ghi rõ họ tên", "đại diện bên", "xác nhận của")


class InvalidImageOrderError(ValueError):
    """Raised when client-supplied page_order is invalid."""


@dataclass(frozen=True)
class ImageOrderOutcome:
    ordered_indices: list[int]
    markdown_pages: list[str]
    confidence: float
    warnings: list[str]


def validate_image_count(count: int, max_images: int = DEFAULT_MAX_IMAGES) -> None:
    if count < 2:
        raise ValueError("Cần ít nhất 2 ảnh để ghép hợp đồng.")
    if count > max_images:
        raise ValueError(f"Tối đa {max_images} ảnh mỗi lần tải lên.")


def validate_page_order(page_order: list[int], count: int) -> list[int]:
    if len(page_order) != count:
        raise InvalidImageOrderError("page_order phải có cùng số phần tử với số ảnh.")
    if sorted(page_order) != list(range(count)):
        raise InvalidImageOrderError("page_order phải là hoán vị của chỉ số ảnh (0..n-1).")
    return list(page_order)


def filename_sort_key(filename: str) -> tuple[int, str]:
    stem = filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]
    numbers = [int(match) for match in FILENAME_NUMBER_RE.findall(stem)]
    if numbers:
        return (numbers[0], stem.lower())
    return (0, stem.lower())


def resolve_upload_order(
    count: int,
    filenames: list[str],
    user_order: list[int] | None,
    auto_sort: bool,
) -> list[int]:
    if user_order is not None:
        return validate_page_order(user_order, count)
    indices = list(range(count))
    if not auto_sort:
        return indices
    return sorted(indices, key=lambda index: filename_sort_key(filenames[index]))


def detect_printed_page_number(text: str) -> int | None:
    match = PAGE_NUMBER_RE.search(text)
    if not match:
        return None
    return int(match.group(1))


def extract_article_numbers(text: str) -> list[int]:
    return [int(match) for match in ARTICLE_RE.findall(text)]


def _has_title_marker(text: str) -> bool:
    lowered = normalize_whitespace(text).lower()
    return any(marker in lowered for marker in TITLE_MARKERS)


def _has_signature_marker(text: str) -> bool:
    lowered = normalize_whitespace(text).lower()
    return any(marker in lowered for marker in SIGNATURE_MARKERS)


def _overlap_score(left: str, right: str) -> float:
    left_norm = normalize_whitespace(left)
    right_norm = normalize_whitespace(right)
    if not left_norm or not right_norm:
        return 0.0
    trimmed = trim_overlapping_tail(left, right)
    if are_pages_near_duplicate(trimmed, right):
        return 1.0
    left_tail = left_norm[-80:]
    right_head = right_norm[:80]
    if len(left_tail) < 20 or len(right_head) < 20:
        return 0.0
    if left_tail in right_norm or right_head in left_norm:
        return 0.8
    return 0.0


def score_page_sequence(pages: list[str]) -> float:
    if not pages:
        return 0.0
    if len(pages) == 1:
        return 1.0

    scores: list[float] = []
    if _has_title_marker(pages[0]):
        scores.append(1.0)
    else:
        scores.append(0.5)

    if _has_signature_marker(pages[-1]):
        scores.append(1.0)
    else:
        scores.append(0.6)

    article_sequences = [extract_article_numbers(page) for page in pages]
    flat_articles: list[int] = []
    for numbers in article_sequences:
        flat_articles.extend(numbers)
    if len(flat_articles) >= 2:
        decreases = sum(
            1 for left, right in zip(flat_articles, flat_articles[1:], strict=False) if right < left
        )
        monotonic = 1.0 - min(1.0, decreases / max(len(flat_articles) - 1, 1))
        scores.append(monotonic)
    else:
        scores.append(0.5)

    overlap_scores = [
        _overlap_score(pages[index], pages[index + 1]) for index in range(len(pages) - 1)
    ]
    if overlap_scores:
        scores.append(sum(overlap_scores) / len(overlap_scores))

    return sum(scores) / len(scores)


def _reorder_by_printed_page_numbers(pages: list[str]) -> list[str] | None:
    numbered: list[tuple[int, int, str]] = []
    for index, page in enumerate(pages):
        page_no = detect_printed_page_number(page)
        if page_no is not None:
            numbered.append((page_no, index, page))
    if len(numbered) < max(2, int(len(pages) * 0.7)):
        return None
    numbered.sort(key=lambda item: (item[0], item[1]))
    return [page for _, _, page in numbered]


def _try_adjacent_reorder(pages: list[str]) -> list[str]:
    best_pages = list(pages)
    best_score = score_page_sequence(best_pages)
    improved = True
    while improved:
        improved = False
        for index in range(len(best_pages) - 1):
            candidate = list(best_pages)
            candidate[index], candidate[index + 1] = candidate[index + 1], candidate[index]
            candidate_score = score_page_sequence(candidate)
            if candidate_score > best_score + 0.02:
                best_pages = candidate
                best_score = candidate_score
                improved = True
    return best_pages


def _collect_order_warnings(pages: list[str]) -> list[str]:
    warnings: list[str] = []
    if pages and not _has_title_marker(pages[0]):
        warnings.append("Trang đầu có thể chưa phải trang bìa/tiêu đề hợp đồng.")
    if len(pages) > 1 and not _has_signature_marker(pages[-1]):
        warnings.append("Trang cuối có thể chưa phải phần ký tên.")

    article_sequences = [extract_article_numbers(page) for page in pages]
    flat_articles: list[int] = []
    for numbers in article_sequences:
        flat_articles.extend(numbers)
    for left, right in zip(flat_articles, flat_articles[1:], strict=False):
        if right < left:
            warnings.append(
                f"Thứ tự điều khoản có thể sai (Điều {left} trước Điều {right})."
            )
            break
    for left, right in zip(flat_articles, flat_articles[1:], strict=False):
        if right - left > 1:
            warnings.append(f"Có thể thiếu trang giữa Điều {left} và Điều {right}.")
            break

    for index in range(len(pages) - 1):
        if are_pages_near_duplicate(pages[index], pages[index + 1]):
            warnings.append(f"Ảnh {index + 1} và {index + 2} có nội dung gần trùng nhau.")
            break

    return warnings


def analyze_and_maybe_reorder_pages(
    pages: list[str],
    *,
    user_order_provided: bool,
    auto_sort: bool,
) -> ImageOrderOutcome:
    warnings: list[str] = []
    working = [page.strip() for page in pages if page.strip()]
    if not working:
        return ImageOrderOutcome([], [], 0.0, ["Không trích xuất được nội dung từ ảnh."])

    original_indices = list(range(len(working)))
    reordered = list(working)

    if auto_sort and not user_order_provided:
        by_printed = _reorder_by_printed_page_numbers(reordered)
        if by_printed is not None:
            reordered = by_printed
        else:
            candidate = _try_adjacent_reorder(reordered)
            if score_page_sequence(candidate) > score_page_sequence(reordered) + 0.03:
                reordered = candidate

    confidence = score_page_sequence(reordered)
    warnings.extend(_collect_order_warnings(reordered))

    if user_order_provided:
        confidence = max(confidence, 0.85)
    elif confidence < 0.6:
        warnings.insert(
            0,
            "Hệ thống không chắc thứ tự ảnh đúng — vui lòng kiểm tra lại trước khi phân tích.",
        )

    if reordered != working:
        order_used = list(range(len(reordered)))
    else:
        order_used = original_indices

    return ImageOrderOutcome(
        ordered_indices=order_used,
        markdown_pages=reordered,
        confidence=round(confidence, 3),
        warnings=warnings,
    )


def merge_ordered_pages(pages: list[str]) -> str:
    return merge_markdown_pages_dedup(pages).strip()
