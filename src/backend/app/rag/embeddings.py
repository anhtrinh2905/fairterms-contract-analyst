from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings

from app.core.config import settings

_embeddings: Embeddings | None = None


def get_embeddings() -> Embeddings:
    global _embeddings
    if _embeddings is None:
        api_key = settings.embedding_open_ai_api_key or settings.openai_api_key
        if not api_key:
            raise ValueError(
                "OpenAI embedding API key is required. "
                "Set EMBEDDING_OPEN_AI_API_KEY or OPENAI_API_KEY in .env"
            )
        _embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            api_key=api_key,
        )
    return _embeddings
