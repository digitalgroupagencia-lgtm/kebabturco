#!/usr/bin/env bash
# Valida o IPA gerado no Codemagic — menu embutido, sem URL remota.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

IPA="$(find "$ROOT/build/ios" -name '*.ipa' -type f 2>/dev/null | sort | tail -1)"

if [ -z "$IPA" ]; then
  echo "ERRO: IPA não encontrado em build/ios (procurei recursivamente)."
  find "$ROOT/build/ios" -maxdepth 4 -type f 2>/dev/null | head -30 || true
  exit 1
fi

IPA_SIZE="$(du -sk "$IPA" | awk '{print $1}')"
echo "=== Verificar IPA: $(basename "$IPA") (~${IPA_SIZE}KB) ==="

# IPA comprimido: ~4MB só nativo, ~7MB com menu embutido (public ~6MB dentro do .app).
if [ "${IPA_SIZE:-0}" -lt 5500 ]; then
  echo "ERRO: IPA demasiado pequeno (${IPA_SIZE}KB) — provável pacote sem menu embutido."
  echo "      Com menu embutido o IPA comprimido costuma ter >=6MB."
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
unzip -q "$IPA" -d "$WORK"
APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' -type d | head -1)"

if [ -z "$APP" ]; then
  echo "ERRO: Payload sem .app dentro do IPA."
  exit 1
fi

CFG="$APP/capacitor.config.json"
INDEX="$APP/public/index.html"

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta capacitor.config.json no IPA."
  exit 1
fi

if node -e "
  const c = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  if (c.server && c.server.url) process.exit(1);
" "$CFG"; then
  :
else
  echo "ERRO: IPA ainda tem server.url — crash ao abrir no TestFlight."
  cat "$CFG"
  exit 1
fi

if [ ! -f "$INDEX" ]; then
  echo "ERRO: falta public/index.html no IPA."
  ls -la "$APP" | head -20 || true
  exit 1
fi

if ! grep -q 'snaporder-boot.js' "$INDEX" && ! grep -qE 'type="module"[^>]+src="/assets/index-' "$INDEX"; then
  echo "ERRO: index.html sem entrada de arranque válida."
  exit 1
fi

ASSET_COUNT="$(find "$APP/public/assets" -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
if [ "${ASSET_COUNT:-0}" -lt 5 ]; then
  echo "ERRO: public/assets parece incompleto ($ASSET_COUNT ficheiros js)."
  exit 1
fi

PUBLIC_SIZE="$(du -sk "$APP/public" | awk '{print $1}')"
if [ "${PUBLIC_SIZE:-0}" -lt 2000 ]; then
  echo "ERRO: menu embutido demasiado pequeno (${PUBLIC_SIZE}KB) no IPA."
  exit 1
fi

echo "✓ IPA validado: menu embutido (~${PUBLIC_SIZE}KB), sem URL remota, boot script presente"
