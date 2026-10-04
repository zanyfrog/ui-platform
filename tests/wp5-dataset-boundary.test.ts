import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("WP5 ordinary UI application boundary", () => {
  it("keeps direct ORM access outside the application source package", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies: Record<string, string> };
    expect(manifest.dependencies).not.toHaveProperty("@ui-platform/orm");
    for (const path of [...sourceFiles("src"), ...sourceFiles("packages/platform-core/src")]) {
      const source = readFileSync(path, "utf8");
      expect(source, `${path} must use DOE for ordinary Dataset operations`).not.toMatch(/(?:from\s*["']|import\s*\(\s*["'])@ui-platform\/orm(?:\/[^"']*)?["']/);
    }
  });
});
