#!/usr/bin/env bash
# Patch live nginx SSL config for OCR upload limits (idempotent).
# Run on VM: sudo bash ~/fairterms/deploy/patch-nginx-upload-limits.sh
set -euo pipefail

NGINX_SITE="${NGINX_SITE:-/etc/nginx/sites-available/fairterms}"

python3 - "$NGINX_SITE" <<'PY'
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

API_HOSTS = ("api-dev.c2-app-145.io.vn", "api.c2-app-145.io.vn")
LIMITS = (
    "    client_max_body_size 55m;",
    "        proxy_read_timeout 600s;",
    "        proxy_send_timeout 600s;",
)

for host in API_HOSTS:
    if f"server_name {host};" not in text:
        continue

    # server-level body size (once per api server block)
    server_pat = re.compile(
        rf"(server \{{\s+server_name {re.escape(host)};\s*)",
        re.MULTILINE,
    )
    if "client_max_body_size" not in text.split(f"server_name {host};", 1)[1].split("server {", 1)[0]:
        text, n = server_pat.subn(rf"\1\n    client_max_body_size 55m;\n\n    ", text, count=1)

    # location-level proxy timeouts inside the same server block.
    # This must be idempotent: CI runs patch multiple times, and nginx rejects
    # duplicate directives. So we remove any existing proxy_read/send_timeout
    # inside `location / { ... }` then re-insert exactly once.
    loc_block_pat = re.compile(
        rf"(server \{{.*?server_name {re.escape(host)};.*?location / \{{)(.*?)(\n\s*\}})",
        re.DOTALL,
    )

    def patch_location(match: re.Match) -> str:
        prefix, content, suffix = match.group(1), match.group(2), match.group(3)
        # Remove existing directives (if any) to avoid duplication.
        content = re.sub(
            r"^\s*proxy_read_timeout\s+\S+;\s*\n?",
            "",
            content,
            flags=re.MULTILINE,
        )
        content = re.sub(
            r"^\s*proxy_send_timeout\s+\S+;\s*\n?",
            "",
            content,
            flags=re.MULTILINE,
        )

        anchor = r"(proxy_set_header X-Forwarded-Proto \$scheme;\s*)"
        if re.search(anchor, content):
            content = re.sub(
                anchor,
                r"\1        proxy_read_timeout 600s;\n        proxy_send_timeout 600s;\n",
                content,
                count=1,
                flags=re.MULTILINE,
            )
        else:
            # Fallback: append at end of location block.
            content = content.rstrip() + "\n        proxy_read_timeout 600s;\n        proxy_send_timeout 600s;\n"
        return prefix + content + suffix

    text = loc_block_pat.sub(patch_location, text, count=1)

path.write_text(text, encoding="utf-8")
print(f"Patched {path}")
PY

nginx -t
systemctl reload nginx
echo "==> Nginx upload limits applied."
