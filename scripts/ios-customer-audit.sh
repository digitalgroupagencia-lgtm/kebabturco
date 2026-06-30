#!/usr/bin/env bash
# Auditoria cliente na app iPhone (Kebab Turco) — toques + capturas.
# Requer: iPhone USB, Modo programador, iOS 17+.
#
# Uso: ./scripts/ios-customer-audit.sh
set -euo pipefail

OUT="${1:-/tmp/ios-audit-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$OUT"

nx() { python3 -c "print(int(65535*$1))"; }
tap() {
  ( pymobiledevice3 developer core-device universal-hid-service tap "$1" "$2" --userspace & pid=$!
  sleep 10
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true )
  sleep 1.2
}
swipe() {
  ( pymobiledevice3 developer core-device universal-hid-service drag "$1" "$2" "$3" "$4" --userspace & pid=$!
  sleep 8
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true )
  sleep 1
}
shot() { pymobiledevice3 developer dvt screenshot "$OUT/$1.png" --userspace 2>/dev/null && echo "📸 $1"; }

echo "→ Pasta: $OUT"
pymobiledevice3 mounter auto-mount 2>/dev/null || true
pymobiledevice3 developer dvt launch net.kebabturco.app --userspace 2>/dev/null || true
sleep 3
shot "01-idioma"
tap "$(nx 0.28)" "$(nx 0.58)"
shot "02-tipo-pedido"
tap "$(nx 0.5)" "$(nx 0.46)"
shot "03-menu"
tap "$(nx 0.88)" "$(nx 0.96)"
shot "04-conta"
tap "$(nx 0.62)" "$(nx 0.96)"
shot "05-carrito"
echo "✓ Auditoria terminada — rever PNG em $OUT"
