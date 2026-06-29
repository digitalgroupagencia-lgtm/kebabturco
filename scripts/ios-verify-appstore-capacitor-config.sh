#!/usr/bin/env bash
# Falha o build se o IPA não estiver como a build 10 (site remoto, sem plugins fantasma).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CFG="$ROOT/ios/App/App/capacitor.config.json"

if [ ! -f "$CFG" ]; then
  echo "ERRO: falta $CFG"
  exit 1
fi

if ! grep -q 'kebabturco.net' "$CFG"; then
  echo "ERRO: capacitor.config.json sem kebabturco.net — iPhone tem de abrir o site publicado (build 10)."
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

echo "✓ capacitor.config.json validado (site remoto kebabturco.net, como build 10)"
