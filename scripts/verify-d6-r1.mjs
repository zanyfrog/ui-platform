// Named, serial verification only. No workspace configuration or backend setup.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
const root = path.resolve(import.meta.dirname, '..');
const evidence = path.join(root, 'evidence/d6-r1-recovery-free-read-20261026');
const out = path.join(evidence, 'run-' + Date.now()); fs.mkdirSync(out);
const expression = path.resolve(root, '../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts');
const sources = [
  ...['storage', 'role-bundle', 'storage-api', 'bundle', 'file-operations', 'types'].map(n => `packages/artifacts/src/${n}.ts`),
  ...['index', 'model', 'source', 'expression', 'validation', 'form', 'composition', 'composition-validation', 'runtime-read-admission'].map(n => `packages/visual-artifacts/src/${n}.ts`),
  'src/server/visual-artifacts.ts', 'src/server/json-files.ts',
  ...['recovery-free.test', 'fs-guard', 'unused-server'].map(n => `tests/d6-r1/${n}.ts`),
].map(p => path.join(root, p)).concat(expression);
const admitted = new Set(sources);
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const compilerRequire = createRequire(path.join(root, 'packages/artifacts/package.json'));
const require = createRequire(import.meta.url), ts = compilerRequire('typescript');
const replacements = new Map(['trash', 'applications', 'paths'].map(n => [path.join(root, `src/server/${n}.ts`), path.join(root, 'tests/d6-r1/unused-server.ts')]));
const aliases = new Map([
  ['@ui-platform/artifacts/storage', path.join(root, 'packages/artifacts/src/storage-api.ts')],
  ['@ui-platform/visual-artifacts', path.join(root, 'packages/visual-artifacts/src/index.ts')],
  ['@ui-platform/dataset-operations/expression', expression],
]);
const builtins = new Set(['node:test', 'node:assert/strict', 'node:fs', 'node:fs/promises', 'node:path', 'node:os', 'node:timers/promises', 'node:crypto', 'node:async_hooks']);
fs.mkdirSync(path.join(out, 'inputs'));
for (const file of sources) fs.writeFileSync(path.join(out, 'inputs', hash(file) + '.txt'), fs.readFileSync(file));
const hashes = Object.fromEntries(sources.map(file => [path.relative(root, file), hash(file)]));
fs.writeFileSync(path.join(out, 'admission.json'), JSON.stringify({
  sources: hashes, replacements: [...replacements], aliases: [...aliases], builtins: [...builtins],
  tools: { node: process.version, esbuild: require('esbuild/package.json').version, typescript: ts.version },
  entry: 'tests/d6-r1/recovery-free.test.ts', serial: true, retries: 0, workspaceConfig: false, setup: [],
  initialization: 'Actual Foundation/Visual source declarations and local-lock map only. Pure Visual exports and declarative expression module. Test-only server tripwires; guarded fs facade; PID probe replaced by deterministic injected ESRCH before tests. No native PID probe.',
  filesystem: 'Named mkdtemp d6-r1-* roots under the evidence disposable-fixtures directory only; source IO guarded; ancestor lstat metadata only. Fixture setup/cleanup uses Node fs. No project stores or coordination metadata.',
  sideEffects: 'Own coordination plus explicitly authored fixture faults; ordinary default writer compatibility uses disposable source only. No production setup, network, session, I-AM or native renderer import.',
}, null, 2));
try {
  const result = await build({ absWorkingDir: root, entryPoints: ['tests/d6-r1/recovery-free.test.ts'], bundle: true, write: false, platform: 'node', format: 'esm', target: 'es2022', metafile: true, plugins: [{ name: 'exact-d6-r1-admission', setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (args.path === 'd6-r1-real-fs') { assert.equal(args.importer, path.join(root, 'tests/d6-r1/fs-guard.ts')); return { path: 'node:fs/promises', external: true }; }
      if (args.path === 'node:fs/promises' && !args.importer.includes(path.join('tests', 'd6-r1'))) return { path: path.join(root, 'tests/d6-r1/fs-guard.ts') };
      if (args.path.startsWith('node:')) { assert.ok(builtins.has(args.path), 'Unadmitted builtin'); return { path: args.path, external: true }; }
      let resolved = aliases.get(args.path) ?? path.resolve(args.resolveDir || root, args.path);
      if (resolved.endsWith('.js')) resolved = resolved.slice(0, -3) + '.ts';
      resolved = replacements.get(resolved) ?? resolved;
      assert.ok(admitted.has(resolved), 'UNADMITTED_IMPORT ' + resolved); return { path: resolved };
    });
    b.onLoad({ filter: /.*/ }, args => { assert.ok(admitted.has(args.path)); return { contents: fs.readFileSync(args.path, 'utf8'), loader: 'ts', resolveDir: path.dirname(args.path) }; });
  } }] });
  fs.writeFileSync(path.join(out, 'resolved-graph.json'), JSON.stringify(result.metafile, null, 2));
  const bundle = path.join(out, 'recovery-free.test.mjs'); fs.writeFileSync(bundle, result.outputFiles[0].text);
  const env = { ...process.env, UI_GRAPH_LOCK_TRACE: '0', D6_R1_TRACE_FILE: path.join(out, 'filesystem-traces.json') }; delete env.NODE_OPTIONS; delete env.NODE_PATH; delete env.UI_GRAPH_LOCK_METRICS;
  const execution = spawnSync(process.execPath, ['--test', '--test-concurrency=1', bundle], { cwd: root, encoding: 'utf8', env, timeout: 30000 });
  fs.writeFileSync(path.join(out, 'test-results.txt'), (execution.stdout ?? '') + (execution.stderr ?? ''));
  assert.equal(execution.status, 0, execution.stdout + execution.stderr);
  const options = { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, skipLibCheck: true, noEmit: true, types: ['node'], typeRoots: [path.join(root, 'node_modules/@types')], paths: Object.fromEntries([...aliases].map(([a,b]) => [a,[b]])) };
  const host = ts.createCompilerHost(options), originalRead = host.readFile.bind(host);
  const libRoot = path.dirname(compilerRequire.resolve('typescript/lib/lib.es2022.d.ts'));
  const nodeRoot = path.join(root, 'node_modules/@types/node'), undiciRoot = path.join(root, 'node_modules/undici-types');
  host.readFile = file => {
    const resolved = path.resolve(file);
    if (resolved.endsWith('.json')) return originalRead(file);
    assert.ok(admitted.has(resolved) || [libRoot, nodeRoot, undiciRoot].some(dir => resolved.startsWith(dir + path.sep)), 'UNADMITTED_TYPE_INPUT ' + resolved);
    return originalRead(file);
  };
  host.resolveModuleNames = (names, containing) => names.map(name => {
    const resolved = ts.resolveModuleName(name, containing, options, host).resolvedModule;
    if (resolved && replacements.has(path.resolve(resolved.resolvedFileName))) return { ...resolved, resolvedFileName: replacements.get(path.resolve(resolved.resolvedFileName)) };
    return resolved;
  });
  const program = ts.createProgram(['packages/artifacts/src/storage-api.ts', 'src/server/visual-artifacts.ts', 'packages/visual-artifacts/src/runtime-read-admission.ts'].map(p => path.join(root, p)), options, host);
  fs.writeFileSync(path.join(out, 'typecheck-admission.json'), JSON.stringify({ roots: program.getRootFileNames(), sourceFiles: program.getSourceFiles().map(f => ({ path: f.fileName, sha256: hash(f.fileName) })), options, replacements: [...replacements], description: 'Strict product read contracts, Visual service, actual pure shared modules and runtime forwarding; unused backend imports use typed tripwires. Test fs instrumentation is not typechecked as production.' }, null, 2));
  const diagnostics = ts.getPreEmitDiagnostics(program);
  fs.writeFileSync(path.join(out, 'typecheck.txt'), ts.formatDiagnostics(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }));
  assert.equal(diagnostics.length, 0, 'Scoped typecheck failed');
  assert.deepEqual(Object.fromEntries(sources.map(file => [path.relative(root, file), hash(file)])), hashes);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: true, serial: true, retries: 0, tests: 16, typecheck: 'strict scoped source contracts and named consumers', sourceHashesUnchangedDuringExecution: true }, null, 2));
  console.log('PASS ' + out);
} catch (error) { fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack }, null, 2)); throw error; }
