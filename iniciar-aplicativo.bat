@echo off
title X-Acai Delivery - Inicializador
echo ========================================================
echo        INICIANDO X-ACAI DELIVERY (LOCAL)
echo ========================================================
echo.
echo 1. Iniciando Backend na porta 3002...
start "X-Acai Backend (Porta 3002)" cmd /k "cd /d "%~dp0apps\backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo 2. Iniciando Frontend na porta 3001...
start "X-Acai Frontend (Porta 3001)" cmd /k "cd /d "%~dp0apps\frontend" && npm run dev"

echo.
echo ========================================================
echo   APLICATIVO INICIADO COM SUCESSO!
echo.
echo   Loja do Cliente:   http://localhost:3001
echo   Painel Admin:      http://localhost:3001/admin
echo   Backend / Health:  http://localhost:3002/health
echo ========================================================
echo.
pause
