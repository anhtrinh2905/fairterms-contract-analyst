#!/usr/bin/env bash
# One-time server bootstrap: Docker + nginx + certbot, enable site config.
# Run on the AWS EC2 instance: sudo bash ~/fairterms/deploy/setup-server.sh
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/home/fairterms-deploy/fairterms/deploy}"
NGINX_SITE="/etc/nginx/sites-available/fairterms"
# The login user that CI deploys as (owns ~/fairterms). Under sudo, SUDO_USER
# is the invoking user; fall back to USER when run without sudo.
DEPLOY_USER="${SUDO_USER:-${USER}}"

echo "==> Installing Docker Engine + compose plugin (if missing)..."
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
# CI runs `docker` without sudo — the deploy user must be in the docker group.
if [ "$DEPLOY_USER" != "root" ]; then
  usermod -aG docker "$DEPLOY_USER"
  echo "    Added ${DEPLOY_USER} to docker group (takes effect on next login/session)."
fi
systemctl enable --now docker

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
