$ErrorActionPreference='Stop'
$repo='C:\Projects\Modular\UI Platform Data Services'
$evidence='C:\Projects\Modular\ui-platform\docs\architecture\evidence\ds0-stab-0'
$toolRoot=Join-Path $env:TEMP 'ds0-stab0-npm-10.8.2'
$npmCli=Join-Path $toolRoot 'package\bin\npm-cli.js'
$env:PATH=(Join-Path $toolRoot 'shims')+';'+$env:PATH
$env:npm_config_cache=Join-Path $toolRoot 'cache'
$env:STAB0_NPM_TRACE=Join-Path $evidence 'npm-invocations.txt'
$env:NODE_OPTIONS=($env:NODE_OPTIONS+' --require="'+((Join-Path $toolRoot 'trace-npm.cjs').Replace('\','/'))+'"').Trim()
Set-Location -LiteralPath $repo
& cmd.exe /d /c 'npm --version' *> "$evidence/direct-child-npm-version.txt"
if($LASTEXITCODE -ne 0){throw 'Direct npm lookup failed'}
Get-Content "$evidence/direct-child-npm-version.txt"
$results=@(Get-Content "$evidence/commands.json" -Raw | ConvertFrom-Json)
$results += [pscustomobject]@{name='direct-child-npm-version';command='cmd.exe /d /c "npm --version" (local npm bin first on PATH)';cwd=$repo;exitCode=0}
$commands=@(
 @{name='build';args=@('run','build')},
 @{name='typecheck';args=@('run','typecheck')},
 @{name='tests';args=@('test')},
 @{name='schema-application-tests';args=@('exec','--offline','--','vitest','run','packages/schema-application/tests/state-store.test.ts')}
)
foreach($command in $commands){
 $started=Get-Date -Format o
 $arguments=$command.args
 & 'C:\Program Files\nodejs\node.exe' $npmCli @arguments *> (Join-Path $evidence ($command.name+'.txt'))
 $code=$LASTEXITCODE
 $results += [pscustomobject]@{name=$command.name;command=('node "'+$npmCli+'" '+($arguments -join ' '));cwd=$repo;started=$started;finished=(Get-Date -Format o);exitCode=$code}
 $results | ConvertTo-Json -Depth 4 | Set-Content "$evidence/commands.json"
 Write-Output "$($command.name) exit=$code"
 Get-Content (Join-Path $evidence ($command.name+'.txt')) -Tail 30
 if($code -ne 0){throw "Stopped after $($command.name) failed"}
 if((Get-FileHash package-lock.json).Hash -ne '84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F'){throw 'Lockfile changed'}
}

