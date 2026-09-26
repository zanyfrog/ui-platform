import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import {
  schemaErrors,
  type DatasetSchema,
} from "../src/application/migration-definition.js";

const upstreamRoot = path.resolve(
  process.env.UI_DATA_SERVICES_ROOT ?? "../UI Platform Data Services",
);
const sourcePath = path.join(
  upstreamRoot,
  "packages/schema-manager/src/index.ts",
);
const source = ts.createSourceFile(
  sourcePath,
  await readFile(sourcePath, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
const contract = source.statements.find(
  (node): node is ts.InterfaceDeclaration =>
    ts.isInterfaceDeclaration(node) && node.name.text === "DatasetSchema",
);
const adapter = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((node) => [...node.declarationList.declarations])
  .find((node) => node.name.getText(source) === "adapter")?.initializer;
if (!contract || !adapter)
  throw new Error(
    "Upstream schema contract/validator moved; review compatibility rather than skipping this check.",
  );
// Evaluate only the actual pure adapter expression. Do not import the upstream publication/ORM runtime.
const context = {
  exports: {} as {
    default?: {
      validateDraft: (
        schema: unknown,
        ref: { key: string },
      ) => Promise<{ valid: boolean; errors: string[] }>;
    };
  },
};
runInNewContext(
  ts.transpileModule(`export default ${adapter.getText(source)};`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  context,
);
const upstream = context.exports.default!;
const baseline: DatasetSchema = {
  definitionType: "dataset-schema",
  definitionFormatVersion: 1,
  dataset: {
    id: "customer",
    key: "customer",
    name: "Customer",
    pluralName: "Customers",
  },
  fields: [{ id: "id-field", key: "id", type: "string", required: true }],
};

describe("authoritative Data Services schema compatibility", () => {
  it("type-checks exact structural equivalence against the current upstream declaration", () => {
    const file = path.resolve(
      "packages/artifacts/tests/__upstream-contract__.mts",
    );
    const text = `${contract!.getText(source).replace("interface DatasetSchema", "interface UpstreamDatasetSchema")}
import type { DatasetSchema as Local } from '../src/application/migration-definition.js';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type ContractMatches = Assert<Equal<Local, UpstreamDatasetSchema>>;`;
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
        ? ts.createSourceFile(file, text, version, true)
        : getSourceFile(name, version, onError, create);
    const diagnostics = ts.getPreEmitDiagnostics(
      ts.createProgram([file], options, host),
    );
    expect(
      diagnostics.map((d) =>
        ts.flattenDiagnosticMessageText(d.messageText, "\n"),
      ),
    ).toEqual([]);
  });
  it("agrees on supported schemas, identities, required keys, and duplicate fields", async () => {
    const cases: unknown[] = [
      baseline,
      {
        ...baseline,
        fields: [
          ...baseline.fields,
          { id: "name", key: "name", type: "string", default: "Guest" },
        ],
      },
      { ...baseline, dataset: { ...baseline.dataset, id: "" } },
      { ...baseline, fields: [...baseline.fields, ...baseline.fields] },
      { ...baseline, fields: [{ ...baseline.fields[0], required: false }] },
      { ...baseline, definitionFormatVersion: 2 },
    ];
    for (const candidate of cases)
      expect(schemaErrors(candidate).length === 0).toBe(
        (await upstream.validateDraft(candidate, { key: "customer" })).valid,
      );
  });
  it("makes stricter local field-type validation and upstream reference context explicit", async () => {
    const missingType = {
      ...baseline,
      fields: [{ id: "id-field", key: "id", required: true }],
    };
    expect(
      (await upstream.validateDraft(missingType, { key: "customer" })).valid,
    ).toBe(true);
    expect(schemaErrors(missingType).length).toBeGreaterThan(0);
    expect(
      (await upstream.validateDraft(baseline, { key: "different-dataset" }))
        .valid,
    ).toBe(false);
    expect(schemaErrors(baseline)).toEqual([]); // Artifact identity is checked by datasetDefinition, not an upstream registry ref.
  });
});
