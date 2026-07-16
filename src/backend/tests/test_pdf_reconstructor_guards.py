from scripts.reconstruct_pdf import (
    has_meaningful_text,
    output_matches_source,
    output_switches_document,
    validate_page_output,
)


def test_has_meaningful_text_skips_empty_pages():
    assert has_meaningful_text("   \n  ") is False
    assert has_meaningful_text("94") is False
    assert has_meaningful_text(
        "Dieu 117. Vay von uu dai thong qua Ngan hang chinh sach xa hoi de phat trien nha o xa hoi"
    ) is True


def test_output_switches_document_detects_different_law_title():
    output = "# Luat Doanh Nghiep\n\n### Dieu 1. Pham vi dieu chinh"
    assert output_switches_document(output, "Luat Nha O") is True
    assert output_switches_document("# Luat Nha O\n\n### Dieu 1.", "Luat Nha O") is False


def test_output_matches_source_rejects_unrelated_text():
    source = "Dieu 117. Vay von uu dai thong qua Ngan hang chinh sach xa hoi de phat trien nha o xa hoi."
    good_output = "### Dieu 117. Vay von uu dai thong qua Ngan hang chinh sach xa hoi"
    bad_output = "### Dieu 1. Cong ty co phan la doanh nghiep co von dieu le chia thanh co phan."

    assert output_matches_source(good_output, source) is True
    assert output_matches_source(bad_output, source) is False


def test_validate_page_output_drops_hallucinated_document_switch():
    page_md = "# Luat Doanh Nghiep\n\n### Dieu 1. Pham vi dieu chinh"
    result = validate_page_output(
        page_md=page_md,
        source_text="",
        expected_title="Luat Nha O",
        page_num=94,
        mode="vision",
    )

    assert "REJECTED PAGE 94" in result


def test_validate_page_output_preserves_text_source_on_validation_failure():
    page_md = "# Luat Doanh Nghiep\n\n### Dieu 1. Pham vi dieu chinh"
    source_text = "Dieu 117. Vay von uu dai thong qua Ngan hang chinh sach xa hoi."
    result = validate_page_output(
        page_md=page_md,
        source_text=source_text,
        expected_title="Luat Nha O",
        page_num=93,
        mode="text",
    )

    assert "FALLBACK PAGE 93" in result
    assert source_text in result


def test_validate_page_output_preserves_text_source_on_empty_model_output():
    source_text = "Dieu 118. Noi dung van ban goc van phai duoc giu lai."
    result = validate_page_output(
        page_md="",
        source_text=source_text,
        expected_title="Luat Nha O",
        page_num=118,
        mode="text",
    )

    assert "FALLBACK PAGE 118" in result
    assert source_text in result
