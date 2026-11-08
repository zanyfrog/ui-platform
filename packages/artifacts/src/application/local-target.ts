import path from "node:path";
import { cp, lstat, mkdir, readdir, realpath } from "node:fs/promises";
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
  /** Controlled targets must reserve one promotion and recheck the live scope before writing. */
  authorizePromotion?: (manifestFingerprint: string) => () => void;
}
interface ReleaseBinding {
  release: string;
  buildId: string;
  manifestFingerprint: string;
}
interface ActiveReleaseBinding extends ReleaseBinding {
  previous?: ReleaseBinding;
}
/** Portable, single-host release target; only the release pointer replacement is atomic. */
export class LocalDirectoryDeploymentTarget implements DeploymentTarget {
  private previous?: ActiveReleaseBinding;
  private staged?: ReleaseBinding;
  constructor(readonly options: LocalTargetOptions) {}
  private get activeFile() { return path.join(this.options.root, "active-release.json"); }
  private async active(): Promise<ActiveReleaseBinding | undefined> {
    return readJson<ActiveReleaseBinding>(this.activeFile).catch(error => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    });
  }
  private async verify(binding: ReleaseBinding): Promise<RuntimeManifest> {
    const expected = path.resolve(this.options.root, "releases", identifier(binding.buildId));
    if (binding.release !== expected || await realpath(expected) !== expected || !/^sha256:[a-f0-9]{64}$/.test(binding.manifestFingerprint)) {
      throw new Error("Invalid verified release binding.");
    }
    const file = path.join(expected, "runtime-manifest.json"), info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("Invalid runtime manifest file.");
    const manifest = await readJson<RuntimeManifest>(file);
    const files = await filesUnder(expected);
    delete files["runtime-manifest.json"];
    if (manifest.buildId !== binding.buildId || fingerprint(manifest) !== binding.manifestFingerprint ||
        fingerprint(files) !== fingerprint(manifest.files)) {
      throw new Error("Release manifest or contents changed.");
    }
    return manifest;
  }
  /** Host-side restart admission. Verify the selected bytes and recheck the pointer. */
  async readVerifiedActive(applicationId: string): Promise<{ binding: ReleaseBinding; manifest: RuntimeManifest }> {
    const active = await this.active();
    if (!active) throw new Error("No active release binding.");
    const manifest = await this.verify(active);
    if (manifest.applicationId !== applicationId || fingerprint(await this.active()) !== fingerprint(active)) {
      throw new Error("Active release selection changed or belongs to another application.");
    }
    return { binding: { release: active.release, buildId: active.buildId, manifestFingerprint: active.manifestFingerprint }, manifest };
  }
  /** Trusted transition host captures this capability while it holds writer exclusion. */
  async captureControlledRecovery(applicationId: string, expectedCandidate: string, compatible: (manifest: RuntimeManifest) => Promise<boolean>) {
    if (!/^sha256:[a-f0-9]{64}$/.test(expectedCandidate)) throw new Error("Invalid recovery candidate fingerprint.");
    const previous = await this.active();
    if (!previous) throw new Error("No active release to recover.");
    const verifyPrevious = async () => {
      const manifest = await this.verify(previous);
      if (manifest.applicationId !== applicationId || !await compatible(manifest)) throw new Error("Captured release is incompatible.");
    };
    await verifyPrevious();
    if (fingerprint(await this.active()) !== fingerprint(previous)) throw new Error("Active binding changed during recovery capture.");
    const binding = { release: previous.release, buildId: previous.buildId, manifestFingerprint: previous.manifestFingerprint };
    let used = false;
    return { binding, restore: async (signal: AbortSignal) => {
      if (used) throw new Error("Controlled recovery capability already used.");
      used = true;
      signal.throwIfAborted();
      await verifyPrevious();
      const current = await this.active();
      if (fingerprint(current) === fingerprint(previous)) return;
      if (!current || current.manifestFingerprint !== expectedCandidate || fingerprint(current.previous) !== fingerprint(binding)) {
        throw new Error("Active binding does not match the controlled recovery scope.");
      }
      if (fingerprint(await this.active()) !== fingerprint(current)) throw new Error("Active binding changed before restoration.");
      signal.throwIfAborted();
      await writeJson(this.activeFile, previous);
      await this.options.activate(previous.release);
    } };
  }
  async readVerifiedPrior(applicationId: string) {
    const active = await this.active();
    if (!active?.previous) throw new Error("No prior release binding.");
    const manifest = await this.verify(active.previous);
    if (manifest.applicationId !== applicationId || fingerprint(await this.active()) !== fingerprint(active)) {
      throw new Error("Prior release selection changed or belongs to another application.");
    }
    return { binding: active.previous, manifest };
  }
  async promoteControlledPrior(applicationId: string, expected: string) {
    if (!this.options.authorizePromotion) throw new Error("Controlled promotion guard required.");
    const assertPromotion = this.options.authorizePromotion(expected);
    const active = await this.active();
    const prior = await this.readVerifiedPrior(applicationId);
    if (!active || prior.binding.manifestFingerprint !== expected || fingerprint(active.previous) !== fingerprint(prior.binding) ||
        fingerprint(await this.active()) !== fingerprint(active)) throw new Error("Controlled prior binding mismatch.");
    const { release, buildId, manifestFingerprint } = active;
    assertPromotion();
    await writeJson(this.activeFile, { ...prior.binding, previous: { release, buildId, manifestFingerprint } });
    await this.options.activate(prior.binding.release);
  }
  async preflight(manifest: RuntimeManifest) {
    identifier(manifest.buildId);
    await this.options.preflight?.(manifest);
  }
  async stage(directory: string, manifest: RuntimeManifest) {
    this.staged = undefined;
    this.previous = await this.active();
    if (this.previous && (await this.verify(this.previous)).applicationId !== manifest.applicationId) {
      throw new Error("Previous release belongs to another application.");
    }
    const releases = path.resolve(this.options.root, "releases");
    await mkdir(releases, { recursive: true });
    const release = path.join(releases, identifier(manifest.buildId));
    // Exclusive reservation prevents overwriting an immutable release.
    await mkdir(release);
    for (const entry of await readdir(directory))
      await cp(path.join(directory, entry), path.join(release, entry), {
        recursive: true,
        errorOnExist: true,
        force: false,
      });
    const binding = { release, buildId: manifest.buildId, manifestFingerprint: fingerprint(manifest) };
    await this.verify(binding);
    this.staged = binding;
  }
  async health(
    manifest: RuntimeManifest,
    phase: "before-migration" | "staged" | "promoted",
  ) {
    if (!this.staged) throw new Error("No staged release.");
    const verified = await this.verify(this.staged);
    if (fingerprint(verified) !== fingerprint(manifest)) throw new Error("Staged release changed.");
    await this.options.health(this.staged.release, verified, phase);
  }
  async promote(manifest: RuntimeManifest) {
    const assertPromotion = this.options.authorizePromotion?.(fingerprint(manifest));
    if (!this.staged || this.staged.manifestFingerprint !== fingerprint(manifest))
      throw new Error("Promotion candidate mismatch.");
    await this.verify(this.staged);
    if (fingerprint(await this.active()) !== fingerprint(this.previous)) throw new Error("Active release changed during staging.");
    const previous = this.previous && { release: this.previous.release, buildId: this.previous.buildId, manifestFingerprint: this.previous.manifestFingerprint };
    assertPromotion?.();
    await writeJson(this.activeFile, { ...this.staged, ...(previous && { previous }) });
    await this.options.activate(this.staged.release);
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
    const active = await this.active(), previous = active?.previous;
    if (!active || !previous) throw new Error("No verified previous release binding is available.");
    const old = await this.verify(previous);
    const current = await this.verify(active);
    if (old.applicationId !== current.applicationId || !await this.oldRuntimeCompatible()) throw new Error("Previous release is incompatible.");
    if (fingerprint(await this.active()) !== fingerprint(active)) throw new Error("Active release changed before rollback.");
    await writeJson(this.activeFile, previous);
    await this.options.activate(previous.release);
  }
}
