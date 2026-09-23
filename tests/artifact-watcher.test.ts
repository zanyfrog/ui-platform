import { expect, it, vi } from "vitest";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startApplicationArtifactWatchers } from "../src/server/artifact-watcher.js";
import type { ArtifactWatchEvent } from "@ui-platform/artifacts";

it("automatically watches application sources with identities scoped per application", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "uib-app-watch-"));
  const events: ArtifactWatchEvent[] = [];
  const errors: Error[] = [];
  const createApp = async (name: string) => {
    const app = path.join(root, name);
    const bundle = path.join(app, "forms", "contact");
    await mkdir(bundle, { recursive: true });
    await writeFile(path.join(app, "app.manifest.json"), "{}");
    await writeFile(
      path.join(bundle, "artifact.json"),
      JSON.stringify({
        schemaVersion: 1,
        definitionVersion: 1,
        artifactId: "shared_id",
        artifactType: "form",
        name: "contact",
        files: { definition: "form.json" },
      }),
    );
    await writeFile(path.join(bundle, "form.json"), '{"fields":[]}');
    return bundle;
  };
  const one = await createApp("one");
  const two = await createApp("two");
  const watcher = await startApplicationArtifactWatchers(
    root,
    (event) => events.push(event),
    (error) => errors.push(error),
    50,
  );
  try {
    await writeFile(path.join(one, "form.json"), "{broken");
    await writeFile(
      path.join(two, "form.json"),
      '{"fields":[{"field":"name","type":"text"}]}',
    );
    await vi.waitFor(() => expect(events).toHaveLength(2), {
      timeout: 5000,
      interval: 50,
    });
    expect(
      events.find((event) => event.bundlePath === one)?.artifact?.validation
        .valid,
    ).toBe(false);
    expect(
      events.find((event) => event.bundlePath === two)?.artifact?.validation
        .valid,
    ).toBe(true);
    expect(
      events.every(
        (event) =>
          !event.artifact?.validation.diagnostics.some(
            (d) => d.code === "artifact.duplicate-id",
          ),
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    const three = await createApp("three");
    await vi.waitFor(
      async () =>
        expect(
          await stat(
            path.join(root, "three", ".uib", "logs", "operations.jsonl"),
          ),
        ).toBeDefined(),
      { timeout: 5000, interval: 50 },
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
    await writeFile(path.join(three, "form.json"), "{broken");
    await vi.waitFor(
      () =>
        expect(
          events.some(
            (event) =>
              event.bundlePath === three &&
              event.artifact?.validation.valid === false,
          ),
        ).toBe(true),
      { timeout: 5000, interval: 50 },
    );
    await rm(path.join(root, "one"), { recursive: true, force: true });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(
      await stat(path.join(root, "one")).catch(() => undefined),
    ).toBeUndefined();
  } finally {
    await watcher.close();
    await rm(root, { recursive: true, force: true });
  }
});
