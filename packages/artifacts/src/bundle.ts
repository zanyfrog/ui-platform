import { readdir, readFile, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ArtifactManifest, ValidationDiagnostic } from "./types.js";

export type Snapshot = Record<string, string | null>;
export const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export const error = (
  code: string,
  message: string,
  file?: string,
): ValidationDiagnostic => ({ severity: "error", code, message, file });
export function validRelativePath(name: string): boolean {
  return (
    !!name &&
    !name.includes("\\") &&
    !name.includes(":") &&
    !path.posix.isAbsolute(name) &&
    name
      .split("/")
      .every(
        (part) =>
          !!part &&
          part !== "." &&
          part !== ".." &&
          !part.endsWith(".") &&
          !part.endsWith(" ") &&
          !/[<>"|?*\x00-\x1f]/.test(part) &&
          !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      ) &&
    !name
      .split("/")
      .some((part) => [".uib", ".git"].includes(part.toLowerCase()))
  );
}
export async function safeFile(bundle: string, name: string): Promise<string> {
  if (!validRelativePath(name))
    throw new Error(`Unsafe artifact path: ${name}`);
  const root = await realpath(bundle);
  const parts = name.split("/");
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new Error(`Symbolic links are not supported: ${name}`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (
      current !== path.join(root, ...parts) &&
      (await readOptional(path.join(current, "artifact.json"))) !== null
    )
      throw new Error(`File belongs to a nested artifact bundle: ${name}`);
  }
  return current;
}
export async function readOptional(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export function parseManifest(content: string | null): {
  manifest: ArtifactManifest | null;
  diagnostics: ValidationDiagnostic[];
} {
  if (content === null)
    return {
      manifest: null,
      diagnostics: [
        error("manifest.missing", "artifact.json is missing.", "artifact.json"),
      ],
    };
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return {
      manifest: null,
      diagnostics: [
        error(
          "manifest.syntax",
          "artifact.json is not valid JSON.",
          "artifact.json",
        ),
      ],
    };
  }
  const diagnostics: ValidationDiagnostic[] = [];
  const issue = (field: string, message: string) =>
    diagnostics.push({
      ...error("manifest.structure", message, "artifact.json"),
      field,
    });
  if (!isObject(data))
    return {
      manifest: null,
      diagnostics: [
        error(
          "manifest.structure",
          "Manifest must be an object.",
          "artifact.json",
        ),
      ],
    };
  for (const field of ["artifactId", "artifactType", "name"])
    if (typeof data[field] !== "string" || !(data[field] as string).trim())
      issue(field, `${field} must be a nonempty string.`);
  if (data.schemaVersion !== 1)
    issue("schemaVersion", "Only schemaVersion 1 is supported.");
  if (
    !Number.isInteger(data.definitionVersion) ||
    Number(data.definitionVersion) < 1
  )
    issue("definitionVersion", "definitionVersion must be a positive integer.");
  for (const field of ["label", "description"])
    if (data[field] !== undefined && typeof data[field] !== "string")
      issue(field, `${field} must be a string.`);
  if (data.config !== undefined && !isObject(data.config))
    issue("config", "config must be an object.");
  if (!isObject(data.files))
    issue("files", "files must map roles to relative file paths.");
  else {
    const seen = new Set<string>();
    for (const [role, name] of Object.entries(data.files)) {
      if (
        !role ||
        typeof name !== "string" ||
        !validRelativePath(name) ||
        name.toLowerCase() === "artifact.json"
      )
        issue(
          `files.${role}`,
          "File roles require safe relative paths other than artifact.json.",
        );
      else if (seen.has(name.toLowerCase()))
        issue(`files.${role}`, "File paths must be unique.");
      else seen.add(name.toLowerCase());
    }
  }
  const allowed = new Set([
    "schemaVersion",
    "artifactId",
    "artifactType",
    "name",
    "label",
    "description",
    "definitionVersion",
    "files",
    "config",
  ]);
  for (const key of Object.keys(data))
    if (!allowed.has(key))
      issue(
        key,
        `Unknown manifest property: ${key}. Derived state does not belong in artifact.json.`,
      );
  return {
    manifest: diagnostics.length ? null : (data as unknown as ArtifactManifest),
    diagnostics,
  };
}
/** Extract safe declared paths even when another manifest property is invalid. */
export function declaredPaths(content: string | null): string[] {
  try {
    const value: unknown = JSON.parse(content ?? "null");
    return isObject(value) && isObject(value.files)
      ? Object.values(value.files).filter(
          (v): v is string =>
            typeof v === "string" &&
            validRelativePath(v) &&
            v.toLowerCase() !== "artifact.json",
        )
      : [];
  } catch {
    return [];
  }
}
export async function capture(
  bundle: string,
  extra: string[] = [],
): Promise<Snapshot> {
  const manifest = await readOptional(await safeFile(bundle, "artifact.json"));
  const snapshot: Snapshot = Object.create(null);
  snapshot["artifact.json"] = manifest;
  for (const name of new Set([...declaredPaths(manifest), ...extra]))
    snapshot[name] = await readOptional(await safeFile(bundle, name));
  return snapshot;
}
export function checksum(snapshot: Snapshot): string {
  return createHash("sha256")
    .update(
      JSON.stringify(
        Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)),
      ),
    )
    .digest("hex");
}
export async function discoverBundles(root: string): Promise<string[]> {
  const bundles: string[] = [];
  async function visit(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true }).catch(
      (cause: NodeJS.ErrnoException) => {
        if (cause.code === "ENOENT") return [];
        throw cause;
      },
    );
    if (
      entries.some((entry) => entry.name === "artifact.json" && entry.isFile())
    )
      bundles.push(dir);
    for (const entry of entries)
      if (
        entry.isDirectory() &&
        ![
          ".uib",
          ".git",
          "node_modules",
          "dist",
          "dist-server",
          ".vite",
        ].includes(entry.name.toLowerCase())
      )
        await visit(path.join(dir, entry.name));
  }
  await visit(await realpath(root));
  return bundles.sort();
}
