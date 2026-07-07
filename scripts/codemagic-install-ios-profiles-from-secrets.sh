#!/usr/bin/env bash
# Instala perfis App Store (app + cartão) a partir dos segredos do Codemagic.
set -euo pipefail

PROFILE_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILE_DIR"

if [ -z "${IOS_APPSTORE_PROFILE_B64:-}" ] || [ -z "${IOS_WIDGET_APPSTORE_PROFILE_B64:-}" ]; then
  echo "AVISO: perfis manuais em falta — a usar só os perfis obtidos da Apple."
  exit 0
fi

echo "$IOS_APPSTORE_PROFILE_B64" | base64 --decode > "$PROFILE_DIR/kebabturco_appstore.mobileprovision"
echo "$IOS_WIDGET_APPSTORE_PROFILE_B64" | base64 --decode > "$PROFILE_DIR/kebabturco_widget_appstore.mobileprovision"

for file in \
  "$PROFILE_DIR/kebabturco_appstore.mobileprovision" \
  "$PROFILE_DIR/kebabturco_widget_appstore.mobileprovision"; do
  if [ ! -s "$file" ]; then
    echo "ERRO: perfil vazio ou inválido: $file"
    exit 1
  fi
done

echo "✓ Perfis App Store instalados (app principal + cartão no ecrã bloqueado)"
