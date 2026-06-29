#!/usr/bin/env bash
# Falha o build se o perfil App Store não tiver notificações push (causa crash ao abrir).
set -euo pipefail

FOUND=0
for dir in \
  "$HOME/Library/MobileDevice/Provisioning Profiles" \
  "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
  [ -d "$dir" ] || continue
  for p in "$dir"/*.mobileprovision; do
    [ -f "$p" ] || continue
    DECODED=$(security cms -D -i "$p" 2>/dev/null || true)
    [ -n "$DECODED" ] || continue
    if ! echo "$DECODED" | grep -q "net.kebabturco.app"; then
      continue
    fi
    if ! echo "$DECODED" | grep -q "ProvisionedDevices"; then
      if echo "$DECODED" | grep -qE "aps-environment|com.apple.developer.aps-environment"; then
        echo "✓ Perfil com push: $(basename "$p")"
        FOUND=1
      fi
    fi
  done
done

if [ "$FOUND" -ne 1 ]; then
  echo "ERRO: Perfil App Store sem notificações push para net.kebabturco.app."
  echo "      Isto faz a app abrir e fechar no iPhone."
  exit 1
fi
