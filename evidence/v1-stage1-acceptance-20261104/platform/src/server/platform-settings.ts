import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { withArtifactLock } from '@ui-platform/artifacts/storage';
import { atomicWriteJson } from './json-files.js';
import { defaultPlatformSettings, validatePlatformSettings, type PlatformSettingsSnapshot } from '../shared/platform-settings.js';

const digest = (text: string) => createHash('sha256').update(text).digest('hex');
export class PlatformSettingsError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
/** One Platform file; all writers share the existing cross-process live-owner lock. */
export class PlatformSettingsAuthority {
  readonly file: string;
  constructor(readonly root: string) { this.file = path.join(root, 'platform.settings.json'); }
  async read(): Promise<PlatformSettingsSnapshot> {
    let text: string;
    try {
      if ((await lstat(this.file)).isSymbolicLink()) throw new Error('Symbolic settings file is unsupported.');
      text = await readFile(this.file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { settings: defaultPlatformSettings(), revision: 'absent', source: 'default' };
      return this.fallback('unreadable');
    }
    try { const settings: unknown = JSON.parse(text); validatePlatformSettings(settings); return { settings, revision: digest(text), source: 'stored' }; }
    catch { return this.fallback(digest(text)); }
  }
  private fallback(revision: string): PlatformSettingsSnapshot {
    const settings = defaultPlatformSettings(); settings.editor.autosave.enabled = false;
    return { settings, revision, source: 'fallback', problem: 'Platform settings are invalid or unreadable. Automatic saves are disabled; drafts and Save Now remain available. Restore valid configuration without discarding the stored file.' };
  }
  async update(value: unknown, expectedRevision: unknown, admit: () => Promise<void>): Promise<PlatformSettingsSnapshot> {
    validatePlatformSettings(value);
    const candidate = structuredClone(value);
    if (typeof expectedRevision !== 'string' || !expectedRevision) throw new PlatformSettingsError(409, 'settings.revision-required', 'Reload Platform settings before saving.');
    return withArtifactLock(this.root, this.file, async () => {
      await admit();
      const current = await this.read();
      if (current.source === 'fallback') throw new PlatformSettingsError(409, 'settings.recovery-required', current.problem!);
      if (current.revision !== expectedRevision) throw new PlatformSettingsError(409, 'settings.conflict', 'Platform settings changed. Reload before saving.');
      await admit(); await atomicWriteJson(this.file, candidate);
      return this.read();
    }, 'platform-settings-v1');
  }
}
