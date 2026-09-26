import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ApplicationBuildEngine,
  ArtifactDefinitionRegistry,
  ArtifactValidationError,
  FileSystemArtifactService,
  MigrationEngine,
  runApplicationCli,
  runArtifactCli,
  validationResult,
  validateReferences,
} from "../src/index.js";
import type {
  ArtifactDefinition,
  ArtifactService,
  EditableArtifact,
  ValidationDiagnostic,
} from "../src/index.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "uib-contract-"));
  roots.push(root);
  const definitions = new ArtifactDefinitionRegistry();
  const types = new Map<string, string>();
  const resolveReference = async (id: string) =>
    types.has(id) ? { artifactType: types.get(id)! } : undefined;
  const service: ArtifactService = new FileSystemArtifactService({
    root,
    definitions,
    resolveReference,
  });
  const build = new ApplicationBuildEngine({
    root,
    applicationId: "contracts",
    service,
    entries: async () => ({ routes: [] }),
    inputs: async () => "contracts-v1",
    schemaGate: async () => true,
    compile: async () => {
      throw new Error("Validation must not compile.");
    },
  });
  async function bundle(
    name: string,
    type: string,
    config: Record<string, unknown> = {},
    files: Record<string, string> = {},
    id = name,
  ) {
    const directory = path.join(root, name);
    await mkdir(directory, { recursive: true });
    types.set(id, type);
    const roles = Object.fromEntries(
      Object.keys(files).map((file) => [
        file.endsWith(".ts") ? "source" : "definition",
        file,
      ]),
    );
    await writeFile(
      path.join(directory, "artifact.json"),
      JSON.stringify({
        schemaVersion: 1,
        artifactId: id,
        artifactType: type,
        name,
        definitionVersion: 1,
        files: roles,
        config,
      }),
    );
    for (const [file, content] of Object.entries(files))
      await writeFile(path.join(directory, file), content);
    return directory;
  }
  return { root, service, definitions, build, bundle, resolveReference };
}
describe("existing ArtifactService contract", () => {
  it("returns the same normalized artifact, definition, references and validation through every foundation entry point", async () => {
    const f = await fixture();
    const directory = await f.bundle(
      "form",
      "form",
      {},
      { "form.json": '{"fields":[]}' },
    );
    const artifact: EditableArtifact = await f.service.load(directory);
    expect(artifact.definition).toBe(f.definitions.get("form"));
    expect(artifact.capabilities).toEqual(artifact.definition!.capabilities);
    expect(artifact.validation).toEqual(await f.service.validate("form"));
    expect(artifact.references).toEqual(await f.service.getReferences("form"));
    expect(artifact.validation).toEqual(
      (await f.service.discover(f.root))[0].validation,
    );
    expect(artifact.validation).toEqual(
      validationResult(artifact.validation.diagnostics),
    );
    let output = "";
    expect(
      await runArtifactCli(["artifact", "validate", "form", "--json"], {
        service: f.service,
        cwd: f.root,
        stdout: (text) => {
          output += text;
        },
      }),
    ).toBe(0);
    expect(JSON.parse(output)).toEqual(artifact.validation);
    const invalid = await f.service.save("form", {
      files: { "form.json": '{"fields":null}' },
    });
    expect(invalid.saved).toBe(true);
    expect(invalid.validation.valid).toBe(false);
    expect(invalid.validation).toEqual(await f.service.validate("form"));
  });
});
describe("application consumer integration with shared implementations", () => {
  it("recognizes every registered type, including an extension, and preserves every diagnostic field", async () => {
    const f = await fixture();
    const diagnostic: ValidationDiagnostic = {
      severity: "warning",
      code: "custom.warning",
      message: "Custom warning",
      line: 3,
      column: 2,
      field: "custom",
      path: "settings.custom",
    };
    const custom: ArtifactDefinition = {
      artifactType: "custom",
      currentDefinitionVersion: 1,
      capabilities: { edit: true, format: false },
      fileRoles: {},
      validators: [() => [{ ...diagnostic }]],
    };
    f.definitions.register(custom);
    for (const definition of f.definitions.list())
      await f.bundle(definition.artifactType, definition.artifactType);
    await f.bundle("unknown", "unregistered");
    const summaries = await f.service.discover(f.root);
    const artifacts = await Promise.all(
      summaries.map((s) => f.service.load(s.bundlePath)),
    );
    const expected = artifacts.flatMap((a) => a.validation.diagnostics);
    const report = await f.build.validateApplication();
    expect(report.diagnostics).toEqual(expected);
    const { graph } = await f.build.snapshot();
    for (const artifact of artifacts) {
      const consumed = graph.nodes.get(artifact.manifest!.artifactId)!;
      expect(consumed.definition).toBe(artifact.definition);
      expect(consumed.validation).toEqual(artifact.validation);
      expect(consumed.definition?.artifactType ?? null).toBe(
        f.definitions.get(artifact.manifest!.artifactType)?.artifactType ??
          null,
      );
    }
    expect(report.diagnostics.find((d) => d.code === "custom.warning")).toEqual(
      { ...diagnostic, artifactId: "custom" },
    );
    expect(
      report.diagnostics
        .filter((d) => d.code === "artifact.unknown-type")
        .map((d) => d.artifactId),
    ).toEqual(["unknown"]);
    let output = "";
    expect(
      await runApplicationCli(["app", "validate", "contracts", "--json"], {
        tooling: { build: f.build },
        stdout: (text) => {
          output += text;
        },
      }),
    ).toBe(0);
    expect(JSON.parse(output).diagnostics).toEqual(expected);
    expect(report.blockingDiagnostics).toEqual([]); // Invalid unused artifacts remain visible but do not block runtime.
  });
  it("preserves malformed and duplicate identity diagnostics without inventing IDs or extra artifact rules", async () => {
    const f = await fixture();
    const broken = await f.bundle("broken", "form");
    await writeFile(path.join(broken, "artifact.json"), "{");
    await f.bundle(
      "one",
      "form",
      {},
      { "form.json": '{"fields":[]}' },
      "duplicate",
    );
    await f.bundle(
      "two",
      "form",
      {},
      { "form.json": '{"fields":[]}' },
      "duplicate",
    );
    const artifacts = await Promise.all(
      (await f.service.discover(f.root)).map((s) =>
        f.service.load(s.bundlePath),
      ),
    );
    expect((await f.build.validateApplication()).diagnostics).toEqual(
      artifacts.flatMap((a) => a.validation.diagnostics),
    );
    const malformed = await f.service.load(broken);
    expect(malformed.manifest).toBeNull();
    expect(malformed.definition).toBeNull();
    expect(
      malformed.validation.diagnostics.every((d) => d.artifactId === undefined),
    ).toBe(true);
  });
  it("uses identical shared reference messages, locations and codes without duplicating them", async () => {
    const f = await fixture();
    await f.bundle("form", "form", {}, { "form.json": '{"fields":[]}' });
    await f.bundle("route", "route", { path: "/", page: "form" });
    await f.bundle("missing", "route", { path: "/missing", page: "absent" });
    const artifacts = await Promise.all(
      (await f.service.discover(f.root)).map((s) =>
        f.service.load(s.bundlePath),
      ),
    );
    const expected = artifacts.flatMap((a) => a.validation.diagnostics);
    expect((await f.build.validateApplication()).diagnostics).toEqual(expected);
    const route = await f.service.load("route");
    expect(
      await validateReferences(
        route.references.outgoing,
        f.resolveReference,
        "route",
      ),
    ).toEqual(route.validation.diagnostics);
    expect(expected.filter((d) => d.code === "reference.type")).toHaveLength(1);
    expect(expected.filter((d) => d.code === "reference.missing")).toHaveLength(
      1,
    );
  });
  it("retains shared diagnostics when migration consumption rejects an invalid artifact", async () => {
    const f = await fixture();
    await f.bundle("migration", "migration", {}, { "migration.json": "{}" });
    // Loading source needs no database/provider; fail if the consumer tries to use one.
    const migrations = new MigrationEngine({
      root: f.root,
      applicationId: "contracts",
      service: f.service,
      provider: new Proxy({} as never, {
        get: () => {
          throw new Error(
            "Provider must not be called while validating source.",
          );
        },
      }),
      authorize: async () => true,
    });
    const expected = await f.service.validate("migration");
    await expect(migrations.load("migration")).rejects.toBeInstanceOf(
      ArtifactValidationError,
    );
    await expect(migrations.load("migration")).rejects.toMatchObject({
      validation: expected,
    });
  });
});
