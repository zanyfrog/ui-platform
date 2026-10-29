/// <reference types="vite/client" />
const listeners = new Set<(applicationKey?: string) => void>();
/** Notification only after an admitted source write; no source or working copy is carried. */
export function sourceSaved(url: string) {
  if (!import.meta.env.DEV) return;
  const match = /^\/api\/apps\/([^/]+)\/(visual-|composition-source|settings|presentation|artifacts)/.exec(url);
  if (match || url.startsWith('/api/automation/')) for (const listener of listeners) listener(match && !url.includes('/visual-components') ? decodeURIComponent(match[1]) : undefined);
}
export function subscribeSourceSaved(listener: (applicationKey?: string) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
