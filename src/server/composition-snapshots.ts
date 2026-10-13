import { createHash } from 'node:crypto';
import { cp, lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { componentReferences } from '@ui-platform/visual-artifacts';
import { VisualArtifactService } from './visual-artifacts.js';

export const compositionSources = ['app.settings.json', 'shells', 'menus', 'styles', 'assets', 'src/pages'] as const;
// Frozen distribution dependencies retain Platform identity; this is not an editable
// Application Component collection and is never exposed through Component management.
export const platformComponentSnapshotPath = 'presentation/platform-components';
export async function compositionChecksum(root: string): Promise<string> {
  const hash = createHash('sha256');
  const walk = async (file: string, relative: string) => {
    const info = await lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; }); if (!info) return;
    if (info.isSymbolicLink()) throw new Error('Published composition cannot contain symbolic links.');
    if (info.isDirectory()) for (const entry of (await readdir(file)).sort()) await walk(path.join(file, entry), relative + '/' + entry);
    else { hash.update(relative); hash.update('\0'); hash.update(await readFile(file)); hash.update('\0'); }
  };
  for (const relative of compositionSources) await walk(path.join(root, relative), relative);
  return hash.digest('hex');
}
export async function copyCompositionSnapshot(source: string, destination: string): Promise<void> {
  await compositionChecksum(source);
  for (const relative of compositionSources) {
    const file = path.join(source, relative);
    if (await lstat(file).catch(() => null)) await cp(file, path.join(destination, relative), { recursive: true, force: true });
  }
}
async function referencedSharedComponents(source: string, sharedRoot: string) {
  const [pages, shells, shared] = await Promise.all([
    new VisualArtifactService(path.join(source, 'src/pages'), 'page').list(),
    new VisualArtifactService(path.join(source, 'shells'), 'shell').list(),
    new VisualArtifactService(sharedRoot, 'component').list(),
  ]);
  const required = new Set([...pages, ...shells].flatMap(bundle => [...componentReferences(bundle.files.source), ...(bundle.metadata?.dependencies ?? [])]));
  const selected = new Map<string, typeof shared[number]>();
  for (const id of required) {
    if (selected.has(id)) continue;
    const bundle = shared.find(bundle => bundle.metadata?.componentId === id); if (!bundle) continue; // Package Components are resolved by the installed catalog.
    if (bundle.metadata?.developmentOnly || bundle.diagnostics.some(d => d.severity === 'error')) throw new Error(`Cannot publish invalid/development-only Component ${id}.`);
    selected.set(id, bundle);
    for (const dependency of [...componentReferences(bundle.files.source), ...(bundle.metadata?.dependencies ?? [])]) required.add(dependency);
  }
  return selected;
}
export async function compositionSourceFingerprint(source: string, sharedRoot: string): Promise<string> {
  const shared = await referencedSharedComponents(source, sharedRoot);
  return createHash('sha256').update(await compositionChecksum(source)).update(JSON.stringify([...shared].map(([id, bundle]) => [id, bundle.hash]).sort())).digest('hex');
}
export async function copyReferencedSharedComponents(source: string, destination: string, sharedRoot: string): Promise<void> {
  const service = new VisualArtifactService(sharedRoot, 'component');
  for (const [id, bundle] of await referencedSharedComponents(source, sharedRoot)) {
    if (!/^cmp_platform_[\w-]+$/.test(id)) throw new Error('Invalid shared Component identity.');
    const file = await service.file(bundle.locator);
    const stem = file.slice(0, -'.visual.json'.length);
    const { mkdir, copyFile } = await import('node:fs/promises');
    const target = path.join(destination, platformComponentSnapshotPath, id); await mkdir(target, { recursive: true });
    for (const extension of ['.html', '.css', '.visual.json', '.fixtures.json', '.functions.ts']) {
      try { await copyFile(stem + extension, path.join(target, 'component' + extension)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }
}
