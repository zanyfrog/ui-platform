import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readRoleBundle, saveRoleBundle } from '@ui-platform/artifacts/storage';
import { storageKey } from '../packages/artifacts/src/storage.js';

const fixtureApps = path.join(process.cwd(), '.test-presentation-apps');
process.env.UI_APPS_DIR = fixtureApps;

const { getApplicationPresentation, initializeApplicationPresentation, publishPresentation, rollbackPresentation, savePresentationDraft } = await import('../src/server/application-presentation.js');
const { listApplicationRecovery, recoverApplicationSource } = await import('../src/server/application-source-recovery.js');

async function createFixtureApp(): Promise<void> {
  const app = path.join(fixtureApps, 'presentation-test');
  await mkdir(path.join(app, 'src', 'pages'), { recursive: true });
  await Promise.all([
    writeFile(path.join(app, 'package.json'), '{}'),
    writeFile(path.join(app, 'tsconfig.json'), '{}'),
    writeFile(path.join(app, 'app.manifest.json'), JSON.stringify({ manifestVersion: '1.0.0', appId: 'presentation-test-id', template: 'standard', templateVersion: '1.0.0', packages: {}, foundationImports: {} })),
    writeFile(path.join(app, 'app.settings.json'), JSON.stringify({ application: { name: 'Presentation test', status: 'active' } })),
    writeFile(path.join(app, 'app-services.json'), '{}'),
    writeFile(path.join(app, 'src', 'pages', 'index.ts'), 'export default {};'),
    writeFile(path.join(app, 'src', 'main.ts'), "import '@ui-app/app-services';\nconst root = document.querySelector('#app');\nconst page = { render: async () => '<h1>Home</h1>' }; const config = {}; const route = '/'; const navigate = () => {};\nroot!.innerHTML = await page.render({ settings: config, route, navigate });\n"),
  ]);
}

describe('application presentation lifecycle', () => {
  beforeEach(async () => {
    await rm(fixtureApps, { recursive: true, force: true });
    await createFixtureApp();
  });

  afterAll(async () => { await rm(fixtureApps, { recursive: true, force: true }); });

  it('refuses status, draft and publication operations without replaying a retained journal', async () => {
    const key = 'presentation-test';
    const initialized = await initializeApplicationPresentation(key);
    const root = path.join(fixtureApps, key, 'presentation');
    const anchor = 'presentation.manifest.json';
    const paths = [anchor, 'draft/presentation.json'];
    const location = { root, directory: root, anchor, paths };
    const original = await readRoleBundle(location);
    await expect(saveRoleBundle(location, {
      expectedChecksum: original.checksum, files: { ...original.files, [anchor]: '{}' },
      validate() {}, admit() {},
      beforeWrite() { throw new Error('interrupted commit'); },
      beforeRollbackWrite() { throw new Error('interrupted rollback'); },
    })).rejects.toMatchObject({ code: 'source.recovery-required' });
    const journal = path.join(root, '.uib/transactions', storageKey(path.join(root, anchor)), 'pending.json');
    const hashes = () => Promise.all([journal, ...paths.map(file => path.join(root, file))]
      .map(async file => createHash('sha256').update(await readFile(file)).digest('hex')));
    const before = await hashes();
    await expect(getApplicationPresentation(key)).rejects.toMatchObject({ code: 'source.recovery-required' });
    await expect(savePresentationDraft(key, initialized.draft, initialized.sourceRevision)).rejects.toMatchObject({ code: 'source.recovery-required' });
    await expect(publishPresentation(key)).rejects.toMatchObject({ code: 'source.recovery-required' });
    expect(await hashes()).toEqual(before);
    const [approval] = await listApplicationRecovery(key, async () => {});
    expect(approval.type).toBe('presentation');
    await expect(recoverApplicationSource(key, approval, 'test-operator', async () => { throw new Error('denied'); }))
      .rejects.toThrow('denied');
    await expect(recoverApplicationSource(key, { ...approval, journalSha256: '0'.repeat(64) }, 'test-operator', async () => {}))
      .rejects.toThrow('changed');
    await expect(recoverApplicationSource(key, { ...approval, sourceRevision: '0'.repeat(64) }, 'test-operator', async () => {}))
      .rejects.toThrow('changed');
    expect(await hashes()).toEqual(before);
    await expect(recoverApplicationSource(key, approval, 'test-operator', async () => {}))
      .resolves.toMatchObject({ outcome: 'succeeded' });
    await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(getApplicationPresentation(key)).resolves.toMatchObject({ initialized: true, sourceRevision: original.checksum });
  });

  it.each(['visual', 'artifact'] as const)('recovers the exact %s bundle through an opaque target', async type => {
    const key = 'presentation-test', app = path.join(fixtureApps, key);
    const root = type === 'visual' ? path.join(app, 'src/pages') : app;
    const directory = path.join(root, 'recoverable');
    await mkdir(directory, { recursive: true });
    const anchor = type === 'visual' ? 'page.visual.json' : 'artifact.json';
    const identity = path.join(directory, anchor);
    const original: Record<string, string> = type === 'visual' ? {
      [anchor]: JSON.stringify({ schemaVersion: 1, artifactId: 'art_recoverable', kind: 'page' }),
      'page.html': '<main>Original</main>', 'page.css': '', 'page.fixtures.json': '{}', 'page.functions.ts': 'export {};',
    } : {
      [anchor]: JSON.stringify({ schemaVersion: 1, artifactId: 'recoverable', artifactType: 'form', files: { definition: 'form.json' } }),
      'form.json': '{"fields":[]}',
    };
    for (const [file, bytes] of Object.entries(original)) await writeFile(path.join(directory, file), bytes);
    const edited = type === 'visual' ? 'page.html' : 'form.json';
    await writeFile(path.join(directory, edited), 'interrupted');
    const transaction = path.join(root, '.uib/transactions', storageKey(type === 'visual' ? identity : directory));
    await mkdir(transaction, { recursive: true });
    const journal = path.join(transaction, 'pending.json');
    await writeFile(journal, JSON.stringify({ original, ...(type === 'visual' ? { bundle: directory, identity } : {}) }));
    const [approval] = await listApplicationRecovery(key, async () => {});
    expect(approval).toMatchObject({ type, targetId: expect.stringMatching(/^[a-f0-9]{64}$/) });
    const pending = await readFile(journal);
    let calls = 0;
    await expect(recoverApplicationSource(key, approval, 'test-operator', async () => {
      if (++calls === 3) throw new Error('permission changed');
    })).rejects.toThrow('permission changed');
    expect(await readFile(journal)).toEqual(pending);
    expect(await readFile(path.join(directory, edited), 'utf8')).toBe('interrupted');
    await expect(recoverApplicationSource(key, approval, 'test-operator', async () => {}))
      .resolves.toMatchObject({ outcome: 'succeeded' });
    expect(await readFile(path.join(directory, edited), 'utf8')).toBe(original[edited]);
    await expect(readFile(journal)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects unsupported visual values and page-owned semantic settings', async () => {
    const initial = await initializeApplicationPresentation('presentation-test');
    await expect(savePresentationDraft('presentation-test', {
      ...initial.draft!, componentDefaults: { 'uib-hero': { theme: 'unsupported-theme' } },
    })).rejects.toThrow('must be one of its declared options');
    await expect(savePresentationDraft('presentation-test', {
      ...initial.draft!, componentDefaults: { 'uib-heading': { level: 1 } },
    })).rejects.toThrow('is not an application-presentation setting');
  });

  it('stages drafts and atomically activates a published presentation bundle', async () => {
    const initial = await initializeApplicationPresentation('presentation-test');
    const fixtureEntry = path.join(fixtureApps, 'presentation-test', 'src', 'main.ts');
    const legacyEntry = await readFile(fixtureEntry, 'utf8');
    await writeFile(fixtureEntry, legacyEntry.replace("import { composeApplicationPresentation } from '../presentation/runtime';\n", ''));
    const uploaded = await uploadPresentationAsset('presentation-test', { id: 'brand-mark', name: 'Brand mark', type: 'logo', filename: 'brand.svg', content: Buffer.from('<svg/>') });
    const draft = { ...uploaded.draft!, tokens: { ...uploaded.draft!.tokens, '--app-color-primary': '#123456' }, componentDefaults: { 'uib-hero': { theme: 'dark' }, 'uib-heading': { size: 'large', align: 'center' }, 'uib-card': { variant: 'outlined', density: 'compact' }, 'uib-panel': { variant: 'flat', density: 'compact' }, 'uib-instruction': { density: 'compact' }, 'uib-heading-block': { size: 'large', align: 'center' }, 'uib-action-group': { align: 'center' } }, heroes: { welcome: { id: 'welcome', enabled: true, variant: 'standard' as const, data: { headline: 'Welcome' } } }, layout: { ...uploaded.draft!.layout, routes: { '/': { heroId: 'welcome' } }, shells: { ...uploaded.draft!.layout.shells, authenticated: { ...uploaded.draft!.layout.shells.authenticated, logoAssetId: 'brand-mark' } } } };
    await savePresentationDraft('presentation-test', draft);

    const app = path.join(fixtureApps, 'presentation-test', 'presentation');
    expect(await readFile(path.join(app, 'runtime.ts'), 'utf8')).not.toContain('brand-mark');
    expect(await readFile(path.join(app, 'draft', 'assets', 'brand-mark', 'brand.svg'), 'utf8')).toContain('<svg/>');

    const published = await publishPresentation('presentation-test');
    expect(published.manifest!.activeVersion).toBe(1);
    expect(await readFile(path.join(app, 'active.css'), 'utf8')).toContain('#123456');
    const runtime = await readFile(path.join(app, 'runtime.ts'), 'utf8');
    const entry = await readFile(fixtureEntry, 'utf8');
    expect(runtime).toContain('brand-mark');
    expect(runtime).toContain('<uib-hero');
    expect(runtime).toContain('pageContent');
    expect(runtime).toContain('"theme":"dark"');
    expect(runtime).toContain('"uib-heading":{"size":"large","align":"center"}');
    expect(runtime).toContain('"uib-card":{"variant":"outlined","density":"compact"}');
    expect(runtime).toContain('"uib-panel":{"variant":"flat","density":"compact"}');
    expect(runtime).toContain('"uib-instruction":{"density":"compact"}');
    expect(runtime).toContain('"uib-heading-block":{"size":"large","align":"center"}');
    expect(runtime).toContain('"uib-action-group":{"align":"center"}');
    expect(runtime).toContain('Object.entries(componentDefaults).reduce');
    expect(runtime).toContain("tagName === 'uib-hero' ? content");
    expect(runtime).not.toContain("applyComponentDefaults(input.content, 'uib-card'");
    expect(runtime).not.toContain("applyComponentDefaults(input.content, 'uib-panel'");
    expect(runtime).toContain('applyComponentDefaults');
    expect(entry).toContain("import { composeApplicationPresentation } from '../presentation/runtime';");
    expect(entry).toContain('root!.innerHTML = composeApplicationPresentation(');
    expect(entry.match(/ui-presentation-draft-css/g)).toHaveLength(1);
    expect(await readFile(path.join(app, 'versions', 'v1', 'assets', 'brand-mark', 'brand.svg'), 'utf8')).toContain('<svg/>');
    await expect(removePresentationAsset('presentation-test', 'brand-mark')).rejects.toThrow('still in use');
    expect(initial.manifest!.activeVersion).toBeNull();
  });

  it('restores a historical version only into the draft', async () => {
    const initialized = await initializeApplicationPresentation('presentation-test');
    await savePresentationDraft('presentation-test', { ...initialized.draft!, tokens: { ...initialized.draft!.tokens, '--app-color-primary': '#111111' } });
    await publishPresentation('presentation-test');
    const changed = await savePresentationDraft('presentation-test', { ...initialized.draft!, tokens: { ...initialized.draft!.tokens, '--app-color-primary': '#222222' } });
    await publishPresentation('presentation-test');

    const restored = await rollbackPresentation('presentation-test', 1);
    expect(restored.manifest!.activeVersion).toBe(2);
    expect(restored.draft!.tokens['--app-color-primary']).toBe('#111111');
    expect(restored.draftDiffersFromActive).toBe(true);
    expect(changed.draft!.tokens['--app-color-primary']).toBe('#222222');
  });
});
