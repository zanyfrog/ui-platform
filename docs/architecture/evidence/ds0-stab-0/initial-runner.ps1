$ErrorActionPreference='Stop'
$repo='C:\Projects\Modular\UI Platform Data Services'
$evidence='C:\Projects\Modular\ui-platform\docs\architecture\evidence\ds0-stab-0'
$toolRoot=Join-Path $env:TEMP 'ds0-stab0-npm-10.8.2'
$npmCli=Join-Path $toolRoot 'package\bin\npm-cli.js'
$env:PATH=(Join-Path $toolRoot 'package\bin')+';'+$env:PATH
$env:npm_config_cache=Join-Path $toolRoot 'cache'
Set-Location -LiteralPath $repo
$expected='84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F'
if((Get-FileHash package-lock.json).Hash -ne $expected){throw 'Lockfile changed before installation'}
$commands=@(
 @{name='npm-version';args=@('--version')},
 @{name='install';args=@('ci','--ignore-scripts','--no-audit','--no-fund')},
 @{name='dependencies';args=@('ls','--depth=0')},
 @{name='nested-npm-version';args=@('exec','--','cmd','/d','/c','npm --version')},
 @{name='build';args=@('run','build')},
 @{name='typecheck';args=@('run','typecheck')},
 @{name='tests';args=@('test')},
 @{name='schema-application-tests';args=@('exec','--','vitest','run','packages/schema-application/tests/state-store.test.ts')}
)
$results=@()
foreach($command in $commands){
 $started=Get-Date -Format o
 $arguments=$command.args
 & 'C:\Program Files\nodejs\node.exe' $npmCli @arguments *> (Join-Path $evidence ($command.name+'.txt'))
 $code=$LASTEXITCODE
 $results += [pscustomobject]@{name=$command.name;command=('node "'+$npmCli+'" '+($arguments -join ' '));cwd=$repo;started=$started;finished=(Get-Date -Format o);exitCode=$code}
 $results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $evidence 'commands.json')
 Write-Output "$($command.name) exit=$code"
 Get-Content (Join-Path $evidence ($command.name+'.txt')) -Tail 22
 if($code -ne 0){throw "Stopped after $($command.name) failed"}
 if((Get-FileHash package-lock.json).Hash -ne $expected){throw "Lockfile changed after $($command.name)"}
}
