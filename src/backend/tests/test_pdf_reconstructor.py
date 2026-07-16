import pytest
from unittest.mock import MagicMock
from scripts.reconstruct_pdf import (
    is_scanned_pdf,
    extract_metadata,
    process_page_text,
)

def test_is_scanned_pdf_digital():
    # Mock fitz Document with digital text
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.get_text.return_value = "Điều 1. Phạm vi điều chỉnh\nĐây là văn bản kỹ thuật số." * 5
    mock_doc.__len__.return_value = 2
    mock_doc.__getitem__.side_effect = lambda idx: mock_page
    
    assert is_scanned_pdf(mock_doc, check_pages=2) is False


def test_is_scanned_pdf_scanned():
    # Mock fitz Document with empty text (scanned images)
    mock_doc = MagicMock()
    mock_page = MagicMock()
    mock_page.get_text.return_value = "   "
    mock_doc.__len__.return_value = 2
    mock_doc.__getitem__.side_effect = lambda idx: mock_page
    
    assert is_scanned_pdf(mock_doc, check_pages=2) is True


def test_extract_metadata():
    # Mock OpenAI client
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"id": "luat_nha_o_2023", "title": "Luật Nhà ở", "so_hieu": "27/2023/QH15", "ngay_ban_hanh": "2023-11-27"}'
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    metadata = extract_metadata("Trang đầu tiên của Luật Nhà ở", mock_client)
    assert metadata["id"] == "luat_nha_o_2023"
    assert metadata["title"] == "Luật Nhà ở"
    assert metadata["so_hieu"] == "27/2023/QH15"
    assert metadata["ngay_ban_hanh"] == "2023-11-27"


def test_process_page_text():
    # Mock OpenAI client response for text page reconstruction
    mock_client = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "### Điều 1. Phạm vi điều chỉnh\n\n1. Luật này quy định..."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_client.chat.completions.create.return_value = mock_response

    reconstructed = process_page_text("Dieu 1. Pham vi dieu chinh\n1. Luat nay quy dinh...", 1, mock_client)
    assert "### Điều 1. Phạm vi điều chỉnh" in reconstructed
    assert "1. Luật này quy định..." in reconstructed
