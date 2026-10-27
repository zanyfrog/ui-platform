// tests/html-first/source.test.ts
import test from "node:test";
import assert from "node:assert/strict";

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
function removeNodeAttribute(source, id, name) {
  if (!/^[a-z][a-z0-9:-]*$/.test(name)) throw new Error("Invalid attribute name.");
  const parsed = parseSource(source), node = parsed.nodes.find((n) => n.id === id);
  if (parsed.diagnostics.some((d) => d.severity === "error") || !node || node.manual) throw new Error("Select an unambiguous editor-managed node.");
  const opening = source.slice(node.start, node.openEnd);
  const next = opening.replace(new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`, "gi"), "");
  return source.slice(0, node.start) + next + source.slice(node.openEnd);
}
function literalNode(source, id) {
  const parsed = parseSource(source), node = parsed.nodes.find((n) => n.id === id);
  if (parsed.diagnostics.some((d) => d.severity === "error") || !node || node.manual) throw new Error("Repair source before editing instance values.");
  const stored = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
  if (!stored || Array.isArray(stored) || typeof stored !== "object") throw new Error("Component settings must be an object.");
  return { node, stored };
}
function slotText(source, node, name) {
  const children = node.children.filter((child) => (child.attributes.slot || "default") === name);
  const direct = [];
  if (name === "default") {
    let start = node.openEnd;
    for (const end of [...node.children.map((child) => child.start), node.closeStart]) {
      const text = source.slice(start, end);
      if (text.trim()) direct.push({ start, end, text });
      start = node.children.find((child) => child.start === end)?.end ?? node.closeStart;
    }
  }
  if (!direct.length && children.length === 1 && !children[0].children.length && children[0].tag === "span") {
    const child = children[0], text = source.slice(child.openEnd, child.closeStart);
    if (!text.includes("<")) return { start: child.openEnd, end: child.closeStart, text: decode(text) };
  }
  if (!children.length && direct.length === 1 && !direct[0].text.includes("<")) return { ...direct[0], text: decode(direct[0].text) };
  return void 0;
}
function readNodeSettings(source, id, definition, contracts = {}) {
  const { node, stored } = literalNode(source, id);
  const values = definition ? readPackageSettings(definition, node.attributes, stored) : { ...stored };
  for (const [key, contract] of Object.entries(definition?.builder.settings ?? contracts)) {
    const binding = definition?.builder.settings[key]?.binding;
    if (!definition && /^[a-z][a-z0-9-]*$/.test(key) && Object.hasOwn(node.attributes, key) && !Object.hasOwn(stored, key)) values[key] = contract.type === "boolean" ? node.attributes[key] !== "false" : contract.type === "number" ? Number(node.attributes[key]) : node.attributes[key];
    if (binding?.kind === "slot" && binding.content === "text" && !Object.hasOwn(stored, key)) {
      const slot = slotText(source, node, binding.name || "default");
      if (slot) values[key] = slot.text;
    }
  }
  return values;
}
function setNodeSetting(source, id, key, value, definition, contracts = {}) {
  const { node, stored } = literalNode(source, id), contract = definition?.builder.settings[key] ?? contracts[key];
  if (!contract || valueErrors(value, contract, key).length) throw new Error("Invalid declared component value.");
  const binding = definition?.builder.settings[key]?.binding;
  const attribute = binding?.kind === "attribute" ? binding.name : !definition && /^[a-z][a-z0-9-]*$/.test(key) ? key : void 0;
  let next = source;
  if (attribute && ["string", "number", "boolean"].includes(contract.type) && !(value === false && contract.default === true)) {
    next = removeNodeAttribute(next, id, attribute);
    next = contract.type === "boolean" && value === false ? removeNodeAttribute(next, id, attribute) : setNodeAttribute(next, id, attribute, contract.type === "boolean" ? "" : String(value));
    delete stored[key];
  } else if (binding?.kind === "slot" && binding.content === "text" && typeof value === "string") {
    const name = binding.name || "default", slot = slotText(source, node, name);
    if (slot) next = source.slice(0, slot.start) + escapeAttribute(value) + source.slice(slot.end);
    else {
      const directText = name === "default" ? node.children.reduce((text, child) => text.replace(source.slice(child.start, child.end), ""), source.slice(node.openEnd, node.closeStart)).trim() : "";
      if (node.children.some((child) => (child.attributes.slot || "default") === name) || directText) throw new Error("Edit nested or mixed slot content in HTML; it cannot be replaced as a literal.");
      const markup = `<span data-uip-node="node_${globalThis.crypto.randomUUID()}"${name === "default" ? "" : ` slot="${escapeAttribute(name)}"`}>${escapeAttribute(value)}</span>`;
      next = source.slice(0, node.closeStart) + markup + source.slice(node.closeStart);
    }
    delete stored[key];
  } else {
    stored[key] = value;
  }
  return Object.keys(stored).length ? setNodeAttribute(next, id, "data-uip-settings", JSON.stringify(stored)) : removeNodeAttribute(next, id, "data-uip-settings");
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
function generateForm(metadata, dataset) {
  if (metadata.kind !== "component") throw new Error("Forms must be Platform Components.");
  if (dataset && (!dataset.dataset?.id || !Array.isArray(dataset.fields) || dataset.fields.some((f) => !/^[A-Za-z][\w]*$/.test(f.key) || !f.id))) throw new Error("Import a published Dataset schema with stable field IDs.");
  const fields = (dataset?.fields ?? []).filter((f) => ["string", "number", "integer", "boolean", "date"].includes(f.type)).map((f) => ({
    id: `field_${f.id}`,
    node: `control_${f.key}`,
    key: f.key,
    datasetFieldId: f.id,
    type: f.type === "number" || f.type === "integer" ? "number" : f.type === "boolean" ? "boolean" : "string",
    datasetRequired: f.required,
    required: f.required,
    label: f.key,
    default: f.default,
    visible: true,
    editable: true,
    ...f.type === "date" ? { codec: "date", help: "UTC timestamp, e.g. 2026-01-01T00:00:00.000Z. No date/time conversion is performed." } : {}
  }));
  metadata.capabilities = ["visual", "form"];
  metadata.modes = { default: "public", overrides: { public: {} } };
  metadata.form = { node: "form", datasetId: dataset?.dataset.id ?? "", primaryKey: dataset?.fields.find((f) => f.type === "id")?.key ?? "id", fields, submit: { service: "dataset.write", readService: "dataset.read" } };
  metadata.public = { properties: {
    mode: { type: "string", default: "public" },
    operation: { type: "string", enum: ["create", "edit"], default: "create" },
    recordId: { type: "string" },
    initialRecord: { type: "object" },
    readOnly: { type: "boolean", default: false },
    disabled: { type: "boolean", default: false }
  }, events: Object.fromEntries(["submitStarted", "submitSucceeded", "submitFailed", "recordCreated", "recordUpdated", "cancelRequested"].map((name) => [name, { payload: { result: { type: "object" } } }])), slots: [] };
  metadata.state = { ...metadata.state, values: {}, dirty: false, submitting: false, submitted: false, submitError: null, validation: {}, savedRecord: null };
  const controls = fields.map((f) => `<div class="uip-layout-item" data-uip-node="row_${f.key}"><${f.type === "number" ? "uib-forms-number" : f.type === "boolean" ? "uib-forms-checkbox" : f.key.toLowerCase().includes("email") ? "uib-forms-email" : "uib-forms-textbox"} data-uip-node="${f.node}" name="${f.key}" label="${escapeAttribute(f.label)}"></${f.type === "number" ? "uib-forms-number" : f.type === "boolean" ? "uib-forms-checkbox" : f.key.toLowerCase().includes("email") ? "uib-forms-email" : "uib-forms-textbox"}><span data-uip-field-error="${escapeAttribute(f.id)}" role="alert"></span></div>`).join("\n");
  return { metadata: JSON.stringify(metadata, null, 2) + "\n", source: `<section class="uip-layout-item" data-uip-node="content"><h2 data-uip-node="heading">${escapeAttribute(dataset?.dataset.name ?? "New")} form</h2><p data-uip-node="instructions">Complete the fields and submit to save.</p><uib-forms-form data-uip-node="form" label="${escapeAttribute(dataset?.dataset.name ?? "New")} form">
${controls}
</uib-forms-form><p data-uip-node="submit-error" role="alert"></p><pre data-uip-node="saved-result"></pre></section>
`, css: ":host{max-width:42rem} [hidden]{display:none!important} .uip-layout-item{margin-block:.75rem} [role=alert]{color:#a01818}\n", fixtures: "{}\n", code: "export {};\n" };
}

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
    const visit = (current, path8) => {
      const id = current.metadata.componentId ?? current.metadata.artifactId;
      if (path8.includes(id)) {
        error(`Component dependency cycle: ${[...path8, id].join(" \u2192 ")}.`);
        return;
      }
      for (const ref of /* @__PURE__ */ new Set([...componentReferences(current.source), ...current.metadata.dependencies ?? []])) {
        const next = components.find((c) => c.metadata.componentId === ref);
        if (next) visit(next, [...path8, id]);
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

// tests/card-properties/backend.ts
import * as fs2 from "node:fs/promises";
import path7 from "node:path";

// src/server/visual-artifacts.ts
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";

// tests/d6-r1/fs-guard.ts
import * as fs from "node:fs/promises";
import path from "node:path";
var events = [];
var root = "";
var fault;
function configure(directory, inject2) {
  root = path.resolve(directory);
  fault = inject2;
  events.length = 0;
}
function inject(value) {
  fault = value;
}
function check(op, file) {
  const target = path.resolve(String(file));
  const inside = target === root || target.startsWith(root + path.sep);
  const ancestor = op === "lstat" && (root === target || root.startsWith(target.endsWith(path.sep) ? target : target + path.sep));
  if (!root || !inside && !ancestor) throw new Error("OUTSIDE_DISPOSABLE_FIXTURE: " + op);
  events.push({ op, file: target });
  fault?.(op, target);
}
var lstat2 = async (file) => {
  check("lstat", file);
  return fs.lstat(file);
};
var realpath2 = async (file) => {
  check("realpath", file);
  return fs.realpath(file);
};
var readFile2 = async (file, ...args) => {
  check("readFile", file);
  return fs.readFile(file, ...args);
};
var readdir2 = async (file, ...args) => {
  check("readdir", file);
  return fs.readdir(file, ...args);
};
var mkdir2 = async (file, ...args) => {
  check("mkdir", file);
  return fs.mkdir(file, ...args);
};
var rm2 = async (file, ...args) => {
  check("rm", file);
  return fs.rm(file, ...args);
};
var rename2 = async (from, to) => {
  check("rename", from);
  check("rename", to);
  return fs.rename(from, to);
};
var open2 = async (file, ...args) => {
  check("open:" + args[0], file);
  const handle = await fs.open(file, ...args);
  return {
    writeFile: async (...values) => {
      check("handle.writeFile", file);
      return handle.writeFile(...values);
    },
    sync: async () => {
      check("handle.sync", file);
      return handle.sync();
    },
    close: async () => {
      check("handle.close", file);
      await handle.close();
      check("handle.closed", file);
    }
  };
};

// src/server/visual-artifacts.ts
import path6 from "node:path";

// packages/artifacts/src/file-operations.ts
import path2 from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
async function retryWindowsFileOperation(operation) {
  const waits = [25, 50, 100, 200, 400];
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(
        error.code ?? ""
      ) || attempt >= waits.length)
        throw error;
      await delay(waits[attempt]);
    }
  }
}
async function atomicWriteText(file, content) {
  await mkdir2(path2.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open2(temporary, "wx");
  try {
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retryWindowsFileOperation(() => rename2(temporary, file));
  } finally {
    await retryWindowsFileOperation(() => rm2(temporary, { force: true }));
  }
}

// packages/artifacts/src/role-bundle.ts
import path5 from "node:path";
import { appendFileSync } from "node:fs";

// packages/artifacts/src/bundle.ts
import path3 from "node:path";
import { createHash } from "node:crypto";
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function validRelativePath(name) {
  return !!name && !name.includes("\\") && !name.includes(":") && !path3.posix.isAbsolute(name) && name.split("/").every(
    (part) => !!part && part !== "." && part !== ".." && !part.endsWith(".") && !part.endsWith(" ") && !/[<>"|?*\x00-\x1f]/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
  ) && !name.split("/").some((part) => [".uib", ".git"].includes(part.toLowerCase()));
}
async function safeFile(bundle, name) {
  if (!validRelativePath(name))
    throw new Error(`Unsafe artifact path: ${name}`);
  const root2 = await realpath2(bundle);
  const parts = name.split("/");
  let current = root2;
  for (const part of parts) {
    current = path3.join(current, part);
    try {
      if ((await lstat2(current)).isSymbolicLink())
        throw new Error(`Symbolic links are not supported: ${name}`);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (current !== path3.join(root2, ...parts) && await readOptional(path3.join(current, "artifact.json")) !== null)
      throw new Error(`File belongs to a nested artifact bundle: ${name}`);
  }
  return current;
}
async function readOptional(file) {
  try {
    return await readFile2(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function declaredPaths(content) {
  try {
    const value = JSON.parse(content ?? "null");
    return isObject(value) && isObject(value.files) ? Object.values(value.files).filter(
      (v) => typeof v === "string" && validRelativePath(v) && v.toLowerCase() !== "artifact.json"
    ) : [];
  } catch {
    return [];
  }
}
async function capture(bundle, extra = [], options = {}) {
  const manifest = options.includeManifest === false ? null : await readOptional(await safeFile(bundle, "artifact.json"));
  const snapshot = /* @__PURE__ */ Object.create(null);
  if (options.includeManifest !== false) snapshot["artifact.json"] = manifest;
  for (const name of /* @__PURE__ */ new Set([...declaredPaths(manifest), ...extra]))
    snapshot[name] = await readOptional(await safeFile(bundle, name));
  return snapshot;
}
function checksum(snapshot) {
  return createHash("sha256").update(
    JSON.stringify(
      Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b))
    )
  ).digest("hex");
}

// packages/artifacts/src/storage.ts
import path4 from "node:path";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay2 } from "node:timers/promises";
var storageKey = (id) => createHash2("sha256").update(id).digest("hex");
var ArtifactConflictError = class extends Error {
  constructor() {
    super("Artifact changed since it was loaded. Reload before saving.");
    this.name = "ArtifactConflictError";
  }
};
async function storageDirectory(root2, ...segments) {
  let dir = root2;
  for (const segment of [".uib", ...segments]) {
    dir = path4.join(dir, segment);
    await mkdir2(dir, { recursive: true });
    if ((await lstat2(dir)).isSymbolicLink())
      throw new Error(`Storage may not contain symbolic links: ${dir}`);
  }
  return dir;
}
async function writeSnapshot(bundle, snapshot, beforeWrite) {
  const entries = Object.entries(snapshot).sort(
    ([a], [b]) => a === "artifact.json" ? 1 : b === "artifact.json" ? -1 : a.localeCompare(b)
  );
  for (let index = 0; index < entries.length; index++) {
    const [name, content] = entries[index];
    await beforeWrite?.(name, index);
    const file = await safeFile(bundle, name);
    if (content === null)
      await retryWindowsFileOperation(() => rm2(file, { force: true }));
    else await atomicWriteText(file, content);
  }
}
var localLocks = /* @__PURE__ */ new Map();
var heldLocks = new AsyncLocalStorage();
var ArtifactBusyError = class extends Error {
  code = "source.busy";
  status = 503;
  constructor() {
    super("Artifact is locked by another writer.");
  }
};
var ArtifactOwnerUnresolvedError = class extends ArtifactBusyError {
  code = "source.owner-unresolved";
  constructor() {
    super();
    this.name = "ArtifactOwnerUnresolvedError";
    this.message = "Artifact lock ownership is unresolved; exclusive admission was not obtained.";
  }
};
var ArtifactAdmissionUnsafeError = class extends Error {
  code = "source.admission-unsafe";
  status = 503;
  constructor() {
    super("Safe artifact admission could not be established.");
  }
};
var LockCleanupFailure = class {
  constructor(outcome) {
    this.outcome = outcome;
  }
  outcome;
};
async function withArtifactLock(root2, bundle, run, identity = bundle, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  const key = path4.join(root2, storageKey(identity));
  const held = (heldLocks.getStore() ?? []).filter((lock) => lock.active);
  if (held.some((lock) => lock.key === key) || identity === "visual-runtime-graph-v1" && held.length)
    throw new Error("Artifact lock order violation: nested or role-to-graph acquisition.");
  const started = performance.now();
  const budget = options.timeoutMs ?? 0;
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Invalid artifact acquisition budget.");
  const remaining = () => Math.max(0, budget - (performance.now() - started));
  let acquiredAt;
  const check2 = () => options.signal?.throwIfAborted();
  check2();
  const predecessor = localLocks.get(key);
  const previous = predecessor ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  localLocks.set(key, current);
  let queued = true;
  try {
    const cancellation = new AbortController();
    const abort = () => cancellation.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = budget > 0 ? setTimeout(() => cancellation.abort(new ArtifactBusyError()), remaining()) : void 0;
    try {
      await Promise.race([previous, new Promise((_, reject) => {
        cancellation.signal.addEventListener("abort", () => reject(cancellation.signal.reason), { once: true });
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
    queued = false;
    if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
    if (predecessor && identity === "visual-runtime-graph-v1") {
      await delay2(Math.min(50, remaining()), void 0, { signal: options.signal });
    }
    let contention = new ArtifactBusyError();
    for (; ; ) {
      check2();
      if (budget > 0 && remaining() <= 0) throw contention;
      let entered = false;
      try {
        return await acquireArtifactLock(root2, bundle, async () => {
          check2();
          if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
          entered = true;
          acquiredAt = performance.now();
          const scope = { key, active: true, graph: identity === "visual-runtime-graph-v1" };
          try {
            return await heldLocks.run([...held, scope], run);
          } finally {
            scope.active = false;
          }
        }, identity, options.recovery);
      } catch (error) {
        if (error instanceof LockCleanupFailure) throw error.outcome;
        if (entered) throw error;
        check2();
        if (!(error instanceof ArtifactBusyError) || remaining() <= 0) throw error;
        contention = error;
        try {
          await delay2(Math.min(25, remaining()), void 0, { signal: options.signal });
        } catch (waitingError) {
          check2();
          throw waitingError;
        }
      }
    }
  } finally {
    if (queued) void previous.then(release);
    else release();
    void current.then(() => {
      if (localLocks.get(key) === current) localLocks.delete(key);
    });
    try {
      options.observe?.({
        waitMs: (acquiredAt ?? performance.now()) - started,
        holdMs: acquiredAt === void 0 ? 0 : performance.now() - acquiredAt,
        acquired: acquiredAt !== void 0
      });
    } catch {
    }
  }
}
async function acquireArtifactLock(root2, bundle, run, identity, recoveryMode) {
  const directory = await storageDirectory(root2, "locks");
  const file = path4.join(directory, `${storageKey(identity)}.lock`);
  if (recoveryMode === "refuse") {
    for (const candidate of [file, file + ".recovery"]) {
      const stat = await lstat2(candidate).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat && (candidate !== file || stat.isSymbolicLink() || !stat.isFile())) throw new ArtifactAdmissionUnsafeError();
    }
  }
  let handle;
  let hasPrimary = false;
  let primary;
  let result;
  const cleanupFailures = [];
  const cleanup = async (owned, pathname, phase) => {
    try {
      await owned.close();
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".close", error });
      return;
    }
    try {
      await rm2(pathname, { force: true });
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".unlink", error });
    }
  };
  try {
    try {
      handle = await open2(file, "wx");
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const ownerText = async () => {
        try {
          return await readFile2(file, "utf8");
        } catch (error) {
          if (error.code === "ENOENT") throw new ArtifactBusyError();
          throw error;
        }
      };
      const parseOwner = (text) => {
        const owner2 = Number(text);
        if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(owner2)) throw new ArtifactOwnerUnresolvedError();
        return owner2;
      };
      const owner = parseOwner(await ownerText());
      if (recoveryMode === "refuse") throw new ArtifactBusyError();
      try {
        process.kill(owner, 0);
      } catch (probe) {
        if (probe.code !== "ESRCH")
          throw new ArtifactBusyError();
        let recovery;
        try {
          recovery = await open2(file + ".recovery", "wx").catch((error) => {
            if (error.code === "EEXIST") throw new ArtifactBusyError();
            throw error;
          });
          if (parseOwner(await ownerText()) !== owner) throw new ArtifactBusyError();
          try {
            await rm2(file);
            handle = await open2(file, "wx");
          } catch (error) {
            if (["ENOENT", "EEXIST"].includes(error.code ?? "")) throw new ArtifactBusyError();
            throw error;
          }
        } finally {
          if (recovery) await cleanup(recovery, file + ".recovery", "guard");
        }
      }
      if (!handle) throw new ArtifactBusyError();
    }
    if (cleanupFailures.length === 0) {
      await handle.writeFile(String(process.pid));
      await handle.sync();
      result = await run();
    }
  } catch (error) {
    hasPrimary = true;
    primary = error;
  } finally {
    if (handle) await cleanup(handle, file, "main");
  }
  if (cleanupFailures.length) {
    const errors = [...hasPrimary ? [primary] : [], ...cleanupFailures.map((f) => f.error)];
    const outcome = errors.length === 1 ? errors[0] : new AggregateError(
      errors,
      (hasPrimary ? "Artifact operation failed; ownership cleanup failed: " : "Artifact ownership cleanup failed: ") + cleanupFailures.map((f) => f.phase).join(", ") + ".",
      { cause: hasPrimary ? primary : cleanupFailures[0].error }
    );
    throw new LockCleanupFailure(outcome);
  }
  if (hasPrimary) throw primary;
  return result;
}
async function recoverTransaction(root2, bundle, options = {}) {
  const directory = await storageDirectory(
    root2,
    "transactions",
    storageKey(options.identity ?? bundle)
  );
  const journal = path4.join(directory, "pending.json");
  let pending;
  try {
    pending = JSON.parse(await readFile2(journal, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
  if (pending.bundle !== void 0 && pending.bundle !== bundle || pending.identity !== void 0 && pending.identity !== options.identity)
    throw new Error("Source journal location does not match its recovery lock.");
  options.validate?.(pending.original);
  await writeSnapshot(bundle, pending.original, options.beforeWrite);
  await rm2(journal);
  return true;
}
async function commitTransaction(root2, bundle, original, staged, options = {}) {
  if (checksum(await (options.capture?.() ?? capture(bundle, Object.keys(original)))) !== checksum(original))
    throw new ArtifactConflictError();
  const directory = await storageDirectory(
    root2,
    "transactions",
    storageKey(options.identity ?? bundle)
  );
  const journal = path4.join(directory, "pending.json");
  await atomicWriteText(journal, JSON.stringify({ original, ...options.identity ? { bundle, identity: options.identity } : {} }));
  try {
    await writeSnapshot(bundle, staged, options.beforeWrite);
    await rm2(journal);
  } catch (cause) {
    try {
      await writeSnapshot(bundle, original, options.beforeRollbackWrite);
      await rm2(journal);
    } catch (rollbackError) {
      throw new AggregateError(
        [cause, rollbackError],
        "Commit and rollback failed; recovery journal retained."
      );
    }
    options.rollback?.();
    throw cause;
  }
}

// packages/artifacts/src/role-bundle.ts
var RoleBundleRecoveryRequiredError = class extends Error {
  code = "source.recovery-required";
  constructor(cause) {
    super("Source recovery is required. Reads and writes are blocked until recovery succeeds.", { cause });
  }
};
async function canonical(location) {
  const directory = path5.resolve(location.directory), root2 = path5.resolve(location.root);
  const ancestors = /* @__PURE__ */ new Set();
  for (const target of [root2, directory]) for (let ancestor = target; ; ancestor = path5.dirname(ancestor)) {
    ancestors.add(ancestor);
    if (path5.dirname(ancestor) === ancestor) break;
  }
  await Promise.all([...ancestors].map(async (ancestor) => {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source bundle roots cannot contain symlinks.");
  }));
  const [resolvedRoot, resolvedDirectory] = await Promise.all([realpath2(root2), realpath2(directory)]);
  const relative = path5.relative(resolvedRoot, resolvedDirectory);
  if (relative === ".." || relative.startsWith(".." + path5.sep) || path5.isAbsolute(relative)) throw new Error("Source bundle is outside its owner root.");
  const paths = [...location.paths];
  if (!paths.length || new Set(paths.map((name) => process.platform === "win32" ? name.toLowerCase() : name)).size !== paths.length || paths.some((name) => !validRelativePath(name)) || !paths.includes(location.anchor)) throw new Error("Unique safe role paths including the anchor are required.");
  await Promise.all(paths.map(async (name) => {
    const target = await safeFile(resolvedDirectory, name);
    const physical = await realpath2(target).catch((error) => {
      if (error.code === "ENOENT") return void 0;
      throw error;
    });
    if (physical && path5.relative(resolvedDirectory, physical).replaceAll(path5.sep, "/") !== name) throw new Error("Role paths must preserve the existing physical filename and casing.");
  }));
  const anchor = await safeFile(resolvedDirectory, location.anchor);
  const identity = await realpath2(anchor).catch((error) => {
    if (error.code === "ENOENT") return anchor;
    throw error;
  });
  return { root: resolvedRoot, directory: resolvedDirectory, paths, identity };
}
function validateSnapshot(snapshot, paths) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || Object.keys(snapshot).length !== paths.length || paths.some((name) => !Object.hasOwn(snapshot, name) || snapshot[name] !== null && typeof snapshot[name] !== "string")) throw new Error("The source journal/candidate does not match the declared role bundle.");
}
var project = (files) => ({ files: structuredClone(files), checksum: checksum(files) });
async function locked(location, work, options = {}) {
  const resolved = await canonical(location);
  return withArtifactLock(resolved.root, resolved.directory, async () => {
    try {
      if (options.recovery === "refuse") await recoverRoleBundleRoot(resolved.root, options);
      else await recoverTransaction(resolved.root, resolved.directory, { identity: resolved.identity, validate: (files2) => validateSnapshot(files2, resolved.paths) });
    } catch (error) {
      options.signal?.throwIfAborted();
      if (error instanceof RoleBundleRecoveryRequiredError) throw error;
      throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
    }
    options.signal?.throwIfAborted();
    const files = await capture(resolved.directory, resolved.paths, { includeManifest: false });
    return work(resolved, files);
  }, resolved.identity, { timeoutMs: 5e3, ...options });
}
function readRoleBundle(location, options = {}) {
  return locked(location, async (_, files) => project(files), { ...options });
}
async function recoverRoleBundleRoot(ownerRoot, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  options.signal?.throwIfAborted();
  const root2 = await realpath2(ownerRoot).catch((error) => {
    if (error.code === "ENOENT") return void 0;
    throw error;
  });
  if (!root2) return;
  const transactions = path5.join(root2, ".uib", "transactions");
  try {
    for (let ancestor = path5.resolve(ownerRoot); ; ancestor = path5.dirname(ancestor)) {
      if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source recovery roots cannot contain symlinks.");
      if (path5.dirname(ancestor) === ancestor) break;
    }
    for (const directory of [path5.join(root2, ".uib"), transactions]) {
      const stat = await lstat2(directory).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error("Unsafe source transaction storage.");
    }
    for (const name of await readdir2(transactions).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      options.signal?.throwIfAborted();
      if (options.recovery === "refuse" && !/^[a-f0-9]{64}$/.test(name)) throw new RoleBundleRecoveryRequiredError(void 0);
      const directory = path5.join(transactions, name);
      if ((await lstat2(directory)).isSymbolicLink() || !(await lstat2(directory)).isDirectory()) throw new Error("Unsafe source transaction storage.");
      const journalFile = path5.join(directory, "pending.json");
      const journalStat = await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (options.recovery === "refuse") {
        if (journalStat) throw new RoleBundleRecoveryRequiredError(void 0);
        continue;
      }
      if (journalStat?.isSymbolicLink()) throw new Error("Unsafe source transaction journal.");
      const text = await readFile2(journalFile, "utf8").catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (text === void 0) continue;
      const journal = JSON.parse(text);
      if (typeof journal.bundle !== "string" || typeof journal.identity !== "string" || name !== storageKey(journal.identity) || path5.dirname(journal.identity) !== journal.bundle || !journal.identity.endsWith(".visual.json")) throw new Error("A source journal requires explicit location recovery.");
      const anchor = path5.basename(journal.identity), stem = anchor.slice(0, -".visual.json".length);
      const paths = [".html", ".css", ".visual.json", ".fixtures.json", ".functions.ts"].map((extension) => stem + extension);
      validateSnapshot(journal.original, paths);
      await readRoleBundle({ root: root2, directory: journal.bundle, anchor, paths });
      if (await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      })) throw new Error("The original journal identity was not recovered. Explicit location recovery is required.");
    }
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof RoleBundleRecoveryRequiredError) throw error;
    throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
  }
}
async function withRoleBundleGraph(ownerRoot, work, options = {}) {
  options = { ...options };
  const root2 = await realpath2(ownerRoot);
  for (let ancestor = path5.resolve(ownerRoot); ; ancestor = path5.dirname(ancestor)) {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source graph roots cannot contain symlinks.");
    if (path5.dirname(ancestor) === ancestor) break;
  }
  return withArtifactLock(root2, root2, async () => {
    if (options.recovery === "refuse") await recoverRoleBundleRoot(root2, options);
    options.signal?.throwIfAborted();
    return work();
  }, "visual-runtime-graph-v1", {
    // Measured WP4/WP5-B holds reached 1.66s. A 5s acquisition budget
    // accommodates brief serial work; it never extends or retries admitted work.
    timeoutMs: 5e3,
    ...options,
    observe: (measurement) => {
      if (process.env.UI_GRAPH_LOCK_TRACE === "1") {
        const record = JSON.stringify({ pid: process.pid, ...measurement });
        console.error("GRAPH_LOCK " + record);
        if (process.env.UI_GRAPH_LOCK_METRICS) appendFileSync(process.env.UI_GRAPH_LOCK_METRICS, record + "\n");
      }
      options.observe?.(measurement);
    }
  });
}
function saveRoleBundle(location, input) {
  return locked(location, async (resolved, original) => {
    if (!input.expectedChecksum || checksum(original) !== input.expectedChecksum) throw new ArtifactConflictError();
    const staged = structuredClone(input.files);
    validateSnapshot(staged, resolved.paths);
    const candidate = project(staged), previous = project(original);
    await input.validate(structuredClone(candidate), structuredClone(previous));
    const current = () => capture(resolved.directory, resolved.paths, { includeManifest: false });
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    await input.admit();
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    if (candidate.checksum === previous.checksum) return previous;
    try {
      await commitTransaction(resolved.root, resolved.directory, original, staged, {
        identity: resolved.identity,
        capture: current,
        beforeWrite: input.beforeWrite,
        beforeRollbackWrite: input.beforeRollbackWrite
      });
    } catch (error) {
      if (error instanceof AggregateError) throw new RoleBundleRecoveryRequiredError(error);
      throw error;
    }
    const committed = project(await current());
    if (committed.checksum !== candidate.checksum) throw new ArtifactConflictError();
    return committed;
  });
}

// tests/html-first/unused.ts
function denied(..._args) {
  throw Error("UNADMITTED_BRANCH");
}
var moveToOsTrash = denied;
var platformRoot = "UNUSABLE_REAL_ROOT";

// src/server/visual-artifacts.ts
var platformComponentsRoot = path6.join(platformRoot, "components");
var roles = { source: ".html", css: ".css", metadata: ".visual.json", fixtures: ".fixtures.json", code: ".functions.ts" };
var hash = (files) => createHash3("sha256").update(JSON.stringify(files)).digest("hex");
var VisualArtifactService = class {
  constructor(root2, kind, faults = {}) {
    this.root = root2;
    this.kind = kind;
    this.faults = faults;
  }
  root;
  kind;
  faults;
  async location(locator) {
    const file = await this.file(locator), stem = path6.basename(file, ".visual.json");
    return { root: this.root, directory: path6.dirname(file), anchor: path6.basename(file), paths: Object.values(roles).map((extension) => stem + extension) };
  }
  async file(locator, create = false) {
    if (!locator.endsWith(".visual.json") || locator.includes("\\") || locator.split("/").some((p) => !/^[a-zA-Z0-9_-]+(?:\.visual\.json)?$/.test(p))) throw new Error("Invalid Visual Artifact locator.");
    for (let ancestor = path6.resolve(this.root); ; ancestor = path6.dirname(ancestor)) {
      const info = await lstat2(ancestor).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (info?.isSymbolicLink()) throw new Error("Visual Artifact roots cannot contain symlinks.");
      if (path6.dirname(ancestor) === ancestor) break;
    }
    if (create) await mkdir2(this.root, { recursive: true });
    const resolvedRoot = await realpath2(this.root);
    let current = resolvedRoot;
    for (const segment of locator.split("/")) {
      current = path6.join(current, segment);
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
        if (entry.isDirectory()) await walk(path6.join(dir, entry.name), `${relative}/`);
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
    const location = await this.location(locator), file = path6.join(location.directory, location.anchor);
    const stem = file.slice(0, -".visual.json".length);
    const files = {};
    const snapshot = await readRoleBundle(location, options);
    for (const [role, extension] of Object.entries(roles)) files[role] = snapshot.files[path6.basename(stem) + extension] ?? "";
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
    if (await lstat2(path6.dirname(file)).then(() => true, (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    })) throw new Error("An artifact folder already exists.");
    const temporary = path6.join(this.root, `.creating-${randomUUID3()}`);
    const metadata = { schemaVersion: 1, artifactId: `art_${randomUUID3()}`, kind: this.kind, name, displayName: name.replaceAll("-", " "), ...this.kind === "component" ? { componentId: `cmp_platform_${randomUUID3()}`, public: { properties: {}, events: {}, slots: [] } } : this.kind === "page" ? { route: route ?? `/${name}`, ...shellId ? { shellId, routeId: `route_${randomUUID3()}` } : {} } : {} };
    const files = form ? generateForm(metadata, form.dataset) : { source: `<section class="uip-layout-item" data-uip-node="node_${randomUUID3()}"></section>
`, css: "", metadata: JSON.stringify(metadata, null, 2) + "\n", fixtures: "{}\n", code: "export {};\n" };
    if (form?.authoring) {
      metadata.form.contractVersion = 1;
      files.metadata = JSON.stringify(metadata, null, 2) + "\n";
    }
    if (shellId || this.kind === "shell") files.source = initialRegionId ? `<main class="uip-layout-item" data-uip-node="node_${randomUUID3()}" data-uip-region="${initialRegionId}" data-uip-region-name="Main Content"></main>
` : "<!-- No Page Region overrides; use Shell defaults. -->\n";
    if (shellId) files.source = "<!-- No Page Region overrides; add a Region to replace or explicitly empty its Shell default. -->\n";
    await mkdir2(temporary);
    try {
      for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path6.join(temporary, `${this.kind}${extension}`), files[role]);
      if (this.kind === "page") await atomicWriteText(path6.join(temporary, "index.ts"), pageEntry());
      await admit();
      await rename2(temporary, path6.dirname(file));
    } finally {
      await rm2(temporary, { recursive: true, force: true });
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
    const location = await this.location(locator), original = await readRoleBundle(location), stem = path6.basename(location.anchor, ".visual.json");
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
    if (path6.basename(file) !== `${this.kind}.visual.json`) throw new Error("Delete manually placed artifact files through source control.");
    await admit();
    if ((await this.read(locator)).hash !== expectedHash) throw Object.assign(new Error("Artifact changed during deletion admission."), { status: 409 });
    await moveToOsTrash(path6.dirname(file));
  }
};
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

// tests/card-properties/backend.ts
async function fixture() {
  const parent = path7.resolve(process.cwd(), "evidence/v1-card-properties-20261027/disposable");
  await fs2.mkdir(parent, { recursive: true });
  const root2 = await fs2.mkdtemp(path7.join(parent, "page-"));
  configure(root2);
  const manifest = JSON.parse(await fs2.readFile(path7.resolve(process.cwd(), "tests/d6-p2/bytes/40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469.txt"), "utf8"));
  const card = manifest.components.find((c) => c.identity?.name === "card");
  const panel = manifest.components.find((c) => c.tagName === "uib-panel");
  const packages = [{ id: card.identity.componentId, tagName: "uib-card", name: "Card", definition: card, packageName: "@ui-base/ui", packageVersion: "0.5.1" }, { ...panel, id: "@ui-base/ui:uib-panel", name: "Panel", packageName: "@ui-base/ui", packageVersion: "0.5.1" }];
  const directory = path7.join(root2, "page");
  await fs2.mkdir(directory);
  const files = { source: '<section class="uip-layout-item" data-uip-node="node_initial"></section>\n', css: "", metadata: JSON.stringify({ schemaVersion: 1, artifactId: "art_html_first", kind: "page", name: "fixture", displayName: "Fixture", route: "/fixture" }), fixtures: "{}", code: "export {};\n" };
  const roles2 = { source: ".html", css: ".css", metadata: ".visual.json", fixtures: ".fixtures.json", code: ".functions.ts" };
  for (const [k, extension] of Object.entries(roles2)) await fs2.writeFile(path7.join(directory, "page" + extension), files[k]);
  const service = new VisualArtifactService(root2, "page"), locator = "page/page.visual.json", calls = [];
  const read = () => service.read(locator, { recovery: "refuse" });
  const workspace = async () => ({ pages: [await read()], components: [], shells: [], packages });
  const bridge = async (url, encoded) => {
    const init = encoded ? JSON.parse(encoded) : void 0;
    calls.push({ url, method: init?.method ?? "GET" });
    if (!url.startsWith("/api/apps/fixture-app/visual-")) throw Error("UNEXPECTED_BACKEND");
    if (init?.method === "PUT") {
      const body = JSON.parse(init.body);
      return JSON.stringify(await withRoleBundleGraph(root2, () => service.saveCandidate(locator, body.files, body.expectedHash, { validate: async (bundle2) => {
        const errors = validateArtifact({ metadata: bundle2.metadata, source: bundle2.files.source, css: bundle2.files.css }, [], packages).filter((e) => e.severity === "error");
        if (errors.length) throw Error(errors.map((e) => e.message).join("\n"));
      }, admit: async () => {
        calls.push({ method: "NONPRODUCTION_OWNER_ADMISSION" });
      } }), { recovery: "refuse" }));
    }
    if (init?.method) throw Error("UNEXPECTED_MUTATION");
    if (url.endsWith("/visual-artifacts")) return JSON.stringify(await workspace());
    const bundle = await read();
    if (url.includes("preview=1")) {
      if (new URL(url, "http://fixture.invalid").searchParams.get("hash") !== bundle.hash) throw Error("SAVED_HASH_CHANGED");
      return JSON.stringify({ bundle, components: [], packages, composition: null, shells: [], code: { [bundle.hash]: "export {};" } });
    }
    return JSON.stringify(bundle);
  };
  return { root: root2, service, locator, packages, calls, read, workspace, bridge, async close() {
    inject();
    if (!path7.resolve(root2).startsWith(parent + path7.sep + "page-")) throw Error("UNSAFE_TEST_CLEANUP");
    const trace = [...events];
    await fs2.rm(root2, { recursive: true, force: true });
    return trace;
  } };
}

// tests/html-first/source.test.ts
test("real owner save/reload preserves HTML literal attributes, booleans, text slots and order", async () => {
  const f = await fixture();
  try {
    const def = f.packages[0].definition;
    let n = 0, source = insertNode("", "uib-card", f.packages[0].id, void 0, () => `node_${++n}`), id = "node_2";
    for (const [k, v] of Object.entries({ heading: 'A "quote" & <literal>\nnext', variant: "outlined", disabled: true, body: 'Body $1 & "quoted" <text>', header: "Header", footer: "Footer" })) source = setNodeSetting(source, id, k, v, def);
    assert.ok(!source.includes("data-uip-settings"));
    const before = await f.read();
    const saved = JSON.parse(await f.bridge("/api/apps/fixture-app/visual-pages", JSON.stringify({ method: "PUT", body: JSON.stringify({ files: { ...before.files, source }, expectedHash: before.hash }) })));
    const loaded = await f.read();
    assert.equal(loaded.hash, saved.hash);
    assert.equal(loaded.files.source, source);
    assert.deepEqual(readNodeSettings(loaded.files.source, id, def), readNodeSettings(source, id, def));
    assert.ok(source.indexOf("Body") < source.indexOf("Header"));
    const updated = setNodeSetting(source, id, "heading", "Second value", def);
    assert.equal(readNodeSettings(updated, id, def).heading, "Second value");
    assert.ok(!updated.includes("data-uip-settings"));
  } finally {
    await f.close();
  }
});
test("explicit field edit replaces its old JSON duplicate, preserves other legacy data and false semantics", async () => {
  const f = await fixture();
  try {
    const def = f.packages[0].definition;
    let source = '<uib-card data-uip-node="card" data-uip-component="' + f.packages[0].id + '" heading="literal" data-uip-settings="{&quot;heading&quot;:&quot;legacy&quot;,&quot;interactionMode&quot;:&quot;none&quot;}"></uib-card>';
    assert.equal(readNodeSettings(source, "card", def).heading, "legacy");
    source = setNodeSetting(source, "card", "heading", "New literal", def);
    assert.equal(readNodeSettings(source, "card", def).heading, "New literal");
    assert.ok(!parseSource(source).nodes[0].attributes["data-uip-settings"].includes("heading"));
    source = setNodeSetting(source, "card", "disabled", true, def);
    source = setNodeSetting(source, "card", "disabled", false, def);
    assert.equal(parseSource(source).nodes[0].attributes.disabled, void 0);
  } finally {
    await f.close();
  }
});
test("second real UI Base Panel uses declared same-name HTML properties and shared validation", async () => {
  const f = await fixture();
  try {
    const panel = f.packages[1], contracts = legacyPackageSettingContracts(panel);
    let source = '<uib-panel data-uip-node="panel" data-uip-component="' + panel.id + '"></uib-panel>';
    source = setNodeSetting(source, "panel", "variant", "flat", void 0, contracts);
    source = setNodeSetting(source, "panel", "density", "compact", void 0, contracts);
    assert.ok(!source.includes("data-uip-settings"));
    assert.equal(readNodeSettings(source, "panel", void 0, contracts).variant, "flat");
    const metadata = (await f.read()).metadata;
    assert.deepEqual(validateArtifact({ metadata, source, css: "" }, [], f.packages).filter((d) => d.severity === "error"), []);
    assert.throws(() => setNodeSetting(source, "panel", "variant", "invalid", void 0, contracts));
  } finally {
    await f.close();
  }
});
test("nested/mixed content and malformed/duplicate managed identities are not silently rewritten", async () => {
  const f = await fixture();
  try {
    const def = f.packages[0].definition;
    for (const inner of ['<uib-panel data-uip-node="child"></uib-panel>', 'text<span slot="header">Header</span>more']) assert.throws(() => setNodeSetting('<uib-card data-uip-node="card">' + inner + "</uib-card>", "card", "body", "replace", def));
    assert.throws(() => setNodeSetting('<uib-card data-uip-node="card" DATA-UIP-NODE="other"></uib-card>', "card", "heading", "x", def));
    const source = setNodeAttribute('<uib-card data-uip-node="card"></uib-card>', "card", "heading", '<&" $& $1');
    assert.equal(parseSource(source).nodes[0].attributes.heading, '<&" $& $1');
  } finally {
    await f.close();
  }
});
