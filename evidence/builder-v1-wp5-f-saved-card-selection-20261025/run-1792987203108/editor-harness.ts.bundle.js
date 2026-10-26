(() => {
  // packages/visual-artifacts/src/source.ts
  var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
  var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
  var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
  var escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
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
  function setNodeAttribute(source2, id, name, value) {
    if (!/^[\w:-]+$/.test(name)) throw new Error("Invalid attribute name.");
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) throw new Error("Repair source structure before editing attributes.");
    const node = parsed.nodes.find((n) => n.id === id);
    if (!node || node.manual || parsed.nodes.filter((n) => n.id === id).length !== 1) throw new Error("Select an unambiguous editor-managed node.");
    const opening = source2.slice(node.start, node.openEnd);
    const identityName = /^(data-uip-node|data-uip-component)$/i.test(name);
    const pattern = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`, identityName ? "i" : "");
    const attr = ` ${name}="${escapeAttribute(value)}"`;
    const next = pattern.test(opening) ? opening.replace(pattern, () => attr) : opening.replace(/\s*\/?>$/, (end) => attr + end);
    return source2.slice(0, node.start) + next + source2.slice(node.openEnd);
  }
  function insertNode(source2, tag, componentId, parentId, newId = () => `node_${globalThis.crypto.randomUUID()}`, slot) {
    if (!/^[a-z][a-z0-9-]*$/.test(tag) || ["script", "style", "iframe"].includes(tag)) throw new Error("Unsupported insertion tag.");
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before inserting.");
    const parent = parentId ? parsed.nodes.find((n) => n.id === parentId) : void 0;
    if (parentId && (!parent || parent.attributes["data-uip-component"] && slot === void 0 || voidTags.has(parent.tag))) throw new Error("Insert into an ordinary HTML container or layout wrapper.");
    const offset = parent?.closeStart ?? source2.length;
    const markup = `
<div class="uip-layout-item" data-uip-node="${newId()}"${slot !== void 0 ? ` slot="${escapeAttribute(slot)}"` : ""}>
  <${tag} data-uip-node="${newId()}"${componentId ? ` data-uip-component="${escapeAttribute(componentId)}"` : ""}>${voidTags.has(tag) ? "" : `</${tag}>`}
</div>
`;
    return source2.slice(0, offset) + markup + source2.slice(offset);
  }
  function moveNode(source2, id, direction) {
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair source structure before moving.");
    const selected = parsed.nodes.find((n) => n.id === id);
    const node = isWrapper(selected?.parent) ? selected.parent : selected;
    if (!node || !node.id) throw new Error("Select a managed layout node.");
    const siblings = parsed.nodes.filter((n) => n.parent === node.parent);
    const adjacent = siblings[siblings.indexOf(node) + (direction === "up" ? -1 : 1)];
    if (!adjacent) return source2;
    if (!adjacent.id || adjacent.manual) throw new Error("Move only between managed siblings; edit manual regions in source.");
    const [first, second] = node.start < adjacent.start ? [node, adjacent] : [adjacent, node];
    return source2.slice(0, first.start) + source2.slice(second.start, second.end) + source2.slice(first.end, second.start) + source2.slice(first.start, first.end) + source2.slice(second.end);
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
      const visit = (current3, path) => {
        const id = current3.metadata.componentId ?? current3.metadata.artifactId;
        if (path.includes(id)) {
          error(`Component dependency cycle: ${[...path, id].join(" \u2192 ")}.`);
          return;
        }
        for (const ref of /* @__PURE__ */ new Set([...componentReferences(current3.source), ...current3.metadata.dependencies ?? []])) {
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

  // packages/visual-artifacts/src/composition.ts
  var recommendedRegionIds = ["region-header", "region-navigation", "region-hero", "region-main", "region-sidebar", "region-secondary", "region-footer"];
  function regions(source2) {
    const parsed = parseSource(source2);
    if (parsed.diagnostics.some((d) => d.severity === "error")) throw new Error("Repair region source structure first: " + parsed.diagnostics.filter((d) => d.severity === "error").map((d) => d.message).join(" "));
    const ids = /* @__PURE__ */ new Set();
    return parsed.nodes.filter((node) => Object.hasOwn(node.attributes, "data-uip-region")).map((node) => {
      const regionId = node.attributes["data-uip-region"];
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(regionId) || ids.has(regionId)) throw new Error(`Invalid or duplicate Region ID: ${regionId}.`);
      ids.add(regionId);
      return { regionId, displayName: node.attributes["data-uip-region-name"] ?? regionId, nodeId: node.id, content: source2.slice(node.openEnd, node.closeStart), start: node.start, openEnd: node.openEnd, closeStart: node.closeStart, end: node.end };
    });
  }

  // src/client/visual-artifacts/menu-controls.ts
  function chooseNamedValue(title, choices) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.setAttribute("aria-label", title);
      const form = document.createElement("form");
      form.method = "dialog";
      const label = document.createElement("label");
      label.textContent = title;
      const select = document.createElement("select");
      select.setAttribute("aria-label", title);
      select.required = true;
      for (const item of choices) select.add(new Option(item.label, item.value));
      label.append(select);
      const apply = document.createElement("button");
      apply.textContent = "Apply selection";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Cancel";
      cancel.onclick = () => dialog.close();
      form.append(label, apply, cancel);
      dialog.append(form);
      let result;
      form.onsubmit = (event) => {
        event.preventDefault();
        result = select.value;
        dialog.close();
      };
      dialog.onclose = () => {
        dialog.remove();
        resolve(result);
      };
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  // src/shared/platform-settings.ts
  var defaultAutosave = Object.freeze({ enabled: true, delayMs: 2e3 });
  var record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
  function validateAutosave(value) {
    if (!record(value) || Object.keys(value).some((key) => !["enabled", "delayMs"].includes(key)) || typeof value.enabled !== "boolean" || !Number.isInteger(value.delayMs) || value.delayMs < 100 || value.delayMs > 6e4 || value.delayMs % 10 !== 0)
      throw new Error("Autosave requires a boolean enabled value and an integer delay of 100\u201360000 milliseconds in increments of 10.");
  }

  // src/client/artifact-editor/autosave-configuration.ts
  var current = { ...defaultAutosave };
  var listeners = /* @__PURE__ */ new Set();
  function autosaveConfiguration() {
    return { ...current };
  }
  function configureAutosave(value) {
    validateAutosave(value);
    if (current.enabled === value.enabled && current.delayMs === value.delayMs) return;
    current = { ...value };
    for (const listener of listeners) listener({ ...current });
  }
  function subscribeAutosave(listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  // src/client/artifact-editor/editing-lifecycle.ts
  var EditingLifecycle = class {
    constructor(value, save, equal = (a, b) => JSON.stringify(a) === JSON.stringify(b), limits = { entries: 100, bytes: 8 * 1024 * 1024 }) {
      this.save = save;
      this.equal = equal;
      this.limits = limits;
      this.current = structuredClone(value);
      this.baseline = structuredClone(value);
      this.unsubscribeAutosave = subscribeAutosave((value2) => {
        this.autosave = value2;
        this.lastEdit = Date.now();
        this.schedule();
        this.emit();
      });
    }
    save;
    equal;
    limits;
    current;
    baseline;
    generation = 0;
    savedGeneration = 0;
    state = "idle";
    failure;
    notice;
    suspended = false;
    disposed = false;
    inFlight;
    timer;
    lastEdit = 0;
    past = [];
    future = [];
    group;
    groupTime = 0;
    uncertain = false;
    listeners = /* @__PURE__ */ new Set();
    autosave = autosaveConfiguration();
    unsubscribeAutosave;
    get dirty() {
      return this.uncertain || !this.equal(this.current, this.baseline);
    }
    get canUndo() {
      return !this.suspended && !this.disposed && !!this.past.length;
    }
    get canRedo() {
      return !this.suspended && !this.disposed && !!this.future.length;
    }
    get historySize() {
      return { entries: this.past.length + this.future.length, bytes: [...this.past, ...this.future].reduce((n, entry) => n + entry.bytes, 0) };
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    emit() {
      for (const listener of this.listeners) listener();
    }
    entry(value) {
      const retained = structuredClone(value), seen = /* @__PURE__ */ new WeakSet();
      const estimate = (item) => {
        if (typeof item === "string") return 32 + item.length * 2;
        if (!item || typeof item !== "object") return 8;
        if (seen.has(item)) return 0;
        seen.add(item);
        return 64 + Object.entries(item).reduce((bytes, [key, child]) => bytes + 16 + key.length * 2 + estimate(child), 0);
      };
      return { value: retained, bytes: estimate(retained) };
    }
    bound() {
      while (this.historySize.entries > this.limits.entries || this.historySize.bytes > this.limits.bytes) {
        if (this.past.length) this.past.shift();
        else this.future.shift();
      }
    }
    edit(value, group) {
      if (this.suspended || this.disposed) throw new Error("Editing access is suspended or closed.");
      if (this.equal(value, this.current)) return;
      const now = Date.now();
      if (!group || group !== this.group || now - this.groupTime > 750) this.past.push(this.entry(this.current));
      this.future = [];
      this.group = group;
      this.groupTime = now;
      this.bound();
      this.current = structuredClone(value);
      this.changed();
    }
    changed() {
      this.generation++;
      this.lastEdit = Date.now();
      this.notice = void 0;
      if (this.state !== "conflict") {
        this.state = this.inFlight ? "saving" : this.dirty ? "pending" : "saved";
        this.failure = void 0;
      }
      this.schedule();
      this.emit();
    }
    undo() {
      if (!this.canUndo) return;
      this.future.push(this.entry(this.current));
      this.current = this.past.pop().value;
      this.group = void 0;
      this.bound();
      this.changed();
    }
    redo() {
      if (!this.canRedo) return;
      this.past.push(this.entry(this.current));
      this.current = this.future.pop().value;
      this.group = void 0;
      this.bound();
      this.changed();
    }
    schedule() {
      clearTimeout(this.timer);
      if (!this.autosave.enabled || this.disposed || this.suspended || this.inFlight || this.failure || this.state === "conflict" || this.state === "error" || !this.dirty) return;
      this.timer = setTimeout(() => {
        void this.flush();
      }, Math.max(0, this.autosave.delayMs - (Date.now() - this.lastEdit)));
    }
    async flush() {
      clearTimeout(this.timer);
      if (this.inFlight) {
        await this.inFlight;
        if (this.state !== "error" && this.state !== "conflict") return this.flush();
        return;
      }
      if (this.disposed || this.suspended || this.state === "conflict") return;
      if (!this.dirty) {
        this.savedGeneration = this.generation;
        this.state = "saved";
        this.emit();
        return;
      }
      const candidate = structuredClone(this.current), baseline = structuredClone(this.baseline), generation = this.generation;
      this.state = "saving";
      this.failure = void 0;
      this.emit();
      this.inFlight = (async () => {
        try {
          const saved = await this.save(candidate, baseline);
          this.baseline = structuredClone(saved);
          this.savedGeneration = generation;
          this.uncertain = false;
          if (this.generation === generation) this.current = structuredClone(saved);
          if (this.state !== "conflict") this.state = this.dirty ? "pending" : "saved";
        } catch (error) {
          const failure2 = error;
          if (this.state !== "conflict") {
            const invalid = failure2.status === 422 || failure2.validation?.valid === false;
            if (invalid && this.generation !== generation) {
              this.state = this.dirty ? "pending" : "saved";
              this.failure = void 0;
            } else {
              this.state = failure2.status === 409 ? "conflict" : invalid ? "pending" : "error";
              this.failure = failure2.message ?? String(error);
              if (this.state === "error") this.uncertain = true;
            }
          }
        }
      })();
      await this.inFlight;
      this.inFlight = void 0;
      if (this.generation !== generation || !this.failure) this.schedule();
      this.emit();
    }
    conflict(message = "Source changed outside Builder. Compare or reload; local changes retained.") {
      clearTimeout(this.timer);
      this.state = "conflict";
      this.failure = message;
      this.emit();
    }
    reset(remote, local = remote) {
      if (this.inFlight) throw new Error("Wait for the admitted save before replacing the baseline.");
      clearTimeout(this.timer);
      this.uncertain = false;
      this.baseline = structuredClone(remote);
      this.current = structuredClone(local);
      this.past = [];
      this.future = [];
      this.group = void 0;
      this.generation++;
      this.savedGeneration = this.dirty ? this.generation - 1 : this.generation;
      this.state = this.dirty ? "pending" : "idle";
      this.failure = void 0;
      this.notice = "Source baseline replaced. Undo/Redo history reset.";
      this.schedule();
      this.emit();
    }
    confirmBaseline(remote) {
      if (!this.equal(remote, this.baseline)) throw new Error("Changed source requires explicit baseline replacement.");
      this.baseline = structuredClone(remote);
      this.uncertain = false;
    }
    suspend() {
      this.suspended = true;
      clearTimeout(this.timer);
      this.emit();
    }
    resume() {
      if (this.disposed) throw new Error("Editor is closed.");
      if (!this.suspended) return;
      this.suspended = false;
      this.schedule();
      this.emit();
    }
    async dispose() {
      this.suspend();
      if (this.inFlight) await this.inFlight;
      this.disposed = true;
      this.unsubscribeAutosave();
      this.past = [];
      this.future = [];
      this.listeners.clear();
    }
  };
  function protectEditingDraft(needsWarning, host2 = window) {
    const handler = (event) => {
      if (needsWarning()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    host2.addEventListener("beforeunload", handler);
    return () => host2.removeEventListener("beforeunload", handler);
  }
  var editingStatus = (state, dirty) => state === "saving" ? "Saving" : state === "conflict" ? "Conflict" : state === "error" ? "Save Failed" : dirty ? "Unsaved" : "Saved";

  // src/client/artifact-editor/saved-source.ts
  var listeners2 = /* @__PURE__ */ new Set();
  function sourceSaved(url) {
    if (true) return;
    const match = /^\/api\/apps\/([^/]+)\/(visual-|composition-source|settings|presentation|artifacts)/.exec(url);
    if (match || url.startsWith("/api/automation/")) for (const listener of listeners2) listener(match && !url.includes("/visual-components") ? decodeURIComponent(match[1]) : void 0);
  }

  // src/client/artifact-editor/specialized-transport.ts
  async function specializedTransport(options, revoked) {
    let binding;
    let unsubscribe2 = () => {
    };
    if (false) {
      const session = await null;
      binding = session.createEditorSessionBinding();
      try {
        await binding.headers();
      } catch (error) {
        binding.revoke();
        binding = void 0;
        if (error.code !== "editor.disabled") throw error;
      }
      if (binding) unsubscribe2 = session.subscribeEditorSession(() => {
        try {
          binding.assert();
        } catch {
          revoked();
        }
      });
    }
    const request = options.request ?? (async (url, init) => {
      const headers = await binding?.headers();
      binding?.assert();
      const response = await fetch(url, { ...init, headers: { ...headers, ...options.applicationId ? { "x-editor-application-id": options.applicationId } : {}, ...init?.body instanceof FormData ? {} : { "content-type": "application/json" }, ...init?.headers } });
      const result = await response.json();
      binding?.assert();
      if (!response.ok) throw Object.assign(new Error(result.error ?? result.code ?? "Source request failed."), { status: response.status, code: result.code });
      if (init?.method === "PUT") sourceSaved(url);
      return result;
    });
    return { request, capture: options.captureRequest ?? (() => {
      binding?.assert();
      return request;
    }), dispose() {
      unsubscribe2();
      binding?.revoke();
    } };
  }

  // src/client/visual-artifacts/authoring-controls.ts
  var el = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== void 0) node.textContent = text;
    return node;
  };
  function textControl(parent, label, value = "") {
    const row = el("label", label), input = el("input");
    input.value = value;
    input.setAttribute("aria-label", label);
    row.append(input);
    parent.append(row);
    return input;
  }
  function choice(parent, label, values, value) {
    const row = el("label", label), input = el("select");
    input.setAttribute("aria-label", label);
    values.forEach(([key, name]) => input.add(new Option(name, key)));
    if (value !== void 0) input.value = value;
    row.append(input);
    parent.append(row);
    return input;
  }
  function button(parent, label, run, error) {
    const node = el("button", label);
    node.type = "button";
    node.onclick = () => {
      void Promise.resolve().then(run).catch(error);
    };
    parent.append(node);
    return node;
  }
  function valueControls(parent, label, value, change, depth = 0) {
    const type = Array.isArray(value) ? "array" : value === null || value === void 0 ? "string" : typeof value;
    if (type === "object" || type === "array") {
      if (depth > 8) {
        parent.append(el("p", `${label}: nested value exceeds the supported authoring depth.`));
        return;
      }
      const group = el("fieldset");
      group.append(el("legend", label));
      parent.append(group);
      const current3 = value;
      for (const [key, item] of Object.entries(current3)) valueControls(group, `${label}.${key}`, item, (next) => {
        const copy = structuredClone(value);
        copy[key] = next;
        change(copy);
      }, depth + 1);
      const name = type === "object" ? textControl(group, `${label} member name`) : void 0;
      const kind = choice(group, `${label} member type`, ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
      button(group, `Add ${label} member`, () => {
        const key = name?.value ?? String(value.length);
        if (!/^[A-Za-z][\w]*$/.test(key) && type === "object" || ["__proto__", "prototype", "constructor"].includes(key) || Object.hasOwn(current3, key)) throw new Error("Choose a new ordinary member name.");
        const item = kind.value === "number" ? 0 : kind.value === "boolean" ? false : kind.value === "object" ? {} : kind.value === "array" ? [] : "";
        const copy = structuredClone(value);
        copy[key] = item;
        change(copy);
      }, (cause) => group.append(el("p", String(cause))));
      return;
    }
    const input = textControl(parent, label, String(value ?? ""));
    input.type = type === "boolean" ? "checkbox" : type === "number" ? "number" : "text";
    input.checked = value === true;
    input.onchange = () => change(type === "boolean" ? input.checked : type === "number" ? Number(input.value) : input.value);
  }
  function expressionControl(parent, label, initial) {
    const group = el("fieldset");
    group.append(el("legend", label));
    parent.append(group);
    const mode = choice(group, `${label} source`, [["path", "Named source path"], ["string", "Literal text"], ["number", "Literal number"], ["boolean", "Literal boolean"]], typeof initial === "string" || !initial ? "path" : "literal" in initial ? typeof initial.literal : "path");
    const input = textControl(group, `${label} value`, typeof initial === "string" ? initial : initial && "literal" in initial ? String(initial.literal) : "route.id");
    return () => mode.value === "path" ? input.value : { literal: mode.value === "number" ? Number(input.value) : mode.value === "boolean" ? input.value === "true" : input.value };
  }
  function compositionAuthoring(parent, options) {
    const { metadata, node, change, error } = options;
    if (!node) {
      const name = textControl(parent, "Artifact display name", metadata.displayName);
      name.onchange = () => change((m) => {
        m.displayName = name.value;
      });
      if (metadata.kind === "page") {
        const route = textControl(parent, "Page route", metadata.route);
        route.onchange = () => change((m) => {
          m.route = route.value;
        });
      }
      const group = el("fieldset");
      group.append(el("legend", "Local state"));
      parent.append(group);
      for (const [key, value] of Object.entries(metadata.state ?? {})) valueControls(group, `State ${key}`, value, (next) => change((m) => {
        m.state[key] = next;
      }));
      const state = textControl(group, "New local state");
      const stateType = choice(group, "New local state type", ["result", "string", "number", "boolean", "object", "array"].map((value) => [value, value]));
      button(group, "Declare local state", () => {
        if (!/^[A-Za-z][\w]*$/.test(state.value) || ["constructor", "prototype", "__proto__"].includes(state.value) || Object.hasOwn(metadata.state ?? {}, state.value)) throw new Error("Choose a new local state name.");
        change((m) => {
          (m.state ??= {})[state.value] = stateType.value === "object" ? {} : stateType.value === "array" ? [] : stateType.value === "number" ? 0 : stateType.value === "boolean" ? false : stateType.value === "string" ? "" : null;
        });
      }, error);
      if (metadata.kind !== "page") publicControls(parent, metadata.public, change, error);
      return;
    }
    if (options.slot) {
      const slot = choice(parent, "Instance child slot", [["", "Unassigned"], ...options.slot.choices.map((v) => [v, v])], options.slot.value);
      slot.onchange = () => options.slot.change(slot.value);
    }
    if (options.slots?.length) parent.append(el("p", `Declared slots: ${options.slots.join(", ")}. Insert a child and assign its slot.`));
    const binding = el("fieldset");
    binding.append(el("legend", "Instance binding"));
    parent.append(binding);
    const targets = options.bindingTargets ?? ["text"];
    const target = choice(binding, "Binding target", targets.map((v) => [v, v]));
    const expr = expressionControl(binding, "Binding");
    button(binding, "Apply binding", () => change((m) => {
      m.bindings = [...(m.bindings ?? []).filter((item) => !(item.node === node && item.target === target.value)), { node, target: target.value, value: expr() }];
    }), error);
    for (const existing of metadata.bindings?.filter((item) => item.node === node) ?? []) {
      const row = el("p", `${existing.target}: ${typeof existing.value === "string" ? existing.value : "declarative expression"}`);
      binding.append(row);
      button(row, `Remove binding ${existing.target}`, () => change((m) => {
        m.bindings = m.bindings?.filter((item) => item !== m.bindings?.find((candidate) => candidate.node === node && candidate.target === existing.target));
      }), error);
    }
    const events2 = el("fieldset");
    events2.append(el("legend", "Event action"));
    parent.append(events2);
    if (!options.events?.length) {
      events2.append(el("p", "No public event metadata is declared for this Component."));
      return;
    }
    const draft = options.draft ?? {};
    const event = choice(events2, "Action event", options.events.map((v) => [v, v]), draft.event);
    event.onchange = () => {
      draft.event = event.value;
    };
    const kind = choice(events2, "Action kind", [["navigate", "Navigate"], ["set", "Set local state"], ["emit", "Emit public event"], ["service", "Existing Dataset service"], ["record-delete", "Protected single-record delete"], ["workflow", "Run approved Workflow"]], draft.kind);
    const details = el("div");
    events2.append(details);
    const render = () => {
      details.replaceChildren();
      const add = (action) => button(details, "Add event action", () => change((m) => {
        const declaration = m.events?.find((item) => item.node === node && item.event === event.value);
        if (declaration) declaration.actions.push(action());
        else (m.events ??= []).push({ node, event: event.value, actions: [action()] });
      }), error);
      if (kind.value === "workflow") {
        const selected = choice(details, "Workflow", (draft.workflows ?? []).map((w) => [w.id, w.displayName]));
        const record2 = expressionControl(details, "Workflow record");
        const result = choice(details, "Workflow result state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
        details.append(el("p", "Result retains completedSteps, committedSteps, failedStep, failedActionId and serviceEffects. Bind these paths to visible text. Transport failure has an unknown outcome; never retry automatically."));
        button(details, "Load approved Workflows", async () => {
          if (!options.workflows) throw new Error("An Application-owned protected host is required.");
          draft.workflows = await options.workflows();
          options.refresh?.();
        }, error);
        add(() => {
          if (!selected.value || !result.value) throw new Error("Choose an approved Workflow and explicitly declared result state.");
          return { kind: "workflow", workflowId: selected.value, primaryRecordId: record2(), resultState: result.value };
        });
        return;
      }
      if (kind.value === "record-delete") {
        const explanation = el("p", "Resolve an applied Dataset and its permanent primary field. DOE enforces current permissions and record eligibility.");
        details.append(explanation);
        const renderTargets = (datasets) => {
          const selected = choice(details, "Delete Dataset", datasets.map((item) => [item.appliedSchema.dataset.id, item.name ?? item.appliedSchema.dataset.name]));
          const record2 = expressionControl(details, "Delete record");
          const result = choice(details, "Delete result state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
          add(() => {
            const schema = datasets.find((item) => item.appliedSchema.dataset.id === selected.value)?.appliedSchema;
            const primary = schema?.fields.filter((field) => field.type === "id");
            if (!schema || primary?.length !== 1 || !result.value) throw new Error("An applied Dataset with one declared primary identity and an explicit local result state are required.");
            return { kind: "record-delete", version: 1, datasetId: schema.dataset.id, primaryFieldId: primary[0].id, recordId: record2(), resultState: result.value };
          });
        };
        if (draft.datasets) renderTargets(draft.datasets);
        button(details, "Load applied delete targets", async () => {
          draft.datasets = (await options.datasets()).filter((item) => item.appliedSchema);
          options.refresh?.();
        }, error);
        return;
      }
      if (kind.value === "navigate") {
        const to = expressionControl(details, "Destination", { literal: "/" });
        add(() => ({ kind: "navigate", to: to() }));
      } else if (kind.value === "set") {
        const state = choice(details, "Action local state", Object.keys(metadata.state ?? {}).map((v) => [v, v]));
        const value = expressionControl(details, "Action value");
        add(() => {
          if (!state.value) throw new Error("Declare local state first.");
          return { kind: "set", state: state.value, value: value() };
        });
      } else if (kind.value === "service") {
        const reference = choice(details, "Existing service", [["dataset.read", "Protected Dataset read"], ["dataset.write", "Protected Dataset write"]]);
        const input = expressionControl(details, "Service input");
        add(() => ({ kind: "service", reference: reference.value, input: input() }));
      } else {
        const emitted = choice(details, "Public event", Object.keys(metadata.public?.events ?? {}).map((v) => [v, v]));
        const payload = el("div");
        details.append(payload);
        let values = {};
        const refresh = () => {
          payload.replaceChildren();
          values = Object.fromEntries(Object.keys(metadata.public?.events[emitted.value]?.payload ?? {}).map((key) => [key, expressionControl(payload, `Payload ${key}`)]));
        };
        emitted.onchange = refresh;
        refresh();
        add(() => {
          if (!emitted.value) throw new Error("Declare a public event first.");
          return { kind: "emit", event: emitted.value, payload: Object.fromEntries(Object.entries(values).map(([key, get]) => [key, get()])) };
        });
      }
    };
    kind.onchange = () => {
      draft.kind = kind.value;
      render();
    };
    render();
    for (const declaration of metadata.events?.filter((item) => item.node === node) ?? []) declaration.actions.forEach((action, index) => {
      const row = el("p", `${declaration.event}: ${action.kind}`);
      events2.append(row);
      button(row, `Remove ${declaration.event} action ${index + 1}`, () => change((m) => {
        const item = m.events.find((item2) => item2.node === node && item2.event === declaration.event);
        item.actions.splice(index, 1);
        if (!item.actions.length) m.events = m.events.filter((other) => other !== item);
      }), error);
    });
  }
  function publicControls(parent, api, change, error) {
    const group = el("fieldset");
    group.append(el("legend", "Shared public contract"));
    parent.append(group);
    const name = textControl(group, "Public member name");
    const kind = choice(group, "Public member kind", [["property", "Property"], ["event", "Event"], ["slot", "Slot"]]);
    const type = choice(group, "Public property type", ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
    const required = textControl(group, "Required public property");
    required.type = "checkbox";
    button(group, "Declare public member", () => {
      if (!/^[A-Za-z][\w]*$/.test(name.value) || ["constructor", "prototype", "__proto__"].includes(name.value)) throw new Error("Choose an ordinary public member name.");
      change((m) => {
        const target = m.public ??= { properties: {}, events: {}, slots: [] };
        if (kind.value === "slot") {
          if (target.slots.includes(name.value)) throw new Error("Slot already declared.");
          target.slots.push(name.value);
        } else if (kind.value === "event") {
          if (target.events[name.value]) throw new Error("Event already declared.");
          target.events[name.value] = { payload: {} };
        } else {
          if (target.properties[name.value]) throw new Error("Property already declared.");
          target.properties[name.value] = { type: type.value, required: required.checked, default: type.value === "object" ? {} : type.value === "array" ? [] : type.value === "boolean" ? false : type.value === "number" ? 0 : "" };
        }
      });
    }, error);
    for (const [key, contract] of Object.entries(api?.properties ?? {})) valueControls(group, `Public default ${key}`, contract.default, (value) => change((m) => {
      m.public.properties[key].default = value;
    }));
    for (const event of Object.keys(api?.events ?? {})) {
      const field = textControl(group, `${event} payload field`);
      const fieldType = choice(group, `${event} payload type`, ["string", "number", "boolean", "object", "array"].map((v) => [v, v]));
      button(group, `Add ${event} payload field`, () => {
        if (!/^[A-Za-z][\w]*$/.test(field.value) || ["constructor", "prototype", "__proto__"].includes(field.value)) throw new Error("Choose an ordinary payload field.");
        change((m) => {
          if (m.public.events[event].payload[field.value]) throw new Error("Payload field already declared.");
          m.public.events[event].payload[field.value] = { type: fieldType.value, required: true };
        });
      }, error);
    }
    group.append(el("p", `Slots: ${api?.slots.join(", ") || "none"}`));
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
    const text = (value) => typeof value === "string" && value.length > 0;
    if (!text(context2?.applicationId) || !text(context2?.subjectId) || !text(context2?.sessionRevision) || context2?.page?.format !== "visual" || context2.page.owner?.kind !== "application" || context2.page.owner.id !== context2.applicationId || !text(context2.page.id) || !/^art_[\w-]+$/.test(context2.page.id) || context2.page.repairLocator !== void 0 || context2.page.owner.revision !== void 0 && !text(context2.page.owner.revision)) return;
    return JSON.stringify([context2.applicationId, context2.page.owner.kind, context2.page.owner.id, context2.page.owner.revision ?? null, context2.page.id, context2.subjectId, context2.sessionRevision]);
  }
  async function identifyRetainedSavedCard(input) {
    const generation = { ...input.generation };
    const refuse = (reason) => immutableSavedCard({ state: "unavailable", reason, generation, target: null });
    try {
      const { context: context2, bundle: bundle2, baseline, candidate, packages, componentIds } = input;
      if (!savedCardContextKey(context2)) return refuse("NO_CONTEXT");
      if (!candidate) return refuse("NO_SELECTION");
      if (typeof bundle2.hash !== "string" || !/^[a-f0-9]{64}$/.test(bundle2.hash) || ["source", "css", "metadata", "fixtures", "code"].some((role) => typeof baseline[role] !== "string") || JSON.stringify(bundle2.files) !== JSON.stringify(baseline)) return refuse("SOURCE_UNCERTAIN");
      const parsedMetadata = parseMetadata(baseline.metadata), metadata = parsedMetadata.metadata;
      if (!metadata || parsedMetadata.diagnostics.some((d2) => d2.severity === "error") || metadata.kind !== "page" || metadata.artifactId !== context2.page.id || !bundle2.metadata || JSON.stringify(metadata) !== JSON.stringify(bundle2.metadata) || bundle2.diagnostics.some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
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
      if (!d || d.schemaVersion !== "1.0.0" || d.identity?.componentId !== CARD_DEFINITION_ID || pkg.tagName !== "uib-card" || pkg.packageName !== "@ui-base/ui" || d.ownership?.scope !== "platform" || d.ownership.package?.scope !== "platform" || d.ownership.package.packageId !== pkg.packageName || typeof pkg.packageVersion !== "string" || !pkg.packageVersion || d.ownership.package.version !== pkg.packageVersion || d.version?.packageVersion !== pkg.packageVersion || !Object.hasOwn(d.version, "revisionId") || !(d.version.revisionId === null || typeof d.version.revisionId === "string" && d.version.revisionId.length > 0) || d.implementation?.type !== "code" || d.implementation.tagName !== "uib-card" || typeof d.implementation.importPath !== "string" || !d.implementation.importPath.startsWith("@ui-base/ui/") || typeof d.implementation.exportName !== "string" || !/^[A-Za-z_$][\w$]*$/.test(d.implementation.exportName) || d.implementation.runtimeBinding?.kind !== "custom-element" || d.implementation.runtimeBinding.tagName !== "uib-card") return refuse("INVALID_DEFINITION");
      const unsupported = ["shellId", "modes", "form", "bindings", "conditions", "repeaters", "events", "onLoad", "sources", "state", "dependencies"];
      if (unsupported.some((key) => metadata[key] !== void 0) || !["", "export {};"].includes(baseline.code.trim()) || parsed.nodes.some((n) => ["script", "iframe", "object", "embed", "template", "base", "link"].includes(n.tag) || Object.keys(n.attributes).some((name) => /^on/i.test(name) || name.startsWith("data-uip-") && !["data-uip-node", "data-uip-component", "data-uip-settings"].includes(name)) || n.attributes["data-uip-component"] && n.attributes["data-uip-component"] !== CARD_DEFINITION_ID)) return refuse("UNSUPPORTED_SEMANTICS");
      if (validateArtifact({ metadata, source: baseline.source, css: baseline.css }, [], packages).some((d2) => d2.severity === "error")) return refuse("INVALID_SOURCE");
      const stored = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
      const settings = readPackageSettings(pkg.definition, node.attributes, stored);
      if ((settings.interactionMode ?? pkg.definition.builder.settings.interactionMode?.default) !== "none") return refuse("UNSUPPORTED_SEMANTICS");
      const allowed = /* @__PURE__ */ new Set(["class", "data-uip-node", "data-uip-component", "data-uip-settings", ...Object.values(pkg.definition.builder.settings).flatMap((c) => c.binding?.kind === "attribute" && c.binding.name ? [c.binding.name] : [])]);
      if (Object.keys(node.attributes).some((name) => !allowed.has(name))) return refuse("UNSUPPORTED_SEMANTICS");
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(baseline)))), (byte) => byte.toString(16).padStart(2, "0")).join("");
      if (hash !== bundle2.hash) return refuse("SOURCE_UNCERTAIN");
      return immutableSavedCard({ state: "identified", reason: "RETAINED_SAVED_VERSION_ONLY", generation, target: {
        source: { applicationId: context2.applicationId, page: { owner: { kind: "application", id: context2.page.owner.id, ...context2.page.owner.revision === void 0 ? {} : { revision: context2.page.owner.revision } }, format: "visual", id: context2.page.id }, committedHash: bundle2.hash, nodeId: candidate },
        implementation: { componentId: CARD_DEFINITION_ID, packageId: pkg.packageName, packageVersion: pkg.packageVersion, importPath: d.implementation.importPath, exportName: d.implementation.exportName, definitionRevision: d.version.revisionId },
        context: { subjectId: context2.subjectId, sessionRevision: context2.sessionRevision }
      } });
    } catch {
      return refuse("SOURCE_UNCERTAIN");
    }
  }

  // src/client/visual-artifacts/editor.ts
  var esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  async function mountVisualEditor(target, appKey, options = {}) {
    const copies = /* @__PURE__ */ new Map();
    let copy;
    const transport = await specializedTransport(options, () => {
      for (const item of copies.values()) item.lifecycle.suspend();
      target.hidden = true;
    });
    const request = transport.request;
    let active = !options.initial, disposed = false, operations = 0;
    const base = `/api/apps/${encodeURIComponent(appKey)}`;
    let workspace2, selected, selectedKind = "page";
    let files, baseline, hash = "", role = "source", selectedNode = "", conflict = false, saving = false;
    let preview, polling = false;
    const actionDrafts = /* @__PURE__ */ new Map();
    const readCardContext = () => {
      try {
        return options.savedCardContext?.get();
      } catch {
        return void 0;
      }
    };
    const originalCardContextKey = savedCardContextKey(readCardContext());
    let cardEpoch = 0, cardSelectionGeneration = 0, cardSourceGeneration = 0, cardPending = false, cardTerminal = false;
    const cardListeners = /* @__PURE__ */ new Set();
    const cardGenerations = () => ({ selection: cardSelectionGeneration, source: cardSourceGeneration });
    let cardValue = immutableSavedCard({ state: "unavailable", reason: "NO_SELECTION", generation: cardGenerations(), target: null });
    let cardCompletion;
    function publishCard(value) {
      cardValue = immutableSavedCard(value);
      for (const listener of [...cardListeners]) {
        if (cardValue !== value) break;
        if (!cardListeners.has(listener)) continue;
        try {
          listener(value);
        } catch {
        }
      }
    }
    function invalidateCard(reason, selection = false) {
      if (cardTerminal) return;
      cardEpoch++;
      if (selection) cardSelectionGeneration++;
      else cardSourceGeneration++;
      cardPending = false;
      cardCompletion = void 0;
      publishCard({ state: "unavailable", reason, generation: cardGenerations(), target: null });
    }
    function cardRefusal() {
      if (disposed || cardTerminal) return "DISPOSED";
      if (!originalCardContextKey) return "NO_CONTEXT";
      if (savedCardContextKey(readCardContext()) !== originalCardContextKey || readCardContext()?.applicationId !== options.applicationId) return "CONTEXT_CHANGED";
      if (copy?.lifecycle.suspended) return "SUSPENDED";
      if (!active || !target.isConnected || target.hidden || document.visibilityState === "hidden") return "NOT_ACTIVE";
      if (!copy || selectedKind !== "page" || !selectedNode) return "NO_SELECTION";
      if (copy.lifecycle.inFlight || copy.lifecycle.state === "saving") return "SAVE_PENDING";
      if (copy.lifecycle.state === "conflict") return "SOURCE_UNCERTAIN";
      if (copy.lifecycle.failure || copy.lifecycle.state === "error") return "SAVE_FAILED";
      if (copy.lifecycle.dirty) return "DIRTY_DRAFT";
    }
    function cardSignature() {
      return JSON.stringify([
        savedCardContextKey(readCardContext()),
        selectedNode,
        copy?.bundle,
        copy?.lifecycle.baseline,
        copy?.lifecycle.generation,
        copy?.lifecycle.savedGeneration,
        copy?.lifecycle.state,
        copy?.lifecycle.dirty,
        workspace2.packages,
        workspace2.components.map((bundle2) => bundle2.metadata?.componentId)
      ]);
    }
    function evaluateCard() {
      if (cardTerminal) return;
      const refusal = cardRefusal();
      if (refusal) {
        publishCard({ state: "unavailable", reason: refusal, generation: cardGenerations(), target: null });
        return;
      }
      const epoch = cardEpoch, signature = cardSignature();
      cardPending = true;
      const input = structuredClone({
        context: readCardContext(),
        bundle: copy.bundle,
        baseline: copy.lifecycle.baseline,
        candidate: selectedNode,
        packages: workspace2.packages,
        componentIds: workspace2.components.map((bundle2) => bundle2.metadata?.componentId),
        generation: cardGenerations()
      });
      void identifyRetainedSavedCard(input).then((value) => {
        if (cardTerminal || epoch !== cardEpoch) return;
        cardPending = false;
        if (cardRefusal() || signature !== cardSignature()) {
          invalidateCard("SOURCE_UNCERTAIN");
          return;
        }
        publishCard(value);
      });
    }
    const cardVisibility = () => invalidateCard("NOT_ACTIVE");
    const savedCardTarget = Object.freeze({
      get snapshot() {
        const reason = cardRefusal();
        if ((cardValue.state === "identified" || cardPending) && reason) invalidateCard(reason);
        return cardValue;
      },
      subscribe(listener) {
        if (!cardTerminal) cardListeners.add(listener);
        try {
          listener(this.snapshot);
        } catch {
        }
        return () => {
          cardListeners.delete(listener);
        };
      }
    });
    const dirty = () => !!copy?.lifecycle.dirty;
    const list = (kind) => kind === "page" ? workspace2.pages : kind === "shell" ? workspace2.shells : workspace2.components;
    const plural = (kind) => kind === "page" ? "pages" : kind === "shell" ? "shells" : "components";
    const url = () => `${base}/visual-${plural(selectedKind)}?locator=${encodeURIComponent(selected.locator)}`;
    target.innerHTML = `<div class="stack"><div class="pane-heading"><strong>Visual Artifacts</strong><span data-status aria-live="polite"></span></div>
    <div class="editor-actions"><button data-create="page">Create Page</button><button data-create="component">Create Platform Component</button><button data-create="form-dataset">Create Form from Dataset</button><button data-create="form">Create blank Form</button><select aria-label="Visual Artifact" data-artifacts><option value="">Select an artifact</option></select></div>
    <div data-work hidden><div class="editor-actions"><button data-undo>Undo</button><button data-redo>Redo</button><button data-save>Save Now</button><button data-repair>Advanced source repair save</button><button data-reload>Reload / discard editor changes</button><button data-recover>Download editor recovery</button><button data-delete>Delete artifact</button><button data-preview>Design preview</button><button data-change-shell>Change Page Shell</button><button data-add-region>Add Region</button><button data-remove-node>Remove selected node</button></div>
    <div data-diagnostics></div><div class="builder-layout" style="grid-template-columns:minmax(180px,1fr) minmax(220px,2fr)"><div class="stack"><strong>Structure</strong><select data-nodes size="8" aria-label="Visual node"></select>
    <label>Insert into selected HTML container, or artifact root<select data-insert aria-label="Insert element"></select></label><button data-add>Insert with layout wrapper</button><button data-root>Select artifact root</button><button data-move="up">Move layout item up</button><button data-move="down">Move layout item down</button><div data-inspector></div></div>
    <div class="stack"><label>Source file<select data-file aria-label="Visual source file">${["source", "css", "metadata", "fixtures", "code"].map((name) => `<option>${name}</option>`).join("")}</select></label><textarea data-source aria-label="Visual source" class="source-editor" spellcheck="false"></textarea><p class="note">Use the authoring controls for public settings, bindings, slots and events. Advanced source is preserved. Design preview does not persist data or run custom functions.</p></div></div><div data-preview-host></div></div></div>`;
    const find = (selector) => target.querySelector(selector);
    const status = (message) => {
      find("[data-status]").textContent = message;
      options.onStateChange?.();
    };
    const safe = (run) => async () => {
      if (disposed || !active) return;
      operations++;
      try {
        await run();
      } catch (error) {
        status(error instanceof Error ? error.message : String(error));
      } finally {
        operations--;
        options.onStateChange?.();
      }
    };
    find('[data-create="page"]').insertAdjacentHTML("afterend", '<button data-create="shell">Create Shell</button>');
    find("[data-add-region]").insertAdjacentHTML("afterend", "<button data-place-menu>Place Application Menu</button>");
    find("[data-place-menu]").addEventListener("click", safe(async () => {
      const composition = await request(`${base}/composition`);
      const menuId = await chooseNamedValue("Application Menu", composition.menus.map((menu) => ({ value: menu.menuId, label: menu.name })));
      if (!menuId || !active || disposed) return;
      if (!composition.menus.some((menu) => menu.menuId === menuId)) throw new Error("Choose an Application Menu.");
      const wrapperId = `node_${crypto.randomUUID()}`, nodeId = `node_${crypto.randomUUID()}`, ids = [wrapperId, nodeId];
      files.source = insertNode(files.source, "nav", void 0, selectedNode || void 0, () => ids.shift());
      files.source = setNodeAttribute(files.source, nodeId, "data-uip-menu", menuId);
      files.source = setNodeAttribute(files.source, nodeId, "aria-label", composition.menus.find((menu) => menu.menuId === menuId).name);
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-add-region]").addEventListener("click", safe(() => {
      const shell = selectedKind === "page" ? workspace2.shells.find((shell2) => shell2.metadata?.artifactId === workingMetadata().shellId) : void 0;
      const choices = shell ? regions(shell.files.source).map((region) => region.regionId) : [...recommendedRegionIds];
      const id = prompt("Region ID (stable; custom region- IDs allowed in Shells):\n" + choices.join("\n"), choices[0]);
      if (!id) return;
      if (shell && !choices.includes(id)) throw new Error("Choose a Region from the Page Shell.");
      if (regions(files.source).some((region) => region.regionId === id)) throw new Error("Region already exists.");
      const name = prompt("Region display name:", id);
      if (name === null) return;
      files.source += `
<section class="uip-layout-item" data-uip-node="node_${crypto.randomUUID()}" data-uip-region="${esc(id)}" data-uip-region-name="${esc(name)}"></section>
`;
      regions(files.source);
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-remove-node]").addEventListener("click", safe(() => {
      const node = parseSource(files.source).nodes.find((node2) => node2.id === selectedNode);
      if (!node) throw new Error("Select a Page-owned or Shell-owned node.");
      if (!confirm("Remove selected node and its children? Removing a Page Region restores the Shell default; keeping an empty Region suppresses it.")) return;
      files.source = files.source.slice(0, node.start) + files.source.slice(node.end);
      selectedNode = "";
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-change-shell]").addEventListener("click", safe(async () => {
      if (dirty() || conflict) throw new Error("Save or recover changes before changing Shell.");
      const shellId = prompt("New Shell ID:\n" + workspace2.shells.map((shell2) => `${shell2.metadata?.displayName}: ${shell2.metadata?.artifactId}`).join("\n"));
      if (!shellId) return;
      const shell = workspace2.shells.find((shell2) => shell2.metadata?.artifactId === shellId);
      if (!shell) throw new Error("Shell is missing.");
      const available = regions(shell.files.source).map((region) => region.regionId), decisions = {};
      for (const region of regions(files.source)) if (!available.includes(region.regionId)) {
        const mapping = prompt(`Map ${region.regionId} to one of:
${available.join("\n")}
Type DISCARD to explicitly discard this Region. Cancel keeps the current Shell.`);
        if (mapping === null) return;
        decisions[region.regionId] = mapping === "DISCARD" ? null : mapping;
      }
      const bundle2 = await request(`${base}/page-shell`, { method: "POST", body: JSON.stringify({ locator: selected.locator, shellId, decisions, expectedHash: hash }) });
      workspace2 = await request(`${base}/visual-artifacts`);
      open(bundle2, "page");
    }));
    function renderList() {
      find('[data-create="shell"]').hidden = !workspace2.shells?.length;
      const select = find("[data-artifacts]");
      select.innerHTML = '<option value="">Select an artifact</option>' + [["Pages", workspace2.pages], ["Shells", workspace2.shells ?? []], ["Platform Components", workspace2.components]].map(([label, items]) => `<optgroup label="${label}">${items.map((b) => `<option value="${label === "Pages" ? "page" : label === "Shells" ? "shell" : "component"}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some((d) => d.severity === "error") ? " (needs repair)" : ""}</option>`).join("")}</optgroup>`).join("");
      if (selected) select.value = `${selectedKind}:${selected.locator}`;
      find("[data-insert]").innerHTML = '<optgroup label="HTML">' + ["section", "div", "article", "p", "h2", "a", "button", "img", "ul", "li", "span", "uip-slot"].map((tag) => `<option value="html:${tag}">${tag}</option>`).join("") + '</optgroup><optgroup label="Package Components">' + workspace2.packages.filter((p) => !p.activationIssues?.length).map((p) => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join("") + '</optgroup><optgroup label="Platform Components">' + workspace2.components.filter((b) => b.metadata && !b.diagnostics.some((d) => d.severity === "error")).map((b) => `<option value="component:${esc(b.metadata.componentId)}">${esc(b.metadata.displayName)}</option>`).join("") + "</optgroup>";
    }
    function workingMetadata() {
      const metadata = parseMetadata(files.metadata).metadata;
      if (!metadata) throw new Error("Repair metadata JSON first.");
      return metadata;
    }
    function changeMetadata(change) {
      const metadata = workingMetadata();
      change(metadata);
      files.metadata = JSON.stringify(metadata, null, 2) + "\n";
      changed();
    }
    function paintState() {
      const lifecycle = copy?.lifecycle;
      conflict = lifecycle?.state === "conflict";
      saving = lifecycle?.state === "saving";
      status(lifecycle ? [editingStatus(lifecycle.state, lifecycle.dirty), lifecycle.failure, lifecycle.notice].filter(Boolean).join(" \xB7 ") : "Select an artifact");
      find("[data-save]").disabled = conflict || !lifecycle?.dirty;
      find("[data-undo]").disabled = !lifecycle?.canUndo;
      find("[data-redo]").disabled = !lifecycle?.canRedo;
    }
    function changed(group) {
      invalidateCard("SOURCE_CHANGED");
      if (copy && JSON.stringify(files) !== JSON.stringify(copy.lifecycle.current)) {
        copy.saveRequest = transport.capture();
        copy.lifecycle.edit(files, group);
      }
      paintState();
      if (role !== "source") find("[data-source]").value = files[role];
      try {
        renderStructure();
      } catch {
        status("Invalid local source retained. Repair source before using structured controls.");
      }
    }
    function renderStructure() {
      const parsed = parseSource(files.source);
      const selector = find("[data-nodes]");
      const shell = selectedKind === "page" ? workspace2.shells?.find((shell2) => shell2.metadata?.artifactId === workingMetadata().shellId) : void 0;
      selector.innerHTML = (shell ? '<optgroup label="Shell context \u2014 locked; edit the Shell">' + parseSource(shell.files.source).nodes.filter((n) => !n.attributes["data-uip-region"]).map((n) => `<option disabled>\u{1F512} ${esc(n.tag + " " + (n.id ?? ""))}</option>`).join("") + "</optgroup>" : "") + parsed.nodes.map((n, index) => `<option value="${esc(n.id ?? `manual:${index}`)}">${esc(`${n.attributes["data-uip-region"] ?? n.tag} ${n.attributes["data-uip-region-name"] ?? n.id ?? "(manual)"}`)}</option>`).join("");
      selector.value = selectedNode;
      find("[data-diagnostics]").innerHTML = [...selected?.diagnostics ?? [], ...parsed.diagnostics].map((d) => `<p class="${d.severity === "error" ? "error" : "note"}">${esc(d.message)}</p>`).join("");
      renderInspector();
    }
    function renderInspector() {
      const inspector = find("[data-inspector]");
      const parsed = parseSource(files.source);
      const node = parsed.nodes.find((n) => n.id === selectedNode);
      inspector.innerHTML = "";
      const definitionId = node?.attributes["data-uip-component"];
      if (definitionId && workspace2.components.some((component2) => component2.metadata?.componentId === definitionId) && options.onDefinition) {
        const edit = document.createElement("button");
        edit.textContent = "Edit Definition";
        edit.onclick = () => options.onDefinition(definitionId);
        inspector.append(edit);
      }
      if (!node) {
        inspector.innerHTML = '<p class="note">Select a managed node to edit settings and bindings.</p>';
        const metadata = workingMetadata();
        compositionAuthoring(inspector, { metadata, change: changeMetadata, workflows: async () => (await request(`${base}/automation-catalog`)).workflows, datasets: () => request(`${base}/datasets/discovery`), error: (cause) => status(String(cause)) });
        if (selectedKind === "page" && metadata.shellId) {
          const note = document.createElement("p");
          note.textContent = `Shell: ${workspace2.shells.find((shell) => shell.metadata?.artifactId === metadata.shellId)?.metadata?.displayName ?? metadata.shellId}. Fixed content is edited in the Shell editor.`;
          inspector.append(note);
          const override = document.createElement("button");
          override.textContent = "Set Page Menu Item visibility / availability";
          override.addEventListener("click", safe(() => {
            const menuId = prompt("Application Menu ID:");
            if (!menuId) return;
            const itemId = prompt("Existing Menu Item ID:");
            if (!itemId) return;
            const setting = prompt("Override: hidden or disabled", "hidden");
            if (!setting || !["hidden", "disabled"].includes(setting)) return;
            const value = prompt("true or false", "true");
            if (value !== "true" && value !== "false") return;
            changeMetadata((metadata2) => {
              metadata2.menuOverrides ??= {};
              const menu = metadata2.menuOverrides[menuId] ??= {};
              menu.items ??= {};
              menu.items[itemId] ??= {};
              Object.assign(menu.items[itemId], { [setting]: value === "true" });
            });
          }));
          inspector.append(override);
          const local = document.createElement("button");
          local.textContent = "Add Page-local Menu Item";
          local.addEventListener("click", safe(() => {
            const menuId = prompt("Application Menu ID:");
            if (!menuId) return;
            const label = prompt("Page-local item label:");
            if (!label) return;
            const destination = prompt("Destination JSON:", '{"kind":"page","pageId":"' + metadata.artifactId + '"}');
            if (!destination) return;
            const parentItemId = prompt("Parent Menu Item ID (empty for root):", "");
            if (parentItemId === null) return;
            const item = { itemId: `local-${crypto.randomUUID()}`, label, destination: JSON.parse(destination) };
            changeMetadata((metadata2) => {
              metadata2.menuOverrides ??= {};
              const menu = metadata2.menuOverrides[menuId] ??= {};
              (menu.additions ??= []).push({ ...parentItemId ? { parentItemId } : {}, item });
            });
          }));
          inspector.append(local);
        }
        if (metadata.form) {
          for (const [labelText, value, change] of [
            ["Dataset target", metadata.form.datasetId, (m, v) => {
              m.form.datasetId = v;
            }],
            ["Submit service", metadata.form.submit.service, (m, v) => {
              m.form.submit.service = v;
            }],
            ["Read service", metadata.form.submit.readService, (m, v) => {
              m.form.submit.readService = v;
            }],
            ["Default mode", metadata.modes.default, (m, v) => {
              m.modes.default = v;
              m.modes.overrides[v] ??= {};
              m.public.properties.mode.default = v;
            }]
          ]) {
            const label = document.createElement("label");
            label.textContent = labelText;
            const input = document.createElement("input");
            input.value = value;
            input.setAttribute("aria-label", labelText);
            input.addEventListener("change", safe(() => changeMetadata((m) => change(m, input.value))));
            label.append(input);
            inspector.append(label);
          }
          const addMode = document.createElement("button");
          addMode.textContent = "Add mode";
          addMode.addEventListener("click", safe(() => {
            const name = prompt("Mode name:");
            if (name) changeMetadata((m) => {
              m.modes.overrides[name] ??= {};
            });
          }));
          inspector.append(addMode);
        }
        return;
      }
      if (node.manual) {
        inspector.textContent = "Manual region: edit source directly.";
        return;
      }
      const classLabel = document.createElement("label");
      classLabel.textContent = "CSS classes";
      const classInput = document.createElement("input");
      classInput.value = node.attributes.class ?? "";
      classInput.addEventListener("change", safe(() => {
        files.source = setNodeAttribute(files.source, selectedNode, "class", classInput.value);
        find("[data-source]").value = files[role];
        changed();
      }));
      classLabel.append(classInput);
      inspector.append(classLabel);
      if (selectedKind === "shell" && ["img", "strong", "span", "p", "h1", "h2", "h3"].includes(node.tag)) {
        const label = document.createElement("label");
        label.textContent = "Application branding";
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Application branding");
        for (const key of ["", ...node.tag === "img" ? ["primaryLogo", "secondaryLogo", "favicon"] : ["applicationName", "shortName"]]) select.add(new Option(key || "No branding binding", key));
        select.value = node.attributes["data-uip-branding"] ?? "";
        select.onchange = safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-branding", select.value);
          find("[data-source]").value = files[role];
          changed();
        });
        label.append(select);
        inspector.append(label);
      }
      if (node.attributes["data-uip-region"]) {
        const label = document.createElement("label");
        label.textContent = "Region display name (stable ID unchanged)";
        const input = document.createElement("input");
        input.value = node.attributes["data-uip-region-name"] ?? node.attributes["data-uip-region"];
        input.addEventListener("change", safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-region-name", input.value);
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input);
        inspector.append(label);
      }
      const field = workingMetadata().form?.fields.find((f) => f.node === selectedNode);
      if (field) {
        const mode = document.createElement("select");
        mode.setAttribute("aria-label", "Field override mode");
        for (const name of ["base", ...Object.keys(workingMetadata().modes.overrides)]) {
          const option = document.createElement("option");
          option.textContent = name;
          mode.append(option);
        }
        inspector.append(mode);
        for (const key of ["label", "help", "visible", "editable", "required"]) {
          const label = document.createElement("label");
          label.textContent = `Field ${key}`;
          const input = document.createElement("input");
          input.type = ["visible", "editable", "required"].includes(key) ? "checkbox" : "text";
          const refresh2 = () => {
            const m = workingMetadata();
            const value = mode.value === "base" ? field[key] : m.modes.overrides[mode.value][field.node]?.[key] ?? field[key];
            input.value = String(value ?? "");
            input.checked = value !== false && (key !== "required" || Boolean(value));
          };
          refresh2();
          mode.addEventListener("change", refresh2);
          input.setAttribute("aria-label", `Field ${key}`);
          input.addEventListener("change", safe(() => changeMetadata((m) => {
            const target2 = mode.value === "base" ? m.form.fields.find((f) => f.id === field.id) : m.modes.overrides[mode.value][field.node] ??= {};
            Object.assign(target2, { [key]: input.type === "checkbox" ? input.checked : input.value });
          })));
          label.append(input);
          inspector.append(label);
        }
      }
      const pkg = workspace2.packages.find((p) => p.id === node.attributes["data-uip-component"]);
      const component = workspace2.components.find((c) => c.metadata?.componentId === node.attributes["data-uip-component"]);
      const contracts = pkg?.definition?.builder.settings ?? (pkg ? legacyPackageSettingContracts(pkg) : component?.metadata?.public?.properties ?? {});
      let settings;
      try {
        settings = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
      } catch {
        inspector.textContent = "Repair settings JSON in source first.";
        return;
      }
      if (pkg?.definition) settings = readPackageSettings(pkg.definition, node.attributes, settings);
      if (pkg && !pkg.definition) {
        inspector.append(Object.assign(document.createElement("p"), { textContent: "Legacy package metadata: only declared attributes/properties are configurable. Typed public slots/events are unavailable unless explicitly declared." }));
        const unavailable = Object.keys(pkg.presentation?.settings ?? {}).filter((key) => !contracts[key]);
        if (unavailable.length) inspector.append(Object.assign(document.createElement("p"), { textContent: `No declared direct instance mapping: ${unavailable.join(", ")}. These presentation record fields are unavailable here; no attribute conversion is inferred.` }));
        for (const key of /* @__PURE__ */ new Set([...pkg.attributes ?? [], ...pkg.properties ?? []])) {
          if (contracts[key]) continue;
          const label = document.createElement("label");
          label.textContent = key;
          const input = document.createElement("input");
          input.setAttribute("aria-label", `Setting ${key}`);
          input.value = String(settings[key] ?? node.attributes[key] ?? "");
          input.onchange = safe(() => {
            settings[key] = input.value;
            files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
            changed();
          });
          label.append(input);
          inspector.append(label);
        }
      }
      for (const [key, contract] of Object.entries(contracts)) {
        const packageSetting = pkg?.definition?.builder.settings[key];
        if (packageSetting?.binding?.kind === "event") {
          inspector.append(Object.assign(document.createElement("p"), { textContent: `${key}: registered handler selection is unavailable in this host. Use the declared public event action controls.` }));
          continue;
        }
        if (packageSetting?.visibleWhen && (settings[packageSetting.visibleWhen.setting] ?? contracts[packageSetting.visibleWhen.setting]?.default) !== packageSetting.visibleWhen.equals) continue;
        if (contract.type === "object" || contract.type === "array") {
          valueControls(inspector, `Setting ${key}`, settings[key] ?? contract.default ?? (contract.type === "array" ? [] : {}), (value2) => {
            settings[key] = value2;
            files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
            changed();
          });
          continue;
        }
        const label = document.createElement("label");
        label.textContent = key;
        const values = key === "mode" && component?.metadata?.modes ? Object.keys(component.metadata.modes.overrides) : contract.enum;
        const input = values ? document.createElement("select") : document.createElement("input");
        if (input instanceof HTMLSelectElement) values.forEach((value2) => {
          const option = document.createElement("option");
          option.value = JSON.stringify(value2);
          option.textContent = String(value2);
          input.append(option);
        });
        if (input instanceof HTMLInputElement) input.type = contract.type === "boolean" ? "checkbox" : contract.type === "number" ? "number" : "text";
        const value = settings[key] ?? contract.default;
        if (input instanceof HTMLSelectElement) input.value = JSON.stringify(value);
        else if (input.type === "checkbox") input.checked = Boolean(value);
        else input.value = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
        input.setAttribute("aria-label", `Setting ${key}`);
        input.addEventListener("change", safe(() => {
          settings[key] = input instanceof HTMLSelectElement ? JSON.parse(input.value) : input.type === "checkbox" ? input.checked : input.type === "number" ? Number(input.value) : ["object", "array"].includes(contract.type) ? JSON.parse(input.value) : input.value;
          for (const [name, item] of Object.entries(pkg?.definition?.builder.settings ?? {})) if (item.visibleWhen && (settings[item.visibleWhen.setting] ?? pkg.definition.builder.settings[item.visibleWhen.setting].default) !== item.visibleWhen.equals) settings[name] = item.default;
          files.source = setNodeAttribute(files.source, selectedNode, "data-uip-settings", JSON.stringify(settings));
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input);
        inspector.append(label);
      }
      if (!node.attributes["data-uip-component"] && !isWrapper(node)) {
        const label = document.createElement("label");
        label.textContent = "Text content";
        const input = document.createElement("input");
        input.value = files.source.slice(node.openEnd, node.closeStart);
        input.addEventListener("change", safe(() => {
          if (node.children.length) throw new Error("Edit nested content in source or select a leaf.");
          files.source = files.source.slice(0, node.openEnd) + esc(input.value) + files.source.slice(node.closeStart);
          find("[data-source]").value = files[role];
          changed();
        }));
        label.append(input);
        inspector.append(label);
      }
      let slotChild = node, ancestor = node.parent;
      while (ancestor && !ancestor.attributes["data-uip-component"]) {
        slotChild = ancestor;
        ancestor = ancestor.parent;
      }
      const parentComponent = workspace2.components.find((item) => item.metadata?.componentId === ancestor?.attributes["data-uip-component"]);
      const parentPackage = workspace2.packages.find((item) => item.id === ancestor?.attributes["data-uip-component"]);
      const slots = component?.metadata?.public?.slots ?? pkg?.definition?.runtime.slots.map((slot) => slot.name) ?? pkg?.slots;
      const parentSlots = parentComponent?.metadata?.public?.slots ?? parentPackage?.definition?.runtime.slots.map((slot) => slot.name) ?? parentPackage?.slots;
      compositionAuthoring(inspector, {
        metadata: workingMetadata(),
        node: selectedNode,
        change: changeMetadata,
        slots,
        draft: actionDrafts.get(selectedNode) ?? (() => {
          const draft = {};
          actionDrafts.set(selectedNode, draft);
          return draft;
        })(),
        refresh: () => {
          if (active && !disposed) renderInspector();
        },
        bindingTargets: component ? Object.keys(contracts).map((key) => `property:${key}`) : pkg?.definition ? Object.keys(contracts).filter((key) => contracts[key] && pkg.definition.builder.settings[key].binding?.kind !== "event").map((key) => `setting:${key}`) : pkg ? [.../* @__PURE__ */ new Set([...pkg.attributes ?? [], ...Object.keys(contracts)])].map((key) => `attribute:${key}`) : ["text", "attribute:href", "attribute:aria-label", "property:disabled"],
        events: component ? Object.keys(component.metadata.public?.events ?? {}) : pkg ? Object.keys(pkg.definition?.runtime.events ?? {}).concat(pkg.events ?? []) : ["click", "change", "input", "submit"],
        ...parentSlots && slotChild.id ? { slot: { value: slotChild.attributes.slot || (parentPackage ? "default" : ""), choices: parentSlots, change: (value) => {
          files.source = setNodeAttribute(files.source, slotChild.id, "slot", parentPackage && value === "default" ? "" : value);
          changed();
        } } } : {},
        workflows: async () => (await request(`${base}/automation-catalog`)).workflows,
        datasets: () => request(`${base}/datasets/discovery`),
        error: (cause) => status(String(cause))
      });
      if (node.tag === "uip-slot") {
        const label = document.createElement("label");
        label.textContent = "Public slot outlet";
        const slot = document.createElement("select");
        slot.setAttribute("aria-label", "Public slot outlet");
        for (const name of workingMetadata().public?.slots ?? []) slot.add(new Option(name, name));
        slot.value = node.attributes.name ?? "";
        slot.onchange = safe(() => {
          files.source = setNodeAttribute(files.source, selectedNode, "name", slot.value);
          changed();
        });
        label.append(slot);
        inspector.append(label);
      }
      const wrapper = isWrapper(node) ? node : isWrapper(node.parent) ? node.parent : void 0;
      if (!wrapper?.id) {
        inspector.insertAdjacentHTML("beforeend", '<p class="note">Layout is manual for this node.</p>');
        return;
      }
      inspector.insertAdjacentHTML("beforeend", "<label>Breakpoint<select data-breakpoint><option>base</option><option>tablet</option><option>mobile</option></select></label><div data-layout></div>");
      const renderLayout = () => {
        const breakpoint = inspector.querySelector("[data-breakpoint]").value;
        const layout = workingMetadata().layout?.[wrapper.id]?.[breakpoint] ?? {};
        const container = inspector.querySelector("[data-layout]");
        container.replaceChildren();
        for (const key of ["width", "height", "margin", "padding", "display", "gridTemplateColumns", "gridColumn", "gap", "alignItems", "justifyContent", "flexDirection"]) {
          const label = document.createElement("label");
          label.textContent = key;
          const input = document.createElement("input");
          input.value = String(layout[key] ?? "");
          input.setAttribute("aria-label", `Layout ${breakpoint} ${key}`);
          input.addEventListener("change", safe(() => changeMetadata((m) => {
            m.layout ??= {};
            m.layout[wrapper.id] ??= {};
            m.layout[wrapper.id][breakpoint] ??= {};
            const values = m.layout[wrapper.id][breakpoint];
            if (input.value) values[key] = input.value;
            else delete values[key];
          })));
          label.append(input);
          container.append(label);
        }
      };
      inspector.querySelector("[data-breakpoint]").addEventListener("change", renderLayout);
      renderLayout();
    }
    function open(bundle2, kind, replace = false) {
      invalidateCard("SOURCE_CHANGED");
      bundle2 = structuredClone(bundle2);
      const key = `${kind}:${bundle2.locator}`;
      let retained = copies.get(key);
      if (!retained) {
        const record2 = { bundle: bundle2, kind, lifecycle: void 0, saveRequest: void 0 };
        record2.lifecycle = new EditingLifecycle(bundle2.files, async (candidate) => {
          const authorized = record2.saveRequest;
          if (!authorized) throw new Error("The original authorized editing context is required.");
          const stamp = { record: record2, epoch: cardEpoch, selection: cardSelectionGeneration, context: savedCardContextKey(readCardContext()), editing: record2.lifecycle.generation };
          const saved = await authorized(`${base}/visual-${plural(record2.kind)}?locator=${encodeURIComponent(record2.bundle.locator)}`, { method: "PUT", body: JSON.stringify({ mode: "normal", files: candidate, expectedHash: record2.bundle.hash }) });
          record2.bundle = structuredClone(saved);
          if (!cardTerminal && stamp.epoch === cardEpoch && stamp.selection === cardSelectionGeneration && stamp.context === savedCardContextKey(readCardContext())) cardCompletion = stamp;
          return saved.files;
        });
        record2.lifecycle.subscribe(() => {
          const completion = cardCompletion;
          const completed = copy === record2 && completion?.record === record2 && completion.epoch === cardEpoch && completion.selection === cardSelectionGeneration && completion.context === savedCardContextKey(readCardContext()) && completion.editing === record2.lifecycle.generation && record2.lifecycle.savedGeneration === record2.lifecycle.generation && !record2.lifecycle.inFlight && !record2.lifecycle.dirty && record2.lifecycle.state === "saved" && !record2.lifecycle.failure;
          invalidateCard(record2.lifecycle.suspended ? "SUSPENDED" : record2.lifecycle.state === "saving" ? "SAVE_PENDING" : record2.lifecycle.failure ? "SAVE_FAILED" : "SOURCE_CHANGED");
          if (copy === record2) {
            const changedSource = JSON.stringify(files) !== JSON.stringify(record2.lifecycle.current);
            files = structuredClone(record2.lifecycle.current);
            baseline = structuredClone(record2.lifecycle.baseline);
            selected = record2.bundle;
            hash = record2.bundle.hash;
            if (changedSource) {
              find("[data-source]").value = files[role];
              try {
                renderStructure();
              } catch {
              }
            }
            paintState();
          } else options.onStateChange?.();
          if (completed) evaluateCard();
        });
        copies.set(key, record2);
        retained = record2;
      } else if (!retained.lifecycle.inFlight) {
        if (replace || bundle2.hash !== retained.bundle.hash && !retained.lifecycle.dirty) {
          retained.bundle = bundle2;
          retained.lifecycle.reset(bundle2.files);
        } else if (bundle2.hash !== retained.bundle.hash) retained.lifecycle.conflict();
      }
      copy = retained;
      selected = retained.bundle;
      selectedKind = kind;
      files = structuredClone(retained.lifecycle.current);
      baseline = structuredClone(retained.lifecycle.baseline);
      hash = retained.bundle.hash;
      conflict = retained.lifecycle.state === "conflict";
      selectedNode = "";
      role = "source";
      find("[data-work]").hidden = false;
      find("[data-file]").value = role;
      find("[data-source]").value = files.source;
      renderList();
      changed();
      find("[data-change-shell]").hidden = kind !== "page" || !bundle2.metadata?.shellId;
      find("[data-add-region]").hidden = kind === "component" || kind === "page" && !bundle2.metadata?.shellId;
      find("[data-place-menu]").hidden = kind !== "shell";
      if (kind === "page" && bundle2.metadata?.shellId) void showPreview();
    }
    let selectionGeneration = 0;
    find("[data-artifacts]").addEventListener("change", safe(async () => {
      const generation = ++selectionGeneration;
      const [kind, ...path] = find("[data-artifacts]").value.split(":");
      const locator = path.join(":");
      if (!list(kind).some((bundle3) => bundle3.locator === locator)) return;
      const bundle2 = await request(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(locator)}`);
      if (generation === selectionGeneration && active && !disposed) open(bundle2, kind);
    }));
    target.querySelectorAll("[data-create]").forEach((button2) => button2.addEventListener("click", safe(async () => {
      if (dirty()) throw new Error("Save or recover editor changes before creating another artifact.");
      const name = prompt("Artifact name (lowercase-with-hyphens):");
      if (!name) return;
      const isForm = button2.dataset.create.startsWith("form");
      const kind = button2.dataset.create === "page" ? "page" : button2.dataset.create === "shell" ? "shell" : "component";
      const route = kind === "page" ? prompt("Page route:", `/${name}`) : void 0;
      if (route === null) return;
      const shellId = kind === "page" && workspace2.shells?.length ? prompt("Shell ID (leave empty for Application default):\n" + workspace2.shells.map((shell) => `${shell.metadata?.displayName}: ${shell.metadata?.artifactId}`).join("\n"), "") : void 0;
      if (shellId === null) return;
      let dataset;
      if (button2.dataset.create === "form-dataset") {
        const schema = prompt("Paste the published Dataset schema JSON (dataset and fields with stable IDs):");
        if (!schema) return;
        dataset = JSON.parse(schema);
      }
      const bundle2 = await request(`${base}/visual-${plural(kind)}`, { method: "POST", body: JSON.stringify({ name, route, shellId, ...isForm ? { form: { dataset } } : {} }) });
      workspace2 = await request(`${base}/visual-artifacts`);
      open(bundle2, kind);
    })));
    find("[data-file]").addEventListener("change", () => {
      role = find("[data-file]").value;
      find("[data-source]").value = files[role];
    });
    find("[data-source]").addEventListener("input", () => {
      files[role] = find("[data-source]").value;
      changed(`source:${role}`);
    });
    find("[data-nodes]").addEventListener("change", () => {
      invalidateCard("SELECTION_CHANGED", true);
      selectedNode = find("[data-nodes]").value;
      renderInspector();
      evaluateCard();
    });
    find("[data-root]").addEventListener("click", () => {
      invalidateCard("SELECTION_CHANGED", true);
      selectedNode = "";
      renderStructure();
      evaluateCard();
    });
    target.querySelectorAll("[data-move]").forEach((button2) => button2.addEventListener("click", safe(() => {
      files.source = moveNode(files.source, selectedNode, button2.dataset.move);
      find("[data-source]").value = files[role];
      changed();
    })));
    find("[data-add]").addEventListener("click", safe(() => {
      if (selectedKind === "page" && workingMetadata().shellId) {
        let container = parseSource(files.source).nodes.find((node) => node.id === selectedNode);
        while (container && !container.attributes["data-uip-region"]) container = container.parent;
        if (!container) throw new Error("Add or select a Page Region before inserting content. Fixed surrounding content belongs to the Shell.");
      }
      const [kind, ...rest] = find("[data-insert]").value.split(":");
      const reference = rest.join(":");
      const pkg = workspace2.packages.find((p) => p.id === reference);
      const tag = kind === "html" ? reference : kind === "package" ? pkg.tagName : "uip-component";
      const ids = [`node_${crypto.randomUUID()}`, `node_${crypto.randomUUID()}`], childId = ids[1];
      const parent = parseSource(files.source).nodes.find((node) => node.id === selectedNode), parentReference = parent?.attributes["data-uip-component"];
      const parentSlots = workspace2.components.find((item) => item.metadata?.componentId === parentReference)?.metadata?.public?.slots ?? workspace2.packages.find((item) => item.id === parentReference)?.definition?.runtime.slots.map((slot2) => slot2.name);
      if (parentReference && !parentSlots?.length) throw new Error("This Component has no declared public insertion slots.");
      const slot = parentReference ? parentSlots[0] : void 0;
      files.source = insertNode(files.source, tag, kind === "html" ? void 0 : reference, selectedNode || void 0, () => ids.shift(), workspace2.packages.some((item) => item.id === parentReference) && slot === "default" ? "" : slot);
      if (tag === "uip-slot") files.source = setNodeAttribute(files.source, childId, "name", workingMetadata().public?.slots[0] ?? "");
      selectedNode = childId;
      find("[data-source]").value = files[role];
      changed();
    }));
    find("[data-save]").addEventListener("click", safe(async () => {
      if (!copy) return;
      copy.saveRequest = transport.capture();
      await copy.lifecycle.flush();
    }));
    for (const action of ["undo", "redo"]) find(`[data-${action}]`).addEventListener("click", safe(() => {
      if (!copy) return;
      copy.saveRequest = transport.capture();
      copy.lifecycle[action]();
    }));
    find("[data-repair]").addEventListener("click", safe(async () => {
      if (!copy || conflict || !confirm("Save this complete source candidate through Advanced Repair? Invalid source may block previews.")) return;
      const original = copy, authorized = transport.capture();
      original.lifecycle.suspend();
      find("[data-work]").inert = true;
      try {
        await original.lifecycle.inFlight;
        const saved = await authorized(url(), { method: "PUT", body: JSON.stringify({ mode: "repair", files: original.lifecycle.current, expectedHash: original.bundle.hash }) });
        original.bundle = saved;
        original.lifecycle.reset(saved.files);
      } finally {
        original.lifecycle.resume();
        find("[data-work]").inert = false;
      }
    }));
    find("[data-reload]").addEventListener("click", safe(async () => {
      if (!copy || dirty() && !confirm("Discard editor changes and reload disk source?")) return;
      const original = copy, kind = selectedKind, section = role, authorized = transport.capture();
      find("[data-work]").inert = true;
      original.lifecycle.suspend();
      try {
        await original.lifecycle.inFlight;
        const saved = await authorized(`${base}/visual-${plural(kind)}?locator=${encodeURIComponent(original.bundle.locator)}`);
        if (copy === original) {
          open(saved, kind, true);
          role = section;
          find("[data-file]").value = role;
          find("[data-source]").value = files[role];
        } else {
          original.bundle = saved;
          original.lifecycle.reset(saved.files);
        }
      } finally {
        original.lifecycle.resume();
        find("[data-work]").inert = false;
      }
    }));
    find("[data-recover]").addEventListener("click", () => {
      const blob = URL.createObjectURL(new Blob([JSON.stringify({ locator: selected?.locator, files, originalHash: hash }, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = blob;
      link.download = "visual-artifact-recovery.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(blob), 1e3);
    });
    find("[data-delete]").addEventListener("click", safe(async () => {
      if (dirty() || conflict) throw new Error("Save or recover changes before deletion.");
      if (!confirm("Move this artifact bundle to the Recycle Bin?")) return;
      await request(url(), { method: "DELETE", body: JSON.stringify({ expectedHash: hash }) });
      if (copy) {
        await copy.lifecycle.dispose();
        copies.delete(`${selectedKind}:${selected.locator}`);
      }
      copy = void 0;
      selected = void 0;
      find("[data-work]").hidden = true;
      workspace2 = await request(`${base}/visual-artifacts`);
      renderList();
      status("Deleted");
    }));
    async function showPreview() {
      if (!active || disposed) return;
      if (dirty() || conflict) throw new Error("Save source before previewing.");
      preview?.remove();
      preview = document.createElement("iframe");
      preview.title = "Nonpersisting Visual Artifact design preview";
      preview.src = "/visual-preview.html";
      preview.style.cssText = "width:100%;min-height:500px;border:1px solid #ccc";
      if (!active || disposed || !preview) return;
      const frame = preview, previewApplicationKey = options.applicationKey?.() ?? appKey;
      frame.addEventListener("load", () => {
        if (active && !disposed && frame === preview) frame.contentWindow.postMessage({ type: "uip-preview", design: true, locator: selected.locator, kind: selectedKind, hash, appKey: previewApplicationKey }, location.origin);
      });
      find("[data-preview-host]").append(preview);
    }
    find("[data-preview]").addEventListener("click", safe(showPreview));
    async function refresh(event) {
      if (event) invalidateCard("SOURCE_CHANGED");
      if (disposed || options.initial && !active) return;
      if (!target.isConnected) return;
      if (polling || saving || operations > 0) return;
      polling = true;
      try {
        const next = await request(`${base}/visual-artifacts`);
        if (disposed || options.initial && !active) return;
        const dependenciesChanged = JSON.stringify([workspace2.shells, workspace2.components].flat().map((bundle2) => bundle2?.hash)) !== JSON.stringify([next.shells, next.components].flat().map((bundle2) => bundle2?.hash));
        if (dependenciesChanged || JSON.stringify(workspace2.packages) !== JSON.stringify(next.packages) || list(selectedKind).find((bundle2) => bundle2.locator === selected?.locator)?.hash !== (selectedKind === "page" ? next.pages : selectedKind === "shell" ? next.shells : next.components).find((bundle2) => bundle2.locator === selected?.locator)?.hash) invalidateCard("SOURCE_CHANGED");
        workspace2 = structuredClone(next);
        renderList();
        if (selected) {
          const disk = list(selectedKind).find((b) => b.locator === selected.locator);
          if (!disk || disk.hash !== hash) {
            if (dirty()) {
              copy?.lifecycle.conflict();
              changed();
            } else if (disk) {
              const node = selectedNode;
              open(disk, selectedKind);
              selectedNode = node;
              renderStructure();
              status("Reloaded external source changes");
            } else {
              conflict = true;
              status("Artifact was removed externally. Download recovery before changing selection.");
            }
          } else if (!dirty() && !conflict && selected.metadata?.shellId && (dependenciesChanged || event)) {
            renderStructure();
            await showPreview();
          }
        }
      } catch (error) {
        status(String(error));
      } finally {
        polling = false;
      }
    }
    workspace2 = structuredClone(options.workspace ?? await request(`${base}/visual-artifacts`));
    renderList();
    status("Select or create a Visual Artifact");
    if (options.initial) {
      find("[data-artifacts]").parentElement.hidden = true;
      const bundle2 = list(options.initial.kind).find((b) => b.locator === options.initial.locator);
      if (!bundle2) throw new Error("Artifact unavailable.");
      open(bundle2, options.initial.kind);
    }
    const unprotect = protectEditingDraft(() => [...copies.values()].some((item) => item.lifecycle.dirty || item.lifecycle.state === "conflict"));
    const timer = setInterval(() => {
      void refresh();
    }, 3e3);
    document.addEventListener("ui-platform-workspace-change", refresh);
    const unsubscribeCardContext = options.savedCardContext?.subscribe(() => invalidateCard("CONTEXT_CHANGED")) ?? (() => {
    });
    document.addEventListener("visibilitychange", cardVisibility);
    return {
      savedCardTarget,
      state: () => ({ dirty: [...copies.values()].some((item) => item.lifecycle.dirty), pending: saving || operations > 0, conflict }),
      deactivate() {
        invalidateCard("NOT_ACTIVE");
        active = false;
        preview?.remove();
        preview = void 0;
      },
      suspend() {
        invalidateCard("SUSPENDED");
        actionDrafts.clear();
        for (const item of copies.values()) item.lifecycle.suspend();
        target.hidden = true;
      },
      focus(next, navigation = {}) {
        if (disposed) return;
        invalidateCard("SELECTION_CHANGED", true);
        workspace2 = structuredClone(next);
        const disk = list(selectedKind).find((b) => b.locator === selected?.locator);
        if (!disk) throw new Error("Artifact unavailable.");
        if (disk.hash !== hash && !copy?.lifecycle.inFlight) {
          if (dirty()) {
            copy?.lifecycle.conflict();
            changed();
          } else {
            const node = selectedNode, section = role;
            open(disk, selectedKind);
            selectedNode = node;
            role = section;
          }
        }
        active = true;
        target.hidden = false;
        copy?.lifecycle.resume();
        if (navigation.node !== void 0) selectedNode = navigation.node;
        if (navigation.section && ["source", "css", "metadata", "fixtures", "code"].includes(navigation.section)) role = navigation.section;
        find("[data-file]").value = role;
        find("[data-source]").value = files[role];
        try {
          renderStructure();
        } catch {
          status("Invalid local source retained. Repair source before using structured controls.");
        }
        if (navigation.node !== void 0) evaluateCard();
      },
      async dispose() {
        disposed = true;
        active = false;
        if (!cardTerminal) {
          cardTerminal = true;
          cardEpoch++;
          cardSourceGeneration++;
          cardPending = false;
          cardCompletion = void 0;
          publishCard({ state: "unavailable", reason: "DISPOSED", generation: cardGenerations(), target: null });
        }
        unsubscribeCardContext();
        document.removeEventListener("visibilitychange", cardVisibility);
        cardListeners.clear();
        clearInterval(timer);
        document.removeEventListener("ui-platform-workspace-change", refresh);
        unprotect();
        transport.dispose();
        await Promise.all([...copies.values()].map((item) => item.lifecycle.dispose()));
        preview?.remove();
        target.replaceChildren();
      }
    };
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

  // tests/saved-card-selection/editor-harness.ts
  var editor;
  var host;
  var workspace;
  var bundle;
  var current2;
  var calls = [];
  var events = [];
  var observers = /* @__PURE__ */ new Set();
  var unsubscribe = () => {
  };
  var start = 0;
  var gate;
  var releaseGate = () => {
  };
  var failure;
  var allowRefresh = false;
  var corruptHash = false;
  var sourceInput = () => host.querySelector("[data-source]");
  window.selectionHarness = {
    async mount(enabled = false, configuration = {}) {
      configureAutosave({ enabled, delayMs: 2e3 });
      calls = [];
      events = [];
      observers = /* @__PURE__ */ new Set();
      current2 = structuredClone(context);
      start = Date.now();
      const input = await fixture(configuration.source ?? source, configuration.metadata ?? {});
      bundle = input.bundle;
      if (configuration.packageEdit === "missing") input.packages = [];
      if (configuration.packageEdit === "duplicate") input.packages.push(structuredClone(input.packages[0]));
      if (configuration.packageEdit === "missingExport") delete input.packages[0].definition.implementation.exportName;
      if (configuration.packageEdit === "missingRevision") delete input.packages[0].definition.version.revisionId;
      workspace = { pages: [bundle], components: [], shells: [], packages: input.packages };
      host = document.createElement("section");
      document.body.append(host);
      const request = async (url, init) => {
        if (!init?.method && allowRefresh && url.endsWith("/visual-artifacts")) {
          allowRefresh = false;
          calls.push({ method: "MEMORY_GET", url, time: Date.now() - start });
          return structuredClone(workspace);
        }
        if (init?.method !== "PUT") throw Error("UNEXPECTED_SOURCE_ACQUISITION " + url);
        const body = JSON.parse(String(init.body));
        calls.push({ method: "PUT", url, body, time: Date.now() - start });
        const pending = gate;
        if (pending) await pending;
        if (failure) {
          const status = failure;
          failure = void 0;
          throw Object.assign(new Error("Authored memory save failure"), { status });
        }
        if (body.expectedHash !== bundle.hash) throw Object.assign(new Error("Memory conflict"), { status: 409 });
        bundle = { ...bundle, files: structuredClone(body.files), metadata: JSON.parse(body.files.metadata), hash: await digest(JSON.stringify(body.files)) };
        workspace.pages = [bundle];
        if (corruptHash) {
          corruptHash = false;
          return { ...structuredClone(bundle), hash: "0".repeat(64) };
        }
        return structuredClone(bundle);
      };
      editor = await mountVisualEditor(host, "routing-key", {
        applicationId: context.applicationId,
        workspace,
        initial: { kind: "page", locator: bundle.locator },
        request,
        captureRequest: () => request,
        savedCardContext: { get: () => structuredClone(current2), subscribe: (fn) => {
          observers.add(fn);
          return () => {
            observers.delete(fn);
          };
        } }
      });
      editor.focus(workspace);
      if (editor.savedCardTarget) unsubscribe = editor.savedCardTarget.subscribe((value) => events.push(value));
    },
    target() {
      return editor.savedCardTarget?.snapshot;
    },
    select(candidate = "saved") {
      const select = host.querySelector("[data-nodes]");
      select.value = candidate;
      select.dispatchEvent(new Event("change"));
    },
    navigate(candidate) {
      editor.focus(workspace, candidate === void 0 ? {} : { node: candidate });
    },
    contextChange(field = "session") {
      if (field === "session") current2.sessionRevision = "changed-session";
      if (field === "owner") current2.page.owner.id = "different-owner";
      if (field === "application") current2.applicationId = "different-app";
      for (const fn of observers) fn();
    },
    hold() {
      gate = new Promise((resolve) => {
        releaseGate = () => {
          gate = void 0;
          resolve();
        };
      });
    },
    release() {
      releaseGate();
    },
    fail(status = 500) {
      failure = status;
    },
    corruptResponseHash() {
      corruptHash = true;
    },
    async external(markup = source.replace("uip-layout-item", "uip-layout-item external"), packageChange = false) {
      const next = await fixture(markup);
      bundle = next.bundle;
      workspace.pages = [bundle];
      if (packageChange) workspace.packages = [];
      allowRefresh = true;
      document.dispatchEvent(new Event("ui-platform-workspace-change"));
    },
    event() {
      document.dispatchEvent(new Event("ui-platform-workspace-change"));
    },
    visibility(hidden) {
      Object.defineProperty(document, "visibilityState", { value: hidden ? "hidden" : "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    },
    park() {
      editor.deactivate();
      host.remove();
    },
    remount() {
      document.body.append(host);
      editor.focus(workspace);
    },
    suspend() {
      editor.suspend();
    },
    stopWatching() {
      unsubscribe();
    },
    throwObserver() {
      return editor.savedCardTarget.subscribe(() => {
        throw Error("Authored observer exception");
      });
    },
    reenterOnDispose() {
      return editor.savedCardTarget.subscribe((value) => {
        if (value.reason === "DISPOSED") editor.focus(workspace, { node: "saved" });
      });
    },
    async dispose() {
      await editor.dispose();
      host.remove();
    },
    metrics() {
      return { observers: observers.size, events: events.map((value) => JSON.parse(JSON.stringify(value))), calls: structuredClone(calls) };
    },
    async snapshot() {
      const input = sourceInput();
      return { source: input?.value, checksum: await digest(input?.value ?? ""), file: host.querySelector("[data-file]")?.value, range: input ? [input.selectionStart, input.selectionEnd] : null, state: editor.state(), ids: [...host.querySelector("[data-nodes]")?.options ?? []].map((o) => o.value), undo: !host.querySelector("[data-undo]")?.disabled, redo: !host.querySelector("[data-redo]")?.disabled, calls: structuredClone(calls) };
    }
  };
})();
