// tests/source-identity/parser-hardening.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
var escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
var decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
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
function serializeSource(source) {
  return source;
}
function setNodeAttribute(source, id, name, value) {
  if (!/^[\w:-]+$/.test(name)) throw new Error("Invalid attribute name.");
  const parsed = parseSource(source);
  if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) throw new Error("Repair source structure before editing attributes.");
  const node = parsed.nodes.find((n) => n.id === id);
  if (!node || node.manual || parsed.nodes.filter((n) => n.id === id).length !== 1) throw new Error("Select an unambiguous editor-managed node.");
  const opening = source.slice(node.start, node.openEnd);
  const identityName = /^(data-uip-node|data-uip-component)$/i.test(name);
  const pattern = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`, identityName ? "i" : "");
  const attr = ` ${name}="${escapeAttribute(value)}"`;
  const next = pattern.test(opening) ? opening.replace(pattern, () => attr) : opening.replace(/\s*\/?>$/, (end) => attr + end);
  return source.slice(0, node.start) + next + source.slice(node.openEnd);
}
function insertNode(source, tag, componentId, parentId, newId = () => `node_${globalThis.crypto.randomUUID()}`, slot) {
  if (!/^[a-z][a-z0-9-]*$/.test(tag) || ["script", "style", "iframe"].includes(tag)) throw new Error("Unsupported insertion tag.");
  const parsed = parseSource(source);
  if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before inserting.");
  const parent = parentId ? parsed.nodes.find((n) => n.id === parentId) : void 0;
  if (parentId && (!parent || parent.attributes["data-uip-component"] && slot === void 0 || voidTags.has(parent.tag))) throw new Error("Insert into an ordinary HTML container or layout wrapper.");
  const offset = parent?.closeStart ?? source.length;
  const markup = `
<div class="uip-layout-item" data-uip-node="${newId()}"${slot !== void 0 ? ` slot="${escapeAttribute(slot)}"` : ""}>
  <${tag} data-uip-node="${newId()}"${componentId ? ` data-uip-component="${escapeAttribute(componentId)}"` : ""}>${voidTags.has(tag) ? "" : `</${tag}>`}
</div>
`;
  return source.slice(0, offset) + markup + source.slice(offset);
}
function moveNode(source, id, direction) {
  const parsed = parseSource(source);
  if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before moving.");
  const selected = parsed.nodes.find((n) => n.id === id);
  const node = isWrapper(selected?.parent) ? selected.parent : selected;
  if (!node || !node.id) throw new Error("Select a managed layout node.");
  const siblings = parsed.nodes.filter((n) => n.parent === node.parent);
  const adjacent = siblings[siblings.indexOf(node) + (direction === "up" ? -1 : 1)];
  if (!adjacent) return source;
  if (!adjacent.id || adjacent.manual) throw new Error("Move only between managed siblings; edit manual regions in source.");
  const [first, second] = node.start < adjacent.start ? [node, adjacent] : [adjacent, node];
  return source.slice(0, first.start) + source.slice(second.start, second.end) + source.slice(first.end, second.start) + source.slice(first.start, first.end) + source.slice(second.end);
}

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
function packageSettingErrors(definition2, settings) {
  const contracts = definition2.builder.settings, values = {};
  for (const [key, contract] of Object.entries(contracts)) values[key] = settings[key] ?? contract.default;
  const errors = [];
  for (const [key, value] of Object.entries(settings)) if (!contracts[key]) errors.push(`Unknown installed Package setting: ${key}.`);
  for (const [key, contract] of Object.entries(contracts)) {
    errors.push(...valueErrors(values[key], contract, key));
    if (contract.visibleWhen && values[contract.visibleWhen.setting] !== contract.visibleWhen.equals && values[key] !== contract.default) errors.push(`${key} is not allowed in this interaction mode.`);
  }
  for (const rule of definition2.builder.validation ?? []) {
    if (rule.when && values[rule.when.setting] !== rule.when.equals) continue;
    if (rule.kind === "requiredWhen" && !String(values[rule.setting] ?? "").trim()) errors.push(`${rule.setting} is required.`);
    if (rule.kind === "oneOfRequiredWhen" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push(`One of ${rule.settings?.join(", ")} is required.`);
    if (rule.kind === "accessibleNameWhenInteractive" && values.interactionMode !== "none" && !rule.settings?.some((key) => String(values[key] ?? "").trim())) errors.push("Interactive components need an accessible name.");
  }
  return errors;
}
function readPackageSettings(definition2, attributes, stored) {
  const values = {};
  for (const [key, contract] of Object.entries(definition2.builder.settings)) {
    const binding = contract.binding;
    if (binding?.kind === "attribute" && binding.name && Object.hasOwn(attributes, binding.name)) {
      const value = attributes[binding.name];
      values[key] = contract.type === "boolean" ? value !== "false" : contract.type === "number" ? Number(value) : value;
    }
  }
  return { ...values, ...stored };
}

// ../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts
var deny = () => {
  throw new Error("EXPRESSION_INVALID");
};
var unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
var exact = (x, keys) => Object.keys(x).length === keys.length && keys.every((k) => Object.hasOwn(x, k));
function expressionDependencies(declaration) {
  const ids = /* @__PURE__ */ new Set();
  let count = 0;
  if (!declaration || !exact(declaration, ["version", "expression"]) || declaration.version !== 1) deny();
  const visit = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 24 || ++count > 256) deny();
    if (node.kind === "literal") {
      if (!exact(node, ["kind", "value"]) || !["string", "number", "boolean"].includes(typeof node.value) || typeof node.value === "number" && !Number.isFinite(node.value)) deny();
    } else if (node.kind === "field") {
      if (!exact(node, ["kind", "fieldId"]) || typeof node.fieldId !== "string" || !node.fieldId || unsafe.has(node.fieldId)) deny();
      ids.add(node.fieldId);
    } else if (node.kind === "operator") {
      if (!exact(node, ["kind", "operator", "args"]) || !["add", "subtract", "multiply", "divide", "concat", "eq", "lt", "gt", "and", "or", "not", "if"].includes(node.operator) || !Array.isArray(node.args) || node.args.length !== (node.operator === "not" ? 1 : node.operator === "if" ? 3 : 2)) deny();
      node.args.forEach((arg) => visit(arg, depth + 1));
    } else deny();
  };
  visit(declaration.expression, 0);
  return [...ids];
}
function expressionType(declaration, fields) {
  expressionDependencies(declaration);
  const infer = (node) => {
    if (node.kind === "literal") return typeof node.value;
    if (node.kind === "field") {
      const type = fields.get(node.fieldId);
      if (!type || !["string", "number", "boolean"].includes(type)) return deny();
      return type;
    }
    const types = node.args.map(infer), op = node.operator;
    if (op === "if") {
      if (types[0] !== "boolean" || types[1] !== types[2]) deny();
      return types[1];
    }
    if (op === "not" || op === "and" || op === "or") {
      if (types.some((t) => t !== "boolean")) deny();
      return "boolean";
    }
    if (op === "eq") {
      if (types[0] !== types[1]) deny();
      return "boolean";
    }
    if (op === "concat") {
      if (types.some((t) => t !== "string")) deny();
      return "string";
    }
    if (types.some((t) => t !== "number")) deny();
    return op === "lt" || op === "gt" ? "boolean" : "number";
  };
  return infer(declaration.expression);
}
function calculationOrder(calculations, fields) {
  const known = new Map(fields.map((f) => [f.fieldId, f.type])), byId = new Map(calculations.map((c) => [c.fieldId, c]));
  if (known.size !== fields.length || byId.size !== calculations.length) deny();
  const ordered = [], active = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
  const visit = (c) => {
    if (done.has(c.fieldId)) return;
    if (active.has(c.fieldId)) throw new Error("EXPRESSION_CYCLE");
    active.add(c.fieldId);
    if (typeof c.persist !== "boolean" || known.get(c.fieldId) !== c.type || expressionType(c.expression, known) !== c.type) deny();
    for (const id of expressionDependencies(c.expression)) {
      const next = byId.get(id);
      if (next) {
        if (c.persist && !next.persist) deny();
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

// packages/visual-artifacts/src/form.ts
function formCalculations(metadata) {
  return (metadata.form?.fields ?? []).flatMap((f) => f.calculation ? [{ fieldId: f.datasetFieldId, type: f.type, ...f.calculation }] : []);
}
function formExpressionFields(metadata) {
  return (metadata.form?.fields ?? []).map((f) => ({ fieldId: f.datasetFieldId, key: f.key, type: f.type, required: !!f.datasetRequired }));
}

// packages/visual-artifacts/src/validation.ts
function validateArtifact(artifact2, components = [], packages = [], services = []) {
  const diagnostics = [];
  const error = (message, node) => diagnostics.push({ severity: "error", message, node });
  const warning = (message, node) => diagnostics.push({ severity: "warning", message, node });
  const m = artifact2.metadata;
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
    const parsed = parseSource(artifact2.source);
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
    const visit = (current, path) => {
      const id = current.metadata.componentId ?? current.metadata.artifactId;
      if (path.includes(id)) {
        error(`Component dependency cycle: ${[...path, id].join(" \u2192 ")}.`);
        return;
      }
      for (const ref of /* @__PURE__ */ new Set([...componentReferences(current.source), ...current.metadata.dependencies ?? []])) {
        const next = components.find((c) => c.metadata.componentId === ref);
        if (next) visit(next, [...path, id]);
      }
    };
    visit(artifact2, []);
  } catch (cause) {
    error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return diagnostics;
}
function componentReferences(source) {
  return [...new Set(parseSource(source).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
}

// evidence/builder-v1-wp5-f-parser-hardening-20261025/source-before.ts.txt
var voidTags2 = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags2 = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags2 = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
var escapeAttribute2 = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
var decode2 = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
function parseSource2(source) {
  const nodes = [], stack = [], diagnostics = [];
  const implicitClose = (offset) => {
    const node = stack.pop();
    node.closeStart = offset;
    node.end = offset;
    node.manual = true;
    diagnostics.push({ severity: "warning", message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
  };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g;
  let match;
  while (match = token.exec(source)) {
    const raw = match[0];
    if (raw.startsWith("<!")) continue;
    const tag = /^<\/?([\w:-]+)/.exec(raw)[1].toLowerCase();
    if (raw.startsWith("</")) {
      while (stack.length && stack.at(-1).tag !== tag && optionalTags2.has(stack.at(-1).tag)) implicitClose(match.index);
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
      const closes = top === "p" && blockTags2.has(tag) || ["li", "option", "optgroup", "tr", "thead", "tbody", "tfoot"].includes(top) && top === tag || ["dt", "dd"].includes(top) && ["dt", "dd"].includes(tag) || ["td", "th"].includes(top) && ["td", "th"].includes(tag);
      if (!closes) break;
      implicitClose(match.index);
    }
    const attributes = {};
    const attrs = raw.slice(tag.length + 1, raw.length - 1);
    for (const attr of attrs.matchAll(/([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attributes[attr[1]] = decode2(attr[2] ?? attr[3] ?? attr[4] ?? "");
    const node = { id: attributes["data-uip-node"], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes["data-uip-node"] };
    node.parent?.children.push(node);
    nodes.push(node);
    if (["script", "style", "textarea"].includes(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, "ig");
      close.lastIndex = token.lastIndex;
      const ending = close.exec(source);
      if (ending) {
        node.closeStart = ending.index;
        node.end = close.lastIndex;
        token.lastIndex = close.lastIndex;
      } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags2.has(tag) && !raw.endsWith("/>")) stack.push(node);
  }
  while (stack.length && optionalTags2.has(stack.at(-1).tag)) implicitClose(source.length);
  for (const node of stack) diagnostics.push({ severity: "error", message: `Unclosed ${node.tag}.` });
  const ids = /* @__PURE__ */ new Set();
  for (const node of nodes) if (node.id) {
    if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: "error", message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
    ids.add(node.id);
    if (!isWrapper2(node) && !isWrapper2(node.parent)) diagnostics.push({ severity: "warning", message: "Layout is manual because this node has no Builder wrapper.", node: node.id });
  }
  return { nodes, diagnostics };
}
function isWrapper2(node) {
  return Boolean(node?.attributes.class?.split(/\s+/).includes("uip-layout-item"));
}
function setNodeAttribute2(source, id, name, value) {
  if (!/^[\w:-]+$/.test(name)) throw new Error("Invalid attribute name.");
  const parsed = parseSource2(source);
  const node = parsed.nodes.find((n) => n.id === id);
  if (!node || node.manual || parsed.nodes.filter((n) => n.id === id).length !== 1) throw new Error("Select an unambiguous editor-managed node.");
  const opening = source.slice(node.start, node.openEnd);
  const pattern = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`);
  const attr = ` ${name}="${escapeAttribute2(value)}"`;
  const next = pattern.test(opening) ? opening.replace(pattern, () => attr) : opening.replace(/\s*\/?>$/, (end) => attr + end);
  return source.slice(0, node.start) + next + source.slice(node.openEnd);
}

// ../ui-base/packages/ui-base-ui/ui.component.json
var ui_component_default = {
  components: [
    {
      tagName: "uib-heading",
      module: "./src/content/uib-heading.js",
      importPath: "./heading",
      presentation: {
        settings: {
          size: {
            type: "select",
            options: [
              "compact",
              "default",
              "large"
            ],
            inheritable: true
          },
          align: {
            type: "select",
            options: [
              "start",
              "center",
              "end"
            ],
            inheritable: true
          }
        }
      }
    },
    {
      tagName: "uib-heading-block",
      module: "./src/content/uib-heading-block.js",
      importPath: "./heading-block",
      presentation: {
        settings: {
          size: {
            type: "select",
            options: [
              "compact",
              "default",
              "large"
            ],
            inheritable: true
          },
          align: {
            type: "select",
            options: [
              "start",
              "center",
              "end"
            ],
            inheritable: true
          }
        }
      }
    },
    {
      tagName: "uib-card",
      module: "./src/layout/uib-card.js",
      importPath: "./card",
      presentation: {
        settings: {
          variant: {
            type: "select",
            options: [
              "elevated",
              "outlined",
              "flat"
            ],
            inheritable: true
          },
          density: {
            type: "select",
            options: [
              "comfortable",
              "compact"
            ],
            inheritable: true
          }
        },
        parts: [
          "base",
          "media",
          "header",
          "body",
          "footer"
        ],
        cssVariables: [
          "--uib-color-ink",
          "--uib-font-family-sans",
          "--uib-color-border",
          "--uib-radius-lg",
          "--uib-color-surface",
          "--uib-color-surface-soft",
          "--uib-shadow-sm",
          "--uib-space-3",
          "--uib-space-4",
          "--uib-focus-ring",
          "--uib-color-primary"
        ]
      },
      schemaVersion: "1.0.0",
      identity: {
        componentId: "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1",
        name: "card",
        displayName: "Card",
        description: "Repeatable content surface with optional link, action and selection behavior."
      },
      ownership: {
        scope: "platform",
        package: {
          packageId: "@ui-base/ui",
          scope: "platform",
          version: "0.5.1"
        },
        provenance: {
          origin: "installed-package",
          promotedFromComponentId: null,
          promotedFromRevisionId: null
        }
      },
      implementation: {
        type: "code",
        tagName: "uib-card",
        module: "./src/layout/uib-card.js",
        importPath: "@ui-base/ui/card",
        exportName: "UibCard",
        runtimeBinding: {
          kind: "custom-element",
          tagName: "uib-card"
        },
        aliases: [
          {
            importPath: "@ui-base/ui",
            exportName: "UibCard"
          },
          {
            importPath: "@ui-base/ui/layout",
            exportName: "UibCard"
          }
        ],
        registrationSideEffects: [
          "uib-stack",
          "uib-grid",
          "uib-row",
          "uib-column",
          "uib-panel",
          "uib-card",
          "uib-dialog",
          "uib-accordion",
          "uib-tab",
          "uib-tab-panel",
          "uib-tabs",
          "uib-splitter",
          "uib-icon"
        ]
      },
      version: {
        packageVersion: "0.5.1",
        runtimeCompatibility: "^0.5.1",
        revisionId: null
      },
      maturity: "experimental",
      category: "content-surfaces",
      runtime: {
        attributes: {
          name: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          label: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          help: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          "help-mode": {
            type: "string",
            default: "tooltip",
            observed: true,
            serialization: "string"
          },
          title: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          disabled: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          readonly: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          required: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          hidden: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          invalid: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          error: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          "css-class": {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          "aria-label": {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          "aria-describedby": {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          heading: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          variant: {
            type: "string",
            default: "elevated",
            observed: true,
            serialization: "string",
            enum: [
              "elevated",
              "outlined",
              "flat"
            ]
          },
          density: {
            type: "string",
            default: "comfortable",
            observed: true,
            serialization: "string",
            enum: [
              "comfortable",
              "compact"
            ]
          },
          href: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          target: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          rel: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          action: {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          "action-token": {
            type: "string",
            default: "",
            observed: true,
            serialization: "string"
          },
          interactive: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          selectable: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          },
          selected: {
            type: "boolean",
            default: false,
            observed: true,
            serialization: "presence"
          }
        },
        properties: {
          name: {
            type: "string",
            attribute: "name",
            writable: true,
            default: ""
          },
          label: {
            type: "string",
            attribute: "label",
            writable: true,
            default: ""
          },
          help: {
            type: "string",
            attribute: "help",
            writable: true,
            default: ""
          },
          helpMode: {
            type: "string",
            attribute: "help-mode",
            writable: true,
            default: "tooltip"
          },
          titleText: {
            type: "string",
            attribute: "title",
            writable: true,
            default: ""
          },
          disabled: {
            type: "boolean",
            attribute: "disabled",
            writable: true,
            default: false
          },
          readonly: {
            type: "boolean",
            attribute: "readonly",
            writable: true,
            default: false
          },
          required: {
            type: "boolean",
            attribute: "required",
            writable: true,
            default: false
          },
          hidden: {
            type: "boolean",
            attribute: "hidden",
            writable: true,
            default: false
          },
          invalid: {
            type: "boolean",
            attribute: "invalid",
            writable: true,
            default: false
          },
          error: {
            type: "string",
            attribute: "error",
            writable: true,
            default: ""
          },
          cssClass: {
            type: "string",
            attribute: "css-class",
            writable: true,
            default: ""
          },
          ariaLabel: {
            type: "string",
            attribute: "aria-label",
            writable: false,
            default: ""
          },
          ariaDescribedBy: {
            type: "string",
            attribute: "aria-describedby",
            writable: false,
            default: ""
          },
          heading: {
            type: "string",
            attribute: "heading",
            writable: false,
            default: "",
            fallback: "label"
          },
          variant: {
            type: "string",
            attribute: "variant",
            writable: false,
            default: "elevated",
            normalization: "lowercase-or-default"
          },
          density: {
            type: "string",
            attribute: "density",
            writable: false,
            default: "comfortable",
            normalization: "exact-compact-or-default"
          },
          href: {
            type: "string",
            attribute: "href",
            writable: false,
            default: ""
          },
          target: {
            type: "string",
            attribute: "target",
            writable: false,
            default: ""
          },
          rel: {
            type: "string",
            attribute: "rel",
            writable: false,
            default: ""
          },
          action: {
            type: "string",
            attribute: "action",
            writable: false,
            default: ""
          },
          actionToken: {
            type: "string",
            attribute: "action-token",
            writable: false,
            default: ""
          },
          interactive: {
            type: "boolean",
            attribute: "interactive",
            writable: false,
            default: false,
            computedFrom: [
              "interactive",
              "href",
              "action",
              "action-token",
              "selectable"
            ]
          },
          selectable: {
            type: "boolean",
            attribute: "selectable",
            writable: false,
            default: false
          },
          selected: {
            type: "boolean",
            attribute: "selected",
            writable: true,
            default: false,
            programmaticSetEmits: false
          },
          componentId: {
            type: "string",
            writable: false,
            role: "runtime-instance-id"
          }
        },
        events: {
          change: {
            detail: {
              name: "string",
              oldValue: "boolean",
              newValue: "boolean",
              selected: "boolean"
            },
            bubbles: true,
            composed: true,
            cancelable: false,
            selectionAliasOf: "uib-card-select",
            order: 1
          },
          "uib-card-select": {
            detail: {
              name: "string",
              oldValue: "boolean",
              newValue: "boolean",
              selected: "boolean"
            },
            bubbles: true,
            composed: true,
            cancelable: false,
            order: 2
          },
          "uib-card-action": {
            detail: {
              name: "string",
              action: "string",
              actionToken: "string",
              selected: "boolean"
            },
            bubbles: true,
            composed: true,
            cancelable: true,
            order: 3,
            cancellation: "prevent-original-event-default-after-selection"
          }
        },
        slots: [
          {
            name: "default",
            content: "text-or-elements"
          },
          {
            name: "media",
            content: "text-or-elements"
          },
          {
            name: "header",
            content: "text-or-elements"
          },
          {
            name: "footer",
            content: "text-or-elements"
          }
        ]
      },
      children: {
        runtime: "unrestricted-for-compatibility",
        builder: {
          content: [
            "text",
            "image"
          ],
          nestedInteractiveInLink: false
        }
      },
      builder: {
        groups: [
          {
            id: "content",
            label: "Content"
          },
          {
            id: "appearance",
            label: "Appearance"
          },
          {
            id: "interaction",
            label: "Interaction"
          },
          {
            id: "state",
            label: "State"
          },
          {
            id: "accessibility",
            label: "Accessibility"
          },
          {
            id: "events",
            label: "Event bindings"
          }
        ],
        definitionSettings: {
          displayName: {
            label: "Display name",
            type: "string",
            required: true,
            binding: {
              kind: "definition",
              path: "identity.displayName"
            }
          },
          description: {
            label: "Description",
            type: "string",
            editor: "textarea",
            binding: {
              kind: "definition",
              path: "identity.description"
            }
          }
        },
        settings: {
          heading: {
            label: "Heading",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "attribute",
              name: "heading"
            }
          },
          label: {
            label: "Fallback label",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "attribute",
              name: "label"
            }
          },
          body: {
            label: "Body",
            type: "string",
            group: "content",
            default: "Card body",
            binding: {
              kind: "slot",
              name: "default",
              content: "text"
            },
            editor: "textarea"
          },
          header: {
            label: "Header content",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "slot",
              name: "header",
              content: "text"
            }
          },
          footer: {
            label: "Footer",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "slot",
              name: "footer",
              content: "text"
            }
          },
          mediaSrc: {
            label: "Image URL",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "slot",
              name: "media",
              content: "image",
              altSetting: "mediaAlt"
            },
            format: "image-url"
          },
          mediaAlt: {
            label: "Image description",
            type: "string",
            group: "content",
            default: "",
            binding: {
              kind: "slotMetadata",
              slot: "media",
              name: "alt"
            }
          },
          variant: {
            label: "Variant",
            type: "string",
            group: "appearance",
            default: "elevated",
            binding: {
              kind: "attribute",
              name: "variant"
            },
            editor: "select",
            enum: [
              "elevated",
              "outlined",
              "flat"
            ]
          },
          density: {
            label: "Density",
            type: "string",
            group: "appearance",
            default: "comfortable",
            binding: {
              kind: "attribute",
              name: "density"
            },
            editor: "select",
            enum: [
              "comfortable",
              "compact"
            ]
          },
          cssClass: {
            label: "CSS classes",
            type: "string",
            group: "appearance",
            default: "",
            binding: {
              kind: "attribute",
              name: "css-class"
            }
          },
          interactionMode: {
            label: "Interaction mode",
            type: "string",
            group: "interaction",
            default: "none",
            binding: {
              kind: "mode"
            },
            editor: "select",
            enum: [
              "none",
              "link",
              "action",
              "selectable"
            ]
          },
          href: {
            label: "Link URL",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "href"
            },
            format: "url",
            visibleWhen: {
              setting: "interactionMode",
              equals: "link"
            }
          },
          target: {
            label: "Link target",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "target"
            },
            editor: "select",
            enum: [
              "",
              "_self",
              "_blank",
              "_parent",
              "_top"
            ],
            visibleWhen: {
              setting: "interactionMode",
              equals: "link"
            }
          },
          rel: {
            label: "Link relationship",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "rel"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "link"
            }
          },
          action: {
            label: "Action",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "action"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "action"
            }
          },
          actionToken: {
            label: "Action token",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "action-token"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "action"
            }
          },
          selected: {
            label: "Initially selected",
            type: "boolean",
            group: "state",
            default: false,
            binding: {
              kind: "attribute",
              name: "selected"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "selectable"
            }
          },
          disabled: {
            label: "Disabled",
            type: "boolean",
            group: "state",
            default: false,
            binding: {
              kind: "attribute",
              name: "disabled"
            }
          },
          name: {
            label: "Event name",
            type: "string",
            group: "interaction",
            default: "",
            binding: {
              kind: "attribute",
              name: "name"
            }
          },
          ariaLabel: {
            label: "Accessible name",
            type: "string",
            group: "accessibility",
            default: "",
            binding: {
              kind: "attribute",
              name: "aria-label"
            }
          },
          ariaDescribedBy: {
            label: "Description IDs",
            type: "string",
            group: "accessibility",
            default: "",
            binding: {
              kind: "attribute",
              name: "aria-describedby"
            }
          },
          actionHandler: {
            label: "Action handler ID",
            type: "string",
            group: "events",
            default: "",
            binding: {
              kind: "event",
              name: "uib-card-action"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "action"
            }
          },
          selectionHandler: {
            label: "Selection handler ID",
            type: "string",
            group: "events",
            default: "",
            binding: {
              kind: "event",
              name: "uib-card-select"
            },
            visibleWhen: {
              setting: "interactionMode",
              equals: "selectable"
            }
          }
        },
        interactionModes: {
          none: {
            attributes: {
              interactive: false,
              selectable: false
            }
          },
          link: {
            attributes: {
              interactive: false,
              selectable: false
            }
          },
          action: {
            attributes: {
              interactive: true,
              selectable: false
            }
          },
          selectable: {
            attributes: {
              interactive: false,
              selectable: true
            }
          }
        },
        validation: [
          {
            kind: "requiredWhen",
            setting: "href",
            when: {
              setting: "interactionMode",
              equals: "link"
            }
          },
          {
            kind: "oneOfRequiredWhen",
            settings: [
              "action",
              "actionToken"
            ],
            when: {
              setting: "interactionMode",
              equals: "action"
            }
          },
          {
            kind: "accessibleNameWhenInteractive",
            settings: [
              "heading",
              "label",
              "header",
              "ariaLabel"
            ]
          }
        ],
        responsive: {
          supported: false
        },
        preview: {
          renderer: "runtimeBinding",
          navigation: "prevent",
          eventHandlers: "observe-only"
        },
        eventBindings: {
          handlerReference: "registered-handler-id",
          cancellation: "synchronous-false-only",
          selectionEvent: "uib-card-select"
        }
      },
      capabilities: [
        "surface",
        "container",
        "interactive",
        "selectable",
        "linkable"
      ],
      dependencies: {
        packages: [
          {
            packageId: "@ui-base/core",
            range: "^0.1.0"
          },
          {
            packageId: "@ui-base/icons",
            range: "^0.1.0"
          }
        ],
        services: []
      },
      accessibility: {
        modes: [
          "section",
          "link",
          "button",
          "toggle-button"
        ],
        keyboard: {
          nonLink: [
            "Enter",
            "Space"
          ],
          link: "native"
        },
        namePrecedence: [
          "aria-label",
          "heading",
          "label",
          "header"
        ],
        disabled: "aria-disabled; remove-from-tab-order; block-activation"
      },
      lifecycle: {
        state: "installed",
        save: "workspace-only",
        publication: "unimplemented-stage-gate",
        publishedRevisionsImmutable: true,
        rollback: "new-revision",
        promotion: "new-identity-with-provenance"
      },
      clone: {
        workspace: "new-workspace-and-instance-ids;same-component-identity",
        component: "new-component-identity;retain-provenance"
      },
      deprecation: {
        status: "none",
        replacementComponentId: null
      },
      extensions: {}
    },
    {
      tagName: "uib-panel",
      module: "./src/layout/uib-panel.js",
      importPath: "./panel",
      presentation: {
        settings: {
          variant: {
            type: "select",
            options: [
              "elevated",
              "outlined",
              "flat"
            ],
            inheritable: true
          },
          density: {
            type: "select",
            options: [
              "comfortable",
              "compact"
            ],
            inheritable: true
          }
        }
      }
    },
    {
      tagName: "uib-instruction",
      module: "./src/content/uib-instruction.js",
      importPath: "./instruction",
      presentation: {
        settings: {
          density: {
            type: "select",
            options: [
              "comfortable",
              "compact"
            ],
            inheritable: true
          }
        }
      }
    },
    {
      tagName: "uib-action-group",
      module: "./src/actions/uib-action-group.js",
      importPath: "./action-group",
      presentation: {
        settings: {
          align: {
            type: "select",
            options: [
              "start",
              "center",
              "end"
            ],
            inheritable: true
          }
        }
      }
    }
  ]
};

// tests/source-identity/parser-hardening.test.ts
var cardId = "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1";
var definition = ui_component_default.components.find((c) => c.identity?.componentId === cardId);
var card = { id: cardId, tagName: "uib-card", definition };
var artifact = (source) => ({ source, css: "", metadata: { schemaVersion: 1, artifactId: "art_parser_test", kind: "page", name: "parser-test", displayName: "Parser test", route: "/" } });
var refused = (source) => {
  const parsed = parseSource(source);
  assert(parsed.diagnostics.some((d) => d.severity === "error"), source);
  for (const node of parsed.nodes) {
    assert.equal(node.id, void 0);
    assert.equal(node.attributes["data-uip-node"], void 0);
    assert.equal(node.attributes["data-uip-component"], void 0);
    assert.equal(node.manual, true);
  }
  assert.deepEqual(componentReferences(source), []);
  const validation = validateArtifact(artifact(source), [], [card]);
  assert.deepEqual(validation, parsed.diagnostics);
  assert.deepEqual(parseSource(source).diagnostics, parsed.diagnostics);
  assert.deepEqual(validateArtifact(artifact(source), [], [card]), validation);
  assert.throws(() => setNodeAttribute(source, "saved", "class", "test"), /Repair/);
  assert.throws(() => insertNode(source, "p"), /Repair/);
};
for (const name of ["data-uip-node", "data-uip-component"]) for (const second of ["same", "different"]) {
  test(`refuses ${name} duplicate values ${second}`, () => refused(`<uib-card data-uip-node="saved" ${name}="same" ${name}="${second}"></uib-card>`));
}
test("previously reproduced conflicting node and Component counterexamples refuse", () => {
  refused('<uib-card data-uip-node="original" data-uip-node="replacement" data-uip-component="card"></uib-card>');
  refused('<uib-card data-uip-node="savedCard" data-uip-component="other" data-uip-component="card"></uib-card>');
});
for (const name of ["data-uip-node", "data-uip-component"]) test(`case-equivalent duplicates of ${name} refuse`, () => {
  refused(`<uib-card ${name} = 'first'
${name.toUpperCase()}=second></uib-card>`);
});
for (const [label, source] of Object.entries({
  empty: '<div data-uip-node=""></div>',
  boolean: "<div data-uip-node></div>",
  missingValue: "<div data-uip-node=></div>",
  adjacent: '<div data-uip-node="saved"data-uip-component="card"></div>',
  equals: "<div data-uip-node==saved></div>",
  backtick: "<div data-uip-node=`saved`></div>",
  encodedName: '<div data-uip-n&#111;de="saved"></div>',
  encodedReferenceName: '<div data-uip-c&#111;mponent="card"></div>',
  numericValue: '<div data-uip-node="s&#97;ved"></div>',
  unknownEntity: '<div data-uip-component="card&unknown;"></div>',
  unclosedQuote: '<div data-uip-node="saved>',
  missingEnd: '<div data-uip-node="saved"',
  slash: '<div/data-uip-node="saved"></div>',
  unquotedSlash: "<input data-uip-node=saved/>",
  strayQuote: '<div data-uip-node="saved" "></div>',
  badClosing: '<div data-uip-node="saved"></div data-uip-node="other">',
  duplicateElements: '<div data-uip-node="saved"></div><p data-uip-node="saved"></p>',
  rawIdentity: '<script data-uip-node="saved">const x=1;</script>',
  structure: '<div data-uip-node="saved"><span></div>',
  incompleteComment: '<!-- unfinished <div data-uip-node="saved"></div>',
  processingInstruction: '<?unsupported data-uip-node="saved"?><div data-uip-node="saved"></div>',
  spacedTag: '< div data-uip-node="saved"></div>',
  numericTag: '<1div data-uip-node="saved"></1div>',
  incompleteClosing: '</div\n<div data-uip-node="saved"></div>',
  spacedClosing: '<div data-uip-node="saved"></ div>'
})) test(`refuses ${label} with deterministic shared validation`, () => refused(source));
test("single identity spelling normalizes ASCII case without changing values or ordinary names", () => {
  const result = parseSource('<UIB-CARD DATA-UIP-NODE = "Saved" Data-Uip-Component=cmp_case DATA-note="Keep"></UIB-CARD>');
  assert.equal(result.nodes[0].id, "Saved");
  assert.equal(result.nodes[0].attributes["data-uip-component"], "cmp_case");
  assert.equal(result.nodes[0].attributes["DATA-note"], "Keep");
  assert.equal(result.diagnostics.some((d) => d.severity === "error"), false);
});
test("supported quoting, whitespace, entities and self-closing syntax", () => {
  for (const source of ["<input	data-uip-node = saved />", '<input data-uip-node="saved"/>', "<div\ndata-uip-node='saved' data-uip-component='cmp_&amp;test'></div>"]) {
    const parsed = parseSource(source);
    assert.equal(parsed.nodes[0].id, "saved");
    assert.equal(parsed.diagnostics.some((d) => d.severity === "error"), false);
  }
  assert.equal(parseSource('<div data-uip-component="cmp_&amp;test"></div>').nodes[0].attributes["data-uip-component"], "cmp_&test");
});
test("identity edits replace mixed-case originals without generating duplicates", () => {
  const next = setNodeAttribute('<div DATA-UIP-NODE="saved"></div>', "saved", "data-uip-node", "renamed");
  assert.equal(next, '<div data-uip-node="renamed"></div>');
  assert.equal(parseSource(next).nodes[0].id, "renamed");
});
var compatible = [
  '<!-- keep --><script>const text="<not-an-element>";</script><div class="uip-layout-item" data-uip-node="wrap"><uib-card data-uip-node="saved" variant=outlined></uib-card></div>',
  '<ul><li>One<li>Two</ul><p>Manual paragraph<div class="uip-layout-item" data-uip-node="wrap"><h2 data-uip-node="saved">Managed</h2></div>',
  '<div data-uip-node="saved" title="greater > than" hidden data-other="first" data-other="last"></div>',
  '<style>.x{color:red}</style><textarea>literal <div data-uip-node="fake"></textarea><p data-uip-node="saved">Keep &amp; text</p>',
  '<!doctype html><!-- data-uip-node="ignored" --><section><input data-uip-node="saved" disabled></section>',
  '<input data-uip-node="saved" class=keep/>',
  '<p data-uip-node="saved">Math: 0<1; 1<2.</p>',
  '<p data-uip-node="saved">Manual text: 0 < x; x < y.</p>'
];
var flatten = (result) => ({ diagnostics: result.diagnostics, nodes: result.nodes.map((n) => ({ id: n.id, tag: n.tag, attributes: n.attributes, start: n.start, openEnd: n.openEnd, closeStart: n.closeStart, end: n.end, manual: n.manual, parent: n.parent?.start, children: n.children.map((c) => c.start) })) });
for (const [index, source] of compatible.entries()) test(`valid supported source compatibility ${index}`, () => {
  assert.deepEqual(flatten(parseSource(source)), flatten(parseSource2(source)));
  assert.equal(setNodeAttribute(source, "saved", "class", "edited"), setNodeAttribute2(source, "saved", "class", "edited"));
  assert.equal(serializeSource(source), source);
});
test("canonical existing Card declaration validates with unchanged valid diagnostics", () => {
  const source = `<div class="uip-layout-item" data-uip-node="wrap"><uib-card data-uip-node="saved" data-uip-component="${cardId}"></uib-card></div>`;
  assert.deepEqual(flatten(parseSource(source)), flatten(parseSource2(source)));
  assert.deepEqual(validateArtifact(artifact(source), [], [card]), []);
  assert.deepEqual(componentReferences(source), [cardId]);
});
test("editor source operations retain exact offsets, stable ids and reversible moves", () => {
  let sequence = 0;
  const source = insertNode("", "uib-card", cardId, void 0, () => `node_${sequence++}`);
  assert.deepEqual(parseSource(source).nodes.map((n) => n.id), ["node_0", "node_1"]);
  const tail = '\n<div class="uip-layout-item" data-uip-node="tail"><p>Keep</p></div><!-- preserved -->';
  assert.equal(moveNode(moveNode(source + tail, "node_1", "down"), "node_0", "up"), source + tail);
  const edited = setNodeAttribute(source, "node_1", "data-uip-settings", '{"heading":"A & B"}');
  assert(edited.includes("&quot;heading&quot;"));
  assert.equal(parseSource(edited).nodes[1].id, "node_1");
});
