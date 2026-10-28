param([switch]$Linked, [switch]$DeployedSchema)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$schemaFiles = @(
  'supabase/migrations/20261024061251_appointment_razorpay_billing.sql',
  'supabase/migrations/20261024075732_marketplace_commissions_and_route.sql',
  'supabase/migrations/20261024111551_fix_ambulance_payment_worker_aliases.sql',
  'supabase/migrations/20261026140139_pay_before_auto_confirmation.sql',
  'supabase/migrations/20261026150042_home_visit_booking_payment.sql'
)
$fixtureFiles = @(
  'supabase/tests/smoke/appointment-payments.cli-smoke.sql',
  'supabase/tests/smoke/ambulance.cli-smoke.sql',
  'supabase/tests/smoke/marketplace-payments.cli-smoke.sql',
  'supabase/tests/smoke/pay-before-booking.cli-smoke.sql',
  'supabase/tests/smoke/home-visit-booking.cli-smoke.sql'
)
$parts = @('BEGIN;', "SET LOCAL lock_timeout = '10s';", "SET LOCAL statement_timeout = '90s';")
if (-not $DeployedSchema) {
  foreach ($file in $schemaFiles) {
    $parts += Get-Content -LiteralPath (Join-Path $repoRoot $file) -Raw
  }
} else {
  # The fixture starts with billing disabled, even on an activated backend.
  # These test-only settings and the fixture's later edits roll back together.
  $parts += 'UPDATE clinzo.appointment_billing_config SET enabled=false WHERE singleton;'
}
foreach ($file in $fixtureFiles) {
  $source = Get-Content -LiteralPath (Join-Path $repoRoot $file) -Raw
  $parts += [regex]::Replace($source, '(?m)^\s*(BEGIN|ROLLBACK);\s*$', '')
}
$parts += 'ROLLBACK;'
$verifyFile = Join-Path $env:TEMP ('startup-marketplace-' + [guid]::NewGuid().ToString() + '.sql')
try {
  Set-Content -LiteralPath $verifyFile -Value ($parts -join "`n") -Encoding utf8
  Push-Location -LiteralPath $repoRoot
  try {
    # Explicit --linked opt-in; default is a local development database. The
    # transaction always rolls back, including all Auth and finance fixture rows.
    if ($Linked) { & pnpm supabase db query --linked --file $verifyFile }
    else { & pnpm supabase db query --local --file $verifyFile }
    if ($LASTEXITCODE -ne 0) { throw 'Marketplace payment rollback checks failed.' }
  } finally { Pop-Location }
} finally {
  Remove-Item -LiteralPath $verifyFile -ErrorAction SilentlyContinue
}
