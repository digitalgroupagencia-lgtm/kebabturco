#!/usr/bin/env bash
# Build IPA App Store no Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"

echo "Xcode: $(xcodebuild -version | head -1)"
echo "SDK iOS: $(xcrun --sdk iphoneos --show-sdk-version)"
echo "Commit Git: $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
echo "Diagnóstico arranque iOS: ${KEBAB_IOS_STARTUP_DIAGNOSTIC:-1}"

bash "$ROOT/scripts/ios-align-release-entitlements.sh"

echo "=== Aplicar perfil App Store (kebabturco_appstore) ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store

if [ "${KEBAB_IOS_STARTUP_DIAGNOSTIC:-1}" = "0" ]; then
  bash "$ROOT/scripts/ios-verify-appstore-profile-push.sh"
else
  echo "⚠️ Diagnóstico de arranque: verificação de perfil push ignorada para isolar crash inicial."
fi
bash "$ROOT/scripts/ios-verify-appstore-capacitor-config.sh"

echo "=== Criar IPA ==="
xcode-project build-ipa \
  --project "$PROJECT" \
  --scheme "$SCHEME" \
  --config Release \
  2>&1 | tee /tmp/xcodebuild-build-ipa.log
