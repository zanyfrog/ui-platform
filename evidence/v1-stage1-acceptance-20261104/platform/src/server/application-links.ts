import { readdir, readlink, rmdir, symlink, unlink } from 'node:fs/promises';
import path from 'node:path';

/** Rebase absolute npm workspace links before committing a staged application.
 * Relative links survive the rename unchanged. Never follow links while walking.
 */
export async function rebaseApplicationLinks(root: string, previousRoot: string, destinationRoot: string): Promise<void> {
  const previous = path.resolve(previousRoot);
  async function walk(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink()) {
        const target = await readlink(file);
        if (!path.isAbsolute(target)) continue;
        const relative = path.relative(previous, target);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) continue;
        const replacement = path.resolve(destinationRoot, relative);
        if (process.platform === 'win32') await rmdir(file);
        else await unlink(file);
        await symlink(replacement, file, process.platform === 'win32' ? 'junction' : 'dir');
      } else if (entry.isDirectory()) {
        await walk(file);
      }
    }
  }
  await walk(root);
}
