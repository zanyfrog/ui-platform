import path from "node:path";
import * as prettier from "prettier";
import { error, type Snapshot } from "./bundle.js";
import type {
  ArtifactDefinition,
  ArtifactManifest,
  ValidationDiagnostic,
} from "./types.js";

export async function formatArtifact(
  bundle: string,
  snapshot: Snapshot,
  manifest: ArtifactManifest | null,
  definition?: ArtifactDefinition | null,
): Promise<ValidationDiagnostic[]> {
  const diagnostics: ValidationDiagnostic[] = [];
  for (const [name, content] of Object.entries(snapshot)) {
    if (content === null) continue;
    const absolutePath = path.join(bundle, name);
    try {
      const role = Object.entries(manifest?.files ?? {}).find(
        ([, file]) => file === name,
      )?.[0];
      if (definition?.formatter && role)
        snapshot[name] = await definition.formatter({
          role,
          path: name,
          absolutePath,
          content,
        });
      else if (
        [".json", ".ts", ".tsx", ".css", ".md", ".markdown"].includes(
          path.extname(name).toLowerCase(),
        )
      )
        snapshot[name] = await prettier.format(content, {
          ...(await prettier.resolveConfig(absolutePath)),
          filepath: absolutePath,
        });
    } catch (e) {
      diagnostics.push(
        error(
          "format.failed",
          `Cannot format ${name}: ${e instanceof Error ? e.message : String(e)}`,
          name,
        ),
      );
    }
  }
  return diagnostics;
}
