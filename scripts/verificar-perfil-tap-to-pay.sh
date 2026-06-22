#!/usr/bin/env bash
# Verifica se um perfil Apple inclui Tap to Pay (obrigatório antes do build).
# Uso: bash scripts/verificar-perfil-tap-to-pay.sh ~/Downloads/Kebab_Turco_App_Store_TapToPay.mobileprovision
set -euo pipefail
FILE="${1:?Indique o ficheiro .mobileprovision}"
if ! security cms -D -i "$FILE" 2>/dev/null | grep -q 'proximity-reader.payment.acceptance'; then
  echo "❌ SEM Tap to Pay neste perfil — não use no Codemagic ainda."
  echo "   A Apple ainda não activou a permissão de PUBLICAÇÃO na vossa conta."
  echo "   Responda ao caso 20642317 e aguarde aprovação antes de criar perfil novo."
  exit 1
fi
echo "✅ Perfil OK — inclui Tap to Pay. Pode carregar no Codemagic como kebabturco_appstore."
