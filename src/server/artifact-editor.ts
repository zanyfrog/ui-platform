import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ArtifactConflictError, ArtifactValidationError, FileSystemArtifactService, type EditableArtifact, type ArtifactWatchEvent, type ArtifactValidationResult } from '@ui-platform/artifacts';
import type { EditorArtifactDto, EditorSaveDto, EditorWatchEvent } from '../shared/artifact-editor.js';
import { presentationForArtifact } from './editor-presentation.js';

export class EditorRequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
/** Application-scoped service ownership. Locators carry no artifact identity or filesystem authority. */
export class ArtifactEditorWorkspace {
  readonly service: FileSystemArtifactService;
  private locations = new Map<string, string>();
  private tokens = new Map<string, string>();
  constructor(readonly root: string, readonly appKey: string,
    private publish: (event: EditorWatchEvent) => void = () => {},
    private buildQueue?: { onSourceChanged(file: string): Promise<unknown> },
    private reportError: (error: unknown) => void = console.error) {
    this.service = new FileSystemArtifactService({ root });
  }
  locator(bundle: string): string {
    let token = this.tokens.get(bundle);
    if (!token) { token = randomUUID(); this.tokens.set(bundle, token); this.locations.set(token, bundle); }
    return token;
  }
  private location(token: string): string {
    const bundle = this.locations.get(token);
    if (!bundle) throw new EditorRequestError(404, 'editor.not-found', 'Artifact was not found. Refresh the artifact list.');
    return bundle;
  }
  private validation(value: ArtifactValidationResult, bundle: string): ArtifactValidationResult {
    return { ...value, diagnostics: value.diagnostics.map(d => ({ ...d,
      ...(d.file && path.isAbsolute(d.file) ? { file: path.relative(bundle, d.file).split(path.sep).join('/') } : {}),
      ...(d.path && path.isAbsolute(d.path) ? { path: path.relative(bundle, d.path).split(path.sep).join('/') } : {}),
    })) };
  }
  project(a: EditableArtifact): EditorArtifactDto {
    return { locator: this.locator(a.bundlePath), manifest: a.manifest, manifestContent: a.manifestContent,
      files: a.files.map(({ role, path: filePath, language, content }) => ({ role, path: filePath, language, content })),
      capabilities: a.capabilities, validation: this.validation(a.validation, a.bundlePath), references: a.references, checksum: a.checksum,
      presentation: presentationForArtifact(a) };
  }
  async discover() {
    return (await this.service.discover(this.root)).map(s => ({ locator: this.locator(s.bundlePath), artifactId: s.artifactId, artifactType: s.artifactType, name: s.name, validation: this.validation(s.validation, s.bundlePath) }));
  }
  async load(token: string) { return this.project(await this.service.load(this.location(token))); }
  async validate(token: string) { const bundle = this.location(token); return this.validation(await this.service.validate(bundle), bundle); }
  async references(token: string) { return this.service.getReferences(this.location(token)); }
  async save(token: string, input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new EditorRequestError(400, 'editor.request', 'A save object is required.');
    const value = input as EditorSaveDto;
    if (typeof value.expectedChecksum !== 'string' || !value.expectedChecksum) throw new EditorRequestError(400, 'editor.checksum', 'expectedChecksum is required.');
    if (value.manifest !== undefined && typeof value.manifest !== 'string' && (!value.manifest || typeof value.manifest !== 'object' || Array.isArray(value.manifest))) throw new EditorRequestError(400, 'editor.request', 'Invalid manifest representation.');
    if (value.files !== undefined && (!value.files || typeof value.files !== 'object' || Array.isArray(value.files) || Object.values(value.files).some(v => v !== null && typeof v !== 'string'))) throw new EditorRequestError(400, 'editor.request', 'File contents must be text or null.');
    const result = await this.service.save(this.location(token), { expectedChecksum: value.expectedChecksum, manifest: value.manifest, files: value.files });
    if (result.saved) this.changed({ kind: 'changed', bundlePath: result.artifact.bundlePath, artifact: result.artifact });
    const artifact = this.project(result.artifact);
    return { saved: result.saved, artifact, validation: artifact.validation };
  }
  changed(event: ArtifactWatchEvent) {
    // A committed save must remain successful even if an observer fails.
    try { this.publish({ appKey: this.appKey, locator: this.locator(event.bundlePath), kind: event.kind, checksum: event.artifact?.checksum }); } catch (error) { this.reportError(error); }
    try { void this.buildQueue?.onSourceChanged(event.bundlePath).catch(this.reportError); } catch (error) { this.reportError(error); }
  }
}

export function editorError(error: unknown) {
  if (error instanceof ArtifactConflictError) return { status: 409, body: { code: 'editor.conflict', error: 'Artifact changed on disk. Reload or resolve the conflict.' } };
  if (error instanceof EditorRequestError) return { status: error.status, body: { code: error.code, error: error.message } };
  if (error instanceof ArtifactValidationError) return { status: 422, body: { code: 'editor.validation', error: 'Artifact operation was rejected.', validation: error.validation } };
  return { status: 500, body: { code: 'editor.operation', error: 'Artifact operation failed. See the server operation log for recovery details.' } };
}
