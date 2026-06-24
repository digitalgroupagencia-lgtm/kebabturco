#!/usr/bin/env bash
# Alinha App.Release.entitlements com o perfil App Store instalado (evita erro 65).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENT="$ROOT/ios/App/App/App.Release.entitlements"
BUNDLE_ID="${BUNDLE_ID:-net.kebabturco.app}"
TEAM_ID="${DEVELOPMENT_TEAM:-4QW32SBR7H}"

HAS_PUSH=0
for dir in \
  "$HOME/Library/MobileDevice/Provisioning Profiles" \
  "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
  for p in "$dir"/*.mobileprovision "$dir"/*.provisionprofile; do
    [ -f "$p" ] || continue
    DECODED=$(security cms -D -i "$p" 2>/dev/null || true)
    [ -n "$DECODED" ] || continue
    echo "$DECODED" | grep -qE "${TEAM_ID}\.${BUNDLE_ID}|${BUNDLE_ID}" || continue
    if echo "$DECODED" | grep -q '<key>get-task-allow</key>'; then
      continue
    fi
    if echo "$DECODED" | grep -q 'aps-environment'; then
      HAS_PUSH=1
    fi
    break 2
  done
done

if [ "$HAS_PUSH" -eq 1 ]; then
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
else
  cat > "$ENT" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict/>
</plist>
EOF
  echo "⚠ Perfil App Store sem push — build sem aps-environment (ative Push no App ID e regenere o perfil)"
fi
