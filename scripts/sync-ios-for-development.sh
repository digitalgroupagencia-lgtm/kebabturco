#!/usr/bin/env bash
# Build web + sync iOS para instalação em iPhone registado (perfil Development).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build
npx cap sync ios

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"

echo "✓ iOS Development: net.kebabturco.app"
echo "  · Debug → App.entitlements (aps-environment=development + Tap to Pay)"
echo "  · Release → App.Release.entitlements (só para App Store)"
