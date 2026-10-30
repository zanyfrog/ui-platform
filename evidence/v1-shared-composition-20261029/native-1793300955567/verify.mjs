var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// tests/shared-composition/native-boundaries.ts
import path from "node:path";
function appPath(key) {
  if (key !== "fixture") throw Error("Unadmitted fixture Application");
  return path.join(appsDir, key);
}
function moveToOsTrash() {
  throw Error("Unadmitted deletion");
}
var platformRoot, appsDir, uiBasePackagesDir, runtimeDir, templatesDir;
var init_native_boundaries = __esm({
  "tests/shared-composition/native-boundaries.ts"() {
    "use strict";
    platformRoot = process.env.NATIVE_COMPOSITION_TEST_ROOT;
    appsDir = path.join(platformRoot, "apps");
    uiBasePackagesDir = path.join(platformRoot, "unused-ui-base");
    runtimeDir = path.join(platformRoot, "runtime");
    templatesDir = path.join(platformRoot, "templates");
  }
});

// src/server/json-files.ts
import { readFile } from "node:fs/promises";
import { atomicWriteText } from "@ui-platform/artifacts/storage";
async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
async function atomicWriteJson(file, value) {
  const serialized = JSON.stringify(value, null, 2) + "\n";
  JSON.parse(serialized);
  await atomicWriteText(file, serialized);
}
var init_json_files = __esm({
  "src/server/json-files.ts"() {
    "use strict";
  }
});

// src/server/visual-artifacts.ts
import { createHash, randomUUID } from "node:crypto";
import { lstat as lstat2, mkdir as mkdir2, readdir as readdir2, rename, realpath as realpath2, rm } from "node:fs/promises";
import path7 from "node:path";
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
var platformComponentsRoot, roles, hash, VisualArtifactService;
var init_visual_artifacts = __esm({
  "src/server/visual-artifacts.ts"() {
    "use strict";
    init_json_files();
    init_native_boundaries();
    init_native_boundaries();
    init_native_boundaries();
    platformComponentsRoot = path7.join(platformRoot, "components");
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
        const file = await this.file(locator), stem = path7.basename(file, ".visual.json");
        return { root: this.root, directory: path7.dirname(file), anchor: path7.basename(file), paths: Object.values(roles).map((extension) => stem + extension) };
      }
      async file(locator, create = false) {
        if (!locator.endsWith(".visual.json") || locator.includes("\\") || locator.split("/").some((p) => !/^[a-zA-Z0-9_-]+(?:\.visual\.json)?$/.test(p))) throw new Error("Invalid Visual Artifact locator.");
        for (let ancestor = path7.resolve(this.root); ; ancestor = path7.dirname(ancestor)) {
          const info = await lstat2(ancestor).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (info?.isSymbolicLink()) throw new Error("Visual Artifact roots cannot contain symlinks.");
          if (path7.dirname(ancestor) === ancestor) break;
        }
        if (create) await mkdir2(this.root, { recursive: true });
        const resolvedRoot = await realpath2(this.root);
        let current = resolvedRoot;
        for (const segment of locator.split("/")) {
          current = path7.join(current, segment);
          const info = await lstat2(current).catch((error) => {
            if (error.code === "ENOENT") return null;
            throw error;
          });
          if (info?.isSymbolicLink()) throw new Error("Visual Artifact paths cannot contain symlinks.");
        }
        return realpath2(current).catch((error) => {
          if (error.code === "ENOENT") return current;
          throw error;
        });
      }
      async list(options = {}) {
        options = { ...options };
        await recoverRoleBundleRoot(this.root, options);
        const locators = [];
        const walk = async (dir, prefix = "") => {
          for (const entry of await readdir2(dir, { withFileTypes: true }).catch((error) => {
            if (error.code === "ENOENT") return [];
            throw error;
          })) {
            if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
            const relative = `${prefix}${entry.name}`;
            if (entry.isDirectory()) await walk(path7.join(dir, entry.name), `${relative}/`);
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
        const location = await this.location(locator), file = path7.join(location.directory, location.anchor);
        const stem = file.slice(0, -".visual.json".length);
        const files = {};
        const snapshot = await readRoleBundle(location, options);
        for (const [role, extension] of Object.entries(roles)) files[role] = snapshot.files[path7.basename(stem) + extension] ?? "";
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
        if (await lstat2(path7.dirname(file)).then(() => true, (error) => {
          if (error.code === "ENOENT") return false;
          throw error;
        })) throw new Error("An artifact folder already exists.");
        const temporary = path7.join(this.root, `.creating-${randomUUID()}`);
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
        await mkdir2(temporary);
        try {
          for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path7.join(temporary, `${this.kind}${extension}`), files[role]);
          if (this.kind === "page") await atomicWriteText(path7.join(temporary, "index.ts"), pageEntry());
          await admit();
          await rename(temporary, path7.dirname(file));
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
        const location = await this.location(locator), original = await readRoleBundle(location), stem = path7.basename(location.anchor, ".visual.json");
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
        if (path7.basename(file) !== `${this.kind}.visual.json`) throw new Error("Delete manually placed artifact files through source control.");
        await admit();
        if ((await this.read(locator)).hash !== expectedHash) throw Object.assign(new Error("Artifact changed during deletion admission."), { status: 409 });
        await moveToOsTrash(path7.dirname(file));
      }
    };
  }
});

// tests/shared-composition/native.ts
import fs from "node:fs/promises";
import path9 from "node:path";
import assert from "node:assert/strict";

// src/server/packages.ts
import {
  discoverPackageManifests,
  isVersionCompatible as isVersionCompatible2,
  refreshPackageCatalog
} from "@uib/platform-core";

// src/server/app-manifests.ts
init_native_boundaries();
init_json_files();
import path2 from "node:path";
var APP_MANIFEST_FILE = "app.manifest.json";
var APP_MANIFEST_VERSION = "1.0.0";
var keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
var supportedVersionRangePattern = /^(?:\^\d+\.\d+\.\d+|\d+\.\d+\.\d+)$/;
function safeAppKey(key) {
  if (!keyPattern.test(key)) throw new Error("Folder / URL Name must contain lowercase letters, numbers, and single hyphens only.");
  return key;
}
function appManifestPathFor(keyInput) {
  return path2.join(appsDir, safeAppKey(keyInput), APP_MANIFEST_FILE);
}
async function ensureAppManifest(keyInput) {
  const key = safeAppKey(keyInput);
  const appDir = path2.join(appsDir, key);
  const manifestPath = path2.join(appDir, APP_MANIFEST_FILE);
  try {
    return normalizeAppManifest(await readJson(manifestPath));
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }
  const legacy = await readJson(path2.join(appDir, "ui.app.json")).catch(() => ({}));
  const created = createInitialAppManifest({
    appId: typeof legacy.appId === "string" ? legacy.appId : "",
    template: typeof legacy.template === "string" ? legacy.template : "unknown",
    templateVersion: typeof legacy.templateVersion === "string" ? legacy.templateVersion : "unknown",
    createdAt: typeof legacy.createdAt === "string" ? legacy.createdAt : void 0
  });
  await atomicWriteJson(manifestPath, created);
  return created;
}
async function setAppPackageDeclaration(keyInput, packageName, declaration) {
  assertPackageName(packageName);
  const manifest = await ensureAppManifest(keyInput);
  const next = {
    ...manifest,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    packages: {
      ...manifest.packages,
      [packageName]: normalizePackageDeclaration(declaration)
    }
  };
  await atomicWriteJson(appManifestPathFor(keyInput), next);
  return next;
}
function createInitialAppManifest(input) {
  return {
    manifestVersion: APP_MANIFEST_VERSION,
    appId: input.appId,
    template: input.template,
    templateVersion: input.templateVersion,
    createdAt: input.createdAt,
    packages: normalizePackages(input.packages ?? {}),
    foundationImports: {}
  };
}
function normalizeAppManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${APP_MANIFEST_FILE} must be a JSON object.`);
  }
  const manifest = value;
  return {
    manifestVersion: APP_MANIFEST_VERSION,
    appId: stringOrEmpty(manifest.appId),
    template: stringOrDefault(manifest.template, "unknown"),
    templateVersion: stringOrDefault(manifest.templateVersion, "unknown"),
    ...typeof manifest.templateAppliedVersion === "string" ? { templateAppliedVersion: manifest.templateAppliedVersion } : {},
    ...typeof manifest.templateProvenance === "string" ? { templateProvenance: manifest.templateProvenance } : {},
    createdAt: typeof manifest.createdAt === "string" ? manifest.createdAt : void 0,
    updatedAt: typeof manifest.updatedAt === "string" ? manifest.updatedAt : void 0,
    packages: normalizePackages(manifest.packages),
    foundationImports: normalizeFoundationImports(manifest.foundationImports)
  };
}
function normalizeFoundationImports(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([sourceId, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const value2 = raw;
    if (typeof value2.repository !== "string" || typeof value2.commit !== "string") return [];
    return [[sourceId, {
      sourceId,
      repository: value2.repository,
      commit: value2.commit,
      selectedPackages: stringArray(value2.selectedPackages),
      resolvedPackages: stringArray(value2.resolvedPackages),
      addedAt: typeof value2.addedAt === "string" ? value2.addedAt : "",
      updatedAt: typeof value2.updatedAt === "string" ? value2.updatedAt : ""
    }]];
  }));
}
function stringArray(value) {
  return Array.isArray(value) ? uniqueNames(value.filter((item) => typeof item === "string")) : [];
}
function uniqueNames(names) {
  return [...new Set(names)].sort();
}
function normalizePackages(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([packageName]) => packageNamePattern.test(packageName)).map(([packageName, declaration]) => [packageName, normalizePackageDeclaration(declaration)])
  );
}
function normalizePackageDeclaration(value) {
  const declaration = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const version = typeof declaration.version === "string" && supportedVersionRangePattern.test(declaration.version) ? declaration.version : void 0;
  const resolution = normalizeResolution(declaration.resolution);
  return {
    enabled: declaration.enabled === true,
    version,
    resolution,
    addedAt: typeof declaration.addedAt === "string" ? declaration.addedAt : void 0,
    updatedAt: typeof declaration.updatedAt === "string" ? declaration.updatedAt : void 0
  };
}
function normalizeResolution(value) {
  return value === "app-only" || value === "platform-first" || value === "platform-only" ? value : "app-first";
}
function assertPackageName(packageName) {
  if (!packageNamePattern.test(packageName)) throw new Error(`Invalid package name: ${packageName}`);
}
function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}
function stringOrDefault(value, fallback) {
  return typeof value === "string" && value.trim() ? value : fallback;
}
function isMissingFileError(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

// src/server/history.ts
import { appendFile, mkdir } from "node:fs/promises";
import path3 from "node:path";
async function appendHistory(appDir, event) {
  const historyDir = path3.join(appDir, "history");
  await mkdir(historyDir, { recursive: true });
  await appendFile(
    path3.join(historyDir, "app-history.jsonl"),
    JSON.stringify({ time: (/* @__PURE__ */ new Date()).toISOString(), ...event }) + "\n",
    "utf8"
  );
}

// src/server/packages.ts
init_native_boundaries();
init_native_boundaries();

// src/server/native-ui-base.ts
import { lstat, readFile as readFile2, realpath } from "node:fs/promises";
import path4 from "node:path";
import { isVersionCompatible } from "@uib/platform-core";
var nativeUiBaseName = "@ui-base/ui";
var admitted = [
  { tag: "uib-card", id: "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1", module: "./src/layout/uib-card.js" },
  { tag: "uib-panel", id: "@ui-base/ui:uib-panel", module: "./src/layout/uib-panel.js" }
];
async function nativeUiBaseEntry(platform, declaration) {
  const root = path4.join(platform, "node_modules", nativeUiBaseName);
  const physical = async (file) => {
    if ((await lstat(file)).isSymbolicLink() || (await realpath(file)).toLowerCase() !== path4.resolve(file).toLowerCase()) throw new Error("Native UI Base inputs must use physical installed paths.");
  };
  try {
    await physical(root);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const packageFile = path4.join(root, "package.json"), manifestPath = path4.join(root, "ui.component.json");
  await physical(packageFile);
  await physical(manifestPath);
  const metadata = JSON.parse(await readFile2(packageFile, "utf8"));
  if (metadata.name !== nativeUiBaseName || typeof metadata.version !== "string") throw new Error("Installed native UI Base package identity is invalid.");
  const manifest = JSON.parse(await readFile2(manifestPath, "utf8"));
  const components = [];
  for (const expected of admitted) {
    const matches = manifest.components?.filter((c) => c.tagName === expected.tag) ?? [];
    if (matches.length !== 1) throw new Error("Native Card/Panel contract is missing or ambiguous.");
    const entry = matches[0];
    if ((entry.identity?.componentId ?? entry.id ?? `${nativeUiBaseName}:${entry.tagName}`) !== expected.id || entry.module !== expected.module) throw new Error("Native Card/Panel identity or module differs from its admitted contract.");
    await physical(path4.resolve(root, expected.module));
    components.push(entry);
  }
  const compatible = !!declaration?.version && isVersionCompatible(metadata.version, declaration.version);
  const selected = declaration?.resolution === "platform-only";
  const enabled = declaration?.enabled === true;
  const valid = !enabled || selected && compatible;
  return {
    name: nativeUiBaseName,
    displayName: "UI Base \u2014 Card and Panel",
    version: metadata.version,
    status: !enabled ? declaration ? "disabled" : "available" : valid ? "enabled" : "incompatible",
    sourceType: "platform-node-modules",
    sourceLabel: "Installed native UI Base (Card and Panel)",
    manifestPath,
    packageRoot: root,
    capabilities: [],
    requiresServices: {},
    components,
    issues: valid ? [] : ["Native UI Base requires an explicit compatible version and platform-only resolution."],
    appEnabled: enabled,
    declared: !!declaration,
    requestedVersion: declaration?.version,
    resolution: declaration?.resolution ?? "platform-only",
    resolved: valid,
    globalAvailable: true,
    appLocalAvailable: false
  };
}
function assertNativeUiBaseModule(modulePath) {
  if (!admitted.some((entry) => entry.module === modulePath)) throw new Error("Only the explicitly admitted native Card/Panel entry modules are available.");
}

// src/server/composition-lock.ts
init_native_boundaries();
import path5 from "node:path";
import { withRoleBundleGraph } from "@ui-platform/artifacts/storage";
import { AsyncLocalStorage } from "node:async_hooks";
var requestSignals = new AsyncLocalStorage();
async function withApplicationMutation(_root, work, options = {}) {
  return withRoleBundleGraph(path5.join(platformRoot, "components"), work, { signal: requestSignals.getStore(), ...options });
}

// src/server/packages.ts
async function getAppPackageCatalog(key) {
  const appManifest = await ensureAppManifest(key);
  const catalog = await resolveAppPackageCatalog({ appManifest, appDir: appPath(key), platformRootDir: platformRoot });
  if (!catalog.entries.some((entry) => entry.name === nativeUiBaseName && entry.resolved)) {
    const native = await nativeUiBaseEntry(platformRoot, appManifest.packages[nativeUiBaseName]);
    if (native) catalog.entries = [...catalog.entries.filter((entry) => entry.name !== nativeUiBaseName), native].sort(sortPackages);
  }
  return catalog;
}
async function resolveAppPackageCatalog(options) {
  const [appDiscovery, platformCatalog] = await Promise.all([
    discoverPackageManifests({ rootDir: options.appDir }),
    refreshPackageCatalog({ rootDir: options.platformRootDir })
  ]);
  const appCandidates = /* @__PURE__ */ new Map();
  for (const discovered of appDiscovery.manifests) {
    setPreferredCandidate(appCandidates, discovered.manifest.name, toCandidate(discovered, sourceTypeForApp(discovered.source.type)));
  }
  const platformCandidates = /* @__PURE__ */ new Map();
  for (const entry of platformCatalog.entries) {
    setPreferredCandidate(platformCandidates, entry.name, toCandidateFromCatalog(entry));
  }
  const packageNames = /* @__PURE__ */ new Set([
    ...Object.keys(options.appManifest.packages),
    ...appCandidates.keys(),
    ...platformCandidates.keys()
  ]);
  const entries = [...packageNames].map((packageName) => toAppPackageListEntry(packageName, options.appManifest, appCandidates, platformCandidates)).sort(sortPackages);
  return {
    appManifest: options.appManifest,
    entries,
    rejected: [
      ...appDiscovery.rejected.map((issue) => toManifestIssue(issue, sourceTypeForApp(issue.source.type))),
      ...platformCatalog.rejected.map((issue) => toManifestIssue(issue, sourceTypeForPlatform(issue.source.type)))
    ]
  };
}
async function getActiveAppPackages(key) {
  const catalog = await getAppPackageCatalog(key);
  return activePackageEntries(catalog.entries);
}
function activePackageEntries(entries) {
  return entries.filter((entry) => entry.appEnabled && entry.resolved && entry.status !== "missing" && entry.status !== "incompatible");
}
function setPreferredCandidate(candidates, packageName, candidate) {
  if (!candidates.has(packageName)) {
    candidates.set(packageName, candidate);
  }
}
async function enableAppPackage(key, packageName, version, admit = async () => {
}) {
  return withApplicationMutation(appPath(key), async () => {
    const catalog = await getAppPackageCatalog(key);
    const current = catalog.entries.find((entry) => entry.name === packageName);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const requestedVersion = version ?? current?.requestedVersion ?? (current?.version ? defaultVersionRange(current.version) : void 0);
    if (!current?.resolved && !requestedVersion) {
      throw new Error(`Package "${packageName}" is not available to this application.`);
    }
    const native = current?.name === nativeUiBaseName && current.manifestPath.endsWith("ui.component.json");
    if (native && (!requestedVersion || !isVersionCompatible2(current.version, requestedVersion))) throw new Error("Select a compatible installed native UI Base version.");
    await admit();
    await setAppPackageDeclaration(key, packageName, {
      enabled: true,
      version: requestedVersion,
      resolution: native ? "platform-only" : "app-first",
      addedAt: catalog.appManifest.packages[packageName]?.addedAt ?? now,
      updatedAt: now
    });
    await appendHistory(appPath(key), { action: "package.enabled", appId: catalog.appManifest.appId, packageName, actor: "local-user" });
    return getAppPackageCatalog(key);
  });
}
async function disableAppPackage(key, packageName) {
  const manifest = await ensureAppManifest(key);
  const existing = manifest.packages[packageName];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const declaration = {
    enabled: false,
    version: existing?.version,
    resolution: existing?.resolution ?? "app-first",
    addedAt: existing?.addedAt ?? now,
    updatedAt: now
  };
  await setAppPackageDeclaration(key, packageName, declaration);
  await appendHistory(appPath(key), { action: "package.disabled", appId: manifest.appId, packageName, actor: "local-user" });
  return getAppPackageCatalog(key);
}
function toAppPackageListEntry(packageName, appManifest, appCandidates, platformCandidates) {
  const declaration = appManifest.packages[packageName];
  const appCandidate = appCandidates.get(packageName);
  const platformCandidate = platformCandidates.get(packageName);
  const candidate = chooseCandidate(declaration, appCandidate, platformCandidate);
  const requestedVersion = declaration?.version;
  const issues = [];
  let status = declaration?.enabled ? "enabled" : declaration ? "disabled" : "available";
  if (declaration?.enabled && !candidate) {
    status = "missing";
    issues.push("Package is enabled in app.manifest.json but no matching package manifest was found.");
  } else if (declaration?.enabled && requestedVersion && candidate && !isVersionCompatible2(candidate.manifest.version, requestedVersion)) {
    status = "incompatible";
    issues.push(`App requests ${requestedVersion}, but resolved package version is ${candidate.manifest.version}.`);
  }
  return {
    ...toPackageListEntry(packageName, candidate),
    status,
    appEnabled: declaration?.enabled === true,
    declared: Boolean(declaration),
    requestedVersion,
    resolution: declaration?.resolution ?? "app-first",
    resolved: Boolean(candidate),
    globalAvailable: Boolean(platformCandidate),
    appLocalAvailable: Boolean(appCandidate),
    issues
  };
}
function chooseCandidate(declaration, appCandidate, platformCandidate) {
  switch (declaration?.resolution) {
    case "app-only":
      return appCandidate;
    case "platform-first":
      return platformCandidate ?? appCandidate;
    case "platform-only":
      return platformCandidate;
    case "app-first":
    default:
      return appCandidate ?? platformCandidate;
  }
}
function toPackageListEntry(packageName, candidate) {
  if (!candidate) {
    return {
      name: packageName,
      displayName: packageName,
      version: "",
      status: "missing",
      sourceType: "app-packages",
      sourceLabel: "Missing",
      manifestPath: "",
      packageRoot: "",
      capabilities: [],
      requiresServices: {},
      components: [],
      issues: []
    };
  }
  return {
    name: candidate.manifest.name,
    displayName: candidate.manifest.displayName,
    version: candidate.manifest.version,
    description: candidate.manifest.description,
    icon: candidate.manifest.icon,
    status: candidate.sourceType === "platform-node-modules" || candidate.sourceType === "app-node-modules" ? "installed" : "available",
    sourceType: candidate.sourceType,
    sourceLabel: sourceLabel(candidate.sourceType),
    manifestPath: candidate.filePath,
    packageRoot: candidate.packageRoot,
    capabilities: candidate.manifest.capabilities,
    requiresServices: candidate.manifest.requiresServices ?? {},
    components: candidate.manifest.components ?? [],
    firstDiscoveredAt: candidate.firstDiscoveredAt,
    addedAt: candidate.addedAt,
    lastDiscoveredAt: candidate.lastDiscoveredAt,
    issues: []
  };
}
function toCandidate(discovered, sourceType) {
  return {
    manifest: discovered.manifest,
    filePath: discovered.filePath,
    packageRoot: discovered.source.packageRoot,
    sourceType
  };
}
function toCandidateFromCatalog(entry) {
  return {
    manifest: entry.manifest,
    filePath: entry.source.manifestPath,
    packageRoot: entry.source.packageRoot,
    sourceType: sourceTypeForPlatform(entry.source.type),
    firstDiscoveredAt: entry.firstDiscoveredAt,
    addedAt: entry.addedAt,
    lastDiscoveredAt: entry.lastDiscoveredAt
  };
}
function toManifestIssue(issue, sourceType) {
  return {
    filePath: issue.filePath,
    sourceType,
    packageRoot: issue.source.packageRoot,
    issues: issue.validation.issues
  };
}
function sourceTypeForApp(sourceType) {
  return sourceType === "workspace" ? "app-packages" : "app-node-modules";
}
function sourceTypeForPlatform(sourceType) {
  return sourceType === "workspace" ? "platform-packages" : "platform-node-modules";
}
function sourceLabel(sourceType) {
  switch (sourceType) {
    case "app-packages":
      return "App packages";
    case "app-node-modules":
      return "App node_modules";
    case "platform-packages":
      return "Platform packages";
    case "platform-node-modules":
      return "Platform node_modules";
  }
}
function defaultVersionRange(version) {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) ? `^${version}` : version;
}
function sortPackages(a, b) {
  return a.displayName.localeCompare(b.displayName) || a.name.localeCompare(b.name);
}

// src/server/component-registry.ts
init_native_boundaries();
init_native_boundaries();
import { readdir, readFile as readFile3, stat } from "node:fs/promises";
import path6 from "node:path";
var ignoredExportNames = /* @__PURE__ */ new Set([".", "./styles.css", "./tokens.css", "./default.css", "./dark.css", "./sample-tour.css", "./metadata", "./analyzer", "./writer", "./page-importer", "./page-import-artifact", "./uib-layout-manager", "./uib-layout-editor", "./platform-info"]);
function displayName(tagName) {
  return tagName.replace(/^uib-/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
async function json(file) {
  try {
    return JSON.parse(await readFile3(file, "utf8"));
  } catch {
    return null;
  }
}
async function metadataTags(packageDir) {
  const candidates = [path6.join(packageDir, "src", "metadata.js"), path6.join(packageDir, "src", "metadata", "index.js"), path6.join(packageDir, "src", "components.ts"), path6.join(packageDir, "src", "components.js")];
  const tags = /* @__PURE__ */ new Set();
  for (const file of candidates) {
    const source = await readFile3(file, "utf8").catch(() => "");
    for (const match of source.matchAll(/tagName\s*:\s*['"`]([^'"`]+)['"`]/g)) tags.add(match[1]);
    for (const match of source.matchAll(/customElements\.define\(\s*['"`]([^'"`]+)['"`]/g)) tags.add(match[1]);
  }
  return [...tags].sort();
}
function manifestEntries(value) {
  if (!value || typeof value !== "object") return [];
  const components = value.components;
  if (!Array.isArray(components)) return [];
  return components.filter((item) => Boolean(item && typeof item === "object" && typeof item.tagName === "string"));
}
async function packageEntries(packageDir) {
  const packageJson = await json(path6.join(packageDir, "package.json"));
  if (!packageJson?.name) return [];
  const manifest = await json(path6.join(packageDir, "ui.component.json"));
  const explicit = manifestEntries(manifest);
  const inferred = await metadataTags(packageDir);
  const knownTags = new Set(explicit.map((entry) => entry.tagName));
  const entries = [
    ...explicit.map((entry) => ({ ...entry, metadataStatus: "manifest" })),
    ...inferred.filter((tagName) => !knownTags.has(tagName)).map((tagName) => ({ tagName, metadataStatus: "package-metadata" }))
  ];
  for (const name of Object.keys(packageJson.exports ?? {}).filter((name2) => !ignoredExportNames.has(name2) && !name2.endsWith(".css"))) {
    const tagName = name.slice(2).replaceAll("/", "-");
    if (!knownTags.has(tagName) && !inferred.includes(tagName)) entries.push({ tagName, importPath: name, metadataStatus: "exports" });
  }
  return entries.map((entry) => toComponentCatalogEntry(entry, packageJson.name, packageJson.version ?? "0.0.0"));
}
function activatedPackageEntries(pkg, appKey) {
  return pkg.components.map((entry) => toComponentCatalogEntry(entry, pkg.name, pkg.version, entry.importPath ?? pkg.manifestPath, appKey));
}
function toComponentCatalogEntry(entry, packageName, packageVersion, source = entry.importPath ?? `package:${packageName}`, appKey) {
  const id = entry.identity?.componentId ?? entry.id ?? `${packageName}:${entry.tagName}`;
  return {
    id,
    definition: entry.identity && entry.builder && entry.runtime ? entry : void 0,
    tagName: entry.tagName,
    name: entry.identity?.displayName ?? entry.name ?? displayName(entry.tagName),
    category: entry.category ?? "Components",
    description: entry.description,
    module: entry.module,
    importPath: entry.importPath,
    attributes: entry.attributes,
    properties: entry.properties,
    events: entry.events,
    slots: entry.slots,
    presentation: entry.presentation,
    packageName,
    packageVersion,
    source,
    metadataStatus: entry.metadataStatus ?? "manifest",
    moduleUrl: appKey && entry.module ? `/api/apps/${encodeURIComponent(appKey)}/package-assets/${encodeURIComponent(packageName)}/${encodeURI(entry.module.slice(2))}?bundle=1` : void 0
  };
}
async function packageDirs(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => path6.join(root, entry.name));
}
async function discoverComponents(appKey, prospective) {
  if (appKey) {
    const activePackages = await getActiveAppPackages(appKey);
    const entries2 = (await Promise.all(activePackages.map(async (pkg) => {
      const canonical = manifestEntries(await json(path6.join(pkg.packageRoot, "ui.component.json")));
      return activatedPackageEntries({ ...pkg, components: pkg.components.map((entry) => ({ ...entry, ...canonical.find((c) => c.tagName === entry.tagName) })) }, appKey);
    }))).flat();
    for (const pkg of await installedUiBasePackages(appKey, prospective)) if (!activePackages.some((active) => active.name === pkg.name)) {
      const manifest = manifestEntries(await json(path6.join(pkg.root, "ui.component.json")));
      for (const entry of manifest) entries2.push(toComponentCatalogEntry(entry, pkg.name, pkg.version, `package:${pkg.name}`, appKey));
    }
    const tags = /* @__PURE__ */ new Map();
    for (const entry of entries2) tags.set(entry.tagName, [...tags.get(entry.tagName) ?? [], entry]);
    return entries2.map((entry) => {
      const matches = tags.get(entry.tagName) ?? [];
      const activationIssues = [...entry.activationIssues ?? []];
      if (!entry.module) activationIssues.push("This component does not declare a runtime module in its package manifest.");
      if (matches.length > 1) activationIssues.push(`The tag name is also declared by ${matches.filter((match) => match.id !== entry.id).map((match) => match.packageName).join(", ")}.`);
      return { ...entry, activationIssues: activationIssues.length ? activationIssues : void 0 };
    }).sort(sortComponents);
  }
  const dirs = await packageDirs(uiBasePackagesDir);
  const entries = (await Promise.all(dirs.map(packageEntries))).flat();
  return entries.sort(sortComponents);
}
async function getAppPackageAsset(appKey, packageName, modulePath) {
  const activePackage = (await getActiveAppPackages(appKey)).find((entry) => entry.name === packageName);
  const installed = activePackage ? void 0 : (await installedUiBasePackages(appKey)).find((pkg) => pkg.name === packageName);
  if (!activePackage && !installed) throw new Error(`Active package "${packageName}" was not found.`);
  if (activePackage?.name === nativeUiBaseName && activePackage.manifestPath.endsWith("ui.component.json")) assertNativeUiBaseModule(modulePath);
  const filePath = resolvePackageModulePath(activePackage?.packageRoot ?? installed.root, modulePath);
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error(`Package asset is not a file: ${modulePath}`);
  return { filePath, packageName };
}
async function installedUiBasePackages(appKey, prospective) {
  const root = appPath(appKey);
  const appPackage = await json(path6.join(root, "package.json"));
  const platformPackage = await json(path6.join(platformRoot, "package.json"));
  const appManifest = await json(path6.join(root, "app.manifest.json"));
  const settings = await json(path6.join(root, "app.settings.json"));
  const composed = (prospective ? prospective.presentationModel : settings?.presentation?.model) === "composition-v1";
  const names = new Set([...Object.keys(composed ? {} : platformPackage?.dependencies ?? {}), ...Object.keys(appPackage?.dependencies ?? {})].filter((name) => name.startsWith("@ui-base/")));
  const found = [];
  for (const name of names) {
    if (appManifest?.packages?.[name]?.enabled === false) continue;
    for (const owner of composed ? [root] : [root, platformRoot]) {
      const packageRoot = path6.join(owner, "node_modules", name);
      const metadata = await json(path6.join(packageRoot, "package.json"));
      if (metadata?.name === name) {
        found.push({ name, root: packageRoot, version: metadata.version });
        break;
      }
    }
  }
  return found;
}
function resolvePackageModulePath(packageRoot, modulePath) {
  if (!modulePath.startsWith("./") || modulePath.includes("\\")) throw new Error("Package asset paths must begin with ./ and use forward slashes.");
  const filePath = path6.resolve(packageRoot, modulePath);
  const relative = path6.relative(packageRoot, filePath);
  if (!relative || relative.startsWith("..") || path6.isAbsolute(relative)) throw new Error("Component module must remain inside its package root.");
  return filePath;
}
function sortComponents(a, b) {
  return a.packageName.localeCompare(b.packageName) || a.name.localeCompare(b.name);
}

// src/server/application-composition.ts
import { createHash as createHash2 } from "node:crypto";
import { lstat as lstat3, mkdir as mkdir3, readFile as readFile5, readdir as readdir3, writeFile, rename as rename2 } from "node:fs/promises";
init_native_boundaries();
init_json_files();
init_visual_artifacts();
import path8 from "node:path";
import { regions, remapPageRegions, themeCss, validateMenu, parseSource, parseMetadata as parseMetadata2, validateArtifact as validateArtifact2, applyMenuOverrides, composeShellMenus, valueErrors, validateCompositionDefinition, primaryRouteSignature } from "@ui-platform/visual-artifacts";
import { transform } from "esbuild";
import { pageAdmissionKind, validatePageMembership } from "@ui-platform/visual-artifacts";
var hash2 = (text) => createHash2("sha256").update(text).digest("hex");
async function compositionSettings(appKey) {
  const settings = JSON.parse(await readFile5(path8.join(appPath(appKey), "app.settings.json"), "utf8"));
  return settings.presentation?.model === "composition-v1" ? settings.presentation : void 0;
}
async function compositionWorkspace(appKey, packages = [], candidate, options = {}) {
  options = { ...options };
  const settings = candidate?.path === "app.settings.json" ? JSON.parse(candidate.content).presentation : await compositionSettings(appKey);
  if (!settings || settings.model !== "composition-v1") return null;
  if (settings.assetsRoot !== "assets" || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) throw new Error("Composition requires branding, source styles and the Application assets root.");
  const app = appPath(appKey);
  const reads = [new VisualArtifactService(path8.join(app, "shells"), "shell").list(options), new VisualArtifactService(path8.join(app, "src/pages"), "page").list(options)];
  const [shells, pages] = await Promise.all(reads).catch(async (error) => {
    if (options.recovery === "refuse") await Promise.allSettled(reads);
    throw error;
  });
  const menus = [];
  const read = async (relative) => candidate?.path === relative ? candidate.content : (await readCompositionSource(appKey, relative)).content;
  const menuFiles = new Set(await readdir3(path8.join(app, "menus")).catch(() => []));
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
    const errors = validateArtifact2(artifact, components, packages).filter((diagnostic) => diagnostic.severity === "error");
    if (errors.length) throw new Error(`${artifact.metadata.displayName}: ${errors.map((error) => error.message).join(" ")}`);
    regions(artifact.source);
    if (artifact.metadata.kind === "page") validatePageMembership(artifact);
  }
  if (!runtimeShells.some((shell) => shell.metadata.artifactId === settings.defaultShellId)) throw new Error("Application default Shell is missing.");
  const routeIds = /* @__PURE__ */ new Set(), paths = /* @__PURE__ */ new Set();
  const routes = runtimePages.map((page) => {
    const m = page.metadata;
    if (pageAdmissionKind(m) === "composed" && (!m.routeId || !m.shellId || !runtimeShells.some((shell) => shell.metadata.artifactId === m.shellId))) throw new Error(`Page requires permanent Route and Shell identities: ${m.name}.`);
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
    if (pageAdmissionKind(page.metadata) === "plain") continue;
    const shell = runtimeShells.find((shell2) => shell2.metadata.artifactId === page.metadata.shellId);
    const available = new Set(regions(shell.source).map((region) => region.regionId));
    if (regions(page.source).some((region) => !available.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${page.metadata.displayName}.`);
    for (const menuId of Object.keys(page.metadata.menuOverrides ?? {})) if (!menus.some((menu) => menu.menuId === menuId)) throw new Error(`Page Menu override refers to a missing Menu: ${menuId}.`);
    for (const menu of menus) validateMenu(applyMenuOverrides(menu, page.metadata.menuOverrides));
    const params = Object.fromEntries([...page.metadata.route.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map((match) => [match[1] ?? match[2], "__parameter__"]));
    const renderedShell = composeShellMenus(shell, definition, page, page.metadata.routeId, params);
    const errors = validateArtifact2(renderedShell, components, packages).filter((diagnostic) => diagnostic.severity === "error");
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
  validateCompositionDefinition(definition, components, packages);
  return definition;
}
async function compositionSourcePath(appKey, relative) {
  if (!/^(app\.settings\.json|menus\/[a-z0-9-]+\.json|styles\/[a-z0-9-]+\.css|assets\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:svg|png|jpg|jpeg|webp|ico|pdf|txt))$/.test(relative)) throw new Error("Unsupported composition source path.");
  let current = path8.resolve(appPath(appKey));
  for (let ancestor = current; ; ancestor = path8.dirname(ancestor)) {
    const info = await lstat3(ancestor).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition roots cannot contain symlinks.");
    if (path8.dirname(ancestor) === ancestor) break;
  }
  for (const segment of relative.split("/")) {
    current = path8.join(current, segment);
    const info = await lstat3(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition source paths cannot contain symlinks.");
  }
  return current;
}
async function compositionAssetInfo(appKey, relative) {
  if (!relative.startsWith("assets/")) throw new Error("Application asset path required.");
  const content = await readFile5(await compositionSourcePath(appKey, relative)).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return { path: relative, hash: content ? createHash2("sha256").update(content).digest("hex") : null };
}
async function readCompositionSource(appKey, relative) {
  const content = await readFile5(await compositionSourcePath(appKey, relative), "utf8");
  return { path: relative, content, hash: hash2(content) };
}
async function validateCompositionStyle(content) {
  const css = await transform(content, { loader: "css", logLevel: "silent" });
  if (css.warnings.length) throw new Error(css.warnings.map((item) => item.text).join(" "));
}
async function saveCompositionSource(appKey, relative, content, expectedHash, admit = async () => {
}) {
  return locked(appKey, async () => {
    const file = await compositionSourcePath(appKey, relative);
    const current = await readFile5(file, "utf8").catch((error) => {
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
        const shells = await new VisualArtifactService(path8.join(appPath(appKey), "shells"), "shell").list();
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
    if (await readFile5(file, "utf8").catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    }) !== current) throw Object.assign(new Error("Composition source changed during save admission."), { status: 409 });
    if (content !== current) await atomicWriteText(file, content);
    return { path: relative, content, hash: hash2(content) };
  });
}
async function locked(key, work) {
  return withApplicationMutation(appPath(key), work);
}

// tests/shared-composition/native.ts
init_visual_artifacts();
init_native_boundaries();
async function verify() {
  const app = appPath("fixture"), native = path9.join(platformRoot, "node_modules/@ui-base/ui");
  for (const dir of [app, native, path9.join(platformRoot, "components"), path9.join(app, "src/pages/home"), path9.join(app, "shells")]) await fs.mkdir(dir, { recursive: true });
  const manifest = JSON.parse(await fs.readFile("node_modules/@ui-base/ui/ui.component.json", "utf8"));
  await fs.writeFile(path9.join(native, "ui.component.json"), JSON.stringify(manifest));
  await fs.writeFile(path9.join(native, "package.json"), '{"name":"@ui-base/ui","version":"0.5.1"}');
  for (const name of ["uib-card", "uib-panel"]) {
    const file = path9.join(native, "src/layout", name + ".js");
    await fs.mkdir(path9.dirname(file), { recursive: true });
    await fs.writeFile(file, "export {};");
  }
  await fs.writeFile(path9.join(platformRoot, "package.json"), '{"dependencies":{"@ui-base/ui":"0.5.1"}}');
  await fs.writeFile(path9.join(app, "package.json"), "{}");
  const originalManifest = JSON.stringify({ manifestVersion: "1.0.0", appId: "dev-native-fixture", template: "fixture", templateVersion: "1.0.0", packages: {}, foundationImports: {} });
  await fs.writeFile(path9.join(app, "app.manifest.json"), originalManifest);
  const original = '{\n  "application":{"name":"Native Fixture","status":"active"}\n}\n';
  await fs.writeFile(path9.join(app, "app.settings.json"), original);
  const shells = new VisualArtifactService(path9.join(app, "shells"), "shell"), shell = await shells.create("shared");
  await fs.writeFile(path9.join(app, "src/pages/home/page.visual.json"), JSON.stringify({ schemaVersion: 1, artifactId: "art_home", kind: "page", name: "home", displayName: "Home", route: "/home" }));
  await fs.writeFile(path9.join(app, "src/pages/home/page.html"), '<section data-uip-node="s"><uib-card data-uip-node="card" data-uip-component="cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1"></uib-card></section>');
  const before = await readCompositionSource("fixture", "app.settings.json");
  const candidate = JSON.stringify({ application: JSON.parse(original).application, presentation: { model: "composition-v1", branding: { applicationName: "Native Fixture" }, theme: {}, siteStyles: [], assetsRoot: "assets", defaultShellId: shell.metadata.artifactId } });
  assert.ok((await discoverComponents("fixture")).length > 2, "legacy catalog remains unchanged");
  assert.equal((await discoverComponents("fixture", { presentationModel: "composition-v1" })).length, 0);
  await assert.rejects(saveCompositionSource("fixture", "app.settings.json", candidate, before.hash), /candidate conflicts/);
  assert.equal(await fs.readFile(path9.join(app, "app.settings.json"), "utf8"), original);
  await assert.rejects(enableAppPackage("fixture", "@ui-base/ui", "99.0.0"), /compatible/);
  await assert.rejects(enableAppPackage("fixture", "@ui-base/ui", "0.5.1", async () => {
    throw Error("AUTHORITY_DENIED");
  }), /AUTHORITY_DENIED/);
  assert.equal(await fs.readFile(path9.join(app, "app.manifest.json"), "utf8"), originalManifest);
  await enableAppPackage("fixture", "@ui-base/ui", "0.5.1");
  const enabled = (await getAppPackageCatalog("fixture")).entries.find((e) => e.name === "@ui-base/ui");
  assert.equal(enabled.resolution, "platform-only");
  assert.equal(enabled.components.length, 2);
  assert.equal(enabled.status, "enabled");
  const catalog = await discoverComponents("fixture", { presentationModel: "composition-v1" });
  assert.deepEqual(catalog.map((p) => p.tagName).sort(), ["uib-card", "uib-panel"]);
  await saveCompositionSource("fixture", "app.settings.json", candidate, before.hash);
  assert.equal((await compositionWorkspace("fixture", await discoverComponents("fixture"), void 0, { recovery: "refuse" })).pages.length, 1);
  await getAppPackageAsset("fixture", "@ui-base/ui", "./src/layout/uib-card.js");
  await assert.rejects(getAppPackageAsset("fixture", "@ui-base/ui", "./src/content/uib-heading.js"), /explicitly admitted/);
  await assert.rejects(getAppPackageAsset("fixture", "@ui-base/ui", "./../other.js"), /explicitly admitted|inside/);
  await disableAppPackage("fixture", "@ui-base/ui");
  assert.equal((await discoverComponents("fixture")).length, 0);
  return { passed: true, prospectiveCatalogRefusal: true, failedSettingsUnchanged: true, authorityRefusal: true, versionRefusal: true, explicitTwoContracts: true, actualEnabledGraph: true, disabledHonored: true, unadmittedModulesRefused: true, scope: "Actual registry, settings service, package declaration and Foundation mutation against detached fixture roots; no native module executed" };
}
export {
  verify
};
