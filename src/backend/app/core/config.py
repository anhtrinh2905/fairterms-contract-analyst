from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", extra="ignore")

    anthropic_api_key: str = ""
    gcp_agent_api_key: str = ""
    gcp_agent_project_id: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    gemini_gcp_platform_keys: str = ""
    gemini_ai_studio_key: str = ""
    gemini_model: str = ""
    gemini_timeout_seconds: int = 300
    gemini_max_upload_mb: int = 50
    gemini_max_images: int = 30
    gemini_thinking_budget: int = 0
    gemini_image_max_side: int = 0
    gemini_image_jpeg_quality: int = 92
    gemini_pdf_dpi: int = 120
    gemini_pdf_page_concurrency: int = 6
    gemini_structuring_model: str = "gemini-2.5-flash-lite"
    default_model: str = "gemini-2.5-flash"
    openai_model: str = "gpt-4o"

    # Embeddings (OpenAI — used by ChromaDB vector index).
    # 3-large beats 3-small by ~+8-10 điểm Hit@1/Hit@3 on the legal golden set;
    # changing this requires re-ingesting the corpus (scripts/ingest.py --rebuild).
    embedding_model: str = "text-embedding-3-large"
    embedding_open_ai_api_key: str = ""

    # Logging
    log_level: str = "INFO"
    log_dir: str = ""  # if set, also write logs to <log_dir>/backend.log

    # ChromaDB
    chroma_persist_dir: str = ".chroma"
    chroma_collection: str = "documents"

    # RAG
    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5

    # LangSmith (optional — latency + token/cost tracing)
    langsmith_api_key: str = ""
    langsmith_project: str = "fairterms"
    langsmith_tracing: bool = False

    # Checklist citation pipeline (GĐ2/GĐ3)
    # v2 = RAG-first citations: LLM no longer free-writes `can_cu`; it only
    # selects among retrieved candidates, then a grounding judge verifies.
    checklist_enable_rag_citation_v2: bool = False
    checklist_citation_top_k: int = 8
    checklist_citation_rerank_top_n: int = 5
    grounding_judge_model: str = "gpt-4o-mini"
    grounding_score_threshold: float = 0.0  # 0 disables the score prefilter

    # Redis cache for clause evaluation.
    # A clause already analysed once is served from cache instead of re-running
    # the (expensive) GPT-4o + RAG pipeline. Fail-open: if Redis is down the
    # request falls back to a normal fresh evaluation.
    redis_url: str = ""
    checklist_cache_enabled: bool = False
    checklist_cache_ttl_seconds: int = 60 * 60 * 24 * 30  # 30 days

    # Internal admin API protection token (required for /admin/* backend routes).
    admin_api_token: str = Field(default="", validation_alias="ADMIN_API_TOKEN")


settings = Settings()
