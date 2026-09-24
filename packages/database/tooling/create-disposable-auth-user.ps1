param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("patient", "doctor", "driver")]
  [string]$Kind
)

$ErrorActionPreference = "Stop"
$testRef = $env:TEST_PROJECT_REF
$expectedRef = "enjafragbcrrgaclwopd"
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../../..")).Path
$linkedRefPath = Join-Path $repoRoot "supabase/.temp/project-ref"

if ($testRef -ne $expectedRef) {
  throw "Set TEST_PROJECT_REF to the Clinzo disposable project ($expectedRef). Refusing to create a user elsewhere."
}
if (-not (Test-Path -LiteralPath $linkedRefPath)) {
  throw "The linked-project marker is missing; cannot prove the disposable project is separate."
}
$linkedRef = (Get-Content -LiteralPath $linkedRefPath -Raw).Trim()
if ($testRef -eq $linkedRef) {
  throw "The selected project is linked as the primary project. Refusing to create a test user."
}

$email = (Read-Host "$Kind test email").Trim()
$phone = (Read-Host "$Kind test phone in international format (+countrycode...)").Trim()
if ($email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
  throw "Enter a valid test email address."
}
if ($phone -notmatch '^\+[1-9][0-9]{7,14}$') {
  throw "Enter an international phone number beginning with +."
}

function Read-PlainSecret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $secure.Dispose()
  }
}

$password = Read-PlainSecret "Test account password (12 or more characters)"
if ($password.Length -lt 12) {
  throw "Use a test password of at least 12 characters."
}
$serviceKey = (Read-PlainSecret "Disposable project's secret key (sb_secret_...) or legacy service_role key").Trim()
if ($serviceKey.Length -lt 20) {
  throw "The secret-key paste was too short. Copy the full key, then paste it at the hidden prompt; PowerShell may display only one * for a full paste."
}
if ($serviceKey.StartsWith("sb_publishable_") -or $serviceKey -notmatch '^(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$') {
  throw "The pasted value is not a Supabase secret key. In the disposable project's Settings > API Keys, copy an sb_secret_ key (or legacy service_role key), not the publishable key."
}

try {
  $payload = @{
    email = $email
    password = $password
    phone = $phone
    email_confirm = $true
    phone_confirm = $true
  } | ConvertTo-Json -Compress
  $headers = @{ apikey = $serviceKey }
  if (-not $serviceKey.StartsWith("sb_secret_")) {
    $headers.Authorization = "Bearer $serviceKey"
  }
  $request = @{
    Uri = "https://$testRef.supabase.co/auth/v1/admin/users"
    Method = "Post"
    ContentType = "application/json"
    # Windows PowerShell defaults to a Mozilla User-Agent, which Supabase treats as a browser.
    UserAgent = "ClinzoDisposableAuthFixture/1.0"
    Headers = $headers
    Body = $payload
  }
  $response = Invoke-RestMethod @request
  if (-not $response.id) { throw "Supabase did not return a user ID." }
  if (-not $response.email_confirmed_at -or -not $response.phone_confirmed_at) {
    throw "Supabase created user $($response.id), but did not report both confirmations. Check Auth → Users before signing in."
  }
  Write-Host "$Kind test user created in disposable project: $($response.id)"
  Write-Host "Sign in with this email and password in the matching mobile app, then complete onboarding."
} finally {
  $password = $null
  $serviceKey = $null
  $payload = $null
  $request = $null
  $headers = $null
}
