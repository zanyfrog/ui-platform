import { EditorTransportError, type ArtifactEditorTransport, type EditorArtifactDto, type EditorWatchEvent, type EditorSaveDto } from '../../shared/artifact-editor.js';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'error';
/** Framework-independent state shared by all tabs. Snapshots never expose mutable internals. */
export class EditorWorkingCopy {
  private current: EditorArtifactDto;
  private baseline: EditorArtifactDto;
  private generation = 0;
  private savedGeneration = 0;
  private state: SaveState = 'idle';
  private failure?: string;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight?: Promise<void>;
  private unsubscribe?: () => void;
  private listeners = new Set<() => void>();
  private disposed = false;
  private suspended = false;
  private lastEdit = 0;
  private refreshSequence = 0;
  private deferredEvent?: EditorWatchEvent;
  constructor(artifact: EditorArtifactDto, private transport: ArtifactEditorTransport) {
    this.current = structuredClone(artifact); this.baseline = structuredClone(artifact);
    this.unsubscribe = transport.subscribe?.(artifact.locator, event => { void this.externalChange(event); });
  }
  get snapshot() { return { artifact: structuredClone(this.current), baselineChecksum: this.baseline.checksum, localGeneration: this.generation, lastSavedGeneration: this.savedGeneration, saveState: this.state, error: this.failure, dirty: this.generation !== this.savedGeneration }; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  private edit() {
    if (this.suspended) throw new Error('Working copy is suspended after an identity change.');
    this.generation++; this.lastEdit = Date.now();
    if (this.state !== 'conflict') { this.state = this.inFlight ? 'saving' : 'pending'; this.failure = undefined; this.schedule(); }
    this.emit();
  }
  setManifest(source: string) {
    if (this.disposed) throw new Error('Working copy is closed.');
    if (this.suspended) throw new Error('Working copy is suspended after an identity change.');
    this.current.manifestContent = source;
    try { const parsed = JSON.parse(source); this.current.manifest = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null; } catch { this.current.manifest = null; }
    this.edit();
  }
  setFile(filePath: string, content: string | null, role?: string, language?: string) {
    if (this.disposed) throw new Error('Working copy is closed.');
    if (this.suspended) throw new Error('Working copy is suspended after an identity change.');
    const file = this.current.files.find(file => file.path === filePath);
    if (content === null) this.current.files = this.current.files.filter(file => file.path !== filePath);
    else if (file) file.content = content;
    else this.current.files.push({ path: filePath, role: role ?? filePath, language, content });
    this.edit();
  }
  private schedule() {
    clearTimeout(this.timer);
    if (this.disposed || this.suspended || this.inFlight || this.state === 'conflict' || this.state === 'error' || this.generation === this.savedGeneration) return;
    this.timer = setTimeout(() => { void this.flush(); }, Math.max(0, 2000 - (Date.now() - this.lastEdit)));
  }
  private changes(snapshot: EditorArtifactDto): EditorSaveDto {
    const files: Record<string, string | null> = Object.create(null);
    for (const file of snapshot.files) if (this.baseline.files.find(f => f.path === file.path)?.content !== file.content) files[file.path] = file.content;
    for (const file of this.baseline.files) if (!snapshot.files.some(f => f.path === file.path)) files[file.path] = null;
    return { expectedChecksum: this.baseline.checksum, ...(snapshot.manifestContent !== this.baseline.manifestContent ? { manifest: snapshot.manifestContent } : {}), files };
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.suspended) return;
    if (this.inFlight) { await this.inFlight; if (this.state !== 'error' && this.state !== 'conflict') return this.flush(); return; }
    if (this.disposed || this.state === 'conflict' || this.generation === this.savedGeneration) return;
    const snapshot = structuredClone(this.current), generation = this.generation;
    this.refreshSequence++;
    const changes = this.changes(snapshot);
    this.state = 'saving'; this.failure = undefined; this.emit();
    this.inFlight = (async () => {
      try {
        const result = await this.transport.save(snapshot.locator, changes);
        if (!result.saved) throw new Error('The server did not save this artifact.');
        this.baseline = structuredClone(result.artifact); this.savedGeneration = generation;
        if (generation === this.generation) this.current = structuredClone(result.artifact);
        else {
          // Reconcile only fields whose source still matches the captured save.
          if (this.current.manifestContent === snapshot.manifestContent) { this.current.manifestContent = result.artifact.manifestContent; this.current.manifest = structuredClone(result.artifact.manifest); }
          const paths = new Set([...snapshot.files, ...result.artifact.files].map(f => f.path));
          for (const filePath of paths) {
            const before = snapshot.files.find(f => f.path === filePath), now = this.current.files.find(f => f.path === filePath), returned = result.artifact.files.find(f => f.path === filePath);
            if (before?.content !== now?.content) continue;
            this.current.files = this.current.files.filter(f => f.path !== filePath);
            if (returned) this.current.files.push(structuredClone(returned));
          }
          this.current.checksum = result.artifact.checksum; this.current.validation = structuredClone(result.validation);
          this.current.references = structuredClone(result.artifact.references); this.current.capabilities = { ...result.artifact.capabilities };
        }
        this.state = this.generation === generation ? 'saved' : 'pending';
      } catch (error) {
        this.state = error instanceof EditorTransportError && error.status === 409 ? 'conflict' : 'error';
        this.failure = error instanceof Error ? error.message : String(error);
      }
    })();
    await this.inFlight; this.inFlight = undefined;
    const event = this.deferredEvent; this.deferredEvent = undefined;
    if (event) await this.externalChange(event);
    this.schedule(); this.emit();
  }
  async externalChange(event: EditorWatchEvent) {
    if (this.disposed || this.suspended) return;
    if (this.inFlight) { this.deferredEvent = event; return; }
    if (event.kind === 'changed' && event.checksum === this.baseline.checksum) return;
    const sequence = ++this.refreshSequence, generation = this.generation;
    const previousState = this.state;
    if (this.generation !== this.savedGeneration) { clearTimeout(this.timer); this.state = 'conflict'; this.emit(); }
    try {
      const remote = event.kind === 'removed' ? undefined : await this.transport.load(this.current.locator);
      if (this.disposed || sequence !== this.refreshSequence) return;
      if (remote?.checksum === this.baseline.checksum) { this.state = previousState; this.schedule(); this.emit(); return; }
      if (!remote || this.generation !== this.savedGeneration || generation !== this.generation || this.inFlight) { clearTimeout(this.timer); this.state = 'conflict'; }
      else { this.current = structuredClone(remote); this.baseline = structuredClone(remote); this.state = 'idle'; }
    } catch (error) { this.failure = error instanceof Error ? error.message : String(error); this.state = 'error'; }
    this.emit();
  }
  /** Explicit destructive user choice; ordinary change events never discard edits. */
  async reload() {
    if (this.suspended) throw new Error('Working copy is suspended after an identity change.');
    if (this.inFlight) await this.inFlight;
    const generation = this.generation;
    const remote = await this.transport.load(this.current.locator);
    if (generation !== this.generation) throw new Error('New edits arrived during reload.');
    clearTimeout(this.timer); this.current = structuredClone(remote); this.baseline = structuredClone(remote);
    this.savedGeneration = this.generation; this.state = 'idle'; this.failure = undefined; this.emit();
  }
  async compare() { if (this.suspended) throw new Error('Working copy is suspended after an identity change.'); return { local: structuredClone(this.current), remote: await this.transport.load(this.current.locator) }; }
  /** Caller supplies an explicitly reviewed merge and the remote snapshot it was based on. */
  resolve(remote: EditorArtifactDto, merged: EditorArtifactDto) {
    if (this.suspended) throw new Error('Working copy is suspended after an identity change.');
    if (this.state !== 'conflict' || remote.locator !== this.current.locator || merged.locator !== remote.locator) throw new Error('A matching conflict is required.');
    this.baseline = structuredClone(remote); this.current = structuredClone(merged); this.state = 'pending'; this.edit();
  }
  async close(): Promise<boolean> {
    if (this.suspended) return false;
    await this.flush();
    if (this.generation !== this.savedGeneration) return false;
    this.disposed = true; clearTimeout(this.timer); this.unsubscribe?.(); this.listeners.clear(); return true;
  }
  /** Stop timers, mutations and watcher updates while retaining this copy in memory. */
  suspend(): void {
    if (this.disposed || this.suspended) return;
    this.suspended = true; clearTimeout(this.timer); this.unsubscribe?.(); this.unsubscribe = undefined; this.emit();
  }
  /** Reuse this copy only after a fresh authorized load and an explicit changed-checksum choice. */
  recover(transport: ArtifactEditorTransport, remote: EditorArtifactDto, resolution?: 'reload' | { merged: EditorArtifactDto }): void {
    if (!this.suspended || this.disposed) throw new Error('Only a suspended working copy can be recovered.');
    if (remote.locator !== this.current.locator) throw new Error('Recovery must load the same artifact.');
    const changed = remote.checksum !== this.baseline.checksum;
    if (changed && !resolution) throw new Error('The server copy changed. Choose reload or provide an explicit merge.');
    const restored = resolution === 'reload' ? remote : typeof resolution === 'object' ? resolution.merged : this.current;
    if (restored.locator !== remote.locator) throw new Error('A matching recovery artifact is required.');
    this.unsubscribe?.(); this.transport = transport;
    this.current = structuredClone(restored); this.baseline = structuredClone(remote);
    if (resolution === 'reload') this.savedGeneration = this.generation;
    else this.generation++;
    this.suspended = false; this.state = this.generation === this.savedGeneration ? 'saved' : 'pending'; this.failure = undefined;
    this.unsubscribe = transport.subscribe?.(remote.locator, event => { void this.externalChange(event); });
    this.schedule(); this.emit();
  }
  /** Deliberately discard retained local edits. Wait for admitted writes; they are not canceled. */
  async discard(): Promise<boolean> {
    if (this.disposed) return true;
    this.suspended = true; clearTimeout(this.timer); this.unsubscribe?.(); this.unsubscribe = undefined;
    if (this.inFlight) await this.inFlight;
    this.disposed = true; this.listeners.clear(); return true;
  }
}

/** Create one host per application; concurrent opens of a locator share the same copy. */
export class EditorWorkingCopyHost {
  private copies = new Map<string, Promise<EditorWorkingCopy>>();
  constructor(private transport: ArtifactEditorTransport) {}
  open(locator: string): Promise<EditorWorkingCopy> {
    let copy = this.copies.get(locator);
    if (!copy) {
      copy = this.transport.load(locator).then(artifact => new EditorWorkingCopy(artifact, this.transport)).catch(error => { this.copies.delete(locator); throw error; });
      this.copies.set(locator, copy);
    }
    return copy;
  }
  async close(locator: string) {
    const copy = await this.copies.get(locator);
    if (copy && !await copy.close()) return false;
    this.copies.delete(locator); return true;
  }
  /** Explicitly release retained memory without asking the server to discard a committed save. */
  async discard(locator: string): Promise<boolean> {
    const promise = this.copies.get(locator);
    if (!promise) return true;
    const copy = await promise;
    await copy.discard();
    if (this.copies.get(locator) === promise) this.copies.delete(locator);
    return true;
  }
}

/** Host navigation should await close(); browser unload can only attempt a best-effort save. */
export function protectPendingChanges(copy: EditorWorkingCopy, host: Window = window) {
  const handler = (event: BeforeUnloadEvent) => { if (copy.snapshot.dirty) { void copy.flush(); event.preventDefault(); event.returnValue = ''; } };
  host.addEventListener('beforeunload', handler);
  return () => host.removeEventListener('beforeunload', handler);
}
