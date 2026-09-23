import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import {
  FileSystemArtifactService,
  type ArtifactWatcher,
  type ArtifactWatchEvent,
} from "@ui-platform/artifacts";

/** One service per application keeps artifact identities scoped to that application. */
export async function startApplicationArtifactWatchers(
  appsRoot: string,
  onChange: (event: ArtifactWatchEvent) => void,
  onError: (error: Error) => void = console.error,
  intervalMs = 1500,
): Promise<ArtifactWatcher> {
  const watchers = new Map<string, ArtifactWatcher>();
  let stopped = false;
  let running: Promise<void> | undefined;
  const refresh = async () => {
    const entries = await readdir(appsRoot, { withFileTypes: true }).catch(
      (cause: NodeJS.ErrnoException) => {
        if (cause.code === "ENOENT") return [];
        throw cause;
      },
    );
    const current = new Set<string>();
    for (const entry of entries) {
      if (stopped) return;
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const root = path.join(appsRoot, entry.name);
      if (
        !(
          await stat(path.join(root, "app.manifest.json")).catch(
            () => undefined,
          )
        )?.isFile()
      )
        continue;
      current.add(root);
      if (!watchers.has(root)) {
        try {
          const service = new FileSystemArtifactService({ root });
          watchers.set(
            root,
            await service.startWatching({ onChange, onError }),
          );
        } catch (cause) {
          onError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      }
    }
    for (const [root, watcher] of watchers)
      if (!current.has(root)) {
        await watcher.close();
        watchers.delete(root);
      }
  };
  await refresh();
  const timer = setInterval(() => {
    if (stopped || running) return;
    running = refresh()
      .catch((cause) =>
        onError(cause instanceof Error ? cause : new Error(String(cause))),
      )
      .finally(() => {
        running = undefined;
      });
  }, intervalMs);
  return {
    async close() {
      stopped = true;
      clearInterval(timer);
      await running;
      await Promise.all(
        [...watchers.values()].map((watcher) => watcher.close()),
      );
      watchers.clear();
    },
  };
}
