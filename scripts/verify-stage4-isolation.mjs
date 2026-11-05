import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';

// Keep runtime root resolution and lock policy unchanged. Execute all test-side
// imports and child servers from a fresh copy, not merely with disposable stores.
const original = await fs.realpath('.');
if (process.argv.slice(2).some(arg => arg !== '--assets-only')) throw new Error('Only --assets-only is supported');
const assetsOnly = process.argv.includes('--assets-only');
const evidence = path.resolve('evidence/v1-stage4-isolation-20261105', ...(assetsOnly ? ['asset-regression'] : []));
await fs.mkdir(evidence, { recursive: true });
const lockDirectory = path.join(original, 'components/.uib/locks');
async function sharedSnapshot() {
  const files = {};
  async function walk(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (entry.name === '.uib') continue;
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Unexpected shared graph link');
      if (entry.isDirectory()) await walk(file);
      else files[path.relative(original, file)] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
    }
  }
  await walk(path.join(original, 'components'));
  return { files, lockEntries: await fs.readdir(lockDirectory), lockDirectoryModifiedUtc: (await fs.stat(lockDirectory)).mtime.toISOString() };
}
const before = await sharedSnapshot();
await fs.writeFile(path.join(evidence, 'preservation-before.json'), JSON.stringify(before, null, 2) + '\n');
const target = path.join(evidence, 'disposable', randomUUID(), 'platform');
await fs.writeFile(path.join(evidence, '.gitignore'), '/disposable/\n/initial-preparation-failure/\n/v1-stage3-20261104/*.txt\n');
const preparationSource = await fs.readFile('scripts/prepare-stage3-physical.mjs', 'utf8');
const relativePreparation = path.relative(original, path.dirname(target)).replaceAll(path.sep, '/');
const preparation = preparationSource
  .replaceAll('evidence/v1-stage3-physical-20261105', relativePreparation)
  .replace("filter:p=>!p.includes('node_modules')", "filter:p=>!p.includes('node_modules') && !(name === 'components' && p.split(path.sep).includes('.uib'))");
process.env.UI_PLATFORM_STAGE3_PREPARATION_ROOT = target;
await import('data:text/javascript,' + encodeURIComponent(preparation));
// Existing browser tooling and Data Services test imports are shared read-only;
// Component packages and the platform graph remain physical target copies.
await fs.symlink(path.resolve('../ui-base/node_modules'), path.join(path.dirname(target), 'ui-base/node_modules'), 'junction');
await fs.symlink(path.resolve('../UI Platform Data Services'), path.join(path.dirname(target), 'UI Platform Data Services'), 'junction');
await fs.cp('tests', path.join(target, 'tests'), { recursive: true });
const closure = JSON.parse(await fs.readFile(path.join(path.dirname(target), 'package-closure.json'), 'utf8'));
await fs.writeFile(path.join(evidence, 'package-closure.json'), JSON.stringify(closure, null, 2) + '\n');
await fs.mkdir(path.join(target, 'evidence/v1-stage3-physical-20261105'), { recursive: true });
await fs.mkdir(path.join(target, 'evidence/v1-stage3-20261104'), { recursive: true });
await fs.writeFile(path.join(target, 'evidence/v1-stage3-physical-20261105/package-closure.json'), JSON.stringify(closure, null, 2) + '\n');
const roots = {};
for (const relative of ['src/server', 'components', 'packages/artifacts', 'node_modules/@ui-platform/artifacts']) {
  const resolved = await fs.realpath(path.join(target, relative));
  if (!resolved.startsWith(target + path.sep)) throw new Error('Unisolated test dependency: ' + relative);
  roots[relative] = { before: await fs.realpath(path.join(original, relative)), after: resolved };
}
if (await fs.stat(path.join(target, 'components/.uib')).then(() => true, () => false)) throw new Error('Shared graph metadata was copied');
const tests = assetsOnly ? ['stage3-protected-upload', 'stage3-retained-presentation'] : ['stage4-role-administration', 'pilot-administration', 'v1-management-server', 'v1-management-routes', 'stage1-component-admission', 'stage1-component-release', 'stage1-component-pin', 'stage2-builder-authoring'];
const inputs = [];
for (const name of tests) {
  const file = `tests/${name}.test.ts`;
  const bytes = await fs.readFile(file);
  if (!bytes.equals(await fs.readFile(path.join(target, file)))) throw new Error('Test copy mismatch');
  inputs.push({ file, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await fs.writeFile(path.join(evidence, 'paths-and-inputs.json'), JSON.stringify({ original, target, roots, inputs, preparationSha256: createHash('sha256').update(preparationSource).digest('hex'), changes: 'Existing preparation; redirected disposable/evidence paths; excluded original Component .uib metadata. Tests copied byte-for-byte.' }, null, 2) + '\n');
const log = await fs.open(path.join(evidence, 'focused-tests.txt'), 'w');
const events = [];
const observer = watch(lockDirectory, (event, filename) => events.push({ at: new Date().toISOString(), event, filename: String(filename) }));
observer.on('error', error => events.push({ observerError: error.message }));
try {
  const child = spawn(process.execPath, [path.resolve('node_modules/vitest/vitest.mjs'), 'run', ...tests.map(n => `tests/${n}.test.ts`), '--no-file-parallelism', '--reporter=default', '--reporter=json', `--outputFile=${path.join(evidence, 'results.json')}`], {
    cwd: target, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, UI_PLATFORM_STAGE3_PHYSICAL_ROOT: target, UI_PLATFORM_TEST_ORIGINAL_ROOT: original, UI_PLATFORM_TEST_EVIDENCE_ROOT: path.join(target, 'diagnostics'), UI_GRAPH_LOCK_TRACE: '1', UI_GRAPH_LOCK_METRICS: path.join(evidence, 'graph-lock-metrics.jsonl') },
  });
  child.stdout.pipe(process.stdout); child.stderr.pipe(process.stderr);
  child.stdout.on('data', b => log.write(b)); child.stderr.on('data', b => log.write(b));
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  for (const relative of ['evidence/v1-stage4-20261105', 'evidence/v1-stage2-20261104', 'evidence/v1-stage3-20261104', 'evidence/v1-stage3-physical-20261105']) {
    await fs.cp(path.join(target, relative), path.join(evidence, path.basename(relative)), { recursive: true }).catch(e => { if (e.code !== 'ENOENT') throw e; });
  }
  const after = await sharedSnapshot();
  await fs.writeFile(path.join(evidence, 'preservation-after.json'), JSON.stringify(after, null, 2) + '\n');
  await fs.writeFile(path.join(evidence, 'completion.json'), JSON.stringify({ exitCode: code, graphDirectory: await fs.realpath(path.join(target, 'components')), originalGraphMetadataCopied: false, originalLockDirectoryEvents: events, sharedSnapshotEqual: JSON.stringify(before) === JSON.stringify(after), finishedAt: new Date().toISOString() }, null, 2) + '\n');
  if (JSON.stringify(before) !== JSON.stringify(after) || events.length) throw new Error('Shared graph preservation discrepancy; inspect evidence before proceeding');
  if (code !== 0) process.exitCode = 1;
} finally { observer.close(); await log.close(); }
