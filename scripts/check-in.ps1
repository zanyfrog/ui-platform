param(
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repoRoot

function Invoke-Git {
  param([string[]]$Arguments)
  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

$branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Unable to determine the current Git branch.' }
if ($branch -ne 'main') { throw "Check-in requires the main branch; current branch is '$branch'." }

$changes = & git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the Git worktree.' }

if (-not $changes) {
  Write-Host 'No local changes to commit. Verifying origin/main is up to date...'
  Invoke-Git @('push', 'origin', 'main')
  Invoke-Git @('status', '--short', '--branch')
  exit 0
}

Invoke-Git @('add', '-A')

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = 'Check in project changes'
}

Invoke-Git @('commit', '-m', $Message)
Invoke-Git @('push', 'origin', 'main')
Invoke-Git @('status', '--short', '--branch')
