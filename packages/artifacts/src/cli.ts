#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { realpathSync } from "node:fs";
import { stat } from "node:fs/promises";
import { FileSystemArtifactService } from "./artifact-service.js";
import type { ArtifactService, ArtifactValidationResult } from "./types.js";

export async function runArtifactCli(
  args: string[],
  options: {
    cwd?: string;
    service?: ArtifactService;
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
  } = {},
): Promise<number> {
  const stdout = options.stdout ?? ((text) => process.stdout.write(text));
  const stderr = options.stderr ?? ((text) => process.stderr.write(text));
  const json = args.includes("--json");
  const rootIndex = args.indexOf("--root");
  const root = path.resolve(
    options.cwd ?? process.cwd(),
    rootIndex < 0 ? "." : (args[rootIndex + 1] ?? "."),
  );
  const positional = args.filter(
    (arg, index) =>
      arg !== "--json" &&
      (rootIndex < 0 || (index !== rootIndex && index !== rootIndex + 1)),
  );
  const [namespace, command, target, ...extra] = positional;
  const usage =
    "Usage: uib artifact <discover|inspect|validate|save|history|publish> <artifact-or-path> [--root <workspace>] [--json]";
  if (namespace !== "artifact" || !command || !target || extra.length) {
    stderr(usage + "\n");
    return 2;
  }
  const service = options.service ?? new FileSystemArtifactService({ root });
  const output = (value: unknown) =>
    stdout(json ? JSON.stringify(value, null, 2) + "\n" : render(value));
  try {
    switch (command) {
      case "discover":
        output(await service.discover(target));
        return 0;
      case "inspect":
        output(await service.load(target));
        return 0;
      case "validate": {
        let directory = false;
        try {
          directory =
            (await stat(path.resolve(root, target))).isDirectory() &&
            !(await stat(
              path.join(path.resolve(root, target), "artifact.json"),
            ).catch(() => undefined));
        } catch {
          /* IDs resolve through service. */
        }
        if (directory) {
          const summaries = await service.discover(target);
          const results = summaries.map((summary) => ({
            bundlePath: summary.bundlePath,
            artifactId: summary.artifactId,
            ...summary.validation,
          }));
          output(results);
          return results.some((result) => !result.valid) ? 1 : 0;
        }
        const result = await service.validate(target);
        output(result);
        return result.valid ? 0 : 1;
      }
      case "save": {
        const result = await service.saveDraft(target, {});
        output(result);
        return result.saved ? 0 : 1;
      }
      case "history":
        output(await service.getHistory(target));
        return 0;
      case "publish": {
        const result = await service.publish(target);
        output(result);
        return result.published ? 0 : 1;
      }
      default:
        stderr(usage + "\n");
        return 2;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (json) stdout(JSON.stringify({ error: message }) + "\n");
    else stderr(message + "\n");
    return 2;
  }
}
function render(value: unknown): string {
  if (Array.isArray(value))
    return value.length
      ? value.map(render).join("")
      : "No artifacts or history entries found.\n";
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if ("valid" in item && Array.isArray(item.diagnostics)) {
      const result = item as unknown as ArtifactValidationResult;
      return (
        `${item.bundlePath ? `${item.bundlePath}: ` : ""}${result.valid ? "PASSED" : "FAILED"}\n` +
        result.diagnostics
          .map(
            (d) =>
              `  ${d.severity} ${d.code}${d.file ? ` (${d.file})` : ""}: ${d.message}\n`,
          )
          .join("")
      );
    }
  }
  return JSON.stringify(value, null, 2) + "\n";
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
)
  process.exitCode = await runArtifactCli(process.argv.slice(2));
