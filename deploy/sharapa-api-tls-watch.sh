#!/usr/bin/env bash
# Wait for api.sharapa.io to resolve to this host, then turn on HTTPS once.
# Installed as sharapa-api-tls.service / .timer by deploy/setup-server.sh.
set -euo pipefail

DOMAIN="${SHARAPA_API_DOMAIN:-api.sharapa.io}"
STATE_DIR="/var/lib/sharapa-api"
STATE="$STATE_DIR/tls-watch.state"
LOG="/var/log/sharapa-tls.log"
PUBLIC_IP="${SHARAPA_PUBLIC_IP:-178.105.158.45}"

[ -f "$STATE" ] && exit 0
mkdir -p "$STATE_DIR"
[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && { echo done >"$STATE"; exit 0; }

resolved="$(dig +short "$DOMAIN" A @1.1.1.1 | tr '\n' ' ')"
case " $resolved " in
  *" $PUBLIC_IP "*) ;;
  *) echo "$(date -Is) $DOMAIN resolves to [$resolved], waiting for $PUBLIC_IP" >>"$LOG"; exit 0 ;;
esac

if ! curl -fsS -m 10 -H "Host: $DOMAIN" http://127.0.0.1/api/v1/healthz >/dev/null; then
  echo "$(date -Is) nginx not answering for $DOMAIN" >>"$LOG"; exit 0
fi

echo "$(date -Is) issuing certificate for $DOMAIN" >>"$LOG"
certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos \
  --register-unsafely-without-email >>"$LOG" 2>&1
echo done >"$STATE"
echo "$(date -Is) certificate issued" >>"$LOG"
