#!/usr/bin/env bash
# Build web + sync iOS para instalação em iPhone registado (perfil Development).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build
npx cap sync ios

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com\.eurobusinessgroup\.kebabturco;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
# Assinatura manual no Debug (servidor de compilação não tem conta Apple ligada).
sed -i '' 's/CODE_SIGN_STYLE = Automatic;/CODE_SIGN_STYLE = Manual;/g' "$PBX"
grep -q 'CODE_SIGN_IDENTITY = "Apple Development"' "$PBX" || \
  sed -i '' '/CODE_SIGN_STYLE = Manual;/a\
				CODE_SIGN_IDENTITY = "Apple Development";
' "$PBX"

echo "✓ iOS Development: net.kebabturco.app"
echo "  · Push: AppDelegate com handlers APNs (obrigatório Capacitor)"
echo "  · Debug → App.entitlements (aps-environment=development + Tap to Pay)"
echo "  · Release → App.Release.entitlements (só para App Store)"
