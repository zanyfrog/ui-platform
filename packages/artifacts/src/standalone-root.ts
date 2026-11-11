import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function contains(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

async function physicalPath(file: string): Promise<string> {
  try { return await realpath(file); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    // A broken link is ambiguous, not a new path.
    if (await exists(file)) throw new Error('FOUNDATION_ROOT_UNRESOLVED');
    const parent = path.dirname(file);
    if (parent === file) throw error;
    return path.join(await physicalPath(parent), path.basename(file));
  }
}

async function exists(file: string): Promise<boolean> {
  try { await lstat(file); return true; }
  catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) return false;
    throw error;
  }
}

export async function assertStandaloneRoot(input: string, requireExisting = true): Promise<void> {
  const requested = path.resolve(input);
  const physical = await physicalPath(requested);
  const installation = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const manifest = await readFile(path.join(installation, 'package.json'), 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  const managed = process.env.UI_APPS_DIR ? [path.resolve(process.env.UI_APPS_DIR)] : [];
  if (manifest && JSON.parse(manifest).name === 'ui-platform') {
    managed.push(path.resolve(installation, '../apps'), path.join(installation, 'components'));
  }
  for (const root of managed) {
    const canonical = await physicalPath(root);
    if ([requested, physical].some(target => contains(root, target) || contains(canonical, target) ||
        contains(target, root) || contains(target, canonical))) throw new Error('FOUNDATION_MANAGED_ROOT_REFUSED');
  }
  for (const target of new Set([requested, physical])) {
    for (let current = target; ; current = path.dirname(current)) {
      // Any owner record, including malformed or linked records, requires the managed host.
      if (await exists(path.join(current, 'app.manifest.json'))) throw new Error('FOUNDATION_MANAGED_ROOT_REFUSED');
      if (current === path.dirname(current)) break;
    }
  }
  if (requireExisting && !(await exists(physical))) throw new Error('FOUNDATION_ROOT_UNRESOLVED');
}
