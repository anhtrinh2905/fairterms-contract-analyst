"""Tests for the legal document registry and /rag/documents endpoints."""

from fastapi.testclient import TestClient

from app.main import app
from app.rag.documents import list_documents

client = TestClient(app)


def test_list_documents_registry():
    docs = list_documents()
    assert len(docs) > 0
    by_id = {d.doc_id: d for d in docs}
    blds = by_id["bo_luat_dan_su_2015"]
    assert blds.title == "Bộ luật Dân sự 2015"
    assert blds.so_hieu == "91/2015/QH13"
    assert blds.source_file == "bo_luat_dan_su_2015_91_2015_qh13.md"
    # no duplicates even though each file registers id + stem aliases
    assert len(by_id) == len(docs)


def test_get_documents_endpoint():
    resp = client.get("/rag/documents")
    assert resp.status_code == 200
    assert "max-age" in resp.headers.get("cache-control", "")
    documents = resp.json()["documents"]
    assert any(d["doc_id"] == "bo_luat_dan_su_2015" for d in documents)


def test_get_document_content_by_id():
    resp = client.get("/rag/documents/bo_luat_dan_su_2015")
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Bộ luật Dân sự 2015"
    assert "### Điều 1." in body["content"]
    # frontmatter is stripped from the served body
    assert not body["content"].startswith("---")


def test_get_document_content_by_filename_stem():
    resp = client.get("/rag/documents/bo_luat_dan_su_2015_91_2015_qh13")
    assert resp.status_code == 200
    assert resp.json()["doc_id"] == "bo_luat_dan_su_2015"


def test_get_document_unknown_returns_404():
    resp = client.get("/rag/documents/khong_ton_tai")
    assert resp.status_code == 404
    assert "Không tìm thấy" in resp.json()["detail"]


def test_get_document_rejects_path_traversal():
    resp = client.get("/rag/documents/..%2F..%2Fmain")
    assert resp.status_code == 404


def test_download_document():
    resp = client.get("/rag/documents/bo_luat_dan_su_2015/download")
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/pdf"
    disposition = resp.headers.get("content-disposition", "")
    assert "attachment" in disposition
    assert "bo_luat_dan_su_2015_91_2015_qh13.pdf" in disposition
    assert resp.content.startswith(b"%PDF")


def test_download_document_pdf_contains_expected_text():
    import fitz

    resp = client.get("/rag/documents/bo_luat_dan_su_2015/download")
    doc = fitz.open(stream=resp.content, filetype="pdf")
    assert doc.page_count > 0
    assert "Điều 1." in doc[0].get_text()


def test_download_unknown_returns_404():
    resp = client.get("/rag/documents/khong_ton_tai/download")
    assert resp.status_code == 404
