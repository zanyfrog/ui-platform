import path from "node:path";
import { randomUUID } from "node:crypto";
import { storageDirectory } from "../storage.js";
import { validRelativePath } from "../bundle.js";
import {
  fingerprint,
  filesUnder,
  identifier,
  logOperation,
  readJson,
  writeJson,
} from "./common.js";
import type { RuntimeManifest } from "./build.js";
import type { MigrationDefinition } from "./migration-definition.js";
import type { BackupReference, MigrationApproval } from "./migrations.js";
import { MigrationEngine } from "./migrations.js";

export interface PolicyDiagnostic {
  code: string;
  message: string;
  overrideable: boolean;
}
export interface DeploymentPlan {
  planId: string;
  directory: string;
  manifest: RuntimeManifest;
  manifestFingerprint: string;
  environmentId: string;
  migrations: MigrationDefinition[];
  policy: PolicyDiagnostic[];
}
export interface DeploymentApproval extends MigrationApproval {
  planId: string;
  force?: boolean;
}
export interface DeploymentTarget {
  preflight(manifest: RuntimeManifest): Promise<void>;
  stage(directory: string, manifest: RuntimeManifest): Promise<void>;
  health(
    manifest: RuntimeManifest,
    phase: "before-migration" | "staged" | "promoted",
  ): Promise<void>;
  promote(manifest: RuntimeManifest): Promise<void>;
  /** Report actual data compatibility. Never guess compatibility after a failed migration. */
  oldRuntimeCompatible(): Promise<boolean>;
  rollbackPointer(): Promise<void>;
  recoveryHealth?(): Promise<void>;
}
export interface DeploymentOptions {
  root: string;
  applicationId: string;
  migrations: MigrationEngine;
  target: DeploymentTarget;
  environment: () => Promise<Record<string, string | undefined>>;
  authorize: (approval: DeploymentApproval) => Promise<boolean>;
  policy?: (manifest: RuntimeManifest) => Promise<PolicyDiagnostic[]>;
}
export interface DeploymentRecord {
  deploymentId: string;
  planId: string;
  buildId: string;
  environmentId: string;
  state:
    | "preflight"
    | "staged"
    | "maintenance"
    | "backed-up"
    | "migrating"
    | "checking"
    | "promoting"
    | "succeeded"
    | "failed"
    | "recovery-required";
  actorId: string;
  updatedAt: string;
  backup?: BackupReference;
}
export class DeploymentService {
  constructor(readonly options: DeploymentOptions) {}
  private async verify(
    directory: string,
    expected?: string,
  ): Promise<RuntimeManifest> {
    const manifest = await readJson<RuntimeManifest>(
      path.join(directory, "runtime-manifest.json"),
    );
    if (
      manifest.manifestVersion !== 1 ||
      manifest.applicationId !== this.options.applicationId ||
      !validRelativePath(manifest.entryPoint) ||
      !manifest.files[manifest.entryPoint] ||
      (expected && fingerprint(manifest) !== expected)
    )
      throw new Error("Candidate manifest integrity failed.");
    if (
      fingerprint(
        await filesUnder(directory, new Set(["runtime-manifest.json"])),
      ) !== fingerprint(manifest.files)
    )
      throw new Error("Candidate contents changed.");
    if (
      manifest.runtimeCompatibility.node !==
        process.versions.node.split(".")[0] ||
      manifest.runtimeCompatibility.target !==
        `${process.platform}-${process.arch}`
    )
      throw new Error("Candidate runtime compatibility mismatch.");
    const environment = await this.options.environment();
    if (manifest.requiredEnvironmentKeys.some((key) => !environment[key]))
      throw new Error("Required target environment configuration is missing.");
    await this.options.target.preflight(manifest);
    return manifest;
  }
  async preflight(directory: string): Promise<DeploymentPlan> {
    const manifest = await this.verify(directory);
    const migrations = await this.options.migrations.pendingForEnvironment();
    if (
      migrations.some(
        (m) =>
          !manifest.migrationIdsIncluded.includes(m.migrationId) ||
          manifest.migrationChecksums[m.migrationId] !== m.checksum,
      )
    )
      throw new Error(
        "Candidate omits or differs from a pending confirmed migration.",
      );
    const ledger = await this.options.migrations.options.provider.ledger();
    for (const id of manifest.migrationIdsIncluded)
      if (
        !migrations.some((m) => m.migrationId === id) &&
        !ledger.some(
          (e) =>
            e.migrationId === id &&
            e.migrationChecksum === manifest.migrationChecksums[id] &&
            e.state === "applied",
        )
      )
        throw new Error(
          "Candidate migration is absent or differs from target ledger.",
        );
    const plan: DeploymentPlan = {
      planId: randomUUID(),
      directory: path.resolve(directory),
      manifest,
      manifestFingerprint: fingerprint(manifest),
      environmentId: this.options.migrations.options.provider.environmentId,
      migrations,
      policy: (await this.options.policy?.(manifest)) ?? [],
    };
    await writeJson(
      path.join(
        await storageDirectory(this.options.root, "deployment-plans"),
        `${plan.planId}.json`,
      ),
      plan,
    );
    return plan;
  }
  async deploy(
    planId: string,
    approval: DeploymentApproval,
  ): Promise<DeploymentRecord> {
    identifier(planId);
    if (
      approval.planId !== planId ||
      !approval.actorId ||
      !(await this.options.authorize(approval))
    )
      throw new Error("Deployment approval is missing or unauthorized.");
    const provider = this.options.migrations.options.provider;
    return provider.exclusive(async () => {
      const plans = await storageDirectory(
        this.options.root,
        "deployment-plans",
      );
      const plan = await readJson<DeploymentPlan>(
        path.join(plans, `${planId}.json`),
      );
      if (plan.environmentId !== provider.environmentId)
        throw new Error("Deployment environment changed.");
      const manifest = await this.verify(
        plan.directory,
        plan.manifestFingerprint,
      );
      const pending = await this.options.migrations.pendingForEnvironment();
      if (fingerprint(pending) !== fingerprint(plan.migrations))
        throw new Error("Pending migrations changed; repeat preflight.");
      const policy = (await this.options.policy?.(manifest)) ?? [];
      if (
        policy.some((d) => !d.overrideable) ||
        (policy.length && (!approval.force || !approval.reason?.trim()))
      )
        throw new Error("Deployment policy blocks activation.");
      if (pending.some((m) => m.destructive) && !approval.destructive)
        throw new Error(
          "Production requires a new explicit destructive approval bound to this deployment plan.",
        );
      const directory = await storageDirectory(
        this.options.root,
        "deployments",
        provider.environmentId,
      );
      const active = path.join(directory, "active.json");
      try {
        const previous = await readJson<DeploymentRecord>(active);
        if (!["succeeded", "failed"].includes(previous.state))
          throw new Error("A prior deployment requires operator recovery.");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const record: DeploymentRecord = {
        deploymentId: randomUUID(),
        planId,
        buildId: manifest.buildId,
        environmentId: provider.environmentId,
        state: "preflight",
        actorId: approval.actorId,
        updatedAt: new Date().toISOString(),
      };
      const save = async (state: DeploymentRecord["state"]) => {
        record.state = state;
        record.updatedAt = new Date().toISOString();
        await writeJson(active, record);
        await writeJson(
          path.join(directory, `${record.deploymentId}.json`),
          record,
        );
        await logOperation(this.options.root, {
          operation: "application.deploy",
          status: state,
          applicationId: this.options.applicationId,
          deploymentId: record.deploymentId,
          buildId: manifest.buildId,
          environmentId: provider.environmentId,
          actorId: approval.actorId,
          ...(approval.force
            ? {
                reason: approval.reason,
                diagnosticCodes: policy.map((d) => d.code),
              }
            : {}),
        });
      };
      await save("preflight");
      let mutationStarted = false,
        promotionStarted = false,
        maintenance = false;
      try {
        await this.options.target.stage(plan.directory, manifest);
        await save("staged");
        await this.options.target.health(manifest, "before-migration");
        if (pending.length) {
          await provider.maintenance(true);
          maintenance = true;
          await save("maintenance");
          record.backup = await provider.createBackup();
          await provider.verifyBackup(record.backup);
          await save("backed-up");
        }
        for (const migration of pending) {
          await this.options.migrations.check(migration, approval);
          mutationStarted = true;
          await save("migrating");
          await this.options.migrations.applyLocked(
            migration,
            approval,
            record.backup,
            record.deploymentId,
          );
        }
        await save("checking");
        await this.options.target.health(manifest, "staged");
        await this.verify(plan.directory, plan.manifestFingerprint);
        await save("promoting");
        promotionStarted = true;
        await this.options.target.promote(manifest);
        await this.options.target.health(manifest, "promoted");
        if (maintenance) await provider.maintenance(false);
        await save("succeeded");
      } catch {
        // Recovery never automatically restores data or reopens writes after uncertain mutations.
        let recovered = !mutationStarted && !promotionStarted;
        if (
          promotionStarted &&
          (await this.options.target.oldRuntimeCompatible().catch(() => false))
        ) {
          try {
            await this.options.target.rollbackPointer();
            recovered = !mutationStarted;
          } catch {
            recovered = false;
          }
        }
        if (recovered && maintenance) {
          try {
            await provider.maintenance(false);
          } catch {
            recovered = false;
          }
        }
        await save(recovered ? "failed" : "recovery-required");
      }
      return record;
    });
  }
  /** Explicit operator recovery after reviewing potential loss of all writes since backup. */
  async recover(
    deploymentId: string,
    approval: DeploymentApproval & {
      restoreBackupId: string;
      acceptDataLoss: boolean;
    },
  ): Promise<DeploymentRecord> {
    identifier(deploymentId);
    if (
      !approval.actorId ||
      !approval.acceptDataLoss ||
      !approval.reason?.trim() ||
      !this.options.target.recoveryHealth ||
      !(await this.options.authorize(approval))
    )
      throw new Error(
        "Recovery requires authorized backup-restore approval, data-loss acknowledgement, reason, and runtime recovery probes.",
      );
    const provider = this.options.migrations.options.provider;
    return provider.exclusive(async () => {
      const directory = await storageDirectory(
        this.options.root,
        "deployments",
        provider.environmentId,
      );
      const activeFile = path.join(directory, "active.json");
      const record = await readJson<DeploymentRecord>(activeFile);
      if (
        record.deploymentId !== deploymentId ||
        record.planId !== approval.planId ||
        record.state !== "recovery-required" ||
        record.backup?.id !== approval.restoreBackupId
      )
        throw new Error(
          "Recovery approval does not match the active failed deployment and backup.",
        );
      await provider.maintenance(true);
      await provider.verifyBackup(record.backup);
      await provider.restoreBackup(record.backup);
      if (!(await this.options.target.oldRuntimeCompatible()))
        throw new Error(
          "Restored database is not verified compatible with the old runtime.",
        );
      await this.options.target.rollbackPointer();
      await this.options.target.recoveryHealth!();
      await provider.maintenance(false);
      record.state = "failed";
      record.updatedAt = new Date().toISOString();
      await writeJson(activeFile, record);
      await writeJson(path.join(directory, `${deploymentId}.json`), record);
      await logOperation(this.options.root, {
        operation: "application.recover",
        status: "restored",
        applicationId: this.options.applicationId,
        environmentId: provider.environmentId,
        deploymentId,
        actorId: approval.actorId,
        backupId: record.backup.id,
        reason: approval.reason,
      });
      return record;
    });
  }
}
