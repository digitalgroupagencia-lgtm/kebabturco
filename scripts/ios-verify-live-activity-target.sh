#!/usr/bin/env bash
# Garante que a extensão do cartão (Live Activity) está no projeto Xcode.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

for token in \
  StaffOrderLiveWidgetExtension \
  net.kebabturco.app.StaffOrderWidget \
  "Embed Foundation Extensions" \
  CodeSignOnCopy \
  StaffOrderLiveWidget.swift \
  AcceptOrderIntent \
  MACH_O_TYPE = mh_execute; do
  if ! grep -q "$token" "$PBX"; then
    echo "ERRO: falta no project.pbxproj: $token"
    exit 1
  fi
done

for file in \
  "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.swift" \
  "$ROOT/ios/StaffOrderLiveWidget/AcceptOrderIntent.swift" \
  "$ROOT/ios/StaffOrderLiveWidget/LiveActivityAcceptAPI.swift" \
  "$ROOT/ios/StaffOrderLiveWidget/Info.plist" \
  "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.entitlements"; do
  if [ ! -f "$file" ]; then
    echo "ERRO: falta ficheiro $file"
    exit 1
  fi
done

if ! grep -q '@main' "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.swift"; then
  echo "ERRO: StaffOrderLiveWidget.swift sem @main"
  exit 1
fi

if ! grep -q 'struct GenericAttributes' "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.swift"; then
  echo "ERRO: falta GenericAttributes em StaffOrderLiveWidget.swift"
  exit 1
fi

if grep -B5 '@main' "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.swift" | grep -q '@available'; then
  echo "ERRO: @main não pode estar dentro de @available (Apple rejeita __swift5_entry)"
  exit 1
fi

echo "✓ Extensão do cartão (Live Activity) presente no projeto iOS"
