#!/usr/bin/env bash
# Testa um token APNs novo (App Store) contra production + sandbox via edge function.
# Uso: bash scripts/test-apns-production-token.sh <fcm_token_64_hex>
# Pré-requisitos: APNS_USE_SANDBOX=false na Lovable + Publish; token registado depois da instalação da loja.
set -euo pipefail

TOKEN="${1:-}"
STORE_ID="${2:-22222222-2222-2222-2222-222222222222}"
FN_URL="https://kvpssbhclafoymhecmuk.supabase.co/functions/v1/send-push-notification"

if [[ -z "$TOKEN" ]]; then
  echo "Uso: bash scripts/test-apns-production-token.sh <fcm_token_64_hex> [store_uuid]"
  exit 1
fi

TOKEN_CLEAN="$(echo "$TOKEN" | tr '[:upper:]' '[:lower:]' | tr -d '<>[:space:]')"
if [[ ! "$TOKEN_CLEAN" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Erro: token deve ter 64 caracteres hex (APNs)."
  exit 1
fi

echo "=== Probe servidor APNs ==="
PROBE="$(curl -sS -X POST "$FN_URL" -H "Content-Type: application/json" -d '{"probe":true}')"
echo "$PROBE" | python3 -m json.tool 2>/dev/null || echo "$PROBE"

SANDBOX="$(echo "$PROBE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('apnsSandbox'))" 2>/dev/null || echo "?")"
PRIMARY="$(echo "$PROBE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('apnsPrimaryHost'))" 2>/dev/null || echo "?")"

if [[ "$SANDBOX" != "False" && "$SANDBOX" != "false" ]]; then
  echo ""
  echo "AVISO: apnsSandbox não é false — na Lovable defina APNS_USE_SANDBOX=false e Publish antes do teste App Store."
fi

echo ""
echo "=== Envio teste directo (token novo) ==="
RESULT="$(curl -sS -X POST "$FN_URL" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "testDirect": True,
  "nativeDirectToken": "$TOKEN_CLEAN",
  "nativePlatform": "ios",
  "storeId": "$STORE_ID",
  "title": "Teste App Store",
  "body": "Push produção Kebab Turco",
  "pushDiagnostic": True,
  "tag": "apns-prod-test",
}))
PY
)")"
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

echo ""
echo "=== Interpretação ==="
echo "Esperado (App Store + APNS_USE_SANDBOX=false):"
echo "  • api.push.apple.com → 200 (sentApns: 1)"
echo "  • api.sandbox.push.apple.com → BadEnvironmentKeyInToken ou BadDeviceToken"
echo "Host primário configurado: $PRIMARY"
