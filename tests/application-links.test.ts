import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { rebaseApplicationLinks } from '../src/server/application-links.js';

it('preserves workspace resolution after renaming a staged application', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'app-links-'));
  const staging = path.join(root, '.creating-app');
  const destination = path.join(root, 'app');
  try {
    await mkdir(path.join(staging, 'packages/services'), { recursive: true });
    await mkdir(path.join(staging, 'node_modules/@ui-app'), { recursive: true });
    await writeFile(path.join(staging, 'packages/services/index.js'), 'export {};');
    await symlink(path.join(staging, 'packages/services'), path.join(staging, 'node_modules/@ui-app/services'), process.platform === 'win32' ? 'junction' : 'dir');
    await rebaseApplicationLinks(path.join(staging, 'node_modules'), staging, destination);
    await rename(staging, destination);
    expect(await readFile(path.join(destination, 'node_modules/@ui-app/services/index.js'), 'utf8')).toBe('export {};');
  } finally { await rm(root, { recursive: true, force: true }); }
});
