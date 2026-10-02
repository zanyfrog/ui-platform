import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
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
it('refuses a security artifact even when it is outside the suggested security folder', async () => {
  const app = await mkdtemp(path.join(tmpdir(), 'uib-export-security-')); created.push(app);
  const nested = path.join(app, 'features', 'role'); await mkdir(nested, { recursive: true });
  await writeFile(path.join(nested, 'artifact.json'), JSON.stringify({ artifactType: 'security.role' }));
  await expect(assertPortableSecurityBoundary(app)).rejects.toThrow('Blueprint security export validation');
});
it('refuses known operational security files outside the security folder', async () => {
  const app = await mkdtemp(path.join(tmpdir(), 'uib-export-security-')); created.push(app);
  await writeFile(path.join(app, 'credentials.json'), '{"token":"synthetic"}');
  await expect(assertPortableSecurityBoundary(app)).rejects.toThrow('Blueprint security export validation');
});
