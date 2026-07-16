#!/usr/bin/env bash
# One-time server bootstrap: nginx + certbot packages, enable site config.
# Run on GCP VM: sudo bash ~/fairterms/deploy/setup-server.sh
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/fairterms-deploy/fairterms/deploy}"
NGINX_SITE="/etc/nginx/sites-available/fairterms"

echo "==> Installing nginx + certbot..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "==> Installing nginx site config..."
cp "$DEPLOY_DIR/nginx/fairterms.conf" "$NGINX_SITE"
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/fairterms
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Done. HTTP reverse proxy is active."
echo "    Next: point DNS A records to this server, then run:"
echo "    sudo bash $DEPLOY_DIR/setup-ssl.sh"
