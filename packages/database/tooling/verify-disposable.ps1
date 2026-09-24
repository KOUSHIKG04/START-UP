param(
  [switch]$Apply,
  [switch]$UseCli,
  [string]$PoolerHost
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "../../..")).Path
$linkedRefPath = Join-Path $repoRoot "supabase/.temp/project-ref"
$supabaseCli = Join-Path $repoRoot "node_modules/.bin/supabase.ps1"
$testRef = $env:TEST_PROJECT_REF
$databaseUrl = $env:TEST_DATABASE_URL

if ([string]::IsNullOrWhiteSpace($testRef) -or $testRef -notmatch '^[a-z0-9]{20}$') {
  throw "TEST_PROJECT_REF needs the real 20-character ref from a new disposable Supabase project. Replace the YOUR_DISPOSABLE_PROJECT_REF placeholder before running this script."
}
if (-not (Test-Path -LiteralPath $linkedRefPath)) {
  throw "The linked-project marker is missing; cannot prove the disposable project is separate."
}
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw "Install the repository dependencies with pnpm install first."
}
$linkedRef = (Get-Content -LiteralPath $linkedRefPath -Raw).Trim()
if ($testRef -eq $linkedRef) {
  throw "TEST_PROJECT_REF matches the linked project. Refusing to run database tests or migrations."
}
if ($UseCli) {
  if ($PoolerHost -or $databaseUrl) {
    throw "UseCli uses the Supabase login role. Do not also pass PoolerHost or TEST_DATABASE_URL."
  }
  Push-Location -LiteralPath $repoRoot
  try {
    Write-Host "Disposable project: $testRef (linked project: $linkedRef)"
    & $supabaseCli migration list --project-ref $testRef
    if ($LASTEXITCODE -ne 0) { throw "Could not read disposable migration history through the Supabase CLI." }

    & $supabaseCli db push --project-ref $testRef --dry-run --skip-vault
    if ($LASTEXITCODE -ne 0) { throw "Disposable migration dry run failed." }
    if (-not $Apply) {
      Write-Host "Dry run only. Rerun with -UseCli -Apply to apply migrations and run the rollback smoke test."
      return
    }

    & $supabaseCli db push --project-ref $testRef --skip-vault --yes
    if ($LASTEXITCODE -ne 0) { throw "Disposable migration push failed. No tests were run." }
    $smokeTests = @(
      @{ Name = "Clinic"; File = "clinic.cli-smoke.sql"; Result = "clinic_smoke_passed" },
      @{ Name = "Inventory"; File = "inventory.cli-smoke.sql"; Result = "inventory_smoke_passed" },
      @{ Name = "Ambulance"; File = "ambulance.cli-smoke.sql"; Result = "ambulance_smoke_passed" }
    )
    foreach ($smoke in $smokeTests) {
      $smokeSql = Join-Path $repoRoot "packages/database/tests/$($smoke.File)"
      # This CLI requires --linked together with --project-ref; the explicit ref
      # overrides the linked default. The guard above rejects that default ref.
      $queryOutput = & $supabaseCli db query --linked --project-ref $testRef --file $smokeSql --output-format json --agent no
      if ($LASTEXITCODE -ne 0) {
        Write-Host ($queryOutput -join "`n")
        throw "$($smoke.Name) smoke test failed."
      }
      $queryJson = $queryOutput -join "`n"
      try { $queryResult = ConvertFrom-Json -InputObject $queryJson -NoEnumerate } catch {
        throw "Could not parse the $($smoke.Name) smoke test result."
      }
      $queryRows = if ($queryResult -is [array]) { $queryResult } elseif ($null -ne $queryResult.rows) {
        $queryResult.rows
      } else { @($queryResult) }
      $resultField = $smoke.Result
      if ($queryRows.Count -ne 1 -or $queryRows[0].$resultField -ne $true) {
        throw "$($smoke.Name) smoke test did not report success."
      }
      Write-Host "$($smoke.Name) smoke test passed; fixture transaction rolled back."
    }
    return
  } finally {
    Pop-Location
  }
}
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  if ([string]::IsNullOrWhiteSpace($PoolerHost)) {
    $dbHost = "db.$testRef.supabase.co"
    $dbUser = "postgres"
  } else {
    $dbHost = $PoolerHost.Trim().ToLowerInvariant()
    if ($dbHost -match '^\d+$') {
      throw "PoolerHost is a port number. In Read-Host, the text in quotes is only the prompt; paste the Session pooler hostname as the answer."
    }
    if ($dbHost -eq "db.$testRef.supabase.co") {
      throw "That is the Direct host. In Supabase Connect, switch the connection method to Session pooler and copy its host ending in .pooler.supabase.com."
    }
    if ($dbHost -notmatch '^[a-z0-9.-]+\.pooler\.supabase\.com$') {
      throw "PoolerHost must be only the Session pooler hostname from Supabase Connect, without a scheme, port, path or password."
    }
    $dbUser = "postgres.$testRef"
  }
  $secretPassword = Read-Host "Database password" -AsSecureString
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretPassword)
  try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ([string]::IsNullOrEmpty($password)) { throw "Database password cannot be empty." }
    $databaseUrl = "postgresql://${dbUser}:$([Uri]::EscapeDataString($password))@${dbHost}:5432/postgres"
  } finally {
    $password = $null
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
}
$databaseUrl = $databaseUrl.Trim()
if ($databaseUrl.Contains('\@')) {
  throw "Remove the backslash before @ in the connection string. Paste the URL itself, not Markdown-escaped text."
}
if ($databaseUrl.StartsWith('"') -or $databaseUrl.EndsWith('"') -or $databaseUrl.StartsWith("'")) {
  throw "Paste the connection string without surrounding quotes."
}

try {
  $uri = [Uri]$databaseUrl
  if (-not $uri.IsAbsoluteUri) { throw "relative URI" }
} catch {
  throw "The pasted value is not a valid PostgreSQL URL. Check for extra characters or an unencoded special character in the password."
}
$dbUser = [Uri]::UnescapeDataString(($uri.UserInfo -split ':', 2)[0])
$direct = $uri.Host -eq "db.$testRef.supabase.co" -and $dbUser -eq "postgres"
$pooler = $uri.Host -like "*.pooler.supabase.com" -and $dbUser -eq "postgres.$testRef"
if ($uri.Scheme -notin @("postgres", "postgresql")) {
  throw "The connection string must start with postgresql:// or postgres://."
}
if ($uri.Port -ne 5432 -or $uri.AbsolutePath -ne "/postgres") {
  throw "Choose the Direct or Session pooler connection on port 5432 for database postgres."
}
if (-not ($direct -or $pooler)) {
  throw "The connection host or username does not match TEST_PROJECT_REF. Direct requires db.<ref>.supabase.co with user postgres; Session pooler requires a *.pooler.supabase.com host with user postgres.<ref>."
}

Push-Location -LiteralPath $repoRoot
try {
  Write-Host "Disposable project: $testRef (linked project: $linkedRef)"
  # Calling the local binary directly avoids pnpm echoing the credential URL.
  & $supabaseCli migration list --db-url $databaseUrl
  if ($LASTEXITCODE -ne 0) {
    if ($direct) {
      throw "Could not reach the direct database endpoint. If your network has no IPv6 database access, copy only the Session pooler hostname from Supabase Connect and rerun with -PoolerHost HOSTNAME. No migrations were applied."
    }
    throw "Could not read disposable migration history through the Session pooler. No migrations were applied."
  }

  & $supabaseCli db push --db-url $databaseUrl --dry-run --skip-vault
  if ($LASTEXITCODE -ne 0) { throw "Disposable migration dry run failed." }

  if (-not $Apply) {
    Write-Host "Dry run only. Review the migration list, then rerun this script with -Apply."
    return
  }

  & $supabaseCli db push --db-url $databaseUrl --skip-vault --yes
  if ($LASTEXITCODE -ne 0) { throw "Disposable migration push failed. No tests were run." }

  $previousUrl = $env:TEST_DATABASE_URL
  $previousOptIn = $env:ALLOW_DATABASE_TESTS
  $env:TEST_DATABASE_URL = $databaseUrl
  $env:ALLOW_DATABASE_TESTS = "I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE"
  try {
    & pnpm --filter @startup/database test:database
    if ($LASTEXITCODE -ne 0) { throw "Database integration tests failed." }
  } finally {
    $env:TEST_DATABASE_URL = $previousUrl
    $env:ALLOW_DATABASE_TESTS = $previousOptIn
  }
} finally {
  Pop-Location
}
