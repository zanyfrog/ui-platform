import path from 'node:path';
import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';
import { platformRoot } from './paths.js';
const locks = new Map<string, Promise<unknown>>();
/** Serializes builder/template mutations of an Application's source. */
export async function withApplicationMutation<T>(root: string, work: () => Promise<T>): Promise<T> {
  const key = path.resolve(root), previous = locks.get(key) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(() => withRoleBundleGraph(path.join(platformRoot, 'components'), work)); locks.set(key, next);
  try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
}
