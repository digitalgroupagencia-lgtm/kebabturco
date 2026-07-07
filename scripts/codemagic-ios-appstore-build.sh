#!/usr/bin/env bash
# Build IPA App Store no Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"
ARCHIVE_PATH="$ROOT/build/ios/xcarchive/App-release.xcarchive"
EXPORT_PATH="$ROOT/build/ios/ipa"
EXPORT_PLIST="${EXPORT_OPTIONS_PLIST:-/Users/builder/export_options.plist}"

echo "Xcode: $(xcodebuild -version | head -1)"
echo "SDK iOS: $(xcrun --sdk iphoneos --show-sdk-version)"

bash "$ROOT/scripts/ios-align-release-entitlements.sh"
bash "$ROOT/scripts/ios-align-widget-release-entitlements.sh"
bash "$ROOT/scripts/ios-verify-live-activity-target.sh"
bash "$ROOT/scripts/codemagic-setup-ios-appstore-signing.sh"

mkdir -p "$(dirname "$ARCHIVE_PATH")" "$EXPORT_PATH"

echo "=== Archive (log completo) ==="
set +e
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  COMPILER_INDEX_STORE_ENABLE=NO \
  DEVELOPMENT_TEAM="${DEVELOPMENT_TEAM:-4QW32SBR7H}" \
  2>&1 | tee /tmp/xcodebuild-archive-full.log
ARCHIVE_EXIT=${PIPESTATUS[0]}
set -e

if [ "$ARCHIVE_EXIT" -ne 0 ]; then
  echo "ERRO: archive falhou com código $ARCHIVE_EXIT"
  tail -n 80 /tmp/xcodebuild-archive-full.log || true
  exit "$ARCHIVE_EXIT"
fi

if [ ! -f "$EXPORT_PLIST" ]; then
  echo "ERRO: falta $EXPORT_PLIST (use-profiles devia criar)"
  exit 1
fi

echo "=== Exportar IPA ==="
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  2>&1 | tee /tmp/xcodebuild-build-ipa.log
