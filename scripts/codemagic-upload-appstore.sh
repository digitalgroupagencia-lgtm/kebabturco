#!/usr/bin/env bash
# Envia o .ipa para a Apple na nuvem (Codemagic) — sem Transporter no Mac.
set -euo pipefail
ROOT="${CM_BUILD_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

IPA=""
for candidate in \
  "$ROOT/build/ios/ipa"/*.ipa \
  "$ROOT/build/ios/ipa"/*/*.ipa; do
  if [ -f "$candidate" ]; then
    IPA="$candidate"
    break
  fi
done

if [ -z "$IPA" ]; then
  echo "ERRO: ficheiro .ipa não encontrado em build/ios/ipa"
  exit 1
fi

echo "=== Enviar para App Store Connect: $(basename "$IPA") ==="
ls -lh "$IPA"

# Só upload (sem revisão beta externa). A build aparece no TestFlight em 15–45 min.
app-store-connect publish \
  --path "$IPA" \
  --max-find-build-wait 10 \
  --max-build-processing-wait 0

echo "✓ Enviado com sucesso. Não precisa de Transporter no Mac."
echo "  → TestFlight: compilação nova em processamento"
echo "  → Loja: Distribuição → 1.1.1 → Adicionar compilação (quando a Apple processar)"
