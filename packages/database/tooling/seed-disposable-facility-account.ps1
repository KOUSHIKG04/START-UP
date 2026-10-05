param([switch]$KeyFromClipboard)

$ErrorActionPreference = 'Stop'
$projectRef = 'enjafragbcrrgaclwopd'
$email = 'clinzo-facility-01@example.com'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$linkedRefPath = Join-Path $repoRoot 'supabase/.temp/project-ref'
$credentialPath = Join-Path $repoRoot 'supabase/.temp/disposable-test-accounts.json'

if ($env:TEST_PROJECT_REF -ne $projectRef) {
  throw "Set TEST_PROJECT_REF to $projectRef. No other project is allowed."
}
if (-not (Test-Path -LiteralPath $linkedRefPath) -or
    (Get-Content -LiteralPath $linkedRefPath -Raw).Trim() -eq $projectRef) {
  throw 'The linked project must be present and different from the disposable project.'
}
if (-not (Test-Path -LiteralPath $credentialPath)) {
  throw 'The disposable credentials file is missing. Seed the mobile test accounts first.'
}
$saved = Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json
if ($saved.project_ref -ne $projectRef -or $saved.password.Length -lt 8 -or
    @($saved.accounts).Count -ne 15) {
  throw 'The disposable credentials file has an unexpected project or account set.'
}
if ($saved.facility_account -and $saved.facility_account.email -ne $email) {
  throw 'A different facility account is already recorded. Inspect the credential file before proceeding.'
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
  throw 'Use only the disposable project secret key, not a publishable key.'
}

$baseUri = "https://$projectRef.supabase.co"
$headers = @{ apikey = $serviceKey }
if (-not $serviceKey.StartsWith('sb_secret_')) { $headers.Authorization = "Bearer $serviceKey" }

function Invoke-Admin([string]$uri, [string]$method, $body = $null) {
  $request = @{ Uri = $uri; Method = $method; Headers = $headers;
    UserAgent = 'ClinzoDisposableFacilityFixture/1.0'; ContentType = 'application/json' }
  if ($null -ne $body) { $request.Body = $body | ConvertTo-Json -Depth 8 -Compress }
  return Invoke-RestMethod @request
}

try {
  $user = $null
  for ($page = 1; $page -le 20; $page++) {
    $result = Invoke-Admin "$baseUri/auth/v1/admin/users?page=$page&per_page=100" 'Get'
    $user = @($result.users) | Where-Object { $_.email -eq $email } | Select-Object -First 1
    if ($user -or @($result.users).Count -lt 100) { break }
  }
  $wasExisting = $null -ne $user

  $body = @{ email = $email; password = $saved.password; email_confirm = $true }
  if ($user) {
    $user = Invoke-Admin "$baseUri/auth/v1/admin/users/$($user.id)" 'Put' $body
  } else {
    $user = Invoke-Admin "$baseUri/auth/v1/admin/users" 'Post' $body
  }
  if (-not $user.id -or -not $user.email_confirmed_at) {
    throw 'Auth did not confirm the facility test account.'
  }

  $session = Invoke-Admin "$baseUri/auth/v1/token?grant_type=password" 'Post' @{
    email = $email; password = $saved.password
  }
  if (-not $session.access_token) { throw 'Facility test sign-in verification failed.' }

  $saved | Add-Member -NotePropertyName facility_account -NotePropertyValue @{
    role = 'facility'; email = $email; auth_user_id = $user.id
  } -Force
  $saved | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $credentialPath -Encoding utf8

  Write-Host "Facility test account ready in disposable project $projectRef`: $email"
  if ($wasExisting) {
    Write-Host 'Existing Auth account reused. Its prior facility registration, if any, was preserved.'
  } else {
    Write-Host 'No facility is attached yet; sign-in opens facility registration.'
  }
  Write-Host "Password: use the shared password in $credentialPath (ignored by Git)."
} finally {
  $serviceKey = $null
  $headers = $null
  $body = $null
  $session = $null
}
