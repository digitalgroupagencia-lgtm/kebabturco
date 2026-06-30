#!/usr/bin/env bash
# Abre uma app no iPhone ligado por USB (requer Developer Mode no telemóvel).
# Uso: ./scripts/launch-ios-app.sh [bundle_id]
# Exemplos:
#   ./scripts/launch-ios-app.sh net.kebabturco.app
#   ./scripts/launch-ios-app.sh com.apple.TestFlight

set -euo pipefail

BUNDLE_ID="${1:-net.kebabturco.app}"

if ! command -v pymobiledevice3 >/dev/null 2>&1; then
  echo "Instala: pip3 install --break-system-packages pymobiledevice3" >&2
  exit 1
fi

UDID="$(idevice_id -l 2>/dev/null | head -1 || true)"
if [[ -z "$UDID" ]]; then
  echo "Nenhum iPhone ligado por USB." >&2
  exit 1
fi

echo "Dispositivo: $UDID"
echo "A montar DeveloperDiskImage (se necessário)…"
pymobiledevice3 mounter auto-mount 2>/dev/null || true

echo "A abrir $BUNDLE_ID…"
pymobiledevice3 developer dvt launch "$BUNDLE_ID" --userspace
