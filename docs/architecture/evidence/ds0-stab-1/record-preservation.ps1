$ErrorActionPreference = 'Stop'
$platform = 'C:\Projects\Modular\ui-platform'
$services = 'C:\Projects\Modular\UI Platform Data Services'
$evidence = Join-Path $platform 'docs\architecture\evidence\ds0-stab-1'
$baseline = 'C:\Users\zanyf\AppData\Local\Temp\ds0-stab1-before.json'
Copy-Item -LiteralPath $baseline -Destination (Join-Path $evidence 'data-services-before.json')
$before = Get-Content -Raw $baseline | ConvertFrom-Json
$checked = @($before | ForEach-Object {
  $current = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $services $_.path)).Hash
  [pscustomobject]@{ path = $_.path; before = $_.hash; after = $current; unchanged = $_.hash -eq $current }
})
$checked | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $evidence 'tracked-file-preservation.json')
$repoRecords = @('C:\Projects\Modular\ui-platform', $services, 'C:\Projects\Modular\ui-base') | ForEach-Object {
  $repository = $_
  $safe = 'safe.directory=' + $repository.Replace('\', '/')
  [pscustomobject]@{
    path = $repository
    head = (git -c $safe -C $repository rev-parse HEAD)
    branch = (git -c $safe -C $repository branch --show-current)
    upstream = (git -c $safe -C $repository rev-parse --abbrev-ref '@{upstream}')
    status = @(git -c $safe -C $repository status --short --untracked-files=all)
    lockfileSha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $repository 'package-lock.json')).Hash
  }
}
$artifacts = @('docs/architecture/ds0-stab-0-execution-acceptance-report.md', 'docs/architecture/ds0-baseline-stabilization-repair-plan.md', 'docs/architecture/ds0-stab-1-compatibility-assessment.md') | ForEach-Object {
  [pscustomobject]@{ path = $_; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $platform $_)).Hash }
}
$npmCli = 'C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js'
$npmPackage = Get-Content -Raw 'C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\package.json' | ConvertFrom-Json
$defaults = @('data/definitions', 'packages/schema-manager/data/definitions', 'packages/trigger-manager/data/definitions') | ForEach-Object {
  [pscustomobject]@{ path = Join-Path $services $_; exists = Test-Path -LiteralPath (Join-Path $services $_) }
}
[pscustomobject]@{
  recordedAt = Get-Date -Format o
  repositories = $repoRecords
  trackedBeforeCount = $checked.Count
  trackedUnchangedCount = @($checked | Where-Object unchanged).Count
  trackedChanged = @($checked | Where-Object { -not $_.unchanged } | Select-Object -ExpandProperty path)
  protectedDocuments = $artifacts
  tools = [pscustomobject]@{ node = (node --version); localNpm = (& node $npmCli --version); localNpmNodeEngines = $npmPackage.engines.node; globalNpm = (npm.cmd --version) }
  defaultDefinitionRoots = $defaults
} | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $evidence 'preservation-and-repositories.json')
git -c 'safe.directory=C:/Projects/Modular/UI Platform Data Services' -C $services diff --check 2>&1 | Set-Content (Join-Path $evidence 'diff-check.txt')
$diffExit = $LASTEXITCODE
Write-Output "Tracked files: $($checked.Count); unchanged: $(@($checked | Where-Object unchanged).Count); diff-check exit: $diffExit"
Get-Content (Join-Path $evidence 'preservation-and-repositories.json')
exit $diffExit
