import { beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const exec = promisify(execFile);
const root = path.resolve("packages/artifacts");
beforeAll(async () => {
  await exec(
    process.execPath,
    [
      path.resolve("node_modules/typescript/bin/tsc"),
      "-p",
      path.join(root, "tsconfig.build.json"),
    ],
    { timeout: 20000 },
  );
}, 30000);

describe("built package contract for Generic Artifact Editor consumers", () => {
  it("loads the actual public package exports in Node and shares browser value validators", async () => {
    const code = `
      const server = await import('@ui-platform/artifacts');
      const browser = await import('@ui-platform/artifacts/validation');
      const storage = await import('@ui-platform/artifacts/storage');
      console.log(JSON.stringify({
        server: ['FileSystemArtifactService', 'ArtifactDefinitionRegistry', 'ArtifactConflictError', 'ArtifactValidationError', 'validationResult', 'validateReferences'].every(key => typeof server[key] === 'function'),
        sameValidator: server.validateValue === browser.validateValue,
        browserExports: Object.keys(browser).sort(),
        invalid: browser.validateValue('', [{validator:'required'}]),
        atomicWrite: typeof storage.atomicWriteText
      }));`;
    const result = JSON.parse(
      (
        await exec(process.execPath, ["--input-type=module", "-e", code], {
          cwd: root,
          timeout: 10000,
        })
      ).stdout,
    );
    expect(result.server).toBe(true);
    expect(result.sameValidator).toBe(true);
    expect(result.browserExports).toEqual([
      "ValidatorRegistry",
      "maxLengthValidator",
      "requiredValidator",
      "validateValue",
    ]);
    expect(result.invalid[0].code).toBe("value.required");
    expect(result.atomicWrite).toBe("function");
  });
  it("type-checks editor operations through published TypeScript entry points", () => {
    const file = path.join(root, "tests", "__editor-consumer__.mts");
    const source = `
import { FileSystemArtifactService, ArtifactDefinitionRegistry, ArtifactConflictError, ArtifactValidationError } from '@ui-platform/artifacts';
import type { ArtifactService, ArtifactServiceOptions, EditableArtifact, ArtifactDefinition, ArtifactChanges, ArtifactSaveResult, ArtifactValidationResult, ArtifactWatchEvent, ArtifactWatcher } from '@ui-platform/artifacts';
import { validateValue } from '@ui-platform/artifacts/validation';
import type { ValidationDiagnostic, ValidatorConfiguration } from '@ui-platform/artifacts/validation';
const definitions = new ArtifactDefinitionRegistry();
const options: ArtifactServiceOptions = { root: '.', definitions };
const service: ArtifactService = new FileSystemArtifactService(options);
async function edit(id: string) {
  const artifact: EditableArtifact = await service.load(id);
  const definition: ArtifactDefinition | null = artifact.definition;
  const changes: ArtifactChanges = { expectedChecksum: artifact.checksum, files: { 'form.json': '{}' } };
  const saved: ArtifactSaveResult = await service.save(id, changes);
  const validation: ArtifactValidationResult = saved.validation;
  const watcher: ArtifactWatcher = await service.startWatching({ onChange: (event: ArtifactWatchEvent) => { const current: EditableArtifact | undefined = event.artifact; } });
  await watcher.close();
  return { definition, validation, references: await service.getReferences(id) };
}
const config: ValidatorConfiguration[] = [{ validator: 'required' }];
const diagnostics: ValidationDiagnostic[] = validateValue('', config);
function failed(error: unknown) {
  if (error instanceof ArtifactValidationError) return error.validation.diagnostics;
  if (error instanceof ArtifactConflictError) return 'reload';
}`;
    const options: ts.CompilerOptions = {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: ["node"],
      typeRoots: [path.resolve("node_modules/@types")],
      esModuleInterop: true,
    };
    const host = ts.createCompilerHost(options),
      getSourceFile = host.getSourceFile;
    host.getSourceFile = (name, version, onError, create) =>
      path.resolve(name) === file
        ? ts.createSourceFile(file, source, version, true)
        : getSourceFile(name, version, onError, create);
    expect(
      ts
        .getPreEmitDiagnostics(ts.createProgram([file], options, host))
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")),
    ).toEqual([]);
  });
  it("keeps the browser validation runtime free of imports of Node or artifact persistence", async () => {
    const manifest = JSON.parse(
      await readFile(path.join(root, "package.json"), "utf8"),
    );
    const runtime = await readFile(
      path.join(root, manifest.exports["./validation"].import),
      "utf8",
    );
    const syntax = ts.createSourceFile(
      "validation.js",
      runtime,
      ts.ScriptTarget.Latest,
      true,
    );
    expect(syntax.statements.filter(ts.isImportDeclaration)).toEqual([]);
  });
});
