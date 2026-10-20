import path from 'node:path';
import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';
import { platformRoot } from './paths.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ArtifactLockOptions } from '@ui-platform/artifacts/storage';
const requestSignals = new AsyncLocalStorage<AbortSignal>();
export function withGraphRequest<T>(signal: AbortSignal, work: () => T): T { return requestSignals.run(signal, work); }
/** Serializes builder/template mutations of an Application's source. */
export async function withApplicationMutation<T>(_root: string, work: () => Promise<T>, options: ArtifactLockOptions = {}): Promise<T> {
  // The existing global Foundation queue already serializes Applications. A
  // second queue hides nested acquisition and cannot cancel queued requests.
  return withRoleBundleGraph(path.join(platformRoot, 'components'), work, { signal: requestSignals.getStore(), ...options });
}
