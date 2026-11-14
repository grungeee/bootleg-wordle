#!/usr/bin/env bash
# Turn on HTTPS for api.sharapa.io once its DNS record exists.
# Run as root on the API host:  sudo bash deploy/enable-api-tls.sh
set -euo pipefail

DOMAIN="${1:-api.sharapa.io}"
HEALTH="https://${DOMAIN}/api/v1/healthz"

resolved_v4="$(dig +short "$DOMAIN" A @1.1.1.1 | tr '\n' ' ' | sed 's/ $//')"
resolved_v6="$(dig +short "$DOMAIN" AAAA @1.1.1.1 | tr '\n' ' ' | sed 's/ $//')"

if [ -z "$resolved_v4$resolved_v6" ]; then
  cat <<TXT
$DOMAIN does not resolve yet, so certificate issuance would fail.

Add these two records at Porkbun (DNS for sharapa.io):

  Type  Host  Answer
  A     api   178.105.158.45
  AAAA  api   2a01:4f8:c015:fc57::1
  (TTL 600, no proxy)

Then run this script again.
TXT
  exit 1
fi

printf 'DNS: A=[%s] AAAA=[%s]\n' "$resolved_v4" "$resolved_v6"

if ! curl -fsS -m 10 -H "Host: $DOMAIN" http://127.0.0.1/api/v1/healthz >/dev/null; then
  printf 'nginx is not answering for %s on port 80; start it before issuing a certificate.\n' "$DOMAIN"
  exit 1
fi

certbot --nginx -d "$DOMAIN" --redirect --non-interactive --agree-tos \
  --register-unsafely-without-email

body="$(curl -fsS -m 15 "$HEALTH")"
printf 'healthz: %s\n' "$body"
case "$body" in
  *'"ok":true'*) ;;
  *) printf 'healthz did not report ok\n'; exit 1 ;;
esac

printf 'certificate:\n'
certbot certificates --cert-name "$DOMAIN" | sed -n '1,20p'

printf '\nAPI is live at %s\n' "$HEALTH"
