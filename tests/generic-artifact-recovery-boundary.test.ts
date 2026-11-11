import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { storageKey } from '../packages/artifacts/src/storage.js';

it('prevents an independent save from overwriting a competing save from the same checksum', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'managed-artifact-writer-'));
  const bundle = path.join(root, 'form');
  await mkdir(bundle);
  await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify({
    schemaVersion: 1, definitionVersion: 1, artifactId: 'form', artifactType: 'form', name: 'Form',
    files: { definition: 'form.json' },
  }));
  const source = path.join(bundle, 'form.json');
  await writeFile(source, '{"fields":[]}');
  const code = `
    const { ArtifactEditorWorkspace } = await import('./src/server/artifact-editor.ts');
    const workspace = new ArtifactEditorWorkspace(process.env.WITNESS_ROOT, 'witness');
    const bundle = process.env.WITNESS_BUNDLE;
    try {
      const result = await workspace.save(workspace.locator(bundle), {
        expectedChecksum: process.env.WITNESS_CHECKSUM,
        files: {'form.json':'{"fields":[],"witness":true}'}, mode: 'repair',
      }, 'fixture-operator', async () => {
        if (process.env.WITNESS_MODE !== 'hold') return;
        const proceed = new Promise(resolve => process.once('message', resolve));
        process.send('admitted');
        await proceed;
      });
      process.send(result.saved ? 'settled' : 'unsaved');
    } catch (error) { process.send(error.message); }
    process.disconnect();
  `;
  const workspace = new ArtifactEditorWorkspace(root, 'witness');
  const current = await workspace.service.load(bundle);
  const children: ReturnType<typeof spawn>[] = [];
  const start = (mode: string) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], {
      env: { ...process.env, WITNESS_ROOT: root, WITNESS_BUNDLE: bundle, WITNESS_CHECKSUM: current.checksum, WITNESS_MODE: mode },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'], windowsHide: true,
    });
    children.push(child);
    return child;
  };
  const message = async (child: ReturnType<typeof spawn>) =>
    (await once(child, 'message', { signal: AbortSignal.timeout(8000) }))[0];
  const before = await readFile(source);
  try {
    const writer = start('hold');
    expect(await message(writer)).toBe('admitted');
    expect(await message(start('compete'))).toMatch(/locked by another writer/i);
    expect(await readFile(source)).toEqual(before);
    const settled = message(writer);
    writer.send('continue');
    expect(await settled).toBe('settled');
    const saved = await readFile(source);
    expect(JSON.parse(saved.toString())).toMatchObject({ witness: true });
    expect(await message(start('compete'))).toMatch(/changed since it was loaded/i);
    expect(await readFile(source)).toEqual(saved);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
  }
}, 20000);
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';
import { startApplicationArtifactWatchers } from '../src/server/artifact-watcher.js';

it('refuses a generic journal in the editor and the injected watcher without replay', async () => {
  const apps = await mkdtemp(path.join(tmpdir(), 'generic-recovery-'));
  const root = path.join(apps, 'app');
  const bundle = path.join(root, 'form');
  await mkdir(bundle, { recursive: true });
  await writeFile(path.join(root, 'app.manifest.json'), '{"appId":"fixture-owner"}');
  const manifest = JSON.stringify({
    schemaVersion: 1, artifactId: 'form', artifactType: 'form', name: 'form',
    definitionVersion: 1, files: { definition: 'form.json' },
  });
  const source = path.join(bundle, 'form.json');
  await writeFile(path.join(bundle, 'artifact.json'), manifest);
  await writeFile(source, '{"fields":[null]}');
  const transaction = path.join(root, '.uib/transactions', storageKey(bundle));
  await mkdir(transaction, { recursive: true });
  const journal = path.join(transaction, 'pending.json');
  await writeFile(journal, JSON.stringify({ bundle, original: { 'artifact.json': manifest, 'form.json': '{"fields":[]}' } }));
  const hashes = () => Promise.all([journal, source, path.join(bundle, 'artifact.json')]
    .map(async file => createHash('sha256').update(await readFile(file)).digest('hex')));
  const before = await hashes();
  const editor = new ArtifactEditorWorkspace(root, 'app');
  await expect(editor.discover()).rejects.toMatchObject({ code: 'source.recovery-required' });
  const errors: Error[] = [];
  const watcher = await startApplicationArtifactWatchers(apps, () => {}, error => errors.push(error), 1500, {
    get: () => editor.service, removed() {}, changed() {},
  });
  try {
    expect(errors).toEqual([expect.objectContaining({ code: 'source.recovery-required' })]);
    expect(await hashes()).toEqual(before);
  } finally {
    await watcher.close();
  }
});
