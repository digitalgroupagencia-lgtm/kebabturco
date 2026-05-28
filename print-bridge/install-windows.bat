@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ========================================
echo  Kebab Print Bridge - Instalacao Windows
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale Node.js 18 ou superior: https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=1 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
  echo [AVISO] Node.js 18+ recomendado. Versao actual:
  node -v
)

echo [OK] Node.js encontrado:
node -v
echo.

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [OK] Ficheiro .env criado a partir de .env.example
    echo       Edite .env antes de iniciar o bridge.
  ) else (
    echo [AVISO] .env.example nao encontrado. Crie .env manualmente.
  )
) else (
  echo [INFO] .env ja existe — nao foi alterado.
)

echo.
echo A instalar dependencias (npm install)...
call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  pause
  exit /b 1
)

echo.
echo ========================================
echo  Instalacao concluida.
echo ========================================
echo.
echo Proximos passos:
echo   1. Edite o ficheiro .env nesta pasta
echo   2. Teste manual: start-bridge.bat
echo   3. Servico automatico: install-service-windows.bat
echo.
echo Consulte README-WINDOWS.md para detalhes.
echo.
pause
