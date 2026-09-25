import path from "node:path";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import type {
  ArtifactService,
  EditableArtifact,
  ArtifactWatcher,
  ValidationDiagnostic,
} from "../types.js";
import { storageDirectory } from "../storage.js";
import { safeFile, validRelativePath } from "../bundle.js";
import {
  ApplicationGraph,
  type DependencyEdge,
  type EntryPoints,
} from "./graph.js";
import {
  filesUnder,
  fingerprint,
  identifier,
  logOperation,
  readJson,
  writeJson,
} from "./common.js";

export type BuildState =
  | "dirty"
  | "queued"
  | "building"
  | "dirty-during-build"
  | "succeeded"
  | "failed"
  | "blocked"
  | "deferred";
export interface ArtifactBuildResult {
  artifactId: string;
  fingerprint: string;
  outputFingerprint: string;
  files: Record<string, string>;
}
export interface ApplicationValidationReport {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  blockingDiagnostics: ValidationDiagnostic[];
  reachable: string[];
}
export interface RuntimeManifest {
  manifestVersion: 1;
  applicationId: string;
  buildId: string;
  builtAt: string;
  sourceFingerprint: string;
  gitCommit?: string;
  gitDirty?: boolean;
  uiPlatformVersion: string;
  runtimeCompatibility: { node: string; target: string };
  entryPoint: string;
  requiredEnvironmentKeys: string[];
  migrationIdsIncluded: string[];
  migrationChecksums: Record<string, string>;
  files: Record<string, string>;
  artifacts: {
    artifactId: string;
    fingerprint: string;
    outputFingerprint: string;
  }[];
  validationReport: string;
}
export interface BuildOptions {
  root: string;
  applicationId: string;
  service: ArtifactService;
  entries: () => Promise<EntryPoints>;
  /** Include compiler/definition revisions, installed package versions, settings, and shared package source hashes. */
  inputs: () => Promise<unknown>;
  dependencies?: (artifacts: EditableArtifact[]) => Promise<DependencyEdge[]>;
  schemaGate?: (artifact: EditableArtifact) => Promise<boolean>;
  compile: (
    artifact: EditableArtifact,
    dependencies: ArtifactBuildResult[],
    mode: "development" | "production",
  ) => Promise<Record<string, string>>;
  /** Writes a complete runnable bundle to a new empty staging directory. Must omit development tooling. */
  packageRuntime?: (
    directory: string,
    artifacts: ArtifactBuildResult[],
  ) => Promise<{
    entryPoint: string;
    requiredEnvironmentKeys: string[];
    migrationIdsIncluded: string[];
  }>;
  verifyRuntime?: (
    directory: string,
    manifest: RuntimeManifest,
  ) => Promise<void>;
  debounceMs?: number;
  parallelism?: number;
  platformVersion?: string;
}
export class ApplicationBuildEngine {
  readonly states = new Map<string, BuildState>();
  private successful = new Map<string, ArtifactBuildResult>();
  private generation = 0;
  private running?: Promise<ApplicationValidationReport>;
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  private lastScan?: string;
  private mode: "development" | "production" = "development";
  constructor(readonly options: BuildOptions) {
    identifier(options.applicationId);
    if (
      options.parallelism !== undefined &&
      (!Number.isInteger(options.parallelism) || options.parallelism < 1)
    )
      throw new Error("parallelism must be a positive integer.");
  }
  async snapshot() {
    const summaries = await this.options.service.discover(this.options.root);
    const artifacts = await Promise.all(
      summaries.map((s) => this.options.service.load(s.bundlePath)),
    );
    const entries = await this.options.entries();
    const graph = new ApplicationGraph(
      artifacts,
      entries,
      await this.options.dependencies?.(artifacts),
    );
    for (const artifact of artifacts)
      if (
        ["schema", "dataset"].includes(artifact.manifest?.artifactType ?? "") &&
        (!this.options.schemaGate || !(await this.options.schemaGate(artifact)))
      )
        graph.issue(
          "migration.pending",
          artifact.manifest!.artifactId,
          "Applied schema is unverified or differs from proposed source; migration is required.",
        );
    // All local source/import/config edits conservatively invalidate this application.
    const localInputs = await filesUnder(
      this.options.root,
      new Set([".git", ".uib", "node_modules", "dist", "dist-server"]),
    );
    const inputs = await this.options.inputs();
    const stamp = fingerprint({
      localInputs,
      inputs,
      entries,
      edges: graph.edges,
      artifacts: artifacts.map((a) => [a.bundlePath, a.checksum]),
      mode: this.mode,
    });
    return { graph, stamp, inputs };
  }
  async validateApplication(): Promise<ApplicationValidationReport> {
    const { graph } = await this.snapshot();
    return this.report(graph);
  }
  private report(graph: ApplicationGraph): ApplicationValidationReport {
    return {
      valid: graph.blockers.length === 0,
      diagnostics: graph.diagnostics,
      blockingDiagnostics: graph.blockers,
      reachable: [...graph.reachable].sort(),
    };
  }
  markDirty(id?: string) {
    this.generation++;
    if (id) {
      this.states.set(
        id,
        this.states.get(id) === "building" ? "dirty-during-build" : "dirty",
      );
      this.successful.delete(id);
    }
    // Conservatively remove all current results until reconciliation proves freshness.
    this.successful.clear();
  }
  async onSourceChanged(_path: string) {
    this.markDirty();
    return this.buildDevelopment();
  }
  current(id: string): ArtifactBuildResult | undefined {
    return this.states.get(id) === "succeeded"
      ? this.successful.get(id)
      : undefined;
  }
  private async pass(): Promise<ApplicationValidationReport> {
    const { graph, stamp } = await this.snapshot();
    this.successful.clear();
    for (const [id] of graph.nodes)
      this.states.set(id, graph.reachable.has(id) ? "queued" : "deferred");
    const directory = await storageDirectory(
      this.options.root,
      "build",
      this.options.applicationId,
    );
    const pending = new Set(
      [...graph.reachable].filter((id) => graph.nodes.has(id)),
    );
    const failures = new Set(
      graph.blockers
        .map((d) => d.artifactId)
        .filter((id): id is string => !!id),
    );
    while (pending.size) {
      const ready = [...pending]
        .filter((id) => !graph.dependencies(id).some((dep) => pending.has(dep)))
        .sort();
      if (!ready.length) {
        for (const id of pending) this.states.set(id, "blocked");
        break;
      }
      for (
        let index = 0;
        index < ready.length;
        index += this.options.parallelism ?? 4
      ) {
        await Promise.all(
          ready
            .slice(index, index + (this.options.parallelism ?? 4))
            .map(async (id) => {
              pending.delete(id);
              const deps = graph.dependencies(id);
              if (
                failures.has(id) ||
                deps.some((dep) => !this.successful.has(dep))
              ) {
                this.states.set(id, failures.has(id) ? "failed" : "blocked");
                failures.add(id);
                if (!graph.blockers.some((d) => d.artifactId === id))
                  graph.issue(
                    "build.blocked",
                    id,
                    `Required dependency failed: ${id} -> ${deps.filter((dep) => !this.successful.has(dep)).join(", ")}`,
                  );
                return;
              }
              const artifact = graph.nodes.get(id)!;
              const dependencies = deps.map((dep) => this.successful.get(dep)!);
              const key = fingerprint({
                stamp,
                checksum: artifact.checksum,
                definition: artifact.manifest?.definitionVersion,
                dependencies: dependencies.map((d) => d.outputFingerprint),
                mode: this.mode,
              });
              const cache = path.join(
                directory,
                fingerprint(id).slice(7) + ".json",
              );
              this.states.set(id, "building");
              try {
                let result: ArtifactBuildResult | undefined;
                try {
                  const cached = await readJson<ArtifactBuildResult>(cache);
                  if (
                    cached.fingerprint === key &&
                    cached.outputFingerprint === fingerprint(cached.files) &&
                    cached.artifactId === id
                  )
                    result = cached;
                } catch {
                  /* Invalid cache is rebuilt. */
                }
                if (!result) {
                  const files = await this.options.compile(
                    artifact,
                    dependencies,
                    this.mode,
                  );
                  for (const name of Object.keys(files))
                    if (!validRelativePath(name))
                      throw new Error(
                        "Compiler produced an unsafe output path.",
                      );
                  result = {
                    artifactId: id,
                    fingerprint: key,
                    outputFingerprint: fingerprint(files),
                    files,
                  };
                }
                this.successful.set(id, result);
                await writeJson(cache, result);
                this.states.set(id, "succeeded");
              } catch {
                failures.add(id);
                this.states.set(id, "failed");
                graph.issue(
                  "build.compile",
                  id,
                  `Compilation failed for ${id}; no current output is available.`,
                );
              }
            }),
        );
      }
    }
    if ((await this.snapshot()).stamp !== stamp) {
      this.markDirty();
    }
    this.lastScan = stamp;
    return this.report(graph);
  }
  async buildDevelopment(): Promise<ApplicationValidationReport> {
    if (this.running) return this.running;
    this.running = (async () => {
      let report: ApplicationValidationReport;
      let generation: number;
      do {
        generation = this.generation;
        report = await this.pass();
      } while (generation !== this.generation && !this.closed);
      await logOperation(this.options.root, {
        operation: "application.build",
        status: report.valid ? "succeeded" : "failed",
        applicationId: this.options.applicationId,
        diagnosticCodes: report.blockingDiagnostics.map((d) => d.code),
      });
      return report;
    })().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  async ensureFreshBuild(id: string) {
    await this.buildDevelopment();
    const result = this.current(id);
    if (!result) throw new Error(`No current successful build: ${id}`);
    return result;
  }
  async startWatching(
    onReport: (report: ApplicationValidationReport) => void,
    onError: (error: Error) => void,
  ): Promise<ArtifactWatcher> {
    const schedule = () => {
      this.markDirty();
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        void this.buildDevelopment().then(onReport).catch(onError);
      }, this.options.debounceMs ?? 300);
    };
    const watcher = await this.options.service.startWatching({
      debounceMs: this.options.debounceMs ?? 300,
      onChange: schedule,
      onError,
    });
    onReport(await this.buildDevelopment());
    let checking = false;
    let scan: Promise<void> | undefined;
    const timer = setInterval(() => {
      if (checking || this.running) return;
      checking = true;
      scan = this.snapshot()
        .then((s) => {
          if (s.stamp !== this.lastScan) schedule();
        })
        .catch(onError)
        .finally(() => {
          checking = false;
        });
    }, 1000);
    return {
      close: async () => {
        this.closed = true;
        clearInterval(timer);
        if (this.timer) clearTimeout(this.timer);
        await watcher.close();
        await scan;
        if (this.timer) clearTimeout(this.timer);
        await this.running;
      },
    };
  }
  async buildProduction(): Promise<{
    directory: string;
    manifest: RuntimeManifest;
    report: ApplicationValidationReport;
  }> {
    if (!this.options.packageRuntime || !this.options.verifyRuntime)
      throw new Error(
        "A runtime packaging and staged verification adapter is required.",
      );
    if (this.running)
      throw new Error(
        "Wait for the active build before producing a production candidate.",
      );
    this.mode = "production";
    try {
      const before = await this.snapshot();
      const report = await this.buildDevelopment();
      if (!report.valid)
        throw new Error(
          `Production build blocked: ${report.blockingDiagnostics.map((d) => d.code).join(", ")}`,
        );
      const buildId = `${this.options.applicationId}-${new Date().toISOString().replace(/[-:.]/g, "")}-${randomUUID().slice(0, 8)}`;
      const parent = await safeFile(this.options.root, "dist/production");
      await mkdir(parent, { recursive: true });
      const staging = path.join(parent, `.candidate-${randomUUID()}`);
      await mkdir(staging);
      const outputs = [...this.successful.values()].sort((a, b) =>
        a.artifactId.localeCompare(b.artifactId),
      );
      const runtime = await this.options.packageRuntime(staging, outputs);
      if (!validRelativePath(runtime.entryPoint))
        throw new Error("Unsafe runtime entry point.");
      await readFile(path.join(staging, runtime.entryPoint));
      const migrationChecksums: Record<string, string> = {};
      for (const id of runtime.migrationIdsIncluded) {
        const artifact = await this.options.service.load(id);
        if (
          !artifact.validation.valid ||
          artifact.manifest?.artifactType !== "migration"
        )
          throw new Error("Bundled migration failed shared validation.");
        migrationChecksums[id] = JSON.parse(
          artifact.files.find((f) => f.role === "definition")!.content,
        ).checksum;
        await writeJson(
          path.join(
            staging,
            "runtime",
            "migrations",
            `${fingerprint(id).slice(7)}.json`,
          ),
          JSON.parse(
            artifact.files.find((f) => f.role === "definition")!.content,
          ),
        );
      }
      await writeJson(path.join(staging, "validation-report.json"), report);
      let git: { gitCommit?: string; gitDirty?: boolean } = {};
      try {
        const exec = promisify(execFile);
        git = {
          gitCommit: (
            await exec("git", ["rev-parse", "HEAD"], { cwd: this.options.root })
          ).stdout.trim(),
          gitDirty: !!(
            await exec("git", ["status", "--porcelain"], {
              cwd: this.options.root,
            })
          ).stdout.trim(),
        };
      } catch {
        /* Source fingerprints and UUID identify builds without Git. */
      }
      const manifest: RuntimeManifest = {
        manifestVersion: 1,
        applicationId: this.options.applicationId,
        buildId,
        builtAt: new Date().toISOString(),
        sourceFingerprint: before.stamp,
        ...git,
        uiPlatformVersion: this.options.platformVersion ?? "0.1.2",
        runtimeCompatibility: {
          node: process.versions.node.split(".")[0],
          target: `${process.platform}-${process.arch}`,
        },
        ...runtime,
        artifacts: outputs.map(({ files, ...output }) => output),
        migrationChecksums,
        files: await filesUnder(staging),
        validationReport: "validation-report.json",
      };
      await writeJson(path.join(staging, "runtime-manifest.json"), manifest);
      await this.options.verifyRuntime(staging, manifest);
      if ((await this.snapshot()).stamp !== before.stamp)
        throw new Error(
          "Source changed during production build; candidate was not published.",
        );
      if (
        fingerprint(
          await filesUnder(staging, new Set(["runtime-manifest.json"])),
        ) !== fingerprint(manifest.files)
      )
        throw new Error("Runtime changed during verification.");
      const directory = path.join(parent, buildId);
      await rename(staging, directory);
      await logOperation(this.options.root, {
        operation: "application.production-build",
        status: "succeeded",
        applicationId: this.options.applicationId,
        buildId,
      });
      return { directory, manifest, report };
    } finally {
      this.mode = "development";
      this.successful.clear();
    }
  }
}
