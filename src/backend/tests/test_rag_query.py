from fastapi.testclient import TestClient
from langchain_core.documents import Document

from app.main import app
from app.rag import service
from app.rag.citation import Citation

client = TestClient(app)


def test_rag_query_returns_answer_with_citations(monkeypatch) -> None:
    docs = [
        Document(
            page_content="### Dieu 1\n\nNoi dung can cu phap ly ve hop dong.",
            metadata={
                "source": "app/rag/data/example.md",
                "law": "Luat vi du",
                "article": "Dieu 1. Pham vi",
                "_score": 0.9,
                "_vector_score": 0.8,
                "_bm25_score": 1.0,
            },
        ),
        Document(
            page_content="### Dieu 2\n\nNoi dung bo sung.",
            metadata={
                "source": "app/rag/data/example.md",
                "law": "Luat vi du",
                "article": "Dieu 2. Giai thich",
                "_score": 0.7,
                "_vector_score": 0.5,
                "_bm25_score": 0.6,
            },
        ),
    ]

    monkeypatch.setattr(service, "retrieve", lambda *args, **kwargs: docs)
    monkeypatch.setattr(service, "_llm_answer", lambda *args, **kwargs: "Cau tra loi [C1].")

    response = service.rag_query("Can cu nao ap dung?", top_k=2)

    assert response.status == "success"
    assert response.confidence in {"medium", "high"}
    assert response.answer == "Cau tra loi [C1]."
    assert len(response.citations) == 2
    assert response.citations[0].source_file == "example.md"


def test_rag_query_insufficient_evidence(monkeypatch) -> None:
    monkeypatch.setattr(service, "retrieve", lambda *args, **kwargs: [])

    response = service.rag_query("Cau hoi ngoai pham vi?")

    assert response.status == "insufficient_evidence"
    assert response.confidence == "low"
    assert response.citations == []


def test_rag_query_endpoint(monkeypatch) -> None:
    response = service.RAGResponse(
        answer="Cau tra loi [C1].",
        citations=[
            Citation(
                source_file="example.md",
                law_title="Luat vi du",
                article="Dieu 1",
                clause=None,
                point=None,
                quote="Noi dung can cu.",
                location="Dieu 1",
                score=0.9,
            )
        ],
        retrieved_chunks=[],
        confidence="high",
        status="success",
    )

    monkeypatch.setattr("app.api.routes.rag.rag_query", lambda *args, **kwargs: response)

    resp = client.post("/rag/query", json={"query": "Can cu nao?", "top_k": 3})

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["confidence"] == "high"
    assert data["citations"][0]["source_file"] == "example.md"
