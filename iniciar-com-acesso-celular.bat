@echo off
title X-Acai Delivery - Modo Celular e Computador
echo ========================================================
echo        INICIANDO X-ACAI DELIVERY (COMPUTADOR + CELULAR)
echo ========================================================
echo.
echo 1. Iniciando Backend...
start "X-Acai Backend" cmd /k "cd /d "%~dp0apps\backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo 2. Iniciando Frontend...
start "X-Acai Frontend" cmd /k "cd /d "%~dp0apps\frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo 3. Gerando link seguro para o Celular...
start "X-Acai Link Celular" cmd /k "npx --yes cloudflared tunnel --url http://localhost:3001"

echo.
echo ========================================================
echo   TUDO PRONTO!
echo.
echo   No seu Computador: http://localhost:3001
echo   No Celular: Copie a URL do trycloudflare da janela aberta!
echo ========================================================
echo.
pause
