import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  readdir,
  rename,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  ArtifactConflictError,
  ArtifactDefinitionRegistry,
  FileSystemArtifactService,
  createTriggerManifest,
  runArtifactCli,
  validateValue,
} from "../src/index.js";
import type { ArtifactLogEvent, ArtifactManifest } from "../src/index.js";
import { capture, checksum } from "../src/bundle.js";
import { storageDirectory, storageKey } from "../src/storage.js";

let root: string;
let service: FileSystemArtifactService;
let events: ArtifactLogEvent[];
const form = {
  fields: [
    {
      field: "lastName",
      label: "Last Name",
      type: "text",
      validators: [
        { validator: "required", message: "Last name is required." },
        {
          validator: "max-length",
          max: 25,
          message: "Last name cannot exceed 25 characters.",
        },
      ],
    },
  ],
};
const manifest = (id = "form_tour"): ArtifactManifest => ({
  schemaVersion: 1,
  artifactId: id,
  artifactType: "form",
  name: "tour",
  definitionVersion: 1,
  files: { definition: "form.json" },
  config: { dataset: "tour-registration" },
});
async function bundle(
  name = "tour",
  data: ArtifactManifest = manifest(),
  files: Record<string, string> = { "form.json": JSON.stringify(form) },
) {
  const dir = path.join(root, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "artifact.json"), JSON.stringify(data));
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
    await writeFile(path.join(dir, file), content);
  }
  return dir;
}
beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "uib-artifacts-"));
  events = [];
  service = new FileSystemArtifactService({
    root,
    logger: (event) => events.push(event),
  });
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("artifact foundation acceptance", () => {
  it("saves invalid source, shares CLI diagnostics, and formats corrected source without history", async () => {
    const dir = await bundle();
    expect((await service.validate(dir)).valid).toBe(true);
    const saved = await service.save(dir, {
      files: {
        "form.json": JSON.stringify({
          fields: [
            {
              ...form.fields[0],
              validators: [{ validator: "max-length", max: 0 }],
            },
          ],
        }),
      },
    });
    expect(saved.saved).toBe(true);
    expect(saved.validation.valid).toBe(false);
    let output = "";
    expect(
      await runArtifactCli(["artifact", "validate", dir, "--json"], {
        cwd: root,
        stdout: (text) => {
          output = text;
        },
      }),
    ).toBe(1);
    expect(JSON.parse(output)).toEqual(saved.validation);
    expect(
      events.some(
        (e) =>
          e.operation === "artifact.save.result" && e.validation === "FAILED",
      ),
    ).toBe(true);
    const fixed = await service.save(dir, {
      files: { "form.json": JSON.stringify(form) },
    });
    expect(fixed.validation.valid).toBe(true);
    expect(await readFile(path.join(dir, "form.json"), "utf8")).toContain(
      '\n  "fields"',
    );
    expect(await readdir(path.join(root, ".uib"))).not.toEqual(
      expect.arrayContaining(["history", "versions"]),
    );
    expect("lifecycle" in fixed.artifact).toBe(false);
    for (const method of [
      "saveDraft",
      "publish",
      "getHistory",
      "restoreRevision",
    ])
      expect(method in service).toBe(false);
    for (const command of ["publish", "history"])
      expect(
        await runArtifactCli(["artifact", command, dir], {
          cwd: root,
          stderr: () => {},
        }),
      ).toBe(2);
  });
  it("reuses required and max-length for runtime form and server submission validation", () => {
    const validators = form.fields[0].validators;
    expect(validateValue("", validators, undefined, "lastName")[0].code).toBe(
      "value.required",
    );
    expect(validateValue("x".repeat(26), validators)[0].code).toBe(
      "value.max-length",
    );
    expect(validateValue("Smith", validators)).toEqual([]);
    expect(validateValue(false, [{ validator: "required" }])).toEqual([]);
    expect(
      validateValue("a", [{ validator: "max-length", max: -1 }])[0].code,
    ).toBe("validator.configuration");
  });
  it("handles malformed manifests, unknown types, missing roles, missing files and duplicate identities", async () => {
    const dir = await bundle();
    await writeFile(path.join(dir, "artifact.json"), "{");
    expect((await service.load(dir)).validation.diagnostics[0].code).toBe(
      "manifest.syntax",
    );
    expect((await service.discover(root))[0].artifactId).toBeUndefined();
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify({ ...manifest(), artifactType: "alien" }),
    );
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "artifact.unknown-type",
      ),
    ).toBe(true);
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify({ ...manifest(), files: {} }),
    );
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "file.role-required",
      ),
    ).toBe(true);
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify(manifest()),
    );
    await rm(path.join(dir, "form.json"));
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "file.missing",
      ),
    ).toBe(true);
    await bundle("other");
    expect(
      (await service.discover(root)).every((item) =>
        item.validation.diagnostics.some(
          (d) => d.code === "artifact.duplicate-id",
        ),
      ),
    ).toBe(true);
    await expect(service.load("form_tour")).rejects.toThrow("Duplicate");
  });
  it("detects duplicate fields, IDs, invalid validators and invalid dataset references", async () => {
    await bundle(
      "tour",
      { ...manifest(), config: { dataset: "../bad" } },
      {
        "form.json": JSON.stringify({
          fields: [
            {
              field: "name",
              type: "text",
              id: "one",
              validators: [{ validator: "unknown" }],
            },
            {
              field: "name",
              type: "text",
              id: "one",
              validators: [{ validator: "max-length", max: 0 }],
            },
          ],
        }),
      },
    );
    expect(
      (await service.validate("form_tour")).diagnostics.map((d) => d.code),
    ).toEqual(
      expect.arrayContaining([
        "dataset.reference",
        "form.duplicate-field",
        "form.duplicate-id",
        "validator.unknown",
        "validator.configuration",
      ]),
    );
  });
});
describe("transactions and formatting", () => {
  it("commits all files, formats JSON/TS/TSX/CSS/Markdown without maintaining source history", async () => {
    const m = {
      ...manifest(),
      files: {
        definition: "form.json",
        source: "source.ts",
        view: "view.tsx",
        style: "style.css",
        readme: "readme.md",
      },
    };
    const dir = await bundle("tour", m, {
      "form.json": JSON.stringify(form),
      "source.ts": "const x=1",
      "view.tsx": "export const X=()=> <div>Hi</div>",
      "style.css": "a{color:red}",
      "readme.md": "# Hello\n\nworld  ",
    });
    const saved = await service.save(dir, {
      files: { "source.ts": "const x=2", "style.css": "a{color:blue}" },
    });
    expect(saved.validation.valid).toBe(true);
    expect(await readFile(path.join(dir, "source.ts"), "utf8")).toBe(
      "const x = 2;\n",
    );
    expect(await readFile(path.join(dir, "style.css"), "utf8")).toContain(
      "  color: blue;",
    );
    expect(await readFile(path.join(dir, "view.tsx"), "utf8")).toContain(
      "export const X = () =>",
    );
    expect(await readFile(path.join(dir, "readme.md"), "utf8")).toBe(
      "# Hello\n\nworld\n",
    );
  });
  it("rolls back existing files and new files when a mid-commit write fails", async () => {
    const dir = await bundle();
    const before = await capture(dir);
    const failing = new FileSystemArtifactService({
      root,
      logger: (event) => events.push(event),
      beforeCommitFile: (_, index) => {
        if (index === 1) throw new Error("simulated disk failure");
      },
    });
    await expect(
      failing.save(dir, {
        manifest: {
          ...manifest(),
          files: { definition: "form.json", style: "a.css" },
        },
        files: { "a.css": "a{color:red}", "form.json": '{"fields":[]}' },
      }),
    ).rejects.toThrow("simulated disk failure");
    expect(await capture(dir)).toEqual(before);
    expect(await readdir(dir)).not.toContain("a.css");
    expect(
      events.some((event) => event.operation === "transaction.rollback"),
    ).toBe(true);
  });
  it("rejects stale saves and identity changes without overwriting manual changes", async () => {
    const dir = await bundle();
    const loaded = await service.load(dir);
    await writeFile(path.join(dir, "form.json"), '{"fields":[]}');
    await expect(
      service.save(dir, {
        expectedChecksum: loaded.checksum,
        files: { "form.json": JSON.stringify(form) },
      }),
    ).rejects.toBeInstanceOf(ArtifactConflictError);
    await expect(
      service.save(dir, {
        manifest: { ...manifest(), artifactId: "changed" },
      }),
    ).rejects.toThrow("immutable");
    expect(await readFile(path.join(dir, "form.json"), "utf8")).toBe(
      '{"fields":[]}',
    );
  });
  it("detects edits made during asynchronous staging and leaves them untouched", async () => {
    const dir = await bundle();
    const definitions = new ArtifactDefinitionRegistry(false);
    definitions.register({
      ...new ArtifactDefinitionRegistry().get("form")!,
      formatter: async (file) => {
        await writeFile(path.join(dir, "form.json"), '{"fields":[]}');
        return file.content;
      },
    });
    const writer = new FileSystemArtifactService({ root, definitions });
    await expect(writer.save(dir, {})).rejects.toBeInstanceOf(
      ArtifactConflictError,
    );
    expect(await readFile(path.join(dir, "form.json"), "utf8")).toBe(
      '{"fields":[]}',
    );
  });
  it("retains immutable identity across restart, repair, and bundle moves", async () => {
    const dir = await bundle();
    await service.save(dir, {});
    await service.save(dir, { manifest: "{broken" });
    const restarted = new FileSystemArtifactService({ root });
    expect((await restarted.load("form_tour")).validation.valid).toBe(false);
    await restarted.save("form_tour", { manifest: manifest() });
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify({ ...manifest(), artifactId: "changed" }),
    );
    expect(
      (
        await new FileSystemArtifactService({ root }).validate(dir)
      ).diagnostics.some((d) => d.code === "artifact.identity"),
    ).toBe(true);
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify(manifest()),
    );
    const moved = path.join(root, "moved");
    await rename(dir, moved);
    expect((await restarted.load("form_tour")).bundlePath).toBe(moved);
  });
  it("leaves existing legacy history untouched during saves and external validation", async () => {
    const dir = await bundle();
    for (const storage of ["history", "versions"]) {
      await mkdir(path.join(root, ".uib", storage), { recursive: true });
      await writeFile(
        path.join(root, ".uib", storage, "legacy.json"),
        "legacy bytes",
      );
    }
    await service.save(dir, {});
    await writeFile(path.join(dir, "form.json"), "{broken");
    await service.handleExternalChange(dir);
    for (const storage of ["history", "versions"]) {
      expect(await readdir(path.join(root, ".uib", storage))).toEqual([
        "legacy.json",
      ]);
      expect(
        await readFile(path.join(root, ".uib", storage, "legacy.json"), "utf8"),
      ).toBe("legacy bytes");
    }
  });
  it("saves declared file additions and removals transactionally", async () => {
    const dir = await bundle();
    await service.save(dir, {
      manifest: {
        ...manifest(),
        files: { definition: "form.json", style: "style.css" },
      },
      files: { "style.css": "a{color:red}" },
    });
    await service.save(dir, {
      manifest: manifest(),
      files: { "style.css": null },
    });
    expect(await readdir(dir)).not.toContain("style.css");
    expect((await service.load(dir)).manifest?.files).toEqual(manifest().files);
  });
  it("honors project Prettier settings and validates source syntax after reloading an invalid draft", async () => {
    await writeFile(
      path.join(root, ".prettierrc.json"),
      JSON.stringify({ tabWidth: 4, semi: false }),
    );
    const dir = await bundle(
      "tour",
      {
        ...manifest(),
        files: { definition: "form.json", source: "source.ts" },
      },
      { "form.json": JSON.stringify(form), "source.ts": "const a=1;" },
    );
    await service.save(dir, {});
    expect(await readFile(path.join(dir, "source.ts"), "utf8")).toBe(
      "const a = 1\n",
    );
    expect(await readFile(path.join(dir, "form.json"), "utf8")).toContain(
      '\n    "fields"',
    );
    await service.save(dir, { files: { "source.ts": "const = ;" } });
    expect(
      (await service.load(dir)).validation.diagnostics.some(
        (d) => d.code === "source.syntax",
      ),
    ).toBe(true);
  });
  it("retains malformed source with formatting diagnostics", async () => {
    await bundle();
    const result = await service.save("form_tour", {
      files: { "form.json": "{bad json" },
    });
    expect(result.saved).toBe(true);
    expect(result.validation.valid).toBe(false);
    expect(
      result.validation.diagnostics.some((d) => d.code === "format.failed"),
    ).toBe(true);
  });
  it("logs passed and failed external validation without formatting or history", async () => {
    const dir = await bundle();
    await service.load(dir);
    await writeFile(path.join(dir, "form.json"), "{bad");
    expect(
      (await service.handleExternalChange(path.join(dir, "form.json")))
        ?.validation.valid,
    ).toBe(false);
    expect(await readFile(path.join(dir, "form.json"), "utf8")).toBe("{bad");
    await writeFile(path.join(dir, "form.json"), JSON.stringify(form));
    expect(
      (await service.handleExternalChange(path.join(dir, "form.json")))
        ?.validation.valid,
    ).toBe(true);
    expect(
      events
        .filter((e) => e.operation === "external.change")
        .map((e) => e.validation),
    ).toEqual(["FAILED", "PASSED"]);
    expect(
      await service.handleExternalChange(
        path.join(root, ".uib", "logs", "operations.jsonl"),
      ),
    ).toBeUndefined();
  });
  it("recovers an interrupted journal before exposing a partially written artifact", async () => {
    const dir = await bundle();
    const original = await capture(dir);
    const journalDir = await storageDirectory(
      root,
      "transactions",
      storageKey(dir),
    );
    await writeFile(
      path.join(journalDir, "pending.json"),
      JSON.stringify({ original }),
    );
    await writeFile(path.join(dir, "form.json"), "{broken");
    expect((await service.load(dir)).checksum).toBe(checksum(original));
    expect(events.some((e) => e.operation === "transaction.rollback")).toBe(
      true,
    );
  });
  it("rejects traversal and changes outside declared roles", async () => {
    const dir = await bundle();
    await expect(
      service.save(dir, { files: { "../escape.json": "{}" } }),
    ).rejects.toThrow("declared");
    await writeFile(
      path.join(dir, "artifact.json"),
      JSON.stringify({
        ...manifest(),
        files: { definition: "../escape.json" },
      }),
    );
    expect((await service.validate(dir)).valid).toBe(false);
    await expect(service.load(path.dirname(root))).rejects.toThrow("outside");
  });
});
describe("definitions and CLI", () => {
  it("extracts and resolves routes, checks Page type and detects duplicate URLs", async () => {
    const base = {
      ...manifest("group"),
      artifactType: "routeGroup",
      files: {},
      config: { path: "/tour" },
    };
    await bundle("routes/tour", base, {});
    const child = {
      ...manifest("route"),
      artifactType: "route",
      files: {},
      config: { path: "register", page: "page_registration" },
    };
    const dir = await bundle("routes/tour/register", child, {});
    expect((await service.getReferences(dir)).outgoing[0].artifactId).toBe(
      "page_registration",
    );
    expect((await service.validate(dir)).valid).toBe(true);
    const wrong = new FileSystemArtifactService({
      root,
      resolveReference: async () => ({ artifactType: "form" }),
    });
    expect(
      (await wrong.validate(dir)).diagnostics.some(
        (d) => d.code === "reference.type",
      ),
    ).toBe(true);
    const missing = new FileSystemArtifactService({
      root,
      resolveReference: async () => undefined,
    });
    expect(
      (await missing.validate(dir)).diagnostics.some(
        (d) => d.code === "reference.missing",
      ),
    ).toBe(true);
    await bundle(
      "routes/duplicate",
      {
        ...child,
        artifactId: "duplicate",
        config: { path: "/tour/register", page: "page_registration" },
      },
      {},
    );
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "route.duplicate",
      ),
    ).toBe(true);
  });
  it("validates trigger metadata, syntax and array lifecycle signatures", async () => {
    const trigger = createTriggerManifest({
      artifactId: "trigger_normalize",
      name: "normalize",
      files: { source: "trigger.ts" },
      config: { dataset: "customer" },
    });
    expect(trigger.config?.priority).toBe(200);
    const dir = await bundle("triggers/wrong-folder/normalize", trigger, {
      "trigger.ts":
        "export function beforeInsert(records: Record<string, unknown>[]) { return records; }",
    });
    const loaded = await service.load(dir);
    expect(loaded.validation.valid).toBe(true);
    expect(loaded.manifest?.config?.dataset).toBe("customer");
    expect(
      loaded.validation.diagnostics.some(
        (d) => d.code === "trigger.dataset-folder",
      ),
    ).toBe(true);
    await writeFile(
      path.join(dir, "trigger.ts"),
      "export function beforeInsert(record: string) { return record; }",
    );
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "trigger.signature",
      ),
    ).toBe(true);
    await writeFile(
      path.join(dir, "trigger.ts"),
      "export function beforeInsert( {",
    );
    expect(
      (await service.validate(dir)).diagnostics.some(
        (d) => d.code === "trigger.syntax",
      ),
    ).toBe(true);
  });
  it("allows definitions to be registered and validates roots with a nonzero exit for any errors", async () => {
    const registry = new ArtifactDefinitionRegistry(false);
    expect(registry.list()).toEqual([]);
    const existing = new ArtifactDefinitionRegistry().get("form")!;
    registry.register(existing);
    expect(registry.has("form")).toBe(true);
    expect(() => registry.register(existing)).toThrow("already registered");
    await bundle();
    await bundle("bad", { ...manifest("bad"), files: {} }, {});
    let output = "";
    expect(
      await runArtifactCli(
        ["artifact", "validate", ".", "--json", "--root", root],
        {
          stdout: (text) => {
            output += text;
          },
        },
      ),
    ).toBe(1);
    expect(JSON.parse(output)).toHaveLength(2);
    expect(JSON.parse(output).some((r: { valid: boolean }) => !r.valid)).toBe(
      true,
    );
  });
});
