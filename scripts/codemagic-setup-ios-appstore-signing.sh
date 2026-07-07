#!/usr/bin/env bash
# Certificado no Codemagic + perfis App Store alinhados com esse certificado.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
MAIN_BUNDLE="${BUNDLE_ID:-net.kebabturco.app}"
WIDGET_BUNDLE="${WIDGET_BUNDLE_ID:-net.kebabturco.app.StaffOrderWidget}"

echo "=== Certificado do Codemagic ==="
keychain initialize
keychain add-certificates

echo "=== Verificar certificado Apple Distribution ==="
if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
  echo "ERRO: falta certificado kebabturco_appstore no Codemagic."
  echo "Team settings → certificados → Upload kebabturco_dist.p12 (24 Jun 2027)"
  security find-identity -v -p codesigning || true
  exit 1
fi
security find-identity -v -p codesigning | grep "Apple Distribution" || true

echo "=== Regenerar perfis App Store na Apple (ligados ao certificado atual) ==="
app-store-connect fetch-signing-files "$MAIN_BUNDLE" \
  --type IOS_APP_STORE \
  --create \
  --verbose
app-store-connect fetch-signing-files "$WIDGET_BUNDLE" \
  --type IOS_APP_STORE \
  --create \
  --verbose

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store-connect
