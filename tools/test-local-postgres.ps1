# Windows command-boundary regressions: fake executables, no Docker/data mutations.
$ErrorActionPreference = 'Stop'
$qfRoot = Split-Path -Parent $PSScriptRoot
$qfHelperSource = Join-Path $PSScriptRoot 'local-postgres.ps1'
$qfCallerLocation = Get-Location
$qfMockRoot = Join-Path $qfRoot ('work/postgres-script-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $qfMockRoot -Force | Out-Null
# Copy the exact helper into an isolated mock checkout; no installed dependencies or Docker are required.
$qfMockProject = Join-Path $qfMockRoot 'project'
New-Item -ItemType Directory -Path (Join-Path $qfMockProject 'tools'),(Join-Path $qfMockProject 'node_modules/tsx/dist') -Force | Out-Null
$qfHelper = Join-Path $qfMockProject 'tools/local-postgres.ps1'
Copy-Item -LiteralPath $qfHelperSource -Destination $qfHelper
Set-Content -LiteralPath (Join-Path $qfMockProject 'node_modules/tsx/dist/cli.mjs') -Value '// Fake node never executes this placeholder.' -Encoding ASCII
Set-Content -LiteralPath (Join-Path $qfMockProject 'compose.yaml') -Value '# Fake Docker never opens this placeholder.' -Encoding ASCII
Set-Content -LiteralPath (Join-Path $qfMockProject '.env.example') -Value '# Isolated test placeholder.' -Encoding ASCII
$qfVariables = @('PATH','APP_ENV','IDENTITY_ADAPTER','DATABASE_ADAPTER','DATABASE_URL','DATABASE_PATH','HOST','PORT',
  'APP_ORIGIN','LOCAL_ACCOUNT_HELPER','ADVICE_PROVIDER','TEST_DATABASE_URL','DOCKER_CONTEXT','DOCKER_HOST',
  'COMPOSE_FILE','COMPOSE_PROJECT_NAME','QF_TEST_LOG','QF_TEST_NODE_VERSION','QF_TEST_NODE_FAILURE','QF_TEST_REMOTE')
$qfPrevious = @{}
foreach ($qfKey in $qfVariables) { $qfPrevious[$qfKey] = [Environment]::GetEnvironmentVariable($qfKey,'Process') }
function Assert-Qf([bool]$Condition,[string]$Message) { if (-not $Condition) { throw $Message } }
function Expect-QfFailure([scriptblock]$Call,[string]$Message) {
  $qfFailed = $false
  try { & $Call } catch {
    $qfFailed = $true
    Assert-Qf ($_.Exception.Message.Contains($Message)) ('Unexpected failure: ' + $_.Exception.Message)
  }
  Assert-Qf $qfFailed ('Expected failure: ' + $Message)
}
try {
  @'
@echo off
echo docker^|%*>>"%QF_TEST_LOG%"
if "%~3"=="context" (
  if "%QF_TEST_REMOTE%"=="1" (echo ssh://unrelated.invalid) else (echo npipe:////./pipe/dockerDesktopLinuxEngine)
  exit /b 0
)
echo quotefix_test
exit /b 0
'@ | Set-Content -LiteralPath (Join-Path $qfMockRoot 'docker.cmd') -Encoding ASCII
  @'
@echo off
if "%~1"=="--version" (echo %QF_TEST_NODE_VERSION%&exit /b 0)
echo node^|%APP_ENV%^|%DATABASE_ADAPTER%^|%DATABASE_URL%^|%DATABASE_PATH%^|%LOCAL_ACCOUNT_HELPER%^|%APP_ORIGIN%^|%*>>"%QF_TEST_LOG%"
if "%QF_TEST_NODE_FAILURE%"=="1" exit /b 17
exit /b 0
'@ | Set-Content -LiteralPath (Join-Path $qfMockRoot 'node.cmd') -Encoding ASCII
  $env:PATH = $qfMockRoot + ';' + $env:PATH
  $env:QF_TEST_LOG = Join-Path $qfMockRoot 'commands.log'
  $env:QF_TEST_NODE_VERSION = 'v24.7.0'
  $env:DOCKER_CONTEXT = 'unrelated-context'
  $env:DOCKER_HOST = 'tcp://unrelated.invalid:2375'
  $env:COMPOSE_FILE = 'unrelated-missing-compose.yaml'
  $env:COMPOSE_PROJECT_NAME = 'unrelated-project'
  $env:APP_ENV = 'sentinel-environment'
  $env:DATABASE_URL = 'sentinel-database'
  $env:APP_ORIGIN = 'sentinel-origin'
  Set-Location $qfMockRoot
  $qfExpected = @{}
  foreach ($qfKey in $qfVariables) { $qfExpected[$qfKey] = [Environment]::GetEnvironmentVariable($qfKey,'Process') }
  & $qfHelper setup *> (Join-Path $qfMockRoot 'setup.log')
  $qfCommands = Get-Content -LiteralPath $env:QF_TEST_LOG -Raw
  Assert-Qf ($qfCommands.Contains('--context desktop-linux compose --file')) 'Docker context/file are not explicit'
  Assert-Qf ($qfCommands.Contains('--project-name qfwebapp')) 'Existing volume project is not pinned'
  Assert-Qf ($qfCommands.Contains('--env-file')) 'Compose is inheriting the operational .env'
  Assert-Qf ($qfCommands.Contains('node|development|postgres|postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_development|work/postgres-development|true|http://localhost:3001|')) 'Development scope or cookie hostname is incorrect'
  foreach ($qfKey in $qfVariables) {
    Assert-Qf ([Environment]::GetEnvironmentVariable($qfKey,'Process') -ceq $qfExpected[$qfKey]) ('Environment leaked after success: ' + $qfKey)
  }
  Assert-Qf ((Get-Location).Path -eq $qfMockRoot) 'Caller location changed'
  Write-Output 'PASS: explicit Docker/Compose target and development isolation; success restores caller state'
  & $qfHelper test *> (Join-Path $qfMockRoot 'test.log')
  $qfCommands = Get-Content -LiteralPath $env:QF_TEST_LOG -Raw
  Assert-Qf ($qfCommands.Contains('node|test|postgres|postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_test|memory://|false|')) 'Test defaults can target development'
  Assert-Qf ($qfCommands.Contains('--test-concurrency=2')) 'Local default concurrency is not bounded to two files'
  Write-Output 'PASS: every default test setting targets the isolated test environment'
  $env:QF_TEST_NODE_FAILURE = '1'
  Expect-QfFailure { & $qfHelper dev *> (Join-Path $qfMockRoot 'failure.log') } 'migration/fictional seed failed'
  foreach ($qfKey in @('APP_ENV','IDENTITY_ADAPTER','DATABASE_ADAPTER','DATABASE_URL','DATABASE_PATH','HOST','PORT',
    'APP_ORIGIN','LOCAL_ACCOUNT_HELPER','ADVICE_PROVIDER','TEST_DATABASE_URL','PATH')) {
    Assert-Qf ([Environment]::GetEnvironmentVariable($qfKey,'Process') -ceq $qfExpected[$qfKey]) ('Environment leaked after failure: ' + $qfKey)
  }
  Assert-Qf ((Get-Location).Path -eq $qfMockRoot) 'Caller location changed after failure'
  Assert-Qf (-not (Get-Content -LiteralPath $env:QF_TEST_LOG -Raw).Contains('apps/api/src/main.ts')) 'Server started after seed failure'
  Write-Output 'PASS: failed setup restores caller state and never starts the server'
  $env:QF_TEST_NODE_FAILURE = '0'
  $qfBeforeUp = @(Select-String -LiteralPath $env:QF_TEST_LOG -Pattern ' up ').Count
  $env:QF_TEST_NODE_VERSION = 'v20.0.0'
  Expect-QfFailure { & $qfHelper setup *> (Join-Path $qfMockRoot 'node-version.log') } 'requires >=24 <25'
  Assert-Qf (@(Select-String -LiteralPath $env:QF_TEST_LOG -Pattern ' up ').Count -eq $qfBeforeUp) 'Unsupported Node changed containers'
  Write-Output 'PASS: unsupported Node is rejected before container mutation'
  $env:QF_TEST_NODE_VERSION = 'v24.7.0'
  $env:QF_TEST_REMOTE = '1'
  Expect-QfFailure { & $qfHelper setup *> (Join-Path $qfMockRoot 'remote.log') } 'must target the local Docker Desktop'
  Assert-Qf (@(Select-String -LiteralPath $env:QF_TEST_LOG -Pattern ' up ').Count -eq $qfBeforeUp) 'A remote context changed containers'
  Write-Output 'PASS: a remote endpoint under the expected context name is refused'
  $env:QF_TEST_REMOTE = '0'
  & $qfHelper status *> (Join-Path $qfMockRoot 'status.log')
  Assert-Qf ($env:APP_ENV -ceq $qfExpected.APP_ENV) 'Status changed application environment'
  Write-Output 'PASS: status is read-only and leaves application settings intact'
  & $qfHelper backup *> (Join-Path $qfMockRoot 'backup.log')
  Assert-Qf ((Get-Content -LiteralPath $env:QF_TEST_LOG -Raw).Contains('tools/postgres-backup.ts')) 'Backup did not invoke the verifier'
  Assert-Qf (@(Select-String -LiteralPath $env:QF_TEST_LOG -Pattern ' up ').Count -eq $qfBeforeUp) 'Backup started or seeded a database'
  Write-Output 'PASS: backup invokes verification without starting or seeding a database'
  & $qfHelper stop *> (Join-Path $qfMockRoot 'stop.log')
  Assert-Qf ((Get-Content -LiteralPath $env:QF_TEST_LOG -Raw).Contains(' stop postgres')) 'Stop is not scoped to the PostgreSQL service'
  Assert-Qf ($env:DATABASE_URL -ceq $qfExpected.DATABASE_URL) 'Stop changed database settings'
  Write-Output 'PASS: stop uses the same explicit local project and preserves caller settings'
} finally {
  foreach ($qfKey in $qfVariables) { [Environment]::SetEnvironmentVariable($qfKey,$qfPrevious[$qfKey],'Process') }
  Set-Location $qfCallerLocation
}
