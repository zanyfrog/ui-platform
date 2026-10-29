(() => {
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
  var init_page_links = __esm({
    "packages/visual-artifacts/src/page-links.ts"() {
      init_source();
    }
  });

  // tests/html-first/unused.ts
  function denied(..._args) {
    throw Error("UNADMITTED_BRANCH");
  }
  var visualDatasetServices, ApplicationDataClient, createSessionApplicationDataTransport, createApplicationDataServices;
  var init_unused = __esm({
    "tests/html-first/unused.ts"() {
      visualDatasetServices = {};
      ApplicationDataClient = class {
        constructor(..._args) {
          denied();
        }
      };
      createSessionApplicationDataTransport = denied;
      createApplicationDataServices = denied;
    }
  });

  // tests/d6-p2/bytes/ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1.txt
  function createId(prefix = "mt") {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function defineUiBaseElement(tagName, elementClass) {
    installCssClassProperty(elementClass);
    if (!customElements.get(tagName)) customElements.define(tagName, elementClass);
    return elementClass;
  }
  function cssClassTokens(element) {
    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean);
  }
  function applyCssClassToShadowRoot(element) {
    if (!element) return;
    const root = element.shadowRoot || element;
    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");
    if (!target) return;
    const previous = element.__uibCssClassTokens || [];
    target.classList.remove(...previous);
    const next = cssClassTokens(element);
    if (next.length) target.classList.add(...next);
    element.__uibCssClassTokens = next;
  }
  function installCssClassProperty(elementClass) {
    const prototype = elementClass?.prototype;
    if (!prototype) return elementClass;
    if (!Object.getOwnPropertyDescriptor(prototype, "cssClass")) {
      Object.defineProperty(prototype, "cssClass", {
        configurable: true,
        enumerable: true,
        get() {
          return this.getAttribute("css-class") || "";
        },
        set(value) {
          setOrRemoveAttribute(this, "css-class", value);
        }
      });
    }
    const observed = Array.isArray(elementClass.observedAttributes) ? elementClass.observedAttributes : [];
    if (!observed.includes("css-class")) {
      Object.defineProperty(elementClass, "observedAttributes", {
        configurable: true,
        value: [...observed, "css-class"]
      });
    }
    if (typeof prototype.render === "function" && !prototype.__uibCssClassRenderWrapped) {
      const render = prototype.render;
      prototype.render = function renderWithCssClass(...args) {
        const result = render.apply(this, args);
        applyCssClassToShadowRoot(this);
        return result;
      };
      prototype.__uibCssClassRenderWrapped = true;
    }
    return elementClass;
  }
  function setOrRemoveAttribute(element, name, value) {
    if (value === null || value === void 0 || value === false) {
      element.removeAttribute(name);
      return;
    }
    if (value === true) {
      element.setAttribute(name, "");
      return;
    }
    element.setAttribute(name, String(value));
  }
  function mergeIds(...ids) {
    return ids.flatMap((value) => String(value ?? "").split(/\s+/)).map((value) => value.trim()).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" ");
  }
  var idCounter;
  var init_ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1 = __esm({
    "tests/d6-p2/bytes/ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1.txt"() {
      idCounter = 0;
    }
  });

  // tests/d6-p2/bytes/807d5f64a177486fd4dcd46fa9f1d4b8cbcd538f2c9e8997d21cec94c60ff08f.txt
  var init_d5f64a177486fd4dcd46fa9f1d4b8cbcd538f2c9e8997d21cec94c60ff08f = __esm({
    "tests/d6-p2/bytes/807d5f64a177486fd4dcd46fa9f1d4b8cbcd538f2c9e8997d21cec94c60ff08f.txt"() {
    }
  });

  // tests/d6-p2/bytes/1c3b3e584a4fcdc5632337c686b8875fbf0fbb19dbf0d08c46d4510fc732d0f4.txt
  var VALIDATION_STATES;
  var init_c3b3e584a4fcdc5632337c686b8875fbf0fbb19dbf0d08c46d4510fc732d0f4 = __esm({
    "tests/d6-p2/bytes/1c3b3e584a4fcdc5632337c686b8875fbf0fbb19dbf0d08c46d4510fc732d0f4.txt"() {
      VALIDATION_STATES = Object.freeze({
        VALID: "valid",
        INVALID: "invalid",
        WARNING: "warning",
        INFO: "info"
      });
    }
  });

  // tests/d6-p2/bytes/0b1f41d5513f349f6a670e51046acb10e4b325965b13ebe30ebeecd75041abca.txt
  var MATURITY_LEVELS;
  var init_b1f41d5513f349f6a670e51046acb10e4b325965b13ebe30ebeecd75041abca = __esm({
    "tests/d6-p2/bytes/0b1f41d5513f349f6a670e51046acb10e4b325965b13ebe30ebeecd75041abca.txt"() {
      MATURITY_LEVELS = Object.freeze({
        EXPERIMENTAL: "experimental",
        PREVIEW: "preview",
        STABLE: "stable",
        DEPRECATED: "deprecated",
        RETIRED: "retired"
      });
    }
  });

  // tests/d6-p2/bytes/52beb5f85dbbdce865c2caab36ae061107a5c30b495a7956a4fae5c79074d097.txt
  var UibBaseElement;
  var init_beb5f85dbbdce865c2caab36ae061107a5c30b495a7956a4fae5c79074d097 = __esm({
    "tests/d6-p2/bytes/52beb5f85dbbdce865c2caab36ae061107a5c30b495a7956a4fae5c79074d097.txt"() {
      init_ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1();
      UibBaseElement = class extends HTMLElement {
        static commonAttributes = [
          "name",
          "label",
          "help",
          "help-mode",
          "title",
          "disabled",
          "readonly",
          "required",
          "hidden",
          "invalid",
          "error",
          "css-class",
          "aria-label",
          "aria-describedby"
        ];
        constructor() {
          super();
          this._uibId = createId(this.localName || "uib-component");
        }
        get componentId() {
          return this.id || this._uibId;
        }
        get name() {
          return this.getAttribute("name") || "";
        }
        set name(value) {
          setOrRemoveAttribute(this, "name", value);
        }
        get label() {
          return this.getAttribute("label") || "";
        }
        set label(value) {
          setOrRemoveAttribute(this, "label", value);
        }
        get help() {
          return this.getAttribute("help") || "";
        }
        set help(value) {
          setOrRemoveAttribute(this, "help", value);
        }
        get helpMode() {
          const mode = (this.getAttribute("help-mode") || "").toLowerCase();
          return mode === "inline" ? "inline" : "tooltip";
        }
        set helpMode(value) {
          setOrRemoveAttribute(this, "help-mode", value);
        }
        get titleText() {
          return this.getAttribute("title") || "";
        }
        set titleText(value) {
          setOrRemoveAttribute(this, "title", value);
        }
        get disabled() {
          return this.hasAttribute("disabled");
        }
        set disabled(value) {
          this.toggleAttribute("disabled", Boolean(value));
        }
        get readonly() {
          return this.hasAttribute("readonly");
        }
        set readonly(value) {
          this.toggleAttribute("readonly", Boolean(value));
        }
        get required() {
          return this.hasAttribute("required");
        }
        set required(value) {
          this.toggleAttribute("required", Boolean(value));
        }
        get invalid() {
          return this.hasAttribute("invalid");
        }
        set invalid(value) {
          this.toggleAttribute("invalid", Boolean(value));
        }
        get error() {
          return this.getAttribute("error") || "";
        }
        set error(value) {
          setOrRemoveAttribute(this, "error", value);
        }
        get ariaLabel() {
          return this.getAttribute("aria-label") || "";
        }
        get ariaDescribedBy() {
          return this.getAttribute("aria-describedby") || "";
        }
        get cssClass() {
          return this.getAttribute("css-class") || "";
        }
        set cssClass(value) {
          setOrRemoveAttribute(this, "css-class", value);
        }
        describedBy(...internalIds) {
          return mergeIds(this.ariaDescribedBy, ...internalIds);
        }
        emitMtEvent(type, detail = {}, options = {}) {
          this.dispatchEvent(new CustomEvent(type, {
            bubbles: options.bubbles ?? true,
            composed: options.composed ?? true,
            cancelable: options.cancelable ?? false,
            detail
          }));
        }
        emitValueChange(componentEventName, oldValue, newValue, extra = {}) {
          const detail = {
            name: this.name,
            oldValue,
            newValue,
            ...extra
          };
          this.emitMtEvent("change", detail);
          if (componentEventName) this.emitMtEvent(componentEventName, detail);
        }
        attributeChangedCallback() {
          if (this.isConnected && typeof this.render === "function") this.render();
        }
      };
    }
  });

  // tests/d6-p2/bytes/70ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a.txt
  var init_ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a = __esm({
    "tests/d6-p2/bytes/70ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a.txt"() {
      init_ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1();
      init_d5f64a177486fd4dcd46fa9f1d4b8cbcd538f2c9e8997d21cec94c60ff08f();
      init_c3b3e584a4fcdc5632337c686b8875fbf0fbb19dbf0d08c46d4510fc732d0f4();
      init_b1f41d5513f349f6a670e51046acb10e4b325965b13ebe30ebeecd75041abca();
      init_beb5f85dbbdce865c2caab36ae061107a5c30b495a7956a4fae5c79074d097();
    }
  });

  // tests/d6-p2/bytes/a8096cac3b75e52dde86be549165ab73b8d1f73d33b6c89f56cec4cf73b614f3.txt
  function registerMtIcon(name, svg) {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) throw new Error("Icon name is required.");
    icons.set(normalized, String(svg || ""));
  }
  function getMtIcon(name) {
    return icons.get(String(name || "").trim().toLowerCase()) || "";
  }
  var icons;
  var init_a8096cac3b75e52dde86be549165ab73b8d1f73d33b6c89f56cec4cf73b614f3 = __esm({
    "tests/d6-p2/bytes/a8096cac3b75e52dde86be549165ab73b8d1f73d33b6c89f56cec4cf73b614f3.txt"() {
      icons = /* @__PURE__ */ new Map();
      registerMtIcon("help", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 17a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm1.1-5.1v.6h-2.1v-.8c0-1.4.8-2.1 1.6-2.7.7-.5 1.2-.9 1.2-1.7 0-.9-.7-1.5-1.8-1.5-1 0-1.7.5-2.3 1.3L8.2 7.9A4.4 4.4 0 0 1 12.1 6c2.4 0 4 1.4 4 3.3 0 1.8-1.1 2.6-2 3.2-.6.5-1 .8-1 1.4Z" fill="currentColor"/></svg>');
      registerMtIcon("info", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor"/></svg>');
      registerMtIcon("menu", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v2H4v-2Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" fill="currentColor"/></svg>');
      registerMtIcon("close", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>');
      registerMtIcon("chevron-down", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z" fill="currentColor"/></svg>');
      registerMtIcon("check", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.4 1.4 5.5 5.5L20.3 8.3l-1.4-1.4-9.7 9.7Z" fill="currentColor"/></svg>');
      registerMtIcon("x", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>');
      registerMtIcon("calendar", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v3h6V2h2v3h3v17H4V5h3V2Zm13 8H6v10h14V10ZM6 8h14V7H6v1Z" fill="currentColor"/></svg>');
      registerMtIcon("warning", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 1.8 21h20.4L12 3Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v5Z" fill="currentColor"/></svg>');
      registerMtIcon("external-link", '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/></svg>');
    }
  });

  // tests/d6-p2/bytes/e45128cc6dc41dea18dd0181746300004344cb38a1dc728e6db7043ff0222b30.txt
  var styles, UibIcon;
  var init_e45128cc6dc41dea18dd0181746300004344cb38a1dc728e6db7043ff0222b30 = __esm({
    "tests/d6-p2/bytes/e45128cc6dc41dea18dd0181746300004344cb38a1dc728e6db7043ff0222b30.txt"() {
      init_ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a();
      init_a8096cac3b75e52dde86be549165ab73b8d1f73d33b6c89f56cec4cf73b614f3();
      styles = `
:host{display:inline-flex;width:var(--uib-icon-size,1em);height:var(--uib-icon-size,1em);line-height:1;flex:0 0 auto}*,*::before,*::after{box-sizing:border-box}.uib-icon{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center}.uib-icon svg,.uib-icon img{width:100%;height:100%;display:block}.uib-icon img{object-fit:contain}
`;
      UibIcon = class extends UibBaseElement {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "name", "src", "url", "size", "decorative"];
        }
        constructor() {
          super();
          this.attachShadow({ mode: "open" });
        }
        connectedCallback() {
          this.render();
        }
        get name() {
          return this.getAttribute("name") || "";
        }
        set name(value) {
          if (value === null || value === void 0) this.removeAttribute("name");
          else this.setAttribute("name", String(value));
        }
        get src() {
          return this.getAttribute("src") || this.getAttribute("url") || "";
        }
        set src(value) {
          if (value === null || value === void 0) this.removeAttribute("src");
          else this.setAttribute("src", String(value));
        }
        get decorative() {
          return this.hasAttribute("decorative") || !this.label && !this.ariaLabel && !this.titleText;
        }
        set decorative(value) {
          this.toggleAttribute("decorative", Boolean(value));
        }
        render() {
          const label = this.ariaLabel || this.label || this.titleText || this.name || "Icon";
          const aria = this.decorative ? 'aria-hidden="true"' : `role="img" aria-label="${escapeHtml(label)}"`;
          const size = this.getAttribute("size");
          const sizeStyle = size ? `:host{--uib-icon-size:${escapeHtml(size)}}` : "";
          const src = this.src;
          const body = src ? `<img src="` + escapeHtml(src) + `" alt="` + (this.decorative ? "" : escapeHtml(label)) + `">` : getMtIcon(this.name) || getMtIcon("info");
          this.shadowRoot.innerHTML = `<style> ` + styles + ` ` + sizeStyle + ` </style><span class="uib-icon" part="icon" ` + aria + `> ` + body + ` </span>`;
        }
      };
      defineUiBaseElement("uib-icon", UibIcon);
    }
  });

  // tests/d6-p2/bytes/e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a.txt
  var baseStyles, UibLayoutBase, UibStack, UibGrid, UibRow, UibColumn, UibSurfaceBase, UibPanel, UibCard, UibDialog, UibAccordion, UibTab, UibTabPanel, UibTabs, UibSplitter;
  var init_e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a = __esm({
    "tests/d6-p2/bytes/e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a.txt"() {
      init_ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a();
      init_e45128cc6dc41dea18dd0181746300004344cb38a1dc728e6db7043ff0222b30();
      baseStyles = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.placeholder{padding:.75rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}
`;
      UibLayoutBase = class extends UibBaseElement {
        connectedCallback() {
          this.render();
        }
      };
      UibStack = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "gap", "direction", "align", "justify"];
        }
        render() {
          const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";
          const direction = this.getAttribute("direction") || "column";
          const align = this.getAttribute("align") || "stretch";
          const justify = this.getAttribute("justify") || "start";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-stack{display:flex;flex-direction:` + escapeHtml(direction) + `;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `}@media(max-width:520px){.uib-stack{flex-wrap:wrap}} </style><div class="uib-stack" part="base"><slot></slot></div>`;
        }
      };
      UibGrid = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "columns", "min", "gap"];
        }
        render() {
          const columns = this.getAttribute("columns");
          const min = this.getAttribute("min") || "14rem";
          const gap = this.getAttribute("gap") || "var(--uib-space-4,1rem)";
          const template = columns ? `repeat(${Number(columns) || 1}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(${min}, 1fr))`;
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-grid{display:grid;grid-template-columns:` + template + `;gap:` + escapeHtml(gap) + `}@media(max-width:520px){.uib-grid{grid-template-columns:1fr}} </style><div class="uib-grid" part="base"><slot></slot></div>`;
        }
      };
      UibRow = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "gap", "align", "justify", "wrap"];
        }
        render() {
          const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";
          const align = this.getAttribute("align") || "center";
          const justify = this.getAttribute("justify") || "start";
          const wrap = this.hasAttribute("wrap") ? "wrap" : "nowrap";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-row{display:flex;flex-direction:row;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `;flex-wrap:` + wrap + `}@media(max-width:420px){.uib-row{flex-wrap:wrap}} </style><div class="uib-row" part="base"><slot></slot></div>`;
        }
      };
      UibColumn = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "gap", "align", "justify"];
        }
        render() {
          const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";
          const align = this.getAttribute("align") || "stretch";
          const justify = this.getAttribute("justify") || "start";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-column{display:flex;flex-direction:column;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `} </style><div class="uib-column" part="base"><slot></slot></div>`;
        }
      };
      UibSurfaceBase = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "heading", "variant", "density"];
        }
        surfaceName = "surface";
        defaultVariant = "outlined";
        connectedCallback() {
          this.render();
        }
        get heading() {
          return this.getAttribute("heading") || this.label || "";
        }
        get variant() {
          const value = (this.getAttribute("variant") || this.defaultVariant).toLowerCase();
          return ["outlined", "elevated", "flat"].includes(value) ? value : this.defaultVariant;
        }
        get density() {
          return this.getAttribute("density") === "compact" ? "compact" : "comfortable";
        }
        hasNamedSlot(name) {
          return Array.from(this.children).some((child) => child.getAttribute?.("slot") === name);
        }
        surfaceStyles(extra = "") {
          return `<style> ` + baseStyles + `.uib-surface{display:block;overflow:hidden;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);text-align:start;text-decoration:none}.uib-surface--elevated{box-shadow:var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08))}.uib-surface--outlined{box-shadow:none}.uib-surface--flat{border-color:transparent;box-shadow:none}.uib-surface--disabled{cursor:not-allowed;opacity:.58}.uib-surface__header,.uib-surface__body,.uib-surface__footer,.uib-surface__actions{padding:var(--uib-space-4,1rem)}.uib-surface--compact .uib-surface__header,.uib-surface--compact .uib-surface__body,.uib-surface--compact .uib-surface__footer,.uib-surface--compact .uib-surface__actions{padding:var(--uib-space-3,.75rem)}.uib-surface__header{display:flex;gap:.75rem;align-items:center;justify-content:space-between;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-surface__header[hidden],.uib-surface__footer[hidden],.uib-surface__actions[hidden],.uib-surface__media[hidden],.uib-surface__collapsible[hidden]{display:none!important}.uib-surface__footer{border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}.uib-surface__actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;padding-bottom:0}.uib-surface:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))} ` + extra + ` </style>`;
        }
        headerMarkup(headingId, visible = true, after = "") {
          const heading = this.heading;
          return `<div class="uib-surface__header" part="header" ` + (headingId ? `id="${headingId}"` : "") + (visible ? "" : " hidden") + `><slot name="header">` + escapeHtml(heading) + `</slot>` + after + `</div>`;
        }
        bodyMarkup(hidden = false) {
          return `<div class="uib-surface__body" part="body"` + (hidden ? " hidden" : "") + `><slot></slot></div>`;
        }
        footerMarkup(visible = true) {
          return `<div class="uib-surface__footer" part="footer"` + (visible ? "" : " hidden") + `><slot name="footer"></slot></div>`;
        }
        surfaceClasses(...names) {
          return [
            "uib-surface",
            `uib-${this.surfaceName}`,
            `uib-surface--${this.variant}`,
            `uib-surface--${this.density}`,
            this.disabled ? "uib-surface--disabled" : "",
            ...names
          ].filter(Boolean).join(" ");
        }
      };
      UibPanel = class extends UibSurfaceBase {
        static get observedAttributes() {
          return [...super.observedAttributes, "collapsible", "open"];
        }
        surfaceName = "panel";
        defaultVariant = "outlined";
        get collapsible() {
          return this.hasAttribute("collapsible");
        }
        get open() {
          return !this.collapsible || this.hasAttribute("open");
        }
        set open(value) {
          this.toggleAttribute("open", Boolean(value));
        }
        toggle() {
          if (!this.collapsible || this.disabled) return;
          const oldValue = this.open;
          this.open = !oldValue;
          this.emitValueChange("uib-panel-toggle", oldValue, this.open);
        }
        render() {
          const headingId = this.heading ? `${this.componentId}-heading` : "";
          const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header") || this.hasNamedSlot("actions") || this.collapsible;
          const hasActions = this.hasNamedSlot("actions");
          const hasFooter = this.hasNamedSlot("footer");
          const open = this.open;
          const toggleButton = this.collapsible ? `<button class="uib-panel__toggle" part="toggle" type="button" aria-expanded="${open ? "true" : "false"}" ${this.disabled ? "disabled" : ""}><span class="uib-panel__toggle-icon" aria-hidden="true">` + (open ? "-" : "+") + `</span></button>` : "";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-panel .uib-surface__actions{margin-inline-start:auto;padding:0}.uib-panel__toggle{display:inline-grid;width:2rem;height:2rem;place-items:center;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer}.uib-panel__toggle:disabled{cursor:not-allowed}.uib-panel__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-panel__toggle-icon{font-size:1rem;font-weight:900;line-height:1}`) + `<section class="${this.surfaceClasses()}" part="base" ` + (headingId ? `aria-labelledby="${headingId}"` : "") + (this.disabled ? ' aria-disabled="true"' : "") + `>` + (hasHeader ? this.headerMarkup(headingId, true, `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>${toggleButton}`) : this.headerMarkup("", false)) + `<div class="uib-surface__collapsible" part="content"` + (open ? "" : " hidden") + `>` + (hasActions && !hasHeader ? `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>` : "") + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</div></section>`;
          this.shadowRoot.querySelector(".uib-panel__toggle")?.addEventListener("click", () => this.toggle());
        }
      };
      UibCard = class extends UibSurfaceBase {
        static get observedAttributes() {
          return [...super.observedAttributes, "href", "target", "rel", "action", "action-token", "interactive", "selectable", "selected"];
        }
        surfaceName = "card";
        defaultVariant = "elevated";
        connectedCallback() {
          super.connectedCallback();
          this._cardSlotObserver ||= new MutationObserver((records) => {
            if (records.some((record) => record.target === this || record.type === "attributes" && record.target.parentElement === this)) this._updateCardSlots();
          });
          this._cardSlotObserver.observe(this, { childList: true, attributes: true, attributeFilter: ["slot"], subtree: true });
        }
        disconnectedCallback() {
          this._cardSlotObserver?.disconnect();
        }
        attributeChangedCallback(name, oldValue, newValue) {
          if (oldValue === newValue) return;
          if (name === "selected" && this.shadowRoot?.querySelector(".uib-card")) {
            const surface = this.shadowRoot.querySelector(".uib-card");
            surface.classList.toggle("uib-card--selected", this.selected);
            if (this.selectable) surface.setAttribute("aria-pressed", String(this.selected));
            return;
          }
          super.attributeChangedCallback(name, oldValue, newValue);
        }
        _updateCardSlots() {
          if (!this.shadowRoot) return;
          for (const name of ["media", "header", "footer"]) {
            const wrapper = this.shadowRoot.querySelector(`[part="${name}"]`);
            if (wrapper) wrapper.hidden = name === "header" ? !this.heading && !this.hasNamedSlot(name) : !this.hasNamedSlot(name);
          }
        }
        get href() {
          return this.getAttribute("href") || "";
        }
        get target() {
          return this.getAttribute("target") || "";
        }
        get rel() {
          return this.getAttribute("rel") || "";
        }
        get action() {
          return this.getAttribute("action") || "";
        }
        get actionToken() {
          return this.getAttribute("action-token") || "";
        }
        get interactive() {
          return this.hasAttribute("interactive") || Boolean(this.href || this.action || this.actionToken || this.selectable);
        }
        get selectable() {
          return this.hasAttribute("selectable");
        }
        get selected() {
          return this.hasAttribute("selected");
        }
        set selected(value) {
          this.toggleAttribute("selected", Boolean(value));
        }
        shouldIgnoreActivation(event, surface) {
          const interactiveSelector = 'a,button,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]';
          for (const item of event?.composedPath?.() || []) {
            if (item === surface) return false;
            if (item instanceof HTMLElement && item.matches(interactiveSelector)) return true;
          }
          return false;
        }
        activate(event) {
          if (this.disabled) {
            event?.preventDefault?.();
            return;
          }
          const surface = this.shadowRoot?.querySelector(".uib-card");
          if (surface && this.shouldIgnoreActivation(event, surface)) return;
          const oldSelected = this.selected;
          if (this.selectable) {
            this.selected = !oldSelected;
            this.emitValueChange("uib-card-select", oldSelected, this.selected, { selected: this.selected });
          }
          if (this.action || this.actionToken) {
            const allowed = this.dispatchEvent(new CustomEvent("uib-card-action", {
              bubbles: true,
              composed: true,
              cancelable: true,
              detail: {
                name: this.name,
                action: this.action,
                actionToken: this.actionToken,
                selected: this.selected
              }
            }));
            if (!allowed) event?.preventDefault?.();
          }
        }
        handleKeydown(event) {
          if (!this.interactive || this.href) return;
          if (event.key !== "Enter" && event.key !== " ") return;
          const surface = this.shadowRoot?.querySelector(".uib-card");
          if (surface && this.shouldIgnoreActivation(event, surface)) return;
          event.preventDefault();
          this.activate(event);
        }
        render() {
          const hadSurfaceFocus = Boolean(this.shadowRoot?.activeElement) && this.shadowRoot.activeElement === this.shadowRoot.querySelector(".uib-card");
          const headingId = this.heading ? `${this.componentId}-heading` : "";
          const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header");
          const hasMedia = this.hasNamedSlot("media");
          const hasFooter = this.hasNamedSlot("footer");
          const tag = this.href ? "a" : "section";
          const href = tag === "a" ? ` href="${escapeHtml(this.href)}"` : "";
          const target = tag === "a" && this.target ? ` target="${escapeHtml(this.target)}"` : "";
          const rel = tag === "a" && this.rel ? ` rel="${escapeHtml(this.rel)}"` : "";
          const role = tag === "section" && this.interactive ? ' role="button"' : "";
          const tabIndex = this.interactive ? ` tabindex="${this.disabled ? "-1" : "0"}"` : "";
          const ariaPressed = this.selectable ? ` aria-pressed="${this.selected ? "true" : "false"}"` : "";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-card{width:100%;font:inherit}.uib-card--interactive{cursor:pointer}.uib-card--selected{border-color:var(--uib-color-primary,#174a8b);box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.18))}.uib-card__media{display:block;overflow:hidden;background:var(--uib-color-surface-soft,#f8fbff)}.uib-card__media::slotted(img),.uib-card__media::slotted(video),.uib-card__media::slotted(uib-media){display:block;width:100%}`) + `<${tag} class="${this.surfaceClasses(this.interactive ? "uib-card--interactive" : "", this.selected ? "uib-card--selected" : "")}" part="base" ` + (this.ariaLabel ? `aria-label="${escapeHtml(this.ariaLabel)}"` : headingId ? `aria-labelledby="${headingId}"` : "") + (this.ariaDescribedBy ? ` aria-describedby="${escapeHtml(this.ariaDescribedBy)}"` : "") + (this.disabled ? ' aria-disabled="true"' : "") + ariaPressed + role + href + target + rel + tabIndex + `><div class="uib-card__media" part="media"` + (hasMedia ? "" : " hidden") + `><slot name="media"></slot></div>` + this.headerMarkup(headingId, hasHeader) + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</${tag}>`;
          const surface = this.shadowRoot.querySelector(".uib-card");
          surface?.addEventListener("click", (event) => this.activate(event));
          surface?.addEventListener("keydown", (event) => this.handleKeydown(event));
          if (hadSurfaceFocus && this.interactive && !this.disabled) surface?.focus({ preventScroll: true });
        }
      };
      UibDialog = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "open", "heading"];
        }
        get open() {
          return this.hasAttribute("open");
        }
        set open(value) {
          this.toggleAttribute("open", Boolean(value));
        }
        show() {
          this.open = true;
        }
        close() {
          const oldValue = true;
          this.open = false;
          this.emitValueChange("uib-dialog-close", oldValue, false);
        }
        render() {
          const heading = this.label || this.getAttribute("heading") || "Dialog";
          const headingId = `${this.componentId}-heading`;
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:` + (this.open ? "block" : "none") + `}.uib-dialog{position:fixed;inset:0;z-index:var(--uib-z-index-modal,1100);display:grid;place-items:center;padding:1rem;background:rgba(6,21,40,.48)}.uib-dialog__panel{width:min(42rem,100%);max-height:calc(100vh - 2rem);overflow:auto;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-lg,0 24px 70px rgba(10,31,68,.14))}.uib-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-dialog__body{padding:1rem}.uib-dialog__footer{padding:1rem;border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}button{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);padding:.45rem .65rem;cursor:pointer} </style><div class="uib-dialog" part="backdrop"><section class="uib-dialog__panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="` + headingId + `"><div class="uib-dialog__header" part="header"><span id="` + headingId + `"><slot name="header">` + escapeHtml(heading) + `</slot></span><button type="button" part="close-button" aria-label="Close"><uib-icon name="close" decorative></uib-icon></button></div><div class="uib-dialog__body" part="body"><slot></slot></div><div class="uib-dialog__footer" part="footer"><slot name="footer"></slot></div></section></div>`;
          this.shadowRoot.querySelector("button")?.addEventListener("click", () => this.close());
          this.shadowRoot.querySelector(".uib-dialog")?.addEventListener("click", (event) => {
            if (event.target === event.currentTarget) this.close();
          });
        }
      };
      UibAccordion = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "open", "heading"];
        }
        render() {
          const heading = this.label || this.getAttribute("heading") || "Accordion";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `details{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);overflow:hidden}summary{cursor:pointer;padding:1rem;font-weight:850}summary:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-accordion__body{padding:0 1rem 1rem} </style><details part="base" ` + (this.hasAttribute("open") ? "open" : "") + `><summary part="summary"><slot name="summary">` + escapeHtml(heading) + `</slot></summary><div class="uib-accordion__body" part="body"><slot></slot></div></details>`;
          this.shadowRoot.querySelector("details")?.addEventListener("toggle", (event) => {
            const open = event.currentTarget.open;
            this.toggleAttribute("open", open);
            this.emitMtEvent("uib-accordion-toggle", { name: this.name, oldValue: !open, newValue: open });
          });
        }
      };
      UibTab = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "selected", "aria-selected", "aria-disabled"];
        }
        get disabled() {
          return this.hasAttribute("disabled") || this.getAttribute("aria-disabled") === "true";
        }
        set disabled(value) {
          this.toggleAttribute("disabled", Boolean(value));
        }
        render() {
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:inline-flex;align-items:center;justify-content:center;min-height:2.3rem;min-width:2.75rem;padding:.55rem .78rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:850;line-height:1.2;cursor:pointer;user-select:none;outline:none}:host(:focus-visible){box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}:host([selected]),:host([aria-selected="true"]){border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}:host([disabled]),:host([aria-disabled="true"]){cursor:not-allowed;opacity:.58}::slotted(*){pointer-events:none} </style><slot></slot>`;
        }
      };
      UibTabPanel = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "selected"];
        }
        render() {
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff)}:host([hidden]){display:none!important} </style><slot></slot>`;
        }
      };
      UibTabs = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "selected", "orientation"];
        }
        constructor() {
          super();
          this._reflectingSelected = false;
          this._pendingSelected = null;
          this._syncing = false;
          this._observer = null;
          this._boundClick = (event) => this._handleClick(event);
          this._boundKeydown = (event) => this._handleKeydown(event);
        }
        get selected() {
          return this.getAttribute("selected") || "";
        }
        set selected(value) {
          if (value === null || value === void 0 || value === "") this.removeAttribute("selected");
          else this.setAttribute("selected", String(value));
        }
        get orientation() {
          return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal";
        }
        set orientation(value) {
          if (value === "vertical") this.setAttribute("orientation", "vertical");
          else this.setAttribute("orientation", "horizontal");
        }
        connectedCallback() {
          this.render();
          this._connectObserver();
          this._syncTabs({ emit: false });
        }
        disconnectedCallback() {
          this._observer?.disconnect();
          this._observer = null;
          this.removeEventListener("click", this._boundClick);
          this.removeEventListener("keydown", this._boundKeydown);
        }
        attributeChangedCallback(name, oldValue, newValue) {
          if (oldValue === newValue) return;
          if (name === "selected" && !this._reflectingSelected) this._pendingSelected = newValue;
          if (this.isConnected) {
            this.render();
            this._syncTabs({ emit: false });
          }
        }
        render() {
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block}.uib-tabs{display:grid;gap:.75rem}.uib-tabs--vertical{grid-template-columns:max-content minmax(0,1fr);align-items:start}.uib-tabs__list{display:flex;gap:.35rem;flex-wrap:wrap}.uib-tabs--vertical .uib-tabs__list{flex-direction:column;align-items:stretch}.uib-tabs__panels{min-width:0}@media(max-width:640px){.uib-tabs--vertical{grid-template-columns:1fr}.uib-tabs--vertical .uib-tabs__list{flex-direction:row;align-items:center}} </style><div class="uib-tabs uib-tabs--` + escapeHtml(this.orientation) + `" part="base"><div class="uib-tabs__list" part="tablist" role="tablist" aria-orientation="` + escapeHtml(this.orientation) + `"><slot name="tab"></slot></div><div class="uib-tabs__panels" part="panels"><slot name="panel"></slot></div></div>`;
          this.removeEventListener("click", this._boundClick);
          this.removeEventListener("keydown", this._boundKeydown);
          this.addEventListener("click", this._boundClick);
          this.addEventListener("keydown", this._boundKeydown);
        }
        _connectObserver() {
          this._observer?.disconnect();
          this._observer = new MutationObserver(() => this._syncTabs({ emit: false }));
          this._observer.observe(this, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: ["disabled", "aria-disabled"]
          });
        }
        _tabs() {
          return Array.from(this.children).filter((child) => child.localName === "uib-tab");
        }
        _panels() {
          return Array.from(this.children).filter((child) => child.localName === "uib-tab-panel");
        }
        _isDisabled(tab) {
          return tab.hasAttribute("disabled") || tab.getAttribute("aria-disabled") === "true";
        }
        _setManagedAttribute(element, name, value) {
          if (element.getAttribute(name) !== value) element.setAttribute(name, value);
        }
        _parseSelected() {
          const value = this._pendingSelected ?? this.getAttribute("selected");
          if (value === null || value === void 0 || value === "") return null;
          const parsed = Number(value);
          return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
        }
        _firstEnabledIndex(tabs) {
          return tabs.findIndex((tab) => !this._isDisabled(tab));
        }
        _lastEnabledIndex(tabs) {
          for (let index = tabs.length - 1; index >= 0; index -= 1) {
            if (!this._isDisabled(tabs[index])) return index;
          }
          return -1;
        }
        _normalizeSelected(tabs) {
          const requested = this._parseSelected();
          if (requested !== null && tabs[requested] && !this._isDisabled(tabs[requested])) return requested;
          return this._firstEnabledIndex(tabs);
        }
        _reflectSelected(index) {
          this._reflectingSelected = true;
          if (index >= 0) this.setAttribute("selected", String(index));
          else this.removeAttribute("selected");
          this._reflectingSelected = false;
          this._pendingSelected = null;
        }
        _syncTabs({ emit = false, oldValue = null } = {}) {
          if (this._syncing) return;
          this._syncing = true;
          const tabs = this._tabs();
          const panels = this._panels();
          const selectedIndex = this._normalizeSelected(tabs);
          tabs.forEach((tab, index) => {
            const selected = index === selectedIndex;
            const disabled = this._isDisabled(tab);
            const panel = panels[index];
            const tabId = tab.id || `${this.componentId}-tab-${index}`;
            const panelId = panel?.id || `${this.componentId}-panel-${index}`;
            if (!tab.id) tab.id = tabId;
            tab.slot = "tab";
            this._setManagedAttribute(tab, "role", "tab");
            this._setManagedAttribute(tab, "aria-selected", selected ? "true" : "false");
            this._setManagedAttribute(tab, "aria-disabled", disabled ? "true" : "false");
            if (panel) this._setManagedAttribute(tab, "aria-controls", panelId);
            else tab.removeAttribute("aria-controls");
            tab.toggleAttribute("selected", selected);
            tab.tabIndex = selected || selectedIndex < 0 && index === 0 ? 0 : -1;
          });
          panels.forEach((panel, index) => {
            const selected = index === selectedIndex;
            const tab = tabs[index];
            const tabId = tab?.id || `${this.componentId}-tab-${index}`;
            const panelId = panel.id || `${this.componentId}-panel-${index}`;
            if (!panel.id) panel.id = panelId;
            panel.slot = "panel";
            this._setManagedAttribute(panel, "role", "tabpanel");
            if (tab) this._setManagedAttribute(panel, "aria-labelledby", tabId);
            else panel.removeAttribute("aria-labelledby");
            panel.toggleAttribute("hidden", !selected);
            panel.toggleAttribute("selected", selected);
            panel.tabIndex = selected ? 0 : -1;
          });
          this._reflectSelected(selectedIndex);
          this._syncing = false;
          const newValue = selectedIndex >= 0 ? selectedIndex : null;
          if (emit && oldValue !== newValue) this.emitValueChange("uib-tabs-change", oldValue, newValue);
        }
        _selectIndex(index, { emit = true, focus = true } = {}) {
          const tabs = this._tabs();
          if (!tabs[index] || this._isDisabled(tabs[index])) {
            if (focus && tabs[index]) tabs[index].focus();
            return;
          }
          const oldValue = this._normalizeSelected(tabs);
          this._pendingSelected = String(index);
          this._syncTabs({ emit, oldValue: oldValue >= 0 ? oldValue : null });
          if (focus) tabs[index]?.focus();
        }
        _handleClick(event) {
          const tab = event.target.closest?.("uib-tab");
          if (!tab || tab.parentElement !== this) return;
          const index = this._tabs().indexOf(tab);
          this._selectIndex(index, { emit: true, focus: true });
        }
        _handleKeydown(event) {
          const currentTab = event.target.closest?.("uib-tab");
          if (!currentTab || currentTab.parentElement !== this) return;
          const tabs = this._tabs();
          const currentIndex = tabs.indexOf(currentTab);
          if (currentIndex < 0) return;
          const nextKey = this.orientation === "vertical" ? "ArrowDown" : "ArrowRight";
          const previousKey = this.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
          if (event.key === nextKey || event.key === previousKey) {
            event.preventDefault();
            const direction = event.key === nextKey ? 1 : -1;
            const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
            tabs[nextIndex]?.focus();
            if (!this._isDisabled(tabs[nextIndex])) this._selectIndex(nextIndex, { emit: true, focus: false });
          } else if (event.key === "Home") {
            event.preventDefault();
            this._selectIndex(this._firstEnabledIndex(tabs), { emit: true, focus: true });
          } else if (event.key === "End") {
            event.preventDefault();
            this._selectIndex(this._lastEnabledIndex(tabs), { emit: true, focus: true });
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            this._selectIndex(currentIndex, { emit: true, focus: true });
          }
        }
      };
      UibSplitter = class extends UibLayoutBase {
        static get observedAttributes() {
          return [...UibBaseElement.commonAttributes, "position"];
        }
        render() {
          const position = this.getAttribute("position") || "1fr 1fr";
          if (!this.shadowRoot) this.attachShadow({ mode: "open" });
          this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-splitter{display:grid;grid-template-columns:` + escapeHtml(position) + `;gap:var(--uib-space-4,1rem)}.uib-splitter__pane{min-width:0;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);padding:1rem}@media(max-width:700px){.uib-splitter{grid-template-columns:1fr}} </style><div class="uib-splitter" part="base"><section class="uib-splitter__pane" part="pane-start"><slot name="start"></slot></section><section class="uib-splitter__pane" part="pane-end"><slot name="end"></slot><slot></slot></section></div>`;
        }
      };
      defineUiBaseElement("uib-stack", UibStack);
      defineUiBaseElement("uib-grid", UibGrid);
      defineUiBaseElement("uib-row", UibRow);
      defineUiBaseElement("uib-column", UibColumn);
      defineUiBaseElement("uib-panel", UibPanel);
      defineUiBaseElement("uib-card", UibCard);
      defineUiBaseElement("uib-dialog", UibDialog);
      defineUiBaseElement("uib-accordion", UibAccordion);
      defineUiBaseElement("uib-tab", UibTab);
      defineUiBaseElement("uib-tab-panel", UibTabPanel);
      defineUiBaseElement("uib-tabs", UibTabs);
      defineUiBaseElement("uib-splitter", UibSplitter);
    }
  });

  // tests/d6-p2/bytes/4f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45.txt
  var init_f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45 = __esm({
    "tests/d6-p2/bytes/4f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45.txt"() {
      init_e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a();
    }
  });

  // tests/d6-p2/bytes/89b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2.txt
  function copySerializable(value) {
    const seen = /* @__PURE__ */ new Set();
    const visit = (item, path = "$") => {
      if (item === null || typeof item === "string" || typeof item === "boolean") return;
      if (typeof item === "number" && Number.isFinite(item)) return;
      if (!item || typeof item !== "object") throw new TypeError(`${path} must contain JSON values only.`);
      if (seen.has(item)) throw new TypeError(`${path} contains a cycle.`);
      if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new TypeError(`${path} contains a runtime object.`);
      seen.add(item);
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
        if (Array.isArray(item) && key === "length") continue;
        if (["__proto__", "constructor", "prototype"].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} is not a data field.`);
        visit(descriptor.value, `${path}.${key}`);
      }
      seen.delete(item);
    };
    visit(value);
    return JSON.parse(JSON.stringify(value));
  }
  function freezeDefinition(value) {
    for (const child of Object.values(value)) if (child && typeof child === "object") freezeDefinition(child);
    return Object.freeze(value);
  }
  function defaultSettings(definition) {
    return Object.fromEntries(Object.entries(definition.builder.settings).map(([name, setting]) => [name, setting.default]));
  }
  function safeAuthoringUrl(value, image = false) {
    if (!value) return true;
    if (typeof value !== "string" || /[\u0000-\u0020\u007f]/.test(value.trim())) return false;
    const input = value.trim();
    if (input.startsWith("//") || input.includes("\\")) return false;
    if (!/^[a-z][a-z\d+.-]*:/i.test(input)) return true;
    return image ? /^https?:/i.test(input) : /^(https?|mailto|tel):/i.test(input);
  }
  function validateDefinition(input) {
    const errors = [];
    let definition;
    try {
      definition = copySerializable(input);
    } catch (error) {
      return [error.message];
    }
    const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
    if (!object(definition)) return ["Component Definition must be an object."];
    if (definition.schemaVersion !== "1.0.0") errors.push("Unsupported Component Definition schema version.");
    for (const field of ["componentId", "name", "displayName", "description"]) if (typeof definition.identity?.[field] !== "string" || field !== "description" && !definition.identity[field].trim()) errors.push(`identity.${field} is required.`);
    if (!["platform", "application"].includes(definition.ownership?.scope)) errors.push("Scope must be platform or application.");
    if (!definition.ownership?.package?.packageId || !definition.version?.packageVersion) errors.push("Owning package and package version are required.");
    if (!["code", "composite"].includes(definition.implementation?.type)) errors.push("Implementation type must be code or composite.");
    if (definition.implementation?.type === "composite") errors.push("Composite graph validation is outside this reference stage.");
    if (typeof definition.implementation?.tagName !== "string" || !definition.implementation.tagName.includes("-")) errors.push("A custom-element tag is required.");
    if (definition.implementation?.runtimeBinding?.kind !== "custom-element" || definition.implementation.runtimeBinding.tagName !== definition.implementation.tagName) errors.push("Runtime binding must identify the declared custom element.");
    if (typeof definition.implementation?.importPath !== "string" || typeof definition.implementation?.exportName !== "string") errors.push("Code import path and export name are required.");
    if (!Array.isArray(definition.implementation?.aliases) || definition.implementation.aliases.some((alias) => !object(alias) || typeof alias.importPath !== "string" || typeof alias.exportName !== "string")) errors.push("Compatibility aliases must declare import paths and export names.");
    if (definition.tagName !== definition.implementation?.tagName || definition.module !== definition.implementation?.module) errors.push("Legacy manifest projections must match the canonical implementation.");
    if (!object(definition.runtime?.attributes) || !object(definition.runtime?.properties) || !object(definition.runtime?.events) || !Array.isArray(definition.runtime?.slots) || definition.runtime.slots.some((slot) => !object(slot) || typeof slot.name !== "string")) errors.push("Runtime API sections are required.");
    if (!object(definition.builder?.settings) || Object.values(definition.builder.settings).some((setting) => !object(setting)) || !Array.isArray(definition.builder?.groups) || definition.builder.groups.some((group) => !object(group) || typeof group.id !== "string")) errors.push("Builder settings/groups are required.");
    if (!Array.isArray(definition.capabilities) || definition.capabilities.some((capability) => typeof capability !== "string")) errors.push("Capabilities must be named strings.");
    if (!object(definition.presentation) || !Array.isArray(definition.presentation.cssVariables)) errors.push("Presentation styling hooks are required.");
    if (!object(definition.dependencies) || !Array.isArray(definition.dependencies.packages) || !Array.isArray(definition.dependencies.services)) errors.push("Package and service dependencies are required.");
    if (!object(definition.lifecycle) || !["installed", "workspace", "published"].includes(definition.lifecycle.state)) errors.push("An explicit lifecycle state is required.");
    if (errors.length) return errors;
    const groups = new Set(definition.builder.groups.map((group) => group.id));
    const slots = new Set(definition.runtime.slots.map((slot) => slot.name));
    for (const [name, projection] of Object.entries(definition.presentation.settings || {})) {
      const setting = definition.builder.settings[name];
      if (!setting || projection.type !== "select" || JSON.stringify(projection.options) !== JSON.stringify(setting.enum)) errors.push(`${name} legacy presentation projection must match its Builder setting.`);
    }
    for (const [name, setting] of Object.entries(definition.builder.settings)) {
      if (!groups.has(setting.group)) errors.push(`${name} references an unknown editor group.`);
      if (!["string", "boolean", "number"].includes(setting.type) || typeof setting.default !== setting.type) errors.push(`${name} has an invalid type/default.`);
      if (setting.enum && !setting.enum.includes(setting.default)) errors.push(`${name} default is outside its allowed values.`);
      const binding = setting.binding || {};
      if (binding.kind === "attribute" && !definition.runtime.attributes[binding.name]) errors.push(`${name} binds an unknown attribute.`);
      else if (binding.kind === "property" && !definition.runtime.properties[binding.name]?.writable) errors.push(`${name} binds a read-only or unknown property.`);
      else if (binding.kind === "slot" && (!slots.has(binding.name) || !["text", "image"].includes(binding.content))) errors.push(`${name} binds an invalid slot.`);
      else if (binding.kind === "event" && !definition.runtime.events[binding.name]) errors.push(`${name} binds an unknown event.`);
      else if (binding.kind === "cssProperty" && !definition.presentation.cssVariables?.includes(binding.name)) errors.push(`${name} binds an unknown styling hook.`);
      else if (!["attribute", "property", "slot", "slotMetadata", "event", "mode", "cssProperty"].includes(binding.kind)) errors.push(`${name} has an unsupported binding.`);
      if (setting.visibleWhen && !definition.builder.settings[setting.visibleWhen.setting]) errors.push(`${name} has an unknown visibility condition.`);
    }
    for (const [name, setting] of Object.entries(definition.builder.definitionSettings || {})) {
      if (!["identity.displayName", "identity.description"].includes(setting.binding?.path)) errors.push(`${name} cannot edit this definition field in V1.`);
    }
    return errors;
  }
  function validateSettings(definition, input, { registry, resolveHandlers = false } = {}) {
    const errors = [];
    let values;
    try {
      values = copySerializable(input);
    } catch (error) {
      return [error.message];
    }
    if (!values || Array.isArray(values) || typeof values !== "object") return ["Settings must be an object."];
    for (const name of Object.keys(values)) if (!definition.builder.settings[name]) errors.push(`Unknown setting: ${name}.`);
    const effective = { ...defaultSettings(definition), ...values };
    for (const [name, setting] of Object.entries(definition.builder.settings)) {
      const value = effective[name];
      if (typeof value !== setting.type || setting.type === "number" && !Number.isFinite(value)) {
        errors.push(`${setting.label} must be ${setting.type}.`);
        continue;
      }
      if (setting.enum && !setting.enum.includes(value)) errors.push(`${setting.label} has an unsupported value.`);
      if (!isSettingVisible(setting, effective) && value !== setting.default) errors.push(`${setting.label} is not allowed in this interaction mode.`);
      if ((setting.format === "url" || setting.format === "image-url") && !safeAuthoringUrl(value, setting.format === "image-url")) errors.push(`${setting.label} uses an unsupported URL.`);
      if (resolveHandlers && setting.binding.kind === "event" && value && !registry?.hasHandler(value)) errors.push(`Handler is not registered: ${value}.`);
    }
    for (const rule of definition.builder.validation || []) {
      const applies = !rule.when || effective[rule.when.setting] === rule.when.equals;
      if (!applies) continue;
      if (rule.kind === "requiredWhen" && !String(effective[rule.setting] || "").trim()) errors.push(`${definition.builder.settings[rule.setting].label} is required.`);
      if (rule.kind === "oneOfRequiredWhen" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("An action or action token is required.");
      if (rule.kind === "accessibleNameWhenInteractive" && effective.interactionMode !== "none" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("Interactive cards need an accessible name.");
    }
    return errors;
  }
  var isSettingVisible;
  var init_b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2 = __esm({
    "tests/d6-p2/bytes/89b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2.txt"() {
      isSettingVisible = (setting, values) => !setting.visibleWhen || values[setting.visibleWhen.setting] === setting.visibleWhen.equals;
    }
  });

  // tests/d6-p2/bytes/5c0201efc5f1ceccd8423a3873a4875c07b7550077dc811e8e10aa3ac22baae4.txt
  function renderComponentInstance(definition, instance2, { registry, document: ownerDocument = document, preview = false, onEvent = () => {
  } } = {}) {
    if (definition.implementation.type !== "code") throw new Error("Composite rendering is outside this reference stage.");
    if (definition.implementation.runtimeBinding.kind !== "custom-element") throw new Error("Unsupported runtime binding.");
    const errors = validateSettings(definition, instance2.settings, { registry, resolveHandlers: !preview });
    if (instance2.componentId !== definition.identity.componentId) errors.push("Instance Component identity does not match its Definition.");
    const serviceRefs = copySerializable(instance2.serviceRefs || {});
    const declaredServices = definition.dependencies.services || [];
    for (const name of Object.keys(serviceRefs)) if (!declaredServices.some((service) => service.name === name)) errors.push(`Unknown service reference: ${name}.`);
    for (const service of declaredServices) if (service.required && !serviceRefs[service.name]) errors.push(`Service reference is required: ${service.name}.`);
    if (errors.length) throw new Error(errors.join("\n"));
    const tag = definition.implementation.runtimeBinding.tagName;
    if (!ownerDocument.defaultView.customElements.get(tag)) throw new Error(`Runtime implementation is not registered: ${tag}.`);
    const element = ownerDocument.createElement(tag);
    const values = { ...defaultSettings(definition), ...instance2.settings };
    for (const [name, setting] of Object.entries(definition.builder.settings)) {
      if (!isSettingVisible(setting, values)) continue;
      const value = values[name];
      const binding = setting.binding;
      if (binding.kind === "attribute") {
        if (setting.type === "boolean") element.toggleAttribute(binding.name, value);
        else if (value !== "") element.setAttribute(binding.name, String(value));
      } else if (binding.kind === "property") element[binding.name] = value;
      else if (binding.kind === "cssProperty") element.style.setProperty(binding.name, value);
      else if (binding.kind === "slot" && value !== "") {
        const child = ownerDocument.createElement(binding.content === "image" ? "img" : "span");
        if (binding.name !== "default") child.slot = binding.name;
        if (binding.content === "image") {
          child.src = value;
          child.alt = values[binding.altSetting] || "";
        } else child.textContent = value;
        element.append(child);
      }
    }
    for (const [name, value] of Object.entries(definition.builder.interactionModes?.[values.interactionMode]?.attributes || {})) {
      if (typeof value === "boolean") element.toggleAttribute(name, value);
      else element.setAttribute(name, String(value));
    }
    for (const service of declaredServices) if (serviceRefs[service.name]) element[service.property] = registry.service(serviceRefs[service.name]);
    for (const [name, contract] of Object.entries(definition.runtime.events)) {
      element.addEventListener(name, (event) => {
        if (event.target !== element) return;
        const detail = Object.fromEntries(Object.keys(contract.detail).filter((key) => event.detail?.[key] !== void 0).map((key) => [key, event.detail[key]]));
        const payload = copySerializable(detail);
        onEvent({ type: name, detail: payload });
        if (preview) {
          if (event.cancelable) event.preventDefault();
          return;
        }
        const setting = Object.entries(definition.builder.settings).find(([, item]) => item.binding.kind === "event" && item.binding.name === name);
        const handlerId = setting && values[setting[0]];
        if (handlerId && registry.handler(handlerId)(payload, { element, event }) === false && event.cancelable) event.preventDefault();
      });
    }
    if (preview) element.addEventListener("click", (event) => {
      if (event.composedPath().some((node) => node?.localName === "a")) event.preventDefault();
    }, { capture: true });
    return element;
  }
  var init_c0201efc5f1ceccd8423a3873a4875c07b7550077dc811e8e10aa3ac22baae4 = __esm({
    "tests/d6-p2/bytes/5c0201efc5f1ceccd8423a3873a4875c07b7550077dc811e8e10aa3ac22baae4.txt"() {
      init_f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45();
      init_b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2();
    }
  });

  // tests/d6-p2/bytes/fdbd0bfd5278b417feeaafe0604738265acd35ec641a7c7352ef4f1376dc8f85.txt
  var ComponentRegistry;
  var init_fdbd0bfd5278b417feeaafe0604738265acd35ec641a7c7352ef4f1376dc8f85 = __esm({
    "tests/d6-p2/bytes/fdbd0bfd5278b417feeaafe0604738265acd35ec641a7c7352ef4f1376dc8f85.txt"() {
      init_b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2();
      ComponentRegistry = class {
        #definitions = /* @__PURE__ */ new Map();
        #routes = /* @__PURE__ */ new Map();
        #handlers = /* @__PURE__ */ new Map();
        #services = /* @__PURE__ */ new Map();
        registerManifest(manifest, { packageId, scope = "platform" } = {}) {
          if (!packageId || !Array.isArray(manifest?.components)) throw new Error("Manifest components and package owner are required.");
          const staged = [];
          const ids = new Set(this.#definitions.keys());
          for (const entry of manifest.components) {
            if (!entry.schemaVersion) continue;
            const definition = copySerializable(entry);
            const errors = validateDefinition(definition);
            if (definition.ownership?.package?.packageId !== packageId || definition.ownership?.scope !== scope) errors.push("Definition does not match its declared owning package/scope.");
            if (ids.has(definition.identity?.componentId)) errors.push("Component identity is already registered.");
            if (errors.length) throw new Error(errors.join("\n"));
            ids.add(definition.identity.componentId);
            staged.push(freezeDefinition(definition));
          }
          for (const definition of staged) {
            const id = definition.identity.componentId;
            this.#definitions.set(id, definition);
            const implementation = definition.implementation;
            const routes = [
              id,
              implementation.tagName,
              definition.identity.name,
              `${scope}:${packageId}:${implementation.tagName}`,
              implementation.importPath,
              `${implementation.importPath}#${implementation.exportName}`,
              ...(implementation.aliases || []).flatMap((alias) => [alias.importPath, `${alias.importPath}#${alias.exportName}`])
            ];
            for (const route of routes) {
              if (!this.#routes.has(route)) this.#routes.set(route, /* @__PURE__ */ new Set());
              this.#routes.get(route).add(id);
            }
          }
          return staged;
        }
        resolve(reference, { packageId, scope } = {}) {
          const candidates = [...this.#routes.get(reference) || []].map((id) => this.#definitions.get(id)).filter((definition) => (!packageId || definition.ownership.package.packageId === packageId) && (!scope || definition.ownership.scope === scope));
          if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous component route: ${reference}. Specify owner/scope.` : `Unknown component: ${reference}.`);
          return candidates[0];
        }
        discover({ scope, capability } = {}) {
          return [...this.#definitions.values()].filter((definition) => (!scope || definition.ownership.scope === scope) && (!capability || definition.capabilities.includes(capability)));
        }
        registerHandler(id, handler) {
          if (!id || typeof handler !== "function" || this.#handlers.has(id)) throw new Error("A unique handler ID and function are required.");
          this.#handlers.set(id, handler);
        }
        hasHandler(id) {
          return this.#handlers.has(id);
        }
        handler(id) {
          if (!this.#handlers.has(id)) throw new Error(`Handler is not registered: ${id}.`);
          return this.#handlers.get(id);
        }
        registerService(id, service) {
          if (!id || service == null || this.#services.has(id)) throw new Error("A unique service ID and runtime service are required.");
          this.#services.set(id, service);
        }
        service(id) {
          if (!this.#services.has(id)) throw new Error(`Service is not registered: ${id}.`);
          return this.#services.get(id);
        }
      };
    }
  });

  // tests/html-first/native.ts
  var init_native = __esm({
    "tests/html-first/native.ts"() {
      init_c0201efc5f1ceccd8423a3873a4875c07b7550077dc811e8e10aa3ac22baae4();
      init_fdbd0bfd5278b417feeaafe0604738265acd35ec641a7c7352ef4f1376dc8f85();
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
      const parent2 = parentItemId ? all.get(parentItemId) : void 0;
      if (parentItemId && !parent2) throw new Error("Page-local item parent is missing.");
      walk([item]);
      (parent2 ? parent2.children ??= [] : result.items).push(structuredClone(item));
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
    const events2 = [];
    const render = (item) => {
      if (item.hidden) return { html: "", active: false };
      const children = (item.children ?? []).map(render), destination = item.destination;
      const current = destination.kind === "page" ? destination.pageId === currentPageId : destination.kind === "route" ? destination.routeId === currentRouteId && Object.entries(destination.params ?? {}).every(([key, value]) => params[key] === value) : false;
      const activePath = children.some((child) => child.active);
      const node = `menu_${placementId.replace(/\W/g, "_")}_${menu.menuId.replace(/\W/g, "_")}_${item.itemId}`;
      let control;
      if (destination.kind === "action") {
        if (!item.disabled) events2.push({ node, event: "click", actions: destination.actions });
        control = `<button type="button" data-uip-node="${node}"${item.disabled ? " disabled" : ""}>${escapeAttribute(item.label)}</button>`;
      } else {
        const route = destination.kind === "page" ? routes.find((r) => r.pageId === destination.pageId) : destination.kind === "route" ? routes.find((r) => r.routeId === destination.routeId) : void 0;
        const url = destination.kind === "url" ? destination.url : route ? routePath(route, { ...params, ...destination.params }) : void 0;
        if (!url) throw new Error(`Menu target not found: ${item.label}.`);
        control = `<a${item.disabled ? ' aria-disabled="true" tabindex="-1"' : ` href="${escapeAttribute(url)}"`} target="${item.target ?? "_self"}" rel="noopener noreferrer"${current ? ' aria-current="page"' : ""}>${escapeAttribute(item.label)}</a>`;
      }
      return { html: `<li class="${current ? "current " : ""}${activePath ? "active-path" : ""}" data-current="${current}" data-active-path="${activePath}">${control}${children.some((child) => child.html) ? `<ul>${children.map((child) => child.html).join("")}</ul>` : ""}</li>`, active: current || activePath };
    };
    return { source: `<ul>${menu.items.map((item) => render(item).html).join("")}</ul>`, events: events2 };
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
      init_source();
    }
  });

  // packages/visual-artifacts/src/revision-guard.ts
  function freezeData(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  function bindManagedVisualProjection(original, projected) {
    const graph = managed.get(original.metadata);
    if (graph) {
      freezeData(projected.metadata);
      Object.freeze(projected);
      managed.set(projected.metadata, { ...graph, artifact: projected });
    }
    return projected;
  }
  function managedVisualComposition(artifact) {
    const graph = managed.get(artifact.metadata);
    return graph?.composition ? { definition: graph.composition, assetUrl: (relative) => graph.assets?.[relative] ?? relative } : void 0;
  }
  function assertManagedVisualRevision(artifact, dependencies = [], composition) {
    const graph = managed.get(artifact.metadata);
    if (!graph) {
      if (managedIds.has(artifact.metadata.artifactId)) throw new Error("Cloned managed Visual metadata must be loaded through its pinned graph.");
      return;
    }
    if (composition && graph.composition !== composition) throw new Error("Managed Visual composition came from a different runtime graph.");
    if (graph.artifact.source !== artifact.source || graph.artifact.css !== artifact.css || graph.artifact.functions !== artifact.functions) throw new Error("Managed Visual roles came from different runtime revisions. Reload a complete pinned graph.");
    for (const dependency of dependencies) {
      const other = managed.get(dependency.metadata);
      if (!other && managedIds.has(dependency.metadata.artifactId)) throw new Error("Cloned managed Visual dependencies must be loaded through their pinned graph.");
      if (other) assertManagedVisualRevision(dependency);
      if (other && other.revision !== graph.revision) throw new Error("Managed Visual dependencies came from different runtime revisions. Reload a complete pinned graph.");
    }
  }
  var managed, managedIds;
  var init_revision_guard = __esm({
    "packages/visual-artifacts/src/revision-guard.ts"() {
      managed = /* @__PURE__ */ new WeakMap();
      managedIds = /* @__PURE__ */ new Set();
    }
  });

  // packages/visual-artifacts/src/composition-runtime.ts
  function mountComposedPage(definition, page, options) {
    assertManagedVisualRevision(page, [...definition.shells, ...options.components], definition);
    const original = definition.shells.find((shell2) => shell2.metadata.artifactId === page.metadata.shellId);
    if (!original) throw new Error("The selected Shell is missing. Select a Shell explicitly.");
    const shell = composeShellMenus(original, definition, page, options.routeId ?? "", options.route);
    const template = document.createElement("template");
    template.innerHTML = shell.source;
    for (const element of template.content.querySelectorAll("[data-uip-branding]")) {
      const key = element.dataset.uipBranding;
      const value = definition.settings.branding[key];
      if (element instanceof HTMLImageElement) {
        if (value) element.src = options.assetUrl?.(value) ?? value;
        else element.removeAttribute("src");
      } else element.textContent = value ?? "";
    }
    if (options.editor) for (const element of template.content.querySelectorAll("[data-uip-node]")) {
      if (!element.closest("[data-uip-region]")) {
        element.dataset.uipLocked = "true";
        element.title = "Shell content \u2014 edit in the Shell editor";
      }
    }
    shell.source = template.innerHTML;
    bindManagedVisualProjection(original, shell);
    const available = new Set(regions(shell.source).map((region) => region.regionId)), content = {};
    for (const region of regions(page.source)) {
      if (!available.has(region.regionId)) throw new Error(`Page Region is missing from its Shell: ${region.regionId}. Map or discard it explicitly.`);
      const source = page.source.slice(region.start, region.end);
      const ids = new Set(parseSource(source).nodes.map((node) => node.id));
      const metadata = structuredClone(page.metadata);
      for (const key of ["bindings", "conditions", "repeaters", "events"]) metadata[key] = metadata[key]?.filter((item) => ids.has(item.node));
      metadata.layout = Object.fromEntries(Object.entries(metadata.layout ?? {}).filter(([id]) => ids.has(id)));
      content[region.regionId] = { ...page, metadata, source };
    }
    const css = `${themeCss(definition.settings)}
${definition.siteCss}`;
    return mountVisualArtifact(shell, {
      ...options,
      context: { ...options.context, branding: definition.settings.branding },
      presentationCss: css,
      inputs: definition.settings.shellConfiguration?.[shell.metadata.artifactId],
      regionInputs: options.inputs,
      regionScope: { state: structuredClone(page.metadata.state ?? {}), data: {}, subscribers: /* @__PURE__ */ new Set(), initialized: false },
      regions: Object.fromEntries(Object.entries(content).map(([id, artifact]) => [id, bindManagedVisualProjection(page, { ...artifact, css: `${shell.css}
${artifact.css}` })]))
    });
  }
  var init_composition_runtime = __esm({
    "packages/visual-artifacts/src/composition-runtime.ts"() {
      init_composition();
      init_source();
      init_runtime();
      init_revision_guard();
    }
  });

  // ../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts
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
  function evaluateDeclarative(declaration, values) {
    const types = new Map(expressionDependencies(declaration).map((id) => {
      if (!Object.hasOwn(values, id)) throw new Error("EXPRESSION_DEPENDENCY_UNAVAILABLE");
      return [id, typeof values[id]];
    }));
    expressionType(declaration, types);
    const evaluate = (node) => {
      if (node.kind === "literal") return node.value;
      if (node.kind === "field") {
        const v = values[node.fieldId];
        if (typeof v === "number" && !Number.isFinite(v)) return deny();
        return v;
      }
      if (node.operator === "if") return evaluate(node.args[0]) ? evaluate(node.args[1]) : evaluate(node.args[2]);
      const [a, b] = node.args.map(evaluate);
      if (node.operator === "not") return !a;
      if (node.operator === "and") return Boolean(a && b);
      if (node.operator === "or") return Boolean(a || b);
      if (node.operator === "eq") return a === b;
      if (node.operator === "concat") return a + b;
      if (node.operator === "lt") return a < b;
      if (node.operator === "gt") return a > b;
      const result = node.operator === "add" ? a + b : node.operator === "subtract" ? a - b : node.operator === "multiply" ? a * b : a / b;
      if (!Number.isFinite(result)) throw new Error("EXPRESSION_RESULT_INVALID");
      return result;
    };
    return evaluate(declaration.expression);
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
  function calculateFields(calculations, fields, row) {
    const values = /* @__PURE__ */ Object.create(null);
    for (const field of fields) if (Object.hasOwn(row, field.key)) values[field.fieldId] = row[field.key];
    const result = { ...row };
    for (const c of calculationOrder(calculations, fields)) {
      const value = evaluateDeclarative(c.expression, values);
      values[c.fieldId] = value;
      result[fields.find((f) => f.fieldId === c.fieldId).key] = value;
    }
    return result;
  }
  function evaluatePresentation(expression, scope) {
    if (typeof expression === "string") {
      if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expression)) throw new Error(`Expected a named-source path: ${expression}`);
      let value = scope;
      for (const part of expression.split(".")) {
        if (unsafe.has(part)) throw new Error("Unsafe binding path.");
        value = value != null && Object.hasOwn(Object(value), part) ? value[part] : void 0;
      }
      return value;
    }
    if ("version" in expression) return evaluateDeclarative(expression, scope.fields ?? {});
    if ("literal" in expression) return structuredClone(expression.literal);
    const args = expression.args.map((arg) => evaluatePresentation(arg, scope));
    if (expression.op === "not") return !args[0];
    if (expression.op === "eq") return args[0] === args[1];
    if (expression.op === "and") return args.every(Boolean);
    if (expression.op === "or") return args.some(Boolean);
    return deny();
  }
  var deny, unsafe, exact;
  var init_declarative_expression = __esm({
    "../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts"() {
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
  function resolveMode(metadata, selected) {
    const modes = metadata.modes;
    if (!modes) return {};
    const name = selected === void 0 ? modes.default : String(selected);
    if (!Object.hasOwn(modes.overrides, name)) throw new Error(`Unknown mode: ${name}.`);
    const result = structuredClone(modes.overrides[modes.default]);
    for (const [node, override] of Object.entries(modes.overrides[name])) result[node] = { ...result[node], ...override };
    return result;
  }
  function effectiveField(field, overrides, operation, readOnly = false, authorization) {
    const operationAllowed = !field.operations || field.operations.includes(operation);
    const result = { ...field, ...overrides[field.node], submissionAllowed: operationAllowed && !readOnly && authorization?.read !== false && authorization?.write !== false };
    result.visible = result.visible !== false && operationAllowed && authorization?.read !== false;
    result.editable = result.editable !== false && !readOnly && authorization?.write !== false;
    result.required = field.datasetRequired || result.required;
    return result;
  }
  function formPayload(metadata, values, original, fields, operation) {
    const form = metadata.form;
    if (!["create", "edit"].includes(operation)) throw new Error("Unknown Form operation.");
    const record = {};
    if (operation === "edit") {
      if (original[form.primaryKey] === void 0) throw new Error("Edit requires a record identity.");
      record[form.primaryKey] = original[form.primaryKey];
    }
    for (const field of fields) {
      if (field.submissionAllowed === false || !field.editable && !field.calculation?.persist || field.calculation && !field.calculation.persist || field.key === form.primaryKey && operation === "edit") continue;
      if (operation === "create" || JSON.stringify(values[field.key]) !== JSON.stringify(original[field.key])) {
        if (values[field.key] !== void 0) record[field.key] = values[field.key];
      }
    }
    return record;
  }
  function formValueErrors(values, fields) {
    const errors = {};
    for (const field of fields) {
      const value = values[field.key];
      const required = field.datasetRequired || field.required;
      const issues = valueErrors(value, { type: field.type, required }, field.label ?? field.key);
      if (field.codec === "date" && value !== void 0) {
        let valid = false;
        try {
          valid = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value;
        } catch {
        }
        if (!valid) issues.push(`${field.label ?? field.key} requires a UTC ISO timestamp.`);
      }
      if (required && value === "") issues.push(`${field.label ?? field.key} is required.`);
      if (issues.length) errors[field.id] = issues.join(" ");
    }
    return errors;
  }
  var init_form = __esm({
    "packages/visual-artifacts/src/form.ts"() {
      init_source();
      init_model();
    }
  });

  // packages/visual-artifacts/src/page-admission.ts
  function pageAdmissionKind(metadata) {
    return metadata.shellId !== void 0 || metadata.routeId !== void 0 ? "composed" : "plain";
  }
  var init_page_admission = __esm({
    "packages/visual-artifacts/src/page-admission.ts"() {
      init_source();
      init_page_links();
    }
  });

  // packages/visual-artifacts/src/form-runtime.ts
  function attachFormRuntime(metadata, root, state, options, inputs, render, emit) {
    const form = metadata.form;
    let original = {}, identity = "", generation = 0, disposed = false, loading = false;
    const operation = () => String(inputs().operation ?? "create");
    const fields = () => form.fields.map((field) => {
      const effective = effectiveField(field, resolveMode(metadata, inputs().mode), operation(), Boolean(inputs().readOnly || inputs().disabled || state.submitting || loading), options.fieldAuthorization?.[form.datasetId]?.[field.key]);
      if (field.calculation) effective.editable = false;
      return effective;
    });
    const values = () => state.values;
    const notify = (name, result) => {
      if (metadata.public?.events[name]) emit(name, { result });
    };
    const service = (name, input) => {
      const adapter = options.services?.[name];
      if (!adapter) throw new Error(`Missing Dataset adapter: ${name}.`);
      return adapter(input);
    };
    function initialize() {
      const next = JSON.stringify([operation(), inputs().recordId, inputs().initialRecord]);
      if (next === identity) return;
      identity = next;
      const current = ++generation;
      original = structuredClone(inputs().initialRecord ?? {});
      state.values = Object.fromEntries(fields().filter((f) => f.default !== void 0).map((f) => [f.key, structuredClone(f.default)]));
      for (const field of form.fields) if (field.type === "boolean" && !Object.hasOwn(values(), field.key)) values()[field.key] = false;
      Object.assign(values(), original);
      state.dirty = false;
      state.submitting = false;
      state.submitted = false;
      state.submitError = null;
      state.validation = {};
      state.savedRecord = null;
      state.conversionErrors = {};
      state.rawJsonValues = {};
      loading = false;
      if (operation() === "edit" && inputs().initialRecord === void 0 && inputs().recordId !== void 0) {
        loading = true;
        void Promise.resolve().then(() => service(form.submit.readService, { datasetId: form.datasetId, where: { field: form.primaryKey, op: "eq", value: inputs().recordId } })).then((result) => {
          if (disposed || current !== generation) return;
          if (!Array.isArray(result) || !result[0]) throw new Error("Record was not found or read was denied.");
          original = structuredClone(result[0]);
          state.values = structuredClone(original);
          loading = false;
          render();
        }).catch((error) => {
          if (!disposed && current === generation) {
            loading = false;
            state.submitError = String(error);
            render();
          }
        });
      }
    }
    function paint() {
      initialize();
      for (const field of fields()) {
        const control = root.querySelector(`[data-uip-node="${field.node}"]`);
        if (!control) continue;
        control.hidden = field.visible === false;
        control.toggleAttribute("readonly", !field.editable);
        control.toggleAttribute("disabled", !field.editable);
        control.toggleAttribute("required", Boolean(field.required));
        if (field.label !== void 0) control.setAttribute("label", field.label);
        if (field.help !== void 0) control.setAttribute("help", field.help);
        const value = values()[field.key];
        const raw = state.rawJsonValues[field.id];
        if (raw !== void 0 || value !== void 0) {
          control.setAttribute("value", raw ?? (field.codec === "json" ? JSON.stringify(value) : String(value)));
          if (field.type === "boolean") control.toggleAttribute("checked", Boolean(value));
        }
        const error2 = root.querySelector(`[data-uip-field-error="${field.id}"]`);
        if (error2) error2.textContent = String(state.validation?.[field.id] ?? "");
      }
      const error = root.querySelector('[data-uip-node="submit-error"]');
      if (error) error.textContent = String(state.submitError ?? "");
      const saved = root.querySelector('[data-uip-node="saved-result"]');
      if (saved) saved.textContent = state.savedRecord ? JSON.stringify(state.savedRecord, null, 2) : "";
    }
    const capture = (event) => {
      const control = event.composedPath().find((node) => node instanceof HTMLElement && node.hasAttribute("data-uip-node"));
      const field = fields().find((f) => f.node === control?.dataset.uipNode);
      if (!field || !field.editable || field.visible === false) return;
      if (field.type === "boolean" && event.type !== "uib-forms-checkbox-change") return;
      const input = control;
      let changed = false;
      try {
        const next = field.codec === "json" ? JSON.parse(String(input.value)) : field.type === "boolean" ? input.checked : field.type === "number" && input.value !== "" ? Number(input.value) : input.value;
        changed = JSON.stringify(next) !== JSON.stringify(values()[field.key]) || Object.hasOwn(state.conversionErrors, field.id);
        values()[field.key] = next;
        delete state.validation[field.id];
      } catch {
        const message = "Enter valid JSON. The incomplete value has not been converted.";
        state.validation[field.id] = message;
        state.conversionErrors[field.id] = message;
        state.rawJsonValues[field.id] = String(input.value);
        return;
      }
      delete state.conversionErrors[field.id];
      delete state.rawJsonValues[field.id];
      if (!changed) return;
      state.dirty = true;
      if (field.type === "boolean") {
        setTimeout(() => {
          if (!disposed) render();
        }, 0);
        return;
      }
      const focus = event.composedPath()[0], start = focus.selectionStart, end = focus.selectionEnd;
      render();
      const replacement = root.querySelector(`[data-uip-node="${field.node}"]`);
      const target = replacement?.shadowRoot?.querySelector("input,textarea");
      if (target && !replacement?.hidden) {
        target.focus();
        if (start !== null && end !== null && ["text", "search", "tel", "url", "password"].includes(target.type)) {
          try {
            target.setSelectionRange(start, end);
          } catch {
          }
        }
      }
    };
    const submit = async (event) => {
      if (!(event.target instanceof HTMLElement) || event.target.dataset.uipNode !== form.node) return;
      event.stopPropagation();
      if (state.submitting || loading || inputs().disabled || inputs().readOnly) return;
      const current = generation;
      try {
        if (!form.datasetId) throw new Error("Map a connected Dataset before submitting.");
        if (state.calculationError || Object.keys(state.conversionErrors).length) throw new Error(String(state.calculationError ?? "Correct invalid JSON before submitting."));
        state.commitOutcome = void 0;
        const active = fields();
        state.validation = formValueErrors(values(), active);
        if (event.detail?.valid === false || Object.keys(state.validation).length) throw new Error("Correct the validation errors before submitting.");
        const record = formPayload(metadata, values(), original, active, operation());
        if (operation() === "create" && record[form.primaryKey] === void 0) record[form.primaryKey] = crypto.randomUUID();
        state.submitting = true;
        state.submitError = null;
        notify("submitStarted", {});
        render();
        const result = await service(form.submit.service, { datasetId: form.datasetId, ...form.contractVersion === 1 || formCalculations(metadata).some((c) => c.persist) ? { formId: metadata.componentId } : {}, operation: operation() === "edit" ? "update" : "insert", records: [record] });
        if (disposed || current !== generation) return;
        state.commitOutcome = result?.commitOutcome ?? (result?.committed ? "committed" : "not-committed");
        if (result?.success !== true || result.committed !== true) throw new Error(JSON.stringify(result));
        const saved = await service(form.submit.readService, { datasetId: form.datasetId, where: { field: form.primaryKey, op: "eq", value: record[form.primaryKey] } });
        if (disposed || current !== generation) return;
        if (!Array.isArray(saved) || !saved[0]) throw new Error("Write committed, but the saved record could not be read. Do not automatically repeat the submission.");
        original = structuredClone(saved[0]);
        state.values = structuredClone(original);
        state.savedRecord = structuredClone(original);
        state.dirty = false;
        state.submitted = true;
        notify("submitSucceeded", result);
        notify(operation() === "edit" ? "recordUpdated" : "recordCreated", original);
      } catch (error) {
        if (!disposed && current === generation) {
          state.submitError = `${state.commitOutcome === "committed" ? "Write committed. Read-back or post-commit processing failed. " : ""}${String(error)}`;
          notify("submitFailed", { message: String(error), commitOutcome: state.commitOutcome });
        }
      } finally {
        if (!disposed && current === generation) {
          state.submitting = false;
          render();
        }
      }
    };
    root.addEventListener("input", capture);
    root.addEventListener("change", capture);
    root.addEventListener("uib-forms-checkbox-change", capture);
    root.addEventListener("uib-forms-form-submit", submit);
    return { paint, prepare() {
      initialize();
      const calculations = formCalculations(metadata);
      for (const c of calculations) {
        const f = form.fields.find((f2) => f2.datasetFieldId === c.fieldId);
        delete values()[f.key];
      }
      try {
        if (calculations.some((c) => options.fieldAuthorization?.[form.datasetId]?.[form.fields.find((f) => f.datasetFieldId === c.fieldId).key]?.read === false)) throw new Error("Calculated field is unavailable.");
        const readable = Object.fromEntries(Object.entries(values()).filter(([key]) => options.fieldAuthorization?.[form.datasetId]?.[key]?.read !== false));
        Object.assign(values(), calculateFields(calculations, formExpressionFields(metadata), readable));
        state.calculationError = void 0;
      } catch {
        state.calculationError = "Calculated fields require valid, readable dependency values.";
      }
    }, destroy() {
      disposed = true;
      generation++;
      root.removeEventListener("input", capture);
      root.removeEventListener("change", capture);
      root.removeEventListener("uib-forms-checkbox-change", capture);
      root.removeEventListener("uib-forms-form-submit", submit);
    } };
  }
  var init_form_runtime = __esm({
    "packages/visual-artifacts/src/form-runtime.ts"() {
      init_form();
      init_expression();
    }
  });

  // packages/visual-artifacts/src/validation.ts
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
          let parent2 = nodes.get(field.node)?.parent;
          while (parent2 && parent2.id !== m.form.node) parent2 = parent2.parent;
          if (!parent2) error("Mapped Form controls must belong to the Form root.");
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
  function componentReferences(source) {
    return [...new Set(parseSource(source).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
  }
  var init_validation = __esm({
    "packages/visual-artifacts/src/validation.ts"() {
      init_source();
      init_model();
      init_expression();
      init_form();
      init_model();
    }
  });

  // packages/visual-artifacts/src/runtime.ts
  var runtime_exports = {};
  __export(runtime_exports, {
    createVisualPage: () => createVisualPage,
    layoutCss: () => layoutCss,
    loadRuntimePackages: () => loadRuntimePackages,
    mountComposedPage: () => mountComposedPage,
    mountVisualArtifact: () => mountVisualArtifact
  });
  async function loadRuntimePackages(packages) {
    for (const pkg of packages) if (pkg.moduleUrl) await import(
      /* @vite-ignore */
      pkg.moduleUrl
    );
  }
  function layoutCss(layout) {
    const rule = (id, values) => `[data-uip-node="${id}"]{${Object.entries(values ?? {}).map(([key, value]) => {
      if (!styles2.has(key) || /[{};<>]/.test(String(value))) throw new Error("Unsupported declarative layout value. Use local CSS for advanced rules.");
      return `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`;
    }).join(";")}}`;
    return Object.entries(layout ?? {}).map(([id, item]) => rule(id, item.base) + `@media(max-width:1023px){${rule(id, item.tablet)}}@media(max-width:639px){${rule(id, item.mobile)}}`).join("\n");
  }
  function mountVisualArtifact(artifact, options) {
    assertManagedVisualRevision(artifact, options.components);
    const errors = validateArtifact(artifact, options.components, options.packages, Object.keys(options.services ?? {})).filter((d) => d.severity === "error");
    if (errors.length) throw new Error(errors.map((d) => d.message).join("\n"));
    const m = artifact.metadata;
    const host = document.createElement("div");
    host.dataset.uipArtifact = m.artifactId;
    const root = host.attachShadow({ mode: "open" });
    const state = options.sharedScope?.state ?? structuredClone(m.state ?? {});
    let inputs = {}, disposed = false;
    const data = options.sharedScope?.data ?? {};
    const nested = /* @__PURE__ */ new Map();
    const boundEvents = /* @__PURE__ */ new Map();
    const report = options.onError ?? ((error) => console.error(error));
    const view = document.defaultView;
    let fragmentFrame = 0;
    let releaseFragmentFocus;
    const fragmentFeedback = (message) => {
      report(new Error(message));
      let feedback = root.querySelector("[data-uip-anchor-feedback]");
      if (!feedback) {
        feedback = document.createElement("p");
        feedback.dataset.uipAnchorFeedback = "";
        feedback.setAttribute("role", "status");
        root.append(feedback);
      }
      feedback.textContent = message;
    };
    const followFragment = (requested = view.location.hash, scroll = true) => {
      if (disposed || !host.isConnected || !requested) return false;
      const hash = requested;
      if (!/^#[a-z][a-z0-9-]*$/.test(hash)) {
        fragmentFeedback("This Page supports only literal lowercase section fragments.");
        return false;
      }
      const targets = [...root.querySelectorAll("[id]")].filter((n) => n.id === hash.slice(1));
      const target = targets[0];
      const wrapper = target?.parentElement;
      const atPageRoot = target?.parentNode === root || wrapper?.parentNode === root && wrapper.classList.contains("uip-layout-item") && !!wrapper.dataset.uipNode && !wrapper.hasAttribute("data-uip-component") && wrapper.children.length === 1;
      if (targets.length !== 1 || target.tagName !== "SECTION" || !atPageRoot || !target.dataset.uipNode || target.hasAttribute("data-uip-component") || !target.getClientRects().length || view.getComputedStyle(target).visibility === "hidden" || target.closest("[hidden],[inert]")) {
        fragmentFeedback(`Cannot navigate to ${hash}: the section is missing, ambiguous, unsupported or hidden.`);
        return false;
      }
      if (!scroll) return true;
      root.querySelector("[data-uip-anchor-feedback]")?.remove();
      releaseFragmentFocus?.();
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
        const release = () => {
          target.removeEventListener("blur", release);
          if (target.getAttribute("tabindex") === "-1") target.removeAttribute("tabindex");
          if (releaseFragmentFocus === release) releaseFragmentFocus = void 0;
        };
        releaseFragmentFocus = release;
        target.addEventListener("blur", release, { once: true });
      }
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: "start" });
      return true;
    };
    const scheduleFragment = () => {
      view.cancelAnimationFrame(fragmentFrame);
      fragmentFrame = view.requestAnimationFrame(() => followFragment());
    };
    const fragmentClick = (event) => {
      const mouse = event;
      if (event.defaultPrevented || mouse.button !== 0 || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey) return;
      const link = event.composedPath().find((n) => n instanceof HTMLAnchorElement);
      if (!link || link.getRootNode() !== root || link.target || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (href?.startsWith("/") && !href.startsWith("//") && options.pageRoutes && options.navigate) {
        event.preventDefault();
        if (options.pageRoutes.filter((route) => route === href).length !== 1) {
          fragmentFeedback(`Cannot navigate to missing or ambiguous Page ${href}.`);
          return;
        }
        options.navigate(href);
        return;
      }
      if (!href?.startsWith("#")) return;
      event.preventDefault();
      if (!/^#[a-z][a-z0-9-]*$/.test(href)) {
        fragmentFeedback("Unsupported section fragment. Use a literal lowercase Anchor ID.");
        return;
      }
      if (!followFragment(href, false)) return;
      if (view.location.hash !== href) view.history.pushState(view.history.state, "", href);
      followFragment(href);
    };
    const fragmentsEnabled = m.kind === "page" && !m.shellId && options.pageFragmentNavigation === true;
    if (fragmentsEnabled) {
      root.addEventListener("click", fragmentClick);
      view.addEventListener("hashchange", scheduleFragment);
      view.addEventListener("popstate", scheduleFragment);
    }
    const registry = new ComponentRegistry();
    for (const pkg of options.packages) if (pkg.definition) registry.registerManifest({ components: [pkg.definition] }, { packageId: pkg.definition.ownership.package.packageId });
    const validateInputs = (next) => {
      const effective = {};
      for (const key of Object.keys(next)) if (m.kind !== "page" && !Object.hasOwn(m.public?.properties ?? {}, key)) throw new Error(`Unknown public property: ${key}.`);
      for (const [key, contract] of Object.entries(m.public?.properties ?? {})) {
        effective[key] = next[key] === void 0 ? structuredClone(contract.default) : next[key];
        const issues = valueErrors(effective[key], contract, key);
        if (issues.length) throw new Error(issues.join("\n"));
      }
      return m.kind !== "component" ? { ...effective, ...next } : effective;
    };
    inputs = validateInputs(options.inputs ?? {});
    for (const [name, source] of Object.entries(m.sources ?? {})) if (!Object.hasOwn(data, name)) data[name] = structuredClone(source.kind === "fixture" ? source.value : void 0);
    Object.assign(data, structuredClone(options.sources ?? {}));
    const scope = () => ({ ...data, public: inputs, local: state, fields: Object.fromEntries((m.form?.fields ?? []).filter((f) => options.fieldAuthorization?.[m.form.datasetId]?.[f.key]?.read !== false).map((f) => [f.datasetFieldId, state.values?.[f.key]])), context: options.context ?? {}, route: options.route ?? {} });
    const emit = (name, payload) => {
      const contract = m.public?.events[name];
      if (!contract) throw new Error(`Undeclared event: ${name}.`);
      const issues = Object.entries(contract.payload).flatMap(([key, field]) => valueErrors(payload[key], field, key));
      if (Object.keys(payload).some((key) => !Object.hasOwn(contract.payload, key))) issues.push("Event payload has undeclared fields.");
      if (issues.length) throw new Error(issues.join("\n"));
      host.dispatchEvent(new CustomEvent(name, { detail: structuredClone(payload), bubbles: true, composed: true }));
    };
    const repaint = () => {
      if (options.sharedScope) for (const render2 of options.sharedScope.subscribers) render2();
      else render();
    };
    const setState = (name, value) => {
      if (!Object.hasOwn(state, name)) throw new Error(`Unknown local state: ${name}.`);
      state[name] = value;
      repaint();
    };
    const actions = async (items, current, event) => {
      try {
        for (const item of items) {
          if (disposed) return;
          if (item.kind === "set") {
            if (!Object.hasOwn(state, item.state)) throw new Error(`Unknown local state: ${item.state}.`);
            state[item.state] = evaluatePresentation(item.value, current);
          } else if (item.kind === "emit") emit(item.event, Object.fromEntries(Object.entries(item.payload ?? {}).map(([key, value]) => [key, evaluatePresentation(value, current)])));
          else if (item.kind === "navigate") {
            if (!options.navigate) throw new Error("No navigation adapter.");
            options.navigate(String(evaluatePresentation(item.to, current)));
          } else if (item.kind === "service") {
            const service = options.services?.[item.reference];
            if (!service) throw new Error(`Service reference has no executable adapter: ${item.reference}.`);
            await service(item.input ? evaluatePresentation(item.input, current) : void 0);
          } else if (item.kind === "record-delete") {
            const service = options.services?.["dataset.deleteRecord"];
            if (!service) {
              state[item.resultState] = { success: false, committed: false, commitOutcome: "not-committed", code: "RECORD_DELETE_UNAVAILABLE" };
              repaint();
              return;
            }
            let recordId;
            try {
              recordId = evaluatePresentation(item.recordId, current);
            } catch {
              state[item.resultState] = { success: false, committed: false, commitOutcome: "not-committed", code: "RECORD_TARGET_EVALUATION_FAILED" };
              repaint();
              return;
            }
            try {
              const result = await service({ kind: item.kind, version: item.version, datasetId: item.datasetId, primaryFieldId: item.primaryFieldId, recordId });
              if (!disposed) state[item.resultState] = result;
            } catch (cause) {
              const rejected = cause && typeof cause === "object" && "commitOutcome" in cause && cause.commitOutcome === "not-committed";
              if (!disposed) state[item.resultState] = { success: false, committed: false, commitOutcome: rejected ? "not-committed" : "unknown", message: cause instanceof Error ? cause.message : String(cause) };
            }
          } else if (item.kind === "workflow") {
            if (item.resultState && !Object.hasOwn(state, item.resultState)) throw new Error("Unknown Workflow result state.");
            const service = options.services?.["workflow.run"];
            if (!service) {
              if (item.resultState) state[item.resultState] = { success: false, error: "WORKFLOW_UNAVAILABLE", commitOutcome: "not-committed" };
              else throw new Error("Workflow adapter is unavailable.");
            } else {
              let primaryRecordId;
              try {
                primaryRecordId = evaluatePresentation(item.primaryRecordId, current);
              } catch {
                if (item.resultState) state[item.resultState] = { success: false, error: "WORKFLOW_TARGET_INVALID", commitOutcome: "not-committed" };
                repaint();
                return;
              }
              try {
                const result = await service({ workflowId: item.workflowId, primaryRecordId });
                if (!disposed && item.resultState) state[item.resultState] = result;
              } catch (cause) {
                if (!item.resultState) throw cause;
                if (!disposed) state[item.resultState] = { success: false, error: cause instanceof Error ? cause.message : "WORKFLOW_OUTCOME_UNKNOWN", commitOutcome: cause instanceof Error && (cause.message === "WORKFLOW_REQUEST_DENIED" || cause.commitOutcome === "not-committed") ? "not-committed" : "unknown" };
              }
            }
          } else if (item.kind === "function") {
            const fn = artifact.functions?.[item.name];
            if (!fn) throw new Error(`Unknown custom function: ${item.name}.`);
            const context = { public: inputs, local: state, root, event, setState, emit };
            fn(context);
          }
        }
        repaint();
      } catch (error) {
        report(error);
      }
    };
    const template = document.createElement("template");
    template.innerHTML = artifact.source;
    const formRuntime = m.form ? attachFormRuntime(m, root, state, options, () => inputs, () => render(), emit) : void 0;
    for (const child of options.slots ?? []) host.append(child);
    const listeners = /* @__PURE__ */ new Set(["click", "dblclick", "input", "change", "submit", "reset", "keydown", "keyup", "keypress", "focusin", "focusout", "pointerdown", "pointerup", "pointermove", "mousedown", "mouseup", "mousemove", "touchstart", "touchend", "contextmenu", ...(m.events ?? []).map((e) => e.event), ...options.packages.flatMap((p) => [...Object.keys(p.definition?.runtime.events ?? {}), ...p.events ?? []])]);
    for (const name of listeners) root.addEventListener(name, (event) => event.stopPropagation());
    function render() {
      if (disposed) return;
      releaseFragmentFocus?.();
      formRuntime?.prepare();
      for (const [element, bindings] of boundEvents) for (const binding of bindings) element.removeEventListener(binding.name, binding.listener);
      boundEvents.clear();
      const used = /* @__PURE__ */ new Set();
      const process = (element, current, prefix, repeating = false) => {
        const id = element.getAttribute("data-uip-node") ?? "";
        const override = resolveMode(m, inputs.mode)[id];
        if (override && !m.form?.fields.some((f) => f.node === id)) {
          if (override.visible !== void 0) element.hidden = !override.visible;
          if (override.editable !== void 0) element.toggleAttribute("readonly", !override.editable);
          if (override.label !== void 0) element.setAttribute("label", override.label);
        }
        const repeat = !repeating && m.repeaters?.find((r) => r.node === id);
        if (repeat) {
          const collection = evaluatePresentation(repeat.collection, current) ?? [];
          if (!Array.isArray(collection)) throw new Error(`Repeater ${id} requires an array.`);
          return collection.flatMap((value, index) => process(element.cloneNode(true), { ...current, [repeat.item]: value, ...repeat.index ? { [repeat.index]: index } : {} }, `${prefix}/${id}:${index}`, true));
        }
        if (m.conditions?.some((condition) => {
          if (condition.node !== id) return false;
          try {
            return !evaluatePresentation(condition.when, current);
          } catch {
            state.presentationError = "A conditional field is unavailable until its dependencies are valid and readable.";
            return true;
          }
        })) return [];
        const settings = JSON.parse(element.getAttribute("data-uip-settings") ?? "{}");
        const packageDefinition = options.packages.find((pkg) => pkg.id === element.getAttribute("data-uip-component"))?.definition;
        if (packageDefinition) Object.assign(settings, readPackageSettings(packageDefinition, Object.fromEntries([...element.attributes].map((attr) => [attr.name, attr.value])), settings));
        const bindings = m.bindings?.filter((binding) => binding.node === id) ?? [];
        const publicInputs = { ...settings };
        for (const binding of bindings) {
          const value = evaluatePresentation(binding.value, current), [kind, name] = binding.target.split(":");
          if (kind === "setting") settings[name] = value;
          else if (kind === "property") {
            publicInputs[name] = value;
            element[name] = value;
          } else if (kind === "text") element.textContent = String(value ?? "");
          else if (kind === "attribute") {
            if (typeof value === "boolean") element.toggleAttribute(name, value);
            else if (value == null) element.removeAttribute(name);
            else element.setAttribute(name, String(value));
          } else if (kind === "style") element.style.setProperty(name, String(value ?? ""));
        }
        if (options.assetUrl) for (const name of ["src", "href", "poster"]) {
          const value = element.getAttribute(name)?.replace(/^(?:\.\.\/)+|^\.\//, "");
          if (value?.startsWith("assets/")) element.setAttribute(name, options.assetUrl(value));
        }
        const regionId = element.getAttribute("data-uip-region");
        if (regionId && Object.hasOwn(options.regions ?? {}, regionId)) {
          const key = `region/${regionId}`;
          used.add(key);
          let instance2 = nested.get(key);
          if (!instance2) {
            instance2 = mountVisualArtifact(options.regions[regionId], { ...options, inputs: options.regionInputs, regionInputs: void 0, regions: void 0, sharedScope: options.regionScope, regionScope: void 0 });
            nested.set(key, instance2);
          }
          element.replaceChildren(instance2.host);
        } else for (const child of [...element.children]) child.replaceWith(...process(child, current, prefix));
        if (element.localName === "uip-slot") {
          const slot = document.createElement("slot");
          slot.name = element.getAttribute("name") ?? "";
          if (element.hasAttribute("slot")) slot.slot = element.getAttribute("slot");
          slot.append(...element.childNodes);
          return [slot];
        }
        const componentId = element.getAttribute("data-uip-component");
        let output2 = element;
        if (componentId) {
          const component = options.components.find((c) => c.metadata.componentId === componentId);
          if (component) {
            const key = `${prefix}/${id}`;
            used.add(key);
            let instance2 = nested.get(key);
            if (!instance2) {
              instance2 = mountVisualArtifact(component, { ...options, inputs: publicInputs, slots: [...element.childNodes], sources: void 0, presentationCss: void 0, regions: void 0, sharedScope: void 0, regionScope: void 0 });
              nested.set(key, instance2);
            } else {
              instance2.update(publicInputs);
              instance2.host.replaceChildren(...element.childNodes);
            }
            output2 = instance2.host;
            if (element.hasAttribute("slot")) output2.slot = element.getAttribute("slot");
            output2.dataset.uipNode = id;
          } else {
            const pkg = options.packages.find((p) => p.id === componentId);
            if (!pkg) throw new Error(`Unresolved component: ${componentId}.`);
            if (!customElements.get(pkg.tagName)) throw new Error(`Package runtime is not registered: ${pkg.tagName}.`);
            if (pkg.definition) {
              const stored = JSON.parse(element.getAttribute("data-uip-settings") ?? "{}");
              for (const [key, contract] of Object.entries(pkg.definition.builder.settings)) if (contract.binding?.kind === "slot" && !Object.hasOwn(stored, key)) {
                const slot = contract.binding.name || "default";
                const authored = [...element.childNodes].some((child) => child.nodeType === Node.TEXT_NODE ? slot === "default" && Boolean(child.textContent?.trim()) : child instanceof Element && (child.getAttribute("slot") || "default") === slot);
                if (authored) settings[key] = "";
              }
              output2 = renderComponentInstance(pkg.definition, { componentId, settings }, { registry, document, preview: false });
              const ownedAttributes = new Set(Object.values(pkg.definition.builder.settings).filter((s) => s.binding?.kind === "attribute").map((s) => s.binding.name));
              for (const attr of element.attributes) if (!ownedAttributes.has(attr.name) && !["data-uip-settings", "data-uip-component"].includes(attr.name)) output2.setAttribute(attr.name, attr.value);
              output2.append(...element.childNodes);
            } else {
              for (const [key, value] of Object.entries(settings)) {
                if (typeof value === "boolean") output2.toggleAttribute(key, value);
                else if (typeof value === "object") output2[key] = value;
                else output2.setAttribute(key, String(value));
              }
            }
            for (const binding of bindings.filter((b) => b.target.startsWith("property:"))) output2[binding.target.slice(9)] = evaluatePresentation(binding.value, current);
          }
        }
        for (const binding of m.events?.filter((e) => e.node === id) ?? []) {
          const listener = (event) => {
            if (event.target !== output2 && componentId) return;
            void actions(binding.actions, { ...current, event: { detail: event.detail } }, event);
          };
          output2.addEventListener(binding.event, listener);
          boundEvents.set(output2, [...boundEvents.get(output2) ?? [], { name: binding.event, listener }]);
        }
        return [output2];
      };
      const fragment = template.content.cloneNode(true);
      for (const child of [...fragment.children]) child.replaceWith(...process(child, scope(), "root"));
      const style = document.createElement("style");
      const css = `:host{display:block}.uip-layout-item{box-sizing:border-box;min-width:0}img{max-width:100%;height:auto}
${options.presentationCss ?? ""}
${artifact.css}
${layoutCss(m.layout)}`;
      style.textContent = options.assetUrl ? css.replace(/url\(\s*(['"]?)((?:\.\.\/|\.\/)*assets\/[^)'"\s]+)\1\s*\)/g, (_, _quote, relative) => `url("${options.assetUrl(relative.replace(/^(?:\.\.\/)+|^\.\//, ""))}")`) : css;
      root.replaceChildren(style, fragment);
      if (fragmentsEnabled) scheduleFragment();
      formRuntime?.paint();
      for (const [key, instance2] of nested) if (!used.has(key)) {
        instance2.destroy();
        nested.delete(key);
      }
    }
    render();
    options.sharedScope?.subscribers.add(render);
    const initialize = !options.sharedScope?.initialized;
    if (options.sharedScope) options.sharedScope.initialized = true;
    for (const [name, source] of Object.entries(m.sources ?? {})) if (initialize && source.kind === "service" && !Object.hasOwn(options.sources ?? {}, name)) {
      const service = options.services?.[source.reference ?? ""];
      if (service) void Promise.resolve(service(void 0)).then((value) => {
        if (!disposed) {
          data[name] = value;
          repaint();
        }
      }).catch(report);
    }
    if (initialize && m.onLoad?.length) void actions(m.onLoad, scope());
    return { host, root, state, update(next) {
      inputs = validateInputs(next);
      render();
    }, destroy() {
      disposed = true;
      releaseFragmentFocus?.();
      view.cancelAnimationFrame(fragmentFrame);
      root.removeEventListener("click", fragmentClick);
      view.removeEventListener("hashchange", scheduleFragment);
      view.removeEventListener("popstate", scheduleFragment);
      options.sharedScope?.subscribers.delete(render);
      formRuntime?.destroy();
      nested.forEach((instance2) => instance2.destroy());
      nested.clear();
      for (const [element, bindings] of boundEvents) for (const binding of bindings) element.removeEventListener(binding.name, binding.listener);
      boundEvents.clear();
      host.remove();
    } };
  }
  function createVisualPage(artifact, options) {
    if (artifact.metadata.kind !== "page") throw new Error("Only Pages register routes.");
    const tag = `uip-page-${artifact.metadata.artifactId.toLowerCase().replaceAll("_", "-")}`;
    pageDefinitions.set(tag, { artifact, options });
    if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {
      instance;
      connectedCallback() {
        const current = pageDefinitions.get(tag), graph = managedVisualComposition(current.artifact);
        this.instance = graph && pageAdmissionKind(current.artifact.metadata) === "composed" ? mountComposedPage(graph.definition, current.artifact, { ...current.options, routeId: current.artifact.metadata.routeId, assetUrl: graph.assetUrl }) : mountVisualArtifact(current.artifact, current.options);
        this.replaceChildren(this.instance.host);
      }
      disconnectedCallback() {
        this.instance?.destroy();
      }
    });
    return { render(context = {}) {
      pageDefinitions.set(tag, { artifact, options: { ...options, pageRoutes: context.pageRoutes, pageFragmentNavigation: context.pageFragmentNavigation === true, navigate: context.navigate ?? options.navigate, context: context.settings ?? options.context, route: { path: context.route, ...options.route, ...context.params } } });
      return `<${tag}></${tag}>`;
    } };
  }
  var styles2, pageDefinitions;
  var init_runtime = __esm({
    "packages/visual-artifacts/src/runtime.ts"() {
      init_native();
      init_composition_runtime();
      init_revision_guard();
      init_unused();
      init_expression();
      init_form();
      init_page_admission();
      init_form_runtime();
      init_model();
      init_validation();
      styles2 = /* @__PURE__ */ new Set(["width", "height", "margin", "padding", "display", "gridTemplateColumns", "gridColumn", "gap", "alignItems", "justifyContent", "flexDirection", "flex"]);
      pageDefinitions = /* @__PURE__ */ new Map();
    }
  });

  // src/client/visual-artifacts/preview.ts
  init_page_links();
  init_unused();
  init_unused();
  var output = document.querySelector("#preview");
  var events = document.querySelector("#events");
  var instance;
  var sequence = 0;
  function previewUrl(data) {
    return "/visual-preview.html?" + new URLSearchParams({ app: data.appKey, locator: data.locator, revision: data.hash, kind: data.kind, design: "1", page: data.page ?? "" });
  }
  function fromUrl() {
    const query = new URLSearchParams(location.search);
    if (query.get("design") !== "1" || query.get("kind") !== "page" || !query.get("app") || !query.get("locator") || !/^[a-f0-9]{64}$/.test(query.get("revision") ?? "")) return;
    return { type: "uip-preview", design: true, appKey: query.get("app"), locator: query.get("locator"), hash: query.get("revision"), kind: "page", page: query.get("page") ?? void 0 };
  }
  async function fetchPages(appKey) {
    const response = await fetch(`/api/apps/${encodeURIComponent(appKey)}/visual-pages`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Saved Pages unavailable.");
    return result;
  }
  async function go(to, data) {
    const generation = sequence;
    try {
      const targets = (await fetchPages(data.appKey)).filter((page) => page.metadata?.route === to);
      if (generation !== sequence) return;
      if (!isPlainPageRoute(to) || targets.length !== 1 || targets[0].metadata?.shellId || targets[0].diagnostics.some((d) => d.severity === "error")) throw new Error("Saved Page destination is missing, ambiguous or unsupported.");
      history.replaceState({ ...history.state, pageScroll: window.scrollY }, "");
      await show({ ...data, locator: targets[0].locator, hash: targets[0].hash, page: to }, "push");
    } catch (error) {
      events.textContent = String(error);
    }
  }
  async function show(data, mode = "initial") {
    const current = ++sequence;
    const { locator, kind, hash, appKey } = data;
    try {
      const collection = kind === "page" ? "pages" : kind === "shell" ? "shells" : "components";
      const response = await fetch(`/api/apps/${encodeURIComponent(appKey)}/visual-${collection}?preview=1&locator=${encodeURIComponent(locator)}&hash=${encodeURIComponent(hash)}`, { cache: "no-store" });
      const revision = await response.json();
      if (!response.ok) throw new Error(revision.error ?? "Preview revision unavailable.");
      if (current !== sequence) return;
      const { bundle, components, packages, composition, shells, code } = revision;
      const pages = data.design && kind === "page" && !bundle.metadata?.shellId ? await fetchPages(appKey) : [];
      if (current !== sequence) return;
      events.textContent = "";
      const runtime = async (item, _kind) => {
        if (data.design) return { metadata: item.metadata, source: item.files.source, css: item.files.css, functions: {} };
        const url = URL.createObjectURL(new Blob([code[item.hash]], { type: "text/javascript" }));
        try {
          return { metadata: item.metadata, source: item.files.source, css: item.files.css, functions: await import(
            /* @vite-ignore */
            url
          ) };
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      for (const pkg of packages) if (pkg.moduleUrl) await import(
        /* @vite-ignore */
        pkg.moduleUrl
      );
      const { mountVisualArtifact: mountVisualArtifact2, mountComposedPage: mountComposedPage2 } = await Promise.resolve().then(() => (init_runtime(), runtime_exports));
      const fixtures = JSON.parse(bundle.files.fixtures || "{}");
      const artifact = await runtime(bundle, bundle.metadata.kind === "page" ? "pages" : bundle.metadata.kind === "shell" ? "shells" : "components");
      const options = {
        pageRoutes: pages.filter((p) => isPlainPageRoute(p.metadata?.route) && !p.metadata?.shellId && !p.diagnostics.some((d) => d.severity === "error")).map((p) => p.metadata.route),
        pageFragmentNavigation: data.design === true,
        components: await Promise.all(components.filter((c) => c.metadata && !c.diagnostics.some((d) => d.severity === "error")).map((c) => runtime(c, "components"))),
        packages,
        inputs: { ...fixtures.public, ...data.publicInputs },
        sources: fixtures.sources,
        context: fixtures.context,
        route: fixtures.route,
        services: data.design ? {} : data.testId ? createApplicationDataServices(new ApplicationDataClient(createSessionApplicationDataTransport({ endpoint: `/api/apps/${encodeURIComponent(appKey)}/form-tests/${encodeURIComponent(data.testId)}` }))) : visualDatasetServices,
        navigate: (to) => {
          if (data.design && kind === "page" && !bundle.metadata?.shellId) void go(to, data);
          else events.textContent += `Navigation requested: ${to}
`;
        },
        onError: (error) => {
          events.textContent += `Runtime error: ${String(error)}
`;
        }
      };
      if (composition) composition.shells = await Promise.all((shells ?? []).map((shell) => runtime(shell, "shells")));
      if (current !== sequence) return;
      const page = artifact.metadata.kind === "shell" ? { metadata: { schemaVersion: 1, artifactId: "art_shell_preview", kind: "page", name: "shell-preview", displayName: "Shell Preview", route: "/", shellId: artifact.metadata.artifactId }, source: "", css: "" } : artifact;
      instance?.destroy();
      instance = composition && page.metadata.shellId ? mountComposedPage2(composition, page, { ...options, editor: true, routeId: page.metadata.routeId, assetUrl: (relative) => `/api/apps/${encodeURIComponent(appKey)}/composition-asset?path=${encodeURIComponent(relative)}` }) : mountVisualArtifact2(artifact, options);
      for (const name of Object.keys(artifact.metadata.public?.events ?? {})) instance.host.addEventListener(name, (event) => {
        events.textContent += `${name}: ${JSON.stringify(event.detail)}
`;
      });
      if (data.design && kind === "page" && !bundle.metadata?.shellId) {
        const next = previewUrl({ ...data, page: bundle.metadata.route });
        if (mode === "push") history.pushState({}, "", next);
        else if (mode === "initial") history.replaceState(history.state, "", next + location.hash);
      }
      output.replaceChildren(instance.host);
      mountedSearch = location.search;
      if (mode === "push") {
        window.scrollTo(0, 0);
        const focus = instance.root.querySelector("h1") ?? instance.root.querySelector("main,section");
        if (focus) {
          const temporary = !focus.hasAttribute("tabindex");
          if (temporary) {
            focus.tabIndex = -1;
            focus.addEventListener("blur", () => focus.removeAttribute("tabindex"), { once: true });
          }
          focus.focus({ preventScroll: true });
        }
      }
      if (mode === "pop" && !location.hash) requestAnimationFrame(() => window.scrollTo(0, Number(history.state?.pageScroll ?? 0)));
      if (data.design) parent.postMessage({ type: "uip-design-preview-state" }, location.origin);
    } catch (error) {
      if (current === sequence) {
        if (mode === "push") events.textContent = `Preview blocked: ${String(error)}`;
        else {
          instance?.destroy();
          instance = void 0;
          output.textContent = `Preview blocked: ${String(error)}`;
        }
        if (data.design) parent.postMessage({ type: "uip-design-preview-state", error: String(error) }, location.origin);
      }
    }
  }
  var mountedSearch = "";
  var initialized = false;
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== "uip-preview") return;
    if (initialized && fromUrl()) return;
    initialized = true;
    void show(event.data);
  });
  window.addEventListener("popstate", () => {
    const data = fromUrl();
    if (data && mountedSearch !== location.search) void show(data, "pop");
  });
  var initial = fromUrl();
  if (initial) {
    initialized = true;
    void show(initial);
  }
})();
