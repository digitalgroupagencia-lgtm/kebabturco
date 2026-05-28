@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ========================================
echo  Kebab Print Bridge - Remover servico
echo ========================================
echo.

where pm2 >nul 2>&1
if errorlevel 1 (
  echo [INFO] PM2 nao instalado — nada a remover.
  pause
  exit /b 0
)

pm2 describe kebab-print-bridge >nul 2>&1
if errorlevel 1 (
  echo [INFO] Servico kebab-print-bridge nao encontrado.
) else (
  pm2 delete kebab-print-bridge
  pm2 save
  echo [OK] Servico kebab-print-bridge removido.
)

echo.
pause
