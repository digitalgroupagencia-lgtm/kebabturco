#!/usr/bin/env bash
# Certificado + perfis App Store (app + cartão) alinhados antes do archive.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"

profile_cert_serial() {
  local profile="$1"
  security cms -D -i "$profile" > /tmp/profile-decoded.plist
  /usr/bin/python3 - <<'PY'
import plistlib, subprocess, tempfile, os
with open("/tmp/profile-decoded.plist", "rb") as f:
    p = plistlib.load(f)
cert = p["DeveloperCertificates"][0]
with tempfile.NamedTemporaryFile(suffix=".cer", delete=False) as tf:
    tf.write(cert)
    path = tf.name
serial = subprocess.check_output(
    ["openssl", "x509", "-in", path, "-noout", "-serial"], text=True
).strip().removeprefix("serial=")
os.unlink(path)
print(serial)
PY
}

keychain_cert_serial() {
  local identity
  identity="$(security find-identity -v -p codesigning | grep "Apple Distribution" | head -1 || true)"
  if [ -z "$identity" ]; then
    return 1
  fi
  local hash
  hash="$(echo "$identity" | sed -n 's/.*"\(.*\)".*/\1/p' | awk '{print $1}')"
  security find-certificate -c "$hash" -p 2>/dev/null \
    | openssl x509 -noout -serial 2>/dev/null \
    | sed 's/serial=//' \
    | tr '[:lower:]' '[:upper:]'
}

verify_profile_matches_keychain() {
  local profile="$1"
  local name="$2"
  local p_serial k_serial
  p_serial="$(profile_cert_serial "$profile" | tr '[:lower:]' '[:upper:]')"
  k_serial="$(keychain_cert_serial | tr '[:lower:]' '[:upper:]')"
  echo "Perfil $name → cert $p_serial"
  echo "Keychain → cert $k_serial"
  if [ "$p_serial" != "$k_serial" ]; then
    echo "ERRO: o certificado no Codemagic não coincide com o perfil $name."
    echo "Solução: Team settings → certificados → apagar kebabturco_appstore"
    echo "         → Upload do ficheiro kebabturco_dist.p12 (24 Jun 2027) + password"
  fi
  [ "$p_serial" = "$k_serial" ]
}

echo "=== Certificado App Store ==="
keychain initialize

if [ -n "${IOS_DIST_CERT_P12_B64:-}" ] && [ -n "${IOS_DIST_CERT_PASSWORD:-}" ]; then
  echo "Usar certificado guardado (segredo IOS_DIST_CERT_P12_B64)"
  echo "$IOS_DIST_CERT_P12_B64" | base64 --decode > /tmp/kebabturco_dist.p12
  keychain add-certificates \
    --certificate /tmp/kebabturco_dist.p12 \
    --certificate-password "$IOS_DIST_CERT_PASSWORD"
else
  echo "Usar certificado do Codemagic (kebabturco_appstore)"
  keychain add-certificates
fi

echo "=== Verificar certificado Apple Distribution ==="
if ! security find-identity -v -p codesigning | grep -q "Apple Distribution"; then
  echo "ERRO: falta certificado Apple Distribution válido."
  security find-identity -v -p codesigning || true
  exit 1
fi
security find-identity -v -p codesigning | grep "Apple Distribution" || true

bash "$ROOT/scripts/codemagic-install-ios-profiles-from-secrets.sh"

echo "=== Aplicar perfis no projeto Xcode ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store-connect

PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
for pair in \
  "kebabturco_appstore.mobileprovision:app principal" \
  "kebabturco_widget_appstore.mobileprovision:cartão"; do
  file="${pair%%:*}"
  label="${pair#*:}"
  path="$(find "$PROFILE_DIR" -name "*.mobileprovision" 2>/dev/null | while read -r f; do
    name="$(security cms -D -i "$f" 2>/dev/null | plutil -extract Name raw - 2>/dev/null || true)"
    case "$label" in
      "app principal") [ "$name" = "Kebab Turco App Store" ] && echo "$f" && break ;;
      "cartão") [ "$name" = "Kebab Turco Cartão App Store" ] && echo "$f" && break ;;
    esac
  done | head -1)"
  if [ -n "$path" ] && [ -f "$path" ]; then
    verify_profile_matches_keychain "$path" "$label" || exit 1
  elif [ -f "$PROFILE_DIR/$file" ]; then
    verify_profile_matches_keychain "$PROFILE_DIR/$file" "$label" || exit 1
  fi
done

echo "✓ Certificado e perfis alinhados"
