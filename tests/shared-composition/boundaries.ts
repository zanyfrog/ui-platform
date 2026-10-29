import path from 'node:path';
export const platformRoot = process.env.SHARED_COMPOSITION_TEST_ROOT!;
export const appsDir = path.join(platformRoot, 'apps');
export function appPath(key: string) { if (key !== 'fixture') throw Error('Unadmitted test Application'); return path.join(appsDir, key); }
export async function discoverComponents() { return []; }
export function moveToOsTrash() { throw Error('Deletion is outside this fixture'); }
