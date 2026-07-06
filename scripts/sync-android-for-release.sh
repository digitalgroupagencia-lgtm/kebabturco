#!/usr/bin/env bash
# Sincroniza Capacitor Android e fixa identificador Google Play v1.1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP_ID="com.eurobusinessgroup.kebabturco"
VERSION_CODE="10"
VERSION_NAME="1.2"

npm run build
npx cap sync android

GRADLE="$ROOT/android/app/build.gradle"
STRINGS="$ROOT/android/app/src/main/res/values/strings.xml"

# Cap sync pode repor valores Lovable — garantir identificador Play Store.
sed -i.bak "s/applicationId \"[^\"]*\"/applicationId \"$APP_ID\"/" "$GRADLE"
sed -i.bak "s/versionCode [0-9]*/versionCode $VERSION_CODE/" "$GRADLE"
sed -i.bak "s/versionName \"[^\"]*\"/versionName \"$VERSION_NAME\"/" "$GRADLE"
rm -f "$GRADLE.bak"

sed -i.bak "s|<string name=\"package_name\">[^<]*</string>|<string name=\"package_name\">$APP_ID</string>|" "$STRINGS"
sed -i.bak "s|<string name=\"custom_url_scheme\">[^<]*</string>|<string name=\"custom_url_scheme\">$APP_ID</string>|" "$STRINGS"
sed -i.bak 's|<string name="app_name">[^<]*</string>|<string name="app_name">Kebab Turco</string>|' "$STRINGS"
sed -i.bak 's|<string name="title_activity_main">[^<]*</string>|<string name="title_activity_main">Kebab Turco</string>|' "$STRINGS"
rm -f "$STRINGS.bak"

echo "✓ Android pronto: $APP_ID v$VERSION_NAME (versionCode $VERSION_CODE)"
