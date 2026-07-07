#!/usr/bin/env bash
# Build IPA App Store no Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"

echo "Xcode: $(xcodebuild -version | head -1)"
echo "SDK iOS: $(xcrun --sdk iphoneos --show-sdk-version)"

bash "$ROOT/scripts/ios-align-release-entitlements.sh"
bash "$ROOT/scripts/ios-verify-live-activity-target.sh"

echo "=== Obter perfis App Store na Apple (app + cartão) ==="
app-store-connect fetch-signing-files "net.kebabturco.app" \
  --type IOS_APP_STORE \
  --verbose
app-store-connect fetch-signing-files "net.kebabturco.app.StaffOrderWidget" \
  --type IOS_APP_STORE \
  --verbose

echo "=== Aplicar certificados e perfis no projeto ==="
keychain initialize
keychain add-certificates
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store

echo "=== Criar IPA ==="
xcode-project build-ipa \
  --project "$PROJECT" \
  --scheme "$SCHEME" \
  --config Release \
  2>&1 | tee /tmp/xcodebuild-build-ipa.log
