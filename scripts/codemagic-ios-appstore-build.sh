#!/usr/bin/env bash
# Build IPA App Store no Codemagic — assinatura + entitlements alinhados.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
PROJECT="$ROOT/ios/App/App.xcodeproj"
SCHEME="${XCODE_SCHEME:-App}"
BUNDLE_ID="${BUNDLE_ID:-net.kebabturco.app}"
TEAM_ID="${DEVELOPMENT_TEAM:-4QW32SBR7H}"

export BUNDLE_ID DEVELOPMENT_TEAM="$TEAM_ID"
bash "$ROOT/scripts/ios-align-release-entitlements.sh"

echo "=== Perfis disponíveis ==="
PROFILE_GLOB=""
for dir in \
  "$HOME/Library/MobileDevice/Provisioning Profiles" \
  "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
  for p in "$dir"/*.mobileprovision "$dir"/*.provisionprofile; do
    [ -f "$p" ] || continue
    DECODED=$(security cms -D -i "$p" 2>/dev/null || true)
    [ -n "$DECODED" ] || continue
    NAME=$(echo "$DECODED" | plutil -extract Name raw - 2>/dev/null || echo "?")
    APP_ID=$(echo "$DECODED" | plutil -extract Entitlements.application-identifier raw - 2>/dev/null || echo "?")
    echo "  $NAME → $APP_ID"
    if echo "$DECODED" | grep -qE "${TEAM_ID}\.${BUNDLE_ID}"; then
      if ! echo "$DECODED" | grep -q '<key>get-task-allow</key>'; then
        PROFILE_GLOB="$p"
        echo "  → escolhido para App Store"
      fi
    fi
  done
done

if [ -n "$PROFILE_GLOB" ]; then
  xcode-project use-profiles \
    --project "$PROJECT" \
    --profile "$PROFILE_GLOB"
else
  DEV_ONLY=0
  for dir in \
    "$HOME/Library/MobileDevice/Provisioning Profiles" \
    "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
    for p in "$dir"/*.mobileprovision; do
      [ -f "$p" ] || continue
      DECODED=$(security cms -D -i "$p" 2>/dev/null || true)
      echo "$DECODED" | grep -qE "${TEAM_ID}\.${BUNDLE_ID}" && DEV_ONLY=1
    done
  done
  echo ""
  echo "════════════════════════════════════════════════════════════"
  if [ "$DEV_ONLY" -eq 1 ]; then
    echo "ERRO: Só há perfil DEVELOPMENT (kebabturco_dev) no Codemagic."
    echo ""
    echo "Faça isto no browser (2 minutos):"
    echo "  1. Codemagic → Settings → Code signing identities"
    echo "  2. Separador iOS provisioning profiles → Fetch profiles"
    echo "  3. Em App Store profiles, marque:"
    echo "     «Kebab Turco App Store TapToPay Final»"
    echo "  4. Download selected"
    echo "  5. Reference name: kebabturco_appstore"
    echo "  6. Start new build"
  else
    echo "ERRO: Perfil App Store (kebabturco_appstore) não encontrado."
    echo "Carregue o perfil «Kebab Turco App Store TapToPay Final» no Codemagic."
  fi
  echo "════════════════════════════════════════════════════════════"
  exit 1
fi

xcode-project build-ipa \
  --project "$PROJECT" \
  --scheme "$SCHEME" \
  --config Release \
  2>&1 | tee /tmp/xcodebuild-build-ipa.log
