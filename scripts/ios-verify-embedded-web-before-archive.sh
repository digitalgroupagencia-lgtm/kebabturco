#!/usr/bin/env bash
# Garante que o menu está embutido no projeto iOS antes do xcodebuild archive.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PUBLIC="$ROOT/ios/App/App/public"
INDEX="$PUBLIC/index.html"

echo "=== Verificar menu embutido (pré-archive) ==="

if [ ! -f "$INDEX" ]; then
  echo "ERRO: falta $INDEX — corra sync-ios-for-release.sh (cap sync) antes do archive."
  exit 1
fi

if ! grep -q 'snaporder-boot.js' "$INDEX" && ! grep -qE 'type="module"[^>]+src="/assets/index-' "$INDEX"; then
  echo "ERRO: index.html sem entrada de arranque (snaporder-boot ou module directo)."
  exit 1
fi

if grep -qE 'type="module"[^>]+src="/assets/index-' "$INDEX"; then
  echo "✓ arranque Capacitor directo (sem snaporder-boot)"
fi

ASSET_COUNT="$(find "$PUBLIC/assets" -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${ASSET_COUNT:-0}" -lt 5 ]; then
  echo "ERRO: public/assets incompleto ($ASSET_COUNT ficheiros js)."
  exit 1
fi

PUBLIC_SIZE="$(du -sk "$PUBLIC" | awk '{print $1}')"
if [ "${PUBLIC_SIZE:-0}" -lt 2000 ]; then
  echo "ERRO: pasta public demasiado pequena (${PUBLIC_SIZE}KB)."
  exit 1
fi

echo "✓ Menu embutido no projeto: ~${PUBLIC_SIZE}KB, ${ASSET_COUNT} ficheiros js"
