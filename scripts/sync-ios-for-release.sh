#!/usr/bin/env bash
# Sincroniza Capacitor iOS para App Store — push produção, SEM Tap to Pay no perfil de distribuição.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# App Store: Tap to Pay desligado no JS até a Apple aprovar entitlement de produção.
export VITE_IOS_TAP_TO_PAY_ENABLED=false

npm run build
npx cap sync ios

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com\.eurobusinessgroup\.kebabturco;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
if ! grep -q 'DEVELOPMENT_TEAM = 4QW32SBR7H;' "$PBX"; then
  sed -i '' '/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/a\
				DEVELOPMENT_TEAM = 4QW32SBR7H;
' "$PBX"
fi

# Release = só notificações push (produção). Tap to Pay fica só no perfil Development.
cat > "$ROOT/ios/App/App/App.Release.entitlements" <<'ENTITLEMENTS'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>production</string>
</dict>
</plist>
ENTITLEMENTS

echo "✓ iOS App Store: net.kebabturco.app"
echo "  · Release entitlements: aps-environment=production (sem Tap to Pay)"
echo "  · VITE_IOS_TAP_TO_PAY_ENABLED=false"
