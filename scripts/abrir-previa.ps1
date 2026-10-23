param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$repoDirectory = Split-Path -Parent $PSScriptRoot
$frontendDirectory = Join-Path $repoDirectory 'apps\frontend'
$previewUrl = 'http://localhost:3005/'
$logDirectory = Join-Path $env:LOCALAPPDATA 'XAcai\preview'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-XAcaiPreview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200 -and $response.Content -match 'X-A|X-Acai|X-Açaí'
    } catch { return $false }
}

if (-not (Test-XAcaiPreview)) {
    if (Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue) {
        throw 'A porta 3005 ja esta em uso por outro processo. Nao foi encerrado nenhum programa.'
    }
    $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
    Start-Process -FilePath $nodeExecutable -ArgumentList @('node_modules/next/dist/bin/next', 'dev', '-p', '3005', '-H', '0.0.0.0') -WorkingDirectory $frontendDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'stdout.log') -RedirectStandardError (Join-Path $logDirectory 'stderr.log') | Out-Null
    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        if (Test-XAcaiPreview) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw "A previa ainda nao respondeu. Consulte os logs em $logDirectory" }
}

Write-Host 'Previa local: nao e confirmacao de loja pronta para vendas.'
Write-Host "Computador: $previewUrl"
$physicalInterfaces = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up' | Select-Object -ExpandProperty ifIndex)
Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.InterfaceIndex -in $physicalInterfaces -and $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.AddressState -eq 'Preferred' } |
    ForEach-Object { Write-Host "Celular na mesma rede: http://$($_.IPAddress):3005/" }
if (-not $NoBrowser) { Start-Process $previewUrl }
