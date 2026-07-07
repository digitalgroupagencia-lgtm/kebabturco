#!/usr/bin/env bash
# Assinatura App Store: certificado + perfis (app + cartão) antes do archive.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILE_DIR"

import_distribution_certificate() {
  keychain initialize
  local cert_dir="$HOME/Library/Developer/Xcode/UserData/Certificates"
  local p12=""
  p12="$(ls -t "$cert_dir"/DISTRIBUTION_*.p12 2>/dev/null | head -1 || true)"
  if [ -z "$p12" ]; then
    echo "ERRO: certificado Distribution não encontrado em $cert_dir"
    exit 1
  fi
  echo "Importar certificado: $(basename "$p12")"
  if ! keychain add-certificates --certificate "$p12" --certificate-password ""; then
    echo "Tentar importação alternativa (PEM)..."
    local pem_cert="/tmp/distribution-cert.pem"
    local pem_key="/tmp/distribution-key.pem"
    openssl pkcs12 -in "$p12" -clcerts -nokeys -passin pass: -out "$pem_cert"
    openssl pkcs12 -in "$p12" -nocerts -nodes -passin pass: -out "$pem_key"
    security import "$pem_cert" -A
    security import "$pem_key" -A
  fi
}

verify_distribution_identity() {
  echo "=== Verificar certificado Apple Distribution no keychain ==="
  if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
    echo "ERRO: não há certificado Apple Distribution válido no keychain."
    security find-identity -v -p codesigning || true
    exit 1
  fi
  security find-identity -v -p codesigning | grep "Apple Distribution" || true
}

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
  import_distribution_certificate
}

if [ -n "${CERTIFICATE_PRIVATE_KEY:-}" ]; then
  setup_from_apple_api
elif [ -n "${IOS_DIST_CERT_P12_B64:-}" ] && [ -n "${IOS_DIST_CERT_PASSWORD:-}" ]; then
  setup_from_p12
else
  echo "ERRO: no grupo ios_appstore falta CERTIFICATE_PRIVATE_KEY (automático)"
  echo "      ou IOS_DIST_CERT_P12_B64 + IOS_DIST_CERT_PASSWORD (manual)."
  exit 1
fi

verify_distribution_identity

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store
