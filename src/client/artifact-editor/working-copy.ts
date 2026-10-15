import type { ArtifactEditorTransport, EditorArtifactDto, EditorWatchEvent, EditorSaveDto } from '../../shared/artifact-editor.js';
import { EditingLifecycle, protectEditingDraft, type EditingState } from './editing-lifecycle.js';
export type SaveState = EditingState;
const sourceEqual = (a: EditorArtifactDto, b: EditorArtifactDto) => a.manifestContent === b.manifestContent && JSON.stringify(a.files.map(f => [f.path, f.content]).sort()) === JSON.stringify(b.files.map(f => [f.path, f.content]).sort());
/** Format adapter over the common, session-only editing lifecycle. */
export class EditorWorkingCopy {
  readonly lifecycle: EditingLifecycle<EditorArtifactDto>;
  private unsubscribe?: () => void;
  private refreshSequence = 0;
  private deferredEvent?: EditorWatchEvent;
  private validation?: EditorArtifactDto['validation'];
  private mode: 'normal' | 'repair' = 'normal';
  constructor(artifact: EditorArtifactDto, private transport: ArtifactEditorTransport) {
    this.lifecycle = new EditingLifecycle(artifact, async (candidate, baseline) => {
      this.refreshSequence++;
      const files: Record<string, string | null> = Object.create(null);
      for (const file of candidate.files) if (baseline.files.find(f => f.path === file.path)?.content !== file.content) files[file.path] = file.content;
      for (const file of baseline.files) if (!candidate.files.some(f => f.path === file.path)) files[file.path] = null;
      const changes: EditorSaveDto = { expectedChecksum: baseline.checksum, mode: this.mode, files,
        ...(candidate.manifestContent !== baseline.manifestContent ? { manifest: candidate.manifestContent } : {}) };
      try {
        const result = await this.transport.save(candidate.locator, changes);
        if (!result.saved) throw new Error('The server did not save this artifact.');
        this.validation = undefined;
        const now = this.lifecycle.current;
        if (!sourceEqual(now, candidate)) {
          if (now.manifestContent === candidate.manifestContent) { now.manifestContent = result.artifact.manifestContent; now.manifest = structuredClone(result.artifact.manifest); }
          const paths = new Set([...candidate.files, ...result.artifact.files].map(f => f.path));
          for (const filePath of paths) {
            const before = candidate.files.find(f => f.path === filePath), current = now.files.find(f => f.path === filePath), returned = result.artifact.files.find(f => f.path === filePath);
            if (before?.content !== current?.content) continue;
            now.files = now.files.filter(f => f.path !== filePath); if (returned) now.files.push(structuredClone(returned));
          }
          now.checksum = result.artifact.checksum; now.capabilities = { ...result.artifact.capabilities };
        }
        return result.artifact;
      } catch (error) { const validation = (error as { validation?: EditorArtifactDto['validation'] }).validation; if (validation && sourceEqual(this.lifecycle.current, candidate)) this.validation = validation; throw error; }
    }, sourceEqual);
    this.unsubscribe = transport.subscribe?.(artifact.locator, event => { void this.externalChange(event); });
    this.lifecycle.subscribe(() => {
      if (!this.lifecycle.inFlight && this.deferredEvent) { const event = this.deferredEvent; this.deferredEvent = undefined; void this.externalChange(event); }
    });
  }
  get snapshot() {
    const c = this.lifecycle, artifact = structuredClone(c.current);
    // History restores source, never stale permission or saved-diagnostic metadata.
    artifact.capabilities = { ...c.baseline.capabilities }; artifact.checksum = c.baseline.checksum;
    artifact.validation = structuredClone(c.baseline.validation); artifact.references = structuredClone(c.baseline.references);
    return { artifact, baselineChecksum: c.baseline.checksum, localGeneration: c.generation, lastSavedGeneration: c.savedGeneration, saveState: c.state, error: c.failure, dirty: c.dirty, localValidation: this.validation ? structuredClone(this.validation) : undefined, canUndo: c.canUndo, canRedo: c.canRedo, notice: c.notice };
  }
  subscribe(listener: () => void) { return this.lifecycle.subscribe(listener); }
  setManifest(source: string, group?: string) {
    const next = structuredClone(this.lifecycle.current); next.manifestContent = source;
    try { const parsed = JSON.parse(source); next.manifest = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null; } catch { next.manifest = null; }
    if (!next.manifest || next.manifest.artifactType !== next.presentation?.artifactType || next.manifest.definitionVersion !== next.presentation?.definitionVersion) next.presentation = undefined;
    this.validation = undefined; this.lifecycle.edit(next, group);
  }
  setFile(filePath: string, content: string | null, role?: string, language?: string, group?: string) {
    const next = structuredClone(this.lifecycle.current), file = next.files.find(file => file.path === filePath);
    if (content === null) next.files = next.files.filter(file => file.path !== filePath);
    else if (file) file.content = content;
    else next.files.push({ path: filePath, role: role ?? filePath, language, content });
    this.validation = undefined; this.lifecycle.edit(next, group);
  }
  undo() { this.validation = undefined; this.lifecycle.undo(); }
  redo() { this.validation = undefined; this.lifecycle.redo(); }
  async flush() {
    await this.lifecycle.flush();
    const event = this.deferredEvent; this.deferredEvent = undefined; if (event) await this.externalChange(event);
  }
  async repairSave() {
    if (this.lifecycle.inFlight) throw new Error('Wait for the admitted save before advanced source repair.');
    // The save callback captures mode synchronously. Later queued saves always use normal mode.
    this.mode = 'repair'; const saving = this.flush(); this.mode = 'normal'; await saving;
  }
  async externalChange(event: EditorWatchEvent) {
    const c = this.lifecycle;
    if (c.disposed || c.suspended) return;
    if (c.inFlight) { this.deferredEvent = event; return; }
    if (event.kind === 'changed' && event.checksum === c.baseline.checksum) return;
    const sequence = ++this.refreshSequence, generation = c.generation, previousState = c.state;
    if (c.dirty) c.conflict();
    try {
      const remote = event.kind === 'removed' ? undefined : await this.transport.load(c.current.locator);
      if (c.disposed || c.suspended || sequence !== this.refreshSequence) return;
      if (remote?.checksum === c.baseline.checksum) { c.state = previousState; c.schedule(); c.emit(); return; }
      if (!remote || c.dirty || generation !== c.generation || c.inFlight) c.conflict(); else c.reset(remote);
    } catch (error) { c.failure = error instanceof Error ? error.message : String(error); c.state = 'error'; c.emit(); }
  }
  async reload() {
    const c = this.lifecycle; if (c.suspended) throw new Error('Working copy is suspended after an identity change.');
    if (c.inFlight) await c.inFlight;
    const generation = c.generation, remote = await this.transport.load(c.current.locator);
    if (generation !== c.generation) throw new Error('New edits arrived during reload.');
    this.validation = undefined; c.reset(remote);
  }
  async compare() { if (this.lifecycle.suspended) throw new Error('Working copy is suspended after an identity change.'); return { local: structuredClone(this.lifecycle.current), remote: await this.transport.load(this.lifecycle.current.locator) }; }
  resolve(remote: EditorArtifactDto, merged: EditorArtifactDto) {
    const c = this.lifecycle;
    if (c.suspended) throw new Error('Working copy is suspended after an identity change.');
    if (c.state !== 'conflict' || remote.locator !== c.current.locator || merged.locator !== remote.locator) throw new Error('A matching conflict is required.');
    c.reset(remote, merged);
  }
  async close(): Promise<boolean> { await this.flush(); if (this.lifecycle.suspended || this.lifecycle.dirty || this.lifecycle.state === 'conflict' || this.lifecycle.state === 'error') return false; await this.discard(); return true; }
  suspend() { this.lifecycle.suspend(); this.unsubscribe?.(); this.unsubscribe = undefined; }
  recover(transport: ArtifactEditorTransport, remote: EditorArtifactDto, resolution?: 'reload' | { merged: EditorArtifactDto }) {
    const c = this.lifecycle;
    if (!c.suspended || c.disposed) throw new Error('Only a suspended working copy can be recovered.');
    if (remote.locator !== c.current.locator) throw new Error('Recovery must load the same artifact.');
    const changed = remote.checksum !== c.baseline.checksum;
    if (changed && !resolution) throw new Error('The server copy changed. Choose reload or provide an explicit merge.');
    const local = resolution === 'reload' ? remote : typeof resolution === 'object' ? resolution.merged : c.current;
    if (local.locator !== remote.locator) throw new Error('A matching recovery artifact is required.');
    this.transport = transport;
    if (changed || resolution) c.reset(remote, local);
    else { c.confirmBaseline(remote); c.current.capabilities = { ...remote.capabilities }; c.state = c.dirty ? 'pending' : 'saved'; c.failure = undefined; }
    c.resume(); this.unsubscribe = transport.subscribe?.(remote.locator, event => { void this.externalChange(event); });
  }
  async discard(): Promise<boolean> { this.unsubscribe?.(); this.unsubscribe = undefined; await this.lifecycle.dispose(); return true; }
}
/** One host per Application; locators are resolved by its bound transport. */
export class EditorWorkingCopyHost {
  private copies = new Map<string, Promise<EditorWorkingCopy>>();
  constructor(private transport: ArtifactEditorTransport) {}
  open(locator: string): Promise<EditorWorkingCopy> {
    let copy = this.copies.get(locator);
    if (!copy) { copy = this.transport.load(locator).then(artifact => new EditorWorkingCopy(artifact, this.transport)).catch(error => { this.copies.delete(locator); throw error; }); this.copies.set(locator, copy); }
    return copy;
  }
  async close(locator: string) { const copy = await this.copies.get(locator); if (copy && !await copy.close()) return false; this.copies.delete(locator); return true; }
  async discard(locator: string): Promise<boolean> { const promise = this.copies.get(locator); if (!promise) return true; const copy = await promise; await copy.discard(); if (this.copies.get(locator) === promise) this.copies.delete(locator); return true; }
}
/** Leaving never initiates a write. */
export function protectPendingChanges(copy: EditorWorkingCopy, host: Window = window) {
  return protectEditingDraft(() => copy.snapshot.dirty || copy.snapshot.saveState === 'conflict' || copy.snapshot.saveState === 'error', host);
}
