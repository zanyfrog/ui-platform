import path from "node:path";
import ts from "typescript";
import { error, isObject } from "./bundle.js";
import type {
  ArtifactCapabilities,
  ArtifactDefinition,
  ArtifactManifest,
  ArtifactValidationContext,
  ValidationDiagnostic,
  ValidatorConfiguration,
} from "./types.js";

export const capabilities: ArtifactCapabilities = {
  edit: true,
  format: true,
  publish: true,
  history: true,
};
const referenceName = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const datasetDiagnostics = (
  manifest: ArtifactManifest,
  required: boolean,
): ValidationDiagnostic[] => {
  const dataset = manifest.config?.dataset;
  return dataset === undefined && !required
    ? []
    : typeof dataset === "string" && referenceName.test(dataset)
      ? []
      : [
          error(
            "dataset.reference",
            "dataset must be an explicit, nonempty reference.",
            "artifact.json",
          ),
        ];
};
export const formDefinition: ArtifactDefinition = {
  artifactType: "form",
  currentDefinitionVersion: 1,
  fileRoles: { definition: { required: true, extensions: [".json"] } },
  capabilities,
  validators: [
    (context) => {
      const diagnostics = datasetDiagnostics(context.manifest, false);
      const file = context.files.find((file) => file.role === "definition");
      if (!file) return diagnostics;
      let data: unknown;
      try {
        data = JSON.parse(file.content);
      } catch {
        return [
          ...diagnostics,
          error("form.syntax", "Form definition is not valid JSON.", file.path),
        ];
      }
      if (!isObject(data) || !Array.isArray(data.fields))
        return [
          ...diagnostics,
          error("form.fields", "Form must contain a fields array.", file.path),
        ];
      const names = new Set<string>();
      const ids = new Set<string>();
      data.fields.forEach((field: unknown, index: number) => {
        const add = (code: string, message: string) =>
          diagnostics.push({
            ...error(code, message, file.path),
            path: `fields[${index}]`,
          });
        if (
          !isObject(field) ||
          typeof field.field !== "string" ||
          !referenceName.test(field.field) ||
          typeof field.type !== "string" ||
          !field.type.trim() ||
          (field.label !== undefined && typeof field.label !== "string")
        ) {
          add(
            "form.field",
            "Fields require valid field and type strings, and an optional string label.",
          );
          return;
        }
        if (names.has(field.field))
          add("form.duplicate-field", `Duplicate field: ${field.field}`);
        names.add(field.field);
        if (field.id !== undefined) {
          if (typeof field.id !== "string" || !field.id.trim())
            add("form.field-id", "Field id must be a nonempty string.");
          else {
            if (ids.has(field.id))
              add("form.duplicate-id", `Duplicate field id: ${field.id}`);
            ids.add(field.id);
          }
        }
        if (field.validators === undefined) return;
        if (!Array.isArray(field.validators)) {
          add("validator.configuration", "validators must be an array.");
          return;
        }
        for (const config of field.validators) {
          if (
            !isObject(config) ||
            typeof config.validator !== "string" ||
            (config.message !== undefined && typeof config.message !== "string")
          ) {
            add(
              "validator.configuration",
              "Each validator requires a name and optional string message.",
            );
            continue;
          }
          const validator = context.validators.get(config.validator);
          if (!validator)
            add("validator.unknown", `Unknown validator: ${config.validator}`);
          else {
            const message = validator.validateConfiguration(
              config as ValidatorConfiguration,
            );
            if (message) add("validator.configuration", message);
          }
        }
      });
      return diagnostics;
    },
  ],
  extractReferences: ({ manifest }) =>
    typeof manifest.config?.dataset === "string"
      ? [
          {
            artifactId: manifest.config.dataset,
            expectedType: "dataset",
            field: "config.dataset",
          },
        ]
      : [],
};

export function resolvedRoute(
  bundle: string,
  manifest: ArtifactManifest,
  routes: NonNullable<ArtifactValidationContext["routes"]>,
  seen = new Set<string>(),
): string | undefined {
  const routePath = manifest.config?.path;
  if (
    typeof routePath !== "string" ||
    !routePath ||
    /[\s?#\\]/.test(routePath) ||
    routePath.includes("//") ||
    routePath.split("/").some((part) => part === "." || part === "..")
  )
    return undefined;
  if (routePath.startsWith("/")) return routePath.replace(/\/$/, "") || "/";
  if (seen.has(bundle)) return undefined;
  seen.add(bundle);
  // Parent identity comes from its manifest; nesting supplies only the relationship.
  const parent = routes
    .filter(
      (route) =>
        route.manifest.artifactType === "routeGroup" &&
        bundle.startsWith(route.bundlePath + path.sep),
    )
    .sort((a, b) => b.bundlePath.length - a.bundlePath.length)[0];
  if (!parent) return undefined;
  const prefix = resolvedRoute(
    parent.bundlePath,
    parent.manifest,
    routes,
    seen,
  );
  return prefix === undefined
    ? undefined
    : `${prefix === "/" ? "" : prefix}/${routePath.replace(/\/$/, "")}`;
}
function routeDefinition(
  artifactType: "route" | "routeGroup",
): ArtifactDefinition {
  return {
    artifactType,
    currentDefinitionVersion: 1,
    fileRoles: {},
    capabilities,
    validators: [
      (context) => {
        const routes = context.routes ?? [
          { bundlePath: context.bundlePath, manifest: context.manifest },
        ];
        const route = resolvedRoute(
          context.bundlePath,
          context.manifest,
          routes,
        );
        const diagnostics: ValidationDiagnostic[] = [];
        if (!route)
          diagnostics.push(
            error(
              "route.path",
              "Route path is invalid or its parent routeGroup cannot be resolved.",
              "artifact.json",
            ),
          );
        else if (
          routes.some(
            (other) =>
              other.bundlePath !== context.bundlePath &&
              resolvedRoute(other.bundlePath, other.manifest, routes) === route,
          )
        )
          diagnostics.push(
            error(
              "route.duplicate",
              `Duplicate resolved route: ${route}`,
              "artifact.json",
            ),
          );
        const page = context.manifest.config?.page;
        if (
          artifactType === "route" &&
          (typeof page !== "string" || !referenceName.test(page))
        )
          diagnostics.push(
            error(
              "route.page",
              "A route requires a valid Page reference.",
              "artifact.json",
            ),
          );
        return diagnostics;
      },
    ],
    extractReferences: ({ manifest }) =>
      typeof manifest.config?.page === "string"
        ? [
            {
              artifactId: manifest.config.page,
              expectedType: "page",
              field: "config.page",
            },
          ]
        : [],
  };
}
export const routeArtifactDefinition = routeDefinition("route");
export const routeGroupDefinition = routeDefinition("routeGroup");

export const triggerLifecycleExports = [
  "beforeInsert",
  "afterInsert",
  "beforeUpdate",
  "afterUpdate",
  "beforeDelete",
  "afterDelete",
] as const;
export const triggerDefinition: ArtifactDefinition = {
  artifactType: "trigger",
  currentDefinitionVersion: 1,
  fileRoles: { source: { required: true, extensions: [".ts"] } },
  capabilities,
  validators: [
    ({ manifest, files, bundlePath }) => {
      const diagnostics = datasetDiagnostics(manifest, true);
      const config = manifest.config ?? {};
      if (typeof config.active !== "boolean")
        diagnostics.push(
          error("trigger.active", "active must be Boolean.", "artifact.json"),
        );
      if (
        config.priority !== undefined &&
        (typeof config.priority !== "number" ||
          !Number.isFinite(config.priority))
      )
        diagnostics.push(
          error(
            "trigger.priority",
            "priority must be a finite number.",
            "artifact.json",
          ),
        );
      const parent = path.basename(path.dirname(bundlePath));
      if (typeof config.dataset === "string" && parent !== config.dataset)
        diagnostics.push({
          severity: "warning",
          code: "trigger.dataset-folder",
          message: `Folder ${parent} differs from declared dataset ${config.dataset}.`,
          file: "artifact.json",
        });
      const file = files.find((file) => file.role === "source");
      if (!file) return diagnostics;
      const source = ts.createSourceFile(
        file.path,
        file.content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const syntax =
        ts.transpileModule(file.content, {
          fileName: file.path,
          reportDiagnostics: true,
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        }).diagnostics ?? [];
      for (const diagnostic of syntax) {
        const location =
          diagnostic.start === undefined
            ? undefined
            : source.getLineAndCharacterOfPosition(diagnostic.start);
        diagnostics.push({
          ...error(
            "trigger.syntax",
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
            file.path,
          ),
          line: location ? location.line + 1 : undefined,
          column: location ? location.character + 1 : undefined,
        });
      }
      let hooks = 0;
      const check = (
        name: string,
        node: ts.FunctionLikeDeclaration | undefined,
      ) => {
        if (!(triggerLifecycleExports as readonly string[]).includes(name)) {
          diagnostics.push(
            error(
              "trigger.export",
              `Unsupported lifecycle export: ${name}`,
              file.path,
            ),
          );
          return;
        }
        hooks++;
        const parameter = node?.parameters[0];
        const type = parameter?.type;
        const array =
          type &&
          (ts.isArrayTypeNode(type) ||
            (ts.isTypeReferenceNode(type) &&
              ["Array", "ReadonlyArray"].includes(
                type.typeName.getText(source),
              ) &&
              type.typeArguments?.length === 1) ||
            (ts.isTypeOperatorNode(type) && ts.isArrayTypeNode(type.type)));
        if (
          !node?.body ||
          !parameter ||
          parameter.dotDotDotToken ||
          parameter.questionToken ||
          parameter.initializer ||
          !array ||
          node.parameters.length > 2
        )
          diagnostics.push(
            error(
              "trigger.signature",
              `${name} must be a function with a typed records array first parameter and optional context second parameter.`,
              file.path,
            ),
          );
      };
      for (const statement of source.statements) {
        if (
          ts.isExportDeclaration(statement) ||
          ts.isExportAssignment(statement)
        ) {
          diagnostics.push(
            error(
              "trigger.export",
              "Use direct named lifecycle function exports.",
              file.path,
            ),
          );
          continue;
        }
        if (
          !ts.canHaveModifiers(statement) ||
          !ts
            .getModifiers(statement)
            ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
        )
          continue;
        if (
          ts
            .getModifiers(statement)
            ?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
        ) {
          diagnostics.push(
            error(
              "trigger.export",
              "Lifecycle functions must be named exports, not default exports.",
              file.path,
            ),
          );
          continue;
        }
        if (
          ts.isInterfaceDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement)
        )
          continue;
        if (ts.isFunctionDeclaration(statement))
          check(statement.name?.text ?? "default", statement);
        else if (ts.isVariableStatement(statement))
          for (const declaration of statement.declarationList.declarations)
            check(
              declaration.name.getText(source),
              declaration.initializer &&
                (ts.isArrowFunction(declaration.initializer) ||
                  ts.isFunctionExpression(declaration.initializer))
                ? declaration.initializer
                : undefined,
            );
        else
          diagnostics.push(
            error(
              "trigger.export",
              "Only lifecycle functions and types may be exported.",
              file.path,
            ),
          );
      }
      if (!hooks)
        diagnostics.push(
          error(
            "trigger.lifecycle",
            "At least one supported lifecycle export is required.",
            file.path,
          ),
        );
      return diagnostics;
    },
  ],
  extractReferences: ({ manifest }) =>
    typeof manifest.config?.dataset === "string"
      ? [
          {
            artifactId: manifest.config.dataset,
            expectedType: "dataset",
            field: "config.dataset",
          },
        ]
      : [],
};
/** Creation helper: folder names never supply identity or dataset. */
export function createTriggerManifest(
  input: Omit<
    ArtifactManifest,
    "artifactType" | "schemaVersion" | "definitionVersion"
  >,
): ArtifactManifest {
  return {
    ...input,
    artifactType: "trigger",
    schemaVersion: 1,
    definitionVersion: 1,
    config: { priority: 200, active: true, ...input.config },
  };
}
export class ArtifactDefinitionRegistry {
  private readonly entries = new Map<string, ArtifactDefinition>();
  constructor(builtins = true) {
    if (builtins)
      for (const definition of [
        formDefinition,
        routeArtifactDefinition,
        routeGroupDefinition,
        triggerDefinition,
      ])
        this.register(definition);
  }
  register(definition: ArtifactDefinition): void {
    if (this.has(definition.artifactType))
      throw new Error(
        `Definition already registered: ${definition.artifactType}`,
      );
    this.entries.set(definition.artifactType, definition);
  }
  get(artifactType: string): ArtifactDefinition | undefined {
    return this.entries.get(artifactType);
  }
  has(artifactType: string): boolean {
    return this.entries.has(artifactType);
  }
  list(): ArtifactDefinition[] {
    return [...this.entries.values()];
  }
}
