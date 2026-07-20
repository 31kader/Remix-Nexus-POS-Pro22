param(
  [string]$WorkspaceRoot = (Resolve-Path ".").Path
)

$targets = @(
  (Join-Path $WorkspaceRoot "server.ts"),
  (Join-Path $WorkspaceRoot "release\win-unpacked\resources\dist\server.cjs")
)

$requiredMarkers = @(
  "AUTH_MIN_PASSWORD_LENGTH",
  "AUTH_WINDOW_MS",
  "AUTH_MAX_ATTEMPTS",
  "authRateState",
  "invalidCredentialsError",
  "password_hash"
)

$failed = $false

foreach ($target in $targets) {
  if (!(Test-Path $target)) {
    Write-Output "missing_file: $target"
    $failed = $true
    continue
  }

  $content = Get-Content -Path $target -Raw
  foreach ($marker in $requiredMarkers) {
    if ($content -notmatch [Regex]::Escape($marker)) {
      Write-Output "missing_marker: $marker in $target"
      $failed = $true
    }
  }
}

if ($failed) {
  Write-Error "Hardening verification failed"
  exit 1
}

Write-Output "hardening_ok"
