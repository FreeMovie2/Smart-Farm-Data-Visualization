Param(
  [string]$ProjectDir = (Resolve-Path "$PSScriptRoot\..").Path,
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$WebBaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
Push-Location $ProjectDir

try {
  Write-Host "Restarting services..."
  docker compose restart db api worker web mock-generator | Out-Null

  Write-Host "Waiting for API health..."
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $h = Invoke-RestMethod "$ApiBaseUrl/health"
      if ($h.ok -eq $true) { break }
    } catch {}
    Start-Sleep -Seconds 1
  }

  Write-Host "Checking web routes..."
  foreach ($path in @("/", "/dashboard", "/reports")) {
    $resp = Invoke-WebRequest -UseBasicParsing "$WebBaseUrl$path"
    if ($resp.StatusCode -ne 200 -and $resp.StatusCode -ne 307) { throw "web $path status $($resp.StatusCode)" }
  }

  Write-Host "Restart recovery OK"
} finally {
  Pop-Location
}

