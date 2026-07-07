#!/usr/bin/env bash
# Certificado + perfis App Store (app + cartão) via Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"

echo "=== Certificado App Store ==="
keychain initialize
keychain add-certificates

echo "=== Verificar certificado Apple Distribution ==="
if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
  echo "ERRO: falta certificado kebabturco_appstore no Codemagic."
  security find-identity -v -p codesigning || true
  exit 1
fi
security find-identity -v -p codesigning | grep "Apple Distribution" || true

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store

echo "✓ Assinatura App Store configurada"
