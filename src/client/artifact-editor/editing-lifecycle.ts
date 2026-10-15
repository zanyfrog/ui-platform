/** Session-only editing state. Format adapters own validation, identity and persistence. */
export type EditingState = 'idle' | 'pending' | 'saving' | 'saved' | 'conflict' | 'error';
export class EditingLifecycle<T> {
  current: T;
  baseline: T;
  generation = 0;
  savedGeneration = 0;
  state: EditingState = 'idle';
  failure?: string;
  notice?: string;
  suspended = false;
  disposed = false;
  inFlight?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private lastEdit = 0;
  private past: Array<{ value: T; bytes: number }> = [];
  private future: Array<{ value: T; bytes: number }> = [];
  private group?: string;
  private groupTime = 0;
  private uncertain = false;
  private listeners = new Set<() => void>();
  constructor(value: T, private save: (candidate: T, baseline: T) => Promise<T>,
    private equal: (a: T, b: T) => boolean = (a, b) => JSON.stringify(a) === JSON.stringify(b),
    private limits = { entries: 100, bytes: 8 * 1024 * 1024 }) {
    this.current = structuredClone(value); this.baseline = structuredClone(value);
  }
  get dirty() { return this.uncertain || !this.equal(this.current, this.baseline); }
  get canUndo() { return !this.suspended && !this.disposed && !!this.past.length; }
  get canRedo() { return !this.suspended && !this.disposed && !!this.future.length; }
  get historySize() { return { entries: this.past.length + this.future.length, bytes: [...this.past, ...this.future].reduce((n, entry) => n + entry.bytes, 0) }; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  emit() { for (const listener of this.listeners) listener(); }
  private entry(value: T) {
    const retained = structuredClone(value), seen = new WeakSet<object>();
    const estimate = (item: unknown): number => {
      if (typeof item === 'string') return 32 + item.length * 2;
      if (!item || typeof item !== 'object') return 8;
      if (seen.has(item)) return 0; seen.add(item);
      return 64 + Object.entries(item).reduce((bytes, [key, child]) => bytes + 16 + key.length * 2 + estimate(child), 0);
    };
    return { value: retained, bytes: estimate(retained) };
  }
  private bound() {
    while (this.historySize.entries > this.limits.entries || this.historySize.bytes > this.limits.bytes) {
      if (this.past.length) this.past.shift(); else this.future.shift();
    }
  }
  edit(value: T, group?: string) {
    if (this.suspended || this.disposed) throw new Error('Editing access is suspended or closed.');
    if (this.equal(value, this.current)) return;
    const now = Date.now();
    if (!group || group !== this.group || now - this.groupTime > 750) this.past.push(this.entry(this.current));
    this.future = []; this.group = group; this.groupTime = now; this.bound();
    this.current = structuredClone(value); this.changed();
  }
  private changed() {
    this.generation++; this.lastEdit = Date.now(); this.notice = undefined;
    if (this.state !== 'conflict') { this.state = this.inFlight ? 'saving' : this.dirty ? 'pending' : 'saved'; this.failure = undefined; }
    this.schedule(); this.emit();
  }
  undo() {
    if (!this.canUndo) return;
    this.future.push(this.entry(this.current)); this.current = this.past.pop()!.value; this.group = undefined; this.bound(); this.changed();
  }
  redo() {
    if (!this.canRedo) return;
    this.past.push(this.entry(this.current)); this.current = this.future.pop()!.value; this.group = undefined; this.bound(); this.changed();
  }
  schedule() {
    clearTimeout(this.timer);
    if (this.disposed || this.suspended || this.inFlight || this.failure || this.state === 'conflict' || this.state === 'error' || !this.dirty) return;
    this.timer = setTimeout(() => { void this.flush(); }, Math.max(0, 2000 - (Date.now() - this.lastEdit)));
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.inFlight) { await this.inFlight; if (this.state !== 'error' && this.state !== 'conflict') return this.flush(); return; }
    if (this.disposed || this.suspended || this.state === 'conflict') return;
    if (!this.dirty) { this.savedGeneration = this.generation; this.state = 'saved'; this.emit(); return; }
    const candidate = structuredClone(this.current), baseline = structuredClone(this.baseline), generation = this.generation;
    this.state = 'saving'; this.failure = undefined; this.emit();
    this.inFlight = (async () => {
      try {
        const saved = await this.save(candidate, baseline);
        this.baseline = structuredClone(saved); this.savedGeneration = generation; this.uncertain = false;
        if (this.generation === generation) this.current = structuredClone(saved);
        if (this.state !== 'conflict') this.state = this.dirty ? 'pending' : 'saved';
      } catch (error) {
        const failure = error as { status?: number; message?: string; validation?: { valid: boolean } };
        if (this.state !== 'conflict') {
          const invalid = failure.status === 422 || failure.validation?.valid === false;
          if (invalid && this.generation !== generation) { this.state = this.dirty ? 'pending' : 'saved'; this.failure = undefined; }
          else {
            this.state = failure.status === 409 ? 'conflict' : invalid ? 'pending' : 'error';
            this.failure = failure.message ?? String(error);
            // A failed response may hide a committed write. Even a subsequent Undo
            // to the old baseline must remain recoverable until source is confirmed.
            if (this.state === 'error') this.uncertain = true;
          }
        }
      }
    })();
    await this.inFlight; this.inFlight = undefined;
    // Invalid unchanged drafts await a correction or explicit retry, avoiding a retry loop.
    if (this.generation !== generation || !this.failure) this.schedule();
    this.emit();
  }
  conflict(message = 'Source changed outside Builder. Compare or reload; local changes retained.') {
    clearTimeout(this.timer); this.state = 'conflict'; this.failure = message; this.emit();
  }
  reset(remote: T, local: T = remote) {
    if (this.inFlight) throw new Error('Wait for the admitted save before replacing the baseline.');
    clearTimeout(this.timer); this.uncertain = false; this.baseline = structuredClone(remote); this.current = structuredClone(local);
    this.past = []; this.future = []; this.group = undefined; this.generation++;
    this.savedGeneration = this.dirty ? this.generation - 1 : this.generation;
    this.state = this.dirty ? 'pending' : 'idle'; this.failure = undefined;
    this.notice = 'Source baseline replaced. Undo/Redo history reset.'; this.schedule(); this.emit();
  }
  confirmBaseline(remote: T) {
    if (!this.equal(remote, this.baseline)) throw new Error('Changed source requires explicit baseline replacement.');
    this.baseline = structuredClone(remote); this.uncertain = false;
  }
  suspend() { this.suspended = true; clearTimeout(this.timer); this.emit(); }
  resume() { if (this.disposed) throw new Error('Editor is closed.'); if (!this.suspended) return; this.suspended = false; this.schedule(); this.emit(); }
  async dispose() { this.suspend(); if (this.inFlight) await this.inFlight; this.disposed = true; this.past = []; this.future = []; this.listeners.clear(); }
}

export function protectEditingDraft(needsWarning: () => boolean, host: Window = window) {
  const handler = (event: BeforeUnloadEvent) => { if (needsWarning()) { event.preventDefault(); event.returnValue = ''; } };
  host.addEventListener('beforeunload', handler);
  return () => host.removeEventListener('beforeunload', handler);
}
export const editingStatus = (state: EditingState, dirty: boolean) => state === 'saving' ? 'Saving' : state === 'conflict' ? 'Conflict' : state === 'error' ? 'Save Failed' : dirty ? 'Unsaved' : 'Saved';
