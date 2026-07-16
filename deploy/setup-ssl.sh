#!/usr/bin/env bash
# Issue Let's Encrypt certificates for all FairTerms subdomains.
# Prerequisites: DNS A records must point to this server; ports 80/443 open in GCP firewall.
set -euo pipefail

DOMAIN="c2-app-145.io.vn"

certbot --nginx \
  -d "dev.${DOMAIN}" \
  -d "api-dev.${DOMAIN}" \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  -d "api.${DOMAIN}" \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect

echo "==> SSL certificates installed."
