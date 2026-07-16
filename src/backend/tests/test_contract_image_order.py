import pytest

from app.services.contract_image_order import (
    analyze_and_maybe_reorder_pages,
    resolve_upload_order,
    score_page_sequence,
    validate_image_count,
    validate_page_order,
)


def test_validate_image_count_requires_at_least_two():
    with pytest.raises(ValueError, match="ít nhất 2"):
        validate_image_count(1)
    validate_image_count(2)


def test_validate_page_order_accepts_permutation():
    assert validate_page_order([2, 0, 1], 3) == [2, 0, 1]


def test_validate_page_order_rejects_invalid():
    with pytest.raises(ValueError):
        validate_page_order([0, 0, 1], 3)


def test_resolve_upload_order_prefers_user_order():
    order = resolve_upload_order(3, ["c.jpg", "a.jpg", "b.jpg"], user_order=[1, 2, 0], auto_sort=True)
    assert order == [1, 2, 0]


def test_resolve_upload_order_sorts_by_filename_number():
    order = resolve_upload_order(
        3,
        ["IMG_0003.jpg", "IMG_0001.jpg", "IMG_0002.jpg"],
        user_order=None,
        auto_sort=True,
    )
    assert order == [1, 2, 0]


def test_score_page_sequence_rewards_title_and_signature():
    pages = [
        "# HỢP ĐỒNG CHO THUÊ\n### Điều 1. Phạm vi",
        "### Điều 2. Giá thuê",
        "Ký tên\nĐại diện Bên A",
    ]
    assert score_page_sequence(pages) > 0.7


def test_analyze_and_maybe_reorder_detects_article_order_issue():
    pages = [
        "### Điều 2. Giá thuê",
        "### Điều 1. Phạm vi",
    ]
    outcome = analyze_and_maybe_reorder_pages(
        pages,
        user_order_provided=True,
        auto_sort=False,
    )
    assert any("Điều" in warning for warning in outcome.warnings)


def test_analyze_adjacent_swap_improves_order():
    pages = [
        "# HỢP ĐỒNG\n### Điều 1. A",
        "### Điều 3. C",
        "### Điều 2. B",
    ]
    outcome = analyze_and_maybe_reorder_pages(
        pages,
        user_order_provided=False,
        auto_sort=True,
    )
    articles = []
    for page in outcome.markdown_pages:
        if "Điều 1" in page:
            articles.append(1)
        if "Điều 2" in page:
            articles.append(2)
        if "Điều 3" in page:
            articles.append(3)
    assert articles.index(2) < articles.index(3)
