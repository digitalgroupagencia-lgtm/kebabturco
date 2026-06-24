#!/usr/bin/env bash
# Sincroniza Capacitor iOS e fixa o identificador da App Store.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

npm run build
npx cap sync ios

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com\.eurobusinessgroup\.kebabturco;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
# Equipa Apple (GROUP EURO BUSINESS) — necessário para assinatura manual no Codemagic.
if ! grep -q 'DEVELOPMENT_TEAM = 4QW32SBR7H;' "$PBX"; then
  sed -i '' '/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/a\
				DEVELOPMENT_TEAM = 4QW32SBR7H;
' "$PBX"
fi

echo "✓ iOS pronto: net.kebabturco.app (team 4QW32SBR7H)"
