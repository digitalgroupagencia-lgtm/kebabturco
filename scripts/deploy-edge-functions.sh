#!/usr/bin/env bash
# Publica funções de pagamento no Supabase (sem gastar créditos Lovable).
# Pré-requisito (uma vez): npx supabase login
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_REF="${SUPABASE_PROJECT_ID:-kvpssbhclafoymhecmuk}"

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  if [ "$(uname -s)" = "Darwin" ]; then
    SUPABASE_ACCESS_TOKEN="$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null || true)"
    export SUPABASE_ACCESS_TOKEN
  fi
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo ""
  echo "Não encontrei a sessão da Supabase."
  echo "Corra primeiro:  npx supabase login"
  echo "Depois volte a correr:  ./scripts/deploy-edge-functions.sh"
  echo ""
  exit 1
fi

echo "→ Sessão encontrada. A publicar no projecto $PROJECT_REF …"
echo ""

run_deploy() {
  if command -v supabase >/dev/null 2>&1; then
    supabase functions deploy "$1" --project-ref "$PROJECT_REF"
  else
    npx --yes supabase@2.30.4 functions deploy "$1" --project-ref "$PROJECT_REF"
  fi
}

for fn in stripe-connect-onboard stripe-create-payment-intent stripe-verify-payment-intent stripe-terminal-connection-token stripe-create-terminal-location admin-create-all-terminal-locations configure-store-stripe-branding admin-configure-all-stores-branding stripe-webhook send-push-notification; do
  echo "— $fn"
  if ! run_deploy "$fn"; then
    echo ""
    echo "Não foi possível publicar $fn."
    echo ""
    echo "Se a mensagem falar em «privileges» ou «permissão»:"
    echo "  A sua conta Supabase não gere este projecto (é da Lovable)."
    echo "  O pagamento com cartão no site pode funcionar na mesma."
    echo "  Para este passo, peça na Lovable para publicar as funções do servidor."
    echo ""
    exit 1
  fi
done

echo ""
echo "✓ Publicado com sucesso."
echo "Confirme no browser — deve aparecer publicSync:"
echo "  https://${PROJECT_REF}.supabase.co/functions/v1/stripe-connect-onboard"
echo ""
