var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};

// tests/mixed-page-admission/capture-boundaries.ts
import assert from "node:assert/strict";
import path from "node:path";
function configureFixture(nextRoot, next) {
  root = nextRoot;
  platformComponentsRoot = path.join(root, "components");
  state = next;
  calls.length = 0;
}
function appPath(key) {
  assert.equal(key, "fixture");
  return path.join(root, "application");
}
function readOptions(options) {
  assert.equal(options?.recovery, "refuse", "Fixture reads must explicitly refuse recovery");
  calls.push({ read: true, recovery: options.recovery });
}
async function visualWorkspace(_key, _packages, options = { recovery: "refuse" }) {
  readOptions(options);
  return structuredClone(state);
}
async function discoverComponents() {
  return structuredClone(state.packages);
}
async function withRuntimeGraphRead(_root, work, options) {
  readOptions(options);
  return work();
}
function assertIsolatedPreviewFunctions(code) {
  assert.equal(code.trim(), "export {};");
}
function compileVisualFunctions(code) {
  assertIsolatedPreviewFunctions(code);
  return code;
}
async function validateRuntimeFunctionSource(code) {
  assertIsolatedPreviewFunctions(code);
}
async function knownVisualArtifacts() {
  throw Error("UNADMITTED_GLOBAL_DISCOVERY");
}
var root, platformComponentsRoot, calls, state, VisualArtifactService, toRuntime;
var init_capture_boundaries = __esm({
  "tests/mixed-page-admission/capture-boundaries.ts"() {
    "use strict";
    root = "UNCONFIGURED";
    platformComponentsRoot = "UNCONFIGURED";
    calls = [];
    VisualArtifactService = class {
      constructor(root2, kind) {
        this.root = root2;
        this.kind = kind;
      }
      root;
      kind;
      async list(options) {
        readOptions(options);
        return structuredClone(this.kind === "page" ? state.pages : this.kind === "shell" ? state.shells : state.components);
      }
      async read(locator, options) {
        return (await this.list(options)).find((b) => b.locator === locator);
      }
    };
    toRuntime = (b) => b.metadata ? { metadata: b.metadata, source: b.files.source, css: b.files.css } : void 0;
  }
});

// packages/visual-artifacts/src/model.ts
function legacyPackageSettingContracts(pkg) {
  return Object.fromEntries(Object.entries(pkg.presentation?.settings ?? {}).flatMap(([key, value]) => {
    if (!/^[a-z][a-z0-9-]*$/.test(key)) return [];
    if (value.type === "select") return value.options?.length ? [[key, { type: typeof value.options[0] === "number" ? "number" : "string", enum: value.options, default: value.default }]] : [];
    return ["string", "number", "boolean"].includes(value.type) ? [[key, { type: value.type, default: value.default }]] : [];
  }));
}
function valueErrors(value, contract, label) {
  if (value === void 0 || value === null) return contract.required ? [`${label} is required.`] : [];
  const type = Array.isArray(value) ? "array" : typeof value;
  const errors = [];
  if (type !== contract.type || type === "number" && !Number.isFinite(value)) return [`${label} must be ${contract.type}.`];
  if (contract.enum && !contract.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${label} is outside its allowed values.`);
  if (typeof value === "number" && (contract.minimum !== void 0 && value < contract.minimum || contract.maximum !== void 0 && value > contract.maximum)) errors.push(`${label} is outside its numeric bounds.`);
  if (typeof value === "string" && (contract.minLength !== void 0 && value.length < contract.minLength || contract.maxLength !== void 0 && value.length > contract.maxLength)) errors.push(`${label} is outside its length bounds.`);
  return errors;
}
function packageSettingErrors(definition, settings) {
  const contracts = definition.builder.settings, values = {};
  for (const [key, contract] of Object.entries(contracts)) values[key] = settings[key] ?? contract.default;
  const errors = [];
  for (const [key, value] of Object.entries(settings)) if (!contracts[key]) errors.push(`Unknown installed Package setting: ${key}.`);
  for (const [key, contract] of Object.entries(contracts)) {
    errors.push(...valueErrors(values[key], contract, key));
    if (contract.visibleWhen && values[contract.visibleWhen.setting] !== contract.visibleWhen.equals && values[key] !== contract.default) errors.push(`${key} is not allowed in this interaction mode.`);
  }
  for (const rule of definition.builder.validation ?? []) {
    if (rule.when && values[rule.when.setting] !== rule.when.equals) continue;
    if (rule.kind === "requiredWhen" && !String(values[rule.setting] ?? "").trim()) errors.push(`${rule.setting} is required.`);
    if (rule.kind === "oneOfRequiredWhen" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push(`One of ${rule.settings?.join(", ")} is required.`);
    if (rule.kind === "accessibleNameWhenInteractive" && values.interactionMode !== "none" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push("Interactive components need an accessible name.");
  }
  return errors;
}
function readPackageSettings(definition, attributes, stored) {
  const values = {};
  for (const [key, contract] of Object.entries(definition.builder.settings)) {
    const binding = contract.binding;
    if (binding?.kind === "attribute" && binding.name && Object.hasOwn(attributes, binding.name)) {
      const value = attributes[binding.name];
      values[key] = contract.type === "boolean" ? value !== "false" : contract.type === "number" ? Number(value) : value;
    }
  }
  return { ...values, ...stored };
}
function readLegacyPackageSettings(pkg, attributes, stored) {
  const values = {};
  for (const [key, contract] of Object.entries(legacyPackageSettingContracts(pkg))) if (Object.hasOwn(attributes, key)) values[key] = contract.type === "boolean" ? attributes[key] !== "false" : contract.type === "number" ? Number(attributes[key]) : attributes[key];
  return { ...values, ...stored };
}
var init_model = __esm({
  "packages/visual-artifacts/src/model.ts"() {
    "use strict";
  }
});

// packages/visual-artifacts/src/source.ts
function validateManagedUrlAttribute(tag, name, value) {
  if (!(tag === "a" && name === "href" || tag === "img" && name === "src")) return;
  if (!value) return;
  const invalid = () => {
    throw new Error(`Unsupported or malformed ${tag} ${name} URL. Use an allowed scheme or a relative path without whitespace or backslashes.`);
  };
  if (/[\s\u0000-\u001f\u007f\\<>"`]/u.test(value) || /^\/\//.test(value) || /&(?:#|[a-z]+;)/i.test(value) || /%(?![0-9a-f]{2})/i.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) invalid();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1].toLowerCase();
  if (scheme && !(tag === "a" ? ["http", "https", "mailto", "tel"] : ["http", "https"]).includes(scheme)) invalid();
  if (scheme === "http" || scheme === "https") {
    if (!/^https?:\/\/[^/]/i.test(value)) invalid();
  } else if (scheme) {
    if (!value.slice(scheme.length + 1) || value.slice(scheme.length + 1).startsWith("//")) invalid();
  } else {
    if (value.split(/[/?#]/, 1)[0].includes(":") || tag === "img" && /^[?#]/.test(value)) invalid();
  }
  try {
    const parsed = new URL(value, "https://managed.invalid/");
    if (!scheme && parsed.origin !== "https://managed.invalid") invalid();
    if (scheme && parsed.protocol !== scheme + ":") invalid();
  } catch {
    invalid();
  }
}
function parseSource(source) {
  const nodes = [], stack = [], diagnostics = [];
  const implicitClose = (offset) => {
    const node = stack.pop();
    node.closeStart = offset;
    node.end = offset;
    node.manual = true;
    diagnostics.push({ severity: "warning", message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
  };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>|(<\/?[A-Za-z][\w:-]*[^<>]*(?:>|(?=<)|$)|<(?:\s+\/?[A-Za-z]|\/\s+[A-Za-z]|[0-9])[^<>]*\bdata-uip-(?:node|component)\b[^<>]*(?:>|(?=<)|$)|<!--[\s\S]*$|<![^>]*$|<\?[^>]*(?:>|$))/gi;
  let match;
  while (match = token.exec(source)) {
    const raw = match[0];
    if (match[1]) {
      diagnostics.push({ severity: "error", message: `Malformed opening tag at offset ${match.index}.` });
      continue;
    }
    if (raw.startsWith("<!")) continue;
    const tag = /^<\/?([\w:-]+)/.exec(raw)[1].toLowerCase();
    if (raw.startsWith("</")) {
      if (!/^<\/[\w:-]+\s*>$/.test(raw)) diagnostics.push({ severity: "error", message: `Malformed closing tag at offset ${match.index}.` });
      while (stack.length && stack.at(-1).tag !== tag && optionalTags.has(stack.at(-1).tag)) implicitClose(match.index);
      const node2 = stack.at(-1);
      if (!node2 || node2.tag !== tag) {
        diagnostics.push({ severity: "error", message: `Unmatched closing tag ${tag}. Visual editing requires explicit balanced markup.` });
        continue;
      }
      node2.closeStart = match.index;
      node2.end = token.lastIndex;
      stack.pop();
      continue;
    }
    while (stack.length) {
      const top = stack.at(-1).tag;
      const closes = top === "p" && blockTags.has(tag) || ["li", "option", "optgroup", "tr", "thead", "tbody", "tfoot"].includes(top) && top === tag || ["dt", "dd"].includes(top) && ["dt", "dd"].includes(tag) || ["td", "th"].includes(top) && ["td", "th"].includes(tag);
      if (!closes) break;
      implicitClose(match.index);
    }
    const attributes = {};
    const selfClosing = raw.endsWith("/>");
    const attrs = raw.slice(tag.length + 1, selfClosing ? -2 : -1);
    const attribute = /\s+([^\s=/'"><`&]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/y;
    const identities = /* @__PURE__ */ new Set();
    let cursor = 0;
    while (cursor < attrs.length && !/^\s*$/.test(attrs.slice(cursor))) {
      attribute.lastIndex = cursor;
      const attr = attribute.exec(attrs);
      if (!attr) {
        diagnostics.push({ severity: "error", message: `Malformed or unsupported attributes at offset ${match.index + tag.length + 1 + cursor}.` });
        break;
      }
      cursor = attribute.lastIndex;
      const folded = attr[1].replace(/[A-Z]/g, (letter) => letter.toLowerCase());
      const identity = folded === "data-uip-node" || folded === "data-uip-component";
      const name = identity ? folded : attr[1];
      const value = attr[2] ?? attr[3] ?? attr[4];
      if (identity) {
        if (identities.has(name)) {
          diagnostics.push({ severity: "error", message: `Duplicate identity attribute ${name} at offset ${match.index}.` });
          continue;
        }
        identities.add(name);
        if (!value || /&(?!(?:quot|lt|gt|amp);)/.test(value) || selfClosing && attr[4] !== void 0 && cursor === attrs.length) {
          diagnostics.push({ severity: "error", message: `Malformed or unsupported identity value for ${name} at offset ${match.index}.` });
          continue;
        }
      }
      const ordinarySlash = !identity && selfClosing && attr[4] !== void 0 && cursor === attrs.length ? "/" : "";
      Object.defineProperty(attributes, name, { value: decode(value ?? "") + ordinarySlash, writable: true, enumerable: true, configurable: true });
    }
    const node = { id: attributes["data-uip-node"], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes["data-uip-node"] };
    node.parent?.children.push(node);
    nodes.push(node);
    if (["script", "style", "textarea"].includes(tag)) {
      if (identities.size) diagnostics.push({ severity: "error", message: `Managed identity is unsupported on raw-text ${tag} at offset ${match.index}.` });
      const close = new RegExp(`</${tag}\\s*>`, "ig");
      close.lastIndex = token.lastIndex;
      const ending = close.exec(source);
      if (ending) {
        node.closeStart = ending.index;
        node.end = close.lastIndex;
        token.lastIndex = close.lastIndex;
      } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags.has(tag) && !raw.endsWith("/>")) stack.push(node);
  }
  while (stack.length && optionalTags.has(stack.at(-1).tag)) implicitClose(source.length);
  for (const node of stack) diagnostics.push({ severity: "error", message: `Unclosed ${node.tag}.` });
  const ids = /* @__PURE__ */ new Set();
  for (const node of nodes) if (node.id) {
    if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: "error", message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
    ids.add(node.id);
    if (!isWrapper(node) && !isWrapper(node.parent)) diagnostics.push({ severity: "warning", message: "Layout is manual because this node has no Builder wrapper.", node: node.id });
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) for (const node of nodes) {
    delete node.id;
    delete node.attributes["data-uip-node"];
    delete node.attributes["data-uip-component"];
    node.manual = true;
  }
  return { nodes, diagnostics };
}
function isWrapper(node) {
  return Boolean(node?.attributes.class?.split(/\s+/).includes("uip-layout-item"));
}
var voidTags, optionalTags, blockTags, escapeAttribute, decode;
var init_source = __esm({
  "packages/visual-artifacts/src/source.ts"() {
    "use strict";
    init_model();
    voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
    optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
    blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
    escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
    decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  }
});

// packages/visual-artifacts/src/page-links.ts
function isPlainPageRoute(route) {
  return typeof route === "string" && /^(?:\/|\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)$/.test(route);
}
function pageLinks(source) {
  return parseSource(source).nodes.filter((node) => {
    const href = node.attributes.href;
    return node.tag === "a" && !!href && !href.startsWith("#") && !href.startsWith("//") && !/^[a-z][a-z0-9+.-]*:/i.test(href);
  }).map((node) => ({ node: node.id ?? `offset ${node.start}`, href: node.attributes.href }));
}
function assertPlainPageRoute(route, pages, locator) {
  if (!isPlainPageRoute(route)) throw new Error("Use a canonical Page path such as /home, without parameters, query or fragment.");
  if (pages.some((page) => page.locator !== locator && page.metadata?.route === route)) throw new Error(`A saved Page already owns route ${route}.`);
}
function assertPageUnused(route, pages, locator) {
  const incoming = pages.filter((page) => page.locator !== locator).flatMap((page) => pageLinks(page.files.source).filter((link2) => link2.href === route).map((link2) => `${page.locator} (${link2.node})`));
  if (incoming.length) throw new Error(`Page ${route} is referenced by: ${incoming.join(", ")}. Repair these links first.`);
}
function validatePageLinks(previous, candidate, pages, options = {}) {
  const old = new Map(pageLinks(previous).map((link2) => [link2.node, link2.href]));
  for (const link2 of pageLinks(candidate)) {
    if (old.get(link2.node) === link2.href) continue;
    const targets = pages.filter((page) => page.metadata?.route === link2.href);
    if (!isPlainPageRoute(link2.href) || targets.length !== 1 || !options.allowComposed && targets[0].metadata?.shellId || targets[0].diagnostics.some((d) => d.severity === "error")) throw new Error(`Link ${link2.node}: saved Page destination ${link2.href} is missing, ambiguous or unsupported.`);
  }
}
var init_page_links = __esm({
  "packages/visual-artifacts/src/page-links.ts"() {
    "use strict";
    init_source();
  }
});

// packages/visual-artifacts/src/page-admission.ts
function pageAdmissionKind(metadata) {
  return metadata.shellId !== void 0 || metadata.routeId !== void 0 ? "composed" : "plain";
}
function validatePageMembership(page) {
  const composed = pageAdmissionKind(page.metadata) === "composed";
  if (composed && (!page.metadata.shellId || !page.metadata.routeId)) throw new Error(`Composed Page requires permanent Route and Shell identities: ${page.metadata.name}.`);
  if (!composed && !isPlainPageRoute(page.metadata.route)) throw new Error(`Plain Page requires a canonical public path: ${page.metadata.name}.`);
  if (!composed && page.metadata.menuOverrides && Object.keys(page.metadata.menuOverrides).length) throw new Error("Plain Page cannot consume Shell Menu overrides.");
  for (const node of parseSource(page.source).nodes) {
    if (!composed && Object.hasOwn(node.attributes, "data-uip-region")) throw new Error(`Plain Page cannot declare Shell Region membership: ${page.metadata.name}.`);
    if (composed) {
      let parent = node;
      while (parent && !Object.hasOwn(parent.attributes, "data-uip-region")) parent = parent.parent;
      if (!parent) throw new Error(`Page content must belong to a Shell Region: ${page.metadata.displayName}.`);
    }
  }
}
function capturePageRoutes(pages) {
  return pages.map((page) => ({ pageId: page.metadata.artifactId, routeId: page.metadata.routeId, path: page.metadata.route }));
}
var init_page_admission = __esm({
  "packages/visual-artifacts/src/page-admission.ts"() {
    "use strict";
    init_source();
    init_page_links();
  }
});

// ../UI Platform Data Services/packages/dataset-operations/dist/declarative-expression.js
function expressionDependencies(declaration) {
  const ids = /* @__PURE__ */ new Set();
  let count = 0;
  if (!declaration || !exact(declaration, ["version", "expression"]) || declaration.version !== 1)
    deny();
  const visit = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 24 || ++count > 256)
      deny();
    if (node.kind === "literal") {
      if (!exact(node, ["kind", "value"]) || !["string", "number", "boolean"].includes(typeof node.value) || typeof node.value === "number" && !Number.isFinite(node.value))
        deny();
    } else if (node.kind === "field") {
      if (!exact(node, ["kind", "fieldId"]) || typeof node.fieldId !== "string" || !node.fieldId || unsafe.has(node.fieldId))
        deny();
      ids.add(node.fieldId);
    } else if (node.kind === "operator") {
      if (!exact(node, ["kind", "operator", "args"]) || !["add", "subtract", "multiply", "divide", "concat", "eq", "lt", "gt", "and", "or", "not", "if"].includes(node.operator) || !Array.isArray(node.args) || node.args.length !== (node.operator === "not" ? 1 : node.operator === "if" ? 3 : 2))
        deny();
      node.args.forEach((arg) => visit(arg, depth + 1));
    } else
      deny();
  };
  visit(declaration.expression, 0);
  return [...ids];
}
function expressionType(declaration, fields) {
  expressionDependencies(declaration);
  const infer = (node) => {
    if (node.kind === "literal")
      return typeof node.value;
    if (node.kind === "field") {
      const type = fields.get(node.fieldId);
      if (!type || !["string", "number", "boolean"].includes(type))
        return deny();
      return type;
    }
    const types = node.args.map(infer), op = node.operator;
    if (op === "if") {
      if (types[0] !== "boolean" || types[1] !== types[2])
        deny();
      return types[1];
    }
    if (op === "not" || op === "and" || op === "or") {
      if (types.some((t) => t !== "boolean"))
        deny();
      return "boolean";
    }
    if (op === "eq") {
      if (types[0] !== types[1])
        deny();
      return "boolean";
    }
    if (op === "concat") {
      if (types.some((t) => t !== "string"))
        deny();
      return "string";
    }
    if (types.some((t) => t !== "number"))
      deny();
    return op === "lt" || op === "gt" ? "boolean" : "number";
  };
  return infer(declaration.expression);
}
function calculationOrder(calculations, fields) {
  const known = new Map(fields.map((f) => [f.fieldId, f.type])), byId = new Map(calculations.map((c) => [c.fieldId, c]));
  if (known.size !== fields.length || byId.size !== calculations.length)
    deny();
  const ordered = [], active = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
  const visit = (c) => {
    if (done.has(c.fieldId))
      return;
    if (active.has(c.fieldId))
      throw new Error("EXPRESSION_CYCLE");
    active.add(c.fieldId);
    if (typeof c.persist !== "boolean" || known.get(c.fieldId) !== c.type || expressionType(c.expression, known) !== c.type)
      deny();
    for (const id of expressionDependencies(c.expression)) {
      const next = byId.get(id);
      if (next) {
        if (c.persist && !next.persist)
          deny();
        visit(next);
      }
    }
    active.delete(c.fieldId);
    done.add(c.fieldId);
    ordered.push(c);
  };
  calculations.forEach(visit);
  return ordered;
}
var deny, unsafe, exact;
var init_declarative_expression = __esm({
  "../UI Platform Data Services/packages/dataset-operations/dist/declarative-expression.js"() {
    "use strict";
    deny = () => {
      throw new Error("EXPRESSION_INVALID");
    };
    unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
    exact = (x, keys) => Object.keys(x).length === keys.length && keys.every((k) => Object.hasOwn(x, k));
  }
});

// packages/visual-artifacts/src/expression.ts
var init_expression = __esm({
  "packages/visual-artifacts/src/expression.ts"() {
    "use strict";
    init_declarative_expression();
  }
});

// packages/visual-artifacts/src/form.ts
function formCalculations(metadata) {
  return (metadata.form?.fields ?? []).flatMap((f) => f.calculation ? [{ fieldId: f.datasetFieldId, type: f.type, ...f.calculation }] : []);
}
function formExpressionFields(metadata) {
  return (metadata.form?.fields ?? []).map((f) => ({ fieldId: f.datasetFieldId, key: f.key, type: f.type, required: !!f.datasetRequired }));
}
var init_form = __esm({
  "packages/visual-artifacts/src/form.ts"() {
    "use strict";
    init_source();
    init_model();
  }
});

// packages/visual-artifacts/src/validation.ts
function parseMetadata(text) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Metadata must be an object.");
    return { metadata: value, diagnostics: [] };
  } catch (error) {
    return { diagnostics: [{ severity: "error", message: `Metadata: ${String(error)}` }] };
  }
}
function validateArtifact(artifact, components = [], packages = [], services = []) {
  const diagnostics = [];
  const error = (message, node) => diagnostics.push({ severity: "error", message, node });
  const warning = (message, node) => diagnostics.push({ severity: "warning", message, node });
  const m = artifact.metadata;
  try {
    if (m.schemaVersion !== 1 || !["page", "component", "shell"].includes(m.kind)) error("Expected Visual Artifact schemaVersion 1 and page/component/shell kind.");
    if (!/^art_[\w-]+$/.test(m.artifactId ?? "")) error("A permanent art_ artifact identity is required.");
    if (!/^[a-z][a-z0-9-]*$/.test(m.name ?? "") || !m.displayName) error("Name and display name are required.");
    if (m.kind === "component") {
      if (!/^cmp_platform_[\w-]+$/.test(m.componentId ?? "")) error("A permanent cmp_platform_ Component identity is required.");
      if (m.route !== void 0) error("Only Pages may declare routes.");
      if (!m.public) error("A Component must declare its public interface.");
      if (packages.some((pkg) => pkg.id === m.componentId) || components.filter((c) => c.metadata.componentId === m.componentId).length > 1) error(`Duplicate Component identity: ${m.componentId}.`);
    } else if (m.kind === "shell") {
      if (m.route !== void 0 || m.componentId !== void 0) error("Shells cannot declare routes or Component identities.");
    } else if (!m.route?.startsWith("/") || m.componentId !== void 0 || m.public !== void 0) error("A Page needs a route and cannot declare a Component identity/public interface.");
    const checkContract = (contract, name) => {
      if (!contract || !["string", "number", "boolean", "object", "array"].includes(contract.type)) {
        error(`Invalid property type: ${name}.`);
        return;
      }
      if (contract.default !== void 0) {
        for (const message of valueErrors(contract.default, contract, name)) error(message);
      }
    };
    for (const [name, contract] of Object.entries(m.public?.properties ?? {})) {
      if (!/^[A-Za-z][\w]*$/.test(name)) error(`Invalid public property name: ${name}.`);
      checkContract(contract, name);
    }
    for (const [name, event] of Object.entries(m.public?.events ?? {})) for (const [key, contract] of Object.entries(event.payload)) checkContract(contract, `${name}.${key}`);
    if (new Set(m.public?.slots).size !== (m.public?.slots.length ?? 0)) error("Duplicate public slot names.");
    const parsed = parseSource(artifact.source);
    diagnostics.push(...parsed.diagnostics);
    if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) return diagnostics;
    const nodes = new Map(parsed.nodes.filter((n) => n.id).map((n) => [n.id, n]));
    if (m.modes) {
      if (!Object.hasOwn(m.modes.overrides, m.modes.default)) error("Default mode must exist.");
      for (const overrides of Object.values(m.modes.overrides)) for (const [node, override] of Object.entries(overrides)) {
        if (!nodes.has(node)) error(`Unknown mode node: ${node}.`);
        if (Object.keys(override).some((key) => !["visible", "editable", "required", "label", "help", "default"].includes(key))) error("Unsupported mode override.");
        for (const key of ["visible", "editable", "required"]) if (override[key] !== void 0 && typeof override[key] !== "boolean") error(`Mode ${key} must be boolean.`);
      }
    }
    if (Boolean(m.capabilities?.includes("form")) !== Boolean(m.form)) error("Form capability and Form definition must be declared together.");
    if (m.form) {
      if (m.kind !== "component") error("A Form must be a Platform Component.");
      if (!m.form.datasetId) warning("Configure a Dataset target before submission.");
      if (!nodes.has(m.form.node)) error("Unknown Form root node.");
      if (!/^[A-Za-z][\w]*$/.test(m.form.primaryKey)) error("Invalid Form primary key.");
      if (!m.modes) error("A Form must declare a restrictive default mode.");
      if (!m.form.submit.service || !m.form.submit.readService) error("Form write/read adapters must be explicit.");
      const keys = /* @__PURE__ */ new Set(), identities = /* @__PURE__ */ new Set(), fieldNodes = /* @__PURE__ */ new Set();
      for (const field of m.form.fields) {
        if (!/^[A-Za-z][\w-]*$/.test(field.id) || identities.has(field.id) || fieldNodes.has(field.node) || keys.has(field.key)) error("Form field identity, node and mapping must be unique.");
        identities.add(field.id);
        fieldNodes.add(field.node);
        keys.add(field.key);
        if (!nodes.has(field.node) || !/^[A-Za-z][\w]*$/.test(field.key) || !field.datasetFieldId) error("Form fields require an explicit node and stable Dataset mapping.");
        if (!["string", "number", "boolean", "object", "array"].includes(field.type)) error("Invalid Form field value type.");
        let parent = nodes.get(field.node)?.parent;
        while (parent && parent.id !== m.form.node) parent = parent.parent;
        if (!parent) error("Mapped Form controls must belong to the Form root.");
        if (field.datasetRequired && field.required === false) error("Dataset-required validation cannot be weakened.");
        for (const overrides of Object.values(m.modes?.overrides ?? {})) if (field.datasetRequired && overrides[field.node]?.required === false) error("A mode cannot weaken Dataset-required validation.");
      }
      calculationOrder(formCalculations(m), formExpressionFields(m));
    }
    const sourceNames = /* @__PURE__ */ new Set(["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {}), ...(m.repeaters ?? []).flatMap((r) => [r.item, ...r.index ? [r.index] : []])]);
    const expression = (expr) => {
      if (typeof expr === "string") {
        if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expr) || expr.split(".").some((p) => ["constructor", "prototype", "__proto__"].includes(p))) error(`Invalid named-source path: ${expr}.`);
        else if (!sourceNames.has(expr.split(".")[0])) error(`Unknown named source: ${expr}.`);
        else if (expr.startsWith("public.") && !Object.hasOwn(m.public?.properties ?? {}, expr.split(".")[1])) error(`Undeclared public input: ${expr}.`);
      } else if (expr && "version" in expr) {
        expressionType(expr, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type])));
      } else if (expr && "literal" in expr) return;
      else if (expr && ["not", "eq", "and", "or"].includes(expr.op) && Array.isArray(expr.args)) expr.args.forEach(expression);
      else error("Invalid declarative expression.");
    };
    const requireNode = (id) => {
      if (!nodes.has(id)) error(`Unknown managed node: ${id}.`, id);
      return nodes.get(id);
    };
    for (const node of parsed.nodes) {
      if (node.id && !node.manual) for (const [name, value] of Object.entries(node.attributes)) {
        try {
          validateManagedUrlAttribute(node.tag, name.toLowerCase(), value);
        } catch (cause) {
          error(cause instanceof Error ? cause.message : String(cause), node.id);
        }
      }
      const id = node.attributes["data-uip-component"];
      if (node.tag === "uip-page" || node.attributes["data-uip-page"]) error("Pages cannot be nested.", node.id);
      if (node.tag === "uip-slot" && !m.public?.slots.includes(node.attributes.name ?? "")) error(`Undeclared public slot: ${node.attributes.name}.`, node.id);
      if (!id) {
        if (node.tag.startsWith("uib-")) warning(`Manual package element ${node.tag} has no permanent Component reference.`, node.id);
        continue;
      }
      const nested = components.filter((c) => c.metadata.componentId === id);
      const pkg = packages.filter((p) => p.id === id);
      if (nested.length + pkg.length !== 1) {
        error(`Unknown or ambiguous Component dependency: ${id}.`, node.id);
        continue;
      }
      if (nested[0] && node.tag !== "uip-component") error("Platform Component instances use uip-component.", node.id);
      if (node.children.length && node.children.some((child) => !child.attributes.slot)) warning("Component children should use declared named slots.", node.id);
      let settings = {};
      try {
        settings = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
        if (!settings || Array.isArray(settings) || typeof settings !== "object") throw new Error();
      } catch {
        error("Component settings must be a JSON object.", node.id);
        continue;
      }
      if (nested[0]) {
        const api = nested[0].metadata.public;
        for (const key of Object.keys(settings)) if (!Object.hasOwn(api.properties, key)) error(`Unknown public property: ${key}.`, node.id);
        for (const [key, contract] of Object.entries(api.properties)) {
          if (!(m.bindings ?? []).some((b) => b.node === node.id && b.target === `property:${key}`)) for (const message of valueErrors(settings[key] ?? contract.default, contract, key)) error(message, node.id);
        }
        for (const child of node.children) if (!api.slots.includes(child.attributes.slot ?? "")) error(`Unknown public slot: ${child.attributes.slot}.`, node.id);
      } else {
        if (pkg[0].tagName !== node.tag) error("Component tag does not match its installed identity.", node.id);
        pkg[0].activationIssues?.forEach((issue) => error(issue, node.id));
        const definitions = pkg[0].definition?.builder.settings;
        if (pkg[0].definition) {
          for (const child of node.children) if (!pkg[0].definition.runtime.slots.some((slot) => slot.name === (child.attributes.slot || "default"))) error(`Unknown installed Package slot: ${child.attributes.slot}.`, node.id);
        }
        if (pkg[0].definition) settings = readPackageSettings(pkg[0].definition, node.attributes, settings);
        else settings = readLegacyPackageSettings(pkg[0], node.attributes, settings);
        if (pkg[0].definition && !(m.bindings ?? []).some((binding) => binding.node === node.id && binding.target.startsWith("setting:"))) packageSettingErrors(pkg[0].definition, settings).forEach((message) => error(message, node.id));
        for (const [key, value] of Object.entries(settings)) {
          const contract = definitions?.[key];
          if (definitions && !contract) error(`Unknown installed Package setting: ${key}.`, node.id);
          else if (contract) valueErrors(value, contract, key).forEach((message) => error(message, node.id));
          else if (legacyPackageSettingContracts(pkg[0])[key]) valueErrors(value, legacyPackageSettingContracts(pkg[0])[key], key).forEach((message) => error(message, node.id));
          else if (![...pkg[0].properties ?? [], ...pkg[0].attributes ?? []].includes(key)) error(`Package setting is not declared: ${key}.`, node.id);
        }
      }
    }
    for (const binding of m.bindings ?? []) {
      const node = requireNode(binding.node);
      expression(binding.value);
      if (!/^(text|attribute:[\w:-]+|property:[\w]+|setting:[\w]+|style:--[\w-]+)$/.test(binding.target)) error(`Unsupported binding target: ${binding.target}.`, binding.node);
      const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
      if (nested && (!binding.target.startsWith("property:") || !Object.hasOwn(nested.metadata.public?.properties ?? {}, binding.target.slice(9)))) error("Nested Components expose only declared public properties.", binding.node);
      const pkg = packages.find((p) => p.id === node?.attributes["data-uip-component"]);
      if (pkg && binding.target.startsWith("setting:") && !pkg.definition?.builder.settings[binding.target.slice(8)]) error("Unknown installed Package setting binding.", binding.node);
    }
    for (const condition of m.conditions ?? []) {
      requireNode(condition.node);
      expression(condition.when);
      if (typeof condition.when !== "string" && "version" in condition.when && expressionType(condition.when, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type]))) !== "boolean") error("Versioned conditions must return Boolean values.", condition.node);
    }
    for (const repeater of m.repeaters ?? []) {
      requireNode(repeater.node);
      expression(repeater.collection);
      if (!/^[A-Za-z]\w*$/.test(repeater.item) || ["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {})].includes(repeater.item)) error("Repeater alias conflicts with a named source.");
    }
    const action = (item) => {
      if (item.kind === "set") {
        if (!Object.hasOwn(m.state ?? {}, item.state)) error(`Unknown local state: ${item.state}.`);
        expression(item.value);
      } else if (item.kind === "emit") {
        const contract = m.public?.events[item.event];
        if (!contract) error(`Undeclared public event: ${item.event}.`);
        else {
          for (const [key, field] of Object.entries(contract.payload)) if (field.required && !Object.hasOwn(item.payload ?? {}, key)) error(`Public event ${item.event} requires payload field ${key}.`);
          for (const key of Object.keys(item.payload ?? {})) if (!Object.hasOwn(contract.payload, key)) error(`Unknown public event payload field: ${key}.`);
        }
        Object.values(item.payload ?? {}).forEach(expression);
      } else if (item.kind === "navigate") expression(item.to);
      else if (item.kind === "service") {
        if (!services.includes(item.reference)) warning(`Service reference is supported but has no executable adapter: ${item.reference}.`);
        if (item.input) expression(item.input);
      } else if (item.kind === "workflow") {
        if (!item.workflowId || typeof item.workflowId !== "string") error("Permanent Workflow identity is required.");
        expression(item.primaryRecordId);
        if (item.resultState && !Object.hasOwn(m.state ?? {}, item.resultState)) error("Workflow result state must be declared.");
      } else if (item.kind === "record-delete") {
        if (item.version !== 1 || !item.datasetId || typeof item.datasetId !== "string" || !item.primaryFieldId || typeof item.primaryFieldId !== "string" || Object.keys(item).some((key) => !["kind", "version", "datasetId", "primaryFieldId", "recordId", "resultState"].includes(key))) error("Invalid versioned single-record delete declaration.");
        expression(item.recordId);
        if (typeof item.resultState !== "string" || !item.resultState || !m.state || typeof m.state !== "object" || Array.isArray(m.state) || !Object.hasOwn(m.state, item.resultState)) error("Record delete result state must be explicitly declared.");
      } else if (item.kind !== "function") error("Unknown action kind.");
    };
    for (const event of m.events ?? []) {
      const node = requireNode(event.node);
      const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
      if (nested && !nested.metadata.public?.events[event.event]) error(`Undeclared nested public event: ${event.event}.`, event.node);
      event.actions.forEach(action);
    }
    m.onLoad?.forEach(action);
    for (const [name, source] of Object.entries(m.sources ?? {})) if (source.kind === "service" && !services.includes(source.reference ?? "")) warning(`Named source ${name} is supported but has no executable adapter: ${source.reference}.`);
    for (const id of Object.keys(m.layout ?? {})) if (!isWrapper(requireNode(id))) error("Declarative layout requires a Builder wrapper.", id);
    const workflowIds = [...m.onLoad ?? [], ...(m.events ?? []).flatMap((event) => event.actions)].flatMap((action2) => action2.kind === "workflow" ? [action2.workflowId] : []);
    for (const id of m.dependencies ?? []) if (!components.some((c) => c.metadata.componentId === id) && !packages.some((p) => p.id === id) && !services.includes(id) && !workflowIds.includes(id)) error(`Unknown dependency: ${id}.`);
    const visit = (current, path9) => {
      const id = current.metadata.componentId ?? current.metadata.artifactId;
      if (path9.includes(id)) {
        error(`Component dependency cycle: ${[...path9, id].join(" \u2192 ")}.`);
        return;
      }
      for (const ref of /* @__PURE__ */ new Set([...componentReferences(current.source), ...current.metadata.dependencies ?? []])) {
        const next = components.find((c) => c.metadata.componentId === ref);
        if (next) visit(next, [...path9, id]);
      }
    };
    visit(artifact, []);
  } catch (cause) {
    error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return diagnostics;
}
function componentReferences(source) {
  return [...new Set(parseSource(source).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
}
var init_validation = __esm({
  "packages/visual-artifacts/src/validation.ts"() {
    "use strict";
    init_source();
    init_model();
    init_expression();
    init_form();
    init_model();
  }
});

// packages/visual-artifacts/src/duplicate-section.ts
var init_duplicate_section = __esm({
  "packages/visual-artifacts/src/duplicate-section.ts"() {
    "use strict";
    init_source();
    init_validation();
  }
});

// packages/visual-artifacts/src/composition.ts
function regions(source) {
  const parsed = parseSource(source);
  if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair region source structure first: " + parsed.diagnostics.filter((d) => d.severity === "error").map((d) => d.message).join(" "));
  const ids = /* @__PURE__ */ new Set();
  return parsed.nodes.filter((node) => Object.hasOwn(node.attributes, "data-uip-region")).map((node) => {
    const regionId = node.attributes["data-uip-region"];
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(regionId) || ids.has(regionId)) throw new Error(`Invalid or duplicate Region ID: ${regionId}.`);
    ids.add(regionId);
    return { regionId, displayName: node.attributes["data-uip-region-name"] ?? regionId, nodeId: node.id, content: source.slice(node.openEnd, node.closeStart), start: node.start, openEnd: node.openEnd, closeStart: node.closeStart, end: node.end };
  });
}
function themeCss(settings) {
  return ":host,:root{" + Object.entries(settings.theme).map(([name, value]) => {
    if (!/^--app-[a-z0-9-]+$/.test(name) || /[;{}<>]/.test(value)) throw new Error("Invalid theme variable.");
    return `${name}:${value}`;
  }).join(";") + "}";
}
function applyMenuOverrides(menu, overrides) {
  const result = structuredClone(menu), override = overrides?.[menu.menuId];
  const all = /* @__PURE__ */ new Map();
  const walk = (items) => {
    for (const item of items) {
      if (all.has(item.itemId)) throw new Error("Duplicate Menu Item identity.");
      all.set(item.itemId, item);
      walk(item.children ?? []);
    }
  };
  walk(result.items);
  for (const [id, change] of Object.entries(override?.items ?? {})) {
    const item = all.get(id);
    if (!item) throw new Error(`Menu override target is missing: ${id}.`);
    if (Object.keys(change).some((key) => !["hidden", "disabled"].includes(key))) throw new Error("Page overrides may only hide/show or disable/enable items.");
    Object.assign(item, change);
  }
  for (const { parentItemId, item } of override?.additions ?? []) {
    const parent = parentItemId ? all.get(parentItemId) : void 0;
    if (parentItemId && !parent) throw new Error("Page-local item parent is missing.");
    walk([item]);
    (parent ? parent.children ??= [] : result.items).push(structuredClone(item));
  }
  return result;
}
function validateMenu(menu) {
  if (menu.schemaVersion !== 1 || !menu.menuId || !menu.name || !Array.isArray(menu.items)) throw new Error("Invalid Application Menu.");
  const ids = /* @__PURE__ */ new Set();
  const walk = (items) => {
    for (const item of items) {
      if (!/^[a-z][\w-]*$/.test(item.itemId) || ids.has(item.itemId) || !item.label) throw new Error("Menu Items require unique stable IDs and labels.");
      ids.add(item.itemId);
      if (item.target && !["_self", "_blank", "_parent", "_top"].includes(item.target)) throw new Error("Unsupported browser target.");
      const destination = item.destination;
      if (!destination || !["page", "route", "url", "action"].includes(destination.kind)) throw new Error("Invalid Menu destination.");
      if (destination.kind === "url" && !/^https?:\/\//i.test(destination.url)) throw new Error("External URLs must use HTTP or HTTPS.");
      if (destination.kind === "url") new URL(destination.url);
      if (destination.kind === "page" && !destination.pageId || destination.kind === "route" && !destination.routeId || destination.kind === "action" && !Array.isArray(destination.actions)) throw new Error("Menu destination identity/actions required.");
      walk(item.children ?? []);
    }
  };
  walk(menu.items);
}
function routePath(route, params = {}) {
  return route.path.replace(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g, (_, colon, bracket) => {
    const value = params[colon ?? bracket];
    if (value === void 0) throw new Error(`Route parameter is required: ${colon ?? bracket}.`);
    return encodeURIComponent(value);
  });
}
function renderMenu(menu, routes, currentPageId, currentRouteId, params = {}, placementId = "") {
  validateMenu(menu);
  const events = [];
  const render = (item) => {
    if (item.hidden) return { html: "", active: false };
    const children = (item.children ?? []).map(render), destination = item.destination;
    const current = destination.kind === "page" ? destination.pageId === currentPageId : destination.kind === "route" ? destination.routeId === currentRouteId && Object.entries(destination.params ?? {}).every(([key, value]) => params[key] === value) : false;
    const activePath = children.some((child) => child.active);
    const node = `menu_${placementId.replace(/\W/g, "_")}_${menu.menuId.replace(/\W/g, "_")}_${item.itemId}`;
    let control;
    if (destination.kind === "action") {
      if (!item.disabled) events.push({ node, event: "click", actions: destination.actions });
      control = `<button type="button" data-uip-node="${node}"${item.disabled ? " disabled" : ""}>${escapeAttribute(item.label)}</button>`;
    } else {
      const route = destination.kind === "page" ? routes.find((r) => r.pageId === destination.pageId) : destination.kind === "route" ? routes.find((r) => r.routeId === destination.routeId) : void 0;
      const url = destination.kind === "url" ? destination.url : route ? routePath(route, { ...params, ...destination.params }) : void 0;
      if (!url) throw new Error(`Menu target not found: ${item.label}.`);
      control = `<a${item.disabled ? ' aria-disabled="true" tabindex="-1"' : ` href="${escapeAttribute(url)}"`} target="${item.target ?? "_self"}" rel="noopener noreferrer"${current ? ' aria-current="page"' : ""}>${escapeAttribute(item.label)}</a>`;
    }
    return { html: `<li class="${current ? "current " : ""}${activePath ? "active-path" : ""}" data-current="${current}" data-active-path="${activePath}">${control}${children.some((child) => child.html) ? `<ul>${children.map((child) => child.html).join("")}</ul>` : ""}</li>`, active: current || activePath };
  };
  return { source: `<ul>${menu.items.map((item) => render(item).html).join("")}</ul>`, events };
}
function composeShellMenus(shell, definition, page, routeId, params = {}) {
  let source = shell.source;
  const metadata = structuredClone(shell.metadata);
  const placeholders = parseSource(source).nodes.filter((node) => Object.hasOwn(node.attributes, "data-uip-menu"));
  const compiled = placeholders.map((node, index) => {
    const reference = node.attributes["data-uip-menu"], menuId = definition.settings.defaultMenus?.[reference] ?? reference;
    const menu = definition.menus.find((menu2) => menu2.menuId === menuId);
    if (!menu) throw new Error(`Application Menu is missing: ${menuId}.`);
    const rendered = renderMenu(applyMenuOverrides(menu, page.metadata.menuOverrides), definition.routes, page.metadata.artifactId, routeId, params, node.id ?? `placement_${index}`);
    metadata.events = [...metadata.events ?? [], ...rendered.events];
    return { node, rendered };
  });
  for (const { node, rendered } of compiled.reverse()) {
    source = source.slice(0, node.openEnd) + rendered.source + source.slice(node.closeStart);
  }
  return { ...shell, metadata, source };
}
var init_composition = __esm({
  "packages/visual-artifacts/src/composition.ts"() {
    "use strict";
    init_source();
  }
});

// packages/visual-artifacts/src/composition-validation.ts
function primaryRouteSignature(path9) {
  if (!path9?.startsWith("/") || /[\s?#\\]/.test(path9) || path9.includes("//") || path9.split("/").some((part) => part === "." || part === "..")) throw new Error("Primary Route path is invalid.");
  return path9.replace(/:[A-Za-z][\w]*|\[[A-Za-z][\w]*\]/g, ":parameter").replace(/\/$/, "") || "/";
}
function compositionDiagnostics(definition, components, packages = []) {
  const diagnostics = [];
  const issue = (code, message, location = {}) => diagnostics.push({ severity: "error", code, message, ...location });
  const check = (code, work, location = {}) => {
    try {
      work();
    } catch (error) {
      issue(code, error instanceof Error ? error.message : String(error), location);
    }
  };
  const { settings, pages, shells, menus, routes } = definition;
  const required = /* @__PURE__ */ new Set();
  for (const artifact of [...pages, ...shells]) check("composition.dependencies", () => {
    for (const id of [...componentReferences(artifact.source), ...artifact.metadata.dependencies ?? []]) required.add(id);
  }, { artifactId: artifact.metadata.artifactId });
  const selected = /* @__PURE__ */ new Map();
  for (const id of required) {
    const component = components.find((component2) => component2.metadata.componentId === id);
    if (component && !selected.has(id)) {
      selected.set(id, component);
      check("composition.dependencies", () => {
        for (const nested of [...componentReferences(component.source), ...component.metadata.dependencies ?? []]) required.add(nested);
      }, { artifactId: component.metadata.artifactId });
    }
  }
  components = [...selected.values()];
  if (settings.assetsRoot !== "assets" || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) issue("composition.settings", "Composition requires branding, source styles and the Application assets root.");
  const identities = /* @__PURE__ */ new Set();
  for (const artifact of [...pages, ...shells, ...components]) {
    const artifactId = artifact.metadata.artifactId;
    if (identities.has(artifactId)) issue("composition.duplicate-identity", "Duplicate Visual Artifact identity.", { artifactId });
    identities.add(artifactId);
    check("composition.artifact-validation", () => {
      diagnostics.push(...validateArtifact(artifact, components, packages).map((d) => ({ ...d, code: "visual.validation", artifactId })));
    }, { artifactId });
  }
  for (const artifact of [...pages, ...shells]) check("composition.page-link", () => {
    for (const link2 of pageLinks(artifact.source)) if (isPlainPageRoute(link2.href) && pages.filter((target) => target.metadata.route === link2.href).length !== 1) issue("composition.page-link", `Page link ${link2.node} has a missing or ambiguous destination: ${link2.href}.`, { artifactId: artifact.metadata.artifactId });
  }, { artifactId: artifact.metadata.artifactId });
  if (!shells.some((shell) => shell.metadata.artifactId === settings.defaultShellId)) issue("composition.default-shell", "Application default Shell is missing.", { field: "defaultShellId" });
  const routeIds = /* @__PURE__ */ new Set(), paths = /* @__PURE__ */ new Set();
  for (const page of pages) {
    const m = page.metadata;
    const location = { artifactId: m.artifactId };
    check("composition.page-validation", () => {
      const shell = shells.find((shell2) => shell2.metadata.artifactId === m.shellId);
      const composed = pageAdmissionKind(m) === "composed";
      check(composed ? "composition.page-region" : "composition.page-membership", () => validatePageMembership(page), location);
      if (composed && (!m.routeId || !m.shellId || !shell)) issue("composition.page-identities", `Page requires permanent Route and Shell identities: ${m.name}.`, location);
      let signature;
      try {
        signature = primaryRouteSignature(m.route);
      } catch {
        issue(m.route !== void 0 && typeof m.route !== "string" ? "composition.page-validation" : "composition.route-path", "Primary Route path is invalid.", { ...location, field: "route" });
      }
      if (m.routeId && routeIds.has(m.routeId) || signature !== void 0 && paths.has(signature)) issue("composition.route-duplicate", "Each Page requires a unique primary Route.", location);
      if (m.routeId) routeIds.add(m.routeId);
      if (signature !== void 0) paths.add(signature);
      if (!routes.some((route) => route.routeId === m.routeId && route.pageId === m.artifactId && route.path === m.route)) issue("composition.route-capture", "Runtime Route does not match its captured Page.", location);
      if (!composed) return;
      if (shell) check("composition.region-mapping", () => {
        const allowed = new Set(regions(shell.source).map((region) => region.regionId));
        if (regions(page.source).some((region) => !allowed.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${m.displayName}.`);
      }, location);
      for (const menuId of Object.keys(m.menuOverrides ?? {})) if (!menus.some((menu) => menu.menuId === menuId)) issue("composition.menu-override", `Page Menu override refers to a missing Menu: ${menuId}.`, location);
      for (const menu of menus) check("composition.menu-override", () => validateMenu(applyMenuOverrides(menu, m.menuOverrides)), { ...location, menuId: menu.menuId });
      if (shell && m.route && m.routeId) check("composition.rendered-shell", () => {
        const params = Object.fromEntries([...m.route.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map((match) => [match[1] ?? match[2], "__parameter__"]));
        diagnostics.push(...validateArtifact(composeShellMenus(shell, definition, page, m.routeId, params), components, packages).map((d) => ({ ...d, code: "visual.validation", artifactId: m.artifactId })));
      }, location);
    }, location);
  }
  const menuIds = /* @__PURE__ */ new Set();
  for (const menu of menus) {
    check("composition.menu", () => validateMenu(menu), { menuId: menu.menuId });
    if (menuIds.has(menu.menuId)) issue("composition.menu-duplicate", "Duplicate Menu identity.", { menuId: menu.menuId });
    menuIds.add(menu.menuId);
    const targets = (items) => {
      for (const item of items) {
        const destination = item.destination;
        if (destination?.kind === "page" && pages.filter((page) => page.metadata.artifactId === destination.pageId).length !== 1 || destination?.kind === "route" && routes.filter((route) => route.routeId === destination.routeId).length !== 1) issue("composition.menu-target", `Menu ${menu.menuId} item ${item.itemId} has a missing or ambiguous destination.`, { menuId: menu.menuId });
        targets(item.children ?? []);
      }
    };
    check("composition.menu-target", () => targets(menu.items), { menuId: menu.menuId });
  }
  check("composition.theme", () => {
    themeCss(settings);
  });
  for (const [shellId, values] of Object.entries(settings.shellConfiguration ?? {})) {
    check("composition.shell-configuration", () => {
      const shell = shells.find((shell2) => shell2.metadata.artifactId === shellId);
      if (!shell) {
        issue("composition.shell-configuration", "Shell configuration target is missing.");
        return;
      }
      for (const [name, value] of Object.entries(values)) {
        const location = { artifactId: shellId, field: name };
        const contract = shell.metadata.public?.properties[name];
        if (!contract) {
          issue("composition.shell-property", `Unknown Shell property: ${name}.`, location);
          continue;
        }
        for (const message of valueErrors(value, contract, name)) issue("composition.shell-property", message, location);
      }
    }, { artifactId: shellId });
  }
  return diagnostics;
}
function validateCompositionDefinition(definition, components, packages = []) {
  const error = compositionDiagnostics(definition, components, packages).find((d) => d.severity === "error");
  if (error) throw new Error(error.message);
}
var init_composition_validation = __esm({
  "packages/visual-artifacts/src/composition-validation.ts"() {
    "use strict";
    init_validation();
    init_page_admission();
    init_page_links();
    init_composition();
    init_model();
  }
});

// packages/visual-artifacts/src/index.ts
var init_src = __esm({
  "packages/visual-artifacts/src/index.ts"() {
    init_model();
    init_source();
    init_page_links();
    init_page_admission();
    init_duplicate_section();
    init_expression();
    init_validation();
    init_form();
    init_composition();
    init_composition_validation();
  }
});

// src/server/visual-candidate.ts
import path2 from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { transform } from "esbuild";
async function validateVisualRoleSyntax(files) {
  if (!files.source.trim()) throw new Error("HTML source is missing or empty. Keep an explicit empty Region or Shell-default comment where appropriate.");
  JSON.parse(files.fixtures || "{}");
  compileVisualFunctions(files.code);
  await validateRuntimeFunctionSource(files.code);
  const css = await transform(files.css, { loader: "css", logLevel: "silent" });
  if (css.warnings.length) throw new Error("CSS source is incomplete or invalid: " + css.warnings.map((warning) => warning.text).join(" "));
}
async function prepareVisualCandidate(appKey, kind, locator, packages, allowShellChange = false, validatedSyntax) {
  const root2 = appPath(appKey), workspace = await visualWorkspace(appKey, packages);
  const compositionFiles = /* @__PURE__ */ new Map();
  const read = async (relative) => {
    const text = await readFile(path2.join(root2, relative), "utf8");
    compositionFiles.set(relative, text);
    return text;
  };
  const settingsText = await read("app.settings.json");
  const settings = JSON.parse(settingsText).presentation;
  let definition;
  if (settings?.model === "composition-v1") {
    const menus = [];
    for (const name of await readdir(path2.join(root2, "menus"))) if (name.endsWith(".json")) menus.push(JSON.parse(await read("menus/" + name)));
    const siteCss = (await Promise.all(settings.siteStyles.map((file) => read(file)))).join("\n");
    definition = { settings, menus, siteCss, pages: [], shells: [], routes: [] };
  }
  const old = (kind === "page" ? workspace.pages : kind === "shell" ? workspace.shells : workspace.components).find((bundle) => bundle.locator === locator);
  const known = kind === "component" ? await knownVisualArtifacts() : [];
  const records = [
    ...workspace.pages.map((bundle) => ({ bundle, service: new VisualArtifactService(path2.join(root2, "src/pages"), "page"), kind: "page" })),
    ...workspace.shells.map((bundle) => ({ bundle, service: new VisualArtifactService(path2.join(root2, "shells"), "shell"), kind: "shell" })),
    ...workspace.components.map((bundle) => ({ bundle, service: new VisualArtifactService(platformComponentsRoot, "component"), kind: "component" }))
  ];
  return {
    async validate(candidate) {
      try {
        if (JSON.stringify(candidate.files) !== validatedSyntax) await validateVisualRoleSyntax(candidate.files);
        if (!candidate.metadata || parseMetadata(candidate.files.metadata).diagnostics.some((d) => d.severity === "error")) throw new Error("Correct the complete metadata candidate before saving.");
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
            if (old.metadata?.route) assertPageUnused(old.metadata.route, pages, "");
          } else if (workspace.pages.some((page) => page.locator !== locator && page.metadata?.route === candidate.metadata.route)) throw new Error("Duplicate saved Page route.");
          validatePageLinks(old.files.source, candidate.files.source, pages, { allowComposed: !!definition });
        }
        const components = replace(workspace.components, "component").map(toRuntime).filter((item) => !!item);
        const runtime = toRuntime(candidate);
        const errors = validateArtifact(runtime, components, packages).filter((d) => d.severity === "error");
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
          for (const id of affected) for (const bundle of known) if (bundle.metadata && bundle.metadata.artifactId !== candidate.metadata.artifactId && (componentReferences(bundle.files.source).includes(id) || bundle.metadata.dependencies?.includes(id))) {
            if (validateArtifact(toRuntime(bundle), components, packages).some((d) => d.severity === "error")) throw new Error("This change would invalidate a dependent artifact. Keep the Component interface compatible.");
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
      for (const [file, text] of compositionFiles) if (await readFile(path2.join(root2, file), "utf8") !== text) throw Object.assign(new Error("Composition source changed during candidate validation."), { status: 409 });
    }
  };
}
var VisualCandidateError;
var init_visual_candidate = __esm({
  "src/server/visual-candidate.ts"() {
    "use strict";
    init_capture_boundaries();
    init_src();
    init_capture_boundaries();
    init_capture_boundaries();
    init_capture_boundaries();
    init_src();
    VisualCandidateError = class extends Error {
      status = 422;
      code = "source.validation";
    };
  }
});

// tests/mixed-page-admission/capture.test.ts
init_visual_candidate();
import fs from "node:fs";
import path8 from "node:path";
import assert2 from "node:assert/strict";
import { createHash as createHash4 } from "node:crypto";

// src/server/application-composition.ts
init_src();
init_capture_boundaries();
import { createHash as createHash3 } from "node:crypto";
import { lstat as lstat4, mkdir as mkdir3, readFile as readFile6, readdir as readdir4, writeFile, rename as rename2 } from "node:fs/promises";
import { randomUUID as randomUUID3 } from "node:crypto";
import path7 from "node:path";

// src/server/json-files.ts
import { readFile as readFile5 } from "node:fs/promises";

// packages/artifacts/dist/file-operations.js
import { mkdir, open, rename, rm } from "node:fs/promises";
import path3 from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// packages/artifacts/dist/role-bundle.js
import path6 from "node:path";
import { lstat as lstat3, realpath as realpath2, readdir as readdir3, readFile as readFile4 } from "node:fs/promises";
import { appendFileSync } from "node:fs";

// packages/artifacts/dist/bundle.js
import { readdir as readdir2, readFile as readFile2, lstat, realpath } from "node:fs/promises";
import path4 from "node:path";
import { createHash } from "node:crypto";

// packages/artifacts/dist/storage.js
import { mkdir as mkdir2, open as open2, readFile as readFile3, rm as rm2, lstat as lstat2, link, chmod } from "node:fs/promises";
import path5 from "node:path";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay2 } from "node:timers/promises";
var heldLocks = new AsyncLocalStorage();

// src/server/application-composition.ts
init_capture_boundaries();
init_capture_boundaries();
init_capture_boundaries();
init_src();
import { transform as transform2 } from "esbuild";
var hash = (text) => createHash3("sha256").update(text).digest("hex");
async function compositionSettings(appKey) {
  const settings = JSON.parse(await readFile6(path7.join(appPath(appKey), "app.settings.json"), "utf8"));
  return settings.presentation?.model === "composition-v1" ? settings.presentation : void 0;
}
async function compositionWorkspace(appKey, packages = [], candidate, options = {}) {
  options = { ...options };
  const settings = candidate?.path === "app.settings.json" ? JSON.parse(candidate.content).presentation : await compositionSettings(appKey);
  if (!settings || settings.model !== "composition-v1") return null;
  if (settings.assetsRoot !== "assets" || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) throw new Error("Composition requires branding, source styles and the Application assets root.");
  const app = appPath(appKey);
  const reads = [new VisualArtifactService(path7.join(app, "shells"), "shell").list(options), new VisualArtifactService(path7.join(app, "src/pages"), "page").list(options)];
  const [shells, pages] = await Promise.all(reads).catch(async (error) => {
    if (options.recovery === "refuse") await Promise.allSettled(reads);
    throw error;
  });
  const menus = [];
  const read = async (relative) => candidate?.path === relative ? candidate.content : (await readCompositionSource(appKey, relative)).content;
  const menuFiles = new Set(await readdir4(path7.join(app, "menus")).catch(() => []));
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
    const errors = validateArtifact(artifact, components, packages).filter((diagnostic) => diagnostic.severity === "error");
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
    const errors = validateArtifact(renderedShell, components, packages).filter((diagnostic) => diagnostic.severity === "error");
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
  let current = path7.resolve(appPath(appKey));
  for (let ancestor = current; ; ancestor = path7.dirname(ancestor)) {
    const info = await lstat4(ancestor).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition roots cannot contain symlinks.");
    if (path7.dirname(ancestor) === ancestor) break;
  }
  for (const segment of relative.split("/")) {
    current = path7.join(current, segment);
    const info = await lstat4(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (info?.isSymbolicLink()) throw new Error("Composition source paths cannot contain symlinks.");
  }
  return current;
}
async function compositionAssetInfo(appKey, relative) {
  if (!relative.startsWith("assets/")) throw new Error("Application asset path required.");
  const content = await readFile6(await compositionSourcePath(appKey, relative)).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return { path: relative, hash: content ? createHash3("sha256").update(content).digest("hex") : null };
}
async function readCompositionSource(appKey, relative) {
  const content = await readFile6(await compositionSourcePath(appKey, relative), "utf8");
  return { path: relative, content, hash: hash(content) };
}

// src/server/visual-preview.ts
init_capture_boundaries();
init_capture_boundaries();
init_src();
init_capture_boundaries();
init_capture_boundaries();
init_capture_boundaries();
function isolatedPreviewCode(bundle) {
  assertIsolatedPreviewFunctions(bundle.files.code);
  return compileVisualFunctions(bundle.files.code);
}
function visualPreviewRevision(key, kind, locator, expectedHash, authorizeRelated = async () => {
}, options = {}) {
  options = { ...options };
  return withRuntimeGraphRead(platformComponentsRoot, async () => {
    const packages = await discoverComponents(key), workspace = await visualWorkspace(key, packages, options);
    const selected = (kind === "page" ? workspace.pages : kind === "shell" ? workspace.shells : kind === "component" ? workspace.components : []).find((bundle) => bundle.locator === locator);
    if (!selected || selected.hash !== expectedHash) throw Object.assign(new Error("Preview source changed. Reload its complete revision before previewing."), { status: 409 });
    const composition = kind === "page" || kind === "shell" ? await compositionWorkspace(key, packages, void 0, options) : null;
    const shells = composition ? workspace.shells.filter((shell) => shell.metadata?.artifactId === (kind === "shell" ? selected.metadata?.artifactId : selected.metadata?.shellId)) : [];
    const required = new Set([selected, ...shells].flatMap((bundle) => [...componentReferences(bundle.files.source), ...bundle.metadata?.dependencies ?? []]));
    const components = [];
    for (const id of required) {
      const component = workspace.components.find((bundle) => bundle.metadata?.componentId === id);
      if (!component) continue;
      components.push(component);
      for (const nested of [...componentReferences(component.files.source), ...component.metadata?.dependencies ?? []]) required.add(nested);
    }
    const participating = [selected, ...components, ...shells];
    if (composition) await authorizeRelated("shell");
    if (components.length || kind === "component") await authorizeRelated("component");
    if (participating.some((bundle) => !bundle.metadata || bundle.diagnostics.some((d) => d.severity === "error"))) throw Object.assign(new Error("Correct the complete preview graph before loading this revision."), { status: 422 });
    const code = Object.fromEntries(participating.map((bundle) => [bundle.hash, isolatedPreviewCode(bundle)]));
    const next = await visualWorkspace(key, packages, options);
    for (const bundle of participating) if (![...next.pages, ...next.shells, ...next.components].some((item) => item.locator === bundle.locator && item.hash === bundle.hash)) throw Object.assign(new Error("Preview dependency changed while capturing its revision."), { status: 409 });
    if (composition && JSON.stringify(await compositionWorkspace(key, packages, void 0, options)) !== JSON.stringify(composition)) throw Object.assign(new Error("Preview composition changed while capturing its revision."), { status: 409 });
    return { bundle: selected, packages: workspace.packages, components, shells, composition: composition && (kind === "shell" || selected.metadata && pageAdmissionKind(selected.metadata) === "composed") ? { ...composition, pages: kind === "page" ? composition.pages.filter((page) => page.metadata.artifactId === selected.metadata?.artifactId) : [], shells: composition.shells.filter((shell) => shells.some((bundle) => bundle.metadata?.artifactId === shell.metadata.artifactId)) } : null, code };
  }, options);
}

// tests/mixed-page-admission/capture.test.ts
init_capture_boundaries();
init_page_admission();
async function verifyCaptures(output) {
  const ev = path8.resolve("evidence/v1-mixed-page-admission-20261028"), rows = JSON.parse(fs.readFileSync(path8.join(ev, "baseline.json"), "utf8"));
  const text = (p) => fs.readFileSync(path8.join(ev, "before", rows.find((r) => r.path === p).sha256), "utf8");
  const packages = JSON.parse(fs.readFileSync("evidence/v1-anchor-navigation-20261028/normal-authorized-preview-response.json", "utf8")).packages;
  const base = rows.filter((r) => r.path.includes("\\apps\\v1-identity-fixture\\src\\pages\\") && r.path.endsWith("page.visual.json")).map((r) => ({ metadata: JSON.parse(text(r.path)), source: text(r.path.replace(".visual.json", ".html")), css: text(r.path.replace(".visual.json", ".css")) }));
  const shell = { metadata: { schemaVersion: 1, artifactId: "art_fixture_shell", kind: "shell", name: "fixture-shell", displayName: "Fixture Shell" }, source: '<main data-uip-node="shell_main" class="uip-layout-item" data-uip-region="region-main"></main>', css: "" };
  const bundle = (a) => {
    const files = { source: a.source, css: a.css, metadata: JSON.stringify(a.metadata), fixtures: "{}", code: "export {};" };
    return { locator: a.metadata.name + "/" + a.metadata.kind + ".visual.json", metadata: a.metadata, files, hash: createHash4("sha256").update(JSON.stringify(files)).digest("hex"), diagnostics: [] };
  };
  const results = [];
  for (const names of [[], ["home", "about", "contact"], base.map((p) => p.metadata.name)]) {
    const fixture = fs.mkdtempSync(path8.join(output, "capture-fixture-")), app = path8.join(fixture, "application");
    fs.mkdirSync(path8.join(app, "menus"), { recursive: true });
    fs.writeFileSync(path8.join(app, "app.settings.json"), JSON.stringify({ presentation: { model: "composition-v1", assetsRoot: "assets", defaultShellId: shell.metadata.artifactId, branding: { applicationName: "Fixture" }, theme: {}, siteStyles: [] } }));
    const pages = structuredClone(base);
    for (const p of pages) if (names.includes(p.metadata.name)) {
      p.metadata.shellId = shell.metadata.artifactId;
      p.metadata.routeId = "route_" + p.metadata.name;
      p.source = `<main data-uip-node="region_${p.metadata.name}" class="uip-layout-item" data-uip-region="region-main">${p.source}</main>`;
    }
    const state2 = { pages: pages.map(bundle), shells: [bundle(shell)], components: [], packages };
    configureFixture(fixture, state2);
    const graph = await compositionWorkspace("fixture", packages, void 0, { recovery: "refuse" });
    assert2.equal(graph.pages.length, 13);
    assert2.equal(graph.routes.length, 13);
    assert2.equal(graph.pages.filter((p) => pageAdmissionKind(p.metadata) === "composed").length, names.length);
    const checked = [];
    for (const name of ["home", "about", "contact", "v1-anchor-navigation-20261028"]) {
      const b = state2.pages.find((p) => p.metadata.name === name);
      const authorized = [];
      const preview = await visualPreviewRevision("fixture", "page", b.locator, b.hash, async (kind) => {
        authorized.push(kind);
      }, { recovery: "refuse" });
      assert2.equal(preview.bundle.hash, b.hash);
      assert2.equal(!!preview.composition, names.includes(name));
      assert2.deepEqual(authorized, ["shell"]);
      checked.push({ name, kind: pageAdmissionKind(preview.bundle.metadata), composition: !!preview.composition });
    }
    const home = state2.pages.find((p) => p.metadata.name === "home");
    const prepared = await prepareVisualCandidate("fixture", "page", home.locator, packages, false, JSON.stringify(home.files));
    await prepared.validate(home);
    const bad = structuredClone(home);
    bad.files.source = bad.files.source.replace('href="/about"', 'href="/missing"');
    const invalid = await prepareVisualCandidate("fixture", "page", home.locator, packages, false, JSON.stringify(bad.files));
    await assert2.rejects(invalid.validate(bad), /missing|destination/);
    await assert2.rejects(visualPreviewRevision("fixture", "page", home.locator, home.hash, async () => {
      throw Error("READ_AUTHORITY_DENIED");
    }, { recovery: "refuse" }), /READ_AUTHORITY_DENIED/);
    await assert2.rejects(visualPreviewRevision("fixture", "page", home.locator, "stale", async () => {
    }, { recovery: "refuse" }), /changed/);
    results.push({ composed: names.length, pages: graph.pages.length, checked, recoveryRefusingCalls: calls.length });
  }
  fs.writeFileSync(path8.join(output, "capture-results.json"), JSON.stringify({ passed: true, scope: "Actual compositionWorkspace, visualPreviewRevision and prepareVisualCandidate with detached role bundles and recovery-refusing read/graph doubles; candidate syntax reuse is test-only; no operational source or plugin launch", results, deniedAuthority: true, staleRevision: true, normalCandidateValidAndDanglingRefused: true }, null, 2));
  return results;
}
export {
  verifyCaptures
};
