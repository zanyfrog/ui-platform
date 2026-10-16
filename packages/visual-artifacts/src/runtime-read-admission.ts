import { withRoleBundleGraph } from '@ui-platform/artifacts/storage';

/** Retry only complete runtime captures blocked by a live cooperating writer.
 * Every attempt reacquires the same lock and captures a fresh coherent graph.
 * No source mutation, stale result, lock stealing or corrupt-lock recovery is supplied here. */
export async function withRuntimeGraphRead<T>(ownerRoot: string, capture: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await withRoleBundleGraph(ownerRoot, capture); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'Artifact is locked by another writer.' || attempt >= 19) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
