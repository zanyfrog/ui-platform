import { readFile } from 'node:fs/promises';
import type { EditorPrincipal } from '../shared/editor-security.js';

/** Opt-in fixture data is read only on the server, never VITE_* environment data. */
export async function editorSecurityConfig(environment: NodeJS.ProcessEnv = process.env) {
  const enabled = environment.UI_PLATFORM_EDITOR === '1';
  if (enabled && environment.NODE_ENV !== 'development') throw new Error('UI_PLATFORM_EDITOR requires NODE_ENV=development.');
  if (!enabled) return { enabled: false, fixtures: [] as EditorPrincipal[], ownership: {} };
  const file = environment.UI_PLATFORM_EDITOR_CONFIG;
  if (!file) throw new Error('Set UI_PLATFORM_EDITOR_CONFIG to a server-only fixture settings JSON file.');
  const settings = JSON.parse(await readFile(file, 'utf8'));
  if (!Array.isArray(settings.applications) || settings.applications.some((key: unknown) => typeof key !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key))) throw new Error('Editor settings require explicit application keys.');
  const fixtures: EditorPrincipal[] = settings.fixtures ?? ['admin', 'editor', 'reviewer', 'viewer'].map(role => ({
    subjectId: `dev-${role}`, label: `${role}@uib.test`, roleIds: [role], applicationKeys: settings.applications, isDevelopmentFixture: true,
  }));
  if (!Array.isArray(fixtures)) throw new Error('Invalid editor fixture list.');
  const ownership = settings.ownership ?? {};
  if (!ownership || typeof ownership !== 'object' || Array.isArray(ownership) || Object.values(ownership).some(value => !['application', 'system', 'package'].includes(String(value)))) throw new Error('Invalid editor ownership settings.');
  return { enabled, fixtures, ownership };
}
