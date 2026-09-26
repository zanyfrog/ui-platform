import type { ArtifactEditorTransport, EditorArtifactDto } from '../../shared/artifact-editor.js';
import { EditorTransportError } from '../../shared/artifact-editor.js';
import type { EditorWorkingCopy } from './working-copy.js';
import { editorSessionSnapshot, refreshEditorSession, subscribeEditorSession } from './session.js';

export type RecoveryResolution = 'reload' | { merged: EditorArtifactDto };

/** Connect a Phase 1 copy to the identity session so revocation pauses its sole timer. */
export function suspendCopyOnIdentityChange(copy: EditorWorkingCopy, originalSubjectId: string) {
  const originalRevision = editorSessionSnapshot()?.revision;
  const unsubscribe = subscribeEditorSession(() => {
    const session = editorSessionSnapshot();
    if (!session?.principal || session.principal.subjectId !== originalSubjectId || session.revision !== originalRevision) {
      copy.suspend(); unsubscribe();
    }
  });
  return () => { unsubscribe(); };
}

/** Recover into the same suspended Phase 1 copy after identity and application checks. */
export async function recoverSuspendedCopy(args: {
  copy: EditorWorkingCopy;
  originalSubjectId: string;
  applicationKey: string;
  transport: ArtifactEditorTransport;
  resolution?: RecoveryResolution;
}): Promise<{ remote: EditorArtifactDto; localChangesRemain: boolean }> {
  const session = await refreshEditorSession();
  if (!session.principal || session.principal.subjectId !== args.originalSubjectId || !session.principal.applicationKeys.includes(args.applicationKey)) {
    throw new EditorTransportError(403, 'Recovery is available only to the original identity with current application access.', 'editor.recovery-forbidden');
  }
  const local = args.copy.snapshot;
  const remote = await args.transport.load(local.artifact.locator);
  if (remote.locator !== local.artifact.locator) throw new EditorTransportError(404, 'The original artifact is no longer available.', 'editor.not-found');
  const latest = editorSessionSnapshot();
  if (!latest?.principal || latest.revision !== session.revision || latest.principal.subjectId !== args.originalSubjectId) {
    throw new EditorTransportError(403, 'Identity changed during recovery. Local changes remain suspended.', 'editor.session-changed');
  }
  const changed = remote.checksum !== local.baselineChecksum;
  if (changed && !args.resolution) throw new EditorTransportError(409, 'The artifact changed on the server. Review the comparison and choose reload or a merge.', 'editor.recovery-conflict');
  args.copy.recover(args.transport, remote, args.resolution);
  return { remote, localChangesRemain: args.resolution !== 'reload' };
}
