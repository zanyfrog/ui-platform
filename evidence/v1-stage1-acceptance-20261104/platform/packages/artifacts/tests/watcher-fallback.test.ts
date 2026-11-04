import { expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FileSystemArtifactService,
  type ArtifactWatchEvent,
} from "../src/index.js";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:fs")>()),
  watch: () => {
    throw new Error("Native recursive watching unavailable");
  },
}));

it("continues detecting source changes when native recursive watching is unavailable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "uib-poll-"));
  const events: ArtifactWatchEvent[] = [];
  const errors: Error[] = [];
  const dir = path.join(root, "form");
  await mkdir(dir);
  await writeFile(
    path.join(dir, "artifact.json"),
    JSON.stringify({
      schemaVersion: 1,
      definitionVersion: 1,
      artifactId: "form",
      artifactType: "form",
      name: "form",
      files: { definition: "form.json" },
    }),
  );
  await writeFile(path.join(dir, "form.json"), '{"fields":[]}');
  const watcher = await new FileSystemArtifactService({ root }).startWatching({
    pollIntervalMs: 25,
    debounceMs: 20,
    onChange: (event) => {
      events.push(event);
    },
    onError: (error) => errors.push(error),
  });
  try {
    await writeFile(path.join(dir, "form.json"), "{broken");
    await vi.waitFor(
      () => expect(events[0]?.artifact?.validation.valid).toBe(false),
      { timeout: 3000, interval: 25 },
    );
    expect(errors.map((error) => error.message)).toContain(
      "Native recursive watching unavailable",
    );
  } finally {
    await watcher.close();
    await rm(root, { recursive: true, force: true });
  }
});
