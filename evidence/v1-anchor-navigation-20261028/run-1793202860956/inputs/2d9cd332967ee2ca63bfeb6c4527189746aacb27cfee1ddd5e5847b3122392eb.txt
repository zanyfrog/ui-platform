export interface AutosaveSettings { enabled: boolean; delayMs: number }
export interface PlatformSettings { format: 'ui-platform.settings'; version: 1; editor: { autosave: AutosaveSettings } }
export interface PlatformSettingsSnapshot {
  settings: PlatformSettings; revision: string; source: 'default' | 'stored' | 'fallback'; problem?: string; canModify?: boolean;
}
export const defaultAutosave: Readonly<AutosaveSettings> = Object.freeze({ enabled: true, delayMs: 2000 });
export const defaultPlatformSettings = (): PlatformSettings => ({ format: 'ui-platform.settings', version: 1, editor: { autosave: { ...defaultAutosave } } });
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function validateAutosave(value: unknown): asserts value is AutosaveSettings {
  if (!record(value) || Object.keys(value).some(key => !['enabled', 'delayMs'].includes(key)) || typeof value.enabled !== 'boolean' ||
      !Number.isInteger(value.delayMs) || (value.delayMs as number) < 100 || (value.delayMs as number) > 60000 || (value.delayMs as number) % 10 !== 0)
    throw new Error('Autosave requires a boolean enabled value and an integer delay of 100–60000 milliseconds in increments of 10.');
}
export function validatePlatformSettings(value: unknown): asserts value is PlatformSettings {
  if (!record(value) || value.format !== 'ui-platform.settings' || value.version !== 1 || Object.keys(value).some(key => !['format', 'version', 'editor'].includes(key)) ||
      !record(value.editor) || Object.keys(value.editor).some(key => key !== 'autosave')) throw new Error('Unsupported Platform settings format or version.');
  validateAutosave(value.editor.autosave);
}
/** Parse decimal seconds as digits, never round floating point input. */
export function autosaveMilliseconds(seconds: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(seconds)) throw new Error('Enter seconds using at most two decimal places.');
  const [whole, fraction = ''] = seconds.split('.');
  const delayMs = Number(whole) * 1000 + Number(fraction.padEnd(2, '0')) * 10;
  validateAutosave({ enabled: true, delayMs }); return delayMs;
}
