#!/usr/bin/env bash
# Falha o build se o iPhone não tiver UIScene (obrigatório no iOS 26 / Xcode 26).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "ERRO: falta $PLIST"
  exit 1
fi

if ! grep -q 'UIApplicationSceneManifest' "$PLIST"; then
  echo "ERRO: Info.plist sem UIApplicationSceneManifest — causa 'Scene creation failed' no iOS 26."
  exit 1
fi

if ! grep -q 'SceneDelegate' "$PLIST"; then
  echo "ERRO: Info.plist sem SceneDelegate — app não abre no iOS 26."
  exit 1
fi

if [ ! -f "$ROOT/ios/App/App/SceneDelegate.swift" ]; then
  echo "ERRO: falta SceneDelegate.swift"
  exit 1
fi

echo "✓ UIScene configurado (iOS 26)"
