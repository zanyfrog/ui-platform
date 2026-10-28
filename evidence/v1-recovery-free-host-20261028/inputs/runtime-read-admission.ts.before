import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';
import type { ArtifactLockOptions } from '@ui-platform/artifacts/storage';

/** Foundation waits for acquisition only. An admitted capture runs exactly once;
 * validation, recovery and callback errors never trigger a capture replay. */
export async function withRuntimeGraphRead<T>(ownerRoot: string, capture: () => Promise<T>, options: ArtifactLockOptions = {}): Promise<T> {
  return withRoleBundleGraph(ownerRoot, capture, options);
}
