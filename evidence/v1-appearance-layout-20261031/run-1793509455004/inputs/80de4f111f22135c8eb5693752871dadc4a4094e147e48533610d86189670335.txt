import { defaultAutosave, validateAutosave, type AutosaveSettings } from '../../shared/platform-settings.js';

let current: AutosaveSettings = { ...defaultAutosave };
const listeners = new Set<(value: AutosaveSettings) => void>();
export function autosaveConfiguration() { return { ...current }; }
export function configureAutosave(value: AutosaveSettings) {
  validateAutosave(value);
  if (current.enabled === value.enabled && current.delayMs === value.delayMs) return;
  current = { ...value }; for (const listener of listeners) listener({ ...current });
}
export function subscribeAutosave(listener: (value: AutosaveSettings) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
