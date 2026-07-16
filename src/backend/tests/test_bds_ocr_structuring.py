from app.services.contract_local_structuring import parse_contract_info, parse_contract_structure
from app.services.ocr_field_validation import validate_ocr_markdown


APARTMENT_SALE_MARKDOWN = """\
HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ
Số: 12/HĐMB-2026
Hôm nay, ngày 10 tháng 03 năm 2026

BÊN BÁN (BÊN A):
Họ và tên: NGUYỄN VĂN A
CCCD số: 001085012345

BÊN MUA (BÊN B):
Họ và tên: TRẦN THỊ B
CCCD số: 038093009876

## ĐIỀU 1: CĂN HỘ MUA BÁN
1.1 Căn hộ số: 1205, Tòa A, diện tích: 75 m2 tại dự án ABC.

## ĐIỀU 2: GIÁ BÁN VÀ THANH TOÁN
2.1 Giá bán: 3.500.000.000 VNĐ.
2.2 Đợt 1: Bên B thanh toán 30% ngay khi ký hợp đồng.
"""


def test_parse_apartment_sale_metadata():
    info = parse_contract_info(APARTMENT_SALE_MARKDOWN)
    assert info.sale_price is not None
    assert "3.500.000.000" in info.sale_price
    assert info.can_ho_so is not None
    assert info.toa_nha is not None
    assert len(info.payment_schedule) >= 1
    assert info.property_address is not None


def test_placeholder_contract_number_becomes_none():
    info = parse_contract_info("HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ\nSố: ......")
    assert info.contract_number is None


def test_parse_apartment_sale_parties():
    structured = parse_contract_structure(APARTMENT_SALE_MARKDOWN)
    assert structured.party_a.full_name == "NGUYỄN VĂN A"
    assert structured.party_b.full_name == "TRẦN THỊ B"


def test_validate_ocr_warns_on_missing_cccd_digits():
    markdown = "BÊN A: Họ và tên: Test\nCCCD số: không rõ"
    result = validate_ocr_markdown(markdown, contract_kind="mua_ban_can_ho_chung_cu")
    assert any("CCCD" in warning for warning in result.warnings)
