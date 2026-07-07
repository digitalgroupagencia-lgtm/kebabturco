#!/usr/bin/env bash
# Usa certificado + perfis guardados no Codemagic (ios_signing no yaml).
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"

echo "=== Certificado e perfis do Codemagic ==="
keychain initialize
keychain add-certificates

echo "=== Verificar certificado Apple Distribution ==="
if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
  echo "ERRO: falta certificado kebabturco_appstore no Codemagic."
  echo "Team settings → certificados → Fetch certificate (NÃO Generate)"
  echo "Escolha Distribution GROUP EURO BUSINESS (24 Jun 2027) → kebabturco_appstore"
  security find-identity -v -p codesigning || true
  exit 1
fi
security find-identity -v -p codesigning | grep "Apple Distribution" || true

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store
