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
bash "$ROOT/scripts/codemagic-install-ios-profiles-from-secrets.sh"

echo "=== Certificado e perfis App Store ==="
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
