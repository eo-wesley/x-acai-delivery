#!/usr/bin/env pwsh
# scripts/evolution-setup.ps1
# Gerencia a Evolution API localmente via Docker Compose
#
# SE EXECUTION POLICY ESTIVER BLOQUEADA, use uma das alternativas:
#   powershell -ExecutionPolicy Bypass -File scripts\evolution-setup.ps1 start
#   scripts\evolution-setup.bat start           (alternativa .bat sem restrições)
#
# Uso: .\scripts\evolution-setup.ps1 [start|stop|restart|status|qr|test|open]

param(
    [string]$Command = "start",
    [string]$Phone = ""
)

$COMPOSE_FILE = "docker-compose-evolution.yml"
$EVOLUTION_URL = "http://localhost:8080"
$EVOLUTION_KEY = "xacai-secret-api-key-2024"
$INST_NAME = "acai-delivery"

function Invoke-Docker {
    param([string[]]$DockerArgs)
    # Tenta 'docker compose' (v2), depois 'docker-compose' (v1)
    $result = & docker compose @DockerArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        $result = & docker-compose @DockerArgs 2>&1
    }
    return $result
}

function Invoke-EvolutionApi {
    param([string]$Method, [string]$Path, [hashtable]$Body = @{})
    $headers = @{ "apikey" = $EVOLUTION_KEY; "Content-Type" = "application/json" }
    $url = "$EVOLUTION_URL$Path"
    try {
        if ($Body.Count -gt 0) {
            $bodyJson = $Body | ConvertTo-Json -Depth 5
            return Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -Body $bodyJson -ErrorAction Stop
        }
        return Invoke-RestMethod -Uri $url -Method $Method -Headers $headers -ErrorAction Stop
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 409) { return $null }  # already exists = OK
        return $null
    }
}

function Test-EvolutionOnline {
    try {
        $r = Invoke-WebRequest -Uri "$EVOLUTION_URL/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return ($r.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

function Get-InstanceStatus {
    $instances = Invoke-EvolutionApi -Method "GET" -Path "/instance/fetchInstances"
    if (-not $instances) { return "unknown" }
    $arr = @($instances)
    $inst = $arr | Where-Object {
        ($_.name -eq $INST_NAME) -or
        ($_.instance -and $_.instance.instanceName -eq $INST_NAME)
    } | Select-Object -First 1
    if (-not $inst) { return "not_found" }
    if ($inst.connectionStatus) { return $inst.connectionStatus }
    if ($inst.instance -and $inst.instance.status) { return $inst.instance.status }
    return "unknown"
}

function Start-Evolution {
    Write-Host "🚀 Iniciando Evolution API..." -ForegroundColor Cyan
    Invoke-Docker -DockerArgs @("-f", $COMPOSE_FILE, "up", "-d")

    Write-Host "⏳ Aguardando inicialização..." -ForegroundColor Yellow
    $online = $false
    for ($i = 1; $i -le 8; $i++) {
        Start-Sleep -Seconds 5
        if (Test-EvolutionOnline) { $online = $true; break }
        Write-Host "   Tentativa $i/8..." -ForegroundColor DarkGray
    }

    if (-not $online) {
        Write-Host "⚠️  API não respondeu. Verifique: docker compose -f $COMPOSE_FILE logs" -ForegroundColor Yellow
        return
    }

    Write-Host "✅ Evolution API online!" -ForegroundColor Green
    Start-Sleep -Seconds 2

    # Criar instância
    Write-Host "📱 Configurando instância '$INST_NAME'..." -ForegroundColor Cyan
    Invoke-EvolutionApi -Method "POST" -Path "/instance/create" -Body @{
        instanceName = $INST_NAME
        qrcode       = $true
        integration  = "WHATSAPP-BAILEYS"
    } | Out-Null

    Show-Summary
}

function Stop-Evolution {
    Write-Host "🛑 Parando Evolution API..." -ForegroundColor Red
    Invoke-Docker -DockerArgs @("-f", $COMPOSE_FILE, "down")
}

function Get-Status {
    Write-Host "📊 Status Evolution API:" -ForegroundColor Cyan
    if (-not (Test-EvolutionOnline)) {
        Write-Host "   ❌ Offline" -ForegroundColor Red
        Write-Host "   Execute: .\scripts\evolution-setup.ps1 start" -ForegroundColor Yellow
        return
    }
    Write-Host "   ✅ API Online : $EVOLUTION_URL" -ForegroundColor Green

    $connStatus = Get-InstanceStatus
    $color = if ($connStatus -eq "open") { "Green" } else { "Yellow" }
    Write-Host "   Instância    : $INST_NAME" -ForegroundColor White
    Write-Host "   Status WA    : $connStatus" -ForegroundColor $color
    if ($connStatus -ne "open") {
        Write-Host "   ⚡ Execute 'qr' para parear ou acesse: $EVOLUTION_URL/manager" -ForegroundColor Yellow
    }
}

function Show-QR {
    if (-not (Test-EvolutionOnline)) {
        Write-Host "❌ Evolution API offline. Execute: .\scripts\evolution-setup.ps1 start" -ForegroundColor Red
        return
    }
    Write-Host "📷 Acessando QR Code de '$INST_NAME'..." -ForegroundColor Cyan
    Invoke-EvolutionApi -Method "GET" -Path "/instance/connect/$INST_NAME" | Out-Null
    Write-Host ""
    Write-Host "   Abra o Manager Web e escaneie o QR Code:" -ForegroundColor White
    Write-Host "   🌐 $EVOLUTION_URL/manager" -ForegroundColor Cyan
    Write-Host "   🔑 API Key: $EVOLUTION_KEY" -ForegroundColor DarkGray
    Write-Host ""
    try { Start-Process "$EVOLUTION_URL/manager" } catch {}
}

function Test-Send {
    param([string]$PhoneNumber)
    if (-not $PhoneNumber) {
        $PhoneNumber = Read-Host "📱 Número (ex: 5511999990000)"
    }
    & node scripts/test-whatsapp-real.js $PhoneNumber
}

function Show-Summary {
    Write-Host ""
    Write-Host "════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host " 🌐 Manager : $EVOLUTION_URL/manager" -ForegroundColor Cyan
    Write-Host " 🔑 API Key : $EVOLUTION_KEY" -ForegroundColor White
    Write-Host " 📱 Instância: $INST_NAME" -ForegroundColor White
    Write-Host ""
    Write-Host " PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host "   1. Abra: $EVOLUTION_URL/manager"
    Write-Host "   2. Escaneie o QR Code com o WhatsApp"
    Write-Host "   3. Teste: node scripts/test-whatsapp-real.js 5511999999999"
    Write-Host ""
    Write-Host " Para ativar no backend (.env):" -ForegroundColor Yellow
    Write-Host "   WHATSAPP_PROVIDER=evolution"
    Write-Host "   WHATSAPP_BASE_URL=$EVOLUTION_URL"
    Write-Host "   WHATSAPP_INSTANCE=$INST_NAME"
    Write-Host "   WHATSAPP_API_KEY=$EVOLUTION_KEY"
    Write-Host "════════════════════════════════════════════" -ForegroundColor DarkGray
}

# ─── Main ─────────────────────────────────────────────────────────────────────
switch ($Command.ToLower()) {
    "start" { Start-Evolution }
    "stop" { Stop-Evolution }
    "restart" { Stop-Evolution; Start-Sleep 3; Start-Evolution }
    "status" { Get-Status }
    "qr" { Show-QR }
    "open" { try { Start-Process "$EVOLUTION_URL/manager" } catch {} }
    "test" { Test-Send -PhoneNumber $Phone }
    default {
        Write-Host "Uso: .\scripts\evolution-setup.ps1 [start|stop|restart|status|qr|open|test <numero>]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Alternativas (sem restriction de execution policy):" -ForegroundColor DarkGray
        Write-Host "  powershell -ExecutionPolicy Bypass -File scripts\evolution-setup.ps1 start" -ForegroundColor White
        Write-Host "  scripts\evolution-setup.bat start" -ForegroundColor White
    }
}
