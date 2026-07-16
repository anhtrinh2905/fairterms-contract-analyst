FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        libreoffice-writer \
        libreoffice-java-common \
        fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.6.14 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

COPY pyproject.toml uv.lock ./

RUN for i in 1 2 3 4 5; do \
      uv cache clean zstandard >/dev/null 2>&1 || true; \
      uv sync --frozen --no-dev --no-install-project && break; \
      if [ "$i" = "5" ]; then exit 1; fi; \
      echo "uv sync failed, retrying in 5s (attempt $i)..."; \
      sleep 5; \
    done

COPY app ./app
COPY scripts ./scripts

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    LIBREOFFICE_BINARY=/usr/bin/soffice

# Bake the legal RAG index into the image. Every environment then queries the
# exact corpus shipped in this image — no manual re-ingest, and no persistent
# named volume that can drift stale from the corpus (the old bug: dev cited
# unrelated sale-law articles because chroma-dev held a pre-corpus-update index).
#
# The embedding key is a BuildKit secret (id=embed_key) so it never lands in a
# layer. EMBEDDING_MODEL is pinned to match runtime (.env.*): a mismatch here
# produces a different vector dimension and Chroma retrieval fails at query time.
# Requires BuildKit + network + an OpenAI embedding key at build.
RUN --mount=type=secret,id=embed_key \
    EMBEDDING_OPEN_AI_API_KEY="$(cat /run/secrets/embed_key)" \
    EMBEDDING_MODEL=text-embedding-3-large \
    CHROMA_PERSIST_DIR=/app/.chroma \
    python scripts/ingest.py --rebuild

# Drop root: the app process (and any RUN after this) runs as an unprivileged
# user, so a compromise of the FastAPI process can't act as root in the
# container. Created after the ingest step above so the build-time index write
# still runs as root; chown hands the baked venv, app, and .chroma to `app`.
#
# mkdir /app/logs BEFORE chown so the directory exists and is owned by `app`.
# The logs-* named volume mounts here; Docker copies this dir's ownership into
# an empty volume on first use, so the non-root process can write backend.log.
# Without this, the volume mountpoint defaults to root and the app crashes with
# PermissionError on /app/logs/backend.log.
RUN mkdir -p /app/logs \
    && groupadd --system app \
    && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app \
    && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
