param([switch]$KeyFromClipboard)

$ErrorActionPreference = "Stop"
$projectRef = "enjafragbcrrgaclwopd"
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../../..")).Path
$linkedRefPath = Join-Path $repoRoot "supabase/.temp/project-ref"
$credentialPath = Join-Path $repoRoot "supabase/.temp/disposable-test-accounts.json"

if ($env:TEST_PROJECT_REF -ne $projectRef) {
  throw "Set TEST_PROJECT_REF to $projectRef. No other project is allowed."
}
if (-not (Test-Path -LiteralPath $linkedRefPath) -or
    (Get-Content -LiteralPath $linkedRefPath -Raw).Trim() -eq $projectRef) {
  throw "The linked project must be present and different from the disposable project."
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
    catch { Write-Warning 'Could not clear the clipboard. Clear it manually after this command.' }
  }
} else {
  Read-PlainSecret "Disposable project's sb_secret_ key or legacy service_role key"
}
$serviceKey = $serviceKey.Trim()
if ($serviceKey -notmatch '^(sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$') {
  throw "Use the disposable project's sb_secret_ key (or legacy service_role key), copied without quotes or spaces. A publishable key will not work."
}
$baseUri = "https://$projectRef.supabase.co"
$adminHeaders = @{ apikey = $serviceKey }
if (-not $serviceKey.StartsWith("sb_secret_")) { $adminHeaders.Authorization = "Bearer $serviceKey" }

function Invoke-Api([string]$uri, [string]$method, [hashtable]$headers, $body = $null) {
  $request = @{ Uri = $uri; Method = $method; Headers = $headers;
    UserAgent = "ClinzoDisposableFixture/1.0"; ContentType = "application/json" }
  if ($null -ne $body) { $request.Body = $body | ConvertTo-Json -Depth 20 -Compress }
  try { return Invoke-RestMethod @request }
  catch { throw "Disposable fixture request failed at $method $($uri.Split('?')[0]): $($_.Exception.Message)" }
}

if (Test-Path -LiteralPath $credentialPath) {
  $saved = Get-Content -LiteralPath $credentialPath -Raw | ConvertFrom-Json
  if ($saved.project_ref -ne $projectRef -or $saved.password.Length -lt 16) {
    throw "Existing credential file is invalid; inspect it before rerunning."
  }
  $password = $saved.password
} else {
  $random = New-Object byte[] 24
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($random) }
  finally { $generator.Dispose() }
  $password = ([Convert]::ToBase64String($random)).TrimEnd('=').Replace('+','-').Replace('/','_') + "aA1!"
}

$accounts = @(
  @{ kind='patient'; number=1; name='Aarav Mehta'; age=31; gender='Male'; blood='O+' },
  @{ kind='patient'; number=2; name='Anika Rao'; age=27; gender='Female'; blood='B+' },
  @{ kind='patient'; number=3; name='Rohan Shah'; age=42; gender='Male'; blood='A+' },
  @{ kind='patient'; number=4; name='Meera Nair'; age=36; gender='Female'; blood='AB+' },
  @{ kind='patient'; number=5; name='Ishaan Kapoor'; age=54; gender='Male'; blood='O-' },
  @{ kind='doctor'; number=1; name='Dr Priya Sharma'; specialty='General Medicine'; languages=@('en','hi','kn'); started='2013-01-01' },
  @{ kind='doctor'; number=2; name='Dr Rajesh Kumar'; specialty='Cardiology'; languages=@('en','hi','ta'); started='2008-01-01' },
  @{ kind='doctor'; number=3; name='Dr Ananya Patel'; specialty='Dermatology'; languages=@('en','hi','gu'); started='2016-01-01' },
  @{ kind='doctor'; number=4; name='Dr Vikram Singh'; specialty='Orthopedics'; languages=@('en','hi','pa'); started='2011-01-01' },
  @{ kind='doctor'; number=5; name='Dr Sneha Iyer'; specialty='Pediatrics'; languages=@('en','ta','kn'); started='2018-01-01' },
  @{ kind='driver'; number=1; name='Suresh Gowda'; city='Bengaluru'; birth='1988-04-12' },
  @{ kind='driver'; number=2; name='Ramesh Yadav'; city='Bengaluru'; birth='1991-07-23' },
  @{ kind='driver'; number=3; name='Farhan Ali'; city='Bengaluru'; birth='1985-11-09' },
  @{ kind='driver'; number=4; name='Kiran Kumar'; city='Bengaluru'; birth='1994-01-18' },
  @{ kind='driver'; number=5; name='Manoj Reddy'; city='Bengaluru'; birth='1989-06-30' }
)

$existing = @()
for ($page = 1; $page -le 20; $page++) {
  $result = Invoke-Api "$baseUri/auth/v1/admin/users?page=$page&per_page=100" 'Get' $adminHeaders
  $existing += @($result.users)
  if (@($result.users).Count -lt 100) { break }
}

$output = @()
foreach ($account in $accounts) {
  $number = "{0:D2}" -f $account.number
  $email = "clinzo-$($account.kind)-$number@example.com"
  $offset = @{ patient=0; doctor=100; driver=200 }[$account.kind]
  $phone = "+1555012$('{0:D4}' -f ($offset + $account.number))"
  $user = $existing | Where-Object { $_.email -eq $email } | Select-Object -First 1
  $authBody = @{ email=$email; password=$password; phone=$phone; email_confirm=$true; phone_confirm=$true }
  if ($user) {
    $user = Invoke-Api "$baseUri/auth/v1/admin/users/$($user.id)" 'Put' $adminHeaders $authBody
  } else {
    $user = Invoke-Api "$baseUri/auth/v1/admin/users" 'Post' $adminHeaders $authBody
  }
  if (-not $user.id) { throw "Auth user creation failed for $email" }
  $session = Invoke-Api "$baseUri/auth/v1/token?grant_type=password" 'Post' $adminHeaders @{ email=$email; password=$password }
  if (-not $session.access_token) { throw "Sign-in verification failed for $email" }
  $userHeaders = @{ apikey=$serviceKey; Authorization="Bearer $($session.access_token)" }
  if ($account.kind -eq 'patient') {
    $profile = @{ full_name=$account.name; age_years=$account.age; gender=$account.gender;
      blood_group=$account.blood; email=$email;
      address=@{ building="Test Residence $number"; line1="MG Road"; city="Bengaluru";
        state="Karnataka"; pincode="560001" } }
    $result = Invoke-Api "$baseUri/rest/v1/rpc/complete_patient_profile" 'Post' $userHeaders @{ p_profile=$profile }
    if (-not $result.patient_id) { throw "Patient profile missing for $email" }
  } elseif ($account.kind -eq 'doctor') {
    $details = @{ full_name=$account.name; registration_authority="Karnataka Medical Council";
      registration_number="TEST-KMC-$number"; practice_started_on=$account.started;
      clinic_name="$($account.name) Test Clinic"; address="MG Road, Bengaluru, Karnataka 560001";
      latitude=12.9750; longitude=77.6050 }
    $result = Invoke-Api "$baseUri/rest/v1/rpc/complete_onboarding" 'Post' $userHeaders @{ p_kind='solo_doctor'; p_details=$details }
    $doctorProfile = Invoke-Api "$baseUri/rest/v1/rpc/get_my_doctor_profile" 'Post' $userHeaders @{}
    $ownedClinic = @($doctorProfile.facilities | Where-Object { $_.facility_kind -eq 'clinic' -and $_.facility_name -eq $details.clinic_name })
    if ($ownedClinic.Count -ne 1) { throw "Could not identify the test clinic for $email" }
    [void](Invoke-Api "$baseUri/rest/v1/rpc/update_my_owned_clinic_location" 'Post' $userHeaders @{
      p_facility_id=$ownedClinic[0].facility_id
      p_location=@{ name=$details.clinic_name; address=$details.address;
        locality='MG Road'; city='Bengaluru'; state='Karnataka'; pincode='560001';
        latitude=$details.latitude; longitude=$details.longitude }
    })
    [void](Invoke-Api "$baseUri/rest/v1/rpc/update_my_doctor_profile" 'Post' $userHeaders @{
      p_full_name=$account.name; p_bio="Test physician in $($account.specialty). Development fixture only.";
      p_languages=$account.languages })
    if (-not $result.doctor.id) { throw "Doctor profile missing for $email" }
  } else {
    $application = Invoke-Api "$baseUri/rest/v1/rpc/get_my_driver_registration_application" 'Post' $userHeaders @{}
    if (-not $application -or $application.status -in @('details_saved','rejected')) {
      $application = Invoke-Api "$baseUri/rest/v1/rpc/save_my_driver_registration_details" 'Post' $userHeaders @{
        p_details=@{ full_name=$account.name; date_of_birth=$account.birth;
          city=$account.city; contact_phone=$phone; consent=$true } }
    }
    if (-not $application.id -or $application.status -notin @('details_saved','submitted','approved')) {
      throw "Driver registration application missing for $email"
    }
  }
  $output += @{ role=$account.kind; email=$email; phone=$phone; auth_user_id=$user.id }
  Write-Host "Prepared $($account.kind) ${number}: $email"
}

New-Item -ItemType Directory -Force -Path (Split-Path $credentialPath) | Out-Null
@{ project_ref=$projectRef; password=$password; accounts=$output } |
  ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $credentialPath -Encoding utf8
Write-Host "15 verified Auth accounts, patient/doctor profiles, and driver registration applications are available in the disposable project."
Write-Host "Credentials: $credentialPath (ignored by Git; keep private)."
Write-Host "Doctor credential review, clinical services/slots, and driver document/vehicle review are separate required fixture steps."
$serviceKey = $null
$password = $null
