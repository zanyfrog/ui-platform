import type { ArtifactCapabilities, ArtifactManifest, ArtifactValidationResult, ArtifactReferenceSummary } from '@ui-platform/artifacts';
import type { EditorPresentationDescriptor } from './editor-presentation.js';

export interface EditorArtifactDto {
  locator: string;
  manifest: ArtifactManifest | null;
  manifestContent: string;
  files: { role: string; path: string; language?: string; content: string }[];
  capabilities: ArtifactCapabilities;
  validation: ArtifactValidationResult;
  references: ArtifactReferenceSummary;
  checksum: string;
  /** Optional presentation-only bridge. Older responses/consumers remain valid. */
  presentation?: EditorPresentationDescriptor;
}
export interface EditorSaveDto {
  manifest?: ArtifactManifest | string;
  files?: Record<string, string | null>;
  expectedChecksum: string;
}
export interface EditorSaveResponse { saved: boolean; artifact: EditorArtifactDto; validation: ArtifactValidationResult }
export interface EditorArtifactSummary { locator: string; artifactId?: string; artifactType?: string; name?: string; validation: ArtifactValidationResult }
export interface EditorWatchEvent { appKey: string; locator: string; kind: 'changed' | 'removed'; checksum?: string }
export interface ArtifactEditorTransport {
  load(locator: string): Promise<EditorArtifactDto>;
  save(locator: string, changes: EditorSaveDto): Promise<EditorSaveResponse>;
  validateSaved(locator: string): Promise<ArtifactValidationResult>;
  getReferences(locator: string): Promise<ArtifactReferenceSummary>;
  subscribe?(locator: string, listener: (event: EditorWatchEvent) => void): () => void;
}
export class EditorTransportError extends Error {
  constructor(public readonly status: number, message: string, public readonly code: string, public readonly validation?: ArtifactValidationResult) { super(message); }
}
