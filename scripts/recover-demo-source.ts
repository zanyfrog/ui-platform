import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { withRoleBundleGraph, recoverRoleBundleRoot, readRoleBundle } from '@ui-platform/artifacts/storage';

/** Explicit local startup recovery; runtime readers remain recovery-free. */
export async function recoverDemoSource(root: string): Promise<void> {
  if (!await stat(root).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) return;
  await withRoleBundleGraph(root, async () => {
    await recoverRoleBundleRoot(root);
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(file);
        else if (entry.isFile() && entry.name.endsWith('.visual.json')) {
          const stem = entry.name.slice(0, -'.visual.json'.length);
          await readRoleBundle({ root, directory, anchor: entry.name,
            paths: ['.visual.json', '.html', '.css', '.functions.ts', '.fixtures.json'].map(extension => stem + extension) });
        }
      }
    };
    await walk(root);
  });
}
