param([ValidatePattern('^gemini-[a-z0-9.-]{1,80}$')][string]$Model = 'gemini-3.5-flash-lite')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSecrets = Join-Path $taskRoot 'work/secrets'
$taskKeyPath = Join-Path $taskSecrets 'gemini-api-key'
$taskConfigPath = Join-Path $taskRoot '.env'
Write-Host "Configure Google Gemini model: $Model"
Write-Host 'The key stays in an ignored local server file. Advice is requested explicitly in the app; comparison facts will be sent to Google.'
$taskSecureKey = Read-Host 'Paste the Gemini API key (hidden)' -AsSecureString
$taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecureKey)
try {
  $taskPlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer).Trim()
  if ($taskPlainKey -notmatch '^[A-Za-z0-9_.-]{20,500}$') { throw 'The key format is invalid; configuration was not changed.' }
  [void][System.IO.Directory]::CreateDirectory($taskSecrets)
  if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) {
    $taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $taskAcl = Get-Acl -LiteralPath $taskSecrets
    $taskAcl.SetAccessRuleProtection($true,$false)
    $taskRule = [Security.AccessControl.FileSystemAccessRule]::new($taskIdentity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
    $taskAcl.SetAccessRule($taskRule)
    Set-Acl -LiteralPath $taskSecrets -AclObject $taskAcl
  }
  [System.IO.File]::WriteAllText($taskKeyPath,$taskPlainKey,[System.Text.UTF8Encoding]::new($false))
  if (-not (Test-Path -LiteralPath $taskConfigPath)) { Copy-Item -LiteralPath (Join-Path $taskRoot '.env.example') -Destination $taskConfigPath }
  $taskLines = [System.IO.File]::ReadAllLines($taskConfigPath) | Where-Object { $_ -notmatch '^\s*(ADVICE_PROVIDER|GEMINI_MODEL|GEMINI_API_KEY|GEMINI_API_KEY_FILE)\s*=' }
  $taskLines += @('ADVICE_PROVIDER=gemini',"GEMINI_MODEL=$Model",'GEMINI_API_KEY_FILE=work/secrets/gemini-api-key')
  [System.IO.File]::WriteAllLines($taskConfigPath,$taskLines,[System.Text.UTF8Encoding]::new($false))
  Write-Host 'Saved. Restart the local API. Run pnpm exec tsx tools/check-gemini.ts for one small fictional live verification.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer)
  $taskPlainKey = $null
  $taskSecureKey.Dispose()
}
