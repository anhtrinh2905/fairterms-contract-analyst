"""Parse structured contract JSON from markdown (all extraction sources)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import NamedTuple

from app.services.contract_structuring_service import (
    ContractClause,
    ContractEquipmentItem,
    ContractInfo,
    ContractParty,
    StructuredContract,
)
from app.services.structured_field_normalize import is_placeholder_value


class ArticleMatch(NamedTuple):
    start: int
    end: int
    article_no: str
    title: str | None

ARTICLE_HEADING_SPECS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(
            r"^(?:#{1,6}\s*)?(ĐIỀU|Điều)\s*(\d+)\s*[:：.\-]?\s*(.*)$",
            re.IGNORECASE | re.MULTILINE,
        ),
        "dieu",
    ),
    (
        re.compile(
            r"^(?:#{1,6}\s*)?(CHƯƠNG|Chương)\s*([IVXLC\d]+)?\s*[:：.\-]?\s*(.*)$",
            re.IGNORECASE | re.MULTILINE,
        ),
        "chuong",
    ),
    (
        re.compile(
            r"^(?:#{1,6}\s*)?(MỤC|Mục)\s*(\d+)\s*[:：.\-]?\s*(.*)$",
            re.IGNORECASE | re.MULTILINE,
        ),
        "muc",
    ),
    (
        re.compile(
            r"^(?:#{1,6}\s*)?(PHỤ LỤC|Phụ lục)\s*([IVXLC\d]*)?\s*[:：.\-]?\s*(.*)$",
            re.IGNORECASE | re.MULTILINE,
        ),
        "phu_luc",
    ),
)
# Sub-item markers inside an article body (1.1, a), a., (a), Điểm a, 1), bullets, …)
CLAUSE_ITEM_RE = re.compile(
    r"^(?:"
    r"\d+\.\d+"
    r"|[a-z]\)"
    r"|[a-z]\."
    r"|\([a-z]\)"
    r"|(?:điểm|Điểm)\s+[a-z]\b"
    r"|\d+\)"
    r"|[-•*–]\s+"
    r")\s+",
    re.IGNORECASE,
)
# Broader hint detector — triggers Gemini when local split missed obvious list lines.
LIST_MARKER_HINT_RE = re.compile(
    r"^(?:"
    r"\d+\.\d+"
    r"|[a-z][.)]"
    r"|\([a-z]\)"
    r"|\d+\)"
    r"|[-•*–]"
    r"|(?:điểm|Điểm)\s+[a-z]\b"
    r")",
    re.IGNORECASE,
)
PARTY_A_RE = re.compile(
    r"(BÊN\s+CHO\s+THUÊ|BÊN\s+BÁN|BÊN\s+A)\b",
    re.IGNORECASE,
)
PARTY_B_RE = re.compile(
    r"(BÊN\s+THUÊ|BÊN\s+MUA|BÊN\s+B)\b",
    re.IGNORECASE,
)
PREAMBLE_MAX_CHARS = 8000

# Token nhận diện cột bảng phụ lục thiết bị. Tiêu đề cột trong hợp đồng thực tế
# rất đa dạng: "Tên thiết bị", "Hạng mục bàn giao", "Tài sản", cột tình trạng có
# thể là "Tình trạng" hoặc "Ghi chú".
_EQUIPMENT_NAME_TOKENS = (
    "tên",
    "thiết bị",
    "đồ đạc",
    "vật dụng",
    "vật tư",
    "hạng mục",
    "tài sản",
    "nội dung",
    "danh mục",
)
_EQUIPMENT_QTY_TOKENS = ("số lượng", "sl", "qty", "s.lượng")
_EQUIPMENT_CONDITION_TOKENS = ("tình trạng", "hiện trạng", "ghi chú", "mô tả")


@dataclass(frozen=True)
class StructuringNeeds:
    method: str
    needs_metadata_llm: bool
    needs_clauses_llm: bool
    needs_full_llm: bool


def parse_contract_structure(markdown: str) -> StructuredContract:
    """Parse markdown into structured fields; empty values when not found."""
    text = markdown.strip()
    if not text:
        return StructuredContract(
            contract_info=ContractInfo(),
            party_a=ContractParty(),
            party_b=ContractParty(),
            appendix_equipment=[],
            clauses=[],
        )

    return StructuredContract(
        contract_info=parse_contract_info(text),
        party_a=parse_party_block(text, party="a"),
        party_b=parse_party_block(text, party="b"),
        appendix_equipment=parse_equipment_tables(text),
        clauses=parse_clauses_from_markdown(text),
    )


def assess_structuring_needs(
    structured: StructuredContract,
    markdown: str,
    *,
    contract_kind: str | None = None,
) -> StructuringNeeds:
    text = markdown.strip()
    has_clauses = bool(structured.clauses)
    has_parties = bool(structured.party_a.full_name and structured.party_b.full_name)
    has_articles_in_text = _markdown_has_articles(text)
    clauses_empty_items = has_clauses and all(not clause.items for clause in structured.clauses)
    clauses_weak_parse = has_clauses and _markdown_clauses_weakly_parsed(text, structured.clauses)

    needs_full_llm = not has_clauses and not has_parties and not _has_any_metadata(structured)
    needs_clauses_llm = (
        (has_articles_in_text and not has_clauses)
        or (has_articles_in_text and clauses_empty_items)
        or clauses_weak_parse
    )
    needs_metadata_llm = False if needs_full_llm else _metadata_has_gaps(
        text, structured, contract_kind=contract_kind
    )

    if needs_full_llm:
        method = "llm_full"
    elif needs_metadata_llm and needs_clauses_llm:
        method = "hybrid_both"
    elif needs_metadata_llm:
        method = "hybrid"
    elif needs_clauses_llm:
        method = "hybrid_clauses"
    else:
        method = "local"

    return StructuringNeeds(
        method=method,
        needs_metadata_llm=needs_metadata_llm,
        needs_clauses_llm=needs_clauses_llm,
        needs_full_llm=needs_full_llm,
    )


def try_structure_contract_local(markdown: str) -> StructuredContract | None:
    """Return structured contract when local parse is fully sufficient; else None."""
    text = markdown.strip()
    if not text:
        return None
    structured = parse_contract_structure(text)
    needs = assess_structuring_needs(structured, text)
    if needs.method != "local":
        return None
    return structured


def parse_clauses_from_markdown(markdown: str) -> list[ContractClause]:
    matches = find_article_matches(markdown)
    if not matches:
        return []

    clauses: list[ContractClause] = []
    for index, match in enumerate(matches):
        start = match.end
        end = matches[index + 1].start if index + 1 < len(matches) else len(markdown)
        body = markdown[start:end].strip()
        items = parse_clause_items(body)
        if not items and body:
            items = [body]
        clauses.append(
            ContractClause(article_no=match.article_no, title=match.title, items=items)
        )
    return clauses


def find_article_matches(markdown: str) -> list[ArticleMatch]:
    found: list[ArticleMatch] = []
    for pattern, kind in ARTICLE_HEADING_SPECS:
        for match in pattern.finditer(markdown):
            article_no, title = _article_heading_from_match(match, kind)
            found.append(
                ArticleMatch(
                    start=match.start(),
                    end=match.end(),
                    article_no=article_no,
                    title=title,
                )
            )
    found.sort(key=lambda item: item.start)
    return found


def _article_heading_from_match(match: re.Match[str], kind: str) -> tuple[str, str | None]:
    if kind == "dieu":
        article_no = f"ĐIỀU {match.group(2)}"
        title = match.group(3)
    elif kind == "chuong":
        number = (match.group(2) or "").strip()
        article_no = f"CHƯƠNG {number}".strip() if number else "CHƯƠNG"
        title = match.group(3)
    elif kind == "muc":
        article_no = f"MỤC {match.group(2)}"
        title = match.group(3)
    else:
        number = (match.group(2) or "").strip()
        article_no = f"PHỤ LỤC {number}".strip() if number else "PHỤ LỤC"
        title = match.group(3)
    title = (title or "").strip().rstrip(":").strip() or None
    return article_no, title


def parse_clause_items(body: str) -> list[str]:
    items: list[str] = []
    current: list[str] = []

    def flush() -> None:
        if current:
            items.append(" ".join(current).strip())

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            flush()
            current = []
            continue
        if CLAUSE_ITEM_RE.match(line):
            flush()
            current = [line]
        elif current:
            current.append(line)
        else:
            current = [line]
    flush()
    return [item for item in items if item]


def parse_party_block(markdown: str, *, party: str) -> ContractParty:
    if party == "a":
        start_re = PARTY_A_RE
        end_re = PARTY_B_RE
        default_label = "Bên cho thuê (Bên A)"
    else:
        start_re = PARTY_B_RE
        end_re = re.compile(r"(Hai bên|##\s*ĐIỀU|ĐIỀU\s+\d+)", re.IGNORECASE)
        default_label = "Bên thuê (Bên B)"

    start_match = start_re.search(markdown)
    if not start_match:
        return ContractParty(role_label=default_label)

    start = start_match.start()
    end_match = end_re.search(markdown, start_match.end())
    block = markdown[start : end_match.start() if end_match else len(markdown)]

    role_line = block.splitlines()[0].strip() if block else default_label
    return ContractParty(
        role_label=role_line or default_label,
        full_name=_field(block, r"Họ và tên\s*[:：]\s*([^\n]+)"),
        id_number=_normalize_id(_field(block, r"CCCD(?:\s+số)?\s*[:：]\s*([\d\s]+)")),
        id_issue_date=_field(block, r"Ngày cấp\s*[:：]\s*([0-9./\-]+)"),
        id_issue_place=_field(block, r"Nơi cấp\s*[:：]\s*([^\n]+)"),
        phone=_field(block, r"(?:Điện thoại|SĐT|SDT)(?:\s+liên hệ)?\s*[:：]\s*([^\n]+)"),
        permanent_address=_field(
            block,
            r"(?:Địa chỉ thường trú|Địa chỉ)\s*[:：]\s*([^\n]+)",
        ),
    )


def parse_contract_info(markdown: str) -> ContractInfo:
    title_match = re.search(
        r"(HỢP ĐỒNG[^\n]+|Hợp đồng[^\n]+)",
        markdown,
        re.IGNORECASE,
    )
    contract_type = title_match.group(1).strip() if title_match else None

    contract_number = _field(markdown, r"Số\s*[:：]\s*([^\n]+)")
    sign_date = _parse_sign_date(markdown)

    term_text = (
        _field(markdown, r"Thời hạn thuê\s*(?:[:：]|là)\s*([^\n.]+(?:\d{4})?[^\n.]*)")
        or _field(
            markdown,
            r"thời hạn\s+(?:thuê\s+)?(?:là\s+)?(\d+[^\n.]*(?:tháng|năm)[^\n.]*)",
            flags=re.IGNORECASE,
        )
    )

    rent_price = (
        _field(
            markdown,
            r"Giá thuê[^:：\n]*[:：]\s*([0-9.,\s]+(?:VNĐ|đồng|đ)[^\n.]*)",
        )
        or _field(markdown, r"giá thuê[^:：\n]*[:：]\s*([^\n]+)", flags=re.IGNORECASE)
    )

    sale_price = (
        _field(
            markdown,
            r"Giá (?:bán|chuyển nhượng)[^:：\n]*[:：]\s*([0-9.,\s]+(?:VNĐ|đồng|đ)[^\n.]*)",
            flags=re.IGNORECASE,
        )
        or _field(
            markdown,
            r"giá (?:bán|chuyển nhượng)[^:：\n]*[:：]\s*([^\n]+)",
            flags=re.IGNORECASE,
        )
        or _field(
            markdown,
            r"thành tiền[^:：\n]*[:：]\s*([0-9.,\s]+(?:VNĐ|đồng|đ)[^\n.]*)",
            flags=re.IGNORECASE,
        )
    )

    if not rent_price and sale_price:
        rent_price = None

    payment_schedule = _extract_payment_schedule(markdown)
    certificate_no = _field(
        markdown,
        r"(?:GCN|Giấy chứng nhận)[^\n]{0,40}(?:số|Số)\s*[:：]?\s*([^\n,;]+)",
        flags=re.IGNORECASE,
    )
    certificate_issue = _field(
        markdown,
        r"(?:GCN|Giấy chứng nhận)[^\n]{0,80}(?:cấp|Cấp)\s+ngày\s+([0-9./\-]+)",
        flags=re.IGNORECASE,
    )
    notarization = _field(
        markdown,
        r"(?:Văn phòng công chứng|Công chứng viên)[^\n]{0,120}",
        flags=re.IGNORECASE,
    )
    thua_dat_so = _field(markdown, r"[Tt]hửa đất\s*(?:số\s*)?[:：]?\s*([^.\n,;]+)")
    to_ban_do_so = _field(markdown, r"[Tt]ờ bản đồ\s*(?:số\s*)?[:：]?\s*([^.\n,;]+)")
    muc_dich_su_dung = _field(
        markdown,
        r"[Mm]ục đích sử dụng\s*[:：]?\s*([^\n,;]+)",
        flags=re.IGNORECASE,
    )
    can_ho_so = _field(
        markdown,
        r"[Cc]ăn hộ\s*(?:số\s*)?[:：]?\s*([^\n,;]+)",
        flags=re.IGNORECASE,
    ) or _field(markdown, r"[Cc]an ho\s*(?:so\s*)?[:：]?\s*([^\n,;]+)", flags=re.IGNORECASE)
    toa_nha = _field(
        markdown,
        r"(?:[Tt]òa|[Tt]oa|[Tt]háp|[Tt]hap|[Bb]lock)\s*[:：]?\s*([^\n,;]+)",
        flags=re.IGNORECASE,
    )

    deposit = _extract_deposit(markdown)

    property_address = _extract_property_address(markdown)

    area = (
        _field(markdown, r"[Dd]iện tích(?:\s+\w+)?\s*[:：]\s*([^\n,;(]+)", flags=re.IGNORECASE)
        or _field(markdown, r"[Dd]iện tích\s*[:：]\s*([^\n]+)", flags=re.IGNORECASE)
    )

    return ContractInfo(
        contract_type=contract_type,
        contract_number=contract_number,
        sign_date=sign_date,
        term_text=term_text,
        rent_price=rent_price,
        sale_price=sale_price,
        deposit=deposit,
        area=area,
        property_address=property_address,
        payment_schedule=payment_schedule,
        certificate_no=certificate_no,
        certificate_issue=certificate_issue,
        notarization=notarization,
        thua_dat_so=thua_dat_so,
        to_ban_do_so=to_ban_do_so,
        muc_dich_su_dung=muc_dich_su_dung,
        can_ho_so=can_ho_so,
        toa_nha=toa_nha,
    )


def parse_equipment_tables(markdown: str) -> list[ContractEquipmentItem]:
    items: list[ContractEquipmentItem] = []
    for table_block in _iter_markdown_tables(markdown):
        rows = _parse_markdown_table_rows(table_block)
        if len(rows) < 2:
            continue
        header = [cell.lower() for cell in rows[0]]
        if not _looks_like_equipment_table(header):
            continue
        name_idx = _column_index(header, _EQUIPMENT_NAME_TOKENS)
        qty_idx = _column_index(header, _EQUIPMENT_QTY_TOKENS)
        cond_idx = _column_index(header, _EQUIPMENT_CONDITION_TOKENS)
        stt_idx = _column_index(header, ("stt", "#", "no"))
        for row in rows[1:]:
            if _is_separator_row(row):
                continue
            name = row[name_idx].strip() if name_idx is not None and name_idx < len(row) else ""
            if not name or name.lower() in {"stt", "---"}:
                continue
            quantity = _parse_int(row[qty_idx]) if qty_idx is not None and qty_idx < len(row) else None
            condition = (
                row[cond_idx].strip() if cond_idx is not None and cond_idx < len(row) else None
            ) or None
            index = _parse_int(row[stt_idx]) if stt_idx is not None and stt_idx < len(row) else None
            items.append(
                ContractEquipmentItem(
                    index=index,
                    name=name,
                    quantity=quantity,
                    condition=condition,
                )
            )
    return items


def _extract_deposit(markdown: str) -> str | None:
    _AMOUNT = r"[0-9][0-9.,\s]*(?:VNĐ|đồng|đ)\b[^\n,;.(]*"
    for pattern in [
        rf"tiền (?:đặt )?cọc\s*(?:là\s*)?[:：]\s*({_AMOUNT})",
        rf"(?:đặt )?cọc\s+là\s+({_AMOUNT})",
        rf"khoản tiền đặt cọc[\s\S]{{0,200}}?({_AMOUNT})",
        rf"tiền cọc là\s*[:：]?\s*({_AMOUNT})",
    ]:
        m = re.search(pattern, markdown, re.IGNORECASE)
        if m:
            return re.sub(r"\s+", " ", m.group(1).strip())
    return None


def _extract_property_address(markdown: str) -> str | None:
    patterns = [
        r"tại địa chỉ\s*[:：]\s*((?:[^\n.]+(?:\n(?![#0-9])[^\n.]+)*))",
        r"địa chỉ (?:thửa đất|nhà|bất động sản)\s*[:：]\s*([^\n.]+)",
        r"quyền sử dụng đất tại\s*([^\n.]+)",
        r"(?:thuê|mua|bán|chuyển nhượng)\s+(?:căn hộ|nhà|đất|quyền)[^\n]{0,20}tại\s*([^\n.]+)",
        r"căn hộ[^.\n]{0,120}tại\s+([^\n.]+)",
        r"diện tích[^.\n]{0,40}tại\s+([^\n.]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, markdown, re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1).strip())

    # Legacy apartment-specific fallback
    m = re.search(
        r"(?:thuê|mua)\s+căn\s+hộ\s+(?:số\s+)?"
        r"(\S+(?:[,\s]+[^.]{3,60}){1,6}?(?:Quận|Huyện|TP\.|tỉnh|Phường|Xã)[^.\n]{0,80})",
        markdown,
        re.IGNORECASE,
    )
    if m:
        return re.sub(r"\s+", " ", m.group(1).strip().rstrip(","))
    return None


def _extract_payment_schedule(markdown: str) -> list[str]:
    items: list[str] = []
    for match in re.finditer(
        r"(?:Đợt|đợt)\s*(\d+)[^\n]{0,120}(?:\d+[\d.,\s]*(?:%|VNĐ|đồng|đ))",
        markdown,
        flags=re.IGNORECASE,
    ):
        line = re.sub(r"\s+", " ", match.group(0).strip())
        if line:
            items.append(line)
    return items


def _field(text: str, pattern: str, *, flags: int = 0) -> str | None:
    match = re.search(pattern, text, flags | re.IGNORECASE)
    if not match:
        return None
    value = match.group(1).strip()
    if is_placeholder_value(value):
        return None
    return value or None


def _parse_sign_date(markdown: str) -> str | None:
    match = re.search(
        r"ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})",
        markdown,
        re.IGNORECASE,
    )
    if not match:
        return None
    return f"{int(match.group(1)):02d}/{int(match.group(2)):02d}/{match.group(3)}"


def _normalize_id(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", "", value)
    return cleaned or None


def _iter_markdown_tables(markdown: str):
    lines = markdown.splitlines()
    block: list[str] = []
    for line in lines:
        if "|" in line:
            block.append(line)
            continue
        if block:
            yield "\n".join(block)
            block = []
    if block:
        yield "\n".join(block)


def _parse_markdown_table_rows(table: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in table.splitlines():
        if "|" not in line:
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(cells)
    return rows


def _is_separator_row(row: list[str]) -> bool:
    return all(re.fullmatch(r"-+", cell.replace(" ", "")) or not cell for cell in row)


def _looks_like_equipment_table(header: list[str]) -> bool:
    joined = " ".join(header)
    has_name = any(token in joined for token in _EQUIPMENT_NAME_TOKENS)
    has_qty = any(token in joined for token in _EQUIPMENT_QTY_TOKENS)
    has_condition = any(token in joined for token in _EQUIPMENT_CONDITION_TOKENS)
    return has_name and (has_qty or has_condition)


def _column_index(header: list[str], candidates: tuple[str, ...]) -> int | None:
    for index, cell in enumerate(header):
        for candidate in candidates:
            if candidate in cell:
                return index
    return None


def _parse_int(value: str | None) -> int | None:
    if not value:
        return None
    digits = re.sub(r"[^\d]", "", value)
    return int(digits) if digits else None


def extract_preamble_slice(
    markdown: str,
    *,
    max_chars: int = PREAMBLE_MAX_CHARS,
    contract_kind: str | None = None,
) -> str:
    matches = find_article_matches(markdown)
    if not matches:
        text = markdown.strip()
        return text[:max_chars] if len(text) > max_chars else text

    phu_luc_matches = [m for m in matches if m.article_no.startswith("PHỤ LỤC")]
    regular_matches = [m for m in matches if not m.article_no.startswith("PHỤ LỤC")]

    # Preamble: everything before the first regular article
    first_regular = regular_matches[0] if regular_matches else matches[0]
    preamble = markdown[: first_regular.start].strip()

    # Include early articles (rent/deposit for lease; price/payment for sale)
    kind = (contract_kind or "").lower()
    if "mua_ban" in kind or "dat" in kind:
        early_article_limit = 6
    else:
        early_article_limit = 4
    if regular_matches:
        if len(regular_matches) > early_article_limit:
            early_end = regular_matches[early_article_limit].start
        elif phu_luc_matches:
            early_end = phu_luc_matches[0].start
        else:
            early_end = len(markdown)
        early_articles = markdown[first_regular.start: early_end].strip()
    else:
        early_articles = ""

    # Include every PHỤ LỤC section (appendix equipment tables are at the end)
    appendix_parts: list[str] = []
    for plu_match in phu_luc_matches:
        idx = matches.index(plu_match)
        next_start = matches[idx + 1].start if idx + 1 < len(matches) else len(markdown)
        appendix_parts.append(markdown[plu_match.start: next_start].strip())

    parts = [p for p in [preamble, early_articles, *appendix_parts] if p]
    combined = "\n\n".join(parts)
    return combined[:max_chars] if len(combined) > max_chars else combined


def extract_clauses_slice(markdown: str) -> str:
    matches = find_article_matches(markdown)
    if matches:
        return markdown[matches[0].start :].strip()
    return markdown.strip()


def merge_metadata_prefer_gemini(
    local: StructuredContract,
    gemini: StructuredContract,
) -> StructuredContract:
    """Merge with Gemini metadata as primary; keep locally parsed clauses."""
    merged = local.model_copy(deep=True)
    merged.contract_info = _prefer_overlay_contract_info(gemini.contract_info, local.contract_info)
    merged.party_a = _prefer_overlay_party(gemini.party_a, local.party_a)
    merged.party_b = _prefer_overlay_party(gemini.party_b, local.party_b)
    if gemini.appendix_equipment:
        merged.appendix_equipment = gemini.appendix_equipment
    return merged


def merge_structured_contract(
    base: StructuredContract,
    *,
    metadata: StructuredContract | None = None,
    clauses: list[ContractClause] | None = None,
) -> StructuredContract:
    merged = base.model_copy(deep=True)
    if metadata is not None:
        merged.contract_info = _merge_contract_info(merged.contract_info, metadata.contract_info)
        merged.party_a = _merge_party(merged.party_a, metadata.party_a)
        merged.party_b = _merge_party(merged.party_b, metadata.party_b)
        if metadata.appendix_equipment:
            merged.appendix_equipment = metadata.appendix_equipment
    if clauses is not None:
        merged.clauses = clauses
    return merged


def _merge_party(base: ContractParty, overlay: ContractParty) -> ContractParty:
    data = base.model_dump()
    for key, value in overlay.model_dump().items():
        if value not in (None, "", []):
            if data.get(key) in (None, "", []):
                data[key] = value
    return ContractParty.model_validate(data)


def _merge_contract_info(base: ContractInfo, overlay: ContractInfo) -> ContractInfo:
    data = base.model_dump()
    for key, value in overlay.model_dump().items():
        if value not in (None, "", []):
            if data.get(key) in (None, "", []):
                data[key] = value
    return ContractInfo.model_validate(data)


def _prefer_overlay_contract_info(primary: ContractInfo, fallback: ContractInfo) -> ContractInfo:
    data: dict[str, object] = {}
    for key in ContractInfo.model_fields:
        primary_value = getattr(primary, key)
        fallback_value = getattr(fallback, key)
        if primary_value not in (None, "", []):
            data[key] = primary_value
        else:
            data[key] = fallback_value
    return ContractInfo.model_validate(data)


def _prefer_overlay_party(primary: ContractParty, fallback: ContractParty) -> ContractParty:
    data: dict[str, object] = {}
    for key in ContractParty.model_fields:
        primary_value = getattr(primary, key)
        fallback_value = getattr(fallback, key)
        if primary_value not in (None, "", []):
            data[key] = primary_value
        else:
            data[key] = fallback_value
    return ContractParty.model_validate(data)


def _markdown_has_articles(markdown: str) -> bool:
    return bool(find_article_matches(markdown))


def _markdown_clauses_weakly_parsed(markdown: str, clauses: list[ContractClause]) -> bool:
    matches = find_article_matches(markdown)
    if not matches or len(matches) != len(clauses):
        return False
    for index, match in enumerate(matches):
        start = match.end
        end = matches[index + 1].start if index + 1 < len(matches) else len(markdown)
        body = markdown[start:end].strip()
        if _clause_items_incomplete(body, clauses[index].items):
            return True
    return False


def _clause_items_incomplete(body: str, items: list[str]) -> bool:
    lines = [line.strip() for line in body.splitlines() if line.strip()]
    if len(lines) < 2:
        return False
    hint_count = sum(1 for line in lines if LIST_MARKER_HINT_RE.match(line))
    if hint_count < 2:
        return False
    if len(items) < hint_count:
        return True
    if len(items) == 1 and items[0].strip() == body.strip():
        return True
    return False


def _has_any_metadata(structured: StructuredContract) -> bool:
    info = structured.contract_info
    return bool(
        info.contract_type
        or info.contract_number
        or info.sign_date
        or info.rent_price
        or info.sale_price
        or info.deposit
        or info.property_address
        or info.thua_dat_so
        or info.certificate_no
    )


def _metadata_has_gaps(
    markdown: str,
    structured: StructuredContract,
    *,
    contract_kind: str | None = None,
) -> bool:
    info = structured.contract_info
    kind = (contract_kind or "").lower()
    is_sale = "mua_ban" in kind or "dat" in kind
    is_lease = "cho_thue" in kind or ("thue" in kind and "can_ho" not in kind)

    if not structured.party_a.full_name or not structured.party_b.full_name:
        return True
    if re.search(r"\bcọc\b", markdown, re.IGNORECASE) and not info.deposit:
        return True
    if re.search(r"giá thuê", markdown, re.IGNORECASE) and not info.rent_price:
        return True
    if re.search(r"giá (?:bán|chuyển nhượng)|thành tiền", markdown, re.IGNORECASE):
        if not info.sale_price and not info.rent_price:
            return True
    if re.search(r"đợt\s*\d+", markdown, re.IGNORECASE) and not info.payment_schedule:
        return True
    if re.search(r"căn hộ\s*số|can ho so", markdown, re.IGNORECASE) and not info.can_ho_so:
        return True
    if re.search(r"tòa|toa|tháp|block", markdown, re.IGNORECASE) and not info.toa_nha:
        return True
    if is_sale and re.search(r"GCN|giấy chứng nhận", markdown, re.IGNORECASE) and not info.certificate_no:
        return True
    if re.search(r"tại địa chỉ|địa chỉ", markdown, re.IGNORECASE) and not info.property_address:
        return True
    if re.search(r"Số\s*[:：]", markdown) and not info.contract_number:
        return True
    if re.search(r"ngày\s+\d{1,2}\s+tháng", markdown, re.IGNORECASE) and not info.sign_date:
        return True
    if is_lease and re.search(r"thời hạn\s+thuê", markdown, re.IGNORECASE) and not info.term_text:
        return True
    if (is_sale or not kind) and re.search(r"diện tích", markdown, re.IGNORECASE) and not info.area:
        return True
    return False
