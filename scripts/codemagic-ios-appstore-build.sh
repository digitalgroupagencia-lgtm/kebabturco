#!/usr/bin/env bash
# Build IPA App Store no Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"

bash "$ROOT/scripts/ios-align-release-entitlements.sh"

echo "=== Aplicar perfil App Store (kebabturco_appstore) ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store

echo "=== Criar IPA ==="
xcode-project build-ipa \
  --project "$PROJECT" \
  --scheme "$SCHEME" \
  --config Release \
  2>&1 | tee /tmp/xcodebuild-build-ipa.log
