#!/usr/bin/env bash
# Apaga a conta Stripe Connect duplicada (11 Jun 2026) e mantém a conta correcta ligada na app (24 Jun).
# Requer STRIPE_SECRET_KEY=sk_live_... (Lovable Cloud → Segredos).
set -euo pipefail

KEEP_ACCOUNT="acct_1TlpAkCeaelUf7YU"
REMOVE_ACCOUNT="acct_1ThGBRCmGR5UPOtp"
SECRET="${STRIPE_SECRET_KEY:-}"

if [ -z "$SECRET" ]; then
  echo "Defina STRIPE_SECRET_KEY=sk_live_... antes de correr este script."
  exit 1
fi

echo "→ Conta a manter (ligada na app): $KEEP_ACCOUNT"
echo "→ Conta duplicada a apagar:        $REMOVE_ACCOUNT"
echo ""

KEEP_JSON="$(curl -sS "https://api.stripe.com/v1/accounts/${KEEP_ACCOUNT}" -u "${SECRET}:")"
KEEP_NAME="$(echo "$KEEP_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('business_profile',{}).get('name') or d.get('company',{}).get('name') or '?')" 2>/dev/null || echo "?")"
echo "   Nome conta correcta: $KEEP_NAME"

read -r -p "Apagar a duplicada $REMOVE_ACCOUNT na Stripe? [s/N] " CONFIRM
if [ "${CONFIRM,,}" != "s" ]; then
  echo "Cancelado."
  exit 0
fi

RESP="$(curl -sS -X DELETE "https://api.stripe.com/v1/accounts/${REMOVE_ACCOUNT}" -u "${SECRET}:")"
if echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get('deleted') else 1)" 2>/dev/null; then
  echo "✓ Conta duplicada removida. Só fica $KEEP_ACCOUNT ($KEEP_NAME)."
else
  echo "✗ Não foi possível apagar. Resposta Stripe:"
  echo "$RESP" | python3 -m json.tool 2>/dev/null || echo "$RESP"
  echo ""
  echo "Se houver saldo pendente (~13€), faça payout/transferência no painel Stripe antes de tentar outra vez."
  exit 1
fi
