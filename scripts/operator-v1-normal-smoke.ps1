# Paste this complete file into a fresh, regular UNELEVATED PowerShell terminal.
# This is a new operator helper; the application command is the existing npm run dev.
& {
$ErrorActionPreference = 'Stop'
$smokeRoot = 'C:\Projects\Modular\v1-normal-smoke-20261026-01'
$smokeProject = Join-Path $smokeRoot 'ui-platform'
Set-Location -LiteralPath $smokeProject
Get-Command node.exe, npm.cmd -ErrorAction Stop | Out-Null

# Never reuse operational roots or repair state. Only inspect these disposable roots.
$smokeRoots = @($smokeProject, (Join-Path $smokeRoot 'apps'),
    (Join-Path $smokeRoot 'runtime'), (Join-Path $smokeRoot 'templates'))
foreach ($smokePath in $smokeRoots) {
    if (!(Test-Path -LiteralPath $smokePath -PathType Container)) {
        throw "Required disposable directory is missing: $smokePath"
    }
}
$smokeEntries = @(Get-ChildItem -LiteralPath $smokeRoots -Recurse -Force)
if ($smokeEntries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint }) {
    throw 'Unexpected reparse point. Stop; do not redirect this procedure.'
}
if ($smokeEntries | Where-Object {
    !$_.PSIsContainer -and ($_.Name -like '*.lock' -or
        $_.Name -like '*.recovery' -or $_.Name -eq 'pending.json')
}) { throw 'Existing lock/recovery/journal condition. Stop; do not delete or repair it.' }
$smokeApp = Join-Path $smokeRoot 'apps\v1-identity-fixture'
$smokeManifest = Get-Content -LiteralPath (Join-Path $smokeApp 'app.manifest.json') -Raw | ConvertFrom-Json
$smokeMarker = Get-Content -LiteralPath (Join-Path $smokeApp '.v1-development-fixture.json') -Raw | ConvertFrom-Json
$smokeSettings = Get-Content -LiteralPath (Join-Path $smokeApp 'app.settings.json') -Raw | ConvertFrom-Json
if ($smokeManifest.appId -ne 'dev-v1-identity-fixture' -or
    $smokeMarker.applicationId -ne $smokeManifest.appId -or
    $smokeSettings.application.status -ne 'active') {
    throw 'Disposable Application ownership/status mismatch. Stop.'
}
foreach ($smokeRelative in @('scripts\dev.mjs', 'src\server\index.ts',
    'node_modules\tsx\package.json', 'node_modules\@ui-platform\i-am\package.json',
    'node_modules\@ui-platform\trigger-manager\package.json')) {
    if (!(Test-Path -LiteralPath (Join-Path $smokeProject $smokeRelative) -PathType Leaf)) {
        throw "Disposable copy is incomplete: $smokeRelative. Stop; do not install packages."
    }
}
if (!(Test-Path -LiteralPath (Join-Path $smokeRoot 'runtime\iam-v1-development.sqlite') -PathType Leaf)) {
    throw 'Expected disposable development identity database is missing. Stop.'
}

# Clear inherited product routing/host flags in THIS terminal only.
Get-ChildItem Env: | Where-Object { $_.Name -like 'UI_*' -or $_.Name -like 'VITE_*' } |
    ForEach-Object { Remove-Item -LiteralPath ('Env:\' + $_.Name) }
$env:NODE_ENV = 'development'
$env:UI_APPS_DIR = Join-Path $smokeRoot 'apps'
$env:UI_RUNTIME_DIR = Join-Path $smokeRoot 'runtime'
$env:UI_TEMPLATES_DIR = Join-Path $smokeRoot 'templates'
$env:UI_PLATFORM_V1_POLICY_STORE = Join-Path $env:UI_RUNTIME_DIR 'iam-v1-development.sqlite'
$env:UI_PLATFORM_V1_DEVELOPMENT_IDENTITY = '1'
$env:UI_PLATFORM_BUILDER_WP0 = '0'
$env:UI_PLATFORM_API_PORT = '4390'
$env:UI_PLATFORM_UI_PORT = '5374'
$env:UI_PLATFORM_HMR_PORT = '5375'
$env:UI_PLATFORM_VITE_CACHE_DIR = Join-Path $env:UI_RUNTIME_DIR 'vite-cache'
$env:V1_OPERATOR_CHECK_ROOT = Join-Path $smokeRoot ('operator-checks\' + [guid]::NewGuid().ToString())

# These checks use only new disposable files and short-lived owned listeners.
$smokeProbe = @'
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
const directory = process.env.V1_OPERATOR_CHECK_ROOT;
fs.mkdirSync(directory, { recursive: true });
const results = { passed: false, directory, hardLink: false, http: [], availablePorts: [] };
const listen = (server, port) => new Promise((resolve, reject) => {
  server.once('error', reject); server.listen(port, '127.0.0.1', resolve);
});
const close = server => new Promise((resolve, reject) => {
  if (!server.listening) return resolve();
  server.close(error => error ? reject(error) : resolve());
});
try {
  const source = path.join(directory, 'new-source.txt');
  const target = path.join(directory, 'new-hard-link.txt');
  fs.writeFileSync(source, 'operator-hard-link-check', { flag: 'wx' });
  fs.linkSync(source, target);
  if (fs.statSync(source).nlink < 2 || fs.readFileSync(target, 'utf8') !== 'operator-hard-link-check') throw Error('Hard-link verification failed');
  results.hardLink = true;
  const server = http.createServer((request, response) => response.end('operator-localhost-check'));
  try {
    await listen(server, 0);
    const port = server.address().port;
    for (const host of ['127.0.0.1', 'localhost']) {
      const response = await fetch(`http://${host}:${port}/`, { signal: AbortSignal.timeout(3000) });
      if (response.status !== 200 || await response.text() !== 'operator-localhost-check') throw Error('Local HTTP verification failed');
      results.http.push({ host, status: 200 });
    }
  } finally { await close(server); }
  for (const port of [4390, 5374, 5375]) {
    const server = net.createServer();
    try { await listen(server, port); results.availablePorts.push(port); }
    finally { await close(server); }
  }
  results.passed = true;
} catch (error) {
  results.error = String(error); process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
'@
& node.exe --input-type=module -e $smokeProbe
if ($LASTEXITCODE -ne 0) { throw 'Environment check failed. STOP; do not start the application or change Windows security.' }
Write-Host 'Checks passed. Retain the result.json path above. Starting the existing development command.'
Write-Host 'Wait for BOTH API listening and UI Platform: http://localhost:... messages. Open the PRINTED UI URL.'
Write-Host 'On recovery, foreign/busy/unknown locks, EPERM, invalid identity/catalog, or hash conflicts: Ctrl+C and stop.'
Write-Host 'Normal shutdown: Ctrl+C in this terminal. Do not delete coordination files or force-clean state.'
& npm.cmd run dev
if ($LASTEXITCODE -ne 0) { Write-Host 'Application command ended unsuccessfully. Preserve the terminal error; do not retry recovery.' }
}
