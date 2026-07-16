from app.services.contract_local_structuring import (
    assess_structuring_needs,
    extract_clauses_slice,
    extract_preamble_slice,
    merge_structured_contract,
    parse_clauses_from_markdown,
    parse_contract_structure,
    parse_equipment_tables,
    try_structure_contract_local,
)
from app.services.contract_structuring_service import (
    ContractClause,
    ContractInfo,
    ContractParty,
    ContractStructuringService,
    StructuredContract,
)

RENTAL_MARKDOWN = """\
HỢP ĐỒNG THUÊ CĂN HỘ CHUNG CƯ
Số: 128/HĐTN-2026
Hôm nay, ngày 23 tháng 06 năm 2026, tại địa chỉ: Tòa nhà Green Park.
BÊN CHO THUÊ (BÊN A):
Họ và tên: NGUYỄN VĂN HÙNG
CCCD số: 001085012345
BÊN THUÊ (BÊN B):
Họ và tên: TRẦN MINH ĐỨC
CCCD số: 038093009876
Hai bên cùng thỏa thuận.

## ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ
1.1 Bên A cho Bên B thuê căn hộ.
1.2 Thời hạn thuê: 12 tháng.

## ĐIỀU 2: GIÁ THUÊ
2.1 Giá thuê căn hộ cố định là: 12.000.000 VNĐ/tháng.
"""


def test_try_structure_contract_local_parses_rental_markdown():
    structured = try_structure_contract_local(RENTAL_MARKDOWN)
    assert structured is not None
    assert structured.party_a.full_name == "NGUYỄN VĂN HÙNG"
    assert structured.party_b.full_name == "TRẦN MINH ĐỨC"
    assert structured.contract_info.contract_number == "128/HĐTN-2026"
    assert structured.contract_info.sign_date == "23/06/2026"
    assert len(structured.clauses) == 2
    assert structured.clauses[0].article_no == "ĐIỀU 1"
    assert structured.clauses[0].title == "ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ"
    assert any(item.startswith("1.1") for item in structured.clauses[0].items)


def test_assess_structuring_needs_flags_metadata_gap_for_missing_deposit():
    markdown = """\
HỢP ĐỒNG THUÊ CĂN HỘ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
BÊN THUÊ (BÊN B):
Họ và tên: B TEN

## ĐIỀU 1: GIÁ VÀ CỌC
1.1 Bên B đặt cọc trước bằng tiền mặt, tương đương hai tháng tiền thuê.
"""
    structured = parse_contract_structure(markdown)
    needs = assess_structuring_needs(structured, markdown)
    assert needs.method == "hybrid"
    assert needs.needs_metadata_llm is True
    assert needs.needs_clauses_llm is False


def test_assess_structuring_needs_flags_clauses_gap_when_headings_missing_in_parse():
    markdown = """\
HỢP ĐỒNG THUÊ CĂN HỘ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
BÊN THUÊ (BÊN B):
Họ và tên: B TEN

ĐIỀU 1: NỘI DUNG
1.1 Một khoản.
"""
    structured = parse_contract_structure(markdown)
    needs = assess_structuring_needs(structured, markdown)
    assert needs.method == "local"
    assert needs.needs_clauses_llm is False


def test_extract_slices_split_at_first_article():
    preamble = extract_preamble_slice(RENTAL_MARKDOWN)
    clauses = extract_clauses_slice(RENTAL_MARKDOWN)
    assert "BÊN CHO THUÊ" in preamble
    assert preamble.startswith("HỢP ĐỒNG")
    assert clauses.startswith("## ĐIỀU 1")


def test_merge_structured_contract_prefers_existing_local_values():
    base = StructuredContract(
        contract_info=ContractInfo(contract_number="LOCAL/1", deposit=None),
        party_a=ContractParty(full_name="A LOCAL"),
        party_b=ContractParty(full_name="B LOCAL"),
        appendix_equipment=[],
        clauses=[ContractClause(article_no="ĐIỀU 1", title="T", items=["1.1 local"])],
    )
    overlay = StructuredContract(
        contract_info=ContractInfo(contract_number="LLM/9", deposit="9 VNĐ"),
        party_a=ContractParty(full_name="A LLM", phone="090"),
        party_b=ContractParty(),
        appendix_equipment=[],
        clauses=[],
    )
    merged = merge_structured_contract(base, metadata=overlay)
    assert merged.contract_info.contract_number == "LOCAL/1"
    assert merged.contract_info.deposit == "9 VNĐ"
    assert merged.party_a.full_name == "A LOCAL"
    assert merged.party_a.phone == "090"


def test_parse_clauses_from_markdown_splits_letter_items():
    markdown = """## ĐIỀU 1: TRÁCH NHIỆM
a) Bên A bàn giao nhà đúng hiện trạng.
b) Bên B giữ gìn tài sản thuê.
c) Hai bên tuân thủ pháp luật."""
    clauses = parse_clauses_from_markdown(markdown)
    assert len(clauses) == 1
    assert len(clauses[0].items) == 3
    assert clauses[0].items[0].startswith("a)")
    assert clauses[0].items[1].startswith("b)")
    assert clauses[0].items[2].startswith("c)")


def test_parse_clauses_from_markdown_splits_dot_letter_items():
    markdown = """## ĐIỀU 2: THANH TOÁN
a. Thanh toán vào ngày 05 hàng tháng.
b. Chuyển khoản theo tài khoản Bên A."""
    clauses = parse_clauses_from_markdown(markdown)
    assert len(clauses[0].items) == 2
    assert clauses[0].items[0].startswith("a.")


def test_parse_clauses_from_markdown_splits_items():
    markdown = """## ĐIỀU 1: TIÊU ĐỀ
1.1 Dòng một.
1.2 Dòng hai.

## ĐIỀU 2: TIẾP
2.1 Khoản khác."""
    clauses = parse_clauses_from_markdown(markdown)
    assert len(clauses) == 2
    assert clauses[0].items == ["1.1 Dòng một.", "1.2 Dòng hai."]
    assert clauses[1].items == ["2.1 Khoản khác."]


def test_parse_equipment_tables_from_markdown():
    markdown = """
| STT | ĐỒ ĐẠC VÀ THIẾT BỊ | SỐ LƯỢNG | TÌNH TRẠNG |
| --- | --- | --- | --- |
| 1 | Điều hòa | 1 | Sử dụng tốt |
"""
    items = parse_equipment_tables(markdown)
    assert len(items) == 1
    assert items[0].name == "Điều hòa"
    assert items[0].quantity == 1
    assert items[0].condition == "Sử dụng tốt"


def test_parse_equipment_tables_with_hang_muc_and_ghi_chu_headers():
    markdown = """
| HẠNG MỤC BÀN GIAO | SỐ LƯỢNG | GHI CHÚ |
| --- | --- | --- |
| Điều Hòa + Điều Khiển (02) | 02 | Sử dụng tốt |
| Tủ lạnh | 01 | Sử dụng tốt |
|  | 0 | Sử dụng tốt |
"""
    items = parse_equipment_tables(markdown)
    assert len(items) == 2
    assert items[0].name == "Điều Hòa + Điều Khiển (02)"
    assert items[0].quantity == 2
    assert items[0].condition == "Sử dụng tốt"
    assert items[1].name == "Tủ lạnh"


def test_parse_equipment_tables_ignores_signature_table():
    markdown = """
| BÊN CHO THUÊ TÀI SẢN (BÊN A) (Ký và ghi rõ họ tên) | BÊN THUÊ TÀI SẢN (BÊN B) (Ký và ghi rõ họ tên) |
| --- | --- |
"""
    assert parse_equipment_tables(markdown) == []


def test_structure_contract_hybrid_safe_always_calls_metadata(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid_safe")
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
Số: 1/HĐ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
CCCD số: 001085012345
BÊN THUÊ (BÊN B):
Họ và tên: B TEN
CCCD số: 038093009876

## ĐIỀU 1: PHẠM VI
1.1 Nội dung điều khoản."""
    service = ContractStructuringService(client_factory=object())
    metadata_calls: list[str] = []

    def fake_metadata(slice_text: str) -> StructuredContract:
        metadata_calls.append(slice_text)
        return StructuredContract(
            contract_info=ContractInfo(contract_number="1/HĐ", deposit="24.000.000 VNĐ"),
            party_a=ContractParty(full_name="A TEN"),
            party_b=ContractParty(full_name="B TEN"),
            appendix_equipment=[],
            clauses=[],
        )

    monkeypatch.setattr(service, "_structure_metadata_llm", fake_metadata)
    monkeypatch.setattr(service, "_structure_clauses_llm", lambda _s: (_ for _ in ()).throw(AssertionError()))
    monkeypatch.setattr(service, "_structure_llm_full", lambda _m: (_ for _ in ()).throw(AssertionError()))
    outcome = service.structure_contract(markdown)
    assert outcome.method == "hybrid_safe"
    assert outcome.llm_calls == 1
    assert metadata_calls
    assert outcome.contract.contract_info.deposit == "24.000.000 VNĐ"
    assert outcome.contract.clauses[0].items == ["1.1 Nội dung điều khoản."]


def test_docx_extraction_forces_llm_full(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid_safe")
    monkeypatch.delenv("GEMINI_STRUCTURING_MODE_DIGITAL", raising=False)
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
Số: 1/HĐ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN

## ĐIỀU 1: PHẠM VI
1.1 Nội dung."""
    service = ContractStructuringService(client_factory=object())
    full_calls: list[str] = []

    def fake_full(md: str) -> StructuredContract:
        full_calls.append(md)
        return StructuredContract(
            contract_info=ContractInfo(contract_number="1/HĐ"),
            party_a=ContractParty(full_name="A TEN"),
            party_b=ContractParty(full_name="B TEN"),
            appendix_equipment=[],
            clauses=[ContractClause(article_no="ĐIỀU 1", items=["1.1 Nội dung."])],
        )

    monkeypatch.setattr(service, "_structure_llm_full", fake_full)
    monkeypatch.setattr(
        service, "_structure_metadata_llm", lambda _s: (_ for _ in ()).throw(AssertionError())
    )
    outcome = service.structure_contract(markdown, extraction_method="docx")
    assert outcome.method == "llm_full"
    assert full_calls


def test_digital_pdf_respects_mode_override(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE_DIGITAL", "hybrid_safe")
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
Số: 1/HĐ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
CCCD số: 001085012345
BÊN THUÊ (BÊN B):
Họ và tên: B TEN
CCCD số: 038093009876

## ĐIỀU 1: PHẠM VI
1.1 Nội dung."""
    service = ContractStructuringService(client_factory=object())

    monkeypatch.setattr(
        service,
        "_structure_metadata_llm",
        lambda _s: StructuredContract(
            contract_info=ContractInfo(contract_number="1/HĐ", deposit="1 VNĐ"),
            party_a=ContractParty(full_name="A TEN"),
            party_b=ContractParty(full_name="B TEN"),
            appendix_equipment=[],
            clauses=[],
        ),
    )
    monkeypatch.setattr(
        service, "_structure_llm_full", lambda _m: (_ for _ in ()).throw(AssertionError())
    )
    outcome = service.structure_contract(markdown, extraction_method="digital_pdf")
    assert outcome.method == "hybrid_safe"


def test_image_extraction_uses_hybrid_mode(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid_safe")
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE_DIGITAL", "llm_full")
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
Số: 1/HĐ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
CCCD số: 001085012345
BÊN THUÊ (BÊN B):
Họ và tên: B TEN
CCCD số: 038093009876

## ĐIỀU 1: PHẠM VI
1.1 Nội dung."""
    service = ContractStructuringService(client_factory=object())
    monkeypatch.setattr(
        service,
        "_structure_metadata_llm",
        lambda _s: StructuredContract(
            contract_info=ContractInfo(contract_number="1/HĐ", deposit="1 VNĐ"),
            party_a=ContractParty(full_name="A TEN"),
            party_b=ContractParty(full_name="B TEN"),
            appendix_equipment=[],
            clauses=[],
        ),
    )
    monkeypatch.setattr(
        service, "_structure_llm_full", lambda _m: (_ for _ in ()).throw(AssertionError())
    )
    # multi_image không thuộc digital → dùng GEMINI_STRUCTURING_MODE
    outcome = service.structure_contract(markdown, extraction_method="multi_image")
    assert outcome.method == "hybrid_safe"


def test_merge_metadata_prefer_gemini_overrides_local():
    local = StructuredContract(
        contract_info=ContractInfo(deposit="12.000.000 VNĐ"),
        party_a=ContractParty(full_name="LOCAL A"),
        party_b=ContractParty(full_name="B TEN"),
        appendix_equipment=[],
        clauses=[ContractClause(article_no="ĐIỀU 1", items=["1.1 giữ"])],
    )
    gemini = StructuredContract(
        contract_info=ContractInfo(deposit="24.000.000 VNĐ"),
        party_a=ContractParty(full_name="GEMINI A"),
        party_b=ContractParty(),
        appendix_equipment=[],
        clauses=[],
    )
    from app.services.contract_local_structuring import merge_metadata_prefer_gemini

    merged = merge_metadata_prefer_gemini(local, gemini)
    assert merged.contract_info.deposit == "24.000.000 VNĐ"
    assert merged.party_a.full_name == "GEMINI A"
    assert merged.clauses[0].items == ["1.1 giữ"]


def test_structure_contract_uses_local_without_gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid")
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
Số: 1/HĐ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
CCCD số: 001085012345
BÊN THUÊ (BÊN B):
Họ và tên: B TEN
CCCD số: 038093009876
Hai bên thỏa thuận.

## ĐIỀU 1: PHẠM VI
1.1 Nội dung điều khoản."""
    service = ContractStructuringService(client_factory=object())

    def fail_gemini(*_args, **_kwargs):
        raise AssertionError("Gemini should not be called when local parse is sufficient")

    monkeypatch.setattr(service, "_structure_metadata_llm", fail_gemini)
    monkeypatch.setattr(service, "_structure_clauses_llm", fail_gemini)
    monkeypatch.setattr(service, "_structure_llm_full", fail_gemini)
    outcome = service.structure_contract(markdown)
    assert outcome.method == "local"
    assert outcome.llm_calls == 0
    assert outcome.contract.party_a.full_name == "A TEN"
    assert len(outcome.contract.clauses) == 1


def test_structure_contract_hybrid_metadata_gap_fill(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid")
    markdown = """HỢP ĐỒNG THUÊ CĂN HỘ
BÊN CHO THUÊ (BÊN A):
Họ và tên: A TEN
BÊN THUÊ (BÊN B):
Họ và tên: B TEN

## ĐIỀU 1: GIÁ VÀ CỌC
1.1 Bên B đặt cọc trước bằng tiền mặt, tương đương hai tháng tiền thuê.
"""
    service = ContractStructuringService(client_factory=object())

    def fake_metadata(_slice: str) -> StructuredContract:
        return StructuredContract(
            contract_info=ContractInfo(deposit="Hai tháng tiền thuê"),
            party_a=ContractParty(),
            party_b=ContractParty(),
            appendix_equipment=[],
            clauses=[],
        )

    monkeypatch.setattr(service, "_structure_metadata_llm", fake_metadata)
    monkeypatch.setattr(service, "_structure_clauses_llm", lambda _s: (_ for _ in ()).throw(AssertionError()))
    monkeypatch.setattr(service, "_structure_llm_full", lambda _m: (_ for _ in ()).throw(AssertionError()))
    outcome = service.structure_contract(markdown)
    assert outcome.method == "hybrid"
    assert outcome.llm_calls == 1
    assert outcome.contract.contract_info.deposit == "Hai tháng tiền thuê"
    assert len(outcome.contract.clauses) == 1


def test_parse_contract_info_deposit_and_property_address():
    markdown = """\
HỢP ĐỒNG THUÊ CĂN HỘ
1.1 Bên A cho Bên B thuê căn hộ số 1805 tại địa chỉ: Số 12 Khuất Duy Tiến, phường Thanh Xuân Trung,
quận Thanh Xuân, thành phố Hà Nội.
2.3 Khoản tiền đặt cọc: Bên B giao một khoản tiền cọc là: 24.000.000 VNĐ (hai tháng).
"""
    from app.services.contract_local_structuring import parse_contract_info

    info = parse_contract_info(markdown)
    assert info.deposit == "24.000.000 VNĐ"
    assert "Thanh Xuân" in (info.property_address or "")
    assert "Hà Nội" in (info.property_address or "")


def test_structure_contract_falls_back_to_llm_full_when_unparseable(monkeypatch):
    monkeypatch.setenv("GEMINI_STRUCTURING_MODE", "hybrid_safe")
    service = ContractStructuringService(client_factory=object())

    def fake_llm_full(_markdown: str) -> StructuredContract:
        return StructuredContract(
            contract_info=ContractInfo(),
            party_a=ContractParty(),
            party_b=ContractParty(),
            appendix_equipment=[],
            clauses=[],
        )

    monkeypatch.setattr(service, "_structure_llm_full", fake_llm_full)
    monkeypatch.setattr(
        service,
        "_structure_metadata_llm",
        lambda _s: (_ for _ in ()).throw(AssertionError("metadata LLM should not run")),
    )
    outcome = service.structure_contract("Không có điều khoản rõ ràng")
    assert outcome.method == "llm_full"
    assert outcome.llm_calls == 1
    assert outcome.contract.clauses == []
