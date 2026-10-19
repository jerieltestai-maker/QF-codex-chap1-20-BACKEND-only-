param([ValidateSet('dev','test','typecheck','build','migrate','fixtures','install')][string]$Action = 'dev')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$qfNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $qfNode) { throw 'Install Node.js 24 LTS first.' }
$qfPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $qfPnpm) {
  $qfRuntime = 'C:\Users\jerie\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs'
  if (-not (Test-Path -LiteralPath $qfRuntime)) { throw 'Install pnpm 11.25.0 first.' }
}
if (-not (Test-Path -LiteralPath .env)) { Copy-Item -LiteralPath .env.example -Destination .env }
function Invoke-QfPnpm {
  param([string[]]$Arguments)
  if ($qfPnpm) { & $qfPnpm.Source @Arguments } else { & $qfNode.Source $qfRuntime @Arguments }
  if ($LASTEXITCODE -ne 0) { throw 'pnpm command failed' }
}
if ($Action -eq 'install' -or -not (Test-Path -LiteralPath node_modules)) {
  Invoke-QfPnpm -Arguments @('install','--store-dir','work/pnpm-store')
}
$qfTsx = 'node_modules/tsx/dist/cli.mjs'
switch ($Action) {
  'dev' {
    & $qfNode.Source $qfTsx tools/database.ts fixtures
    if ($LASTEXITCODE -ne 0) { throw 'Fixture setup failed' }
    & $qfNode.Source $qfTsx apps/api/src/main.ts
  }
  'test' { & $qfNode.Source $qfTsx --test --test-concurrency=4 'tests/*.test.ts' }
  'typecheck' { & $qfNode.Source node_modules/typescript/bin/tsc --noEmit }
  'build' { & $qfNode.Source node_modules/typescript/bin/tsc }
  'migrate' { & $qfNode.Source $qfTsx tools/database.ts migrate }
  'fixtures' { & $qfNode.Source $qfTsx tools/database.ts fixtures }
}
if ($LASTEXITCODE -ne 0) { throw 'QuoteFix command failed' }
