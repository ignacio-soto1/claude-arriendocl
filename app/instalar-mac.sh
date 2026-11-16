#!/bin/bash
# Prepara y abre la app de Arriendo en CL en el simulador de iPhone, en un Mac.
# Uso (en la Terminal):
#   curl -fsSL https://raw.githubusercontent.com/ignacio-soto1/claude-arriendocl/main/app/instalar-mac.sh | bash
# Se puede volver a correr cuando quieras: actualiza el proyecto y abre la última versión.
set -euo pipefail

CARPETA="$HOME/claude-arriendocl"
REPO="https://github.com/ignacio-soto1/claude-arriendocl.git"
paso() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
falla() { printf '\n\033[1;31m✖ %s\033[0m\n' "$1"; exit 1; }

[ "$(uname)" = "Darwin" ] || falla "Este script es para Mac."

paso "Revisando Xcode"
if [ ! -d /Applications/Xcode.app ]; then
  open "macappstore://apps.apple.com/app/id497799835" || true
  falla "Falta Xcode. Se abrió la App Store: instálalo, ábrelo una vez y vuelve a correr este comando."
fi
if ! xcode-select -p 2>/dev/null | grep -q "Xcode.app"; then
  echo "Configurando Xcode (te pedirá la clave del Mac)…"
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
fi
if ! xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then
  echo "Aceptando la licencia y terminando la instalación de Xcode (te puede pedir la clave del Mac)…"
  sudo xcodebuild -license accept
  sudo xcodebuild -runFirstLaunch
fi
if ! xcrun simctl list runtimes 2>/dev/null | grep -q "iOS"; then
  echo "Descargando el simulador de iPhone (puede tardar varios minutos)…"
  xcodebuild -downloadPlatform iOS
fi

paso "Revisando Node.js"
if ! command -v npm >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "Instalando Homebrew…"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    [ -x /opt/homebrew/bin/brew ] && eval "$(/opt/homebrew/bin/brew shellenv)"
    [ -x /usr/local/bin/brew ] && eval "$(/usr/local/bin/brew shellenv)"
  fi
  brew install node
fi
echo "Node $(node -v)"

paso "Descargando el proyecto"
if [ -d "$CARPETA/.git" ]; then
  git -C "$CARPETA" pull --ff-only
else
  git clone "$REPO" "$CARPETA"
fi

paso "Preparando la app"
cd "$CARPETA/app"
npm ci
npm run sync

paso "Abriendo en el simulador de iPhone"
SIM=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
d = json.load(sys.stdin)["devices"]
iphones = [x for k, v in d.items() if "iOS" in k for x in v if x["name"].startswith("iPhone")]
iphones.sort(key=lambda x: x["state"] != "Booted")
print(iphones[0]["udid"] if iphones else "")')
[ -n "$SIM" ] || falla "No encontré un simulador de iPhone. Abre Xcode → Settings → Components e instala iOS."
npx cap run ios --target "$SIM"

printf '\n\033[1;32m✔ Listo: la app está abierta en el simulador.\033[0m\n'
echo "Para abrir el proyecto en Xcode:  cd \"$CARPETA/app\" && npx cap open ios"
