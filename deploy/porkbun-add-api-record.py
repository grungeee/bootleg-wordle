#!/usr/bin/env python3
"""Add the api.sharapa.io A/AAAA records through the Porkbun API.

Usage (on the server, keys never in chat):
    PORKBUN_API_KEY=... PORKBUN_SECRET_KEY=... python3 deploy/porkbun-add-api-record.py

Reads the keys from the environment or from ~/.hermes/.env so they can live in
the secrets file instead of a shell history.
"""
from __future__ import annotations

import json
import os
import pathlib
import subprocess
import sys
import urllib.request

DOMAIN = "sharapa.io"
HOST = "api"
IPV4 = "178.105.158.45"
IPV6 = "2a01:4f8:c015:fc57::1"
ENV_FILE = pathlib.Path.home() / ".hermes" / ".env"


def secret(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip()
    return ""


def post(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode()
    request = urllib.request.Request(
        "https://api.porkbun.com/api/json/v3" + path,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read())


def existing() -> set[tuple[str, str]]:
    result = post(f"/dns/retrieve/{DOMAIN}", {"apikey": KEY, "secretapikey": SECRET})
    if result.get("status") != "SUCCESS":
        raise SystemExit(f"Porkbun refused the retrieve call: {result}")
    return {
        (record["type"], record["content"])
        for record in result.get("records", [])
        if record.get("name") == f"{HOST}.{DOMAIN}"
    }


KEY = secret("PORKBUN_API_KEY")
SECRET = secret("PORKBUN_SECRET_KEY")

if not KEY or not SECRET:
    print(
        "No Porkbun API key found.\n\n"
        "Create one in the Porkbun dashboard: Account -> API Access -> Create API Key,\n"
        "enable DNS access for sharapa.io, then save both values on this server:\n\n"
        "  printf 'PORKBUN_API_KEY=...\\nPORKBUN_SECRET_KEY=...\\n' >> ~/.hermes/.env\n\n"
        "and run this script again."
    )
    raise SystemExit(1)

wanted = [("A", IPV4), ("AAAA", IPV6)]
present = existing()
for record_type, content in wanted:
    if (record_type, content) in present:
        print(f"already present: {record_type} {HOST}.{DOMAIN} -> {content}")
        continue
    result = post(
        f"/dns/create/{DOMAIN}",
        {
            "apikey": KEY,
            "secretapikey": SECRET,
            "name": HOST,
            "type": record_type,
            "content": content,
            "ttl": "600",
        },
    )
    print(f"create {record_type} -> {result.get('status')} {result.get('message', '')}".strip())
    if result.get("status") != "SUCCESS":
        raise SystemExit(1)

for record_type in ("A", "AAAA"):
    out = subprocess.run(
        ["dig", "+short", f"{HOST}.{DOMAIN}", record_type, "@1.1.1.1"],
        capture_output=True,
        text=True,
    ).stdout.split()
    print(f"dig {record_type}: {' '.join(out) or 'not visible yet'}")

print("Records requested. HTTPS is handled by sharapa-api-tls-watch.timer.")
