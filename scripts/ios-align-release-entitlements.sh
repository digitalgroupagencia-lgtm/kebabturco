#!/usr/bin/env bash
# App Store Release: push em produção, exceto na build diagnóstica de crash de arranque.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$ROOT/ios/App/App/App.Release.entitlements"

if [ "${KEBAB_IOS_STARTUP_DIAGNOSTIC:-1}" != "0" ]; then
cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
EOF

echo "✓ Entitlements Release: diagnóstico sem push/APNs"
else
cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>production</string>
</dict>
</plist>
EOF

echo "✓ Entitlements Release: notificações push (produção)"
fi
