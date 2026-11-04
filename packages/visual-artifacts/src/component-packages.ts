import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const componentPackageDirectory = 'presentation/component-packages';
const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const packageName = (name: string) => /^@ui-base\/[a-z0-9-]+$/.test(name);
/** Capture admitted packages and their UI-Base dependency closure in the existing release. */
export async function captureComponentPackages(destination: string, names: string[], resolve: (name: string) => Promise<string>, admission?: Record<string, string[]>) {
  const root = path.join(destination, componentPackageDirectory), files: Record<string, string> = {}, versions: Record<string, string> = {};
  await mkdir(root, { recursive: true });
  for (const name of new Set(names)) {
    if (!packageName(name)) throw new Error('Unsupported component package owner.');
    const source = await resolve(name), metadata = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
    if (metadata.name !== name || typeof metadata.version !== 'string') throw new Error('Component package identity is invalid.');
    versions[name] = metadata.version;
    // The caller resolves the complete dependency closure before capture.
    const walk = async (relative: string) => {
      const file = path.join(source, relative), info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error('Published component packages must be physical files.');
      if (info.isDirectory()) { for (const child of (await readdir(file)).sort()) if (!['node_modules', '.git', '.uib', '.vite'].includes(child)) await walk(path.join(relative, child)); }
      else {
        let bytes = await readFile(file);
        if (relative === 'ui.component.json' && admission) {
          const manifest = JSON.parse(bytes.toString('utf8'));
          manifest.components = (manifest.components ?? []).filter((entry: { tagName: string }) => admission[name]?.includes(entry.tagName));
          bytes = Buffer.from(JSON.stringify(manifest));
        }
        const key = path.posix.join('node_modules', name, relative.replaceAll('\\', '/')); files[key] = digest(bytes); await mkdir(path.dirname(path.join(root, key)), { recursive: true }); await writeFile(path.join(root, key), bytes);
      }
    };
    await walk('');
  }
  const metadata = Buffer.from(JSON.stringify({ dependencies: versions }));
  files['package.json'] = digest(metadata); await writeFile(path.join(root, 'package.json'), metadata);
  const integrity = Buffer.from(JSON.stringify({ schemaVersion: 1, versions, files }, null, 2));
  await writeFile(path.join(root, 'integrity.json'), integrity);
  return digest(integrity);
}
export async function verifyComponentPackages(root: string, expectedHash?: string): Promise<void> {
  const bytes = await readFile(path.join(root, 'integrity.json'));
  if (expectedHash && digest(bytes) !== expectedHash) throw new Error('Frozen component package manifest integrity mismatch.');
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.files || !manifest.versions) throw new Error('Invalid frozen component package manifest.');
  const inventory = async (relative = '') => {
    const file = path.join(root, relative), info = await lstat(file);
    if (info.isSymbolicLink()) throw new Error('Frozen package links are forbidden.');
    if (info.isDirectory()) for (const child of await readdir(file)) await inventory(path.posix.join(relative, child));
    else if (relative !== 'integrity.json' && !Object.hasOwn(manifest.files, relative)) throw new Error('Unlisted frozen component package file: ' + relative);
  };
  await inventory();
  for (const [relative, hash] of Object.entries(manifest.files)) {
    const file = path.resolve(root, relative), inside = path.relative(root, file);
    if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) throw new Error('Invalid frozen package path.');
    let current = file;
    while (current !== path.resolve(root)) { if ((await lstat(current)).isSymbolicLink()) throw new Error('Frozen package links are forbidden.'); current = path.dirname(current); }
    if (digest(await readFile(file)) !== hash) throw new Error('Frozen component package integrity mismatch: ' + relative);
  }
}
