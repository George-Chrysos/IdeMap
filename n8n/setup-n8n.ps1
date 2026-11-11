# ============================================================================
# IdeMap — Automated n8n Setup (Docker Desktop + Zero-Docker Node Fallback)
# Automatically starts Docker Desktop if stopped, or falls back to local Node n8n
# ============================================================================

$ErrorActionPreference = "Continue"

function Test-DockerReady {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

Write-Host "1. Checking Docker Engine status..." -ForegroundColor Cyan
$dockerAvailable = Test-DockerReady

if (-not $dockerAvailable) {
  $dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dockerExe) {
    Write-Host "   Docker Desktop is not running yet. Launching Docker Desktop..." -ForegroundColor Yellow
    Start-Process -FilePath $dockerExe
    Write-Host "   Waiting up to 45s for Docker Linux Engine pipe to initialize..." -ForegroundColor Cyan
    for ($i = 0; $i -lt 23; $i++) {
      Start-Sleep -Seconds 2
      if (Test-DockerReady) {
        $dockerAvailable = $true
        Write-Host "   Docker Engine is online!" -ForegroundColor Green
        break
      }
      Write-Host -NoNewline "."
    }
    Write-Host ""
  }
}

if ($dockerAvailable) {
  Write-Host "2. Starting idemap-n8n Docker container..." -ForegroundColor Cyan
  docker compose up -d

  Write-Host "3. Waiting for n8n on http://localhost:5678 ..." -ForegroundColor Cyan
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $res = Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
      if ($res.StatusCode -eq 200) { break }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  Write-Host "4. Importing & activating IdeMap workflows in Docker container..." -ForegroundColor Cyan
  docker exec -u node idemap-n8n n8n import:workflow --separate --input=/workflows
  docker exec -u node idemap-n8n n8n update:workflow --id=idemap-ai-assistant-01 --active=true
  docker exec -u node idemap-n8n n8n update:workflow --id=idemap-morning-briefing-02 --active=true
  docker exec -u node idemap-n8n n8n update:workflow --id=idemap-night-review-03 --active=true

  Write-Host "`nDone! n8n is running in Docker at http://localhost:5678" -ForegroundColor Green
} else {
  Write-Host "`nDocker Desktop engine pipe is unavailable. Switching to Zero-Docker Node.js n8n mode!" -ForegroundColor Yellow
  $workflowsDir = Join-Path $PSScriptRoot "workflows"
  Write-Host "2. Importing IdeMap workflows ($workflowsDir) via npx n8n..." -ForegroundColor Cyan
  npx --yes n8n import:workflow --separate --input="$workflowsDir"
  npx --yes n8n update:workflow --id=idemap-ai-assistant-01 --active=true
  npx --yes n8n update:workflow --id=idemap-morning-briefing-02 --active=true
  npx --yes n8n update:workflow --id=idemap-night-review-03 --active=true

  Write-Host "3. Starting local n8n server on http://localhost:5678 ..." -ForegroundColor Green
  npx --yes n8n start
}
