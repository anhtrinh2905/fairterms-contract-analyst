"""Post-OCR validation for supported apartment contracts (sale & lease)."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.services.contract_kind import ApartmentTransaction, classify_supported_apartment, detect_contract_kind


@dataclass(frozen=True)
class OCRFieldValidation:
    warnings: tuple[str, ...]
    needs_retry: bool

    def to_dict(self) -> dict:
        return {
            "warnings": list(self.warnings),
            "needs_retry": self.needs_retry,
        }


_CCCD_RE = re.compile(r"\b\d{3}\s?\d{3}\s?\d{3}\s?\d{3}\b")
_PRICE_RE = re.compile(
    r"(?:giá\s+(?:bán|chuyển\s+nhượng|thuê)|thành\s+tiền)\s*[^:\n]{0,40}[:：]?\s*"
    r"[\d.,\s]+(?:VNĐ|đồng|đ)\b",
    re.IGNORECASE,
)
_PAYMENT_RE = re.compile(r"đợt\s*\d+|thanh\s+toán\s+đợt", re.IGNORECASE)
_APARTMENT_RE = re.compile(
    r"căn\s+hộ\s*(?:số\s*)?[:：]?\s*[\w\d/\-]+|can\s+ho\s*(?:so\s*)?[:：]?\s*[\w\d/\-]+",
    re.IGNORECASE,
)
_BUILDING_RE = re.compile(r"(?:tòa|toa|tháp|thap|block)\s*[:：]?\s*[\w\d/\-]+", re.IGNORECASE)
_AREA_RE = re.compile(r"diện\s+tích[^:\n]{0,30}[:：]?\s*[\d.,\s]+", re.IGNORECASE)


def validate_ocr_markdown(markdown: str, *, contract_kind: str = "") -> OCRFieldValidation:
    text = (markdown or "").strip()
    if not text:
        return OCRFieldValidation(warnings=("OCR trả về nội dung rỗng.",), needs_retry=True)

    detection = detect_contract_kind(text=text[:4000])
    transaction = classify_supported_apartment(detection, text[:4000])
    kind = (contract_kind or "").lower()

    if transaction == ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU or "mua_ban" in kind:
        return _validate_apartment_sale(text)
    if transaction == ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU or "cho_thue" in kind:
        return _validate_apartment_lease(text)
    return _validate_apartment_lease(text)


def _validate_apartment_sale(text: str) -> OCRFieldValidation:
    warnings: list[str] = []

    if re.search(r"CCCD|CMND|Hộ chiếu", text, re.IGNORECASE) and not _CCCD_RE.search(text):
        warnings.append("Có nhắc CCCD/CMND nhưng không trích được số 12 chữ số hợp lệ.")

    if re.search(r"giá\s+bán|chuyển\s+nhượng|thành\s+tiền", text, re.IGNORECASE):
        if not _PRICE_RE.search(text):
            warnings.append("Có nhắc giá bán/chuyển nhượng nhưng số tiền có thể chưa chính xác.")

    if _PAYMENT_RE.search(text) and not re.search(
        r"\d+[\d.,\s]*(?:%|VNĐ|đồng|đ)\b", text, re.IGNORECASE
    ):
        warnings.append("Có tiến độ thanh toán nhưng số tiền/tỷ lệ có thể chưa đầy đủ.")

    if re.search(r"căn\s+hộ|can\s+ho", text, re.IGNORECASE) and not _APARTMENT_RE.search(text):
        warnings.append("Có nhắc căn hộ nhưng số căn hộ có thể chưa chính xác.")

    if re.search(r"tòa|toa|tháp|block", text, re.IGNORECASE) and not _BUILDING_RE.search(text):
        warnings.append("Có nhắc tòa nhà/block nhưng thông tin có thể chưa đầy đủ.")

    if re.search(r"diện\s+tích", text, re.IGNORECASE) and not _AREA_RE.search(text):
        warnings.append("Có nhắc diện tích nhưng giá trị có thể chưa chính xác.")

    needs_retry = any(
        phrase in w
        for w in warnings
        for phrase in ("12 chữ số", "số tiền", "số căn hộ", "diện tích")
    )
    return OCRFieldValidation(warnings=tuple(warnings), needs_retry=needs_retry)


def _validate_apartment_lease(text: str) -> OCRFieldValidation:
    warnings: list[str] = []

    if re.search(r"CCCD|CMND|Hộ chiếu", text, re.IGNORECASE) and not _CCCD_RE.search(text):
        warnings.append("Có nhắc CCCD/CMND nhưng không trích được số 12 chữ số hợp lệ.")

    if re.search(r"giá\s+thuê", text, re.IGNORECASE) and not _PRICE_RE.search(text):
        warnings.append("Có nhắc giá thuê nhưng số tiền có thể chưa chính xác.")

    if re.search(r"đặt\s+cọc|tiền\s+cọc", text, re.IGNORECASE) and not re.search(
        r"[\d.,\s]+(?:VNĐ|đồng|đ)\b", text, re.IGNORECASE
    ):
        warnings.append("Có nhắc tiền cọc nhưng số tiền có thể chưa chính xác.")

    if re.search(r"căn\s+hộ|can\s+ho", text, re.IGNORECASE) and not _APARTMENT_RE.search(text):
        warnings.append("Có nhắc căn hộ nhưng số căn hộ có thể chưa chính xác.")

    needs_retry = any(
        phrase in w
        for w in warnings
        for phrase in ("12 chữ số", "số tiền", "số căn hộ")
    )
    return OCRFieldValidation(warnings=tuple(warnings), needs_retry=needs_retry)
