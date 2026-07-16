from app.checklists.loader import get_checklist, list_checklists


def test_both_checklists_load():
    types = {c.loai_hop_dong for c in list_checklists()}
    assert "cho_thue_can_ho_chung_cu" in types
    assert "mua_ban_can_ho_chung_cu" in types


def test_role_convention_parsed():
    c = get_checklist("cho_thue_can_ho_chung_cu")
    assert c is not None
    assert c.phien_ban == "2.0"
    assert c.convention.ben_a.ma == "ben_cho_thue"
    assert c.convention.ben_a.vi_the == "manh_the"
    assert c.convention.ben_b.ma == "ben_thue"
    assert c.convention.ben_b.vi_the == "yeu_the"
    # The agent always protects Bên B.
    assert c.convention.protected_party == "ben_b"
    assert c.convention.protected.ma == "ben_thue"

    sale = get_checklist("mua_ban_can_ho_chung_cu")
    assert sale is not None
    assert sale.convention.ben_a.ma == "ben_ban"
    assert sale.convention.ben_b.ma == "ben_mua"
    assert sale.convention.protected_party == "ben_b"


def test_rental_signals_parsed():
    c = get_checklist("cho_thue_can_ho_chung_cu")
    assert c is not None
    # Red flags keep their legal basis; unfair clauses keep negotiation tips.
    b_r6 = next(s for s in c.red_flags() if s.id == "B-R6")
    assert b_r6.muc_rui_ro == "cao"
    assert b_r6.can_cu
    assert b_r6.gay_bat_loi_cho == "ben_b"
    assert all(s.trai_luat is False for s in c.unfair_clauses())
    b_u1 = next(s for s in c.unfair_clauses() if s.id == "B-U1")
    assert b_u1.goi_y_thuong_luong


def test_signals_tagged_with_party_section():
    c = get_checklist("cho_thue_can_ho_chung_cu")
    assert c is not None
    # B-R6 (landlord enters without notice) lives under Bên A's "abuse" section.
    b_r6 = next(s for s in c.signals if s.id == "B-R6")
    assert b_r6.thuoc_ben == "ben_a"
    assert b_r6.nhom == "dau_hieu_lam_quyen"
    # B-R1 (tenant penalised) lives under Bên B's "over-burden" section.
    b_r1 = next(s for s in c.signals if s.id == "B-R1")
    assert b_r1.thuoc_ben == "ben_b"
    assert b_r1.nhom == "dau_hieu_ganh_qua_muc"
    # signals_about() filters by the party section.
    assert all(s.thuoc_ben == "ben_a" for s in c.signals_about("ben_a"))


def test_trigger_conditions_preserved():
    """`dieu_kien_kich_hoat` is the data that prevents false positives."""
    c = get_checklist("cho_thue_can_ho_chung_cu")
    assert c is not None
    b_u6 = next(s for s in c.signals if s.id == "B-U6")
    assert b_u6.dieu_kien_kich_hoat
    assert "PASS" in b_u6.dieu_kien_kich_hoat


def test_required_items_split_by_party():
    c = get_checklist("cho_thue_can_ho_chung_cu")
    assert c is not None
    a_items = [r for r in c.required_items if r.thuoc_ben == "ben_a"]
    b_items = [r for r in c.required_items if r.thuoc_ben == "ben_b"]
    assert a_items and b_items
    assert all(r.nhom == "nghia_vu_bat_buoc" for r in a_items)
    assert all(r.nhom == "quyen_can_bao_dam" for r in b_items)


def test_unknown_type_returns_none():
    assert get_checklist("khong_ton_tai") is None


def test_required_items_trimmed_to_core_mandatory():
    """The coverage list is deliberately trimmed to only truly-important items,
    all mandatory — recommended-only concerns live in the per-clause signals."""
    rental = get_checklist("cho_thue_can_ho_chung_cu")
    sale = get_checklist("mua_ban_can_ho_chung_cu")
    assert rental is not None and sale is not None

    for checklist in (rental, sale):
        assert checklist.required_items
        assert len(checklist.required_items) <= 8
        assert all(r.bat_buoc for r in checklist.required_items)

    # ids differ between contract types — coverage prompts must not mix them up
    rental_ids = {r.id for r in rental.required_items}
    sale_ids = {r.id for r in sale.required_items}
    assert "B-Q2" in rental_ids  # được hoàn cọc (rental-specific)
    assert "B-Q2" in sale_ids  # thanh toán gắn mốc pháp lý (sale-specific)
    # Same id, different meaning per contract type — required_items must be
    # looked up from the checklist matching the contract's own loai_hop_dong.
    rental_q2 = next(r for r in rental.required_items if r.id == "B-Q2")
    sale_q2 = next(r for r in sale.required_items if r.id == "B-Q2")
    assert rental_q2.ten != sale_q2.ten
