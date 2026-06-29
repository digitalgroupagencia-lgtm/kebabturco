#!/usr/bin/env bash
# Falha o build se o IPA iOS ainda apontar para URL remota ou tiver plugins fantasma.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/ios/App/App/capacitor.config.json"

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta $CFG"
  exit 1
fi

if grep -q '"url"' "$CFG"; then
  echo "ERRO: capacitor.config.json ainda tem server.url — causa crash ao abrir no TestFlight."
  cat "$CFG"
  exit 1
fi

for bad in StripeTerminalPlugin TcpSocketPlugin GeolocationPlugin; do
  if grep -q "$bad" "$CFG"; then
    echo "ERRO: plugin proibido no IPA: $bad"
    exit 1
  fi
done

for required in KeepAwakePlugin AppPlugin PushNotificationsPlugin ScreenOrientationPlugin ApnsTokenBridgePlugin; do
  if ! grep -q "$required" "$CFG"; then
    echo "ERRO: falta plugin obrigatório: $required"
    exit 1
  fi
done

echo "✓ capacitor.config.json validado para App Store (menu embutido, sem URL remota)"
