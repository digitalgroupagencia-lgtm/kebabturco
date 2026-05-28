@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ========================================
echo  Kebab Print Bridge - Modo manual
echo ========================================
echo.

if not exist ".env" (
  echo [ERRO] Ficheiro .env nao encontrado.
  echo Execute install-windows.bat ou copie .env.example para .env
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Dependencias em falta — a instalar...
  call npm install
)

echo A iniciar bridge... (Ctrl+C para parar)
echo.
node print-bridge.js
pause
