#!/usr/bin/env bash
# Prepara a app iPhone a partir do projecto Lovable/GitHub.
# Uso: ./scripts/prepare-ios-app.sh
# Requisitos: Mac, Xcode instalado, Node.js, conta Apple Developer.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "══════════════════════════════════════════════"
echo " Kebab Turco — preparar app iPhone"
echo "══════════════════════════════════════════════"
echo ""

missing=0
for cmd in node npm npx; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "✗ Falta: $cmd"
    missing=1
  fi
done
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "✗ Falta Xcode (instale na App Store do Mac e abra uma vez)"
  missing=1
fi
if [[ "$missing" -ne 0 ]]; then
  exit 1
fi
echo "✓ Ferramentas básicas OK"
echo ""

echo "→ A compilar o site (dist/)..."
npm run build
echo ""

echo "→ A sincronizar com o projecto iPhone (Capacitor)..."
npx cap sync ios
echo ""

IOS_PROJ="$ROOT/ios/App/App.xcodeproj"
if [[ ! -d "$IOS_PROJ" ]]; then
  echo "✗ Projecto iOS não encontrado em ios/App"
  exit 1
fi

echo "══════════════════════════════════════════════"
echo " Próximos passos MANUAIS (Apple — não há atalho)"
echo "══════════════════════════════════════════════"
echo ""
echo "1) Firebase: adicionar app iOS, descarregar GoogleService-Info.plist"
echo "   → Colocar em: ios/App/App/GoogleService-Info.plist"
echo ""
echo "2) Xcode (vai abrir agora):"
echo "   • Signing & Capabilities → Team = sua conta Developer"
echo "   • + Capability → Push Notifications"
echo "   • + Capability → Background Modes → Remote notifications"
echo ""
echo "3) developer.apple.com → Keys → criar chave Push (APNs)"
echo "   → Carregar essa chave no Firebase (Definições → Cloud Messaging → Apple)"
echo ""
echo "4) appstoreconnect.apple.com → Apps → + → criar app Kebab Turco"
echo "   • Bundle ID: app.lovable.d04adf9611f44dc9b79cf756a89ef084"
echo "     (ou crie um ID novo tipo net.kebabturco.staff e mude no Xcode)"
echo ""
echo "5) No Xcode: Product → Archive → Distribute App → App Store Connect"
echo ""
echo "Guia completo: docs/GUIA-PUBLICAR-IPHONE-KEBAB-TURCO.md"
echo ""

echo "→ A abrir Xcode..."
npx cap open ios
