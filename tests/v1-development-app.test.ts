import { afterEach, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureV1DevelopmentApplication } from '../src/server/v1-development-app.js';
import { V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY } from '../src/server/v1-development-policy.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

it('creates the deterministic disposable app once and refuses to claim an unmarked app directory', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-app-')); roots.push(root);
  await ensureV1DevelopmentApplication(root);
  const app = path.join(root, V1_FIXTURE_APPLICATION_KEY);
  expect(JSON.parse(await readFile(path.join(app, 'app.manifest.json'), 'utf8')).appId).toBe(V1_FIXTURE_APPLICATION_ID);
  await ensureV1DevelopmentApplication(root);
  await unlink(path.join(app, '.v1-development-fixture.json'));
  await expect(ensureV1DevelopmentApplication(root)).rejects.toThrow('V1_FIXTURE_APPLICATION_CONFLICT');
});
