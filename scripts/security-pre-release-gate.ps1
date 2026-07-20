param(
  [string]$WorkspaceRoot = (Resolve-Path ".").Path
)

$syncScript = Join-Path $WorkspaceRoot "scripts\sync-server-source.ps1"
$verifyScript = Join-Path $WorkspaceRoot "scripts\verify-auth-hardening.ps1"
$securitySection = Join-Path $WorkspaceRoot "src\components\settings\SecuritySection.tsx"
$sanitizerScript = Join-Path $WorkspaceRoot "src\scripts\sanitizePlainPasswords.ts"

if (!(Test-Path $syncScript)) {
  Write-Error "Missing sync script: $syncScript"
  exit 1
}
if (!(Test-Path $verifyScript)) {
  Write-Error "Missing verify script: $verifyScript"
  exit 1
}
if (!(Test-Path $securitySection)) {
  Write-Error "Missing security section file: $securitySection"
  exit 1
}
if (!(Test-Path $sanitizerScript)) {
  Write-Error "Missing sanitizer script: $sanitizerScript"
  exit 1
}

Write-Output "[1/4] Syncing server source..."
& powershell -ExecutionPolicy Bypass -File $syncScript -WorkspaceRoot $WorkspaceRoot
if ($LASTEXITCODE -ne 0) {
  Write-Error "Sync step failed"
  exit 1
}

Write-Output "[2/4] Verifying auth hardening markers..."
& powershell -ExecutionPolicy Bypass -File $verifyScript -WorkspaceRoot $WorkspaceRoot
if ($LASTEXITCODE -ne 0) {
  Write-Error "Auth hardening verification failed"
  exit 1
}

Write-Output "[3/4] Verifying sanitizer wiring in settings UI..."
$securityContent = Get-Content -Path $securitySection -Raw
if ($securityContent -notmatch "sanitizePlainPasswords") {
  Write-Error "Security UI is not wired to sanitizePlainPasswords"
  exit 1
}
if ($securityContent -notmatch "handleSanitizePasswords") {
  Write-Error "Security UI sanitize handler not found"
  exit 1
}

Write-Output "[4/4] Verifying sanitizer targets..."
$sanitizerContent = Get-Content -Path $sanitizerScript -Raw
if ($sanitizerContent -notmatch "'users', 'customers', 'suppliers'") {
  Write-Error "Sanitizer target tables marker is missing"
  exit 1
}
if ($sanitizerContent -notmatch "passwordHash") {
  Write-Error "Sanitizer passwordHash write marker is missing"
  exit 1
}

Write-Output "security_gate_ok"
