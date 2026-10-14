import { workspaceIdentityKey, type AuthorizedWorkspaceArtifact, type WorkspaceArtifact, type WorkspaceTarget } from '../../shared/builder-workspace.js';

export interface WorkspaceEditorState { dirty: boolean; pending: boolean; conflict?: boolean; error?: string }
export interface WorkspaceEditorAdapter {
  element: HTMLElement;
  focus(artifact: AuthorizedWorkspaceArtifact, target: WorkspaceTarget): Promise<void>;
  deactivate(): void;
  suspend(): void;
  state(): WorkspaceEditorState;
  guardClose(): Promise<boolean>;
  dispose(): Promise<void>;
}
export interface WorkspaceTab { key: string; artifact: WorkspaceArtifact; editor: WorkspaceEditorAdapter; suspended: boolean; ownerSubject: string }

/** Navigation only. Editors retain their own drafts, save semantics and selection. */
export class BuilderWorkspaceCoordinator {
  readonly tabs = new Map<string, WorkspaceTab>();
  focused?: string;
  private sequence = 0;
  private disposed = false;
  private requested?: string;
  private listeners = new Set<() => void>();
  private opening = new Map<string, { promise: Promise<WorkspaceTab>; consumers: Set<number> }>();
  constructor(private readonly authorize: (applicationKey: string, target: WorkspaceTarget) => Promise<AuthorizedWorkspaceArtifact>,
    private readonly mount: (artifact: AuthorizedWorkspaceArtifact) => Promise<WorkspaceEditorAdapter>, private readonly subject: () => string | undefined) {}
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  private deactivate() { if (this.focused) this.tabs.get(this.focused)?.editor.deactivate(); this.focused = undefined; }
  async open(applicationKey: string, target: WorkspaceTarget): Promise<boolean> {
    if (this.disposed) return false;
    const sequence = ++this.sequence, subject = this.subject();
    // Hide the outgoing editor during every authorization check, including denied navigation.
    this.deactivate(); this.emit();
    let key: string | undefined;
    try {
      if (!subject) throw new Error('WORKSPACE_IDENTITY_REQUIRED');
      this.requested = workspaceIdentityKey(target.identity);
      const authorized = await this.authorize(applicationKey, target);
      key = workspaceIdentityKey(authorized.identity);
      if (key !== workspaceIdentityKey(target.identity)) throw new Error('WORKSPACE_IDENTITY_CHANGED');
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
      let tab = this.tabs.get(key);
      if (tab && tab.ownerSubject !== subject) throw new Error('Return to the original identity to recover this retained tab, or discard it.');
      if (!tab) {
        let pending = this.opening.get(key);
        if (!pending) {
          pending = { consumers: new Set<number>(), promise: this.mount(authorized).then(editor => ({ key: key!, artifact: authorized, editor, suspended: false, ownerSubject: subject })) };
          this.opening.set(key, pending);
        }
        pending.consumers.add(sequence);
        try {
          tab = await pending.promise;
          if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
          this.tabs.set(key, tab);
        } finally {
          pending.consumers.delete(sequence);
          if (!pending.consumers.size) {
            this.opening.delete(key);
            if (!this.tabs.has(key)) { const orphan = await pending.promise.catch(() => undefined); await orphan?.editor.dispose(); }
          }
        }
      }
      await tab.editor.focus(authorized, target);
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) { if (this.focused !== key) tab.editor.deactivate(); return false; }
      tab.artifact = authorized; tab.suspended = false; this.focused = key; this.emit(); return true;
    } catch (error) {
      if (key && sequence === this.sequence) { const tab = this.tabs.get(key); if (tab) { tab.suspended = true; tab.editor.suspend(); } }
      if (sequence === this.sequence) this.emit();
      throw error;
    }
  }
  park() { this.sequence++; this.deactivate(); this.emit(); }
  suspend() {
    this.sequence++; this.deactivate();
    for (const tab of this.tabs.values()) { tab.suspended = true; tab.editor.suspend(); }
    this.emit();
  }
  async close(key: string, discard = false): Promise<boolean> {
    const tab = this.tabs.get(key); if (!tab) return true;
    if (!discard && !await tab.editor.guardClose()) return false;
    if (this.focused === key || this.requested === key) { this.sequence++; this.deactivate(); }
    this.tabs.delete(key);
    try { await tab.editor.dispose(); } finally { this.emit(); }
    return true;
  }
  async dispose() {
    this.disposed = true; this.suspend();
    await Promise.allSettled([...this.tabs.keys()].map(key => this.close(key, true)));
    this.listeners.clear();
  }
}
