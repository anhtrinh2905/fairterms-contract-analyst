from app.services.contract_kind import ContractKind, detect_contract_kind, is_apartment_kind


def test_detect_mua_ban_dat_from_text():
    text = """
    HỢP ĐỒNG CHUYỂN NHƯỢNG QUYỀN SỬ DỤNG ĐẤT
    Thửa đất số: 125, Tờ bản đồ số: 18
    Giấy chứng nhận quyền sử dụng đất số CT 123456
    """
    result = detect_contract_kind(text=text)
    assert result.kind == ContractKind.MUA_BAN_DAT
    assert result.confidence >= 0.55


def test_detect_can_ho_from_text():
    text = "HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ tại tòa nhà ABC, căn hộ số 1205"
    result = detect_contract_kind(text=text)
    assert result.kind == ContractKind.CAN_HO_CHUNG_CU


def test_detect_mua_ban_bds_from_filename():
    result = detect_contract_kind(filename="hop-dong-mua-ban-nha-2026.pdf")
    assert result.kind == ContractKind.MUA_BAN_BDS


def test_default_bds_when_unknown():
    result = detect_contract_kind(text="", filename="scan001.jpg")
    assert result.kind == ContractKind.BDS_GENERIC


def test_is_apartment_kind():
    assert is_apartment_kind(ContractKind.CAN_HO_CHUNG_CU)
    assert not is_apartment_kind(ContractKind.MUA_BAN_DAT)
