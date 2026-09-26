import type { ArtifactEditorTransport, EditorArtifactDto } from '../../shared/artifact-editor.js';
import { EditorWorkingCopyHost, protectPendingChanges, type EditorWorkingCopy } from './working-copy.js';
import { createArtifactEditorTransport } from './transport.js';
import { editorSessionSnapshot, refreshEditorSession, subscribeEditorSession } from './session.js';
import { recoverSuspendedCopy } from './recovery.js';

/** Editor-local adapter. Source, generations, timers and persistence belong exclusively to Phase 1. */
export class EditorRuntimeContext {
  private transport: ArtifactEditorTransport;
  private readonly host: EditorWorkingCopyHost;
  private copy?: EditorWorkingCopy;
  private owner?: string;
  private revision?: string;
  private locked = false;
  private busy = false;
  private disposed = false;
  private detachCopy?: () => void;
  private detachUnload?: () => void;
  private readonly detachSession: () => void;
  private listeners = new Set<() => void>();
  private comparison?: { local: EditorArtifactDto; remote: EditorArtifactDto; generation: number; revision: string };

  constructor(readonly applicationKey: string,
    private readonly transportFactory = () => createArtifactEditorTransport(applicationKey),
    private readonly browserWindow: Window | undefined = typeof window === 'undefined' ? undefined : window) {
    this.transport = transportFactory();
    // A stable application host. Switching transport cannot resume suspended copies.
    this.host = new EditorWorkingCopyHost({
      load: locator => this.transport.load(locator), save: (locator, changes) => this.transport.save(locator, changes),
      validateSaved: locator => this.transport.validateSaved(locator), getReferences: locator => this.transport.getReferences(locator),
      subscribe: (locator, listener) => this.transport.subscribe?.(locator, listener) ?? (() => {}),
    });
    this.detachSession = subscribeEditorSession(() => {
      const session = editorSessionSnapshot();
      if (this.copy && (!session?.principal || session.revision !== this.revision || session.principal.subjectId !== this.owner)) {
        this.locked = true; this.comparison = undefined; this.copy.suspend();
      }
      this.emit();
    });
  }
  /** A revoked copy never exposes source, metadata, errors or comparisons to panels. */
  get snapshot() { return this.locked ? undefined : this.copy?.snapshot; }
  get hasCopy() { return !!this.copy; }
  get suspended() { return this.locked; }
  get pending() { return this.busy; }
  get canEdit() { return !this.locked && !this.busy && !!this.copy?.snapshot.artifact.capabilities.edit; }
  get canRecover() {
    const principal = editorSessionSnapshot()?.principal;
    return this.locked && !!principal && principal.subjectId === this.owner && principal.applicationKeys.includes(this.applicationKey);
  }
  get reviewedComparison() {
    const session = editorSessionSnapshot();
    return this.comparison && session?.revision === this.comparison.revision && session.principal?.subjectId === this.owner
      ? structuredClone(this.comparison) : undefined;
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  private requireCopy(edit = false) {
    if (this.disposed || !this.copy || this.locked || (edit && !this.copy.snapshot.artifact.capabilities.edit)) throw new Error('This editor action is not authorized.');
    return this.copy;
  }
  private async operation<T>(action: () => Promise<T>): Promise<T> {
    if (this.busy || this.disposed) throw new Error('An editor action is already in progress or the editor is closed.');
    this.busy = true; this.emit();
    try { return await action(); } finally { this.busy = false; this.emit(); }
  }
  setManifest(source: string) { if (this.busy) throw new Error('Wait for the current editor action.'); this.requireCopy(true).setManifest(source); }
  setFile(path: string, content: string | null, role?: string, language?: string) {
    if (this.busy) throw new Error('Wait for the current editor action.');
    this.requireCopy(true).setFile(path, content, role, language);
  }
  private release() {
    this.detachCopy?.(); this.detachUnload?.(); this.detachCopy = this.detachUnload = undefined;
    this.copy = undefined; this.comparison = undefined; this.locked = false; this.owner = this.revision = undefined;
  }
  async open(locator: string) {
    return this.operation(async () => {
      if (this.copy?.snapshot.artifact.locator === locator) return !this.locked;
      if (this.copy) {
        if (!await this.host.close(this.copy.snapshot.artifact.locator)) return false;
        this.release();
      }
      const session = await refreshEditorSession();
      if (!session.principal?.applicationKeys.includes(this.applicationKey)) throw new Error('Select an identity with access to this application.');
      this.transport = this.transportFactory();
      const copy = await this.host.open(locator);
      if (editorSessionSnapshot()?.revision !== session.revision) { await this.host.discard(locator); throw new Error('Identity changed while opening the artifact.'); }
      this.copy = copy; this.owner = session.principal.subjectId; this.revision = session.revision;
      this.detachCopy = copy.subscribe(() => { this.comparison = undefined; this.emit(); });
      if (this.browserWindow) this.detachUnload = protectPendingChanges(copy, this.browserWindow);
      return true;
    });
  }
  flush() { return this.operation(async () => { await this.requireCopy(true).flush(); }); }
  suspend() { if (!this.copy) return; this.locked = true; this.comparison = undefined; this.copy.suspend(); this.emit(); }
  private async settleAdmittedSave(copy: EditorWorkingCopy) {
    if (copy.snapshot.saveState !== 'saving') return;
    await new Promise<void>(resolve => {
      const detach = copy.subscribe(() => { if (copy.snapshot.saveState !== 'saving') { detach(); resolve(); } });
    });
  }
  /** Comparison is a temporary decision view, never a second editable source store. */
  compare() {
    return this.operation(async () => {
      if (!this.copy) throw new Error('Open an artifact first.');
      await this.settleAdmittedSave(this.copy);
      const session = await refreshEditorSession();
      if (!session.principal || session.principal.subjectId !== this.owner || !session.principal.applicationKeys.includes(this.applicationKey)) throw new Error('Only the original authorized identity can review this copy.');
      const local = this.copy.snapshot;
      const remote = this.locked ? await this.transportFactory().load(local.artifact.locator) : (await this.requireCopy().compare()).remote;
      if (editorSessionSnapshot()?.revision !== session.revision) throw new Error('Identity changed during comparison.');
      this.comparison = { local: local.artifact, remote, generation: local.localGeneration, revision: session.revision };
      return this.reviewedComparison!;
    });
  }
  /** Explicit choices; reload discards local edits, keep-local replaces remote source. */
  decide(choice: 'reload' | 'keep-local' | 'resume') {
    return this.operation(async () => {
      const review = this.reviewedComparison, copy = this.copy;
      if (!review || !copy || review.generation !== copy.snapshot.localGeneration) throw new Error('Compare again before choosing a resolution.');
      if (choice !== 'reload' && !review.remote.capabilities.edit) throw new Error('Current permission allows reading only. Reload or discard local changes.');
      if (choice === 'resume' && review.remote.checksum !== copy.snapshot.baselineChecksum) throw new Error('Server source changed. Choose reload or keep local source explicitly.');
      const transport = this.transportFactory();
      const checked: ArtifactEditorTransport = { ...transport, load: async locator => {
        const remote = await transport.load(locator);
        if (choice !== 'reload' && !remote.capabilities.edit) throw new Error('Current permission allows reading only. Reload or discard local changes.');
        if (remote.checksum !== review.remote.checksum) { this.comparison = undefined; throw new Error('Server source changed again. Compare again before choosing.'); }
        return remote;
      } };
      if (this.locked) {
        await recoverSuspendedCopy({ copy, originalSubjectId: this.owner!, applicationKey: this.applicationKey, transport: checked,
          resolution: choice === 'reload' ? 'reload' : choice === 'keep-local' ? { merged: { ...review.local, capabilities: review.remote.capabilities } } : undefined });
        this.revision = editorSessionSnapshot()!.revision; this.locked = false;
      } else {
        this.requireCopy(choice !== 'reload');
        const remote = await checked.load(review.remote.locator);
        if (choice === 'reload') await copy.reload();
        else copy.resolve(remote, { ...review.local, capabilities: remote.capabilities });
      }
      this.comparison = undefined;
    });
  }
  close() { return this.operation(async () => {
    if (this.copy && !await this.host.close(this.copy.snapshot.artifact.locator)) return false;
    this.release(); return true;
  }); }
  discard() { return this.operation(async () => {
    if (this.copy) await this.host.discard(this.copy.snapshot.artifact.locator);
    this.release();
  }); }
  async dispose() {
    if (this.disposed) return true;
    if (!await this.close()) return false;
    this.disposed = true; this.detachSession(); this.listeners.clear(); return true;
  }
}
