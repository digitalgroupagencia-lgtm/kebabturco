#!/usr/bin/env bash
# Organiza material Kebab Turco no Mac (Documents/Kebab Turco).
# Uso: bash scripts/organizar-pasta-kebab-mac.sh
set -euo pipefail

ROOT="$HOME/Documents/Kebab Turco"
DL="$HOME/Downloads"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$ROOT"/{01-Leia-me,02-Dados-e-cores,03-Chaves-certificados,04-Logos-icones,05-Loja-Apple-Google,06-QR-mesas,07-Guias,08-Marketing,09-Arquivo-antigo,10-Duplicados}

echo "→ Pasta principal: $ROOT"

# Guias do repo
cp "$REPO/scripts/CODEMAGIC-PASSO-A-PASSO.txt" "$ROOT/07-Guias/" 2>/dev/null || true
cp "$REPO/scripts/PUBLICACAO-COPIAR_OUTRO_CHAT.txt" "$ROOT/07-Guias/" 2>/dev/null || true
cp "$REPO/docs/GUIA-PUBLICAR-IPHONE-KEBAB-TURCO.md" "$ROOT/07-Guias/" 2>/dev/null || true
cp "$REPO/codemagic.yaml" "$ROOT/07-Guias/codemagic-exemplo.yaml" 2>/dev/null || true

# Chaves (só copiar se existirem — NUNCA partilhar)
for f in \
  "$DL/AuthKey_F7T5LX2NLW.p8" \
  "$DL/AuthKey_AT74CS6WKW.p8" \
  "$DL/kebabturco_dist.p12" \
  "$DL/Kebab_Turco_App_Store.mobileprovision" \
  "$DL/kebab-turco-gandia-firebase-adminsdk-fbsvc-9b252fdb85.json" \
  "$DL/GoogleService-Info.plist"; do
  [[ -f "$f" ]] && cp "$f" "$ROOT/03-Chaves-certificados/"
done

# Logos / ícones soltos
shopt -s nullglob
for f in "$DL"/*[Kk]ebab*.{png,svg,jpg,jpeg,webp} "$DL"/KEBAB*.png "$DL"/turco*.svg; do
  [[ -f "$f" ]] && cp -n "$f" "$ROOT/04-Logos-icones/" 2>/dev/null || cp "$f" "$ROOT/04-Logos-icones/$(basename "$f")"
done

# Pastas de ícones / app store
[[ -d "$DL/kebab turco icones" ]] && cp -R "$DL/kebab turco icones" "$ROOT/04-Logos-icones/kebab-turco-icones" 2>/dev/null || true
[[ -d "$DL/APP KEBAB TURCO" ]] && cp -R "$DL/APP KEBAB TURCO" "$ROOT/05-Loja-Apple-Google/capturas-app-store" 2>/dev/null || true
[[ -d "$DL/QR Codes — Kebab Turco" ]] && cp -R "$DL/QR Codes — Kebab Turco" "$ROOT/06-QR-mesas/" 2>/dev/null || true

# PDFs úteis
for f in "$DL"/KEBAB_TURCO*.pdf "$DL"/QR\ Codes*.pdf; do
  [[ -f "$f" ]] && cp "$f" "$ROOT/01-Leia-me/" 2>/dev/null || true
done

# Arquivo antigo (PWABuilder, zips velhos)
for f in "$DL/kebabturco-main.zip" "$DL/Kebab Turco.zip" "$DL/Kebab Turco - Google Play package.zip"; do
  [[ -f "$f" ]] && cp "$f" "$ROOT/09-Arquivo-antigo/" 2>/dev/null || true
done
[[ -d "$DL/Kebab Turco" ]] && cp -R "$DL/Kebab Turco" "$ROOT/09-Arquivo-antigo/PWABuilder-antigo" 2>/dev/null || true

# Ícone oficial do repo
cp "$REPO/public/icon-512.png" "$ROOT/04-Logos-icones/icon-oficial-site-512.png" 2>/dev/null || true
cp "$REPO/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png" "$ROOT/04-Logos-icones/icon-oficial-iphone-1024.png" 2>/dev/null || true

echo "✓ Cópia concluída. Abra: $ROOT/01-Leia-me/KEBAB-TURCO-TUDO-IMPORTANTE.html"
echo "  → Safari → Arquivo → Exportar como PDF"
