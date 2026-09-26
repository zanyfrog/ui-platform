import { assertJsonSafe } from '../../shared/editor-presentation.js';
import type { EditorRuntimeContext } from './context.js';

export interface EditorPluginDescriptor {
  id: string;
  artifactTypes: string[];
  definitionVersions: number[];
  contributes: { id: string; label: string; slot: 'tab' | 'toolbar' | 'context'; order?: number; requiresEdit?: boolean }[];
}
export interface EditorPluginScope {
  /** Bound events are cleaned up and failures stay in this contribution. */
  listen(target: EventTarget, event: string, handler: (event: Event) => void | Promise<void>): void;
  subscribe(listener: () => void | Promise<void>): void;
  onCleanup(cleanup: () => void): void;
  openSource(): void;
}
export type EditorPluginRenderer = (container: HTMLElement, context: EditorRuntimeContext, scope: EditorPluginScope) => void;
export class EditorPluginRegistry {
  private entries = new Map<string, { descriptor: EditorPluginDescriptor; renderers: Record<string, EditorPluginRenderer> }>();
  private listeners = new Set<() => void>();
  register(descriptor: EditorPluginDescriptor, renderers: Record<string, EditorPluginRenderer>) {
    assertJsonSafe(descriptor);
    const validId = (id: unknown) => typeof id === 'string' && /^[a-z][a-z0-9._-]*$/.test(id);
    if (!validId(descriptor.id) || this.entries.has(descriptor.id)) throw new Error('Plugin ID is missing, invalid or already registered.');
    if (!descriptor.artifactTypes?.length || !descriptor.definitionVersions?.length || descriptor.artifactTypes.some(type => typeof type !== 'string' || !type) || descriptor.definitionVersions.some(version => !Number.isInteger(version) || version < 1)) throw new Error('Plugin requires artifact types and exact definition versions.');
    const ids = new Set<string>();
    for (const contribution of descriptor.contributes) {
      if (!validId(contribution.id) || ids.has(contribution.id) || typeof contribution.label !== 'string' || !contribution.label || !['tab', 'toolbar', 'context'].includes(contribution.slot) || typeof renderers[contribution.id] !== 'function' || (contribution.requiresEdit !== undefined && typeof contribution.requiresEdit !== 'boolean')) throw new Error('Invalid or duplicate plugin contribution.');
      ids.add(contribution.id);
    }
    this.entries.set(descriptor.id, { descriptor: structuredClone(descriptor), renderers: { ...renderers } }); this.emit();
    return () => { this.entries.delete(descriptor.id); this.emit(); };
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private emit() { for (const listener of this.listeners) listener(); }
  select(context: EditorRuntimeContext) {
    const artifact = context.snapshot?.artifact, manifest = artifact?.manifest;
    const issues: string[] = [];
    const selected: { key: string; contribution: EditorPluginDescriptor['contributes'][number]; render: EditorPluginRenderer }[] = [];
    if (!manifest) return { selected, issues };
    for (const { descriptor, renderers } of this.entries.values()) {
      if (!descriptor.artifactTypes.includes(manifest.artifactType)) continue;
      if (!descriptor.definitionVersions.includes(manifest.definitionVersion)) { issues.push(`${descriptor.id}: incompatible definition version; source is preserved.`); continue; }
      for (const contribution of descriptor.contributes) if (!contribution.requiresEdit || artifact!.capabilities.edit) selected.push({ key: `plugin:${descriptor.id}:${contribution.id}`, contribution, render: renderers[contribution.id] });
    }
    for (const id of artifact?.presentation?.preferredEditorIds ?? []) if (!this.entries.has(id)) issues.push(`${id}: optional editor plugin is not installed; source is preserved.`);
    selected.sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0) || a.key.localeCompare(b.key));
    return { selected, issues };
  }
}
/** Plugins are trusted app modules, not a sandbox. Event/cleanup failures cannot break the host. */
export function mountPlugin(container: HTMLElement, context: EditorRuntimeContext, render: EditorPluginRenderer, openSource: () => void) {
  let disposed = false, failed = false; const cleanups: (() => void)[] = [];
  const cleanupAll = () => { for (const cleanup of cleanups.splice(0).reverse()) { try { Promise.resolve(cleanup()).catch(() => {}); } catch { /* Isolate plugin cleanup failures. */ } } };
  const fail = () => {
    if (disposed || failed) return;
    failed = true; cleanupAll();
    container.replaceChildren(); const message = document.createElement('p'); message.textContent = 'Editor plugin failed. Shared source is preserved; use another panel or the source preview.';
    container.append(message);
  };
  const scope: EditorPluginScope = {
    openSource: () => { if (!disposed && !failed) openSource(); },
    onCleanup: cleanup => {
      if (!disposed && !failed) cleanups.push(cleanup);
      else { try { Promise.resolve(cleanup()).catch(() => {}); } catch { /* Late async setup must still clean up. */ } }
    },
    subscribe(listener) {
      if (disposed || failed) return;
      cleanups.push(context.subscribe(() => { if (!disposed && !failed) { try { Promise.resolve(listener()).catch(fail); } catch { fail(); } } }));
    },
    listen(target, event, handler) {
      if (disposed || failed) return;
      const guarded = (event: Event) => {
        if (disposed || failed) return;
        try { Promise.resolve(handler(event)).catch(fail); } catch { fail(); }
      };
      target.addEventListener(event, guarded); cleanups.push(() => target.removeEventListener(event, guarded));
    },
  };
  try { Promise.resolve(render(container, context, scope)).catch(fail); } catch { fail(); }
  return () => { disposed = true; cleanupAll(); container.replaceChildren(); };
}
