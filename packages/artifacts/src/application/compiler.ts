import ts from "typescript";
import type { EditableArtifact } from "../types.js";

/** Include this value in BuildOptions.inputs when using the foundation compiler. */
export const foundationCompilerVersion = `foundation-runtime-1/typescript-${ts.version}`;
/** Initial foundation types only. App page/module bundlers supply their own compile hook. */
export async function compileFoundationArtifact(
  artifact: EditableArtifact,
): Promise<Record<string, string>> {
  if (!artifact.validation.valid || !artifact.manifest)
    throw new Error("Artifact failed shared validation.");
  const { artifactType, artifactId, config } = artifact.manifest;
  if (["route", "routeGroup"].includes(artifactType))
    return {
      "registration.json": JSON.stringify({ artifactId, artifactType, config }),
    };
  if (["form", "dataset", "migration"].includes(artifactType)) {
    const file = artifact.files.find((f) => f.role === "definition");
    if (!file) throw new Error("Missing runtime definition.");
    return { "definition.json": JSON.stringify(JSON.parse(file.content)) };
  }
  if (artifactType === "trigger") {
    const file = artifact.files.find((f) => f.role === "source");
    if (!file) throw new Error("Missing trigger source.");
    const source = ts.createSourceFile(
      file.path,
      file.content,
      ts.ScriptTarget.Latest,
      true,
    );
    let imports = false;
    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        (ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) &&
              node.expression.text === "require")))
      )
        imports = true;
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (imports)
      throw new Error(
        "Imported trigger code requires the application's dependency-aware bundler.",
      );
    const result = ts.transpileModule(file.content, {
      fileName: file.path,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        sourceMap: false,
      },
    });
    if (
      result.diagnostics?.some(
        (d) => d.category === ts.DiagnosticCategory.Error,
      )
    )
      throw new Error("Trigger compilation failed.");
    return {
      "trigger.js": result.outputText,
      "registration.json": JSON.stringify({ artifactId, config }),
    };
  }
  throw new Error(`No runtime compiler configured for ${artifactType}.`);
}
