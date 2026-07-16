from app.services.contract_kind import (
    ApartmentTransaction,
    ContractKind,
    PRODUCT_NAME,
    UNSUPPORTED_CONTRACT_MESSAGE,
    UnsupportedContractError,
    classify_supported_apartment,
    detect_contract_kind,
    ensure_supported_apartment_contract,
    is_land_sale_contract,
)
from app.services.gemini_ocr_service import (
    default_transaction_from_probe,
    needs_vision_probe,
)
from app.services.document_extractor import DocumentKind
from app.services.structured_field_normalize import (
    collect_missing_fields,
    is_placeholder_value,
    normalize_structured_dict,
)


def test_is_placeholder_value_rejects_dots():
    assert is_placeholder_value("......")
    assert is_placeholder_value("   ……   ")
    assert not is_placeholder_value("Căn hộ 1205")


def test_normalize_structured_dict_clears_placeholders():
    data = normalize_structured_dict(
        {
            "contract_info": {"contract_number": "......", "sale_price": "3.000.000.000 VNĐ"},
            "party_a": {"full_name": "Nguyễn Văn A", "id_number": "...."},
            "party_b": {"full_name": "Trần Thị B", "id_number": "001085012345"},
            "appendix_equipment": [],
            "clauses": [],
        }
    )
    assert data["contract_info"]["contract_number"] is None
    assert data["contract_info"]["sale_price"] == "3.000.000.000 VNĐ"
    assert data["party_a"]["id_number"] is None


def test_collect_missing_fields_for_apartment_sale():
    missing = collect_missing_fields(
        {
            "contract_info": {"sale_price": "1 tỷ"},
            "party_a": {"full_name": "A"},
            "party_b": {"full_name": "B", "id_number": "001085012345"},
            "appendix_equipment": [],
            "clauses": [],
        },
        transaction="mua_ban_can_ho_chung_cu",
    )
    labels = {item["label"] for item in missing}
    assert "Giá bán" not in labels
    assert any("CCCD" in label for label in labels)


def test_land_sale_is_blocked():
    text = "HỢP ĐỒNG CHUYỂN NHƯỢNG QUYỀN SỬ DỤNG ĐẤT\nThửa đất số: 88"
    detection = detect_contract_kind(text=text)
    assert is_land_sale_contract(detection, text)
    assert classify_supported_apartment(detection, text) is None


def test_apartment_sale_is_supported():
    text = "HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ\ncăn hộ số 1205 tòa A"
    detection = detect_contract_kind(text=text)
    tx = ensure_supported_apartment_contract(detection, text)
    assert tx == ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU


def test_apartment_lease_is_supported():
    text = "HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ\ngiá thuê 15 triệu"
    detection = detect_contract_kind(text=text)
    tx = ensure_supported_apartment_contract(detection, text)
    assert tx == ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU


def test_unsupported_generic_bds_raises():
    detection = detect_contract_kind(text="", filename="scan001.jpg")
    try:
        ensure_supported_apartment_contract(detection, "")
    except UnsupportedContractError:
        pass
    else:
        raise AssertionError("expected UnsupportedContractError")


def test_generic_filename_lease_text_is_supported():
    text = "HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ\ngiá thuê 15 triệu"
    detection = detect_contract_kind(text=text, filename="IMG_001.jpg")
    tx = ensure_supported_apartment_contract(detection, text)
    assert tx == ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU


def test_generic_filename_sale_text_is_supported():
    text = "HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ\ncăn hộ số 1205"
    detection = detect_contract_kind(text=text, filename="scan.pdf")
    tx = ensure_supported_apartment_contract(detection, text)
    assert tx == ApartmentTransaction.MUA_BAN_CAN_HO_CHUNG_CU


def test_needs_vision_probe_for_image_without_snippet():
    assert needs_vision_probe("", DocumentKind.IMAGE)
    assert needs_vision_probe("", DocumentKind.SCANNED_PDF)
    assert not needs_vision_probe("HỢP ĐỒNG CHO THUÊ", DocumentKind.IMAGE)


def test_default_transaction_from_probe_defaults_to_lease():
    detection = detect_contract_kind(text="", filename="IMG_001.jpg")
    tx = default_transaction_from_probe(detection, "")
    assert tx == ApartmentTransaction.CHO_THUE_CAN_HO_CHUNG_CU


def test_error_messages_use_fairterms_branding():
    assert PRODUCT_NAME == "FairTerms"
    assert "HopDongAI" not in UNSUPPORTED_CONTRACT_MESSAGE
    assert "FairTerms" in UNSUPPORTED_CONTRACT_MESSAGE


def test_mua_ban_nha_without_chcc_is_blocked():
    text = "HỢP ĐỒNG MUA BÁN NHÀ RIÊNG\ntầng 2, giá bán 5 tỷ"
    detection = detect_contract_kind(text=text)
    assert classify_supported_apartment(detection, text) is None


def test_cho_thue_nha_without_chcc_is_blocked():
    text = "HỢP ĐỒNG CHO THUÊ NHÀ\ngiá thuê 15 triệu"
    detection = detect_contract_kind(text=text)
    assert classify_supported_apartment(detection, text) is None


def test_cho_thue_mat_bang_is_blocked():
    text = "HỢP ĐỒNG CHO THUÊ MẶT BẰNG KINH DOANH\ngiá thuê 20 triệu"
    detection = detect_contract_kind(text=text)
    assert classify_supported_apartment(detection, text) is None


def test_non_real_estate_contract_is_blocked():
    text = "HỢP ĐỒNG LAO ĐỘNG\nBên A và Bên B thỏa thuận"
    detection = detect_contract_kind(text=text)
    assert classify_supported_apartment(detection, text) is None
