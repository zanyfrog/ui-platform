import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { assertPortableSecurityBoundary } from '../src/server/exporter.js';

const created: string[] = [];
afterEach(async () => { for (const directory of created.splice(0)) await rm(directory, { recursive: true, force: true }); });
it('keeps ordinary applications exportable while refusing an unreviewed security root', async () => {
  const app = await mkdtemp(path.join(tmpdir(), 'uib-export-security-')); created.push(app);
  await expect(assertPortableSecurityBoundary(app)).resolves.toBeUndefined();
  await mkdir(path.join(app, 'security'));
  await expect(assertPortableSecurityBoundary(app)).rejects.toThrow('Blueprint security export validation');
});
