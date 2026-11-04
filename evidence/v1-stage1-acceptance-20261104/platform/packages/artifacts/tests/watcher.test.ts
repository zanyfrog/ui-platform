import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  FileSystemArtifactService,
  type ArtifactLogEvent,
  type ArtifactWatcher,
  type ArtifactWatchEvent,
} from "../src/index.js";

let root: string;
let watcher: ArtifactWatcher | undefined;
const source = JSON.stringify({
  fields: [
    {
      field: "lastName",
      type: "text",
      validators: [
        { validator: "required" },
        { validator: "max-length", max: 25 },
      ],
    },
  ],
});
async function bundle(name = "form", id = name) {
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "form.json"), source);
  await writeFile(
    path.join(dir, "artifact.json"),
    JSON.stringify({
      schemaVersion: 1,
      artifactId: id,
      artifactType: "form",
      name,
      definitionVersion: 1,
      files: { definition: "form.json" },
    }),
  );
  return dir;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = (check: () => void) =>
  vi.waitFor(check, { timeout: 5000, interval: 25 });
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "uib-watch-"));
});
afterEach(async () => {
  await watcher?.close();
  watcher = undefined;
  await rm(root, { recursive: true, force: true });
});

it("actively detects edits, logs validation, debounces bursts and never formats external source", async () => {
  const dir = await bundle();
  const events: ArtifactWatchEvent[] = [];
  const logs: ArtifactLogEvent[] = [];
  const errors: Error[] = [];
  const service = new FileSystemArtifactService({
    root,
    logger: (event) => logs.push(event),
  });
  watcher = await service.startWatching({
    debounceMs: 50,
    pollIntervalMs: 40,
    onChange: (event) => {
      events.push(event);
    },
    onError: (error) => errors.push(error),
  });
  await writeFile(path.join(dir, "form.json"), "{broken");
  await until(() =>
    expect(events.at(-1)?.artifact?.validation.valid).toBe(false),
  );
  expect(await readFile(path.join(dir, "form.json"), "utf8")).toBe("{broken");
  await writeFile(path.join(dir, "form.json"), '{"fields":[]}');
  await writeFile(path.join(dir, "form.json"), source);
  await until(() =>
    expect(events.at(-1)?.artifact?.validation.valid).toBe(true),
  );
  await delay(200);
  expect(events).toHaveLength(2);
  expect(
    logs
      .filter((event) => event.operation === "external.change")
      .map((event) => event.validation),
  ).toEqual(["FAILED", "PASSED"]);
  expect(await readFile(path.join(dir, "form.json"), "utf8")).toBe(source);
  expect(await readdir(path.join(root, ".uib"))).not.toContain("history");
  expect(await readdir(path.join(root, ".uib"))).not.toContain("versions");
  expect(errors).toEqual([]);
});

it("ignores system storage and its own saves, but does not lose a following external edit", async () => {
  const dir = await bundle();
  const events: ArtifactWatchEvent[] = [];
  const service = new FileSystemArtifactService({ root });
  watcher = await service.startWatching({
    debounceMs: 30,
    pollIntervalMs: 30,
    onChange: (event) => {
      events.push(event);
    },
  });
  await service.save(dir, { files: { "form.json": '{"fields":[]}' } });
  await bundle(".uib/ignored");
  await bundle("node_modules/ignored");
  await delay(250);
  expect(events).toEqual([]);
  await writeFile(path.join(dir, "form.json"), "{broken");
  await until(() => expect(events).toHaveLength(1));
  expect(events[0].artifact?.validation.valid).toBe(false);
});

it("discovers new bundles and reports missing files, removed manifests and directory moves", async () => {
  const events: ArtifactWatchEvent[] = [];
  watcher = await new FileSystemArtifactService({ root }).startWatching({
    debounceMs: 25,
    pollIntervalMs: 25,
    onChange: (event) => {
      events.push(event);
    },
  });
  const dir = await bundle("new");
  await until(() =>
    expect(events.at(-1)?.artifact?.manifest?.artifactId).toBe("new"),
  );
  await rm(path.join(dir, "form.json"));
  await until(() =>
    expect(
      events
        .at(-1)
        ?.artifact?.validation.diagnostics.some(
          (d) => d.code === "file.missing",
        ),
    ).toBe(true),
  );
  await rm(path.join(dir, "artifact.json"));
  await until(() =>
    expect(
      events
        .at(-1)
        ?.artifact?.validation.diagnostics.some(
          (d) => d.code === "manifest.missing",
        ),
    ).toBe(true),
  );
  await bundle("new");
  await until(() =>
    expect(events.at(-1)?.artifact?.validation.valid).toBe(true),
  );
  const moved = path.join(root, "moved");
  await rename(dir, moved);
  await until(() => {
    expect(
      events.some(
        (event) => event.kind === "removed" && event.bundlePath === dir,
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.bundlePath === moved &&
          event.artifact?.manifest?.artifactId === "new",
      ),
    ).toBe(true);
  });
});

it("stops callbacks after close and isolates subscriber failures", async () => {
  const dir = await bundle();
  let calls = 0;
  const errors: Error[] = [];
  watcher = await new FileSystemArtifactService({ root }).startWatching({
    debounceMs: 20,
    pollIntervalMs: 20,
    onChange: () => {
      calls++;
      throw Error("subscriber failed");
    },
    onError: (error) => errors.push(error),
  });
  await writeFile(path.join(dir, "form.json"), "{broken");
  await until(() =>
    expect(errors.some((error) => error.message === "subscriber failed")).toBe(
      true,
    ),
  );
  await writeFile(path.join(dir, "form.json"), source);
  await until(() => expect(calls).toBe(2));
  await watcher.close();
  await watcher.close();
  await writeFile(path.join(dir, "form.json"), "{broken again");
  await delay(150);
  expect(calls).toBe(2);
});

it("validates the committed source, rather than a precommit working copy", async () => {
  const dir = await bundle();
  const { ArtifactDefinitionRegistry } = await import("../src/index.js");
  const definitions = new ArtifactDefinitionRegistry(false);
  const form = new ArtifactDefinitionRegistry().get("form")!;
  let sawCommitted = false;
  definitions.register({
    ...form,
    validators: [
      ...form.validators,
      async (context) => {
        if (context.files[0].content.includes("changed"))
          sawCommitted =
            (await readFile(path.join(dir, "form.json"), "utf8")) ===
            context.files[0].content;
        return [];
      },
    ],
  });
  const service = new FileSystemArtifactService({ root, definitions });
  await service.save(dir, {
    files: { "form.json": '{"fields":[{"field":"changed","type":"text"}]}' },
  });
  expect(sawCommitted).toBe(true);
});
