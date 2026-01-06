Param(
  [string]$ApiBaseUrl = "http://localhost:4000",
  [string]$DeviceKey = "key1",
  [string]$DeviceId = "dev-01",
  [string]$FarmId = "farm-001",
  [string]$ZoneId = "zone-1",
  [int]$Requests = 200,
  [int]$Concurrency = 10
)

$ErrorActionPreference = "Stop"

function New-Payload() {
  return @{
    deviceId = $DeviceId
    farmId   = $FarmId
    zoneId   = $ZoneId
    ts       = (Get-Date).ToUniversalTime().ToString("o")
    metrics  = @{
      airTemp  = (Get-Random -Minimum 18 -Maximum 32) + (Get-Random) / [double]::MaxValue
      airRH    = (Get-Random -Minimum 50 -Maximum 95)
      soil1    = (Get-Random -Minimum 20 -Maximum 45)
      soil2    = (Get-Random -Minimum 20 -Maximum 45)
      soil3    = (Get-Random -Minimum 20 -Maximum 45)
      par      = (Get-Random -Minimum 0 -Maximum 900)
      ec       = [Math]::Round((Get-Random -Minimum 120 -Maximum 300) / 100.0, 2)
      ph       = [Math]::Round((Get-Random -Minimum 550 -Maximum 700) / 100.0, 2)
      leafWet  = (Get-Random -Minimum 0 -Maximum 2)
    }
  }
}

Write-Host "Load test: $Requests requests, concurrency=$Concurrency"
$uri = "$ApiBaseUrl/v1/ingest"
$headers = @{ "X-Device-Key" = $DeviceKey }

$sw = [Diagnostics.Stopwatch]::StartNew()
$sent = 0
$fail = 0

while ($sent -lt $Requests) {
  $batch = [Math]::Min($Concurrency, $Requests - $sent)
  $jobs = @()
  for ($i = 0; $i -lt $batch; $i++) {
    $body = (New-Payload | ConvertTo-Json -Depth 6)
    $jobs += Start-Job -ScriptBlock {
      param($u, $h, $b)
      try {
        Invoke-RestMethod -Method Post -Uri $u -Headers $h -ContentType "application/json" -Body $b | Out-Null
        return $true
      } catch {
        return $false
      }
    } -ArgumentList $uri, $headers, $body
  }

  $results = $jobs | Receive-Job -Wait -AutoRemoveJob
  foreach ($r in $results) {
    if (-not $r) { $fail++ }
  }
  $sent += $batch
  Write-Host "Progress: $sent/$Requests (fail=$fail)"
}

$sw.Stop()
$rps = [Math]::Round($Requests / $sw.Elapsed.TotalSeconds, 2)
Write-Host "Done in $($sw.Elapsed.TotalSeconds)s (~$rps req/s), failures=$fail"
if ($fail -gt 0) { exit 1 }

