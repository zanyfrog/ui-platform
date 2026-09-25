import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  FileSystemArtifactService,
  MigrationEngine,
  JsonFileMigrationProvider,
  DeploymentService,
  ApplicationBuildEngine,
  fingerprint,
  LocalDirectoryDeploymentTarget,
} from "../src/index.js";
import type {
  DatasetSchema,
  MigrationDefinition,
  RuntimeManifest,
} from "../src/index.js";
import { writeJson, filesUnder } from "../src/application/common.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
const baseline: DatasetSchema = {
  definitionType: "dataset-schema",
  definitionFormatVersion: 1,
  dataset: {
    id: "customer",
    key: "customer",
    name: "Customer",
    pluralName: "Customers",
  },
  fields: [
    { id: "id-field", key: "id", type: "string", required: true },
    { id: "name-field", key: "name", type: "string" },
  ],
};
const approval = { actorId: "developer", destructive: true };
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "uib-migrate-"));
  roots.push(root);
  const source = path.join(root, "source"),
    environmentRoot = path.join(root, "dev"),
    dataRoot = path.join(environmentRoot, "data");
  await mkdir(path.join(source, "customer"), { recursive: true });
  await mkdir(dataRoot, { recursive: true });
  await writeJson(path.join(dataRoot, "app__default__customer.json"), [
    { id: "one", name: "Ada" },
  ]);
  await writeJson(path.join(source, "customer", "artifact.json"), {
    schemaVersion: 1,
    artifactId: "customer",
    artifactType: "dataset",
    name: "customer",
    definitionVersion: 1,
    files: { definition: "schema.json" },
  });
  const edit = async (schema: DatasetSchema) =>
    writeJson(path.join(source, "customer", "schema.json"), schema);
  await edit(baseline);
  const service = new FileSystemArtifactService({ root: source });
  const maintenance = vi.fn(async (_enabled: boolean) => {});
  const provider = new JsonFileMigrationProvider({
    environmentRoot,
    environmentId: "development",
    production: false,
    dataRoot,
    datasetFiles: { customer: "app__default__customer.json" },
    setMaintenance: maintenance,
  });
  await provider.initialize([baseline]);
  const migrations = new MigrationEngine({
    root: source,
    applicationId: "app",
    service,
    provider,
    authorize: async () => true,
  });
  const rows = async () =>
    JSON.parse(
      await readFile(
        path.join(dataRoot, "app__default__customer.json"),
        "utf8",
      ),
    );
  return {
    root,
    source,
    dataRoot,
    provider,
    service,
    migrations,
    edit,
    rows,
    maintenance,
  };
}
async function destructiveMigration(
  fixture: Awaited<ReturnType<typeof setup>>,
) {
  await fixture.edit({ ...baseline, fields: [baseline.fields[0]] });
  const preview = await fixture.migrations.preview("customer");
  return fixture.migrations.confirm(preview.previewId, approval);
}
describe("migration execution", () => {
  it("source edits and previews do not mutate data or persist migration artifacts; confirmation does", async () => {
    const f = await setup();
    await f.edit({ ...baseline, fields: [baseline.fields[0]] });
    const preview = await f.migrations.preview("customer");
    expect(await f.rows()).toEqual([{ id: "one", name: "Ada" }]);
    expect(
      (await f.service.discover(f.source)).filter(
        (s) => s.artifactType === "migration",
      ),
    ).toHaveLength(0);
    await expect(
      f.migrations.confirm(preview.previewId, {
        ...approval,
        destructive: false,
      }),
    ).rejects.toThrow("destructive");
    const migration = await f.migrations.confirm(preview.previewId, approval);
    expect(await f.rows()).toEqual([{ id: "one" }]);
    expect((await f.provider.ledger())[0]).toMatchObject({
      migrationId: migration.migrationId,
      state: "applied",
      migrationChecksum: migration.checksum,
    });
    expect(f.maintenance.mock.calls).toEqual([[true], [false]]);
    await f.migrations.apply(migration.migrationId, approval);
    expect(await f.provider.ledger()).toHaveLength(1);
    expect(
      await readFile(
        path.join(f.source, ".uib", "logs", "operations.jsonl"),
        "utf8",
      ),
    ).toContain(migration.migrationId);
  });
  it("rejects stale source and applied baseline previews", async () => {
    const f = await setup();
    const preview = await f.migrations.preview("customer");
    await f.edit({
      ...baseline,
      fields: [
        ...baseline.fields,
        { id: "email-field", key: "email", type: "string" },
      ],
    });
    await expect(
      f.migrations.confirm(preview.previewId, approval),
    ).rejects.toThrow("Stale");
    const newer = await f.migrations.preview("customer");
    vi.spyOn(f.provider, "appliedSchema").mockResolvedValue({
      ...baseline,
      dataset: { ...baseline.dataset, name: "changed" },
    });
    await expect(
      f.migrations.confirm(newer.previewId, approval),
    ).rejects.toThrow("Stale");
  });
  it("requires custom handling for type changes and required fields without backfill", async () => {
    const f = await setup();
    await f.edit({
      ...baseline,
      fields: [
        ...baseline.fields,
        { id: "age", key: "age", type: "number", required: true },
      ],
    });
    const preview = await f.migrations.preview("customer");
    expect(preview.customRequired).toBe(true);
    await expect(
      f.migrations.confirm(preview.previewId, approval),
    ).rejects.toThrow("custom");
    expect(await f.rows()).toEqual([{ id: "one", name: "Ada" }]);
  });
  it("a backup failure stops before mutation and an execution failure prevents retries", async () => {
    const f = await setup();
    await f.edit({ ...baseline, fields: [baseline.fields[0]] });
    const preview = await f.migrations.preview("customer");
    const backup = vi
      .spyOn(f.provider, "verifyBackup")
      .mockRejectedValue(new Error("backup"));
    await expect(
      f.migrations.confirm(preview.previewId, approval),
    ).rejects.toThrow("backup");
    expect(await f.rows()).toEqual([{ id: "one", name: "Ada" }]);
    expect(await f.provider.ledger()).toEqual([]);
    backup.mockRestore();
    vi.spyOn(f.provider, "execute").mockRejectedValue(new Error("disk failed"));
    await expect(
      f.migrations.apply(`migration-${preview.previewId}`, approval),
    ).rejects.toThrow("recovery");
    expect((await f.provider.ledger())[0].state).toBe("recovery-required");
    await expect(
      f.migrations.apply(`migration-${preview.previewId}`, approval),
    ).rejects.toThrow("recovery");
  });
  it("rejects changed content under an applied migration ID", async () => {
    const f = await setup();
    const m = await destructiveMigration(f);
    const file = path.join(
      f.source,
      "migrations",
      m.migrationId,
      "migration.json",
    );
    await writeJson(file, { ...m, requiresBackup: false });
    await expect(f.migrations.apply(m.migrationId, approval)).rejects.toThrow(
      "validation",
    );
  });
});

async function production(
  f: Awaited<ReturnType<typeof setup>>,
  migration: MigrationDefinition,
) {
  const environmentRoot = path.join(f.root, "production"),
    dataRoot = path.join(environmentRoot, "data");
  await mkdir(dataRoot, { recursive: true });
  await writeJson(path.join(dataRoot, "app__default__customer.json"), [
    { id: "one", name: "Ada" },
  ]);
  const maintenance = vi.fn(async (_enabled: boolean) => {});
  const provider = new JsonFileMigrationProvider({
    environmentRoot,
    environmentId: "production",
    production: true,
    dataRoot,
    datasetFiles: { customer: "app__default__customer.json" },
    setMaintenance: maintenance,
  });
  await provider.initialize([baseline]);
  const migrations = new MigrationEngine({
    root: f.source,
    applicationId: "app",
    service: f.service,
    provider,
    authorize: async () => true,
  });
  const directory = path.join(f.root, "candidate");
  await mkdir(path.join(directory, "server"), { recursive: true });
  await writeFile(
    path.join(directory, "server", "index.js"),
    "console.log('ready')",
  );
  const manifest: RuntimeManifest = {
    manifestVersion: 1,
    applicationId: "app",
    buildId: "app-test",
    builtAt: new Date().toISOString(),
    sourceFingerprint: fingerprint("test"),
    uiPlatformVersion: "0.1.2",
    runtimeCompatibility: {
      node: process.versions.node.split(".")[0],
      target: `${process.platform}-${process.arch}`,
    },
    entryPoint: "server/index.js",
    requiredEnvironmentKeys: ["DATABASE_URL"],
    migrationIdsIncluded: [migration.migrationId],
    migrationChecksums: { [migration.migrationId]: migration.checksum },
    files: await filesUnder(directory),
    artifacts: [],
    validationReport: "validation-report.json",
  };
  await writeJson(path.join(directory, "runtime-manifest.json"), manifest);
  const target = {
    preflight: vi.fn(async () => {}),
    stage: vi.fn(async () => {}),
    health: vi.fn(async (_m: RuntimeManifest, _phase: string) => {}),
    promote: vi.fn(async () => {}),
    oldRuntimeCompatible: vi.fn(async () => false),
    rollbackPointer: vi.fn(async () => {}),
    recoveryHealth: vi.fn(async () => {}),
  };
  const deployment = new DeploymentService({
    root: f.source,
    applicationId: "app",
    migrations,
    target,
    environment: async () => ({ DATABASE_URL: "test" }),
    authorize: async () => true,
  });
  return { deployment, provider, target, directory, maintenance };
}
describe("production deployment", () => {
  it("requires fresh destructive approval, applies in order, checks health then promotes", async () => {
    const f = await setup();
    const m = await destructiveMigration(f);
    const p = await production(f, m);
    const plan = await p.deployment.preflight(p.directory);
    await expect(
      p.deployment.deploy(plan.planId, {
        ...approval,
        destructive: false,
        planId: plan.planId,
        force: true,
        reason: "test",
      }),
    ).rejects.toThrow("new explicit");
    const record = await p.deployment.deploy(plan.planId, {
      ...approval,
      planId: plan.planId,
    });
    expect(record.state).toBe("succeeded");
    expect(p.target.health.mock.calls.map((c) => c[1])).toEqual([
      "before-migration",
      "staged",
      "promoted",
    ]);
    expect(p.target.promote).toHaveBeenCalledOnce();
    expect(p.maintenance.mock.calls).toEqual([[true], [false]]);
  });
  it("holds maintenance and leaves pointer unchanged when staged health fails after migration", async () => {
    const f = await setup();
    const m = await destructiveMigration(f);
    const p = await production(f, m);
    p.target.health.mockImplementation(async (_m, phase) => {
      if (phase === "staged") throw new Error("unhealthy");
    });
    const plan = await p.deployment.preflight(p.directory);
    const record = await p.deployment.deploy(plan.planId, {
      ...approval,
      planId: plan.planId,
    });
    expect(record.state).toBe("recovery-required");
    expect(p.target.promote).not.toHaveBeenCalled();
    expect(p.maintenance.mock.calls).toEqual([[true]]);
    await expect(
      p.deployment.deploy(plan.planId, { ...approval, planId: plan.planId }),
    ).rejects.toThrow();
    p.target.oldRuntimeCompatible.mockResolvedValue(true);
    const recovered = await p.deployment.recover(record.deploymentId, {
      ...approval,
      planId: plan.planId,
      restoreBackupId: record.backup!.id,
      acceptDataLoss: true,
      reason: "Reviewed restore",
    });
    expect(recovered.state).toBe("failed");
    expect(await p.provider.appliedSchema("customer")).toEqual(baseline);
    expect(await p.provider.ledger()).toEqual([]);
  });
  it("refuses tampered candidates and missing environment values", async () => {
    const f = await setup();
    const m = await destructiveMigration(f);
    const p = await production(f, m);
    const plan = await p.deployment.preflight(p.directory);
    await writeFile(path.join(p.directory, "server", "index.js"), "changed");
    await expect(
      p.deployment.deploy(plan.planId, {
        ...approval,
        planId: plan.planId,
        force: true,
        reason: "test",
      }),
    ).rejects.toThrow("contents changed");
    expect(p.target.promote).not.toHaveBeenCalled();
  });
  it("local target keeps releases immutable and atomically changes its pointer", async () => {
    const f = await setup();
    const m = await destructiveMigration(f);
    const p = await production(f, m);
    const manifest = JSON.parse(
      await readFile(path.join(p.directory, "runtime-manifest.json"), "utf8"),
    ) as RuntimeManifest;
    const root = path.join(f.root, "host");
    const activate = vi.fn(async () => {});
    const target = new LocalDirectoryDeploymentTarget({
      root,
      activate,
      health: async () => {},
      oldRuntimeCompatible: async () => true,
    });
    await target.stage(p.directory, manifest);
    await target.health(manifest, "staged");
    await target.promote(manifest);
    expect(
      JSON.parse(await readFile(path.join(root, "active-release.json"), "utf8"))
        .buildId,
    ).toBe(manifest.buildId);
    expect(activate).toHaveBeenCalledOnce();
    await expect(target.stage(p.directory, manifest)).rejects.toThrow();
  });
});
