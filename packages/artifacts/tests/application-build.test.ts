import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  FileSystemArtifactService,
  ArtifactDefinitionRegistry,
  ApplicationBuildEngine,
  ApplicationGraph,
  runApplicationCli,
} from "../src/index.js";
import type { EditableArtifact, ArtifactDefinition } from "../src/types.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});
const page: ArtifactDefinition = {
  artifactType: "page",
  currentDefinitionVersion: 1,
  fileRoles: { source: { required: true, extensions: [".json"] } },
  capabilities: { edit: true, format: true },
  validators: [],
  extractReferences: ({ manifest }) =>
    ((manifest.config?.dependencies as string[]) ?? []).map((artifactId) => ({
      artifactId,
      field: "dependencies",
    })),
};
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "uib-build-"));
  directories.push(root);
  const definitions = new ArtifactDefinitionRegistry();
  definitions.register(page);
  const service = new FileSystemArtifactService({ root, definitions });
  async function bundle(id: string, dependencies: string[] = []) {
    const directory = path.join(root, id);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "artifact.json"),
      JSON.stringify({
        schemaVersion: 1,
        artifactId: id,
        artifactType: "page",
        name: id,
        definitionVersion: 1,
        files: { source: "page.json" },
        config: { dependencies },
      }),
    );
    await writeFile(path.join(directory, "page.json"), "{}");
  }
  return { root, service, bundle };
}
describe("application builds", () => {
  it("orders dependencies, reuses current cache and invalidates on source/toolchain changes", async () => {
    const { root, service, bundle } = await setup();
    await bundle("schema");
    await bundle("form", ["schema"]);
    await bundle("page", ["form"]);
    await bundle("unused");
    const order: string[] = [];
    let toolchain = "1";
    const engine = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["page"] }),
      inputs: async () => toolchain,
      compile: async (artifact) => {
        order.push(artifact.manifest!.artifactId);
        return { "output.json": artifact.files[0].content };
      },
    });
    expect((await engine.buildDevelopment()).valid).toBe(true);
    expect(order).toEqual(["schema", "form", "page"]);
    expect(engine.states.get("unused")).toBe("deferred");
    order.length = 0;
    await engine.buildDevelopment();
    expect(order).toEqual([]);
    toolchain = "2";
    await engine.buildDevelopment();
    expect(order).toEqual(["schema", "form", "page"]);
    order.length = 0;
    await writeFile(path.join(root, "schema", "page.json"), '{"new":true}');
    await engine.buildDevelopment();
    expect(order).toEqual(["schema", "form", "page"]);
  });
  it("coalesces changes during compilation and never returns superseded output", async () => {
    const { root, service, bundle } = await setup();
    await bundle("page");
    let release!: () => void, started!: () => void;
    const began = new Promise<void>((r) => {
      started = r;
    });
    const wait = new Promise<void>((r) => {
      release = r;
    });
    let count = 0;
    const engine = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["page"] }),
      inputs: async () => "v1",
      compile: async (artifact) => {
        if (++count === 1) {
          started();
          await wait;
        }
        return { "output.json": artifact.files[0].content };
      },
    });
    const running = engine.buildDevelopment();
    await began;
    await writeFile(path.join(root, "page", "page.json"), '{"new":true}');
    engine.markDirty("page");
    engine.markDirty("page");
    expect(engine.current("page")).toBeUndefined();
    release();
    await running;
    expect(count).toBe(2);
    expect(engine.current("page")!.files["output.json"]).toContain("true");
  });
  it("keeps independent branches working and reports unused errors without blocking", async () => {
    const { root, service, bundle } = await setup();
    await bundle("bad");
    await bundle("dependent", ["bad"]);
    await bundle("good");
    await bundle("unused");
    await writeFile(path.join(root, "unused", "page.json"), "invalid");
    const engine = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["dependent", "good"] }),
      inputs: async () => "1",
      compile: async (artifact) => {
        if (artifact.manifest!.artifactId === "bad") throw new Error("bad");
        return { "x.json": "{}" };
      },
    });
    const report = await engine.buildDevelopment();
    expect(report.valid).toBe(false);
    expect(engine.current("good")).toBeDefined();
    expect(engine.current("dependent")).toBeUndefined();
    expect(report.diagnostics.some((d) => d.artifactId === "unused")).toBe(
      true,
    );
    expect(
      report.blockingDiagnostics.some((d) => d.artifactId === "unused"),
    ).toBe(false);
  });
  it("rejects missing dependencies and cycles, while distinguishing runtime-only edges", async () => {
    const { service, bundle } = await setup();
    await bundle("a");
    await bundle("b");
    const artifacts = await Promise.all([service.load("a"), service.load("b")]);
    expect(
      new ApplicationGraph(artifacts, { routes: ["a"] }, [
        { from: "a", to: "b", buildOrder: true },
        { from: "b", to: "a", buildOrder: false },
      ]).blockers,
    ).toEqual([]);
    expect(
      new ApplicationGraph(artifacts, { routes: ["a"] }, [
        { from: "a", to: "b", buildOrder: true },
        { from: "b", to: "a", buildOrder: true },
      ]).blockers.some((d) => d.code === "application.build-cycle"),
    ).toBe(true);
    expect(
      new ApplicationGraph(artifacts, { routes: ["missing"] }).blockers[0]
        .message,
    ).toContain("missing");
  });
  it("keeps CLI and application validation diagnostics identical", async () => {
    const { root, service, bundle } = await setup();
    await bundle("page", ["missing"]);
    const build = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["page"] }),
      inputs: async () => "1",
      compile: async () => ({}),
    });
    let output = "";
    expect(
      await runApplicationCli(["app", "validate", "app", "--json"], {
        tooling: { build },
        stdout: (text) => {
          output += text;
        },
      }),
    ).toBe(1);
    expect(JSON.parse(output)).toEqual(await build.validateApplication());
  });
  it("packages a runnable production bundle and rejects source changes during packaging", async () => {
    const { root, service, bundle } = await setup();
    await bundle("page");
    let change = false;
    const engine = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["page"] }),
      inputs: async () => "compiler-1",
      compile: async (artifact) => ({ "page.json": artifact.files[0].content }),
      packageRuntime: async (directory) => {
        await mkdir(path.join(directory, "server"));
        await writeFile(
          path.join(directory, "server", "index.cjs"),
          "process.stdout.write('ready')",
        );
        if (change)
          await writeFile(
            path.join(root, "page", "page.json"),
            '{"changed":true}',
          );
        return {
          entryPoint: "server/index.cjs",
          requiredEnvironmentKeys: [],
          migrationIdsIncluded: [],
        };
      },
      verifyRuntime: async (directory, manifest) => {
        const { stdout } = await promisify(execFile)(
          process.execPath,
          [path.join(directory, manifest.entryPoint)],
          { cwd: directory, timeout: 5000 },
        );
        expect(stdout).toBe("ready");
      },
    });
    const result = await engine.buildProduction();
    expect(result.manifest.buildId).toMatch(/^app-\d{8}T/);
    expect(result.manifest.files["server/index.cjs"]).toBeDefined();
    expect(result.manifest.runtimeCompatibility.node).toBe(
      process.versions.node.split(".")[0],
    );
    change = true;
    await expect(engine.buildProduction()).rejects.toThrow("Source changed");
  });
  it("runs independent ready branches concurrently", async () => {
    const { root, service, bundle } = await setup();
    await bundle("a");
    await bundle("b");
    let active = 0,
      peak = 0;
    let release!: () => void;
    const both = new Promise<void>((r) => {
      release = r;
    });
    const engine = new ApplicationBuildEngine({
      root,
      applicationId: "app",
      service,
      entries: async () => ({ routes: ["a", "b"] }),
      inputs: async () => "1",
      compile: async () => {
        active++;
        peak = Math.max(peak, active);
        if (active === 2) release();
        await both;
        active--;
        return { "result.json": "{}" };
      },
    });
    expect((await engine.buildDevelopment()).valid).toBe(true);
    expect(peak).toBe(2);
  });
});
