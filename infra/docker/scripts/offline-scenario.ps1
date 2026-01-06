Param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path,
  [int]$OfflineAfterMin = 1,
  [string]$FarmId = "farm-001"
)

$ErrorActionPreference = "Stop"
Push-Location $ProjectDir

try {
  Write-Host "Stopping mock-generator..."
  docker compose stop mock-generator | Out-Null

  Write-Host "Recreating worker with OFFLINE_AFTER_MIN=$OfflineAfterMin..."
  $env:OFFLINE_AFTER_MIN = "$OfflineAfterMin"
  docker compose up -d --force-recreate worker | Out-Null

  Write-Host "Waiting for offline window + buffer..."
  Start-Sleep -Seconds (($OfflineAfterMin * 60) + 20)

  Write-Host "Active alerts:"
  docker compose exec -T db psql -U postgres -d smart_farm -c "SELECT alert_type,status,severity,zone_id,started_at FROM alerts WHERE status='active' ORDER BY alert_id DESC LIMIT 20;" | Out-Host

  Write-Host "Starting mock-generator..."
  Remove-Item Env:OFFLINE_AFTER_MIN -ErrorAction SilentlyContinue
  docker compose up -d mock-generator worker | Out-Null

  Write-Host "Waiting for recovery tick..."
  Start-Sleep -Seconds 70

  Write-Host "Recent alerts:"
  docker compose exec -T db psql -U postgres -d smart_farm -c "SELECT alert_type,status,zone_id,started_at,resolved_at FROM alerts ORDER BY alert_id DESC LIMIT 20;" | Out-Host
} finally {
  Pop-Location
}

