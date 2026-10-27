param(
  [ValidateSet('setup','start','test','dev','status','stop','backup','drill')][string]$Action = 'setup',
  [ValidateRange(1,4)][int]$TestConcurrency = 2,
  [switch]$Prototype
)
$ErrorActionPreference = 'Stop'
if ($Prototype -and $Action -ne 'backup') { throw '-Prototype selects the current .env database for backup only.' }
$qfOriginalLocation = Get-Location
$qfOriginalPath = $env:PATH
$qfSavedEnvironment = @{}
$qfEnvironment = @{
  APP_ENV = 'development'; IDENTITY_ADAPTER = 'local'; DATABASE_ADAPTER = 'postgres'
  DATABASE_URL = 'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_development'
  DATABASE_PATH = 'work/postgres-development'; HOST = '127.0.0.1'; PORT = '3001'
  APP_ORIGIN = 'http://localhost:3001'; LOCAL_ACCOUNT_HELPER = 'true'; ADVICE_PROVIDER = 'local'
  TEST_DATABASE_URL = 'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_test'
}
if ($Action -eq 'test') {
  $qfEnvironment.APP_ENV = 'test'
  $qfEnvironment.DATABASE_URL = $qfEnvironment.TEST_DATABASE_URL
  $qfEnvironment.DATABASE_PATH = 'memory://'
  $qfEnvironment.LOCAL_ACCOUNT_HELPER = 'false'
}
try {
  Set-Location (Split-Path -Parent $PSScriptRoot)
  $qfDocker = Get-Command docker -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $qfDocker) {
    foreach ($qfDockerDirectory in @("$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin", "$env:ProgramFiles/Docker/Docker/resources/bin")) {
      if (Test-Path -LiteralPath "$qfDockerDirectory/docker.exe") {
        $env:PATH = "$qfDockerDirectory;" + $env:PATH
        $qfDocker = Get-Command docker -CommandType Application | Select-Object -First 1
        break
      }
    }
  }
  if (-not $qfDocker) { throw 'Install Docker Desktop and start its Linux engine first.' }
  $qfEndpoint = & $qfDocker.Source --context desktop-linux context inspect desktop-linux --format '{{.Endpoints.docker.Host}}'
  if ($LASTEXITCODE -ne 0 -or $qfEndpoint -ne 'npipe:////./pipe/dockerDesktopLinuxEngine') {
    throw 'The desktop-linux context must target the local Docker Desktop Linux named pipe. No container changes were attempted.'
  }
  # Explicit arguments override inherited Compose files/project names and Docker hosts/contexts.
  # Retain qfwebapp so the already-created volume is reused, even from a differently named checkout.
  $qfCompose = @('--context','desktop-linux','compose','--file',(Join-Path (Get-Location) 'compose.yaml'),
    '--project-name','qfwebapp','--project-directory',(Get-Location).Path,'--env-file',(Join-Path (Get-Location) '.env.example'))
  function Invoke-QfDocker {
    param([string[]]$Arguments)
    & $qfDocker.Source @qfCompose @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Docker command failed. Check Docker Desktop and WSL 2; no data reset was attempted.' }
  }
  if ($Action -eq 'status') {
    Invoke-QfDocker -Arguments @('ps')
    return
  }
  if ($Action -eq 'stop') {
    Invoke-QfDocker -Arguments @('stop','postgres')
    return
  }
  $qfNode = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $qfNode) { throw 'Install Node.js 24 first.' }
  $qfNodeVersion = & $qfNode.Source --version
  if ($LASTEXITCODE -ne 0 -or $qfNodeVersion -notmatch '^v24\.') { throw 'Install Node.js 24; this project requires >=24 <25. No container changes were attempted.' }
  if (-not (Test-Path -LiteralPath 'node_modules/tsx/dist/cli.mjs')) { throw 'Run pnpm install --frozen-lockfile first.' }
  if ($Action -eq 'backup' -or $Action -eq 'drill') {
    if ($Action -eq 'drill') {
      $qfSavedEnvironment.TEST_DATABASE_URL = [Environment]::GetEnvironmentVariable('TEST_DATABASE_URL','Process')
      [Environment]::SetEnvironmentVariable('TEST_DATABASE_URL',$qfEnvironment.TEST_DATABASE_URL,'Process')
      & $qfNode.Source node_modules/tsx/dist/cli.mjs tools/recovery-drill.ts $qfDocker.Source @qfCompose
      if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL recovery drill failed; inspect retained artifacts.' }
      return
    }
    $qfBackupArguments = @()
    if ($Prototype) { $qfBackupArguments += '--prototype' }
    & $qfNode.Source node_modules/tsx/dist/cli.mjs tools/postgres-backup.ts $qfDocker.Source @qfCompose @qfBackupArguments
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backup/restore verification failed; inspect the retained local artifact directory.' }
    return
  }
  Invoke-QfDocker -Arguments @('up','-d','--wait','--wait-timeout','120','postgres')
  if ($Action -eq 'start') { Write-Host 'Local PostgreSQL is healthy; no migration, fixtures or database selection changed.'; return }
  $qfTestDatabase = & $qfDocker.Source @qfCompose exec -T postgres psql -U quotefix -d postgres -Atc "SELECT datname FROM pg_database WHERE datname='quotefix_test'"
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect local test database.' }
  if ($qfTestDatabase -notcontains 'quotefix_test') {
    Invoke-QfDocker -Arguments @('exec','-T','postgres','createdb','-U','quotefix','quotefix_test')
  }
  foreach ($qfKey in $qfEnvironment.Keys) {
    $qfSavedEnvironment[$qfKey] = [Environment]::GetEnvironmentVariable($qfKey,'Process')
    [Environment]::SetEnvironmentVariable($qfKey,$qfEnvironment[$qfKey],'Process')
  }
  if ($Action -eq 'test') {
    & $qfNode.Source tools/run-tests.mjs "--concurrency=$TestConcurrency"
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL tests failed.' }
  } else {
    $qfDatabaseAction = 'migrate'
    if ($Action -eq 'setup') { $qfDatabaseAction = 'fixtures' }
    & $qfNode.Source node_modules/tsx/dist/cli.mjs tools/database.ts $qfDatabaseAction
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migration/fictional seed failed.' }
    if ($Action -eq 'dev') {
      Write-Host 'Fictional PostgreSQL development app: http://localhost:3001 (Ctrl+C to stop)'
      & $qfNode.Source --import tsx apps/api/src/main.ts
      if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL development server failed.' }
    } else {
      Write-Host 'PostgreSQL development fixtures are ready; the existing .env and PGlite database were not changed.'
    }
  }
} finally {
  foreach ($qfKey in $qfSavedEnvironment.Keys) {
    if ($null -eq $qfSavedEnvironment[$qfKey]) { Remove-Item -LiteralPath "Env:$qfKey" -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable($qfKey,$qfSavedEnvironment[$qfKey],'Process') }
  }
  $env:PATH = $qfOriginalPath
  Set-Location $qfOriginalLocation
}
