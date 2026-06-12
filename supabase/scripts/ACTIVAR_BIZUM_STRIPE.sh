#!/usr/bin/env bash
# Liga Bizum na conta do restaurante (Stripe Connect). Correr UMA vez com a chave secreta da plataforma.
# Obter a chave em Lovable Cloud → Segredos → STRIPE_SECRET_KEY (sk_live_...)
set -euo pipefail

ACCOUNT_ID="${STRIPE_CONNECT_ACCOUNT:-acct_1ThGBRCmGR5UPOtp}"
SECRET="${STRIPE_SECRET_KEY:-}"

if [ -z "$SECRET" ]; then
  echo "Defina STRIPE_SECRET_KEY=sk_live_... antes de correr este script."
  exit 1
fi

echo "→ A activar Bizum em $ACCOUNT_ID …"

EXISTING_ID="$(curl -sS "https://api.stripe.com/v1/payment_method_configurations?limit=5" \
  -u "${SECRET}:" \
  -H "Stripe-Account: ${ACCOUNT_ID}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); rows=d.get('data') or []; print((rows[0] or {}).get('id',''))" 2>/dev/null || true)"

if [ -n "$EXISTING_ID" ]; then
  curl -sS "https://api.stripe.com/v1/payment_method_configurations/${EXISTING_ID}" \
    -u "${SECRET}:" \
    -H "Stripe-Account: ${ACCOUNT_ID}" \
    -d "bizum[display_preference][preference]=on"
else
  curl -sS "https://api.stripe.com/v1/payment_method_configurations" \
    -u "${SECRET}:" \
    -H "Stripe-Account: ${ACCOUNT_ID}" \
    -d "bizum[display_preference][preference]=on"
fi

echo ""
echo "✓ Pedido enviado à Stripe. Confirme no painel Stripe da conta do restaurante se Bizum está ligado."
