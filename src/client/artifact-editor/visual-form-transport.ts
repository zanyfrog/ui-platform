import type { ArtifactBundle, ArtifactFiles } from '@ui-platform/visual-artifacts';
import type { AuthorizedWorkspaceArtifact } from '../../shared/builder-workspace.js';
import { workspaceIdentityKey } from '../../shared/builder-workspace.js';
import { EditorTransportError, type ArtifactEditorTransport, type EditorArtifactDto } from '../../shared/artifact-editor.js';
import { createEditorSessionBinding } from './session.js';
const extensions = { source: '.html', css: '.css', metadata: '.visual.json', fixtures: '.fixtures.json', code: '.functions.ts' };
export function visualFormDto(bundle: ArtifactBundle, editable: boolean): EditorArtifactDto {
  const m = bundle.metadata;
  if (!m?.form || !m.componentId) throw new Error('The shared Form definition requires source repair.');
  const stem = bundle.locator.slice(0, -'.visual.json'.length).split('/').pop()!;
  return { locator: bundle.locator, manifest: null, manifestContent: '', visualForm: { artifactId: m.artifactId, componentId: m.componentId, name: m.displayName, version: m.schemaVersion },
    files: Object.entries(extensions).map(([role, extension]) => ({ role, path: stem + extension, content: bundle.files[role as keyof ArtifactFiles], language: role === 'metadata' || role === 'fixtures' ? 'json' : undefined })),
    capabilities: { edit: editable, format: editable }, checksum: bundle.hash, references: { outgoing: [] },
    validation: { valid: !bundle.diagnostics.some(d => d.severity === 'error'), diagnostics: bundle.diagnostics.map(d => ({ ...d, code: 'visual.source', artifactId: m.artifactId })) } };
}
/** Projection only; existing Visual service owns validation, identity and Foundation persistence. */
export function createVisualFormTransport(current: () => AuthorizedWorkspaceArtifact): ArtifactEditorTransport {
  const binding = createEditorSessionBinding(), original = current(), identity = workspaceIdentityKey(original.identity);
  const assert = () => { binding.assert(); if (workspaceIdentityKey(current().identity) !== identity) throw new Error('Form identity changed.'); };
  async function load(locator: string) {
    assert(); const owner = current(); if (locator !== original.locator) throw new Error('Unknown Form locator.');
    const headers = await binding.headers();
    let response: Response, value: AuthorizedWorkspaceArtifact & { error?: string; code?: string };
    for (let attempt = 0; ; attempt++) {
      assert();
      response = await fetch(`/api/apps/${encodeURIComponent(owner.applicationKey)}/builder-workspace/authorize`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ identity: owner.identity }) });
      value = await response.json(); assert();
      if (response.status === 503 && value.code === 'WORKSPACE_SOURCE_BUSY' && attempt < 19) { await new Promise(resolve => setTimeout(resolve, 100)); continue; } break;
    }
    if (!response.ok) throw new EditorTransportError(response.status, value.error ?? 'Form source unavailable.', value.code ?? 'source.unavailable');
    if (value.applicationId !== owner.applicationId || workspaceIdentityKey(value.identity) !== identity) throw new Error('Form owner changed.');
    const bundle = value.visual!.components.find((b: ArtifactBundle) => b.locator === locator);
    if (!bundle) throw new Error('Form definition unavailable.');
    return visualFormDto(bundle, value.editable);
  }
  return { load, async save(locator, changes) {
    assert(); const owner = current(); if (locator !== original.locator || changes.manifest !== undefined) throw new Error('Visual Forms have no generic manifest.');
    const previous = await load(locator);
    if (previous.checksum !== changes.expectedChecksum) throw new EditorTransportError(409, 'Form changed on disk. Compare and recover.', 'source.conflict');
    const files = Object.fromEntries(previous.files.map(f => [f.role, f.content])) as unknown as ArtifactFiles;
    for (const [filePath, content] of Object.entries(changes.files ?? {})) {
      const field = previous.files.find(f => f.path === filePath);
      if (!field || typeof content !== 'string') throw new Error('All five Visual roles must be retained.'); files[field.role as keyof ArtifactFiles] = content;
    }
    const response = await fetch(`/api/apps/${encodeURIComponent(owner.applicationKey)}/visual-components?locator=${encodeURIComponent(locator)}`, { method: 'PUT', headers: { ...await binding.headers(), 'content-type': 'application/json', 'x-editor-application-id': owner.applicationId }, body: JSON.stringify({ files, expectedHash: changes.expectedChecksum, mode: changes.mode ?? 'normal' }) });
    const value = await response.json(); assert();
    if (!response.ok) throw new EditorTransportError(response.status, value.error ?? 'Form save denied.', value.code ?? 'source.validation', value.validation);
    const artifact = visualFormDto(value, previous.capabilities.edit); return { saved: true, artifact, validation: artifact.validation };
  }, validateSaved: async locator => (await load(locator)).validation, getReferences: async locator => (await load(locator)).references,
    subscribe(locator, listener) { let pending = false; const timer = setInterval(() => { if (pending) return; pending = true; void load(locator).then(a => listener({ appKey: current().applicationKey, locator, kind: 'changed', checksum: a.checksum })).catch(() => {}).finally(() => { pending = false; }); }, 3000); return () => clearInterval(timer); } };
}
