@echo off
:: evolution-setup.bat — Gerencia a Evolution API local via Docker
:: Alternativa ao .ps1 quando PowerShell execution policy estiver bloqueada.
:: Uso: scripts\evolution-setup.bat [start|stop|status|qr|test|open]

setlocal enabledelayedexpansion

set COMPOSE_FILE=docker-compose-evolution.yml
set EVOLUTION_URL=http://localhost:8080
set API_KEY=xacai-secret-api-key-2024
set INSTANCE_NAME=acai-delivery
set CMD=%~1

if "%CMD%"=="" set CMD=start
if /i "%CMD%"=="start"   goto :start_evo
if /i "%CMD%"=="stop"    goto :stop_evo
if /i "%CMD%"=="restart" goto :restart_evo
if /i "%CMD%"=="status"  goto :status_evo
if /i "%CMD%"=="qr"      goto :qr_evo
if /i "%CMD%"=="open"    goto :open_manager
if /i "%CMD%"=="test"    goto :test_send
goto :usage

:start_evo
echo [Evolution] Iniciando container...
docker compose -f %COMPOSE_FILE% up -d
if %errorlevel% neq 0 (
    echo AVISO: "docker compose" falhou. Tentando "docker-compose"...
    docker-compose -f %COMPOSE_FILE% up -d
)
echo [Evolution] Aguardando 15s para inicializar...
timeout /t 15 /nobreak > nul

:: Criar instância automaticamente
echo [Evolution] Criando instancia '%INSTANCE_NAME%'...
curl -s -X POST "%EVOLUTION_URL%/instance/create" ^
     -H "apikey: %API_KEY%" ^
     -H "Content-Type: application/json" ^
     -d "{\"instanceName\":\"%INSTANCE_NAME%\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}" > nul 2>&1

echo.
echo ============================================================
echo  Evolution API iniciada em %EVOLUTION_URL%
echo  Manager Web : %EVOLUTION_URL%/manager
echo  API Key     : %API_KEY%
echo  Instancia   : %INSTANCE_NAME%
echo ============================================================
echo.
echo  PROXIMOS PASSOS:
echo  1. Abra: %EVOLUTION_URL%/manager
echo  2. Escaneie o QR Code com o WhatsApp
echo  3. Execute: scripts\test-whatsapp-real.js 5511999990000
echo.
goto :end

:stop_evo
echo [Evolution] Parando container...
docker compose -f %COMPOSE_FILE% down 2>nul || docker-compose -f %COMPOSE_FILE% down
goto :end

:restart_evo
call :stop_evo
timeout /t 3 /nobreak > nul
call :start_evo
goto :end

:status_evo
echo [Evolution] Verificando status...
curl -s -o nul -w "HTTP %%{http_code}" "%EVOLUTION_URL%/" -H "apikey: %API_KEY%"
echo.
curl -s "%EVOLUTION_URL%/instance/fetchInstances" -H "apikey: %API_KEY%"
echo.
goto :end

:qr_evo
echo [Evolution] Gerando QR Code para '%INSTANCE_NAME%'...
echo.
echo  Acesse: %EVOLUTION_URL%/instance/connect/%INSTANCE_NAME%
echo  Header: apikey: %API_KEY%
echo.
echo  Ou abra o manager: %EVOLUTION_URL%/manager
start "" "%EVOLUTION_URL%/manager"
goto :end

:open_manager
start "" "%EVOLUTION_URL%/manager"
goto :end

:test_send
set PHONE=%~2
if "%PHONE%"=="" (
    echo Uso: scripts\evolution-setup.bat test 5511999990000
    goto :end
)
echo [Evolution] Enviando mensagem de teste para %PHONE%...
node scripts\test-whatsapp-real.js %PHONE%
goto :end

:usage
echo Uso: scripts\evolution-setup.bat [start^|stop^|restart^|status^|qr^|open^|test ^<numero^>]
goto :end

:end
endlocal
