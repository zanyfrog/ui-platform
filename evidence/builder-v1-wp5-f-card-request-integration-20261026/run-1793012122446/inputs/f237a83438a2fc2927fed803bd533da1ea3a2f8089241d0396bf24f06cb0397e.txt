import { workspaceIdentityKey, type WorkspaceArtifact } from '../../shared/builder-workspace.js';
import type { PreviewIdentity } from '../fixture-preview/lifecycle.js';
/** Read-only hints only: neither editor nor transport capabilities cross this binding. */
export interface PreviewSelectionHints { artifact: WorkspaceArtifact; subjectId: string; sessionId: string; dirty: boolean }
export function selectFixturePreview(panel: { select(identity?: PreviewIdentity, dirty?: boolean): void }, hints?: PreviewSelectionHints) {
  panel.select(hints ? { subjectId: hints.subjectId, sessionId: hints.sessionId, applicationId: hints.artifact.applicationId, artifactKey: workspaceIdentityKey(hints.artifact.identity) } : undefined, hints?.dirty ?? false);
}
