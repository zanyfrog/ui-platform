import path from "node:path";
import { appendFile, realpath } from "node:fs/promises";
import {
  capture,
  checksum,
  declaredPaths,
  discoverBundles,
  error,
  parseManifest,
  readOptional,
  safeFile,
  type Snapshot,
} from "./bundle.js";
import { ArtifactDefinitionRegistry } from "./definitions.js";
import { formatArtifact } from "./formatting.js";
import { ValidatorRegistry } from "./validation/validator-registry.js";
import {
  validateSnapshot,
  validationResult,
} from "./validation/validate-artifact.js";
import {
  ArtifactConflictError,
  adoptPathHistory,
  commitTransaction,
  createPublishedVersion,
  createRevision,
  immutableWrite,
  readHistory,
  recoverTransaction,
  storageDirectory,
  storageKey,
  versions,
  withArtifactLock,
} from "./storage.js";
import type {
  ArtifactChanges,
  ArtifactLogEvent,
  ArtifactManifest,
  ArtifactPublishResult,
  ArtifactRevision,
  ArtifactSaveResult,
  ArtifactService,
  ArtifactSummary,
  ArtifactValidationContext,
  EditableArtifact,
  ValidationDiagnostic,
} from "./types.js";

export interface ArtifactServiceOptions {
  /** Artifact workspace root; .uib lives here. */
  root: string;
  definitions?: ArtifactDefinitionRegistry;
  validators?: ValidatorRegistry;
  resolveReference?: ArtifactValidationContext["resolveReference"];
  logger?: (event: ArtifactLogEvent) => void;
  /** Fault injection hook for testing storage failures. */
  beforeCommitFile?: (file: string, index: number) => void | Promise<void>;
}
export class FileSystemArtifactService implements ArtifactService {
  readonly definitions: ArtifactDefinitionRegistry;
  readonly validators: ValidatorRegistry;
  private index = new Map<string, string[]>();
  private readonly observed = new Map<string, Snapshot>();
  private readonly identities = new Map<string, string>();
  private routes: NonNullable<ArtifactValidationContext["routes"]> = [];
  private root: string;
  constructor(private readonly options: ArtifactServiceOptions) {
    this.root = path.resolve(options.root);
    this.definitions = options.definitions ?? new ArtifactDefinitionRegistry();
    this.validators = options.validators ?? new ValidatorRegistry();
  }
  private async log(
    operation: string,
    artifact?: EditableArtifact,
    detail: Partial<ArtifactLogEvent> = {},
  ): Promise<void> {
    const diagnostics = artifact?.validation.diagnostics ?? [];
    const event: ArtifactLogEvent = {
      timestamp: new Date().toISOString(),
      operation,
      artifactId: artifact?.manifest?.artifactId,
      artifactType: artifact?.manifest?.artifactType,
      bundlePath: artifact?.bundlePath,
      ...(artifact
        ? {
            validation: artifact.validation.valid
              ? ("PASSED" as const)
              : ("FAILED" as const),
            diagnosticCounts: {
              error: diagnostics.filter((d) => d.severity === "error").length,
              warning: diagnostics.filter((d) => d.severity === "warning")
                .length,
              info: diagnostics.filter((d) => d.severity === "info").length,
            },
          }
        : {}),
      ...detail,
    };
    const dir = await storageDirectory(this.root, "logs");
    await appendFile(
      path.join(dir, "operations.jsonl"),
      JSON.stringify(event) + "\n",
    );
    // Observers must never turn a committed write into an apparent failed save.
    try {
      this.options.logger?.(event);
    } catch {
      /* Durable operation log remains authoritative. */
    }
  }
  private async withinRoot(bundle: string): Promise<string> {
    this.root = await realpath(this.root);
    const resolved = await realpath(bundle);
    const relative = path.relative(this.root, resolved);
    if (
      relative.startsWith(".." + path.sep) ||
      relative === ".." ||
      path.isAbsolute(relative) ||
      relative.split(path.sep).includes(".uib")
    )
      throw new Error(
        "Artifact is outside the workspace or inside system storage.",
      );
    return resolved;
  }
  private async refresh(): Promise<string[]> {
    this.root = await realpath(this.root);
    const bundles = await discoverBundles(this.root);
    const index = new Map<string, string[]>();
    const routes: NonNullable<ArtifactValidationContext["routes"]> = [];
    for (const bundle of bundles) {
      const { manifest, id } = await this.locked(bundle, async () => {
        const { manifest } = parseManifest(
          await readOptional(await safeFile(bundle, "artifact.json")),
        );
        const bindings = await storageDirectory(this.root, "bundles");
        const bindingPath = path.join(bindings, `${storageKey(bundle)}.json`);
        let binding = await readOptional(bindingPath);
        if (!binding && manifest) {
          await adoptPathHistory(this.root, bundle, manifest.artifactId);
          try {
            await immutableWrite(
              bindingPath,
              JSON.stringify({ artifactId: manifest.artifactId }),
            );
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
          }
          binding = await readOptional(bindingPath);
        }
        const id: string | undefined = binding
          ? JSON.parse(binding).artifactId
          : manifest?.artifactId;
        return { manifest, id };
      });
      if (id) {
        this.identities.set(bundle, id);
        const paths = index.get(id) ?? [];
        paths.push(bundle);
        index.set(id, paths);
      }
      if (!manifest) continue;
      if (["route", "routeGroup"].includes(manifest.artifactType))
        routes.push({ bundlePath: bundle, manifest });
    }
    this.index = index;
    this.routes = routes;
    return bundles;
  }
  private async resolve(idOrPath: string): Promise<string> {
    await this.refresh();
    const matches = this.index.get(idOrPath);
    if (matches && matches.length > 1)
      throw new Error(`Duplicate artifactId: ${idOrPath}`);
    if (matches?.length) return matches[0];
    const known = [...this.identities].find(([, id]) => id === idOrPath);
    if (known) return this.withinRoot(known[0]);
    const candidate = path.resolve(this.root, idOrPath);
    return this.withinRoot(
      path.basename(candidate) === "artifact.json"
        ? path.dirname(candidate)
        : candidate,
    );
  }
  private async normalized(
    bundle: string,
    snapshot: Snapshot,
    extra: ValidationDiagnostic[] = [],
  ): Promise<EditableArtifact> {
    const parsed = parseManifest(snapshot["artifact.json"]).manifest;
    const routes = this.routes.filter((route) => route.bundlePath !== bundle);
    if (parsed && ["route", "routeGroup"].includes(parsed.artifactType))
      routes.push({ bundlePath: bundle, manifest: parsed });
    const artifact = await validateSnapshot(
      bundle,
      snapshot,
      this.definitions,
      this.validators,
      { routes, resolveReference: this.options.resolveReference },
    );
    if (
      artifact.manifest &&
      (this.index.get(artifact.manifest.artifactId)?.length ?? 0) > 1
    )
      extra = [
        ...extra,
        error(
          "artifact.duplicate-id",
          `Duplicate artifactId: ${artifact.manifest.artifactId}`,
          "artifact.json",
        ),
      ];
    const originalId = this.identities.get(bundle);
    if (
      originalId &&
      artifact.manifest &&
      originalId !== artifact.manifest.artifactId
    )
      extra = [
        ...extra,
        error("artifact.identity", "artifactId is immutable.", "artifact.json"),
      ];
    artifact.validation = validationResult([
      ...artifact.validation.diagnostics,
      ...extra,
    ]);
    if (artifact.manifest) {
      const published = await versions(this.root, artifact.manifest.artifactId);
      artifact.lifecycle.latestPublishedVersion = published
        .at(-1)
        ?.replace(".json", "");
    }
    return artifact;
  }
  private async locked<T>(
    bundle: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    return withArtifactLock(this.root, bundle, async () => {
      if (await recoverTransaction(this.root, bundle))
        await this.log("transaction.rollback", undefined, {
          bundlePath: bundle,
          message: "Recovered interrupted transaction.",
        });
      return operation();
    });
  }
  async discover(root = this.root): Promise<ArtifactSummary[]> {
    const searchRoot = await this.withinRoot(path.resolve(this.root, root));
    await this.refresh();
    const summaries: ArtifactSummary[] = [];
    for (const bundle of await discoverBundles(searchRoot)) {
      const artifact = await this.load(bundle);
      summaries.push({
        artifactId: artifact.manifest?.artifactId,
        artifactType: artifact.manifest?.artifactType,
        name: artifact.manifest?.name,
        bundlePath: bundle,
        validation: artifact.validation,
      });
    }
    await this.log("artifact.discovery", undefined, {
      bundlePath: searchRoot,
      message: `${summaries.length} bundles discovered.`,
    });
    return summaries;
  }
  async load(idOrPath: string): Promise<EditableArtifact> {
    const bundle = await this.resolve(idOrPath);
    return this.locked(bundle, async () => {
      let snapshot: Snapshot;
      try {
        snapshot = await capture(bundle);
      } catch (e) {
        const manifestContent = await readOptional(
          await safeFile(bundle, "artifact.json"),
        );
        return this.normalized(bundle, { "artifact.json": manifestContent }, [
          error("file.access", String(e)),
        ]);
      }
      const artifact = await this.normalized(bundle, snapshot);
      this.observed.set(bundle, snapshot);
      await this.log("validation.result", artifact);
      return artifact;
    });
  }
  async validate(idOrPath: string) {
    return (await this.load(idOrPath)).validation;
  }
  async saveDraft(
    idOrPath: string,
    changes: ArtifactChanges = {},
  ): Promise<ArtifactSaveResult> {
    return this.save(idOrPath, changes, "save");
  }
  private async save(
    idOrPath: string,
    changes: ArtifactChanges,
    reason: "save" | "restore",
  ): Promise<ArtifactSaveResult> {
    const bundle = await this.resolve(idOrPath);
    const initial = await capture(bundle);
    if (
      changes.expectedChecksum &&
      changes.expectedChecksum !== checksum(initial)
    )
      throw new ArtifactConflictError();
    const staged: Snapshot = Object.assign(Object.create(null), initial);
    if (changes.manifest !== undefined)
      staged["artifact.json"] =
        typeof changes.manifest === "string"
          ? changes.manifest
          : JSON.stringify(changes.manifest);
    const permitted = new Set([
      ...declaredPaths(initial["artifact.json"]),
      ...declaredPaths(staged["artifact.json"]),
    ]);
    for (const [name, content] of Object.entries(changes.files ?? {})) {
      if (!permitted.has(name))
        throw new Error(`Changes must target declared artifact files: ${name}`);
      await safeFile(bundle, name);
      staged[name] = content;
    }
    for (const name of declaredPaths(staged["artifact.json"]))
      if (!(name in staged))
        staged[name] = await readOptional(await safeFile(bundle, name));
    const original = await capture(bundle, Object.keys(staged));
    if (checksum(await capture(bundle)) !== checksum(initial))
      throw new ArtifactConflictError();
    const previousManifest = parseManifest(initial["artifact.json"]).manifest;
    const nextManifest = parseManifest(staged["artifact.json"]).manifest;
    const identity =
      this.identities.get(bundle) ?? previousManifest?.artifactId;
    // Check identity even when other manifest properties are malformed.
    let rawId: unknown;
    try {
      rawId = JSON.parse(staged["artifact.json"] ?? "null")?.artifactId;
    } catch {
      /* Malformed draft remains saveable. */
    }
    if (identity && typeof rawId === "string" && rawId !== identity)
      throw new Error("artifactId is immutable.");
    const artifact = await this.normalized(bundle, original);
    await this.log("draft.save.start", artifact);
    const formatting = await formatArtifact(
      bundle,
      staged,
      nextManifest,
      nextManifest
        ? this.definitions.get(nextManifest.artifactType)
        : undefined,
    );
    const updated = await this.normalized(bundle, staged, formatting);
    return this.locked(bundle, async () => {
      if (
        checksum(await capture(bundle, Object.keys(original))) !==
        checksum(original)
      )
        throw new ArtifactConflictError();
      const revision = await createRevision(
        this.root,
        identity ?? `path:${bundle}`,
        original,
        reason,
      );
      await this.log("revision.creation", artifact, {
        revision: revision.revision,
      });
      try {
        await commitTransaction(this.root, bundle, original, staged, {
          beforeWrite: this.options.beforeCommitFile,
        });
      } catch (e) {
        await this.log("transaction.rollback", artifact, {
          message: String(e),
          revision: revision.revision,
        });
        await this.log("draft.save.result", artifact, {
          message: "FAILED",
          revision: revision.revision,
        });
        throw e;
      }
      // Public checksum covers the current manifest and its declared files only.
      updated.checksum = checksum(await capture(bundle));
      this.observed.set(bundle, await capture(bundle));
      if (updated.manifest)
        this.identities.set(bundle, updated.manifest.artifactId);
      await this.log("draft.save.result", updated, {
        revision: revision.revision,
        message: "SAVED",
      });
      await this.log("validation.result", updated);
      return {
        saved: true,
        artifact: updated,
        validation: updated.validation,
        revision: revision.revision,
      };
    });
  }
  async publish(idOrPath: string): Promise<ArtifactPublishResult> {
    const bundle = await this.resolve(idOrPath);
    return this.locked(bundle, async () => {
      const original = await capture(bundle);
      const staged = { ...original };
      const manifest = parseManifest(staged["artifact.json"]).manifest;
      const formatting = await formatArtifact(
        bundle,
        staged,
        manifest,
        manifest ? this.definitions.get(manifest.artifactType) : undefined,
      );
      const artifact = await this.normalized(bundle, staged, formatting);
      await this.log("publish.attempt", artifact);
      if (
        !artifact.validation.valid ||
        !artifact.manifest ||
        !artifact.capabilities.publish
      ) {
        if (artifact.validation.valid)
          artifact.validation = validationResult([
            error(
              "publish.unsupported",
              "Definition does not support publishing.",
            ),
          ]);
        await this.log("publish.failure", artifact);
        return { published: false, validation: artifact.validation };
      }
      if (checksum(await capture(bundle)) !== checksum(original))
        throw new ArtifactConflictError();
      const published = await createPublishedVersion(
        this.root,
        artifact.manifest.artifactId,
        staged,
      );
      await this.log("publish.success", artifact, published);
      return { published: true, validation: artifact.validation, ...published };
    });
  }
  async getHistory(idOrPath: string): Promise<ArtifactRevision[]> {
    const bundle = await this.resolve(idOrPath);
    const manifest = parseManifest(
      await readOptional(await safeFile(bundle, "artifact.json")),
    ).manifest;
    return (
      await readHistory(
        this.root,
        this.identities.get(bundle) ?? manifest?.artifactId ?? `path:${bundle}`,
      )
    ).map((item) => item.metadata);
  }
  async restoreRevision(
    idOrPath: string,
    revision: string,
  ): Promise<ArtifactSaveResult> {
    const bundle = await this.resolve(idOrPath);
    const current = await this.load(bundle);
    const history = await readHistory(
      this.root,
      this.identities.get(bundle) ??
        current.manifest?.artifactId ??
        `path:${bundle}`,
    );
    const target = history.find((item) => item.metadata.revision === revision);
    if (!target) throw new Error(`Unknown revision: ${revision}`);
    const files: Record<string, string | null> = {};
    for (const name of new Set([
      ...declaredPaths(current.manifestContent),
      ...Object.keys(target.files),
    ]))
      if (name !== "artifact.json") files[name] = target.files[name] ?? null;
    return this.save(
      bundle,
      {
        manifest: target.files["artifact.json"] ?? "",
        files,
        expectedChecksum: current.checksum,
      },
      "restore",
    );
  }
  async handleExternalChange(
    filePath: string,
  ): Promise<EditableArtifact | undefined> {
    const absolute = path.resolve(this.root, filePath);
    if (path.relative(this.root, absolute).split(path.sep).includes(".uib"))
      return undefined;
    const bundles = await this.refresh();
    const bundle = [...new Set([...bundles, ...this.observed.keys()])]
      .filter(
        (candidate) =>
          absolute === candidate || absolute.startsWith(candidate + path.sep),
      )
      .sort((a, b) => b.length - a.length)[0];
    if (!bundle) return undefined;
    return this.locked(bundle, async () => {
      const snapshot = await capture(bundle);
      const previous = this.observed.get(bundle);
      const artifact = await this.normalized(bundle, snapshot);
      const identity =
        this.identities.get(bundle) ??
        artifact.manifest?.artifactId ??
        `path:${bundle}`;
      // Without a prior observation only the observed external state is recoverable.
      const revision = await createRevision(
        this.root,
        identity,
        previous ?? snapshot,
        "external",
      );
      this.observed.set(bundle, snapshot);
      await this.log("revision.creation", artifact, {
        revision: revision.revision,
      });
      await this.log("external.change", artifact, {
        revision: revision.revision,
      });
      await this.log("validation.result", artifact);
      return artifact;
    });
  }
}
