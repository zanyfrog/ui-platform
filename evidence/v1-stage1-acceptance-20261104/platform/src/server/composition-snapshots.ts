import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { componentReferences } from '@ui-platform/visual-artifacts';
import { VisualArtifactService } from './visual-artifacts.js';
import { readRoleBundle, recoverRoleBundleRoot } from '@ui-platform/artifacts/storage';

export const compositionSources = ['app.settings.json', 'shells', 'menus', 'styles', 'assets', 'src/pages'] as const;
// Frozen distribution dependencies retain Platform identity; this is not an editable
// Application Component collection and is never exposed through Component management.
export const platformComponentSnapshotPath = 'presentation/platform-components';
export async function compositionSourceFiles(root: string, immutable = /\/presentation\/versions\/v\d+\/composition$/.test(root.replaceAll('\\', '/'))): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  if (!immutable) for (const collection of ['shells', 'src/pages']) await recoverRoleBundleRoot(path.join(root, collection));
  const walk = async (file: string, relative: string) => {
    const info = await lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; }); if (!info) return;
    if (info.isSymbolicLink()) throw new Error('Published composition cannot contain symbolic links.');
    if (info.isDirectory()) {
      const entries = (await readdir(file)).filter(entry => entry !== '.uib').sort();
      if (!immutable) for (const anchor of entries.filter(entry => entry.endsWith('.visual.json'))) {
        const stem = anchor.slice(0, -'.visual.json'.length), paths = ['.html', '.css', '.visual.json', '.fixtures.json', '.functions.ts'].map(extension => stem + extension);
        const owner = relative.startsWith('src/pages') ? path.join(root, 'src/pages') : path.join(root, 'shells');
        const snapshot = await readRoleBundle({ root: owner, directory: file, anchor, paths });
        for (const [name, content] of Object.entries(snapshot.files)) if (content !== null) files.set(relative + '/' + name, Buffer.from(content));
      }
      for (const entry of entries) if (!files.has(relative + '/' + entry)) await walk(path.join(file, entry), relative + '/' + entry);
    } else files.set(relative, await readFile(file));
  };
  for (const relative of compositionSources) await walk(path.join(root, relative), relative);
  return files;
}
export async function compositionChecksum(root: string): Promise<string> {
  const hash = createHash('sha256');
  for (const [relative, content] of [...await compositionSourceFiles(root)].sort(([a], [b]) => a.localeCompare(b))) { hash.update(relative); hash.update('\0'); hash.update(content); hash.update('\0'); }
  return hash.digest('hex');
}
export async function copyCompositionSnapshot(source: string, destination: string): Promise<void> {
  for (const [relative, content] of await compositionSourceFiles(source)) { const target = path.join(destination, relative); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); }
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
    const { mkdir, writeFile } = await import('node:fs/promises');
    const target = path.join(destination, platformComponentSnapshotPath, id); await mkdir(target, { recursive: true });
    // Use the recovery-checked captured bytes, never reread roles independently.
    for (const [role, extension] of Object.entries({ source: '.html', css: '.css', metadata: '.visual.json', fixtures: '.fixtures.json', code: '.functions.ts' })) await writeFile(path.join(target, 'component' + extension), bundle.files[role as keyof typeof bundle.files]);
  }
}
