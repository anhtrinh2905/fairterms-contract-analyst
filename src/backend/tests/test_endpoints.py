from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ingest_sample():
    with patch("app.api.routes.rag.ingest_legal_markdown") as mock_ingest:
        mock_ingest.return_value = {"parents": 2, "children": 5}
        resp = client.post("/rag/ingest-sample")
        assert resp.status_code == 200
        assert resp.json() == {"parents": 2, "children": 5, "status": "success"}


def test_ingest_upload():
    with patch("app.api.routes.rag.ingest_legal_markdown") as mock_ingest:
        mock_ingest.return_value = {"parents": 3, "children": 8}
        file_content = b"# Law Title\n## Chapter I\n### Article 1\n1. Clause 1\n2. Clause 2"
        files = {"file": ("test.md", file_content, "text/markdown")}
        resp = client.post("/rag/ingest-upload", files=files)
        assert resp.status_code == 200
        assert resp.json() == {"parents": 3, "children": 8, "status": "success"}


def test_search():
    with patch("app.api.routes.rag.retrieve") as mock_retrieve:
        from langchain_core.documents import Document
        mock_retrieve.return_value = [
            Document(page_content="Article 1 content", metadata={"article": "Điều 1"})
        ]
        resp = client.post("/rag/search", json={"query": "test query"})
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 1
        assert data["results"][0]["content"] == "Article 1 content"


def test_agent_chat():
    with patch("app.api.routes.agent.run_agent") as mock_run_agent:
        mock_run_agent.return_value = "This is a mock answer from Claude."
        resp = client.post("/agent/chat", json={"query": "test agent query", "conversation": []})
        assert resp.status_code == 200
        assert resp.json() == {"answer": "This is a mock answer from Claude."}


def test_ocr_structured_rate_limit_returns_429_with_retry_after():
    from app.services.gemini_ocr_service import GeminiOCRRateLimitError

    class FakeOCRService:
        def process_contract(self, **_kwargs):
            raise GeminiOCRRateLimitError(retry_after=15)

    with patch("app.api.routes.ocr.get_gemini_ocr_service", return_value=FakeOCRService()):
        files = {"file": ("contract.pdf", b"%PDF-1.4 fake", "application/pdf")}
        resp = client.post("/api/ocr/contract/structured", files=files)

    assert resp.status_code == 429
    assert resp.headers.get("Retry-After") == "15"
    assert "bận" in resp.json()["detail"]


def test_evaluate_coverage_returns_missing_and_found_items():
    from app.checklists import evaluator
    from app.checklists.loader import Checklist, RequiredItem, Role, RoleConvention

    checklist = Checklist(
        checklist_id="test_checklist",
        loai_hop_dong="cho_thue_can_ho_chung_cu",
        ten_hien_thi="Hợp đồng test",
        phien_ban="2.0",
        luu_y="test",
        van_ban_phap_luat_tham_chieu=[],
        convention=RoleConvention(
            ben_a=Role(key="ben_a", ma="ben_cho_thue", ten="Bên cho thuê", vi_the="manh_the"),
            ben_b=Role(key="ben_b", ma="ben_thue", ten="Bên thuê", vi_the="yeu_the"),
            protected_party="ben_b",
        ),
        required_items=[
            RequiredItem(
                id="A-D5", ten="hoan_coc_dung_han", bat_buoc=True,
                thuoc_ben="ben_a", nhom="nghia_vu_bat_buoc",
            ),
            RequiredItem(
                id="B-Q6", ten="giai_quyet_tranh_chap", bat_buoc=False,
                thuoc_ben="ben_b", nhom="quyen_can_bao_dam",
            ),
        ],
        signals=[],
    )
    fake_verdict = {
        "items": [
            {
                "id": "A-D5", "trang_thai": "co",
                "trich_dan": "Bên A hoàn cọc trong 7 ngày.", "ghi_chu": "",
                "goi_y_bo_sung": "should be ignored for 'co'", "vi_tri_de_xuat": "should be ignored",
            },
            {
                "id": "B-Q6", "trang_thai": "thieu",
                "trich_dan": "", "ghi_chu": "Không thấy cơ chế giải quyết.",
                "goi_y_bo_sung": "Mọi tranh chấp trước hết do hai bên thương lượng...",
                "vi_tri_de_xuat": "Điều 7 — Giải quyết tranh chấp",
            },
        ]
    }

    with patch.object(evaluator, "get_checklist", return_value=checklist), patch.object(
        evaluator, "resolve_openai_model", return_value="gpt-test"
    ), patch.object(
        evaluator, "complete_json_openai", return_value=(fake_verdict, "gpt-test")
    ):
        resp = client.post(
            "/checklist/evaluate-coverage",
            json={"loai_hop_dong": "cho_thue_can_ho_chung_cu", "full_text": "toàn văn hợp đồng..."},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["model"] == "gpt-test"
    assert data["ben_duoc_bao_ve"] == "ben_b"
    items_by_id = {i["id"]: i for i in data["items"]}
    assert items_by_id["A-D5"]["trang_thai"] == "co"
    assert items_by_id["A-D5"]["trich_dan"]
    # Suggestions only make sense for missing items — must be scrubbed for "co".
    assert items_by_id["A-D5"]["goi_y_bo_sung"] == ""
    assert items_by_id["A-D5"]["vi_tri_de_xuat"] == ""
    assert items_by_id["B-Q6"]["trang_thai"] == "thieu"
    assert items_by_id["B-Q6"]["bat_buoc"] is False
    assert items_by_id["B-Q6"]["goi_y_bo_sung"]
    assert items_by_id["B-Q6"]["vi_tri_de_xuat"] == "Điều 7 — Giải quyết tranh chấp"


def test_evaluate_coverage_unknown_contract_type_returns_404():
    resp = client.post(
        "/checklist/evaluate-coverage",
        json={"loai_hop_dong": "khong_ton_tai", "full_text": "abc"},
    )
    assert resp.status_code == 404


def test_ocr_images_structured_returns_multi_image_fields():
    from app.services.gemini_ocr_service import GeminiMultiImageOCRResult

    class FakeOCRService:
        def process_contract_images(self, **_kwargs):
            return GeminiMultiImageOCRResult(
                success=True,
                document_id="doc123",
                source_filename="a.jpg (+1 ảnh)",
                markdown_filename="reconstructed_contract.md",
                markdown="# HỢP ĐỒNG",
                processing_time_ms=120,
                page_count=2,
                image_order_used=(0, 1),
                order_confidence=0.92,
                order_warnings=(),
                timings_ms={"extraction_method": "multi_image"},
            )

    class FakeStructuringService:
        def structure_contract(self, _markdown, *, extraction_method=None, contract_kind=None):
            from types import SimpleNamespace

            return SimpleNamespace(
                contract={"contract_info": {}, "party_a": {}, "party_b": {}, "clauses": []},
                structuring_ms=50,
                method="mock",
                llm_calls=1,
            )

    with patch("app.api.routes.ocr.get_gemini_ocr_service", return_value=FakeOCRService()), patch(
        "app.api.routes.ocr.get_contract_structuring_service",
        return_value=FakeStructuringService(),
    ), patch(
        "app.api.routes.ocr.structured_to_public_dict",
        return_value=(
            {
                "contract_info": {},
                "party_a": {},
                "party_b": {},
                "appendix_equipment": [],
                "clauses": [],
            },
            [],
        ),
    ):
        files = [
            ("files", ("page1.jpg", b"\xff\xd8\xff fake jpeg", "image/jpeg")),
            ("files", ("page2.jpg", b"\xff\xd8\xff fake jpeg", "image/jpeg")),
        ]
        resp = client.post("/api/ocr/contract/images/structured", files=files)

    assert resp.status_code == 200
    data = resp.json()
    assert data["page_count"] == 2
    assert data["image_order_used"] == [0, 1]
    assert data["order_confidence"] == 0.92
    assert "structured" in data
