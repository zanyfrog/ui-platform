import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const fixtureApps = path.join(process.cwd(), '.test-presentation-apps');
process.env.UI_APPS_DIR = fixtureApps;

const { initializeApplicationPresentation, publishPresentation, removePresentationAsset, rollbackPresentation, savePresentationDraft, uploadPresentationAsset } = await import('../src/server/application-presentation.js');

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

  it('stages drafts and atomically activates a published presentation bundle', async () => {
    const initial = await initializeApplicationPresentation('presentation-test');
    const fixtureEntry = path.join(fixtureApps, 'presentation-test', 'src', 'main.ts');
    const legacyEntry = await readFile(fixtureEntry, 'utf8');
    await writeFile(fixtureEntry, legacyEntry.replace("import { composeApplicationPresentation } from '../presentation/runtime';\n", ''));
    const uploaded = await uploadPresentationAsset('presentation-test', { id: 'brand-mark', name: 'Brand mark', type: 'logo', filename: 'brand.svg', content: Buffer.from('<svg/>') });
    const draft = { ...uploaded.draft!, tokens: { ...uploaded.draft!.tokens, '--app-color-primary': '#123456' }, componentDefaults: { 'uib-hero': { theme: 'dark' }, 'uib-heading': { size: 'large', align: 'center' } }, heroes: { welcome: { id: 'welcome', enabled: true, variant: 'standard' as const, data: { headline: 'Welcome' } } }, layout: { ...uploaded.draft!.layout, routes: { '/': { heroId: 'welcome' } }, shells: { ...uploaded.draft!.layout.shells, authenticated: { ...uploaded.draft!.layout.shells.authenticated, logoAssetId: 'brand-mark' } } } };
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
