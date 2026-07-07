#!/usr/bin/env bash
# Live Activity: dados via ActivityKit (não precisa App Group no perfil da extensão).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.entitlements"

cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
EOF

echo "✓ Entitlements da extensão do cartão: sem App Group (perfil App Store)"
