#!/usr/bin/env bash
# Build IPA App Store no Codemagic.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"
LOG="/tmp/xcodebuild-build-ipa.log"

echo "Xcode: $(xcodebuild -version | head -1)"
echo "SDK iOS: $(xcrun --sdk iphoneos --show-sdk-version)"

bash "$ROOT/scripts/ios-align-release-entitlements.sh"

echo "=== Aplicar perfil App Store (kebabturco_appstore) ==="
xcode-project use-profiles \
  --project "$PROJECT" \
  --archive-method app-store

bash "$ROOT/scripts/ios-verify-appstore-profile-push.sh"
bash "$ROOT/scripts/ios-verify-appstore-capacitor-config.sh"
bash "$ROOT/scripts/ios-verify-uiscene.sh"
bash "$ROOT/scripts/ios-verify-embedded-web-before-archive.sh"

echo "=== Criar IPA ==="
set +e
xcode-project build-ipa \
  --project "$PROJECT" \
  --scheme "$SCHEME" \
  --config Release \
  2>&1 | tee "$LOG"
BUILD_EXIT=${PIPESTATUS[0]}
set -e

if [ "$BUILD_EXIT" -ne 0 ]; then
  echo ""
  echo "=== ERRO xcode-project build-ipa (código $BUILD_EXIT) ==="
  grep -iE 'error:|fatal error:|duplicate symbol|ARCHIVE FAILED|exportArchive.*error' "$LOG" | tail -40 || true
  echo "--- últimas 60 linhas do log ---"
  tail -60 "$LOG" || true
  exit "$BUILD_EXIT"
fi

echo "=== Validar IPA gerado ==="
if ! bash "$ROOT/scripts/ios-verify-built-ipa.sh"; then
  echo ""
  echo "=== ERRO na validação do IPA (archive pode ter corrido mas pacote inválido) ==="
  exit 1
fi
