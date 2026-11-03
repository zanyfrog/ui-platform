import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import type { ArtifactEditorSecurity } from '../src/server/editor-security.js';

const state = vi.hoisted(() => ({ appId: 'registered-test-app', failure: false, catalogCalls: 0 }));
vi.mock('../src/server/applications.js', () => ({ appPath: () => 'isolated-test-app', getApp: async () => ({ appId: state.appId }) }));
vi.mock('../src/server/composition-lock.js', () => ({ withApplicationMutation: async (_: string, action: () => Promise<unknown>) => action() }));
vi.mock('../src/server/component-registry.js', async () => {
  const { NativeUiBasePathError } = await import('../src/server/native-ui-base.js');
  return { discoverComponents: async () => { state.catalogCalls++; if (state.failure) throw new NativeUiBasePathError(); return []; } };
});
vi.mock('../src/server/visual-artifacts.js', () => ({ visualWorkspace: async () => ({ pages: [{ locator: 'home', metadata: { artifactId: 'home', displayName: 'Home' } }], shells: [], components: [] }), platformComponentsRoot: '', VisualArtifactService: class {} }));
vi.mock('../src/server/page-builder.js', () => ({ getPageTree: async () => ({ pages: [] }), getPageSource: async () => ({}) }));
import { createBuilderWorkspaceHandler } from '../src/server/builder-workspace.js';
import { NativeUiBasePathError, nativeUiBaseEntry } from '../src/server/native-ui-base.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); state.failure = false; state.catalogCalls = 0; state.appId = 'registered-test-app'; });
async function request(options: { unauthorized?: boolean; stale?: boolean; owner?: string } = {}) {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  cleanup.push(async () => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; });
  let principalChecks = 0;
  const security = { workspacePrincipal() { principalChecks++; if (options.unauthorized || options.stale && principalChecks > 1) throw new Error('editor.session-changed'); return { subjectId: 'test-user' }; },
    workspaceArtifactDiscovery: async () => ({ artifacts: [], complete: true }) } as unknown as ArtifactEditorSecurity;
  const authorize = vi.fn(async (_req, permission: string) => permission === 'ui.page.view' || permission === 'ui.page.edit');
  const identity = { registeredApplication: () => options.owner ?? 'registered-test-app', authorize, policyDigest: () => 'stable' } as unknown as V1DevelopmentIdentity;
  let status = 200, payload: any;
  const response = { writeHead(code: number) { status = code; return this; }, end(text: string) { payload = JSON.parse(text); } } as unknown as ServerResponse;
  await createBuilderWorkspaceHandler(identity, security)({ url: '/api/apps/registered-pilot/builder-workspace', method: 'GET' } as IncomingMessage, response);
  return { status, payload, authorize, principalChecks };
}
it('classifies the demonstrated native failure without disclosing paths or granting access', async () => {
  state.failure = true; const result = await request();
  expect(result.status).toBe(503); expect(result.payload.code).toBe('WORKSPACE_NATIVE_INSTALLATION_INVALID');
  expect(result.payload.error).toContain('physical installed paths'); expect(JSON.stringify(result.payload)).not.toContain('C:');
  expect(result.payload).not.toHaveProperty('artifacts'); expect(result.authorize).toHaveBeenCalled();
});
it('retains genuine principal and cross-Application owner refusals before native discovery', async () => {
  state.failure = true;
  for (const options of [{ unauthorized: true }, { owner: 'different-application' }]) {
    const result = await request(options); expect(result.status).toBe(403); expect(result.payload.code).toBe('WORKSPACE_TARGET_DENIED');
  }
  expect(state.catalogCalls).toBe(0);
});
it('preserves authorized registered discovery and rejects a stale subordinate session before returning source', async () => {
  const allowed = await request(); expect(allowed.status).toBe(200);
  expect(allowed.payload).toHaveLength(1); expect(allowed.payload[0]).toMatchObject({ applicationId: 'registered-test-app', editable: true, kind: 'page' });
  expect(allowed.payload[0].identity.owner).toEqual({ kind: 'application', id: 'registered-test-app' });
  const stale = await request({ stale: true }); expect(stale.status).toBe(403); expect(stale.payload).not.toHaveProperty('visual');
});
it('retains physical native admission and rejects a linked installation without relaxing trust', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'native-path-regression-')); cleanup.push(() => rm(root, { recursive: true, force: true }));
  const physical = path.join(root, 'physical'), native = path.join(physical, 'node_modules/@ui-base/ui');
  await mkdir(path.join(native, 'src/layout'), { recursive: true });
  await writeFile(path.join(native, 'package.json'), JSON.stringify({ name: '@ui-base/ui', version: '1.0.0' }));
  await writeFile(path.join(native, 'ui.component.json'), JSON.stringify({ components: [
    { tagName: 'uib-card', identity: { componentId: 'cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1' }, module: './src/layout/uib-card.js' },
    { tagName: 'uib-panel', identity: { componentId: '@ui-base/ui:uib-panel' }, module: './src/layout/uib-panel.js' },
  ] }));
  for (const name of ['uib-card.js','uib-panel.js']) await writeFile(path.join(native, 'src/layout', name), '// isolated contract fixture');
  expect((await nativeUiBaseEntry(physical))?.components).toHaveLength(2);
  const linked = path.join(root, 'linked'); await mkdir(path.join(linked, 'node_modules/@ui-base'), { recursive: true });
  await symlink(native, path.join(linked, 'node_modules/@ui-base/ui'), process.platform === 'win32' ? 'junction' : 'dir');
  await expect(nativeUiBaseEntry(linked)).rejects.toBeInstanceOf(NativeUiBasePathError);
});
