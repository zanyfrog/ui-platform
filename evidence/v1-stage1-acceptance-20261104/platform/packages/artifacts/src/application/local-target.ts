import path from "node:path";
import { cp, mkdir, readdir } from "node:fs/promises";
import {
  fingerprint,
  filesUnder,
  identifier,
  readJson,
  writeJson,
} from "./common.js";
import type { DeploymentTarget } from "./deployment.js";
import type { RuntimeManifest } from "./build.js";

export interface LocalTargetOptions {
  root: string;
  /** Host process manager performs mandatory process/config/DB/route checks. Throw on failure. */
  health: (
    release: string,
    manifest: RuntimeManifest,
    phase: "before-migration" | "staged" | "promoted",
  ) => Promise<void>;
  /** Host watches active-release.json or reloads here. Must finish before health is checked. */
  activate: (release: string) => Promise<void>;
  oldRuntimeCompatible: () => Promise<boolean>;
  preflight?: (manifest: RuntimeManifest) => Promise<void>;
  recoveryHealth?: () => Promise<void>;
}
/** Portable, single-host release target; only the release pointer replacement is atomic. */
export class LocalDirectoryDeploymentTarget implements DeploymentTarget {
  private previous?: string;
  private staged?: string;
  constructor(readonly options: LocalTargetOptions) {}
  async preflight(manifest: RuntimeManifest) {
    identifier(manifest.buildId);
    await this.options.preflight?.(manifest);
  }
  async stage(directory: string, manifest: RuntimeManifest) {
    const releases = path.join(this.options.root, "releases");
    await mkdir(releases, { recursive: true });
    this.staged = path.join(releases, identifier(manifest.buildId));
    // Exclusive reservation prevents overwriting an immutable release.
    await mkdir(this.staged);
    for (const entry of await readdir(directory))
      await cp(path.join(directory, entry), path.join(this.staged, entry), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    if (
      fingerprint(
        await filesUnder(this.staged, new Set(["runtime-manifest.json"])),
      ) !== fingerprint(manifest.files)
    )
      throw new Error("Staged release verification failed.");
    try {
      this.previous = (
        await readJson<{ release: string }>(
          path.join(this.options.root, "active-release.json"),
        )
      ).release;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    await writeJson(path.join(this.options.root, "previous-release.json"), {
      release: this.previous ?? null,
    });
  }
  async health(
    manifest: RuntimeManifest,
    phase: "before-migration" | "staged" | "promoted",
  ) {
    if (!this.staged) throw new Error("No staged release.");
    if (
      fingerprint(
        await filesUnder(this.staged, new Set(["runtime-manifest.json"])),
      ) !== fingerprint(manifest.files)
    )
      throw new Error("Staged release changed.");
    await this.options.health(this.staged, manifest, phase);
  }
  async promote(manifest: RuntimeManifest) {
    if (!this.staged || path.basename(this.staged) !== manifest.buildId)
      throw new Error("Promotion candidate mismatch.");
    await writeJson(path.join(this.options.root, "active-release.json"), {
      release: this.staged,
      buildId: manifest.buildId,
    });
    await this.options.activate(this.staged);
  }
  oldRuntimeCompatible() {
    return this.options.oldRuntimeCompatible();
  }
  async recoveryHealth() {
    if (!this.options.recoveryHealth)
      throw new Error("Recovery health probes are not configured.");
    await this.options.recoveryHealth();
  }
  async rollbackPointer() {
    const previous =
      this.previous ??
      (
        await readJson<{ release: string | null }>(
          path.join(this.options.root, "previous-release.json"),
        )
      ).release;
    if (!previous) throw new Error("No previous runtime pointer is available.");
    const relative = path.relative(
      path.join(this.options.root, "releases"),
      previous,
    );
    if (relative.startsWith("..") || path.isAbsolute(relative))
      throw new Error("Invalid previous release pointer.");
    await writeJson(path.join(this.options.root, "active-release.json"), {
      release: previous,
    });
    await this.options.activate(previous);
  }
}
