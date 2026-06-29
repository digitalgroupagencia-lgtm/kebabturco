#!/usr/bin/env bash
# Sincroniza Capacitor iOS para App Store — igual build 10 (site remoto no iPhone).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export VITE_IOS_TAP_TO_PAY_ENABLED=false
export IOS_DIAG_BUILD="${IOS_DIAG_BUILD:-B}"

echo "=== Build diagnóstico iOS: ${IOS_DIAG_BUILD} ==="

npm run build
npx cap sync ios
cp "$ROOT/ios/App/CapApp-SPM/Package.appstore.swift" "$ROOT/ios/App/CapApp-SPM/Package.swift"
bash "$ROOT/scripts/ios-patch-capacitor-config-appstore.sh"
bash "$ROOT/scripts/ios-verify-appstore-capacitor-config.sh"

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com\.eurobusinessgroup\.kebabturco;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
if ! grep -q 'DEVELOPMENT_TEAM = 4QW32SBR7H;' "$PBX"; then
  sed -i '' '/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/a\
				DEVELOPMENT_TEAM = 4QW32SBR7H;
' "$PBX"
fi

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

echo "=== capacitor.config.json (App Store) ==="
cat "$ROOT/ios/App/App/capacitor.config.json" || true
echo ""

SOUND_SRC="$ROOT/public/sounds/new-order-notification.mp3"
SOUND_DST="$ROOT/ios/App/App/staff_order_alert.caf"
if command -v afconvert >/dev/null 2>&1 && [ -f "$SOUND_SRC" ]; then
  afconvert "$SOUND_SRC" "$SOUND_DST" -d ima4 -f caff -c 1 -v 2>/dev/null || true
fi

echo "✓ iOS App Store: net.kebabturco.app"
echo "  · Release entitlements: aps-environment=production (sem Tap to Pay)"
echo "  · Package SPM: sem Stripe Terminal (App Store)"
echo "  · VITE_IOS_TAP_TO_PAY_ENABLED=false"
echo "  · iPhone abre https://kebabturco.net (como build 10)"
