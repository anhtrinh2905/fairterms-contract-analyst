"""Normalize structured OCR fields: placeholders → null, collect missing required fields."""

from __future__ import annotations

import re
from typing import Any

PLACEHOLDER_RE = re.compile(r"^[\s.…_\-–—/\\:;,]+$")
UNREADABLE_MARKERS = frozenset(
    {
        "[không đọc được]",
        "[khong doc duoc]",
        "[chưa điền]",
        "[chua dien]",
        "[chua co]",
        "[chưa có]",
    }
)

PARTY_FIELD_LABELS: dict[str, str] = {
    "full_name": "Họ và tên",
    "id_number": "CCCD/CMND",
    "id_issue_date": "Ngày cấp",
    "id_issue_place": "Nơi cấp",
    "phone": "Số điện thoại",
    "permanent_address": "Địa chỉ",
}

INFO_FIELD_LABELS: dict[str, str] = {
    "contract_number": "Số hợp đồng",
    "sign_date": "Ngày ký",
    "property_address": "Địa chỉ căn hộ",
    "area": "Diện tích",
    "can_ho_so": "Căn hộ số",
    "toa_nha": "Tòa nhà",
    "sale_price": "Giá bán",
    "rent_price": "Giá thuê",
    "deposit": "Tiền đặt cọc",
    "term_text": "Thời hạn thuê",
    "payment_schedule": "Tiến độ thanh toán",
}


def is_placeholder_value(value: str | None) -> bool:
    if value is None:
        return True
    text = value.strip()
    if not text:
        return True
    if text.lower() in UNREADABLE_MARKERS:
        return True
    if PLACEHOLDER_RE.fullmatch(text):
        return True
    if text.count(".") >= 3 and re.fullmatch(r"[\s.…]+", text):
        return True
    return False


def normalize_string_field(value: str | None) -> str | None:
    if is_placeholder_value(value):
        return None
    return value.strip()


def _normalize_party(party: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(party)
    for key in ("role_label", "full_name", "id_number", "id_issue_date", "id_issue_place", "phone", "permanent_address"):
        if key in normalized:
            normalized[key] = normalize_string_field(normalized.get(key))
    return normalized


def _normalize_info(info: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(info)
    for key, value in list(normalized.items()):
        if key == "payment_schedule":
            if isinstance(value, list):
                cleaned = [normalize_string_field(str(item)) for item in value]
                normalized[key] = [item for item in cleaned if item]
            continue
        if isinstance(value, str) or value is None:
            normalized[key] = normalize_string_field(value)
    return normalized


def _normalize_equipment(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for item in items:
        row = dict(item)
        for key in ("name", "condition"):
            if key in row:
                row[key] = normalize_string_field(row.get(key))
        if row.get("name"):
            cleaned.append(row)
    return cleaned


def normalize_structured_dict(data: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(data)
    if isinstance(normalized.get("contract_info"), dict):
        normalized["contract_info"] = _normalize_info(normalized["contract_info"])
    if isinstance(normalized.get("party_a"), dict):
        normalized["party_a"] = _normalize_party(normalized["party_a"])
    if isinstance(normalized.get("party_b"), dict):
        normalized["party_b"] = _normalize_party(normalized["party_b"])
    if isinstance(normalized.get("appendix_equipment"), list):
        normalized["appendix_equipment"] = _normalize_equipment(normalized["appendix_equipment"])
    return normalized


def collect_missing_fields(data: dict[str, Any], *, transaction: str | None = None) -> list[dict[str, str]]:
    tx = (transaction or "").lower()
    is_sale = "mua_ban" in tx
    is_lease = "cho_thue" in tx or (not is_sale and tx)

    missing: list[dict[str, str]] = []

    def add(path: str, label: str) -> None:
        missing.append({"path": path, "label": label})

    info = data.get("contract_info") or {}
    for party_key, party_label in (("party_a", "Bên A"), ("party_b", "Bên B")):
        party = data.get(party_key) or {}
        for field in ("full_name", "id_number"):
            if not party.get(field):
                add(f"{party_key}.{field}", f"{PARTY_FIELD_LABELS[field]} ({party_label})")

    for field in ("contract_number", "sign_date", "property_address", "can_ho_so", "area"):
        if not info.get(field):
            add(f"contract_info.{field}", INFO_FIELD_LABELS[field])

    if not info.get("toa_nha"):
        add("contract_info.toa_nha", INFO_FIELD_LABELS["toa_nha"])

    if is_sale:
        if not info.get("sale_price"):
            add("contract_info.sale_price", INFO_FIELD_LABELS["sale_price"])
        if not info.get("payment_schedule"):
            add("contract_info.payment_schedule", INFO_FIELD_LABELS["payment_schedule"])
    if is_lease:
        if not info.get("rent_price"):
            add("contract_info.rent_price", INFO_FIELD_LABELS["rent_price"])
        if not info.get("term_text"):
            add("contract_info.term_text", INFO_FIELD_LABELS["term_text"])

    if not info.get("deposit"):
        add("contract_info.deposit", INFO_FIELD_LABELS["deposit"])

    return missing
