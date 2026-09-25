import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ApplicationBuildEngine } from "./build.js";
import type { MigrationEngine } from "./migrations.js";
import type { DeploymentService } from "./deployment.js";

export interface ApplicationTooling {
  build: ApplicationBuildEngine;
  migrations?: MigrationEngine;
  deployment?: DeploymentService;
}
export interface ApplicationCliOptions {
  cwd?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  tooling?: ApplicationTooling;
}
/** Adapter modules are explicitly selected trusted local developer code, never supplied by an HTTP client. */
export async function runApplicationCli(
  args: string[],
  options: ApplicationCliOptions = {},
): Promise<number> {
  const out = options.stdout ?? ((text) => process.stdout.write(text));
  const err = options.stderr ?? ((text) => process.stderr.write(text));
  const values = new Map<string, string>(),
    flags = new Set<string>(),
    positional: string[] = [];
  try {
    for (let index = 0; index < args.length; index++) {
      const arg = args[index];
      if (["--json", "--force", "--confirm-destructive"].includes(arg))
        flags.add(arg);
      else if (
        [
          "--root",
          "--tooling",
          "--mode",
          "--env",
          "--actor",
          "--reason",
          "--custom-handler",
          "--custom-description",
          "--target",
        ].includes(arg)
      ) {
        const value = args[++index];
        if (!value || value.startsWith("--"))
          throw new Error(`Missing value for ${arg}.`);
        values.set(arg, value);
      } else if (arg.startsWith("--"))
        throw new Error(`Unsupported option: ${arg}`);
      else positional.push(arg);
    }
    const [namespace, command, target, ...extra] = positional;
    if (!target || extra.length)
      throw new Error(
        "Usage: uib app <validate|build|watch|preflight|deploy> <app-or-plan> --tooling <local-module> | uib migration <preview|confirm|apply|status> <dataset-or-migration> --tooling <local-module>",
      );
    let tooling = options.tooling;
    if (!tooling) {
      const file = values.get("--tooling");
      if (!file)
        throw new Error(
          "An explicit trusted --tooling module is required to connect application registrations, compiler, and environment providers.",
        );
      const module = await import(
        pathToFileURL(path.resolve(options.cwd ?? process.cwd(), file)).href
      );
      tooling = await module.createTooling({
        root: path.resolve(
          options.cwd ?? process.cwd(),
          values.get("--root") ?? ".",
        ),
        applicationId:
          namespace === "app" && !["deploy", "preflight"].includes(command)
            ? target
            : undefined,
        environmentId: values.get("--env") ?? values.get("--target"),
      });
    }
    if (!tooling) throw new Error("Tooling factory returned no services.");
    const environment = values.get("--env") ?? values.get("--target");
    if (
      environment &&
      tooling.migrations?.options.provider.environmentId !== environment
    )
      throw new Error(
        "Tooling environment differs from the requested environment.",
      );
    const output = (value: unknown) =>
      out(JSON.stringify(value, null, 2) + "\n");
    const approval = {
      actorId: values.get("--actor") ?? "",
      destructive: flags.has("--confirm-destructive"),
      reason: values.get("--reason"),
    };
    if (namespace === "app") {
      if (
        ["validate", "build", "watch"].includes(command) &&
        tooling.build.options.applicationId !== target
      )
        throw new Error(
          "Tooling application does not match requested application.",
        );
      if (command === "validate") {
        const report = await tooling.build.validateApplication();
        output(report);
        return report.valid ? 0 : 1;
      }
      if (command === "build") {
        const mode = values.get("--mode") ?? "development";
        if (mode === "production") {
          output(await tooling.build.buildProduction());
          return 0;
        }
        if (mode !== "development")
          throw new Error("Build mode must be development or production.");
        const report = await tooling.build.buildDevelopment();
        output(report);
        return report.valid ? 0 : 1;
      }
      if (command === "watch") {
        const watcher = await tooling.build.startWatching(output, (error) =>
          err(error.message + "\n"),
        );
        try {
          await new Promise<void>((resolve) => {
            const stop = () => {
              process.off("SIGINT", stop);
              process.off("SIGTERM", stop);
              resolve();
            };
            process.once("SIGINT", stop);
            process.once("SIGTERM", stop);
          });
        } finally {
          await watcher.close();
        }
        return 0;
      }
      if (!tooling.deployment)
        throw new Error("Deployment target is not configured.");
      if (command === "preflight") {
        output(
          await tooling.deployment.preflight(
            path.resolve(options.cwd ?? process.cwd(), target),
          ),
        );
        return 0;
      }
      if (command === "deploy") {
        const record = await tooling.deployment.deploy(target, {
          ...approval,
          planId: target,
          force: flags.has("--force"),
        });
        output(record);
        return record.state === "succeeded" ? 0 : 1;
      }
    }
    if (namespace === "migration") {
      const migrations = tooling.migrations;
      if (!migrations) throw new Error("Migration provider is not configured.");
      if (command === "preview") {
        output(await migrations.preview(target));
        return 0;
      }
      if (command === "confirm") {
        output(
          await migrations.confirm(
            target,
            approval,
            values.has("--custom-handler")
              ? {
                  handlerId: values.get("--custom-handler")!,
                  description: values.get("--custom-description") ?? "",
                }
              : undefined,
          ),
        );
        return 0;
      }
      if (command === "apply") {
        await migrations.apply(target, approval);
        output({ migrationId: target, status: "applied" });
        return 0;
      }
      if (command === "status") {
        output(await migrations.pendingForEnvironment());
        return 0;
      }
    }
    throw new Error("Unsupported application or migration command.");
  } catch (error) {
    err((error instanceof Error ? error.message : String(error)) + "\n");
    return 2;
  }
}
