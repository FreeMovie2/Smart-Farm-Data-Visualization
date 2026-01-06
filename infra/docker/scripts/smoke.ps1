Param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$WebBaseUrl = "http://localhost:3000",
  [string]$FarmId = "farm-001"
)

$ErrorActionPreference = "Stop"

function Assert-Ok($name, $condition) {
  if (-not $condition) { throw "FAILED: $name" }
  Write-Host "OK: $name"
}

Write-Host "== API health =="
$health = Invoke-RestMethod "$ApiBaseUrl/health"
Assert-Ok "/health ok" ($health.ok -eq $true)

Write-Host "== API dashboard =="
$dash = Invoke-RestMethod "$ApiBaseUrl/v1/dashboard?farmId=$FarmId"
Assert-Ok "dashboard zones" ($dash.zones.Count -ge 1)

Write-Host "== API reports =="
$summary = Invoke-RestMethod "$ApiBaseUrl/v1/reports/summary?zoneId=zone-1"
Assert-Ok "summary metrics" ($summary.metrics.PSObject.Properties.Count -ge 1)

$csv = Invoke-WebRequest -UseBasicParsing "$ApiBaseUrl/v1/reports/zone-series.csv?zoneId=zone-1&metricKey=airTemp&rollup=5m"
Assert-Ok "csv status 200" ($csv.StatusCode -eq 200)
Assert-Ok "csv header" ($csv.Content -like "ts,value*")

Write-Host "== Web pages =="
foreach ($path in @("/", "/dashboard", "/alerts", "/devices", "/events", "/reports", "/zones/zone-1")) {
  $resp = Invoke-WebRequest -UseBasicParsing "$WebBaseUrl$path"
  Assert-Ok "web $path" ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 307)
}

Write-Host "Smoke OK"

