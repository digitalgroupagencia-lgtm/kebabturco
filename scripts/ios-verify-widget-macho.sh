#!/usr/bin/env bash
# Falha cedo se a extensão do cartão não tiver entrada Swift (erro Apple 90896).
set -euo pipefail
ARCHIVE="${1:-${CM_BUILD_DIR:-}/build/ios/xcarchive/App-release.xcarchive}"
APPEX="$ARCHIVE/Products/Applications/App.app/PlugIns/StaffOrderLiveWidgetExtension.appex/StaffOrderLiveWidgetExtension"

if [ ! -f "$APPEX" ]; then
  echo "AVISO: extensão do cartão não encontrada no archive — ignorar verificação"
  exit 0
fi

if ! file "$APPEX" | grep -q "Mach-O.*executable"; then
  echo "ERRO: extensão do cartão não é executável Mach-O"
  file "$APPEX" || true
  exit 1
fi

if ! otool -l "$APPEX" | grep -q "sectname __swift5_entry"; then
  echo "ERRO: falta __swift5_entry na extensão do cartão (Apple rejeita upload)"
  otool -l "$APPEX" | grep -E 'sectname|segname' | head -40 || true
  exit 1
fi

echo "✓ Extensão do cartão: Mach-O válido com __swift5_entry"
