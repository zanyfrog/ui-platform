import { watch, type FSWatcher } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  capture,
  checksum,
  discoverBundles,
  readOptional,
  safeFile,
} from "./bundle.js";
import type {
  ArtifactWatcher,
  ArtifactWatchOptions,
  EditableArtifact,
} from "./types.js";

interface WatchHandlers {
  changed(bundle: string): Promise<EditableArtifact | undefined>;
  removed(bundle: string): Promise<void>;
  error(cause: Error): Promise<void>;
}
const ignored = new Set([
  ".uib",
  ".git",
  "node_modules",
  "dist",
  "dist-server",
  ".vite",
]);

/** Native notifications provide prompt detection; reconciliation handles dropped events. */
export async function startArtifactWatcher(
  root: string,
  handlers: WatchHandlers,
  options: ArtifactWatchOptions = {},
): Promise<ArtifactWatcher> {
  root = await realpath(root);
  const debounce = options.debounceMs ?? 150;
  const interval = options.pollIntervalMs ?? 1000;
  if (
    !Number.isFinite(debounce) ||
    debounce < 0 ||
    !Number.isFinite(interval) ||
    interval < 10
  )
    throw new Error(
      "Watcher requires a nonnegative debounce and a poll interval of at least 10 ms.",
    );
  const known = new Map<string, string>();
  const pending = new Map<string, { signature: string; since: number }>();
  let closed = false;
  let ready = false;
  let native: FSWatcher | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polling: ReturnType<typeof setInterval> | undefined;
  let running: Promise<void> | undefined;
  let lastError = "";
  const report = async (cause: unknown) => {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    if (error.message === lastError || closed) return;
    lastError = error.message;
    try {
      await handlers.error(error);
    } catch {
      /* Still report storage failures to the caller. */
    }
    try {
      options.onError?.(error);
    } catch {
      /* Observers cannot stop the watcher. */
    }
  };
  const notify = async (
    event: Parameters<NonNullable<ArtifactWatchOptions["onChange"]>>[0],
  ) => {
    if (!closed)
      try {
        await options.onChange?.(event);
      } catch (cause) {
        await report(cause);
      }
  };
  const signature = async (bundle: string): Promise<string> => {
    try {
      return checksum(await capture(bundle));
    } catch (cause) {
      if (!(await stat(bundle).catch(() => undefined))) return "removed";
      return checksum({
        "artifact.json": await readOptional(
          await safeFile(bundle, "artifact.json"),
        ),
        accessError: String(cause),
      });
    }
  };
  const schedule = () => {
    if (closed || !ready) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(tick, debounce);
  };
  const reconcile = async () => {
    const bundles = new Set([
      ...(await discoverBundles(root)),
      ...known.keys(),
    ]);
    for (const bundle of bundles) {
      if (closed) return;
      try {
        const next = await signature(bundle);
        if (known.get(bundle) === next) {
          pending.delete(bundle);
          continue;
        }
        const candidate = pending.get(bundle);
        if (!candidate || candidate.signature !== next) {
          pending.set(bundle, { signature: next, since: Date.now() });
          schedule();
          continue;
        }
        if (Date.now() - candidate.since < debounce) {
          schedule();
          continue;
        }
        if (next === "removed") {
          await handlers.removed(bundle);
          known.delete(bundle);
          await notify({ kind: "removed", bundlePath: bundle });
        } else {
          const artifact = await handlers.changed(bundle);
          known.set(
            bundle,
            artifact &&
              !artifact.validation.diagnostics.some(
                (d) => d.code === "file.access",
              )
              ? artifact.checksum
              : next,
          );
          if (artifact)
            await notify({ kind: "changed", bundlePath: bundle, artifact });
        }
        pending.delete(bundle);
        lastError = "";
      } catch (cause) {
        // Do not accept the new signature on failure; retry on the next scan.
        await report(cause);
      }
    }
  };
  function tick() {
    if (closed || !ready || running) return;
    running = reconcile()
      .catch(report)
      .finally(() => {
        running = undefined;
      });
  }
  try {
    try {
      native = watch(root, { recursive: true }, (_event, filename) => {
        if (
          filename &&
          filename
            .toString()
            .split(/[\\/]/)
            .some((part) => ignored.has(part.toLowerCase()))
        )
          return;
        if (filename && /\.[0-9a-f-]{36}\.tmp$/i.test(filename.toString()))
          return;
        schedule();
      });
      native.on("error", (cause) => {
        native?.close();
        native = undefined;
        void report(cause);
      });
    } catch (cause) {
      // Recursive native watching is not available on every Node/OS combination.
      await report(cause);
    }
    for (const bundle of await discoverBundles(root))
      known.set(bundle, await signature(bundle));
    ready = true;
    polling = setInterval(tick, interval);
    schedule();
  } catch (cause) {
    closed = true;
    native?.close();
    if (timer) clearTimeout(timer);
    throw cause;
  }
  return {
    async close() {
      closed = true;
      native?.close();
      if (timer) clearTimeout(timer);
      if (polling) clearInterval(polling);
      await running;
    },
  };
}
