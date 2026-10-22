// Explicit source compilation only: no Vite config, application launch, package scripts or source discovery.
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
export const evidence = path.join(root, 'evidence/builder-v1-wp5-f-sample-integration-20261022');
const own = ['frame.ts', 'samples.ts', 'protocol.ts'].map(p => `src/client/fixture-preview/${p}`);
const native = [
  'packages/visual-artifacts/src/composition.ts', 'packages/visual-artifacts/src/source.ts',
  '../ui-base/packages/ui-base-ui/src/platform/renderer.js',
  '../ui-base/packages/ui-base-ui/src/platform/definition.js',
  '../ui-base/packages/ui-base-ui/src/platform/registry.js',
  '../ui-base/packages/ui-base-ui/src/layout/uib-card.js',
  '../ui-base/packages/ui-base-ui/src/layout/index.js',
  '../ui-base/packages/ui-base-ui/ui.component.json',
  ...['index', 'utils', 'localization', 'validation', 'metadata', 'base-element'].map(p => `../ui-base/packages/ui-base-core/src/${p}.js`),
  ...['uib-icon', 'icon-registry'].map(p => `../ui-base/packages/ui-base-icons/src/${p}.js`),
];
const admitted = new Set([...own, ...native].map(p => path.resolve(root, p)));
const admission = { name: 'fixture-closed-inputs', setup(build) {
  build.onResolve({ filter: /^@ui-base\/(core|icons\/icon)$/ }, args => ({ path: path.resolve(root, args.path === '@ui-base/core' ? '../ui-base/packages/ui-base-core/src/index.js' : '../ui-base/packages/ui-base-icons/src/uib-icon.js') }));
  build.onLoad({ filter: /.*/ }, async args => {
    if (!admitted.has(path.resolve(args.path))) throw new Error(`FIXTURE_BUILD_INPUT_NOT_ADMITTED: ${args.path}`);
    return { contents: await readFile(args.path, 'utf8'), loader: args.path.endsWith('.json') ? 'json' : args.path.endsWith('.ts') ? 'ts' : 'js' };
  });
} };
const result = await build({ absWorkingDir: root, entryPoints: [own[0]], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', metafile: true, plugins: [admission], legalComments: 'none' });
const output = result.outputFiles[0].text;
if (/\beval\s*\(|\bnew Function\b|\bimport\s*\(|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\blocalStorage\b|\bsessionStorage\b/.test(output)) throw new Error('FIXTURE_BOOTSTRAP_EFFECT_OR_DYNAMIC_CODE');
await writeFile(path.join(root, 'src/client/fixture-preview/bootstrap.txt'), output);
const hashes = {};
for (const p of [...own, ...native]) hashes[p] = createHash('sha256').update(await readFile(path.resolve(root, p))).digest('hex');
await writeFile(path.join(evidence, 'renderer-build.json'), JSON.stringify({ inputs: hashes, outputSha256: createHash('sha256').update(output).digest('hex'), outputBytes: Buffer.byteLength(output), imports: result.metafile.outputs, policy: 'closed explicit files; no package scripts/config/hooks; no external imports or dynamic execution in output' }, null, 2));
console.log(`Built audited fixture bootstrap: ${Buffer.byteLength(output)} bytes, ${Object.keys(result.metafile.inputs).length} inputs`);
