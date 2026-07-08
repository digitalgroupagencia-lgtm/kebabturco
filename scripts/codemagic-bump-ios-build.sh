#!/usr/bin/env bash
# Número de build único por compilação no Codemagic (evita rejeição da Apple).
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

BUILD_NUM="${CM_BUILD_NUMBER:-${BUILD_NUMBER:-$(date +%s)}}"
MARKETING_VERSION="${IOS_APP_STORE_VERSION:-1.1.4}"
echo "=== iOS build number: $BUILD_NUM ==="
echo "=== iOS versão visível: $MARKETING_VERSION ==="

if [ -f "$PBX" ]; then
  sed -i.bak "s/CURRENT_PROJECT_VERSION = [0-9][0-9]*;/CURRENT_PROJECT_VERSION = ${BUILD_NUM};/g" "$PBX"
  sed -i.bak "s/MARKETING_VERSION = [0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*;/MARKETING_VERSION = ${MARKETING_VERSION};/g" "$PBX"
  rm -f "${PBX}.bak"
fi

echo "Versão visível: $(grep MARKETING_VERSION "$PBX" | head -1 | sed 's/.*= //;s/;//')"
echo "Build interno: $(grep CURRENT_PROJECT_VERSION "$PBX" | head -1 | sed 's/.*= //;s/;//')"
