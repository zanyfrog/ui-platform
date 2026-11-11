import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it, vi } from 'vitest';
import { readRoleBundle, saveRoleBundle } from '@ui-platform/artifacts/storage';
import { createBuilderWorkspaceHandler } from '../src/server/builder-workspace.js';
import { withApplicationMutation } from '../src/server/composition-lock.js';
import { VisualArtifactService } from '../src/server/visual-artifacts.js';
import { prepareVisualSourcePlan } from '../src/server/visual-source-plan.js';

const fixture = vi.hoisted(() => ({ app: '' }));
vi.mock('../src/server/applications.js', () => ({ appPath: () => fixture.app, getApp: async () => ({ appId: 'test-owner' }) }));
vi.mock('../src/server/component-registry.js', () => ({ discoverComponents: async () => [] }));

it('refuses pending Visual journals without changing bytes and permits graph-ordered recovery', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  fixture.app = await mkdtemp(path.join(tmpdir(), 'builder-recovery-'));
  const root = path.join(fixture.app, 'src/pages');
  const directory = path.join(root, 'home');
  await mkdir(directory, { recursive: true });
  const files = {
    'page.visual.json': JSON.stringify({ schemaVersion: 1, kind: 'page', artifactId: 'art_home', name: 'home', displayName: 'Home', route: '/home' }),
    'page.html': '<main>Original</main>', 'page.css': '', 'page.fixtures.json': '{}', 'page.functions.ts': 'export {};',
  };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(directory, name), value);
  await writeFile(path.join(fixture.app, 'app.settings.json'), '{}');
  const location = { root, directory, anchor: 'page.visual.json', paths: Object.keys(files) };
  const handler = createBuilderWorkspaceHandler({
    authorize: async () => true, registeredApplication: () => 'test-owner', policyDigest: () => 'current',
  } as never, {
    workspacePrincipal: () => ({ subjectId: 'operator' }),
    workspaceArtifactDiscovery: async () => ({ artifacts: [], complete: true }),
    workspaceArtifacts: async () => [],
  } as never);
  async function validate() {
    let status = 0, body: unknown;
    await handler({ method: 'GET', url: '/api/apps/home/builder-workspace/validate' } as IncomingMessage, {
      writeHead(code: number) { status = code; return this; },
      end(value: string) { body = JSON.parse(value); },
    } as unknown as ServerResponse);
    return { status, body };
  }
  try {
    expect((await validate()).status).toBe(200);
    await withApplicationMutation(fixture.app, async () => {
      const original = await readRoleBundle(location);
      await expect(saveRoleBundle(location, {
        expectedChecksum: original.checksum, files: { ...files, 'page.html': '<main>Candidate</main>' },
        validate() {}, admit() {},
        beforeWrite(name) { if (name === 'page.visual.json') throw new Error('commit failed'); },
        beforeRollbackWrite() { throw new Error('rollback failed'); },
      })).rejects.toMatchObject({ code: 'source.recovery-required' });
    });
    const transactions = path.join(root, '.uib', 'transactions');
    const [transaction] = await readdir(transactions);
    const journal = path.join(transactions, transaction, 'pending.json');
    const hashes = () => Promise.all([journal, ...Object.keys(files).map(name => path.join(directory, name))]
      .map(async file => createHash('sha256').update(await readFile(file)).digest('hex')));
    const before = await hashes();
    expect(await validate()).toMatchObject({ status: 409, body: { code: 'WORKSPACE_SOURCE_RECOVERY_REQUIRED' } });
    expect(await hashes()).toEqual(before);
    await expect(withApplicationMutation(fixture.app, () => prepareVisualSourcePlan(fixture.app, new Map())))
      .rejects.toMatchObject({ code: 'source.recovery-required' });
    expect(await hashes()).toEqual(before);
    const service = new VisualArtifactService(root, 'page');
    await expect(service.recover(async () => { throw new Error('denied'); })).rejects.toThrow('denied');
    expect(await hashes()).toEqual(before);
    const entered = Promise.withResolvers<void>();
    const proceed = Promise.withResolvers<void>();
    const recovery = service.recover(async () => {
      entered.resolve();
      await proceed.promise;
    });
    await entered.promise;
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import { access } from 'node:fs/promises';
      const { withApplicationMutation } = await import('./src/server/composition-lock.ts');
      process.send('attempting');
      await withApplicationMutation(process.env.RECOVERY_APP, async () => {
        const journalExists = await access(process.env.RECOVERY_JOURNAL).then(() => true, error => {
          if (error.code !== 'ENOENT') throw error;
          return false;
        });
        process.send(journalExists ? 'overlap' : 'after-recovery');
      });
      process.disconnect();
    `], {
      env: { ...process.env, RECOVERY_APP: fixture.app, RECOVERY_JOURNAL: journal },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true,
    });
    try {
      const [attempt] = await once(child, 'message', { signal: AbortSignal.timeout(8000) });
      expect(attempt).toBe('attempting');
      expect(await hashes()).toEqual(before);
      const outcome = once(child, 'message', { signal: AbortSignal.timeout(8000) });
      proceed.resolve();
      const [result] = await outcome;
      expect(result).toBe('after-recovery');
    } finally {
      proceed.resolve();
      if (child.exitCode === null) child.kill();
      await recovery;
    }
    await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(directory, 'page.html'), 'utf8')).toBe(files['page.html']);
    expect((await validate()).status).toBe(200);
  } finally {
    vi.unstubAllEnvs();
  }
}, 20000);
