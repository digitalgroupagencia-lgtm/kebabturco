#!/usr/bin/env bash
# Liga a compilação mais recente à versão 1.1.2 e envia para revisão da Apple.
# Corre no Codemagic (sem Transporter, sem Xcode no Mac).
set -euo pipefail

VERSION="${IOS_APP_STORE_VERSION:-1.1.2}"

echo "=== Enviar versão ${VERSION} para revisão da App Store ==="
echo "A usar a compilação já enviada (sem novo upload)."

app-store-connect publish \
  --skip-package-upload \
  --app-store \
  --platform IOS \
  --version-string "$VERSION" \
  --max-find-build-wait 45 \
  --max-build-processing-wait 90

echo "✓ Pedido de revisão enviado à Apple para a versão ${VERSION}."
echo "  Acompanhe em App Store Connect → Kebab Turco → Distribuição."
