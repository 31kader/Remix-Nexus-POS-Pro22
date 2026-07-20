param(
  [string]$WorkspaceRoot = (Resolve-Path ".").Path
)

$sourceServer = Join-Path $WorkspaceRoot "server.ts"
$recoveredServer = Join-Path $WorkspaceRoot "recovered\server.ts"
$distServerSource = Join-Path $WorkspaceRoot "release\win-unpacked\resources\dist\server.source.ts"

if (!(Test-Path $sourceServer)) {
  Write-Error "Missing source server file: $sourceServer"
  exit 1
}

if (!(Test-Path (Split-Path $distServerSource -Parent))) {
  Write-Error "Missing dist folder for sync target: $(Split-Path $distServerSource -Parent)"
  exit 1
}

Copy-Item -Path $sourceServer -Destination $recoveredServer -Force
Copy-Item -Path $sourceServer -Destination $distServerSource -Force

Write-Output "sync_ok"
Write-Output "source=$sourceServer"
Write-Output "recovered=$recoveredServer"
Write-Output "distSource=$distServerSource"
