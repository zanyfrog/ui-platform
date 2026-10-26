// tests/saved-card-selection/owner-target.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
var decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
function parseSource(source2) {
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
  while (match = token.exec(source2)) {
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
      const ending = close.exec(source2);
      if (ending) {
        node.closeStart = ending.index;
        node.end = close.lastIndex;
        token.lastIndex = close.lastIndex;
      } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags.has(tag) && !raw.endsWith("/>")) stack.push(node);
  }
  while (stack.length && optionalTags.has(stack.at(-1).tag)) implicitClose(source2.length);
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
    for (const [name, source2] of Object.entries(m.sources ?? {})) if (source2.kind === "service" && !services.includes(source2.reference ?? "")) warning(`Named source ${name} is supported but has no executable adapter: ${source2.reference}.`);
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
    visit(artifact, []);
  } catch (cause) {
    error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return diagnostics;
}
function componentReferences(source2) {
  return [...new Set(parseSource(source2).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
}

// src/client/visual-artifacts/saved-card-target.ts
var CARD_DEFINITION_ID = "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1";
function immutableSavedCard(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) immutableSavedCard(child);
    Object.freeze(value);
  }
  return value;
}
function savedCardContextKey(context2) {
  if (!context2?.applicationId || !context2.subjectId || !context2.sessionRevision || context2.page?.format !== "visual" || context2.page.owner?.kind !== "application" || context2.page.owner.id !== context2.applicationId || !/^art_[\w-]+$/.test(context2.page.id) || context2.page.repairLocator !== void 0) return;
  return JSON.stringify([context2.applicationId, context2.page.owner.kind, context2.page.owner.id, context2.page.owner.revision ?? null, context2.page.id, context2.subjectId, context2.sessionRevision]);
}
async function identifyRetainedSavedCard(input) {
  const generation = { ...input.generation };
  const refuse = (reason) => immutableSavedCard({ state: "unavailable", reason, generation, target: null });
  try {
    const { context: context2, bundle, baseline, candidate, packages, componentIds } = input;
    if (!savedCardContextKey(context2)) return refuse("NO_CONTEXT");
    if (!candidate) return refuse("NO_SELECTION");
    if (!/^[a-f0-9]{64}$/.test(bundle.hash) || JSON.stringify(bundle.files) !== JSON.stringify(baseline)) return refuse("SOURCE_UNCERTAIN");
    const parsedMetadata = parseMetadata(baseline.metadata), metadata = parsedMetadata.metadata;
    if (!metadata || parsedMetadata.diagnostics.some((d2) => d2.severity === "error") || metadata.kind !== "page" || metadata.artifactId !== context2.page.id || !bundle.metadata || JSON.stringify(metadata) !== JSON.stringify(bundle.metadata) || bundle.diagnostics.some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
    const parsed = parseSource(baseline.source);
    if (parsed.diagnostics.some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
    const nodes = parsed.nodes.filter((node2) => node2.id === candidate);
    if (nodes.length !== 1) return refuse("MISSING_NODE");
    const node = nodes[0];
    if (node.manual || node.tag !== "uib-card" || node.attributes["data-uip-component"] !== CARD_DEFINITION_ID || !node.parent?.id || node.parent.manual || !node.parent.attributes.class?.split(/\s+/).includes("uip-layout-item")) return refuse("UNSUPPORTED_NODE");
    const matches = packages.filter((pkg2) => pkg2.id === CARD_DEFINITION_ID);
    if (matches.length > 1 || componentIds.includes(CARD_DEFINITION_ID)) return refuse("AMBIGUOUS_DEFINITION");
    if (!matches.length) return refuse("MISSING_DEFINITION");
    const pkg = matches[0];
    const d = pkg.definition;
    if (!d || d.schemaVersion !== "1.0.0" || d.identity?.componentId !== CARD_DEFINITION_ID || pkg.tagName !== "uib-card" || pkg.packageName !== "@ui-base/ui" || d.ownership?.scope !== "platform" || d.ownership.package?.scope !== "platform" || d.ownership.package.packageId !== pkg.packageName || !pkg.packageVersion || d.ownership.package.version !== pkg.packageVersion || d.version?.packageVersion !== pkg.packageVersion || !Object.hasOwn(d.version, "revisionId") || !(d.version.revisionId === null || typeof d.version.revisionId === "string" && d.version.revisionId.length > 0) || d.implementation?.type !== "code" || d.implementation.tagName !== "uib-card" || !d.implementation.importPath?.startsWith("@ui-base/ui/") || !d.implementation.exportName || !/^[A-Za-z_$][\w$]*$/.test(d.implementation.exportName) || d.implementation.runtimeBinding?.kind !== "custom-element" || d.implementation.runtimeBinding.tagName !== "uib-card") return refuse("INVALID_DEFINITION");
    const unsupported = ["shellId", "modes", "form", "bindings", "conditions", "repeaters", "events", "onLoad", "sources", "state", "dependencies"];
    if (unsupported.some((key) => metadata[key] !== void 0) || !["", "export {};"].includes(baseline.code.trim()) || parsed.nodes.some((n) => ["script", "iframe", "object", "embed", "template", "base", "link"].includes(n.tag) || Object.keys(n.attributes).some((name) => /^on/i.test(name) || name.startsWith("data-uip-") && !["data-uip-node", "data-uip-component", "data-uip-settings"].includes(name)) || n.attributes["data-uip-component"] && n.attributes["data-uip-component"] !== CARD_DEFINITION_ID)) return refuse("UNSUPPORTED_SEMANTICS");
    if (validateArtifact({ metadata, source: baseline.source, css: baseline.css }, [], packages).some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
    const stored = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
    const settings = readPackageSettings(pkg.definition, node.attributes, stored);
    if ((settings.interactionMode ?? pkg.definition.builder.settings.interactionMode?.default) !== "none") return refuse("UNSUPPORTED_SEMANTICS");
    const allowed = /* @__PURE__ */ new Set(["class", "data-uip-node", "data-uip-component", "data-uip-settings", ...Object.values(pkg.definition.builder.settings).flatMap((c) => c.binding?.kind === "attribute" && c.binding.name ? [c.binding.name] : [])]);
    if (Object.keys(node.attributes).some((name) => !allowed.has(name))) return refuse("UNSUPPORTED_SEMANTICS");
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(baseline)))), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (hash !== bundle.hash) return refuse("SOURCE_UNCERTAIN");
    return immutableSavedCard({ state: "identified", reason: "RETAINED_SAVED_VERSION_ONLY", generation, target: {
      source: { applicationId: context2.applicationId, page: JSON.parse(JSON.stringify(context2.page)), committedHash: bundle.hash, nodeId: candidate },
      implementation: { componentId: CARD_DEFINITION_ID, packageId: pkg.packageName, packageVersion: pkg.packageVersion, importPath: d.implementation.importPath, exportName: d.implementation.exportName, definitionRevision: d.version.revisionId },
      context: { subjectId: context2.subjectId, sessionRevision: context2.sessionRevision }
    } });
  } catch {
    return refuse("SOURCE_UNCERTAIN");
  }
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

// tests/saved-card-selection/fixtures.ts
var context = { applicationId: "original-permanent-app", page: { owner: { kind: "application", id: "original-permanent-app", revision: "owner-1" }, format: "visual", id: "art_original_page" }, subjectId: "original-subject", sessionRevision: "original-session" };
var source = `<div class="uip-layout-item" data-uip-node="wrapper"><uib-card data-uip-node="saved" data-uip-component="${CARD_DEFINITION_ID}"></uib-card></div>`;
var digest = async (value) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
async function fixture(markup = source, metadataExtra = {}) {
  const metadata = { schemaVersion: 1, artifactId: context.page.id, kind: "page", name: "saved-memory", displayName: "Saved memory", route: "/", ...metadataExtra };
  const files = { source: markup, css: "uib-card { display: block; }", metadata: JSON.stringify(metadata), fixtures: "{}", code: "export {};" };
  const definition = structuredClone(ui_component_default.components.find((c) => c.identity?.componentId === CARD_DEFINITION_ID));
  return { context: structuredClone(context), bundle: { locator: "memory/page.visual.json", files, hash: await digest(JSON.stringify(files)), metadata, diagnostics: [] }, baseline: structuredClone(files), candidate: "saved", packages: [{ id: CARD_DEFINITION_ID, tagName: "uib-card", packageName: "@ui-base/ui", packageVersion: "0.5.1", definition }], componentIds: [], generation: { selection: 3, source: 5 } };
}

// tests/saved-card-selection/owner-target.test.ts
test("retained canonical Card preserves original source, hash, implementation and legitimate null revision distinctly", async () => {
  const input = await fixture(), value = await identifyRetainedSavedCard(input);
  assert.equal(value.state, "identified");
  if (value.state !== "identified") throw Error(value.reason);
  assert.deepEqual(value.target.source, { applicationId: context.applicationId, page: context.page, committedHash: input.bundle.hash, nodeId: "saved" });
  assert.deepEqual(value.target.implementation, { componentId: CARD_DEFINITION_ID, packageId: "@ui-base/ui", packageVersion: "0.5.1", importPath: "@ui-base/ui/card", exportName: "UibCard", definitionRevision: null });
  assert.deepEqual(value.generation, { selection: 3, source: 5 });
  assert.equal(value.reason, "RETAINED_SAVED_VERSION_ONLY");
  const before = JSON.stringify(value);
  input.context.page.owner.id = "other";
  input.bundle.files.source = "draft";
  assert.equal(JSON.stringify(value), before);
  assert.throws(() => {
    value.target.source.page.owner.id = "forged";
  }, TypeError);
  assert.throws(() => {
    value.state = "available";
  }, TypeError);
  assert.deepEqual(Object.keys(value).sort(), ["generation", "reason", "state", "target"]);
  assert(!/locator|credential|csrf|resourceUrl|sourceBytes|markup/.test(JSON.stringify(value)));
});
for (const [label, edit, reason] of [
  ["missing candidate", (i) => i.candidate = "missing", "MISSING_NODE"],
  ["manual candidate", (i) => i.candidate = "manual:0", "MISSING_NODE"],
  ["missing hash", (i) => i.bundle.hash = "", "SOURCE_UNCERTAIN"],
  ["wrong hash", (i) => i.bundle.hash = "0".repeat(64), "SOURCE_UNCERTAIN"],
  ["baseline mismatch", (i) => i.baseline.source = "changed", "SOURCE_UNCERTAIN"],
  ["metadata mismatch", (i) => i.bundle.metadata.artifactId = "art_other", "INVALID_SOURCE"],
  ["missing package", (i) => i.packages = [], "MISSING_DEFINITION"],
  ["duplicate package", (i) => i.packages.push(structuredClone(i.packages[0])), "AMBIGUOUS_DEFINITION"],
  ["platform collision", (i) => i.componentIds = [CARD_DEFINITION_ID], "AMBIGUOUS_DEFINITION"],
  ["missing declaration", (i) => delete i.packages[0].definition, "INVALID_DEFINITION"],
  ["missing export", (i) => delete i.packages[0].definition.implementation.exportName, "INVALID_DEFINITION"],
  ["missing revision evidence", (i) => delete i.packages[0].definition.version.revisionId, "INVALID_DEFINITION"],
  ["wrong package owner", (i) => i.packages[0].packageName = "other", "INVALID_DEFINITION"],
  ["wrong package version", (i) => i.packages[0].packageVersion = "9.0.0", "INVALID_DEFINITION"],
  ["resource URL in export identity", (i) => i.packages[0].definition.implementation.importPath = "https://invalid.example/card", "INVALID_DEFINITION"]
]) test(`refuses ${label}`, async () => {
  const input = await fixture();
  edit(input);
  const value = await identifyRetainedSavedCard(input);
  assert.equal(value.state, "unavailable");
  assert.equal(value.reason, reason);
  assert.equal(value.target, null);
  assert.throws(() => {
    value.target = {};
  }, TypeError);
});
for (const [label, markup, metadata, reason] of [
  ["duplicate node attribute", source.replace('data-uip-node="saved"', 'data-uip-node="saved" DATA-UIP-NODE="other"'), {}, "INVALID_SOURCE"],
  ["duplicate reference", source.replace(`data-uip-component="${CARD_DEFINITION_ID}"`, `data-uip-component="other" data-uip-component="${CARD_DEFINITION_ID}"`), {}, "INVALID_SOURCE"],
  ["duplicate cross-node id", source + source, {}, "INVALID_SOURCE"],
  ["draft-only node", source.replace('data-uip-node="saved"', 'data-uip-node="other"'), {}, "MISSING_NODE"],
  ["manual Card", source.replace('data-uip-node="saved"', ""), {}, "MISSING_NODE"],
  ["unwrapped Card", `<uib-card data-uip-node="saved" data-uip-component="${CARD_DEFINITION_ID}"></uib-card>`, {}, "UNSUPPORTED_NODE"],
  ["mode", source, { modes: { default: "base", overrides: { base: {} } } }, "UNSUPPORTED_SEMANTICS"],
  ["binding", source, { bindings: [] }, "UNSUPPORTED_SEMANTICS"],
  ["Shell dependency", source, { shellId: "art_shell" }, "UNSUPPORTED_SEMANTICS"],
  ["inline script", source + "<script>const x=1;</script>", {}, "UNSUPPORTED_SEMANTICS"],
  ["inline event", source.replace("<uib-card ", '<uib-card onclick="noop()" '), {}, "UNSUPPORTED_SEMANTICS"]
]) test(`refuses ${label} from retained baseline`, async () => {
  const value = await identifyRetainedSavedCard(await fixture(markup, metadata));
  assert.equal(value.state, "unavailable");
  assert.equal(value.reason, reason);
});
test("declared explicit Definition revision is preserved without substitution", async () => {
  const input = await fixture();
  input.packages[0].definition.version.revisionId = "declared-revision";
  const value = await identifyRetainedSavedCard(input);
  assert.equal(value.state, "identified");
  if (value.state === "identified") assert.equal(value.target.implementation.definitionRevision, "declared-revision");
});
