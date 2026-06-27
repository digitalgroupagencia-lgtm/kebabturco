#!/usr/bin/env bash
# App Store Release: sempre pedir notificações push em produção.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$ROOT/ios/App/App/App.Release.entitlements"

cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:kebabturco.net</string>
		<string>webcredentials:kebabturco.net</string>
	</array>
	<key>aps-environment</key>
	<string>production</string>
</dict>
</plist>
EOF

echo "✓ Entitlements Release: notificações push (produção)"
