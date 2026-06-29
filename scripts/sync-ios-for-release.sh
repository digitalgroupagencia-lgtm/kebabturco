#!/usr/bin/env bash
# Sincroniza Capacitor iOS para App Store — igual build 10 (site remoto no iPhone).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export VITE_IOS_TAP_TO_PAY_ENABLED=false
export KEBAB_IOS_STARTUP_DIAGNOSTIC="${KEBAB_IOS_STARTUP_DIAGNOSTIC:-1}"

GIT_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
echo "=== iOS release source ==="
echo "commit: $GIT_COMMIT"
echo "branch: $GIT_BRANCH"
echo "startup diagnostic: $KEBAB_IOS_STARTUP_DIAGNOSTIC"

npm run build
npx cap sync ios
cp "$ROOT/ios/App/CapApp-SPM/Package.appstore.swift" "$ROOT/ios/App/CapApp-SPM/Package.swift"
if [ "$KEBAB_IOS_STARTUP_DIAGNOSTIC" != "0" ]; then
  cat > "$ROOT/ios/App/CapApp-SPM/Package.swift" <<'SWIFT_PACKAGE'
// swift-tools-version: 5.9
import PackageDescription

// Diagnóstico de crash de arranque — shell mínimo: Capacitor + AppPlugin.
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(name: "CapacitorApp", path: "../../../node_modules/@capacitor/app"),
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
            ]
        )
    ]
)
SWIFT_PACKAGE
fi
bash "$ROOT/scripts/ios-patch-capacitor-config-appstore.sh"
bash "$ROOT/scripts/ios-verify-appstore-capacitor-config.sh"

PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"
PLIST="$ROOT/ios/App/App/Info.plist"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = app\.lovable\.[^;]*;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com\.eurobusinessgroup\.kebabturco;/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/g' "$PBX"
if ! grep -q 'DEVELOPMENT_TEAM = 4QW32SBR7H;' "$PBX"; then
  sed -i '' '/PRODUCT_BUNDLE_IDENTIFIER = net.kebabturco.app;/a\
				DEVELOPMENT_TEAM = 4QW32SBR7H;
' "$PBX"
fi

/usr/libexec/PlistBuddy -c "Delete :KebabTurcoGitCommit" "$PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Add :KebabTurcoGitCommit string $GIT_COMMIT" "$PLIST"
/usr/libexec/PlistBuddy -c "Delete :KebabTurcoGitBranch" "$PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Add :KebabTurcoGitBranch string $GIT_BRANCH" "$PLIST"
/usr/libexec/PlistBuddy -c "Delete :KebabTurcoStartupDiagnostic" "$PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c "Add :KebabTurcoStartupDiagnostic string $([ "$KEBAB_IOS_STARTUP_DIAGNOSTIC" = "0" ] && echo false || echo true)" "$PLIST"
if [ "$KEBAB_IOS_STARTUP_DIAGNOSTIC" != "0" ]; then
  /usr/libexec/PlistBuddy -c "Delete :UIBackgroundModes" "$PLIST" >/dev/null 2>&1 || true
fi

if [ "$KEBAB_IOS_STARTUP_DIAGNOSTIC" != "0" ]; then
cat > "$ROOT/ios/App/App/App.Release.entitlements" <<'ENTITLEMENTS'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
ENTITLEMENTS
else
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
fi

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
echo "  · diagnóstico arranque: $KEBAB_IOS_STARTUP_DIAGNOSTIC"
echo "  · iPhone abre https://kebabturco.net (como build 10)"
