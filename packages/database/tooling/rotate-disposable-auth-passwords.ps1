param([switch]$KeyFromClipboard, [switch]$ChoosePassword)

$ErrorActionPreference = 'Stop'
$projectRef = 'enjafragbcrrgaclwopd'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$credentialPath = Join-Path $repoRoot 'supabase/.temp/disposable-test-accounts.json'
$progressPath = Join-Path $repoRoot 'supabase/.temp/disposable-password-rotation.json'
$baseUri = "https://$projectRef.supabase.co"

if ($env:TEST_PROJECT_REF -ne $projectRef) {
  throw "Set TEST_PROJECT_REF to $projectRef. No other project is allowed."
}
if (-not (Test-Path -LiteralPath $credentialPath)) {
  throw 'The disposable test-account credential file is missing. Seed the accounts first.'
}

$saved = Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json
if ($saved.project_ref -ne $projectRef -or @($saved.accounts).Count -ne 15) {
  throw 'The credential file does not contain the expected 15 disposable accounts.'
}
foreach ($account in $saved.accounts) {
  if ($account.email -notmatch '^clinzo-(patient|doctor|driver)-0[1-5]@example\.com$' -or
      $account.auth_user_id -notmatch '^[0-9a-fA-F-]{36}$') {
    throw 'The credential file contains an unexpected account. No passwords were changed.'
  }
}
if ($saved.facility_account) {
  if ($saved.facility_account.email -ne 'clinzo-facility-01@example.com' -or
      $saved.facility_account.auth_user_id -notmatch '^[0-9a-fA-F-]{36}$') {
    throw 'The credential file contains an unexpected facility account. No passwords were changed.'
  }
}

function Read-PlainSecret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secure.Dispose() }
}

$serviceKey = if ($KeyFromClipboard) {
  try { [string](Get-Clipboard -Raw) }
  finally {
    try { Set-Clipboard -Value '[Clinzo secret cleared]' -ErrorAction Stop }
    catch { Write-Warning 'Could not clear the clipboard. Clear it manually.' }
  }
} else {
  Read-PlainSecret "Disposable project's sb_secret_ key or legacy service_role key"
}
$serviceKey = $serviceKey.Trim()
if ($serviceKey -notmatch '^(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$') {
  throw 'Use the disposable project secret key, not a publishable key.'
}
$headers = @{ apikey = $serviceKey }
if (-not $serviceKey.StartsWith('sb_secret_')) { $headers.Authorization = "Bearer $serviceKey" }

if (Test-Path -LiteralPath $progressPath) {
  $progress = Get-Content -LiteralPath $progressPath -Raw | ConvertFrom-Json
  if ($progress.project_ref -ne $projectRef -or $progress.password.Length -lt 8) {
    throw 'The saved rotation progress is invalid. Inspect it before retrying.'
  }
  $newPassword = $progress.password
  Write-Host 'Resuming the previous password rotation.'
} else {
  if ($ChoosePassword) {
    $newPassword = Read-PlainSecret 'New shared test password (exactly 8 characters)'
    $confirmation = Read-PlainSecret 'Enter the new password again'
    if ($newPassword.Length -ne 8) { throw "First password has $($newPassword.Length) characters; enter exactly 8." }
    if ($confirmation.Length -ne 8) { throw "Confirmation has $($confirmation.Length) characters; enter exactly 8." }
    if ($newPassword -ne $confirmation) { throw 'The two passwords do not match; type the same 8 characters twice.' }
    if ($newPassword -ne $newPassword.Trim()) { throw 'Remove leading or trailing spaces from the password.' }
    $confirmation = $null
  } else {
    $random = New-Object byte[] 24
    $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($random) }
    finally { $generator.Dispose() }
    $newPassword = ([Convert]::ToBase64String($random)).TrimEnd('=').Replace('+','-').Replace('/','_') + 'aA1!'
  }
  if ($newPassword -eq $saved.password) { throw 'The new password matches the old password. Choose another.' }
  @{ project_ref = $projectRef; password = $newPassword } |
    ConvertTo-Json | Set-Content -LiteralPath $progressPath -Encoding utf8
}

$accountsToRotate = @($saved.accounts)
if ($saved.facility_account) { $accountsToRotate += $saved.facility_account }
foreach ($account in $accountsToRotate) {
  $uri = "$baseUri/auth/v1/admin/users/$($account.auth_user_id)"
  try {
    $updated = Invoke-RestMethod -Uri $uri -Method Put -Headers $headers `
      -UserAgent 'ClinzoDisposablePasswordRotation/1.0' -ContentType 'application/json' `
      -Body (@{ password = $newPassword } | ConvertTo-Json -Compress)
    if ($updated.id -ne $account.auth_user_id) { throw 'Auth returned an unexpected user ID.' }
    $session = Invoke-RestMethod -Uri "$baseUri/auth/v1/token?grant_type=password" `
      -Method Post -Headers $headers -UserAgent 'ClinzoDisposablePasswordRotation/1.0' `
      -ContentType 'application/json' `
      -Body (@{ email = $account.email; password = $newPassword } | ConvertTo-Json -Compress)
    if (-not $session.access_token) { throw 'Sign-in verification failed.' }
  } catch {
    throw "Rotation stopped at $($account.email). Rerun this script to resume with the same new password. $($_.Exception.Message)"
  }
  Write-Host "Password updated and sign-in verified: $($account.email)"
}

$saved.password = $newPassword
$saved | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $credentialPath -Encoding utf8
Remove-Item -LiteralPath $progressPath
Write-Host "All $($accountsToRotate.Count) disposable test-account passwords were rotated and verified."
Write-Host "New shared test password: $credentialPath (ignored by Git; keep private)."
$serviceKey = $null
$newPassword = $null
