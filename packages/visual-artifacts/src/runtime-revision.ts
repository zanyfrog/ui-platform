import path from 'node:path';
import { readFile, lstat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build, transform } from 'esbuild';
import { instrumentVisualFunctions, type VisualHelperBoundary } from './helper-boundary.js';
import { readRoleBundle, type RoleBundleLocation } from '@ui-platform/artifacts/storage';
import type { RuntimeArtifact, PackageComponent } from './model.js';
import type { ViteDevServer } from 'vite';

export const visualExtensions = ['.html', '.css', '.visual.json', '.fixtures.json', '.functions.ts'] as const;
export interface CapturedVisual extends RuntimeArtifact { file: string; code: string; fixtures: string }

/** One ephemeral compilation, with no retained historical-generation map. */
export class RuntimeRevision {
  private checks: Array<() => Promise<void>> = [];
  private inputs: string[] = [];
  private bytes = 0;
  constructor(private watch: (file: string) => void) {}
  private bound(values: Array<string | null>) {
    this.bytes += values.reduce<number>((total, value) => total + (value?.length ?? 0) * 2, 0);
    if (this.bytes > 32 * 1024 * 1024 || this.checks.length >= 1000) throw new Error('Visual runtime graph exceeds the transient compilation limit.');
  }
  async text(file: string): Promise<string> {
    if ((await lstat(file)).isSymbolicLink()) throw new Error('Runtime source cannot use symbolic links.');
    const value = await readFile(file, 'utf8'); this.bound([value]); this.watch(file); this.inputs.push(file, value);
    this.checks.push(async () => { if (await readFile(file, 'utf8') !== value) throw new Error('Runtime source changed during revision compilation. Retry after the source is stable.'); });
    return value;
  }
  async directory(directory: string) {
    const read = async () => (await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })).filter(entry => !entry.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
    const entries = await read(), signature = entries.map(entry => [entry.name, entry.isDirectory(), entry.isSymbolicLink()]);
    this.bound([JSON.stringify(signature)]);
    this.checks.push(async () => { if (JSON.stringify((await read()).map(entry => [entry.name, entry.isDirectory(), entry.isSymbolicLink()])) !== JSON.stringify(signature)) throw new Error('Visual source inventory changed during revision compilation. Retry after source is stable.'); });
    return entries;
  }
  async visual(file: string, ownerRoot: string, immutable = false): Promise<CapturedVisual> {
    const stem = file.slice(0, -'.visual.json'.length), basename = path.basename(stem);
    const location: RoleBundleLocation = { root: ownerRoot, directory: path.dirname(file), anchor: path.basename(file), paths: visualExtensions.map(extension => basename + extension) };
    // Published input must never acquire development journals/locks inside its
    // immutable directory. Its source is still rechecked before compilation.
    if (immutable) {
      const values: Record<string, string> = {};
      for (const extension of visualExtensions) values[extension] = await this.text(stem + extension).catch(error => { if (error.code === 'ENOENT' && extension !== '.visual.json' && extension !== '.html') return ''; throw error; });
      JSON.parse(values['.fixtures.json'] || '{}');
      return { file, metadata: JSON.parse(values['.visual.json']), source: values['.html'], css: values['.css'], code: values['.functions.ts'], fixtures: values['.fixtures.json'] };
    }
    const snapshot = await readRoleBundle(location);
    this.bound(Object.values(snapshot.files));
    for (const name of location.paths) this.watch(path.join(location.directory, name));
    this.inputs.push(file, snapshot.checksum);
    this.checks.push(async () => { if ((await readRoleBundle(location)).checksum !== snapshot.checksum) throw new Error('Visual dependency changed during revision compilation. Retry after the source is stable.'); });
    const get = (extension: string) => snapshot.files[basename + extension] ?? '';
    if (!get('.visual.json') || snapshot.files[basename + '.html'] === null) throw new Error('Visual runtime requires complete metadata and HTML.');
    JSON.parse(get('.fixtures.json') || '{}');
    return { file, metadata: JSON.parse(get('.visual.json')), source: get('.html'), css: get('.css'), code: get('.functions.ts'), fixtures: get('.fixtures.json') };
  }
  async finish(module: string, artifacts: CapturedVisual[], helpers: VisualHelperBoundary): Promise<string> {
    for (const artifact of artifacts) await validateRuntimeCss(artifact.css);
    const guardModule = fileURLToPath(new URL('./revision-guard.js', import.meta.url)).replaceAll('\\', '/');
    module = `import { guardVisualFunctionExports, registerManagedVisualGraph } from ${JSON.stringify(guardModule)};\n` + module;
    // Captured function bytes are compiled with the aggregate module, never loaded
    // independently from mutable role paths. Bare service/package imports remain
    // normal Vite dependencies, with managed-role and retained-context guards.
    const sources = new Map(artifacts.map((artifact, index) => [`uip-captured-function:${index}`, artifact]));
    const result = await build({ stdin: { contents: module, loader: 'ts', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent', plugins: [{ name: 'captured-visual-functions', setup(builder) {
      builder.onResolve({ filter: /.*/ }, async args => {
        if (sources.has(args.path)) return { path: args.path, namespace: 'captured-visual' };
        if (args.path === guardModule) return { path: guardModule, external: true };
        const artifact = sources.get(args.importer);
        if (!artifact) return { path: args.path, external: true };
        return { path: await helpers.resolveFunction(args.path, artifact.file.replace(/\.visual\.json$/, '.functions.ts')), external: true };
      });
      builder.onLoad({ filter: /.*/, namespace: 'captured-visual' }, async args => {
        const artifact = sources.get(args.path)!;
        const lowered = await transform(artifact.code || 'export {};', { loader: 'ts', target: 'es2022', supported: { 'optional-chain': false, 'logical-assignment': false } });
        return { contents: instrumentVisualFunctions(lowered.code, artifact.file).replaceAll('"@ui-platform/visual-artifacts/revision-guard"', JSON.stringify(guardModule)), loader: 'ts' };
      });
    } }] });
    for (const check of this.checks) await check();
    const revision = createHash('sha256').update(JSON.stringify(this.inputs)).digest('hex');
    const output = `import { registerVisualRevision } from ${JSON.stringify(guardModule)};\nregisterVisualRevision(${JSON.stringify(revision)},${JSON.stringify(artifacts.flatMap(artifact => [artifact.source, artifact.css, artifact.code, artifact.fixtures, JSON.stringify(artifact.metadata)]))});\nexport const runtimeRevision=${JSON.stringify(revision)};\n${result.outputFiles[0].text}`;
    if (output.length * 2 > 64 * 1024 * 1024) throw new Error('Compiled Visual runtime graph exceeds the transient output limit.');
    return output;
  }
}
export async function validateRuntimeCss(source: string): Promise<void> {
  const result = await transform(source, { loader: 'css', logLevel: 'silent' });
  if (result.warnings.length) throw new Error('CSS source is incomplete or invalid: ' + result.warnings.map(item => item.text).join(' '));
}
export async function validateRuntimeFunctionSource(source: string): Promise<void> {
  const lowered = await transform(source || 'export {};', { loader: 'ts', target: 'es2022', supported: { 'optional-chain': false, 'logical-assignment': false } });
  instrumentVisualFunctions(lowered.code, 'candidate.functions.ts');
}
export function runtimeReaderServer(server: ViteDevServer, root: string, managedRoots: string[] = []): void {
  server.middlewares.use(async (request, response, next) => {
    try {
      const url = decodeURIComponent((request.url ?? '').split('?')[0]);
      if (url.startsWith('/@id/__x00__virtual:uip-visual-') || url.startsWith('/@id/__x00__virtual:uip-application-composition')) {
        // A fresh HTTP module request must check recovery even if the previous
        // successful transform is cached. Old live browser module objects remain.
        for (const module of server.moduleGraph.idToModuleMap.values()) if (module.id?.startsWith('\0virtual:uip-visual-') || module.id === '\0virtual:uip-application-composition') server.moduleGraph.invalidateModule(module);
      } else if (!url.startsWith('/@id/')) await assertNotVisualRole(url.startsWith('/@fs/') ? url.slice(5) : path.join(root, url), managedRoots);
      next();
    } catch (error) { response.statusCode = 409; response.end(String(error)); }
  });
}
/** Watch events are hints. Publish a refresh only after the complete reader
 * contract succeeds; retry the short cross-process admission window.
 */
export function runtimeRevisionRefresh(server: ViteDevServer, relevant: (file: string) => boolean) {
  let timer: ReturnType<typeof setTimeout> | undefined, generation = 0, closed = false;
  const refresh = (file: string) => {
    if (closed || !relevant(file) || /(?:^|\/)\.uib(?:\/|$)/i.test(file.replaceAll('\\', '/'))) return;
    const current = ++generation; clearTimeout(timer);
    const validate = async (attempt = 0): Promise<void> => {
      try {
        const modules = [...server.moduleGraph.idToModuleMap.values()].filter(module => module.id?.startsWith('\0virtual:uip-visual-') || module.id === '\0virtual:uip-application-composition');
        for (const module of modules) await server.pluginContainer.load(module.id!);
        if (closed || current !== generation) return;
        for (const module of modules) server.moduleGraph.invalidateModule(module);
        if (modules.length) server.ws.send({ type: 'full-reload' });
      } catch (error) {
        if (closed || current !== generation) return;
        if (attempt < 20 && /locked by another writer|lock changed/i.test(String(error))) { timer = setTimeout(() => { void validate(attempt + 1); }, 200); return; }
        server.ws.send({ type: 'error', err: { message: `Visual refresh blocked: ${String(error)}`, stack: '' } });
      }
    };
    timer = setTimeout(() => { void validate(); }, 200);
  };
  server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh);
  const close = () => { closed = true; clearTimeout(timer); server.watcher.off('add', refresh).off('unlink', refresh).off('change', refresh); };
  server.httpServer?.once('close', close);
  return { refresh, close, relevant };
}
export function runtimeLiteral(artifact: CapturedVisual, index: number): string {
  return `{metadata:${JSON.stringify(artifact.metadata)},source:${JSON.stringify(artifact.source)},css:${JSON.stringify(artifact.css)},functions:guardVisualFunctionExports(f${index})}`;
}
export async function runtimePackageDefinitions(revision: RuntimeRevision, root: string, module?: (file: string) => void): Promise<PackageComponent[]> {
  const pkg = JSON.parse(await revision.text(path.join(root, 'package.json')));
  const app = JSON.parse(await revision.text(path.join(root, 'app.manifest.json')).catch(error => { if (error.code === 'ENOENT') return '{}'; throw error; }));
  const result: PackageComponent[] = [];
  for (const name of Object.keys(pkg.dependencies ?? {})) {
    if (app.packages?.[name]?.enabled === false) continue;
    const directory = path.join(root, 'node_modules', name);
    const manifest = await revision.text(path.join(directory, 'ui.component.json')).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
    if (!manifest) continue;
    for (const entry of JSON.parse(manifest).components ?? []) if (entry.module) { module?.(path.resolve(directory, entry.module)); result.push({ ...entry, id: entry.identity?.componentId ?? entry.id ?? `${name}:${entry.tagName}`, definition: entry.identity && entry.builder && entry.runtime ? entry : undefined }); }
  }
  return result;
}

/** Guard both dependency resolution and direct Vite HTTP raw/JSON requests. */
export async function assertNotVisualRole(file: string, managedRoots: string[] = []): Promise<void> {
  const clean = file.split('?')[0];
  if (/(?:^|[\\/])\.uib[\\/](?:transactions|locks)(?:[\\/]|$)/i.test(clean)) throw new Error('Private source transaction storage cannot be loaded by the runtime.');
  const extension = visualExtensions.find(extension => clean.toLowerCase().endsWith(extension));
  if (!extension) return;
  const metadata = clean.slice(0, -extension.length) + '.visual.json';
  const exists = (target: string) => lstat(target).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
  const managed = managedRoots.some(root => { const relative = path.relative(root, clean); return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); });
  const stem = clean.slice(0, -extension.length);
  const orphan = managed && (/^(?:page|shell|component)$/i.test(path.basename(stem)) || await exists(stem + '.html') && (await exists(stem + '.functions.ts') || await exists(stem + '.fixtures.json')));
  if (extension === '.visual.json' || orphan || await exists(metadata)) throw new Error('Direct Visual role imports are blocked. Use the revision-pinned Visual virtual module.', { cause: clean });
}
