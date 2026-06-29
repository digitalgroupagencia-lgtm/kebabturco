#!/usr/bin/env bash
# Valida o IPA gerado no Codemagic — menu embutido, sem URL remota.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
IPA="$(find "$ROOT/build/ios/ipa" -maxdepth 2 -name '*.ipa' 2>/dev/null | head -1)"

if [ -z "$IPA" ]; then
  echo "ERRO: IPA não encontrado em build/ios/ipa"
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
unzip -q "$IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' -type d | head -1)"
CFG="$APP/capacitor.config.json"
INDEX="$APP/public/index.html"

echo "=== Verificar IPA: $(basename "$IPA") ==="

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta capacitor.config.json no IPA"
  exit 1
fi

if grep -q '"url"' "$CFG"; then
  echo "ERRO: IPA ainda tem server.url — crash ao abrir no TestFlight"
  cat "$CFG"
  exit 1
fi

if [ ! -f "$INDEX" ]; then
  echo "ERRO: falta public/index.html no IPA"
  exit 1
fi

if ! grep -q 'snaporder-boot.js' "$INDEX"; then
  echo "ERRO: index.html sem snaporder-boot.js"
  exit 1
fi

ASSET_COUNT="$(find "$APP/public/assets" -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${ASSET_COUNT:-0}" -lt 5 ]; then
  echo "ERRO: public/assets parece incompleto ($ASSET_COUNT ficheiros js)"
  exit 1
fi

PUBLIC_SIZE="$(du -sk "$APP/public" | awk '{print $1}')"
if [ "${PUBLIC_SIZE:-0}" -lt 2000 ]; then
  echo "ERRO: menu embutido demasiado pequeno (${PUBLIC_SIZE}KB) — provável pacote vazio"
  exit 1
fi

echo "✓ IPA validado: menu embutido (~${PUBLIC_SIZE}KB), sem URL remota, boot script presente"
