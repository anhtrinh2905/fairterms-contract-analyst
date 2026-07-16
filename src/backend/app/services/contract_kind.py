"""Auto-detect Vietnamese real-estate contract kind from filename and text."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from enum import Enum


class ContractKind(str, Enum):
    CAN_HO_CHUNG_CU = "can_ho_chung_cu"
    MUA_BAN_BDS = "mua_ban_bds"
    MUA_BAN_DAT = "mua_ban_dat"
    CHO_THUE_BDS = "cho_thue_bds"
    BDS_GENERIC = "bds_generic"


class ApartmentTransaction(str, Enum):
    MUA_BAN_CAN_HO_CHUNG_CU = "mua_ban_can_ho_chung_cu"
    CHO_THUE_CAN_HO_CHUNG_CU = "cho_thue_can_ho_chung_cu"


PRODUCT_NAME = "FairTerms"

UNSUPPORTED_LAND_SALE_MESSAGE = (
    f"{PRODUCT_NAME} hiện không hỗ trợ hợp đồng mua bán đất. "
    "Vui lòng tải hợp đồng mua bán hoặc cho thuê căn hộ chung cư."
)
UNSUPPORTED_CONTRACT_MESSAGE = (
    f"{PRODUCT_NAME} hiện chỉ hỗ trợ hợp đồng mua bán hoặc cho thuê căn hộ chung cư. "
    "Vui lòng kiểm tra lại tệp tải lên."
)

MIN_SUPPORTED_CONFIDENCE = 0.45


@dataclass(frozen=True)
class ContractKindDetection:
    kind: ContractKind
    confidence: float
    source: str


class UnsupportedContractError(ValueError):
    def __init__(self, message: str, *, reason: str):
        super().__init__(message)
        self.reason = reason


_CAN_HO_KEYWORDS = (
    "căn hộ chung cư",
    "can ho chung cu",
    "chung cư",
    "chung cu",
    "căn hộ số",
    "can ho so",
    "căn hộ",
    "can ho",
    "tòa nhà",
    "toa nha",
    "tầng",
    "tang ",
)
_CHCC_CONTEXT_KEYWORDS = (
    "căn hộ chung cư",
    "can ho chung cu",
    "chung cư",
    "chung cu",
    "căn hộ số",
    "can ho so",
)
_DAT_KEYWORDS = (
    "thửa đất",
    "thua dat",
    "tờ bản đồ",
    "to ban do",
    "quyền sử dụng đất",
    "quyen su dung dat",
    "qsdđ",
    "qsdd",
    "sổ đỏ",
    "so do",
    "chuyển nhượng đất",
    "chuyen nhuong dat",
)
_SALE_KEYWORDS = (
    "mua bán",
    "mua ban",
    "bán nhà",
    "ban nha",
    "mua nhà",
    "mua nha",
    "chuyển nhượng",
    "chuyen nhuong",
    "giá bán",
    "gia ban",
    "giá chuyển nhượng",
)
_LEASE_KEYWORDS = (
    "cho thuê",
    "cho thue",
    "thuê nhà",
    "thue nha",
    "thuê mặt bằng",
    "thue mat bang",
    "giá thuê",
    "gia thue",
    "thời hạn thuê",
)


def normalize_kind_text(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFC", text).lower()
    return re.sub(r"\s+", " ", normalized).strip()


def detect_contract_kind(
    *,
    text: str = "",
    filename: str = "",
) -> ContractKindDetection:
    """Infer contract kind without user input."""
    from_filename = _score_filename(filename)
    from_text = _score_text(text) if text.strip() else None

    if from_text and from_text.confidence >= from_filename.confidence:
        return from_text
    if from_filename.confidence >= 0.55:
        return from_filename
    if from_text:
        return from_text
    return ContractKindDetection(
        kind=ContractKind.BDS_GENERIC,
        confidence=0.4,
        source="default_bds",
    )


def _score_filename(filename: str) -> ContractKindDetection:
    name = normalize_kind_text(Path_stem(filename))
    if not name:
        return ContractKindDetection(ContractKind.BDS_GENERIC, 0.0, "filename")

    if _contains_any(name, ("mua-ban-dat", "mua_dat", "dat-nen", "qsdd", "so-do")):
        return ContractKindDetection(ContractKind.MUA_BAN_DAT, 0.7, "filename")

    if _contains_any(name, ("can-ho", "canho", "chung-cu", "chungcu", "apartment")):
        return ContractKindDetection(ContractKind.CAN_HO_CHUNG_CU, 0.75, "filename")

    if _contains_any(name, ("mua-ban", "mua_ban", "ban-nha", "chuyen-nhuong")):
        return ContractKindDetection(ContractKind.MUA_BAN_BDS, 0.65, "filename")

    if _contains_any(name, ("cho-thue", "cho_thue", "thue-nha", "thue-mat-bang")):
        if _contains_any(name, ("can-ho", "canho", "chung-cu")):
            return ContractKindDetection(ContractKind.CAN_HO_CHUNG_CU, 0.7, "filename")
        return ContractKindDetection(ContractKind.CHO_THUE_BDS, 0.65, "filename")

    return ContractKindDetection(ContractKind.BDS_GENERIC, 0.35, "filename")


def _score_text(text: str) -> ContractKindDetection:
    normalized = normalize_kind_text(text)
    if not normalized:
        return ContractKindDetection(ContractKind.BDS_GENERIC, 0.0, "text")

    scores: dict[ContractKind, float] = {
        ContractKind.CAN_HO_CHUNG_CU: 0.0,
        ContractKind.MUA_BAN_DAT: 0.0,
        ContractKind.MUA_BAN_BDS: 0.0,
        ContractKind.CHO_THUE_BDS: 0.0,
    }

    for keyword in _CAN_HO_KEYWORDS:
        if keyword in normalized:
            scores[ContractKind.CAN_HO_CHUNG_CU] += 1.2

    for keyword in _DAT_KEYWORDS:
        if keyword in normalized:
            scores[ContractKind.MUA_BAN_DAT] += 1.5

    for keyword in _SALE_KEYWORDS:
        if keyword in normalized:
            scores[ContractKind.MUA_BAN_BDS] += 1.0

    for keyword in _LEASE_KEYWORDS:
        if keyword in normalized:
            scores[ContractKind.CHO_THUE_BDS] += 1.0

    if re.search(r"hợp đồng\s+mua\s+bán", normalized):
        scores[ContractKind.MUA_BAN_BDS] += 2.0
    if re.search(r"hợp đồng\s+cho\s+thuê", normalized):
        scores[ContractKind.CHO_THUE_BDS] += 2.0
        if "căn hộ" in normalized or "can ho" in normalized:
            scores[ContractKind.CAN_HO_CHUNG_CU] += 2.5

    best_kind = max(scores, key=scores.get)
    best_score = scores[best_kind]
    if best_score < 1.0:
        return ContractKindDetection(ContractKind.BDS_GENERIC, min(0.55, best_score / 3), "text")

    confidence = min(0.95, 0.55 + best_score * 0.08)
    return ContractKindDetection(best_kind, confidence, "text")


def _has_apartment_context(text: str) -> bool:
    normalized = normalize_kind_text(text)
    return any(keyword in normalized for keyword in _CAN_HO_KEYWORDS)


def _has_chcc_context(text: str) -> bool:
    """True only for căn hộ chung cư signals — not nhà riêng / mặt bằng / BĐS chung."""
    normalized = normalize_kind_text(text)
    if not normalized:
        return False
    if any(keyword in normalized for keyword in _CHCC_CONTEXT_KEYWORDS):
        return True
    if re.search(r"căn\s+hộ\s+(?:số|so)\b", normalized):
        return True
    if re.search(
        r"hợp\s+đồng\s+(?:mua\s+bán|cho\s+thuê|thuê)\s+căn\s+hộ",
        normalized,
    ):
        return True
    return False


def _is_lease_contract(normalized: str, detection: ContractKindDetection) -> bool:
    return bool(
        re.search(r"cho\s+thuê|cho\s+thue", normalized)
        or re.search(r"hợp\s+đồng\s+thuê", normalized)
        or "giá thuê" in normalized
        or "thời hạn thuê" in normalized
        or detection.kind == ContractKind.CHO_THUE_BDS
    )


def _is_sale_contract(normalized: str, detection: ContractKindDetection) -> bool:
    return bool(
        re.search(r"hợp\s+đồng\s+mua\s+bán|mua\s+bán|giá\s+bán", normalized)
        or (
            re.search(r"chuyển\s+nhượng", normalized)
            and not re.search(r"chuyển\s+nhượng\s+quyền\s+sử\s+dụng\s+đất", normalized)
        )
        or detection.kind == ContractKind.MUA_BAN_BDS
    )


def is_land_sale_contract(detection: ContractKindDetection, text: str = "") -> bool:
    if detection.kind == ContractKind.MUA_BAN_DAT:
        return True
    normalized = normalize_kind_text(text)
    if not normalized:
        return False
    has_land = any(keyword in normalized for keyword in _DAT_KEYWORDS)
    if has_land and not _has_apartment_context(normalized):
        return True
    if re.search(r"chuyển nhượng\s+quyền\s+sử\s+dụng\s+đất", normalized):
        return not _has_apartment_context(normalized)
    return False


def classify_supported_apartment(
    detection: ContractKindDetection,
    text: str = "",
) -> ApartmentTransaction | None:
    if is_land_sale_contract(detection, text):
        return None

    normalized = normalize_kind_text(text)
    if not _has_chcc_context(normalized):
        return None

    is_lease = _is_lease_contract(normalized, detection)
    is_sale = _is_sale_contract(normalized, detection)

    if is_lease and not is_sale:
        return ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU
    if is_sale and not is_lease:
        return ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU
    if is_lease and is_sale:
        if detection.kind == ContractKind.MUA_BAN_BDS:
            return ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU
        return ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU

    if detection.kind == ContractKind.MUA_BAN_BDS:
        return ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU
    if detection.kind in (ContractKind.CHO_THUE_BDS, ContractKind.CAN_HO_CHUNG_CU):
        return ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU

    return None


def ensure_supported_apartment_contract(
    detection: ContractKindDetection,
    text: str = "",
) -> ApartmentTransaction:
    if is_land_sale_contract(detection, text):
        raise UnsupportedContractError(UNSUPPORTED_LAND_SALE_MESSAGE, reason="land_sale")

    transaction = classify_supported_apartment(detection, text)
    if transaction is None:
        raise UnsupportedContractError(UNSUPPORTED_CONTRACT_MESSAGE, reason="unsupported")

    if detection.confidence < MIN_SUPPORTED_CONFIDENCE and not _has_chcc_context(text):
        raise UnsupportedContractError(UNSUPPORTED_CONTRACT_MESSAGE, reason="low_confidence")

    return transaction


def is_apartment_kind(kind: ContractKind) -> bool:
    return kind == ContractKind.CAN_HO_CHUNG_CU


def resolve_ocr_prompt_path(
    transaction: ApartmentTransaction,
    services_dir,
):
    from pathlib import Path

    base = Path(services_dir)
    lease_prompt = base / "contract_ocr_system.txt"
    sale_prompt = base / "contract_ocr_system_mua_ban_chcc.txt"
    if transaction == ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU:
        return sale_prompt if sale_prompt.is_file() else lease_prompt
    return lease_prompt


def Path_stem(filename: str) -> str:
    from pathlib import Path

    return Path(filename or "").stem


def _contains_any(text: str, tokens: tuple[str, ...]) -> bool:
    return any(token in text for token in tokens)
