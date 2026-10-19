param([ValidateSet('setup','test','dev','status')][string]$Action = 'setup')
$ErrorActionPreference = 'Stop'
$qfOriginalLocation = Get-Location
$qfOriginalPath = $env:PATH
$qfSavedEnvironment = @{}
$qfEnvironment = @{
  APP_ENV = 'development'; IDENTITY_ADAPTER = 'local'; DATABASE_ADAPTER = 'postgres'
  DATABASE_URL = 'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_development'
  DATABASE_PATH = 'work/postgres-development'; HOST = '127.0.0.1'; PORT = '3001'
  APP_ORIGIN = 'http://127.0.0.1:3001'; LOCAL_ACCOUNT_HELPER = 'true'; ADVICE_PROVIDER = 'local'
  TEST_DATABASE_URL = 'postgresql://quotefix:local-only@127.0.0.1:5432/quotefix_test'
}
try {
  Set-Location (Split-Path -Parent $PSScriptRoot)
  $qfDocker = Get-Command docker -ErrorAction SilentlyContinue
  if (-not $qfDocker) {
    foreach ($qfDockerDirectory in @("$env:LOCALAPPDATA/Programs/DockerDesktop/resources/bin", "$env:ProgramFiles/Docker/Docker/resources/bin")) {
      if (Test-Path -LiteralPath "$qfDockerDirectory/docker.exe") {
        $env:PATH = "$qfDockerDirectory;" + $env:PATH
        $qfDocker = Get-Command docker
        break
      }
    }
  }
  if (-not $qfDocker) { throw 'Install Docker Desktop and start its Linux engine first.' }
  function Invoke-QfDocker {
    param([string[]]$Arguments)
    & $qfDocker.Source @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Docker command failed. Check Docker Desktop and WSL 2; no data reset was attempted.' }
  }
  if ($Action -eq 'status') {
    Invoke-QfDocker -Arguments @('compose','ps')
    return
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 first.' }
  if (-not (Test-Path -LiteralPath 'node_modules/tsx/dist/cli.mjs')) { throw 'Run pnpm install --frozen-lockfile first.' }
  Invoke-QfDocker -Arguments @('compose','up','-d','--wait','--wait-timeout','120','postgres')
  $qfTestDatabase = & $qfDocker.Source compose exec -T postgres psql -U quotefix -d postgres -Atc "SELECT datname FROM pg_database WHERE datname='quotefix_test'"
  if ($LASTEXITCODE -ne 0) { throw 'Could not inspect local test database.' }
  if ($qfTestDatabase -notcontains 'quotefix_test') {
    Invoke-QfDocker -Arguments @('compose','exec','-T','postgres','createdb','-U','quotefix','quotefix_test')
  }
  foreach ($qfKey in $qfEnvironment.Keys) {
    $qfSavedEnvironment[$qfKey] = [Environment]::GetEnvironmentVariable($qfKey,'Process')
    [Environment]::SetEnvironmentVariable($qfKey,$qfEnvironment[$qfKey],'Process')
  }
  if ($Action -eq 'test') {
    & node node_modules/tsx/dist/cli.mjs --test --test-concurrency=4 'tests/*.test.ts'
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL tests failed.' }
  } else {
    & node node_modules/tsx/dist/cli.mjs tools/database.ts fixtures
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL migration/fictional seed failed.' }
    if ($Action -eq 'dev') {
      Write-Host 'Fictional PostgreSQL development app: http://127.0.0.1:3001 (Ctrl+C to stop)'
      & node node_modules/tsx/dist/cli.mjs apps/api/src/main.ts
      if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL development server failed.' }
    } else {
      Write-Host 'PostgreSQL development fixtures are ready; the existing .env and PGlite database were not changed.'
    }
  }
} finally {
  foreach ($qfKey in $qfSavedEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($qfKey,$qfSavedEnvironment[$qfKey],'Process')
  }
  $env:PATH = $qfOriginalPath
  Set-Location $qfOriginalLocation
}
