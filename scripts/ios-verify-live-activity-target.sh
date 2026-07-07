#!/usr/bin/env bash
# Garante que a extensão do cartão (Live Activity) está no projeto Xcode.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

for token in \
  StaffOrderLiveWidgetExtension \
  net.kebabturco.app.StaffOrderWidget \
  "Embed Foundation Extensions" \
  GenericAttributes.swift \
  StaffOrderLiveWidget.swift; do
  if ! grep -q "$token" "$PBX"; then
    echo "ERRO: falta no project.pbxproj: $token"
    exit 1
  fi
done

for file in \
  "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.swift" \
  "$ROOT/ios/StaffOrderLiveWidget/GenericAttributes.swift" \
  "$ROOT/ios/StaffOrderLiveWidget/Info.plist" \
  "$ROOT/ios/StaffOrderLiveWidget/StaffOrderLiveWidget.entitlements"; do
  if [ ! -f "$file" ]; then
    echo "ERRO: falta ficheiro $file"
    exit 1
  fi
done

echo "✓ Extensão do cartão (Live Activity) presente no projeto iOS"
