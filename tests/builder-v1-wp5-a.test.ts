import { afterEach, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { withRuntimeGraphRead } from '@ui-platform/visual-artifacts/vite';
import { compositionDiagnostics, validateCompositionDefinition, type CompositionDefinition, type RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { workspaceIdentityKey, type WorkspaceIdentity } from '../src/shared/builder-workspace.js';
import { validateCapturedApplication, type CapturedValidationSource, type ValidationAdmission } from '../src/server/application-diagnostics.js';
import { capturedAutomationSource, capturedGenericSource, capturedVisualSource, compositionSourceDiagnostics, genericDiagnostics, registeredAutomationCatalog, resolveDiagnosticReferences, visualSourceReferences } from '../src/server/application-diagnostic-adapters.js';
import { AutomationStore } from '../src/server/automation-store.js';
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';
import { VisualArtifactService, toRuntime } from '../src/server/visual-artifacts.js';

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); });
async function temporary() { const root = await mkdtemp(path.join(tmpdir(), 'wp5-a-')); roots.push(root); return root; }
const identity = (id: string, owner = 'app-one'): WorkspaceIdentity => ({ owner: { kind: 'application', id: owner }, format: 'visual', id });
const admission = (): ValidationAdmission => ({ assertAuthority: vi.fn(async () => {}), canRead: vi.fn(async () => true), revisionsCurrent: vi.fn(async () => true) });
const source = (id: string, dependencies: WorkspaceIdentity[] = [], message?: string): CapturedValidationSource => ({ identity: identity(id), revision: 'revision-' + id, subsystem: 'native', async validate() {
  return { dependencies, complete: true, diagnostics: message ? [{ severity: 'error', code: 'native.test', message, subsystem: 'native' }] : [] };
} });
const region = '<section data-uip-node="main" class="uip-layout-item" data-uip-region="region-main" data-uip-region-name="Main"></section>';
function composition(): CompositionDefinition {
  const shell: RuntimeArtifact = { metadata: { schemaVersion: 1, artifactId: 'art_shell_one', kind: 'shell', name: 'public', displayName: 'Public' }, source: region, css: '' };
  const page: RuntimeArtifact = { metadata: { schemaVersion: 1, artifactId: 'art_page_one', kind: 'page', name: 'home', displayName: 'Home', routeId: 'route-home', route: '/', shellId: 'art_shell_one' }, source: region, css: '' };
  return { settings: { model: 'composition-v1', assetsRoot: 'assets', defaultShellId: 'art_shell_one', branding: { applicationName: 'Test' }, siteStyles: [], theme: {} }, shells: [shell], pages: [page], menus: [], routes: [{ routeId: 'route-home', pageId: 'art_page_one', path: '/' }], siteCss: '' };
}

it('collects independent composition failures in the authoritative validator and keeps the throwing API', () => {
  const definition = composition();
  expect(compositionDiagnostics(definition, [])).toEqual([]);
  definition.settings.defaultShellId = 'missing';
  definition.pages[0].metadata.shellId = 'missing';
  definition.pages[0].metadata.route = 'bad?route';
  definition.settings.shellConfiguration = { 'missing-two': { title: 3 } };
  const codes = compositionDiagnostics(definition, []).map(d => d.code);
  expect(codes).toEqual(expect.arrayContaining(['composition.default-shell', 'composition.page-identities', 'composition.route-path', 'composition.route-capture', 'composition.shell-configuration']));
  expect(() => validateCompositionDefinition(definition, [])).toThrow();
  expect(compositionSourceDiagnostics(identity('settings'), definition, [], [], (_, id) => identity(id)).some(d => d.target?.identity.id === 'art_page_one' && d.target.field === 'route')).toBe(true);
  const fallback = compositionSourceDiagnostics(identity('settings'), definition, [], [], () => undefined).find(d => d.code === 'composition.route-path')!;
  expect(fallback.target).toEqual({ identity: identity('settings') });
});

it('reports route collisions, separate Menu failures and independent property failures', () => {
  const definition = composition();
  definition.pages.push(structuredClone(definition.pages[0]));
  definition.pages[1].metadata.artifactId = 'art_page_two';
  definition.menus = [
    { schemaVersion: 1, menuId: 'bad-menu', name: 'Bad', items: [{ itemId: 'unsafe', label: 'Unsafe', destination: { kind: 'url', url: 'javascript:bad()' } }] },
    { schemaVersion: 1, menuId: 'bad-menu', name: 'Duplicate', items: [] },
  ];
  definition.shells[0].metadata.public = { properties: { heading: { type: 'string' } }, events: {}, slots: [] };
  definition.settings.shellConfiguration = { 'art_shell_one': { heading: 4, absent: true } };
  const ds = compositionDiagnostics(definition, []);
  expect(ds.map(d => d.code)).toEqual(expect.arrayContaining(['composition.route-duplicate', 'composition.menu', 'composition.menu-duplicate']));
  expect(ds.filter(d => d.code === 'composition.shell-property')).toHaveLength(2);
});

it('retains independent diagnostics when parsed metadata has malformed types', async () => {
  const definition = composition();
  definition.pages[0].metadata.route = 4 as unknown as string;
  definition.pages[0].metadata.dependencies = 4 as unknown as string[];
  definition.settings.defaultShellId = 'missing';
  definition.settings.shellConfiguration = { art_shell_one: null as unknown as Record<string, unknown> };
  const diagnostics = compositionDiagnostics(definition, []);
  expect(diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['composition.dependencies', 'composition.page-validation', 'composition.default-shell', 'composition.shell-configuration']));
  const page = definition.pages[0];
  const captured = capturedVisualSource(identity('page'), 'revision', page, [], [], [], () => undefined, { source: page.source, metadata: JSON.stringify(page.metadata), css: '', fixtures: '{}', code: '' });
  const result = await captured.validate();
  expect(result.complete).toBe(false);
  expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['visual.validation', 'application.references-incomplete']));
});

it('retains unrelated draft errors while blocking only reachable failures with owner-qualified identities', async () => {
  const other = { ...source('same', [], 'Other owner draft'), identity: identity('same', 'app-two') };
  const report = await validateCapturedApplication([source('same'), other], [identity('same')], admission());
  expect(report.publishable).toBe(true); expect(report.diagnostics).toHaveLength(1); expect(report.blockers).toEqual([]);
  expect(report.reachable).toEqual([workspaceIdentityKey(identity('same'))]);
  const linked = await validateCapturedApplication([source('same', [other.identity]), other], [identity('same')], admission());
  expect(linked.publishable).toBe(false); expect(linked.blockers).toHaveLength(1);
});

it('continues after unreadable sources and suppresses raw exceptions and denied source identities', async () => {
  const denied = { ...source('secret-id'), validate: vi.fn(async () => { throw new Error('secret source'); }) };
  const broken = { ...source('broken'), async validate(): Promise<never> { throw new Error('C:/secret/private.json with secret content'); } };
  const gate = admission(); gate.canRead = async id => id.id !== 'secret-id';
  const result = await validateCapturedApplication([source('page', [identity('broken'), denied.identity]), broken, denied, source('independent', [], 'Independent error')], [identity('page')], gate);
  expect(result.status).toBe('incomplete'); expect(result.publishable).toBe(false); expect(denied.validate).not.toHaveBeenCalled();
  expect(result.diagnostics.some(d => d.message === 'Independent error')).toBe(true);
  expect(JSON.stringify(result)).not.toMatch(/secret|private\.json/);
});

it('does not add a denied unrelated draft to release closure', async () => {
  const gate = admission(); gate.canRead = async id => id.id !== 'private-draft';
  const result = await validateCapturedApplication([source('page'), source('private-draft')], [identity('page')], gate);
  expect(result.status).toBe('incomplete'); expect(result.publishable).toBe(true); expect(result.blockers).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('private-draft');
});

it('fails closed for missing roots, ambiguous identities and cyclic references without recursion failure', async () => {
  expect((await validateCapturedApplication([], [], admission())).publishable).toBe(false);
  const missing = await validateCapturedApplication([], [identity('missing')], admission());
  expect(missing.publishable).toBe(false); expect(missing.status).toBe('incomplete');
  const duplicate = await validateCapturedApplication([source('a'), source('a')], [identity('a')], admission());
  expect(duplicate.publishable).toBe(false); expect(duplicate.diagnostics[0].code).toBe('application.identity-ambiguous');
  const cycle = await validateCapturedApplication([source('a', [identity('b')]), source('b', [identity('a')])], [identity('a')], admission());
  expect(cycle.reachable).toHaveLength(2); // Build-order rules remain the native graph's responsibility.
  const unversioned = await validateCapturedApplication([{ ...source('a'), revision: '' }], [identity('a')], admission());
  expect(unversioned.publishable).toBe(false);
  expect(unversioned.diagnostics.some(d => d.code === 'application.revision-unavailable')).toBe(true);
});

it('reproduces cross-process graph contention without stale capture, then reads current source after release', async () => {
  const root = await temporary(), file = path.join(root, 'revision.txt');
  await writeFile(file, 'before');
  const code = `import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';
    import { writeFile } from 'node:fs/promises';
    await withRoleBundleGraph(process.argv[1], async () => {
      const released = new Promise(resolve => process.once('message', resolve));
      process.send('locked'); await released;
      await writeFile(process.argv[2], 'after');
    }); process.disconnect();`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', code, root, file], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  const exited = once(child, 'exit'); let stderr = '';
  child.stderr!.on('data', value => { stderr += String(value); });
  const capture = vi.fn(() => readFile(file, 'utf8'));
  try {
    await Promise.race([once(child, 'message'), exited.then(() => { throw new Error(stderr || 'Lock holder exited early'); })]);
    await expect(withRuntimeGraphRead(root, capture)).rejects.toThrow('Artifact is locked by another writer.');
    expect(capture).not.toHaveBeenCalled();
  } finally {
    if (child.connected) child.send('release');
    expect((await exited)[0], stderr).toBe(0);
  }
  expect(await withRuntimeGraphRead(root, capture)).toBe('after');
  expect(capture).toHaveBeenCalledOnce();
}, 15000);

it('drops stale results and returns no source after revocation during reads or final revision checks', async () => {
  const gate = admission(); gate.revisionsCurrent = async () => false;
  expect(await validateCapturedApplication([source('a', [], 'old source')], [identity('a')], gate)).toEqual({ status: 'stale', diagnostics: [], reachable: [], blockers: [], publishable: false });
  let revoked = false;
  const revoking = { ...source('a'), async validate() { revoked = true; return { dependencies: [], complete: true, diagnostics: [] }; } };
  gate.assertAuthority = async () => { if (revoked) throw new Error('AUTHORITY_CHANGED'); };
  await expect(validateCapturedApplication([revoking], [identity('a')], gate)).rejects.toThrow('AUTHORITY_CHANGED');
  revoked = false; gate.revisionsCurrent = async () => { revoked = true; return true; };
  await expect(validateCapturedApplication([source('a')], [identity('a')], gate)).rejects.toThrow('AUTHORITY_CHANGED');
});

it('preserves native severities/codes/locations, and never fabricates step precision', () => {
  const result = genericDiagnostics(identity('dataset'), { valid: false, diagnostics: [{ severity: 'info', code: 'dataset.info', message: 'Info', file: 'definition.json', field: 'field-stable-id', line: 2, column: 4 }, { severity: 'warning', code: 'dataset.warning', message: 'Warning' }] });
  expect(result[0]).toMatchObject({ severity: 'info', code: 'dataset.info', target: { field: 'field-stable-id' }, location: { file: 'definition.json', line: 2, column: 4 } });
  expect(result[1].target?.step).toBeUndefined();
});

it('uses real generic, Visual and Automation services to aggregate independent invalid artifacts without writes', async () => {
  const root = await temporary();
  const genericRoot = path.join(root, 'generic'); await mkdir(genericRoot); await mkdir(path.join(genericRoot, 'broken'));
  await writeFile(path.join(genericRoot, 'broken', 'artifact.json'), '{bad JSON');
  const generic = new ArtifactEditorWorkspace(genericRoot, 'test');
  const discovered = await generic.discover(); expect(discovered).toHaveLength(1);
  const artifact = await generic.load(discovered[0].locator);
  const automation = new AutomationStore(path.join(root, 'workflows'), 'workflow');
  const workflow = await automation.create('bad', { displayName: 'Bad', enabled: true, appId: 'app-one', datasetId: 'dataset-one', primaryKey: 'id', actions: [] });
  await writeFile(path.join(automation.root, workflow.locator), '{bad JSON');
  const invalidWorkflow = await automation.read(workflow.locator);
  const visuals = new VisualArtifactService(path.join(root, 'visual'), 'component');
  const visual = await visuals.create('bad');
  await visuals.save(visual.locator, 'source', '<div data-uip-node="dup"></div><div data-uip-node="dup"></div>', visual.hash);
  const invalidVisual = await visuals.read(visual.locator);
  const sources: CapturedValidationSource[] = [
    capturedGenericSource(identity('generic'), artifact, () => undefined),
    capturedAutomationSource(identity('workflow'), invalidWorkflow, () => undefined),
    capturedVisualSource(identity('visual'), invalidVisual.hash, toRuntime(invalidVisual)!, [], [], invalidVisual.diagnostics, () => undefined, invalidVisual.files),
  ];
  const before = await Promise.all([readFile(path.join(genericRoot, 'broken', 'artifact.json'), 'utf8'), readFile(path.join(automation.root, workflow.locator), 'utf8')]);
  const report = await validateCapturedApplication(sources, sources.map(s => s.identity), admission());
  expect(report.publishable).toBe(false);
  expect(new Set(report.diagnostics.map(d => d.subsystem))).toEqual(new Set(['generic', 'automation', 'visual']));
  expect(await Promise.all([readFile(path.join(genericRoot, 'broken', 'artifact.json'), 'utf8'), readFile(path.join(automation.root, workflow.locator), 'utf8')])).toEqual(before);
  await writeFile(path.join(automation.root, workflow.locator), '{"id":"partial"}');
  const malformed = await automation.read(workflow.locator);
  const malformedResult = await capturedAutomationSource(identity('workflow'), malformed, () => undefined).validate();
  expect(malformedResult.complete).toBe(false);
  expect(malformedResult.diagnostics.map(d => d.message)).toEqual(malformed.diagnostics);
});

it('captures native Visual references and marks unresolved owners/services incomplete rather than guessing', () => {
  const artifact = composition().pages[0];
  artifact.metadata.onLoad = [{ kind: 'workflow', workflowId: 'workflow-one', primaryRecordId: { literal: '1' } }, { kind: 'service', reference: 'approved-read' }];
  const refs = visualSourceReferences(artifact);
  expect(refs).toEqual(expect.arrayContaining([{ kind: 'shell', id: 'art_shell_one' }, { kind: 'workflow', id: 'workflow-one' }, { kind: 'service', id: 'approved-read' }]));
  const result = resolveDiagnosticReferences(identity('page'), refs, ref => ref.kind === 'shell' ? identity(ref.id) : undefined);
  expect(result.complete).toBe(false); expect(result.dependencies).toEqual([identity('art_shell_one')]);
  expect(result.diagnostics).toHaveLength(2);
});

it('catalog projects only actual registrations, does not invoke effects or infer approved signatures', () => {
  const invoke = vi.fn();
  expect(registeredAutomationCatalog(new Map())).toEqual([]);
  expect(registeredAutomationCatalog(new Map([['registered-only', { transactional: false, invoke }]]))).toEqual([{ id: 'registered-only', transactional: false, selection: 'contract-review-required' }]);
  expect(invoke).not.toHaveBeenCalled();
});

it('captured adapters retain their revision and typed dependency identities when caller objects change', async () => {
  const artifact = composition().pages[0], owner = identity('page');
  const visual = capturedVisualSource(owner, 'original-revision', artifact, [], [], [], ref => ref.kind === 'shell' ? identity(ref.id) : undefined, { source: artifact.source, css: '', metadata: JSON.stringify(artifact.metadata), fixtures: '{}', code: '' });
  artifact.metadata.shellId = 'changed-shell'; owner.id = 'changed-owner';
  expect(visual.revision).toBe('original-revision'); expect(visual.identity.id).toBe('page');
  expect((await visual.validate()).dependencies).toEqual([identity('art_shell_one')]);
  const root = await temporary(), store = new AutomationStore(root, 'workflow');
  const bundle = await store.create('typed', { displayName: 'Typed', enabled: true, appId: 'app-one', datasetId: 'dataset-one', primaryKey: 'id', actions: [{ id: 'local', type: 'service', service: 'reference.notification', input: { literal: 'test' } }] });
  const resolver = vi.fn((ref: { kind: string; id: string }) => identity(ref.id));
  const captured = capturedAutomationSource(identity('workflow'), bundle, resolver);
  bundle.definition!.actions = []; await captured.validate();
  expect(resolver).toHaveBeenCalledWith({ kind: 'dataset', id: 'dataset-one' });
  expect(resolver).toHaveBeenCalledWith({ kind: 'service', id: 'reference.notification' });
});
