import logging

from app.rag.service import rag_query

logger = logging.getLogger(__name__)


def run_agent(query: str, conversation: list[dict] | None = None) -> str:
    """RAG-augmented legal assistant."""
    logger.info("run_agent: query_len=%d, history=%d", len(query), len(conversation or []))
    history = conversation or []
    if history:
        history_text = "\n".join(
            f"{item.get('role', 'user')}: {item.get('content', '')}" for item in history[-6:]
        )
        effective_query = f"Recent conversation:\n{history_text}\n\nCurrent question:\n{query}"
    else:
        effective_query = query

    response = rag_query(effective_query)
    answer = response.answer
    logger.info("run_agent: done, answer_len=%d", len(answer))
    return answer
