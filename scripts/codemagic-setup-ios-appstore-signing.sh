#!/usr/bin/env bash
# Assinatura App Store: certificado + perfis (app + cartão) antes do archive.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILE_DIR"

setup_from_p12() {
  echo "=== Certificado guardado (.p12) + perfis manuais ==="
  echo "$IOS_DIST_CERT_P12_B64" | base64 --decode > /tmp/kebabturco_dist.p12
  keychain initialize
  keychain add-certificates \
    --certificate /tmp/kebabturco_dist.p12 \
    --certificate-password "$IOS_DIST_CERT_PASSWORD"
  bash "$ROOT/scripts/codemagic-install-ios-profiles-from-secrets.sh"
}

setup_from_apple_api() {
  echo "=== Certificado e perfis novos via Apple (automático) ==="
  for bundle in "net.kebabturco.app" "net.kebabturco.app.StaffOrderWidget"; do
    echo "--- $bundle ---"
    app-store-connect fetch-signing-files "$bundle" \
      --type IOS_APP_STORE \
      --certificate-key=@env:CERTIFICATE_PRIVATE_KEY \
      --create \
      --delete-stale-profiles \
      --verbose
  done
  keychain initialize
  keychain add-certificates
}

if [ -n "${IOS_DIST_CERT_P12_B64:-}" ] && [ -n "${IOS_DIST_CERT_PASSWORD:-}" ]; then
  setup_from_p12
elif [ -n "${CERTIFICATE_PRIVATE_KEY:-}" ]; then
  setup_from_apple_api
else
  echo "ERRO: no grupo ios_appstore falta CERTIFICATE_PRIVATE_KEY (automático)"
  echo "      ou IOS_DIST_CERT_P12_B64 + IOS_DIST_CERT_PASSWORD (manual)."
  exit 1
fi

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store
