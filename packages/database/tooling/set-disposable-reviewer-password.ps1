param([switch]$KeyFromClipboard)

$ErrorActionPreference = 'Stop'
$projectRef = 'enjafragbcrrgaclwopd'
$reviewerEmail = 'clinzoadmin@example.com'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$linkedRefPath = Join-Path $repoRoot 'supabase/.temp/project-ref'

if ($env:TEST_PROJECT_REF -ne $projectRef) {
  throw "Set TEST_PROJECT_REF to $projectRef. No other project is allowed."
}
if (-not (Test-Path -LiteralPath $linkedRefPath) -or
    (Get-Content -LiteralPath $linkedRefPath -Raw).Trim() -eq $projectRef) {
  throw 'Cannot prove this is separate from the linked project.'
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

$baseUri = "https://$projectRef.supabase.co"
$headers = @{ apikey = $serviceKey }
if (-not $serviceKey.StartsWith('sb_secret_')) { $headers.Authorization = "Bearer $serviceKey" }

try {
  $userPage = Invoke-RestMethod -Uri "$baseUri/auth/v1/admin/users?page=1&per_page=1000" `
    -Method Get -Headers $headers -UserAgent 'ClinzoDisposableReviewerPassword/1.0'
  $matches = @($userPage.users | Where-Object { $_.email -ieq $reviewerEmail })
  if ($matches.Count -ne 1 -or -not $matches[0].email_confirmed_at) {
    throw "$reviewerEmail must exist as one confirmed Auth user in the disposable project. No password was changed."
  }

  $newPassword = Read-PlainSecret 'New reviewer password (at least 8 characters)'
  $confirmation = Read-PlainSecret 'Enter the new reviewer password again'
  if ($newPassword.Length -lt 8 -or $newPassword -ne $confirmation -or
      $newPassword -ne $newPassword.Trim()) {
    throw 'Passwords must match, contain at least 8 characters, and have no leading or trailing spaces.'
  }
  $confirmation = $null

  $userId = [string]$matches[0].id
  $updated = Invoke-RestMethod -Uri "$baseUri/auth/v1/admin/users/$userId" `
    -Method Put -Headers $headers -UserAgent 'ClinzoDisposableReviewerPassword/1.0' `
    -ContentType 'application/json' -Body (@{ password = $newPassword } | ConvertTo-Json -Compress)
  if ($updated.id -ne $userId) { throw 'Auth returned an unexpected user ID.' }
  $session = Invoke-RestMethod -Uri "$baseUri/auth/v1/token?grant_type=password" `
    -Method Post -Headers $headers -UserAgent 'ClinzoDisposableReviewerPassword/1.0' `
    -ContentType 'application/json' `
    -Body (@{ email = $reviewerEmail; password = $newPassword } | ConvertTo-Json -Compress)
  if (-not $session.access_token) { throw 'Password changed, but sign-in verification failed.' }
  Write-Host "Password changed and sign-in verified for $reviewerEmail in disposable project $projectRef."
} finally {
  $serviceKey = $null
  $newPassword = $null
  $confirmation = $null
  $headers = $null
}
