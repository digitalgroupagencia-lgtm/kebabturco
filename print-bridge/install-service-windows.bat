@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ========================================
echo  Kebab Print Bridge - Servico (PM2)
echo ========================================
echo.

if not exist ".env" (
  echo [ERRO] Ficheiro .env nao encontrado. Edite .env antes de continuar.
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
  echo [INFO] A instalar dependencias...
  call npm install
)

where pm2 >nul 2>&1
if errorlevel 1 (
  echo [INFO] PM2 nao encontrado — a instalar globalmente...
  call npm install -g pm2
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar PM2. Execute como Administrador.
    pause
    exit /b 1
  )
)

pm2 describe kebab-print-bridge >nul 2>&1
if not errorlevel 1 (
  echo [INFO] Servico existente — a reiniciar...
  pm2 restart kebab-print-bridge
) else (
  echo [INFO] A criar servico kebab-print-bridge...
  pm2 start print-bridge.js --name kebab-print-bridge
)

pm2 save

echo.
echo ========================================
echo  Servico PM2 configurado.
echo ========================================
echo.
echo IMPORTANTE — arranque automatico com o Windows:
echo   Execute como Administrador:
echo     pm2 startup
echo   Siga as instrucoes no ecra e depois:
echo     pm2 save
echo.
echo Comandos uteis:
echo   pm2 status
echo   pm2 logs kebab-print-bridge
echo   uninstall-service-windows.bat  (remover)
echo.
echo Alternativa sem PM2: veja secao NSSM em README-WINDOWS.md
echo.
pause
