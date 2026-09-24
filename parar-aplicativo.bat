@echo off
title X-Acai Delivery - Encerrando
echo ========================================================
echo        ENCERRANDO X-ACAI DELIVERY
echo ========================================================
echo.
echo Parando processos Node.js do aplicativo...
taskkill /F /IM node.exe /T 2>nul
echo.
echo ========================================================
echo   APLICATIVO ENCERRADO!
echo ========================================================
echo.
pause
