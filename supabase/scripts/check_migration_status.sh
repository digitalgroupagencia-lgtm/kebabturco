#!/usr/bin/env bash
# Check whether delivery migration is applied on production Supabase (read-only).
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://kvpssbhclafoymhecmuk.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cHNzYmhjbGFmb3ltaGVjbXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDg5NTMsImV4cCI6MjA5NDkyNDk1M30.12Wur19INsRRX5WSHcrmYB-hfrDTRLAcIu0-0-aclCk}"

echo "=== Migration status (production) ==="

check_column() {
  local resp
  resp=$(curl -s "${SUPABASE_URL}/rest/v1/orders?select=delivery_street&limit=1" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}")
  if echo "$resp" | grep -q 'delivery_street does not exist'; then
    echo "orders.delivery_street: MISSING"
    return 1
  fi
  echo "orders.delivery_street: OK"
  return 0
}

check_rpc() {
  local resp
  resp=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/validate_coupon" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"_store_id":"00000000-0000-0000-0000-000000000001","_code":"TEST","_subtotal":20}')
  if echo "$resp" | grep -q 'Could not find the function'; then
    echo "validate_coupon RPC: MISSING"
    return 1
  fi
  echo "validate_coupon RPC: OK"
  return 0
}

check_table() {
  local resp
  resp=$(curl -s "${SUPABASE_URL}/rest/v1/coupons?select=id&limit=1" \
    -H "apikey: ${ANON_KEY}" \
    -H "Authorization: Bearer ${ANON_KEY}")
  if echo "$resp" | grep -q 'Could not find the table'; then
    echo "coupons table: MISSING"
    return 1
  fi
  echo "coupons table: OK"
  return 0
}

ok=0
check_column || ok=1
check_rpc || ok=1
check_table || ok=1

if [ "$ok" -eq 0 ]; then
  echo ""
  echo "Migration appears APPLIED."
else
  echo ""
  echo "Migration NOT applied yet."
  echo "Run supabase/migrations/20260524120000_delivery_tracking_loyalty.sql in SQL Editor:"
  echo "https://supabase.com/dashboard/project/kvpssbhclafoymhecmuk/sql/new"
fi

exit "$ok"
