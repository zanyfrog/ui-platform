import { atomicWriteText } from "../file-operations.js";
import { createHash } from "node:crypto";
import { readFile, readdir, lstat, appendFile } from "node:fs/promises";
import path from "node:path";
import { storageDirectory } from "../storage.js";

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export const fingerprint = (value: unknown): string =>
  `sha256:${createHash("sha256").update(canonical(value)).digest("hex")}`;
export function identifier(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,199}$/.test(value))
    throw new Error("Invalid application/environment/build identifier.");
  return value;
}
export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8"));
}
export async function writeJson(file: string, value: unknown): Promise<void> {
  await atomicWriteText(file, JSON.stringify(value, null, 2) + "\n");
}
export async function filesUnder(
  root: string,
  ignored = new Set<string>(),
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  async function visit(directory: string) {
    for (const entry of (
      await readdir(directory, { withFileTypes: true })
    ).sort((a, b) => a.name.localeCompare(b.name))) {
      if (ignored.has(entry.name)) continue;
      const file = path.join(directory, entry.name);
      if ((await lstat(file)).isSymbolicLink())
        throw new Error(
          `Symbolic link requires an explicit input adapter: ${file}`,
        );
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile())
        files[path.relative(root, file).split(path.sep).join("/")] = createHash(
          "sha256",
        )
          .update(await readFile(file))
          .digest("hex");
    }
  }
  await visit(root);
  return files;
}
export interface OperationEvent {
  operation: string;
  status: string;
  applicationId: string;
  environmentId?: string;
  artifactId?: string;
  buildId?: string;
  deploymentId?: string;
  migrationId?: string;
  actorId?: string;
  backupId?: string;
  diagnosticCodes?: string[];
  reason?: string;
}
export async function logOperation(
  root: string,
  event: OperationEvent,
): Promise<void> {
  const directory = await storageDirectory(root, "logs");
  await appendFile(
    path.join(directory, "operations.jsonl"),
    JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + "\n",
  );
}
