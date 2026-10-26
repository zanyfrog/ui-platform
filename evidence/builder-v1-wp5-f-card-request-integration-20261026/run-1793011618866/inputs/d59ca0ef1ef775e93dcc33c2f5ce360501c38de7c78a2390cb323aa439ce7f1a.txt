import type { ArtifactBundle, CompositionDefinition } from '@ui-platform/visual-artifacts';
import type { EditorArtifactDto } from './artifact-editor.js';
import type { AutomationBundle } from './automation.js';
import type { ComponentCatalogEntry, PageSourcePayload } from './types.js';

export type WorkspaceOwner = { kind: 'application' | 'platform' | 'package'; id: string; revision?: string };
export interface WorkspaceIdentity { owner: WorkspaceOwner; format: 'visual' | 'generic' | 'composition' | 'automation' | 'package' | 'legacy'; id?: string; repairLocator?: string }
export interface WorkspaceTarget { identity: WorkspaceIdentity; node?: string; field?: string; step?: string; section?: string; source?: { file: string; line?: number; column?: number } }
export interface WorkspaceArtifact {
  identity: WorkspaceIdentity; applicationKey: string; applicationId: string; locator: string;
  name: string; group: string; kind: string; editable: boolean; componentId?: string;
}
export interface AuthorizedWorkspaceArtifact extends WorkspaceArtifact {
  visual?: { pages: ArtifactBundle[]; shells: ArtifactBundle[]; components: ArtifactBundle[]; packages: ComponentCatalogEntry[] };
  generic?: EditorArtifactDto; automation?: AutomationBundle; composition?: CompositionDefinition;
  source?: { path: string; content: string; hash: string }; package?: ComponentCatalogEntry; legacy?: PageSourcePayload;
}
/** Form capability is a view of the same Visual Component identity, never a format. */
export function workspaceIdentityKey(identity: WorkspaceIdentity): string {
  if (!identity || !identity.owner || !['application', 'platform', 'package'].includes(identity.owner.kind) || !identity.owner.id ||
      !['visual', 'generic', 'composition', 'automation', 'package', 'legacy'].includes(identity.format) ||
      (!!identity.id === !!identity.repairLocator)) throw new Error('WORKSPACE_IDENTITY_INVALID');
  return JSON.stringify([identity.owner.kind, identity.owner.id, identity.owner.revision ?? null, identity.format,
    identity.id ? ['permanent', identity.id] : ['repair-only', identity.repairLocator]]);
}
