#!/usr/bin/env bash
# Provision the SHARAPA API on this Debian/Ubuntu host.
#
#   sudo bash deploy/setup-server.sh
#
# Installs: nginx + certbot (if missing), a dedicated system user, a Python
# virtualenv and an application copy under /opt/sharapa-api, a systemd unit and
# an nginx site for api.sharapa.io. Requesting the TLS certificate only happens
# once the DNS name actually points at this host.
#
# Idempotent: re-running refreshes the code, deps, unit and vhost.
set -euo pipefail

DOMAIN="${SHARAPA_API_DOMAIN:-api.sharapa.io}"
RUN_USER="${SHARAPA_API_RUN_USER:-sharapa-api}"
APP_ROOT="/opt/sharapa-api"
DATA_DIR="/var/lib/sharapa-api"
ETC_DIR="/etc/sharapa-api"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$APP_ROOT/venv"

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root (sudo bash $0)" >&2
  exit 1
fi

echo "== packages =="
export DEBIAN_FRONTEND=noninteractive
missing=()
for pkg in nginx certbot python3-venv python3-certbot-nginx curl; do
  dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null | grep -q "install ok installed" || missing+=("$pkg")
done
if [ ${#missing[@]} -gt 0 ]; then
  apt-get update -qq
  apt-get install -y --no-install-recommends "${missing[@]}"
fi
echo "nginx $(nginx -v 2>&1 | sed 's#.*/##'), $(certbot --version 2>&1)"

echo "== service account =="
if ! id -u "$RUN_USER" >/dev/null 2>&1; then
  useradd --system --home "$DATA_DIR" --shell /usr/sbin/nologin "$RUN_USER"
fi

echo "== application copy =="
install -d -o root -g root -m 0755 "$APP_ROOT"
rm -rf "$APP_ROOT/app"
install -d -o root -g root -m 0755 "$APP_ROOT/app/api"
install -o root -g root -m 0644 "$REPO_DIR"/api/*.py "$APP_ROOT/app/api/"
if [ -f "$REPO_DIR/api/admin.html" ]; then
  install -o root -g root -m 0644 "$REPO_DIR/api/admin.html" "$APP_ROOT/app/api/admin.html"
fi

echo "== python environment =="
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV"
fi
"$VENV/bin/python" -m pip install --quiet --upgrade pip
"$VENV/bin/python" -m pip install --quiet --requirement "$REPO_DIR/api/requirements.txt"
"$VENV/bin/python" -c 'import fastapi, uvicorn, argon2, maxminddb; print("deps ok")'

echo "== data directories =="
install -d -o "$RUN_USER" -g "$RUN_USER" -m 0700 "$DATA_DIR"
install -d -o root -g "$RUN_USER" -m 0750 "$ETC_DIR"

if [ -f "$REPO_DIR/.secrets/api.env" ]; then
  install -o root -g "$RUN_USER" -m 0640 "$REPO_DIR/.secrets/api.env" "$ETC_DIR/api.env"
elif [ ! -f "$ETC_DIR/api.env" ]; then
  echo "missing $REPO_DIR/.secrets/api.env; run deploy/generate-secrets.sh first" >&2
  exit 1
else
  echo "keeping existing $ETC_DIR/api.env"
fi

echo "== geo database =="
if [ -f "$REPO_DIR/api/data/ip-to-country.mmdb" ]; then
  install -o root -g "$RUN_USER" -m 0640 "$REPO_DIR/api/data/ip-to-country.mmdb" "$DATA_DIR/ip-to-country.mmdb"
else
  echo "note: no ip-to-country.mmdb present, country is recorded as ZZ until one is installed"
fi

echo "== systemd unit =="
install -o root -g root -m 0644 "$REPO_DIR/deploy/sharapa-api.service" /etc/systemd/system/sharapa-api.service
systemctl daemon-reload
systemctl enable sharapa-api.service >/dev/null
systemctl restart sharapa-api.service

echo "== nginx =="
sed -e "s/@DOMAIN@/$DOMAIN/g" "$REPO_DIR/deploy/nginx-sharapa-api.conf" > /etc/nginx/sites-available/sharapa-api
ln -sf /etc/nginx/sites-available/sharapa-api /etc/nginx/sites-enabled/sharapa-api
nginx -t
systemctl enable nginx >/dev/null
systemctl restart nginx

echo "== health =="
ok=0
for _ in $(seq 1 20); do
  if curl -fsS -m 3 "http://127.0.0.1:8760/api/v1/healthz" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  echo "api did not start; journalctl -u sharapa-api -n 50" >&2
  exit 1
fi
echo "api healthy on 127.0.0.1:8760"

echo
# Read the addresses off the interface, not an external echo service: outbound
# HTTPS to those services is blocked on this host, which used to hang the script.
PUBLIC_IP="$(ip -4 -brief addr show scope global | awk '$2!="tailscale0"{print $3}' | cut -d/ -f1 | head -1)"
PUBLIC_IP6="$(ip -6 -brief addr show scope global | awk '$2!="tailscale0"{print $3}' | cut -d/ -f1 | head -1)"
RESOLVED="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}')"
echo "this host IPv4: ${PUBLIC_IP:-unknown}"
echo "this host IPv6: ${PUBLIC_IP6:-unknown}"
echo "$DOMAIN resolves to: ${RESOLVED:-nothing}"

if [ -n "$RESOLVED" ] && [ "$RESOLVED" = "$PUBLIC_IP" ]; then
  echo "== TLS =="
  if certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos --register-unsafely-without-email; then
    systemctl reload nginx
    echo "TLS active: https://$DOMAIN/api/v1/healthz"
  else
    echo "certbot failed; re-run: certbot --nginx -d $DOMAIN --redirect" >&2
  fi
else
  echo
  echo "DNS is not pointing here yet. Add these records at the registrar:"
  echo "  $DOMAIN  A     ${PUBLIC_IP:-<this host>}"
  echo "  $DOMAIN  AAAA  ${PUBLIC_IP6:-<this host>}"
  echo "then re-run this script (it requests the certificate automatically), or:"
  echo "  certbot --nginx -d $DOMAIN --redirect && systemctl reload nginx"
fi
