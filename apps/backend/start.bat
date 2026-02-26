@echo off
REM Script auxiliar para iniciar o backend X-Açaí em Windows

cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         X-Açaí Backend Startup Script                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar Node.js
echo [1/4] Verificando Node.js...
"C:\Program Files\nodejs\node.exe" --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado em C:\Program Files\nodejs\
    echo Instale Node.js de https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

REM Verificar se estamos no diretório backend
echo.
echo [2/4] Verificando diretório...
if not exist "dist\server.js" (
    echo ❌ Arquivo dist\server.js não encontrado
    echo Você precisa estar no diretório /backend
    echo Execute: cd backend
    pause
    exit /b 1
)
echo ✅ Diretório backend correto

REM Verificar .env
echo.
echo [3/4] Verificando credenciais (.env)...
if not exist ".env" (
    echo ⚠️  Arquivo .env não encontrado!
    echo Copie .env.example para .env e configure as credenciais
    echo Siga: SETUP_CREDENTIALS.md
    pause
    exit /b 1
)

REM Checar se .env tem as chaves necessárias
findstr /R "^FIREBASE_PROJECT_ID=" .env >nul
if errorlevel 1 (
    echo ❌ FIREBASE_PROJECT_ID não configurado em .env
    echo Leia SETUP_CREDENTIALS.md para instruções
    pause
    exit /b 1
)
echo ✅ Arquivo .env encontrado e parcialmente configurado

REM Iniciar servidor
echo.
echo [4/4] Iniciando servidor...
echo.
echo 🚀 Backend iniciando em http://localhost:3000
echo    Pressione Ctrl+C para parar
echo.
timeout /t 2 /nobreak

"C:\Program Files\nodejs\node.exe" dist\server.js

echo.
echo Backend encerrado.
pause
