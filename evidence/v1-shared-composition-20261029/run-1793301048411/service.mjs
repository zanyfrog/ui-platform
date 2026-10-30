var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/json-files.ts
import { atomicWriteText } from "@ui-platform/artifacts/storage";
var init_json_files = __esm({
  "src/server/json-files.ts"() {
    "use strict";
  }
});

// tests/shared-composition/boundaries.ts
import path from "node:path";
function appPath(key) {
  if (key !== "fixture") throw Error("Unadmitted test Application");
  return path.join(appsDir, key);
}
async function discoverComponents() {
  return [];
}
function moveToOsTrash() {
  throw Error("Deletion is outside this fixture");
}
var platformRoot, appsDir;
var init_boundaries = __esm({
  "tests/shared-composition/boundaries.ts"() {
    "use strict";
    platformRoot = process.env.SHARED_COMPOSITION_TEST_ROOT;
    appsDir = path.join(platformRoot, "apps");
  }
});

// src/server/visual-artifacts.ts
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, rename, realpath, rm } from "node:fs/promises";
import path2 from "node:path";
import { validatePageAnchorChange, componentReferences, generateForm, parseMetadata, validateArtifact } from "@ui-platform/visual-artifacts";
import { readRoleBundle, saveRoleBundle, recoverRoleBundleRoot } from "@ui-platform/artifacts/storage";
function pageEntry() {
  return `import source from './page.html?raw';
import css from './page.css?raw';
import metadata from './page.visual.json';
import * as functions from './page.functions';
import { components, packages } from 'virtual:uip-visual-artifacts';
import { createVisualPage } from '@ui-platform/visual-artifacts/runtime';
import type { ArtifactMetadata } from '@ui-platform/visual-artifacts';
export const route = metadata.route;
export const title = metadata.displayName;
import { createApplicationDataServices } from '@uib/platform-core/application-data';
export const { render } = createVisualPage({ source, css, metadata: metadata as ArtifactMetadata, functions }, { components, packages, services: createApplicationDataServices() });
`;
}
function toRuntime(bundle) {
  return bundle.metadata ? { metadata: bundle.metadata, source: bundle.files.source, css: bundle.files.css } : void 0;
}
async function visualWorkspace(appKey, packages, options = {}) {
  options = { ...options };
  const pageService = new VisualArtifactService(path2.join(appPath(appKey), "src", "pages"), "page");
  const componentService = new VisualArtifactService(platformComponentsRoot, "component");
  const reads = [pageService.list(options), componentService.list(options), new VisualArtifactService(path2.join(appPath(appKey), "shells"), "shell").list(options)];
  const [pages, components, shells] = await Promise.all(reads).catch(async (error) => {
    if (options.recovery === "refuse") await Promise.allSettled(reads);
    throw error;
  });
  const runtime = components.map(toRuntime).filter((item) => Boolean(item));
  for (const bundle of [...pages, ...components, ...shells]) if (bundle.metadata) {
    try {
      bundle.diagnostics.push(...validateArtifact(toRuntime(bundle), runtime, packages));
    } catch {
      bundle.diagnostics.push({ severity: "error", message: "Visual validation is unavailable until invalid metadata is repaired." });
    }
  }
  return { pages, components, shells, packages };
}
async function knownVisualArtifacts() {
  const all = await new VisualArtifactService(platformComponentsRoot, "component").list();
  all.push(...await new VisualArtifactService(path2.join(platformRoot, "references"), "page").list());
  for (const app of await readdir(appsDir, { withFileTypes: true }).catch(() => [])) if (app.isDirectory() && !app.isSymbolicLink()) {
    all.push(...await new VisualArtifactService(path2.join(appsDir, app.name, "src", "pages"), "page").list());
    all.push(...await new VisualArtifactService(path2.join(appsDir, app.name, "shells"), "shell").list());
  }
  return all;
}
var platformComponentsRoot, roles, hash, VisualArtifactService;
var init_visual_artifacts = __esm({
  "src/server/visual-artifacts.ts"() {
    "use strict";
    init_json_files();
    init_boundaries();
    init_boundaries();
    init_boundaries();
    platformComponentsRoot = path2.join(platformRoot, "components");
    roles = { source: ".html", css: ".css", metadata: ".visual.json", fixtures: ".fixtures.json", code: ".functions.ts" };
    hash = (files) => createHash("sha256").update(JSON.stringify(files)).digest("hex");
    VisualArtifactService = class {
      constructor(root, kind, faults = {}) {
        this.root = root;
        this.kind = kind;
        this.faults = faults;
      }
      root;
      kind;
      faults;
      async location(locator) {
        const file = await this.file(locator), stem = path2.basename(file, ".visual.json");
        return { root: this.root, directory: path2.dirname(file), anchor: path2.basename(file), paths: Object.values(roles).map((extension) => stem + extension) };
      }
      async file(locator, create = false) {
        if (!locator.endsWith(".visual.json") || locator.includes("\\") || locator.split("/").some((p) => !/^[a-zA-Z0-9_-]+(?:\.visual\.json)?$/.test(p))) throw new Error("Invalid Visual Artifact locator.");
        for (let ancestor = path2.resolve(this.root); ; ancestor = path2.dirname(ancestor)) {
          const info = await lstat(ancestor).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (info?.isSymbolicLink()) throw new Error("Visual Artifact roots cannot contain symlinks.");
          if (path2.dirname(ancestor) === ancestor) break;
        }
        if (create) await mkdir(this.root, { recursive: true });
        const resolvedRoot = await realpath(this.root);
        let current = resolvedRoot;
        for (const segment of locator.split("/")) {
          current = path2.join(current, segment);
          const info = await lstat(current).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (info?.isSymbolicLink()) throw new Error("Visual Artifact paths cannot contain symlinks.");
        }
        return realpath(current).catch((error) => {
          if (error.code === "ENOENT") return current;
          throw error;
        });
      }
      async list(options = {}) {
        options = { ...options };
        await recoverRoleBundleRoot(this.root, options);
        const locators = [];
        const walk = async (dir, prefix = "") => {
          for (const entry of await readdir(dir, { withFileTypes: true }).catch((error) => {
            if (error.code === "ENOENT") return [];
            throw error;
          })) {
            if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
            const relative = `${prefix}${entry.name}`;
            if (entry.isDirectory()) await walk(path2.join(dir, entry.name), `${relative}/`);
            else if (entry.name.endsWith(".visual.json")) locators.push(relative);
          }
        };
        await walk(this.root);
        const bundles = [];
        locators.sort();
        for (let offset = 0; offset < locators.length; offset += 4) {
          const reads = locators.slice(offset, offset + 4).map(async (locator) => {
            try {
              return await this.read(locator, options);
            } catch (error) {
              if (options.recovery === "refuse") throw error;
              return { locator, hash: "", files: { source: "", css: "", metadata: "", fixtures: "", code: "" }, diagnostics: [{ severity: "error", message: String(error) }] };
            }
          });
          bundles.push(...await Promise.all(reads).catch(async (error) => {
            if (options.recovery === "refuse") await Promise.allSettled(reads);
            throw error;
          }));
        }
        for (const key of ["artifactId", "componentId"]) {
          const ids = /* @__PURE__ */ new Set();
          for (const bundle of bundles) {
            const id = bundle.metadata?.[key];
            if (id && ids.has(id)) bundles.filter((b) => b.metadata?.[key] === id).forEach((b) => b.diagnostics.push({ severity: "error", message: `Duplicate permanent identity: ${id}.` }));
            if (id) ids.add(id);
          }
        }
        return bundles;
      }
      async read(locator, options = {}) {
        options = { ...options };
        const location = await this.location(locator), file = path2.join(location.directory, location.anchor);
        const stem = file.slice(0, -".visual.json".length);
        const files = {};
        const snapshot = await readRoleBundle(location, options);
        for (const [role, extension] of Object.entries(roles)) files[role] = snapshot.files[path2.basename(stem) + extension] ?? "";
        if (!files.metadata) throw new Error("Visual Artifact metadata is missing.");
        const parsed = parseMetadata(files.metadata);
        const diagnostics = [...parsed.diagnostics];
        if (parsed.metadata?.kind !== this.kind) diagnostics.push({ severity: "error", message: `Expected a ${this.kind} in this source location.` });
        if (!files.source) diagnostics.push({ severity: "error", message: "HTML source is missing or empty." });
        try {
          JSON.parse(files.fixtures || "{}");
        } catch {
          diagnostics.push({ severity: "error", message: "Preview fixtures are invalid JSON." });
        }
        return { locator, files, hash: hash(files), metadata: parsed.metadata, diagnostics };
      }
      async create(name, route, form, shellId, initialRegionId = "region-main", admit = async () => {
      }) {
        if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Use a lowercase name with letters, numbers, and hyphens.");
        const locator = `${name}/${this.kind}.visual.json`;
        const file = await this.file(locator, true);
        if (await lstat(path2.dirname(file)).then(() => true, (error) => {
          if (error.code === "ENOENT") return false;
          throw error;
        })) throw new Error("An artifact folder already exists.");
        const temporary = path2.join(this.root, `.creating-${randomUUID()}`);
        const metadata = { schemaVersion: 1, artifactId: `art_${randomUUID()}`, kind: this.kind, name, displayName: name.replaceAll("-", " "), ...this.kind === "component" ? { componentId: `cmp_platform_${randomUUID()}`, public: { properties: {}, events: {}, slots: [] } } : this.kind === "page" ? { route: route ?? `/${name}`, ...shellId ? { shellId, routeId: `route_${randomUUID()}` } : {} } : {} };
        const files = form ? generateForm(metadata, form.dataset) : { source: `<section class="uip-layout-item" data-uip-node="node_${randomUUID()}"></section>
`, css: "", metadata: JSON.stringify(metadata, null, 2) + "\n", fixtures: "{}\n", code: "export {};\n" };
        if (form?.authoring) {
          metadata.form.contractVersion = 1;
          files.metadata = JSON.stringify(metadata, null, 2) + "\n";
        }
        if (shellId || this.kind === "shell") files.source = initialRegionId ? `<main class="uip-layout-item" data-uip-node="node_${randomUUID()}" data-uip-region="${initialRegionId}" data-uip-region-name="Main Content"></main>
` : "<!-- No Page Region overrides; use Shell defaults. -->\n";
        if (shellId) files.source = "<!-- No Page Region overrides; add a Region to replace or explicitly empty its Shell default. -->\n";
        await mkdir(temporary);
        try {
          for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path2.join(temporary, `${this.kind}${extension}`), files[role]);
          if (this.kind === "page") await atomicWriteText(path2.join(temporary, "index.ts"), pageEntry());
          await admit();
          await rename(temporary, path2.dirname(file));
        } finally {
          await rm(temporary, { recursive: true, force: true });
        }
        return this.read(locator);
      }
      async save(locator, role, content, expectedHash, admit) {
        if (!Object.hasOwn(roles, role) || typeof content !== "string" || !expectedHash) throw new Error("File role, text, and expected hash are required.");
        const current = await this.read(locator);
        return this.saveCandidate(locator, { ...current.files, [role]: content }, expectedHash, { repair: true, admit });
      }
      /** Complete source candidate; normal callers must supply authority and graph validation. */
      async saveCandidate(locator, files, expectedHash, options) {
        const location = await this.location(locator), original = await readRoleBundle(location), stem = path2.basename(location.anchor, ".visual.json");
        const previousFiles = Object.fromEntries(Object.entries(roles).map(([role, extension]) => [role, original.files[stem + extension] ?? ""]));
        if (!expectedHash || hash(previousFiles) !== expectedHash) throw Object.assign(new Error("Visual Artifact changed on disk. Reload or recover your editor changes before saving."), { status: 409 });
        const staged = structuredClone(files);
        if (Object.keys(staged).length !== Object.keys(roles).length || Object.keys(roles).some((role) => typeof staged[role] !== "string")) throw new Error("A complete Visual role candidate is required.");
        if (!options.repair && (!options.validate || !options.admit)) throw new Error("Normal Visual saves require complete validation and original authority admission.");
        await saveRoleBundle(location, {
          expectedChecksum: original.checksum,
          files: Object.fromEntries(Object.entries(roles).map(([role, extension]) => [stem + extension, staged[role]])),
          validate: async () => {
            const previous = parseMetadata(previousFiles.metadata).metadata, incoming = parseMetadata(staged.metadata);
            if (incoming.metadata && previous && ["artifactId", "componentId", "kind", "routeId"].some((key) => previous[key] && incoming.metadata[key] !== previous[key])) throw new Error("Artifact, Route and Component identities and kind are immutable.");
            if (!options.repair) {
              if (this.kind === "page") validatePageAnchorChange(previousFiles.source, staged.source, incoming.metadata);
              const diagnostics = [...incoming.diagnostics];
              if (incoming.metadata?.kind !== this.kind) diagnostics.push({ severity: "error", message: "Visual kind does not match its owner collection." });
              try {
                JSON.parse(staged.fixtures || "{}");
              } catch {
                diagnostics.push({ severity: "error", message: "Preview fixtures are invalid JSON." });
              }
              if (!previous) diagnostics.push({ severity: "error", message: "Restore the authoritative identity through Advanced Repair before normal editing." });
              if (diagnostics.some((d) => d.severity === "error")) throw Object.assign(new Error(diagnostics.map((d) => d.message).join(" ")), { status: 422 });
              await options.validate({ locator, files: staged, metadata: incoming.metadata, diagnostics, hash: hash(staged) });
            }
          },
          admit: async () => {
            await options.admit?.();
          },
          ...this.faults
        });
        return { locator, files: staged, metadata: parseMetadata(staged.metadata).metadata, diagnostics: parseMetadata(staged.metadata).diagnostics, hash: hash(staged) };
      }
      async remove(locator, expectedHash, knownArtifacts, admit = async () => {
      }) {
        const current = await this.read(locator);
        if (!expectedHash || current.hash !== expectedHash) throw new Error("Artifact changed. Reload before deletion.");
        const id = current.metadata?.componentId;
        const users = id ? knownArtifacts.filter((b) => b !== current && (componentReferences(b.files.source).includes(id) || b.metadata?.dependencies?.includes(id))) : [];
        if (users.length) throw new Error(`Component is used by: ${users.map((b) => b.locator).join(", ")}.`);
        const file = await this.file(locator);
        if (path2.basename(file) !== `${this.kind}.visual.json`) throw new Error("Delete manually placed artifact files through source control.");
        await admit();
        if ((await this.read(locator)).hash !== expectedHash) throw Object.assign(new Error("Artifact changed during deletion admission."), { status: 409 });
        await moveToOsTrash(path2.dirname(file));
      }
    };
  }
});

// src/server/visual-candidate.ts
var visual_candidate_exports = {};
__export(visual_candidate_exports, {
  VisualCandidateError: () => VisualCandidateError,
  prepareVisualCandidate: () => prepareVisualCandidate,
  validateVisualRoleSyntax: () => validateVisualRoleSyntax
});
import path4 from "node:path";
import { readFile as readFile2, readdir as readdir2 } from "node:fs/promises";
import { transform } from "esbuild";
import { compileVisualFunctions } from "@ui-platform/artifacts";
import { assertPlainPageRoute, assertPageUnused, validatePageLinks, componentReferences as componentReferences2, parseMetadata as parseMetadata2, validateArtifact as validateArtifact2, validateCompositionDefinition } from "@ui-platform/visual-artifacts";
import { validateRuntimeFunctionSource } from "@ui-platform/visual-artifacts/vite";
import { pageAdmissionKind, validatePageMembership, capturePageRoutes } from "@ui-platform/visual-artifacts";
async function validateVisualRoleSyntax(files) {
  if (!files.source.trim()) throw new Error("HTML source is missing or empty. Keep an explicit empty Region or Shell-default comment where appropriate.");
  JSON.parse(files.fixtures || "{}");
  compileVisualFunctions(files.code);
  await validateRuntimeFunctionSource(files.code);
  const css = await transform(files.css, { loader: "css", logLevel: "silent" });
  if (css.warnings.length) throw new Error("CSS source is incomplete or invalid: " + css.warnings.map((warning) => warning.text).join(" "));
}
async function prepareVisualCandidate(appKey, kind, locator, packages, allowShellChange = false, validatedSyntax) {
  const root = appPath(appKey), workspace = await visualWorkspace(appKey, packages);
  const compositionFiles = /* @__PURE__ */ new Map();
  const read = async (relative) => {
    const text = await readFile2(path4.join(root, relative), "utf8");
    compositionFiles.set(relative, text);
    return text;
  };
  const settingsText = await read("app.settings.json");
  const settings = JSON.parse(settingsText).presentation;
  let definition;
  if (settings?.model === "composition-v1") {
    const menus = [];
    for (const name of await readdir2(path4.join(root, "menus")).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) if (name.endsWith(".json")) menus.push(JSON.parse(await read("menus/" + name)));
    const siteCss = (await Promise.all(settings.siteStyles.map((file) => read(file)))).join("\n");
    definition = { settings, menus, siteCss, pages: [], shells: [], routes: [] };
  }
  const old = (kind === "page" ? workspace.pages : kind === "shell" ? workspace.shells : workspace.components).find((bundle) => bundle.locator === locator);
  const known = kind === "component" ? await knownVisualArtifacts() : [];
  const records = [
    ...workspace.pages.map((bundle) => ({ bundle, service: new VisualArtifactService(path4.join(root, "src/pages"), "page"), kind: "page" })),
    ...workspace.shells.map((bundle) => ({ bundle, service: new VisualArtifactService(path4.join(root, "shells"), "shell"), kind: "shell" })),
    ...workspace.components.map((bundle) => ({ bundle, service: new VisualArtifactService(platformComponentsRoot, "component"), kind: "component" }))
  ];
  return {
    async validate(candidate) {
      try {
        if (JSON.stringify(candidate.files) !== validatedSyntax) await validateVisualRoleSyntax(candidate.files);
        if (!candidate.metadata || parseMetadata2(candidate.files.metadata).diagnostics.some((d) => d.severity === "error")) throw new Error("Correct the complete metadata candidate before saving.");
        const collection = kind === "page" ? workspace.pages : kind === "shell" ? workspace.shells : workspace.components;
        if (!old || collection.filter((bundle) => bundle.metadata?.artifactId === candidate.metadata.artifactId).length !== 1) throw new Error("The authoritative Visual identity is missing or ambiguous. Resolve the source conflict before normal editing.");
        if (kind === "page" && !allowShellChange && old?.metadata?.shellId !== candidate.metadata.shellId) throw new Error("Use Change Page Shell to map or discard unmatched Regions explicitly.");
        const replace = (items, target) => items.map((bundle) => kind === target && bundle.locator === locator ? candidate : bundle);
        if (kind === "page") {
          const pages = replace(workspace.pages, "page");
          if (definition) validatePageMembership(toRuntime(candidate));
          else if (pageAdmissionKind(candidate.metadata) === "composed") throw new Error("Composed Page requires Application composition admission.");
          if (old.metadata?.route !== candidate.metadata.route) {
            if (pageAdmissionKind(candidate.metadata) === "plain") assertPlainPageRoute(candidate.metadata.route, workspace.pages, locator);
            if (old.metadata?.route) assertPageUnused(old.metadata.route, [...pages, ...workspace.shells], "");
          } else if (workspace.pages.some((page) => page.locator !== locator && page.metadata?.route === candidate.metadata.route)) throw new Error("Duplicate saved Page route.");
          validatePageLinks(old.files.source, candidate.files.source, pages, { allowComposed: !!definition });
        }
        const components = replace(workspace.components, "component").map(toRuntime).filter((item) => !!item);
        const runtime = toRuntime(candidate);
        const errors = validateArtifact2(runtime, components, packages).filter((d) => d.severity === "error");
        if (errors.length) throw new Error(errors.map((error) => error.message).join(" "));
        if (definition) {
          const required = (items) => items.map((bundle) => {
            if (!bundle.metadata) throw new Error("Related source requires repair before this composition candidate can be validated.");
            return toRuntime(bundle);
          });
          const pages = required(replace(workspace.pages, "page")), shells = required(replace(workspace.shells, "shell"));
          try {
            validateCompositionDefinition({ ...definition, pages, shells, routes: capturePageRoutes(pages) }, components, packages);
          } catch {
            throw new Error("The complete candidate conflicts with Application composition. Check its Shell Regions, routes, Menus and related source. Local changes are retained.");
          }
        }
        if (kind === "component" && JSON.stringify(old?.metadata?.public) !== JSON.stringify(candidate.metadata.public)) {
          const affected = /* @__PURE__ */ new Set([candidate.metadata.componentId]);
          for (const id of affected) for (const bundle of known) if (bundle.metadata && bundle.metadata.artifactId !== candidate.metadata.artifactId && (componentReferences2(bundle.files.source).includes(id) || bundle.metadata.dependencies?.includes(id))) {
            if (validateArtifact2(toRuntime(bundle), components, packages).some((d) => d.severity === "error")) throw new Error("This change would invalidate a dependent artifact. Keep the Component interface compatible.");
            if (bundle.metadata.componentId) affected.add(bundle.metadata.componentId);
          }
        }
      } catch (error) {
        if (error instanceof VisualCandidateError) throw error;
        throw new VisualCandidateError(error instanceof Error ? error.message : String(error));
      }
    },
    async recheck() {
      for (const record of records) if (!(record.kind === kind && record.bundle.locator === locator)) {
        if ((await record.service.read(record.bundle.locator)).hash !== record.bundle.hash) throw Object.assign(new Error("A Visual dependency changed during candidate validation. Retry against current source."), { status: 409 });
      }
      for (const [file, text] of compositionFiles) if (await readFile2(path4.join(root, file), "utf8") !== text) throw Object.assign(new Error("Composition source changed during candidate validation."), { status: 409 });
    }
  };
}
var VisualCandidateError;
var init_visual_candidate = __esm({
  "src/server/visual-candidate.ts"() {
    "use strict";
    init_visual_artifacts();
    init_boundaries();
    VisualCandidateError = class extends Error {
      status = 422;
      code = "source.validation";
    };
  }
});

// tests/shared-composition/service.ts
init_visual_artifacts();
import fs from "node:fs/promises";
import path6 from "node:path";
import assert from "node:assert/strict";

// src/server/application-composition.ts
init_boundaries();
init_json_files();
init_visual_artifacts();
import { createHash as createHash2 } from "node:crypto";
import { lstat as lstat2, mkdir as mkdir2, readFile as readFile3, readdir as readdir3, writeFile, rename as rename2 } from "node:fs/promises";
import { randomUUID as randomUUID2 } from "node:crypto";
import path5 from "node:path";
import { regions, remapPageRegions, themeCss, validateMenu, parseSource, parseMetadata as parseMetadata3, validateArtifact as validateArtifact3, applyMenuOverrides, composeShellMenus, valueErrors, validateCompositionDefinition as validateCompositionDefinition2, primaryRouteSignature } from "@ui-platform/visual-artifacts";

// src/server/composition-lock.ts
init_boundaries();
import path3 from "node:path";
import { withRoleBundleGraph } from "@ui-platform/artifacts/storage";
import { AsyncLocalStorage } from "node:async_hooks";
var requestSignals = new AsyncLocalStorage();
async function withApplicationMutation(_root, work, options = {}) {
  return withRoleBundleGraph(path3.join(platformRoot, "components"), work, { signal: requestSignals.getStore(), ...options });
}

// src/server/application-composition.ts
init_boundaries();
import { transform as transform2 } from "esbuild";
import { pageAdmissionKind as pageAdmissionKind2, validatePageMembership as validatePageMembership2 } from "@ui-platform/visual-artifacts";
var hash2 = (text) => createHash2("sha256").update(text).digest("hex");
async function compositionSettings(appKey) {
  const settings = JSON.parse(await readFile3(path5.join(appPath(appKey), "app.settings.json"), "utf8"));
  return settings.presentation?.model === "composition-v1" ? settings.presentation : void 0;
}
async function compositionWorkspace(appKey, packages = [], candidate, options = {}) {
  options = { ...options };
  const settings = candidate?.path === "app.settings.json" ? JSON.parse(candidate.content).presentation : await compositionSettings(appKey);
  if (!settings || settings.model !== "composition-v1") return null;
  if (settings.assetsRoot !== "assets" || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) throw new Error("Composition requires branding, source styles and the Application assets root.");
  const app = appPath(appKey);
  const reads = [new VisualArtifactService(path5.join(app, "shells"), "shell").list(options), new VisualArtifactService(path5.join(app, "src/pages"), "page").list(options)];
  const [shells, pages] = await Promise.all(reads).catch(async (error) => {
    if (options.recovery === "refuse") await Promise.allSettled(reads);
    throw error;
  });
  const menus = [];
  const read = async (relative) => candidate?.path === relative ? candidate.content : (await readCompositionSource(appKey, relative)).content;
  const menuFiles = new Set(await readdir3(path5.join(app, "menus")).catch(() => []));
  if (candidate?.path.startsWith("menus/")) menuFiles.add(candidate.path.slice("menus/".length));
  for (const file of menuFiles) if (file.endsWith(".json")) {
    const content = await read(`menus/${file}`);
    const menu = JSON.parse(content);
    validateMenu(menu);
    menus.push({ ...menu, sourcePath: `menus/${file}` });
  }
  const valid = (items) => items.map((item) => {
    if (!item.metadata || item.diagnostics.some((d) => d.severity === "error")) throw new Error(`Repair ${item.locator}.`);
    return toRuntime(item);
  });
  const runtimePages = valid(pages), runtimeShells = valid(shells);
  const sharedComponents = await new VisualArtifactService(platformComponentsRoot, "component").list(options);
  const components = sharedComponents.map(toRuntime).filter((item) => Boolean(item));
  for (const artifact of [...runtimePages, ...runtimeShells]) {
    const errors = validateArtifact3(artifact, components, packages).filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length) throw new Error(`${artifact.metadata.displayName}: ${errors.map((error) => error.message).join(" ")}`);
    regions(artifact.source);
    if (artifact.metadata.kind === "page") validatePageMembership2(artifact);
  }
  if (!runtimeShells.some((shell) => shell.metadata.artifactId === settings.defaultShellId)) throw new Error("Application default Shell is missing.");
  const routeIds = /* @__PURE__ */ new Set(), paths = /* @__PURE__ */ new Set();
  const routes = runtimePages.map((page) => {
    const m = page.metadata;
    if (pageAdmissionKind2(m) === "composed" && (!m.routeId || !m.shellId || !runtimeShells.some((shell) => shell.metadata.artifactId === m.shellId))) throw new Error(`Page requires permanent Route and Shell identities: ${m.name}.`);
    const signature = primaryRouteSignature(m.route);
    if (m.routeId && routeIds.has(m.routeId) || paths.has(signature)) throw new Error("Each Page requires a unique primary Route.");
    if (m.routeId) routeIds.add(m.routeId);
    paths.add(signature);
    return { pageId: m.artifactId, routeId: m.routeId, path: m.route };
  });
  const menuIds = /* @__PURE__ */ new Set();
  for (const menu of menus) {
    if (menuIds.has(menu.menuId)) throw new Error("Duplicate Menu identity.");
    menuIds.add(menu.menuId);
  }
  themeCss(settings);
  const siteCss = (await Promise.all(settings.siteStyles.map(read))).join("\n");
  const definition = { settings, shells: runtimeShells, pages: runtimePages, routes, menus, siteCss };
  for (const page of runtimePages) {
    if (pageAdmissionKind2(page.metadata) === "plain") continue;
    const shell = runtimeShells.find((shell2) => shell2.metadata.artifactId === page.metadata.shellId);
    const available = new Set(regions(shell.source).map((region) => region.regionId));
    if (regions(page.source).some((region) => !available.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${page.metadata.displayName}.`);
    for (const menuId of Object.keys(page.metadata.menuOverrides ?? {})) if (!menus.some((menu) => menu.menuId === menuId)) throw new Error(`Page Menu override refers to a missing Menu: ${menuId}.`);
    for (const menu of menus) validateMenu(applyMenuOverrides(menu, page.metadata.menuOverrides));
    const params = Object.fromEntries([...page.metadata.route.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map((match) => [match[1] ?? match[2], "__parameter__"]));
    const renderedShell = composeShellMenus(shell, definition, page, page.metadata.routeId, params);
    const errors = validateArtifact3(renderedShell, components, packages).filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length) throw new Error(errors.map((error) => error.message).join(" "));
  }
  for (const [shellId, values] of Object.entries(settings.shellConfiguration ?? {})) {
    const shell = runtimeShells.find((shell2) => shell2.metadata.artifactId === shellId);
    if (!shell) throw new Error("Shell configuration target is missing.");
    for (const [name, value] of Object.entries(values)) {
      const contract = shell.metadata.public?.properties[name];
      if (!contract) throw new Error(`Unknown Shell property: ${name}.`);
      const errors = valueErrors(value, contract, name);
      if (errors.length) throw new Error(errors.join(" "));
    }
  }
  for (const value of [settings.branding.primaryLogo, settings.branding.secondaryLogo, settings.branding.favicon]) if (value) {
    if (!(await compositionAssetInfo(appKey, value)).hash) throw new Error(`Branding asset is missing: ${value}.`);
  }
  validateCompositionDefinition2(definition, components, packages);
  return definition;
}
async function compositionSourcePath(appKey, relative) {
  if (!/^(app\.settings\.json|menus\/[a-z0-9-]+\.json|styles\/[a-z0-9-]+\.css|assets\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:svg|png|jpg|jpeg|webp|ico|pdf|txt))$/.test(relative)) throw new Error("Unsupported composition source path.");
  let current = path5.resolve(appPath(appKey));
  for (let ancestor = current; ; ancestor = path5.dirname(ancestor)) {
    const info = await lstat2(ancestor).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition roots cannot contain symlinks.");
    if (path5.dirname(ancestor) === ancestor) break;
  }
  for (const segment of relative.split("/")) {
    current = path5.join(current, segment);
    const info = await lstat2(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition source paths cannot contain symlinks.");
  }
  return current;
}
async function compositionAssetInfo(appKey, relative) {
  if (!relative.startsWith("assets/")) throw new Error("Application asset path required.");
  const content = await readFile3(await compositionSourcePath(appKey, relative)).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return { path: relative, hash: content ? createHash2("sha256").update(content).digest("hex") : null };
}
async function readCompositionSource(appKey, relative) {
  const content = await readFile3(await compositionSourcePath(appKey, relative), "utf8");
  return { path: relative, content, hash: hash2(content) };
}
async function validateCompositionStyle(content) {
  const css = await transform2(content, { loader: "css", logLevel: "silent" });
  if (css.warnings.length) throw new Error(css.warnings.map((item) => item.text).join(" "));
}
async function saveCompositionSource(appKey, relative, content, expectedHash, admit = async () => {
}) {
  return locked(appKey, async () => {
    const file = await compositionSourcePath(appKey, relative);
    const current = await readFile3(file, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (current === null ? expectedHash !== null : !expectedHash || hash2(current) !== expectedHash) throw Object.assign(new Error("Composition source changed. Reload or recover before saving."), { status: 409 });
    try {
      if (relative.startsWith("menus/")) {
        const menu = JSON.parse(content);
        validateMenu(menu);
        if (current && JSON.parse(current).menuId !== menu.menuId) throw new Error("Menu identity is immutable.");
      }
      if (relative === "app.settings.json") {
        const value = JSON.parse(content), old = JSON.parse(current);
        if (JSON.stringify(value.application) !== JSON.stringify(old.application)) throw new Error("Edit application name/status through Application settings.");
        if (value.presentation?.model !== "composition-v1") throw new Error("Composition model cannot be removed.");
        themeCss(value.presentation);
        const shells = await new VisualArtifactService(path5.join(appPath(appKey), "shells"), "shell").list();
        if (!shells.some((shell) => shell.metadata?.artifactId === value.presentation.defaultShellId)) throw new Error("Default Shell is missing.");
        for (const style of value.presentation.siteStyles) await compositionSourcePath(appKey, style);
      }
      if (relative.startsWith("styles/")) {
        await validateCompositionStyle(content);
      }
      try {
        await compositionWorkspace(appKey, await discoverComponents(appKey, relative === "app.settings.json" ? { presentationModel: JSON.parse(content).presentation?.model } : void 0), { path: relative, content });
      } catch {
        throw new Error("The candidate conflicts with Application composition. Check related routes, Menus, Shells and styles before saving.");
      }
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { status: 422 });
    }
    await admit();
    if (await readFile3(file, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    }) !== current) throw Object.assign(new Error("Composition source changed during save admission."), { status: 409 });
    if (content !== current) await atomicWriteText(file, content);
    return { path: relative, content, hash: hash2(content) };
  });
}
async function enableApplicationComposition(appKey, shellId, expectedHash, admit) {
  const original = await readCompositionSource(appKey, "app.settings.json");
  if (original.hash !== expectedHash) throw Object.assign(new Error("Application settings changed. Reload before setup."), { status: 409 });
  const config = JSON.parse(original.content);
  if (config.presentation !== void 0) throw new Error("Application presentation is already configured. Use its existing composition controls.");
  const shells = await new VisualArtifactService(path5.join(appPath(appKey), "shells"), "shell").list({ recovery: "refuse" });
  if (shells.filter((shell) => shell.metadata?.artifactId === shellId && !shell.diagnostics.some((d) => d.severity === "error")).length !== 1) throw new Error("Select one valid saved Shell.");
  if (!config.application?.name) throw new Error("Application name is missing.");
  const presentation = { model: "composition-v1", branding: { applicationName: config.application.name }, assetsRoot: "assets", siteStyles: [], defaultShellId: shellId, theme: {} };
  const end = original.content.lastIndexOf("}");
  const content = original.content.slice(0, end).trimEnd() + ',\n  "presentation": ' + JSON.stringify(presentation, null, 2).replaceAll("\n", "\n  ") + "\n" + original.content.slice(end);
  return saveCompositionSource(appKey, "app.settings.json", content, expectedHash, admit);
}
async function changePageShell(appKey, locator, shellId, decisions, expectedHash, admit = async () => {
}) {
  return locked(appKey, async () => {
    const pages = new VisualArtifactService(path5.join(appPath(appKey), "src/pages"), "page");
    const page = await pages.read(locator);
    if (page.hash !== expectedHash) throw new Error("Page changed. Reload before changing Shell.");
    const shell = (await new VisualArtifactService(path5.join(appPath(appKey), "shells"), "shell").list()).find((shell2) => shell2.metadata?.artifactId === shellId);
    if (!shell) throw new Error("Selected Shell is missing.");
    if (!await compositionSettings(appKey)) throw new Error("Enable Application composition before adopting a Page.");
    const plain = pageAdmissionKind2(page.metadata) === "plain";
    if (plain && regions(page.files.source).length) throw new Error("Plain Page already contains Regions; repair its membership explicitly.");
    if (plain && !regions(shell.files.source).some((region) => region.regionId === "region-main")) throw new Error("Plain Page adoption requires the selected Shell main Region.");
    const source = plain ? `<main data-uip-node="node_${randomUUID2()}" data-uip-region="region-main" data-uip-region-name="Main Content">
${page.files.source}</main>
` : remapPageRegions(page.files.source, shell.files.source, decisions);
    const metadata = structuredClone(page.metadata);
    metadata.shellId = shellId;
    if (plain) metadata.routeId = `route_${randomUUID2()}`;
    const retainedIds = new Set(parseSource(source).nodes.map((node) => node.id));
    for (const key of ["bindings", "conditions", "repeaters", "events"]) metadata[key] = metadata[key]?.filter((item) => retainedIds.has(item.node));
    if (metadata.layout) metadata.layout = Object.fromEntries(Object.entries(metadata.layout).filter(([id]) => retainedIds.has(id)));
    if (metadata.modes) for (const [mode, overrides] of Object.entries(metadata.modes.overrides)) metadata.modes.overrides[mode] = Object.fromEntries(Object.entries(overrides).filter(([id]) => retainedIds.has(id)));
    const { prepareVisualCandidate: prepareVisualCandidate2 } = await Promise.resolve().then(() => (init_visual_candidate(), visual_candidate_exports));
    const validation = await prepareVisualCandidate2(appKey, "page", locator, await discoverComponents(appKey), true);
    return pages.saveCandidate(locator, { ...page.files, source, metadata: JSON.stringify(metadata, null, 2) + "\n" }, expectedHash, { validate: (candidate) => validation.validate(candidate), admit: async () => {
      await validation.recheck();
      await admit();
    } });
  });
}
async function locked(key, work) {
  return withApplicationMutation(appPath(key), work);
}

// tests/shared-composition/service.ts
init_boundaries();
async function verify() {
  const app = appPath("fixture");
  for (const dir of ["components", "apps/fixture/src/pages", "apps/fixture/shells"]) await fs.mkdir(path6.join(platformRoot, dir), { recursive: true });
  const original = '{\n  "application": {"name":"Fixture","status":"active"},\n  "retained": {"value":42}\n}\n';
  await fs.writeFile(path6.join(app, "app.settings.json"), original);
  const shells = new VisualArtifactService(path6.join(app, "shells"), "shell");
  const pages = new VisualArtifactService(path6.join(app, "src/pages"), "page");
  let admissions = 0;
  const admit = async () => {
    admissions++;
  };
  const shell = await shells.create("shared", void 0, void 0, void 0, "region-main", admit);
  const originals = [];
  for (const name of ["home", "about", "contact", "unrelated"]) originals.push(await pages.create(name, "/" + name, void 0, void 0, "region-main", admit));
  const before = await readCompositionSource("fixture", "app.settings.json");
  await assert.rejects(enableApplicationComposition("fixture", "art_missing", before.hash, admit), /valid saved Shell/);
  await assert.rejects(enableApplicationComposition("fixture", shell.metadata.artifactId, "stale", admit), /changed/);
  await assert.rejects(enableApplicationComposition("fixture", shell.metadata.artifactId, before.hash, async () => {
    throw Error("AUTHORITY_DENIED");
  }), /AUTHORITY_DENIED/);
  assert.equal(await fs.readFile(path6.join(app, "app.settings.json"), "utf8"), original);
  await enableApplicationComposition("fixture", shell.metadata.artifactId, before.hash, admit);
  const after = JSON.parse(await fs.readFile(path6.join(app, "app.settings.json"), "utf8"));
  assert.deepEqual(after.application, JSON.parse(original).application);
  assert.deepEqual(after.retained, { value: 42 });
  assert.deepEqual(Object.keys(after.presentation).sort(), ["model", "branding", "assetsRoot", "siteStyles", "defaultShellId", "theme"].sort());
  assert.equal(after.presentation.defaultShellId, shell.metadata.artifactId);
  await assert.rejects(enableApplicationComposition("fixture", shell.metadata.artifactId, before.hash, admit), /changed/);
  for (const page of originals.slice(0, 3)) {
    await assert.rejects(changePageShell("fixture", page.locator, shell.metadata.artifactId, {}, "stale", admit), /changed/);
    await assert.rejects(changePageShell("fixture", page.locator, shell.metadata.artifactId, {}, page.hash, async () => {
      throw Error("AUTHORITY_DENIED");
    }), /AUTHORITY_DENIED/);
    assert.equal((await pages.read(page.locator)).hash, page.hash);
    const next = await changePageShell("fixture", page.locator, shell.metadata.artifactId, {}, page.hash, admit);
    assert.equal(next.metadata.artifactId, page.metadata.artifactId);
    assert.match(next.metadata.routeId, /^route_/);
    assert.ok(next.files.source.includes(page.files.source), "original HTML bytes retained");
    const metadata = structuredClone(next.metadata);
    delete metadata.routeId;
    delete metadata.shellId;
    assert.deepEqual(metadata, page.metadata);
    for (const role of ["css", "fixtures", "code"]) assert.equal(next.files[role], page.files[role]);
    const again = await changePageShell("fixture", page.locator, shell.metadata.artifactId, {}, next.hash, admit);
    assert.equal(again.metadata.routeId, next.metadata.routeId);
  }
  assert.equal((await pages.read(originals[3].locator)).hash, originals[3].hash);
  const graph = await compositionWorkspace("fixture", [], void 0, { recovery: "refuse" });
  assert.equal(graph.pages.length, 4);
  assert.equal(graph.pages.filter((p) => p.metadata.shellId).length, 3);
  return { passed: true, realRoleService: true, realApplicationMutation: true, authorityRefusal: true, staleRefusal: true, unrelatedPageUnchanged: true, admissions };
}
export {
  verify
};
