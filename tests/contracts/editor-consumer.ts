// Compile-only consumer probe. Use emitted Foundation types and the existing
// Phase 1 adapters; deliberately avoid replacement host/snapshot interfaces.
import type { ArtifactService, ArtifactValidationResult, ArtifactReferenceSummary } from '@ui-platform/artifacts';
import { validateValue } from '@ui-platform/artifacts/validation';
import { ArtifactEditorWorkspace } from '../../src/server/artifact-editor.js';
import { createArtifactEditorTransport, discoverEditorArtifacts } from '../../src/client/artifact-editor/transport.js';
import { EditorWorkingCopyHost, protectPendingChanges } from '../../src/client/artifact-editor/working-copy.js';
import type { ArtifactEditorTransport, EditorArtifactDto, EditorArtifactSummary } from '../../src/shared/artifact-editor.js';

export async function consumeExistingEditor(appKey: string, locator: string, window: Window) {
  const transport: ArtifactEditorTransport = createArtifactEditorTransport(appKey);
  const summaries: EditorArtifactSummary[] = await discoverEditorArtifacts(appKey);
  const host = new EditorWorkingCopyHost(transport);
  const copy = await host.open(locator);
  const unsubscribe: () => void = copy.subscribe(() => {
    const snapshot = copy.snapshot;
    const artifact: EditorArtifactDto = snapshot.artifact;
    const validation: ArtifactValidationResult = artifact.validation;
    const references: ArtifactReferenceSummary = artifact.references;
    const state: 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'error' = snapshot.saveState;
    const generations: number[] = [snapshot.localGeneration, snapshot.lastSavedGeneration];
    const dirty: boolean = snapshot.dirty;
    const checksum: string = snapshot.baselineChecksum;
    const error: string | undefined = snapshot.error;
    void [validation, references, state, generations, dirty, checksum, error];
  });
  const detachUnload: () => void = protectPendingChanges(copy, window);
  copy.setManifest(copy.snapshot.artifact.manifestContent);
  copy.setFile('form.json', '{"fields":[]}', 'definition', 'json');
  copy.setFile('form.json', null);
  copy.suspend();
  const fresh = await transport.load(locator);
  copy.recover(transport, fresh, 'reload');
  copy.suspend();
  await host.discard(locator);
  await copy.flush();
  if (copy.snapshot.saveState === 'conflict') {
    const comparison = await copy.compare();
    copy.resolve(comparison.remote, comparison.local);
  }
  await copy.reload();
  const validation: ArtifactValidationResult = await transport.validateSaved(locator);
  const references: ArtifactReferenceSummary = await transport.getReferences(locator);
  const closed: boolean = await host.close(locator);
  if (closed) { unsubscribe(); detachUnload(); }
  return { summaries, validation, references, closed,
    preview: validateValue('', [{ validator: 'required' }, { validator: 'max-length', max: 25 }]) };
}

export function consumeExistingWorkspace(root: string, appKey: string) {
  const workspace = new ArtifactEditorWorkspace(root, appKey, event => {
    const kind: 'changed' | 'removed' = event.kind;
    void kind;
  }, { onSourceChanged: async (_file: string) => undefined });
  const service: ArtifactService = workspace.service;
  return { workspace, service };
}
