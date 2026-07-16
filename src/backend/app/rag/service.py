"""High-level legal RAG query service."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Any, Literal

from langchain_core.documents import Document

from app.rag.citation import Citation, build_citations
from app.rag.pipeline import retrieve
from app.services.analysis_llm import complete_json, resolve_model
from app.services.langsmith_tracing import trace_chain

logger = logging.getLogger(__name__)

Confidence = Literal["high", "medium", "low"]
RAGStatus = Literal["success", "insufficient_evidence", "error"]


@dataclass
class RAGResponse:
    answer: str
    citations: list[Citation]
    retrieved_chunks: list[dict[str, Any]]
    confidence: Confidence
    status: RAGStatus

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["citations"] = [citation.to_dict() for citation in self.citations]
        return data


def _score(doc: Document) -> float:
    try:
        return float(doc.metadata.get("_score", 0))
    except (TypeError, ValueError):
        return 0.0


def _evidence_strength(docs: list[Document]) -> float:
    strengths: list[float] = []
    fallback_scores: list[float] = []
    for doc in docs:
        metadata = doc.metadata or {}
        for key in ("_vector_score", "_bm25_score"):
            try:
                strengths.append(float(metadata.get(key, 0)))
            except (TypeError, ValueError):
                continue
        try:
            fallback_scores.append(float(metadata.get("_score", 0)))
        except (TypeError, ValueError):
            continue
    if strengths:
        return max(strengths)
    return max(fallback_scores) if fallback_scores else 0.0


def _confidence(docs: list[Document]) -> Confidence:
    if not docs:
        return "low"
    strength = _evidence_strength(docs)
    if strength >= 0.72 and len(docs) >= 3:
        return "high"
    if strength >= 0.25 and len(docs) >= 2:
        return "medium"
    return "low"


def _insufficient(docs: list[Document]) -> bool:
    return not docs or _evidence_strength(docs) < 0.08


def _apply_filters(docs: list[Document], filters: dict | None) -> list[Document]:
    if not filters:
        return docs
    filtered: list[Document] = []
    for doc in docs:
        metadata = doc.metadata or {}
        if all(metadata.get(key) == value for key, value in filters.items()):
            filtered.append(doc)
    return filtered


def _doc_payload(doc: Document) -> dict[str, Any]:
    return {
        "content": doc.page_content,
        "metadata": doc.metadata,
        "score": round(_score(doc), 4),
    }


def _context_block(docs: list[Document]) -> str:
    blocks: list[str] = []
    for idx, doc in enumerate(docs, start=1):
        metadata = doc.metadata or {}
        source = metadata.get("source", "")
        law = metadata.get("law", "")
        article = metadata.get("article", "")
        score = round(_score(doc), 4)
        blocks.append(
            "\n".join(
                [
                    f"[C{idx}] score={score}",
                    f"source={source}",
                    f"law={law}",
                    f"article={article}",
                    doc.page_content,
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


LEGAL_SYSTEM_PROMPT = """\
You are a legal-research assistant for Vietnamese contract law.
Hard rules:
- Rely ONLY on the provided context; never invent laws, article numbers, or content outside it.
- Never claim to be a lawyer; this does not replace formal legal advice.
- If the evidence is insufficient, state clearly which part lacks legal basis.
- Always answer in Vietnamese.
- Keep the answer concise, structured into sections: Nội dung hợp đồng, Căn cứ pháp luật,
  Đánh giá rủi ro, Cần kiểm tra thêm.
- Every key legal statement must carry an inline citation like [C1], [C2].
- End with a note that this is reference information, not legal advice.

Return exactly one JSON object:
{
  "answer": "<complete Vietnamese answer with inline citations>"
}
"""


def _llm_answer(
    query: str,
    docs: list[Document],
    *,
    contract_type: str | None,
) -> str:
    user_prompt = (
        f"Contract type: {contract_type or 'unknown'}\n\n"
        f"Question:\n{query}\n\n"
        f"Context:\n{_context_block(docs)}"
    )

    parsed, _model = complete_json(LEGAL_SYSTEM_PROMPT, user_prompt, model=resolve_model())
    return str(parsed.get("answer") or "").strip()


@trace_chain(name="rag_query")
def rag_query(
    query: str,
    *,
    top_k: int = 10,
    contract_type: str | None = None,
    filters: dict | None = None,
) -> RAGResponse:
    """Run hybrid retrieval, generate a legal-aware answer, and attach citations."""
    try:
        docs = retrieve(
            query,
            top_k=top_k,
            rerank_top_n=min(top_k, 5),
            hybrid=True,
        )
        docs = _apply_filters(docs, filters)
        citations = build_citations(docs)
        confidence = _confidence(docs)

        if _insufficient(docs):
            return RAGResponse(
                answer=(
                    "Chua tim thay can cu phap ly du manh trong kho du lieu de tra loi "
                    "cau hoi nay. Vui long kiem tra lai pham vi van ban da ingest hoac "
                    "bo sung tu khoa/cu the hon."
                ),
                citations=citations,
                retrieved_chunks=[_doc_payload(doc) for doc in docs],
                confidence="low",
                status="insufficient_evidence",
            )

        answer = _llm_answer(query, docs, contract_type=contract_type)
        if not answer:
            answer = "Da tim thay can cu lien quan, nhung khong tao duoc cau tra loi."

        return RAGResponse(
            answer=answer,
            citations=citations,
            retrieved_chunks=[_doc_payload(doc) for doc in docs],
            confidence=confidence,
            status="success",
        )
    except Exception as exc:
        logger.exception("rag_query failed")
        return RAGResponse(
            answer=f"Da xay ra loi khi truy van RAG: {exc}",
            citations=[],
            retrieved_chunks=[],
            confidence="low",
            status="error",
        )
