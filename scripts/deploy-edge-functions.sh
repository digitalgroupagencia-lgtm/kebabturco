#!/usr/bin/env bash
# Publica funções de pagamento no Supabase (sem gastar créditos Lovable).
# Pré-requisito (uma vez): npx supabase login
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_REF="${SUPABASE_PROJECT_ID:-kvpssbhclafoymhecmuk}"
echo "→ Project $PROJECT_REF"
npx --yes supabase@2.30.4 functions deploy stripe-connect-onboard --project-ref "$PROJECT_REF"
npx --yes supabase@2.30.4 functions deploy stripe-create-payment-intent --project-ref "$PROJECT_REF"
npx --yes supabase@2.30.4 functions deploy stripe-verify-payment-intent --project-ref "$PROJECT_REF"
echo "✓ Feito. Confirme: curl -s https://${PROJECT_REF}.supabase.co/functions/v1/stripe-connect-onboard | grep publicSync"
