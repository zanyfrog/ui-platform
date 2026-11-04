(() => {
  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/core/src/utils.js
  var idCounter = 0;
  var TRUE_VALUES = /* @__PURE__ */ new Set(["true", "1", "yes", "y", "on", "checked"]);
  var FALSE_VALUES = /* @__PURE__ */ new Set(["false", "0", "no", "n", "off", "unchecked"]);
  var NULL_VALUES = /* @__PURE__ */ new Set(["", "null", "undefined", "na", "n/a", "none"]);
  function createId(prefix = "mt") {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  }
  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function parseBoolean(value, defaultValue = false) {
    if (value === true || value === false) return value;
    if (value === null || value === void 0) return defaultValue;
    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    return defaultValue;
  }
  function parseNullableBoolean(value) {
    if (value === true || value === false || value === null) return value;
    if (value === void 0) return null;
    const normalized = String(value).trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) return true;
    if (FALSE_VALUES.has(normalized)) return false;
    if (NULL_VALUES.has(normalized)) return null;
    return null;
  }
  function normalizeNullableBoolean(value, required = false) {
    const parsed = parseNullableBoolean(value);
    return required && parsed === null ? false : parsed;
  }
  function nullableBooleanToAttribute(value) {
    if (value === true) return "true";
    if (value === false) return "false";
    return "null";
  }
  function booleanToAttribute(value) {
    return parseBoolean(value) ? "true" : "false";
  }
  function splitCommaList(value) {
    return String(value ?? "").split(",").map((item2) => item2.trim()).filter(Boolean);
  }
  function getDirectTextContent(element) {
    if (!element) return "";
    return Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent.trim()).filter(Boolean).join(" ");
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
  function ensureGlobalStyle(id, cssText) {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    document.head.append(style);
  }
  function readCssLengthPx(value, fallback = 768) {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    const numeric = Number.parseFloat(raw);
    if (!Number.isFinite(numeric)) return fallback;
    if (raw.endsWith("rem")) {
      const rootFontSize = typeof window === "undefined" ? 16 : Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      return numeric * rootFontSize;
    }
    if (raw.endsWith("em")) {
      const bodyFontSize = typeof window === "undefined" ? 16 : Number.parseFloat(window.getComputedStyle(document.body).fontSize) || 16;
      return numeric * bodyFontSize;
    }
    return numeric;
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/core/src/localization.js
  var defaultLocale = "en";
  var currentLocale = defaultLocale;
  var messageCatalog = /* @__PURE__ */ new Map([
    [defaultLocale, {
      "common.help": "Help",
      "common.close": "Close",
      "common.menu": "Menu",
      "common.openMenu": "Open menu",
      "common.closeMenu": "Close menu",
      "common.required": "Required",
      "common.invalid": "Invalid",
      "toggle.null": "N/A",
      "toggle.true": "\u2713",
      "toggle.false": "\u2715",
      "toggle.nullAria": "Not applicable",
      "toggle.trueAria": "Yes",
      "toggle.falseAria": "No",
      "checkbox.defaultLabel": "Checkbox",
      "form.submit": "Submit",
      "form.next": "Next",
      "form.previous": "Previous"
    }]
  ]);
  function getUiBaseMessage(key, fallback = "", locale = currentLocale) {
    const normalizedKey = String(key || "");
    const preferred = messageCatalog.get(locale) || {};
    const defaults = messageCatalog.get(defaultLocale) || {};
    return preferred[normalizedKey] ?? defaults[normalizedKey] ?? fallback;
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/core/src/validation.js
  var VALIDATION_STATES = Object.freeze({
    VALID: "valid",
    INVALID: "invalid",
    WARNING: "warning",
    INFO: "info"
  });
  function isEmpty(value) {
    return value === null || value === void 0 || String(value).length === 0;
  }
  function hasConstraint(value) {
    return value !== null && value !== void 0 && String(value) !== "";
  }
  function validateValue(value, constraints = {}) {
    const label = constraints.label || constraints.name || "Value";
    if (constraints.required && isEmpty(value)) {
      return {
        valid: false,
        state: VALIDATION_STATES.INVALID,
        message: constraints.error || `${label} is required.`
      };
    }
    if (!isEmpty(value) && hasConstraint(constraints.minlength)) {
      const minLength = Number(constraints.minlength);
      if (Number.isFinite(minLength) && String(value).length < minLength) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be at least ${minLength} characters.`
        };
      }
    }
    if (!isEmpty(value) && hasConstraint(constraints.maxlength)) {
      const maxLength = Number(constraints.maxlength);
      if (Number.isFinite(maxLength) && String(value).length > maxLength) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be no more than ${maxLength} characters.`
        };
      }
    }
    if (!isEmpty(value) && constraints.pattern) {
      try {
        const pattern = new RegExp(constraints.pattern);
        if (!pattern.test(String(value))) {
          return {
            valid: false,
            state: VALIDATION_STATES.INVALID,
            message: constraints.error || `${label} is not in the expected format.`
          };
        }
      } catch {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: `The validation pattern for ${label} is invalid.`
        };
      }
    }
    if (!isEmpty(value) && constraints.type === "email") {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(String(value))) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be a valid email address.`
        };
      }
    }
    if (!isEmpty(value) && constraints.type === "number") {
      const numberValue = Number(value);
      if (!Number.isFinite(numberValue)) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be a number.`
        };
      }
      if (hasConstraint(constraints.min) && numberValue < Number(constraints.min)) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be at least ${constraints.min}.`
        };
      }
      if (hasConstraint(constraints.max) && numberValue > Number(constraints.max)) {
        return {
          valid: false,
          state: VALIDATION_STATES.INVALID,
          message: constraints.error || `${label} must be no more than ${constraints.max}.`
        };
      }
    }
    return {
      valid: true,
      state: VALIDATION_STATES.VALID,
      message: ""
    };
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/core/src/metadata.js
  var MATURITY_LEVELS = Object.freeze({
    EXPERIMENTAL: "experimental",
    PREVIEW: "preview",
    STABLE: "stable",
    DEPRECATED: "deprecated",
    RETIRED: "retired"
  });
  function createComponentMetadata(metadata) {
    const shaped = {
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [],
      properties: [],
      events: [],
      slots: [],
      cssParts: [],
      cssVariables: [],
      examples: [],
      ...metadata
    };
    return {
      ...shaped,
      attributes: [.../* @__PURE__ */ new Set([...shaped.attributes || [], "css-class"])],
      properties: [.../* @__PURE__ */ new Set([...shaped.properties || [], "cssClass"])]
    };
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/core/src/base-element.js
  var UibBaseElement = class extends HTMLElement {
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/icons/src/icon-registry.js
  var icons = /* @__PURE__ */ new Map();
  function registerMtIcon(name, svg) {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) throw new Error("Icon name is required.");
    icons.set(normalized, String(svg || ""));
  }
  function getMtIcon(name) {
    return icons.get(String(name || "").trim().toLowerCase()) || "";
  }
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/icons/src/uib-icon.js
  var styles = `
:host{display:inline-flex;width:var(--uib-icon-size,1em);height:var(--uib-icon-size,1em);line-height:1;flex:0 0 auto}*,*::before,*::after{box-sizing:border-box}.uib-icon{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center}.uib-icon svg,.uib-icon img{width:100%;height:100%;display:block}.uib-icon img{object-fit:contain}
`;
  var UibIcon = class extends UibBaseElement {
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/layout/index.js
  var baseStyles = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.placeholder{padding:.75rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}
`;
  var UibLayoutBase = class extends UibBaseElement {
    connectedCallback() {
      this.render();
    }
  };
  var UibStack = class extends UibLayoutBase {
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
  var UibGrid = class extends UibLayoutBase {
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
  var UibRow = class extends UibLayoutBase {
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
  var UibColumn = class extends UibLayoutBase {
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
  var UibSurfaceBase = class extends UibLayoutBase {
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
  var UibPanel = class extends UibSurfaceBase {
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
      const restoreFocus = this.shadowRoot?.activeElement?.classList.contains("uib-panel__toggle") || this.contains(this.ownerDocument.activeElement);
      this.open = !oldValue;
      if (restoreFocus) this.shadowRoot?.querySelector(".uib-panel__toggle")?.focus();
      this.emitValueChange("uib-panel-toggle", oldValue, this.open);
    }
    render() {
      const headingId = this.heading ? `${this.componentId}-heading` : "";
      const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header") || this.hasNamedSlot("actions") || this.collapsible;
      const hasActions = this.hasNamedSlot("actions");
      const hasFooter = this.hasNamedSlot("footer");
      const open = this.open;
      const toggleButton = this.collapsible ? `<button class="uib-panel__toggle" part="toggle" type="button" aria-label="${escapeHtml(this.heading || this.label || "Panel")}" aria-controls="${this.componentId}-content" aria-expanded="${open ? "true" : "false"}" ${this.disabled ? "disabled" : ""}><span class="uib-panel__toggle-icon" aria-hidden="true">` + (open ? "-" : "+") + `</span></button>` : "";
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-panel .uib-surface__actions{margin-inline-start:auto;padding:0}.uib-panel__toggle{display:inline-grid;width:2rem;height:2rem;place-items:center;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer}.uib-panel__toggle:disabled{cursor:not-allowed}.uib-panel__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-panel__toggle-icon{font-size:1rem;font-weight:900;line-height:1}`) + `<section class="${this.surfaceClasses()}" part="base" ` + (headingId ? `aria-labelledby="${headingId}"` : "") + (this.disabled ? ' aria-disabled="true"' : "") + `>` + (hasHeader ? this.headerMarkup(headingId, true, `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>${toggleButton}`) : this.headerMarkup("", false)) + `<div id="${this.componentId}-content" class="uib-surface__collapsible" part="content"` + (open ? "" : " hidden") + `>` + (hasActions && !hasHeader ? `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>` : "") + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</div></section>`;
      this.shadowRoot.querySelector(".uib-panel__toggle")?.addEventListener("click", () => this.toggle());
    }
  };
  var UibCard = class extends UibSurfaceBase {
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
      for (const item2 of event?.composedPath?.() || []) {
        if (item2 === surface) return false;
        if (item2 instanceof HTMLElement && item2.matches(interactiveSelector)) return true;
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
  var UibDialog = class extends UibLayoutBase {
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
  var UibAccordion = class extends UibLayoutBase {
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
  var UibTab = class extends UibLayoutBase {
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
  var UibTabPanel = class extends UibLayoutBase {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "selected"];
    }
    render() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff)}:host([hidden]){display:none!important} </style><slot></slot>`;
    }
  };
  var UibTabs = class extends UibLayoutBase {
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
  var UibSplitter = class extends UibLayoutBase {
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/actions/uib-action-button.js
  var FALSE_VALUES2 = /* @__PURE__ */ new Set(["false", "0", "no", "off"]);
  var styles2 = `
:host{display:inline-flex;font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.button{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;min-height:var(--uib-action-min-height,2.9rem);padding:var(--uib-action-padding,.78rem 1.08rem);border:1px solid var(--uib-action-border,rgba(19,41,75,.18));border-radius:var(--uib-action-radius,999px);background:var(--uib-action-bg,#fff);color:var(--uib-action-color,var(--uib-color-ink,#13294b));box-shadow:var(--uib-action-shadow,0 12px 24px rgba(10,31,68,.1));cursor:pointer;font:inherit;font-weight:var(--uib-action-font-weight,900);line-height:1.1;text-decoration:none;transition:transform 140ms ease,box-shadow 140ms ease,background-color 140ms ease,border-color 140ms ease,color 140ms ease}.button:hover:not([aria-disabled="true"]){transform:translateY(-1px);box-shadow:var(--uib-action-shadow-hover,0 16px 30px rgba(10,31,68,.14))}.button:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25)),var(--uib-action-shadow,0 12px 24px rgba(10,31,68,.1))}.button[aria-disabled="true"]{cursor:not-allowed;opacity:.55;transform:none}.button--primary{--uib-action-bg:var(--uib-color-primary,#174a8b);--uib-action-color:var(--uib-color-primary-contrast,#fff);--uib-action-border:var(--uib-color-primary,#174a8b)}.button--secondary{--uib-action-bg:var(--uib-color-surface,#fff);--uib-action-color:var(--uib-color-ink,#13294b);--uib-action-border:var(--uib-color-border-strong,#aab8cc)}.button--tertiary{--uib-action-bg:transparent;--uib-action-shadow:none;--uib-action-border:transparent;--uib-action-color:var(--uib-color-primary,#174a8b)}.button--destructive{--uib-action-bg:var(--uib-color-danger,#b4232a);--uib-action-color:#fff;--uib-action-border:var(--uib-color-danger,#b4232a)}.icon{display:inline-grid;place-items:center;min-width:1em}.label{overflow-wrap:anywhere}
`;
  function boolAttribute(element, name, fallback = false) {
    if (!element.hasAttribute(name)) return fallback;
    const value = element.getAttribute(name);
    if (value === "") return true;
    return !FALSE_VALUES2.has(String(value).trim().toLowerCase());
  }
  function safeHref(value) {
    const href = String(value ?? "").trim();
    if (!href || /^javascript:/i.test(href)) return "";
    return href;
  }
  var UibActionButton = class extends HTMLElement {
    static get observedAttributes() {
      return ["label", "href", "action", "action-token", "variant", "kind", "disabled", "target", "rel", "icon"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get label() {
      return this.getAttribute("label") || "";
    }
    set label(value) {
      setOrRemoveAttribute(this, "label", value);
    }
    get href() {
      return this.getAttribute("href") || "";
    }
    set href(value) {
      setOrRemoveAttribute(this, "href", value);
    }
    get action() {
      return this.getAttribute("action") || this.getAttribute("action-token") || "";
    }
    set action(value) {
      setOrRemoveAttribute(this, "action", value);
    }
    get disabled() {
      return boolAttribute(this, "disabled", false);
    }
    set disabled(value) {
      this.toggleAttribute("disabled", Boolean(value));
    }
    emitClick(event) {
      if (this.disabled) {
        event.preventDefault();
        return;
      }
      const detail = { kind: this.getAttribute("kind") || "", variant: this.getAttribute("variant") || "secondary", label: this.label || this.textContent.trim(), href: safeHref(this.href), action: this.action, actionToken: this.action, disabled: this.disabled, hasHref: Boolean(safeHref(this.href)), originalEvent: event };
      const allowed = this.dispatchEvent(new CustomEvent("uib-action-button-click", { bubbles: true, composed: true, cancelable: true, detail }));
      this.dispatchEvent(new CustomEvent("uib-action", { bubbles: true, composed: true, detail }));
      if (this.disabled || !allowed) event.preventDefault();
    }
    render() {
      const label = this.label || this.textContent.trim() || "Action";
      const href = safeHref(this.href);
      const variant = this.getAttribute("variant") || "secondary";
      const icon = this.getAttribute("icon") || "";
      const target = this.getAttribute("target") || "";
      const rel = this.getAttribute("rel") || (target === "_blank" ? "noopener noreferrer" : "");
      const className = `button button--${escapeHtml(variant)}`;
      const disabled = this.disabled;
      const commonAttrs = `class="${className}" part="button" aria-disabled="${disabled ? "true" : "false"}"`;
      const contents = (icon ? `<span class="icon" aria-hidden="true">${escapeHtml(icon)}</span>` : "") + `<span class="label"><slot>` + escapeHtml(label) + `</slot></span>`;
      this.shadowRoot.innerHTML = `<style> ` + styles2 + ` </style> ` + (href ? `<a ${commonAttrs} href="${escapeHtml(href)}" ${target ? `target="${escapeHtml(target)}"` : ""} ${rel ? `rel="${escapeHtml(rel)}"` : ""}>
            ${contents}
          </a>` : `<button ${commonAttrs} type="button" ${disabled ? "disabled" : ""}>
            ${contents}
          </button>`) + ` `;
      this.shadowRoot.querySelector("a,button")?.addEventListener("click", (event) => this.emitClick(event));
    }
  };
  defineUiBaseElement("uib-action-button", UibActionButton);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/uib-forms-form.js
  var styles3 = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-forms-form{display:grid;gap:var(--uib-forms-form-gap,var(--uib-space-4,1rem))}.uib-forms-form__actions{display:flex;gap:.6rem;flex-wrap:wrap}.uib-forms-form__submit{font:inherit;cursor:pointer}.uib-forms-form__submit:focus-visible{outline:none}
`;
  var UibFormsForm = class extends UibBaseElement {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "submit-label", "novalidate"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    _collectValues() {
      const values = {};
      this.querySelectorAll("input, select, textarea, uib-forms-textbox, uib-forms-number, uib-forms-date, uib-forms-email, uib-forms-password, uib-forms-phone, uib-forms-textarea, uib-forms-rich-text, uib-forms-select, uib-forms-checkbox, uib-toggle, uib-checkbox").forEach((control) => {
        const name = control.getAttribute("name") || control.name;
        if (!name) return;
        if (control.localName === "uib-forms-checkbox") values[name] = control.checked ? control.value : "";
        else if ("value" in control) values[name] = control.value;
        else if (control.type === "checkbox") values[name] = control.checked;
        else values[name] = control.value;
      });
      return values;
    }
    _checkValidity() {
      const controls = Array.from(this.querySelectorAll("uib-forms-textbox, uib-forms-number, uib-forms-date, uib-forms-email, uib-forms-password, uib-forms-phone, uib-forms-textarea, uib-forms-rich-text, uib-forms-select, uib-forms-checkbox"));
      return controls.every((control) => typeof control.checkValidity !== "function" || control.checkValidity());
    }
    _submit(event) {
      event.preventDefault();
      this._emitSubmit();
    }
    _emitSubmit() {
      this.querySelectorAll("uib-forms-textbox, uib-forms-email, uib-forms-phone").forEach((control) => {
        if (typeof control.saveRecentValue === "function") control.saveRecentValue();
      });
      const valid = this.hasAttribute("novalidate") ? true : this._checkValidity();
      const values = this._collectValues();
      this.emitMtEvent("uib-forms-form-submit", { name: this.name, oldValue: null, newValue: values, values, valid });
    }
    _requestSubmit(event) {
      event.preventDefault();
      event.stopPropagation();
      this._emitSubmit();
    }
    render() {
      const label = this.label || "Form";
      const submitLabel = this.getAttribute("submit-label") || "Submit";
      this.shadowRoot.innerHTML = `<style> ` + styles3 + ` </style><form class="uib-forms-form" part="form" aria-label="` + escapeHtml(label) + `"><slot></slot><div class="uib-forms-form__actions" part="actions"><slot name="actions"><uib-action-button class="uib-forms-form__submit" part="submit" label="` + escapeHtml(submitLabel) + `" variant="primary" action="submit" action-token="submit" ></uib-action-button></slot></div></form>`;
      this.shadowRoot.querySelector("form")?.addEventListener("submit", (event) => this._submit(event));
      this.shadowRoot.querySelector("uib-action-button")?.addEventListener("click", (event) => this._requestSubmit(event));
    }
  };
  defineUiBaseElement("uib-forms-form", UibFormsForm);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/help/uib-help.js
  var styles4 = `
:host{display:inline-flex;color:var(--uib-help-color,var(--uib-color-primary,#174a8b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);line-height:1.35}*,*::before,*::after{box-sizing:border-box}.uib-help{position:relative;display:inline-flex;align-items:center}.uib-help__button{display:inline-flex;align-items:center;justify-content:center;width:1.35rem;height:1.35rem;min-width:1.35rem;border:1px solid var(--uib-help-border,var(--uib-color-border-strong,#aab8cc));border-radius:var(--uib-radius-pill,999px);background:var(--uib-help-background,var(--uib-color-surface,#fff));color:var(--uib-help-color,var(--uib-color-primary,#174a8b));cursor:help;padding:0}.uib-help__button:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-help__tooltip{position:absolute;z-index:var(--uib-z-index-tooltip,1200);inset-block-start:calc(100% + .45rem);inset-inline-start:50%;transform:translateX(-50%);width:max-content;max-width:min(22rem,calc(100vw - 2rem));padding:.65rem .75rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-ink,#13294b);color:var(--uib-color-primary-contrast,#fff);box-shadow:var(--uib-shadow-md,0 14px 40px rgba(10,31,68,.1));font-size:var(--uib-font-size-sm,.875rem);line-height:1.45}.uib-help__tooltip[hidden]{display:none}.uib-help--inline{display:inline-flex;max-width:100%;color:var(--uib-help-inline-color,var(--uib-color-muted,#53657f));font-size:var(--uib-font-size-sm,.875rem)}.uib-help__inline{display:inline-flex;gap:.35rem;align-items:flex-start;line-height:1.45}.uib-help__inline uib-icon{margin-top:.1rem}@media(max-width:420px){.uib-help__tooltip{inset-inline-start:auto;inset-inline-end:0;transform:none;max-width:calc(100vw - 2rem)}}
`;
  var UibHelp = class extends UibBaseElement {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "text", "mode", "open", "label"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._boundEscape = (event) => {
        if (event.key === "Escape") this.open = false;
      };
    }
    connectedCallback() {
      this.render();
      document.addEventListener("keydown", this._boundEscape);
    }
    disconnectedCallback() {
      document.removeEventListener("keydown", this._boundEscape);
    }
    get text() {
      return this.getAttribute("text") || this.getAttribute("help") || this.textContent.trim() || "";
    }
    set text(value) {
      if (value === null || value === void 0) this.removeAttribute("text");
      else this.setAttribute("text", String(value));
    }
    get mode() {
      const mode = (this.getAttribute("mode") || this.getAttribute("help-mode") || "tooltip").toLowerCase();
      return mode === "inline" ? "inline" : "tooltip";
    }
    set mode(value) {
      if (value === null || value === void 0) this.removeAttribute("mode");
      else this.setAttribute("mode", String(value));
    }
    get open() {
      return this.hasAttribute("open");
    }
    set open(value) {
      this.toggleAttribute("open", Boolean(value));
    }
    _show() {
      if (this.mode !== "tooltip") return;
      this.open = true;
    }
    _hide() {
      if (this.mode !== "tooltip") return;
      this.open = false;
    }
    render() {
      const text = this.text || "Help text is not available.";
      const label = this.ariaLabel || this.label || "Help";
      const tooltipId = `${this.componentId}-tooltip`;
      if (this.mode === "inline") {
        this.shadowRoot.innerHTML = `<style> ` + styles4 + ` </style><span class="uib-help uib-help--inline" part="base"><span class="uib-help__inline" part="inline"><uib-icon name="info" decorative></uib-icon><span part="text"><slot>` + escapeHtml(text) + `</slot></span></span></span>`;
        return;
      }
      this.shadowRoot.innerHTML = `<style> ` + styles4 + ` </style><span class="uib-help" part="base"><button class="uib-help__button" part="button" type="button" aria-label="` + escapeHtml(label) + `" aria-describedby="` + tooltipId + `" aria-expanded="` + (this.open ? "true" : "false") + `" ><uib-icon name="help" decorative></uib-icon></button><span id="` + tooltipId + `" class="uib-help__tooltip" part="tooltip" role="tooltip" ` + (this.open ? "" : "hidden") + ` ><slot>` + escapeHtml(text) + `</slot></span></span>`;
      const button = this.shadowRoot.querySelector("button");
      button?.addEventListener("mouseenter", () => this._show());
      button?.addEventListener("mouseleave", () => this._hide());
      button?.addEventListener("focus", () => this._show());
      button?.addEventListener("blur", () => this._hide());
      button?.addEventListener("click", () => {
        this.open = !this.open;
      });
    }
  };
  defineUiBaseElement("uib-help", UibHelp);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/label/uib-label.js
  var globalStyles = `
uib-label{display:inline-flex;max-width:100%;font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--uib-color-ink,#13294b)}uib-label[hidden]{display:none}.uib-label{display:inline-flex;align-items:center;gap:.4rem;max-width:100%;font-weight:800;line-height:1.35}.uib-label__text{min-width:0;overflow-wrap:anywhere}.uib-label__required{color:var(--uib-color-danger,#b4232a);font-weight:900}.uib-label__accessible{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}uib-label[disabled]{opacity:.62}uib-label[invalid] .uib-label{color:var(--uib-color-danger,#b4232a)}
`;
  var UibLabel = class extends UibBaseElement {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "for", "text", "accessible-text"];
    }
    constructor() {
      super();
      this._initialContent = "";
      this._rendering = false;
    }
    connectedCallback() {
      ensureGlobalStyle("uib-label-global-styles", globalStyles);
      if (!this._initialContent) this._initialContent = this.innerHTML.trim();
      this.render();
    }
    attributeChangedCallback() {
      if (!this._rendering && this.isConnected) this.render();
    }
    get htmlFor() {
      return this.getAttribute("for") || "";
    }
    set htmlFor(value) {
      if (value === null || value === void 0) this.removeAttribute("for");
      else this.setAttribute("for", String(value));
    }
    get text() {
      return this.getAttribute("text") || "";
    }
    set text(value) {
      if (value === null || value === void 0) this.removeAttribute("text");
      else this.setAttribute("text", String(value));
    }
    get accessibleText() {
      return this.getAttribute("accessible-text") || "";
    }
    set accessibleText(value) {
      if (value === null || value === void 0) this.removeAttribute("accessible-text");
      else this.setAttribute("accessible-text", String(value));
    }
    render() {
      this._rendering = true;
      const visibleText = this.text ? escapeHtml(this.text) : this._initialContent || escapeHtml(this.label || this.name || "Label");
      const required = this.required ? '<span class="uib-label__required" aria-hidden="true">*</span>' : "";
      const accessible = this.accessibleText ? `<span class="uib-label__accessible">` + escapeHtml(this.accessibleText) + `</span>` : "";
      const help = this.help ? `<uib-help text="` + escapeHtml(this.help) + `" mode="` + escapeHtml(this.helpMode) + `"></uib-help>` : "";
      const content = `<span class="uib-label__text">` + visibleText + accessible + `</span>` + required + help;
      const title = this.titleText ? ` title="${escapeHtml(this.titleText)}"` : "";
      const label = this.htmlFor ? `<label class="uib-label" part="label" for="` + escapeHtml(this.htmlFor) + `"` + title + `>` + content + `</label>` : `<span class="uib-label" part="label"` + title + `>` + content + `</span>`;
      this.innerHTML = label;
      this._rendering = false;
    }
  };
  defineUiBaseElement("uib-label", UibLabel);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/recent-values.js
  var RECENT_VALUES_PREFIX = "uib:recent:";
  var DEFAULT_RECENT_VALUES_LIMIT = 5;
  var MAX_RECENT_VALUE_LENGTH = 100;
  function normalizeRecentValue(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  }
  function parseRecentValuesLimit(value) {
    if (value === null || value === void 0 || String(value).trim() === "") return DEFAULT_RECENT_VALUES_LIMIT;
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return DEFAULT_RECENT_VALUES_LIMIT;
    return parsed;
  }
  function recentValuesStorageKey(keyOrName) {
    const key = normalizeRecentValue(keyOrName);
    return key ? `${RECENT_VALUES_PREFIX}${key}` : "";
  }
  function safeLocalStorage() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const storage = window.localStorage;
      const testKey = `${RECENT_VALUES_PREFIX}test`;
      storage.setItem(testKey, "[]");
      storage.removeItem(testKey);
      return storage;
    } catch {
      return null;
    }
  }
  function loadRecentValues(storageKey) {
    const storage = safeLocalStorage();
    if (!storage || !storageKey) return [];
    try {
      const parsed = JSON.parse(storage.getItem(storageKey) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((value) => typeof value === "string").map((value) => normalizeRecentValue(value)).filter(Boolean).filter((value) => value.length <= MAX_RECENT_VALUE_LENGTH);
    } catch {
      return [];
    }
  }
  function saveRecentValue(storageKey, value, limit) {
    const storage = safeLocalStorage();
    const normalizedLimit = parseRecentValuesLimit(limit);
    const normalizedValue = normalizeRecentValue(value);
    if (!storage || !storageKey || normalizedLimit <= 0 || !normalizedValue || normalizedValue.length > MAX_RECENT_VALUE_LENGTH) return [];
    const current = loadRecentValues(storageKey);
    const compareValue = normalizedValue.toLocaleLowerCase();
    const next = [
      normalizedValue,
      ...current.filter((item2) => item2.toLocaleLowerCase() !== compareValue)
    ].slice(0, normalizedLimit);
    try {
      storage.setItem(storageKey, JSON.stringify(next));
    } catch {
      return [];
    }
    return next;
  }
  function listRecentValueGroups() {
    const storage = safeLocalStorage();
    if (!storage) return [];
    const groups = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(RECENT_VALUES_PREFIX)) continue;
      const values = loadRecentValues(key);
      if (!values.length) continue;
      groups.push({
        key,
        name: key.slice(RECENT_VALUES_PREFIX.length),
        label: key.slice(RECENT_VALUES_PREFIX.length),
        values
      });
    }
    return groups.sort((left, right) => left.key.localeCompare(right.key));
  }
  function removeRecentValue(storageKey, value) {
    const storage = safeLocalStorage();
    if (!storage || !storageKey) return [];
    const compareValue = normalizeRecentValue(value).toLocaleLowerCase();
    const next = loadRecentValues(storageKey).filter((item2) => item2.toLocaleLowerCase() !== compareValue);
    try {
      if (next.length) storage.setItem(storageKey, JSON.stringify(next));
      else storage.removeItem(storageKey);
    } catch {
      return [];
    }
    return next;
  }
  function clearRecentValues(storageKey) {
    const storage = safeLocalStorage();
    if (!storage || !storageKey) return;
    try {
      storage.removeItem(storageKey);
    } catch {
    }
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/form-control-base.js
  var formControlStyles = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-field{display:grid;gap:var(--uib-forms-field-gap,.35rem);max-width:100%}.uib-field__label{display:inline-flex;align-items:center;gap:.35rem;line-height:1.35}.uib-control{width:100%;font:inherit}.uib-control:focus-visible{outline:none}textarea.uib-control{resize:vertical}select.uib-control{cursor:pointer}
`;
  var UibFormControlBase = class extends UibBaseElement {
    static formAssociated = true;
    static inputType = "text";
    static controlKind = "input";
    static get observedAttributes() {
      return [
        ...UibBaseElement.commonAttributes,
        "value",
        "placeholder",
        "min",
        "max",
        "minlength",
        "maxlength",
        "pattern",
        "step",
        "options",
        "autocomplete",
        "recent-values",
        "recent-values-limit",
        "recent-values-key"
      ];
    }
    constructor() {
      super();
      this._value = "";
      this._initialized = false;
      this._reflecting = false;
      this._internals = null;
      this._submitForm = null;
      this._handleNativeSubmit = () => this.saveRecentValue();
      try {
        if (typeof this.attachInternals === "function") this._internals = this.attachInternals();
      } catch {
        this._internals = null;
      }
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      if (!this._initialized) this._value = this.getAttribute("value") || "";
      this._initialized = true;
      this._updateFormValue();
      this._bindSubmitForm();
      this.render();
    }
    disconnectedCallback() {
      this._unbindSubmitForm();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || this._reflecting) return;
      if (name === "value") this._value = newValue || "";
      if (this.isConnected) {
        this._updateFormValue();
        this.render();
      }
    }
    get value() {
      return this._value ?? "";
    }
    set value(value) {
      const oldValue = this.value;
      this._value = value === null || value === void 0 ? "" : String(value);
      this._reflecting = true;
      this.setAttribute("value", this._value);
      this._reflecting = false;
      this._updateFormValue();
      if (this.isConnected) this.render();
      if (oldValue !== this._value) this.emitValueChange(`${this.localName}-change`, oldValue, this._value);
    }
    get placeholder() {
      return this.getAttribute("placeholder") || "";
    }
    get recentValues() {
      return this.hasAttribute("recent-values");
    }
    set recentValues(value) {
      this.toggleAttribute("recent-values", Boolean(value));
    }
    get recentValuesLimit() {
      return parseRecentValuesLimit(this.getAttribute("recent-values-limit"));
    }
    set recentValuesLimit(value) {
      if (value === null || value === void 0 || String(value).trim() === "") this.removeAttribute("recent-values-limit");
      else this.setAttribute("recent-values-limit", String(value));
    }
    get recentValuesKey() {
      return this.getAttribute("recent-values-key") || "";
    }
    set recentValuesKey(value) {
      if (value === null || value === void 0 || String(value).trim() === "") this.removeAttribute("recent-values-key");
      else this.setAttribute("recent-values-key", String(value));
    }
    get recentValuesStorageKey() {
      return recentValuesStorageKey(this.recentValuesKey || this.name);
    }
    _supportsRecentValues() {
      return this.constructor.controlKind === "input" && ["text", "email", "tel", "url", "search"].includes(this.constructor.inputType);
    }
    _recentValuesEnabled() {
      return this.recentValues && this._supportsRecentValues() && this.recentValuesLimit > 0 && Boolean(this.recentValuesStorageKey);
    }
    _recentValues() {
      if (!this._recentValuesEnabled()) return [];
      return loadRecentValues(this.recentValuesStorageKey).slice(0, this.recentValuesLimit);
    }
    _recentValuesListId() {
      return `${this.componentId}-recent-values`;
    }
    _bindSubmitForm() {
      const form = this._internals?.form || this.closest?.("form") || null;
      if (form === this._submitForm) return;
      this._unbindSubmitForm();
      this._submitForm = form;
      this._submitForm?.addEventListener?.("submit", this._handleNativeSubmit, true);
    }
    _unbindSubmitForm() {
      this._submitForm?.removeEventListener?.("submit", this._handleNativeSubmit, true);
      this._submitForm = null;
    }
    saveRecentValue() {
      if (!this._recentValuesEnabled()) return [];
      const values = saveRecentValue(this.recentValuesStorageKey, this.value, this.recentValuesLimit);
      if (values.length) {
        this.emitMtEvent("uib-recent-values-save", {
          name: this.name,
          key: this.recentValuesStorageKey,
          value: values[0],
          values,
          limit: this.recentValuesLimit
        });
        if (this.isConnected) this.render();
      }
      return values;
    }
    _constraints() {
      return {
        name: this.name,
        label: this.label || this.name,
        required: this.required,
        minlength: this.getAttribute("minlength"),
        maxlength: this.getAttribute("maxlength"),
        pattern: this.getAttribute("pattern"),
        min: this.getAttribute("min"),
        max: this.getAttribute("max"),
        type: this.constructor.inputType,
        error: this.error
      };
    }
    _validation() {
      return validateValue(this.value, this._constraints());
    }
    _updateFormValue() {
      if (this._internals && typeof this._internals.setFormValue === "function") {
        this._internals.setFormValue(this.value);
      }
    }
    checkValidity() {
      const result = this._validation();
      this.invalid = !result.valid;
      if (!result.valid) this._emitCommonControlEvent("invalid", null, { validation: result });
      return result.valid;
    }
    _eventDetail(extra = {}) {
      return {
        name: this.name,
        value: this.value,
        ...extra
      };
    }
    _emitCommonControlEvent(type, sourceEvent = null, extra = {}) {
      const detail = this._eventDetail({
        sourceEvent,
        ...extra
      });
      this.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: sourceEvent?.cancelable ?? false,
        detail
      }));
    }
    _emitKeyboardEvent(type, event) {
      this.dispatchEvent(new KeyboardEvent(type, {
        key: event.key,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        isComposing: event.isComposing,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        composed: true,
        cancelable: event.cancelable
      }));
    }
    _bindCommonControlEvents(control) {
      if (!control) return;
      control.addEventListener("focus", (event) => this._emitCommonControlEvent("focus", event));
      control.addEventListener("blur", (event) => this._emitCommonControlEvent("blur", event));
      control.addEventListener("focusin", (event) => this._emitCommonControlEvent("focusin", event));
      control.addEventListener("focusout", (event) => this._emitCommonControlEvent("focusout", event));
      control.addEventListener("keydown", (event) => this._emitKeyboardEvent("keydown", event));
      control.addEventListener("keyup", (event) => this._emitKeyboardEvent("keyup", event));
      control.addEventListener("invalid", (event) => this._emitCommonControlEvent("invalid", event));
    }
    _handleInput(event) {
      const oldValue = this.value;
      this._value = event.currentTarget.value;
      this._updateFormValue();
      this.emitMtEvent("input", { name: this.name, oldValue, newValue: this.value });
    }
    _handleChange(event) {
      const oldValue = this.getAttribute("value") || "";
      const newValue = event.currentTarget.value;
      this._value = newValue;
      this._reflecting = true;
      this.setAttribute("value", newValue);
      this._reflecting = false;
      this._updateFormValue();
      this.checkValidity();
      this.emitValueChange(`${this.localName}-change`, oldValue, newValue);
    }
    _optionsMarkup() {
      const options = (this.getAttribute("options") || "").split(",").map((item2) => item2.trim()).filter(Boolean);
      return options.map((option) => `<option value="` + escapeHtml(option) + `" ` + (option === this.value ? "selected" : "") + `> ` + escapeHtml(option) + ` </option>`).join("");
    }
    _controlMarkup(inputId, describedBy) {
      const type = this.constructor.inputType;
      const controlParts = [
        "control",
        this.invalid ? "control-invalid" : "",
        this.disabled || this.readonly ? "control-disabled" : ""
      ].filter(Boolean).join(" ");
      const commonAttributes = `
      id="${inputId}"
      class="uib-control"
      part="${controlParts}"
      name="${escapeHtml(this.name)}"
      value="${escapeHtml(this.value)}"
      placeholder="${escapeHtml(this.placeholder)}"
      ${this.required ? "required" : ""}
      ${this.disabled ? "disabled" : ""}
      ${this.readonly ? "readonly" : ""}
      ${describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : ""}
      aria-invalid="${this.invalid ? "true" : "false"}"
    `;
      const limitAttributes = `
      ${this.getAttribute("min") ? `min="${escapeHtml(this.getAttribute("min"))}"` : ""}
      ${this.getAttribute("max") ? `max="${escapeHtml(this.getAttribute("max"))}"` : ""}
      ${this.getAttribute("minlength") ? `minlength="${escapeHtml(this.getAttribute("minlength"))}"` : ""}
      ${this.getAttribute("maxlength") ? `maxlength="${escapeHtml(this.getAttribute("maxlength"))}"` : ""}
      ${this.getAttribute("pattern") ? `pattern="${escapeHtml(this.getAttribute("pattern"))}"` : ""}
      ${this.getAttribute("step") ? `step="${escapeHtml(this.getAttribute("step"))}"` : ""}
      ${this.getAttribute("autocomplete") ? `autocomplete="${escapeHtml(this.getAttribute("autocomplete"))}"` : this._recentValuesEnabled() ? 'autocomplete="off"' : ""}
      ${this._recentValuesEnabled() ? `list="${escapeHtml(this._recentValuesListId())}"` : ""}
    `;
      if (this.constructor.controlKind === "textarea") {
        return `<textarea ` + commonAttributes + ` ` + limitAttributes + ` >` + escapeHtml(this.value) + `</textarea>`;
      }
      if (this.constructor.controlKind === "select") {
        return `<select id="` + inputId + `" class="uib-control" part="` + controlParts + `" name="` + escapeHtml(this.name) + `" ` + (this.required ? "required" : "") + ` ` + (this.disabled ? "disabled" : "") + ` ` + (describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : "") + ` aria-invalid="` + (this.invalid ? "true" : "false") + `" ><option value=""> Select... </option> ` + this._optionsMarkup() + ` <slot></slot></select>`;
      }
      const recentValues = this._recentValues();
      const datalist = recentValues.length ? `<datalist id="` + escapeHtml(this._recentValuesListId()) + `">` + recentValues.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("") + `</datalist>` : "";
      return `<input type="` + escapeHtml(type) + `" ` + commonAttributes + ` ` + limitAttributes + ` >` + datalist;
    }
    render() {
      const inputId = `${this.componentId}-control`;
      const helpId = this.help ? `${this.componentId}-help` : "";
      const validation = this._validation();
      const shouldShowError = this.invalid || !validation.valid;
      const errorText = this.error || validation.message;
      const errorId = shouldShowError && errorText ? `${this.componentId}-error` : "";
      const describedBy = this.describedBy(helpId, errorId);
      const label = this.label || this.name || this.constructor.defaultLabel || "Field";
      const tooltipHelp = this.help && this.helpMode !== "inline" ? `<span id="` + helpId + `" class="uib-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="tooltip"></uib-help></span>` : "";
      const help = this.help && this.helpMode === "inline" ? `<span id="` + helpId + `" class="uib-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="` + escapeHtml(this.helpMode || "tooltip") + `" ></uib-help></span>` : "";
      const error = errorId ? `<div id="` + errorId + `" class="uib-field__error" part="error"> ` + escapeHtml(errorText) + ` </div>` : "";
      this.shadowRoot.innerHTML = `<style> ` + formControlStyles + ` </style><div class="uib-field" part="field"><span class="uib-field__label" part="label"><slot name="label"><uib-label for="` + inputId + `" text="` + escapeHtml(label) + `"></uib-label></slot> ` + (this.required ? '<span class="uib-field__required" part="required" aria-hidden="true">*</span>' : "") + ` ` + tooltipHelp + ` </span> ` + this._controlMarkup(inputId, describedBy) + ` ` + help + ` ` + error + ` </div>`;
      const control = this.shadowRoot.querySelector(".uib-control");
      control?.addEventListener("input", (event) => this._handleInput(event));
      control?.addEventListener("change", (event) => this._handleChange(event));
      this._bindCommonControlEvents(control);
    }
  };
  function defineFormControl(tagName, controlClass) {
    defineUiBaseElement(tagName, controlClass);
    return controlClass;
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-textbox.js
  var UibFormsTextbox = class extends UibFormControlBase {
    static inputType = "text";
    static defaultLabel = "Text";
  };
  defineFormControl("uib-forms-textbox", UibFormsTextbox);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-number.js
  var UibFormsNumber = class extends UibFormControlBase {
    static inputType = "number";
    static defaultLabel = "Number";
  };
  defineFormControl("uib-forms-number", UibFormsNumber);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-date.js
  var UibFormsDate = class extends UibFormControlBase {
    static inputType = "date";
    static defaultLabel = "Date";
  };
  defineFormControl("uib-forms-date", UibFormsDate);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-email.js
  var UibFormsEmail = class extends UibFormControlBase {
    static inputType = "email";
    static defaultLabel = "Email";
  };
  defineFormControl("uib-forms-email", UibFormsEmail);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-password.js
  var eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5.5c4.2 0 7.3 3.1 9 6.5-1.7 3.4-4.8 6.5-9 6.5S4.7 15.4 3 12c1.7-3.4 4.8-6.5 9-6.5Zm0 2C9 7.5 6.6 9.4 5.3 12 6.6 14.6 9 16.5 12 16.5s5.4-1.9 6.7-4.5C17.4 9.4 15 7.5 12 7.5Zm0 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" fill="currentColor"/></svg>';
  var eyeOffIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4.4 3 16.6 16.6-1.4 1.4-3.1-3.1a8.4 8.4 0 0 1-4.5 1.1c-4.2 0-7.3-3.1-9-6.5a13.2 13.2 0 0 1 4-4.8L3 4.4 4.4 3Zm4 6.1A10.8 10.8 0 0 0 5.3 12c1.3 2.6 3.7 4.5 6.7 4.5 1.1 0 2.1-.3 3-.7l-1.8-1.8A3 3 0 0 1 10 10.8L8.4 9.1Zm3.6-4.1c4.2 0 7.3 3.1 9 6.5a12.6 12.6 0 0 1-2.7 3.8l-1.4-1.4c.7-.6 1.3-1.4 1.8-2.4C17.4 8.9 15 7 12 7c-.7 0-1.4.1-2 .3L8.4 5.7c1.1-.5 2.3-.7 3.6-.7Zm0 3.5a3 3 0 0 1 3 3l-3-3Z" fill="currentColor"/></svg>';
  var passwordStyles = `
.uib-forms-password-control{position:relative;display:block;width:100%}.uib-forms-password-control .uib-control{padding-inline-end:var(--uib-forms-password-control-padding-end,2.85rem)}.uib-forms-password-toggle{position:absolute;inset-block:0;inset-inline-end:.2rem;display:inline-flex;width:2.4rem;align-items:center;justify-content:center;border:0;background:transparent;color:var(--uib-color-muted,#53657f);cursor:pointer}.uib-forms-password-toggle:hover{color:var(--uib-color-ink,#13294b)}.uib-forms-password-toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25));border-radius:var(--uib-radius-sm,.5rem)}.uib-forms-password-toggle:disabled{cursor:not-allowed;opacity:.62}.uib-forms-password-toggle svg{width:1.15rem;height:1.15rem;display:block}
`;
  var UibFormsPassword = class extends UibFormControlBase {
    static inputType = "password";
    static defaultLabel = "Password";
    constructor() {
      super();
      this._revealed = false;
    }
    _controlMarkup(inputId, describedBy) {
      const type = this._revealed ? "text" : "password";
      const controlParts = [
        "control",
        this.invalid ? "control-invalid" : "",
        this.disabled || this.readonly ? "control-disabled" : ""
      ].filter(Boolean).join(" ");
      const common = `id="${inputId}" class="uib-control" part="${controlParts}" name="${escapeHtml(this.name)}" value="${escapeHtml(this.value)}" placeholder="${escapeHtml(this.placeholder)}" style="padding-inline-end:var(--uib-forms-password-control-padding-end,2.85rem)" ${this.required ? "required" : ""} ${this.disabled ? "disabled" : ""} ${this.readonly ? "readonly" : ""} ${describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : ""} aria-invalid="${this.invalid ? "true" : "false"}"`;
      const limits = `${this.getAttribute("min") ? ` min="${escapeHtml(this.getAttribute("min"))}"` : ""}${this.getAttribute("max") ? ` max="${escapeHtml(this.getAttribute("max"))}"` : ""}${this.getAttribute("minlength") ? ` minlength="${escapeHtml(this.getAttribute("minlength"))}"` : ""}${this.getAttribute("maxlength") ? ` maxlength="${escapeHtml(this.getAttribute("maxlength"))}"` : ""}${this.getAttribute("pattern") ? ` pattern="${escapeHtml(this.getAttribute("pattern"))}"` : ""}${this.getAttribute("step") ? ` step="${escapeHtml(this.getAttribute("step"))}"` : ""}${this.getAttribute("autocomplete") ? ` autocomplete="${escapeHtml(this.getAttribute("autocomplete"))}"` : ""}`;
      const label = this._revealed ? "Hide password" : "Show password";
      const icon = this._revealed ? eyeOffIcon : eyeIcon;
      return `<span class="uib-forms-password-control" part="control-wrap"><input type="` + type + `" ` + common + limits + `><button class="uib-forms-password-toggle" part="toggle" type="button" aria-label="` + label + `" title="` + label + `" aria-pressed="` + (this._revealed ? "true" : "false") + `" ` + (this.disabled ? "disabled" : "") + `>` + icon + `</button></span>`;
    }
    render() {
      super.render();
      this.shadowRoot.querySelector("style").append(passwordStyles);
      this.shadowRoot.querySelector(".uib-forms-password-toggle")?.addEventListener("click", () => {
        this._revealed = !this._revealed;
        this.render();
        this.shadowRoot.querySelector(".uib-forms-password-toggle")?.focus();
      });
    }
  };
  defineFormControl("uib-forms-password", UibFormsPassword);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-phone.js
  var UibFormsPhone = class extends UibFormControlBase {
    static inputType = "tel";
    static defaultLabel = "Phone";
  };
  defineFormControl("uib-forms-phone", UibFormsPhone);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-textarea.js
  var UibFormsTextarea = class extends UibFormControlBase {
    static inputType = "text";
    static controlKind = "textarea";
    static defaultLabel = "Text area";
  };
  defineFormControl("uib-forms-textarea", UibFormsTextarea);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/forms/uib-toggle.js
  var styles5 = `
:host{--uib-toggle-text:var(--uib-color-ink,#13294b);--uib-toggle-muted:var(--uib-color-muted,#53657f);--uib-toggle-background:var(--uib-color-surface,#fff);--uib-toggle-background-soft:var(--uib-color-surface-soft,#f8fbff);--uib-toggle-border:var(--uib-color-border,#d9e2f0);--uib-toggle-border-strong:var(--uib-color-border-strong,#aab8cc);--uib-toggle-null:var(--uib-color-ink-soft,#40516f);--uib-toggle-yes:var(--uib-color-success,#2e7d32);--uib-toggle-no:var(--uib-color-danger,#b4232a);--uib-toggle-focus:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25));--uib-toggle-segment-min-width:3.35rem;--uib-toggle-height:2.05rem;--uib-toggle-font-size:.875rem;display:block;color:var(--uib-toggle-text);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-field{display:flex;align-items:center;gap:var(--uib-space-2,.5rem);max-width:100%;min-width:0}.uib-field__label{display:inline-flex;align-items:center;gap:.35rem;min-width:0;color:var(--uib-toggle-text);font-weight:800;line-height:1.35;overflow-wrap:anywhere}.uib-field__required{color:var(--uib-color-danger,#b4232a);font-weight:900}.uib-field__control{display:inline-flex;align-items:center;min-width:0;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:.1rem}.uib-field__error{display:block;margin-top:.3rem;color:var(--uib-color-danger,#b4232a);font-size:var(--uib-font-size-sm,.875rem);line-height:1.35}.uib-toggle{display:inline-grid;grid-auto-flow:column;grid-auto-columns:minmax(var(--uib-toggle-segment-min-width),1fr);overflow:hidden;max-width:100%;border:1px solid var(--uib-toggle-border);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-toggle-background);box-shadow:var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08))}.uib-toggle__button{position:relative;min-width:var(--uib-toggle-segment-min-width);min-height:var(--uib-toggle-height);display:inline-flex;align-items:center;justify-content:center;margin:0;padding:.42rem .65rem;border:0;border-inline-start:1px solid var(--uib-toggle-border);border-radius:0;background:var(--uib-toggle-background);color:var(--uib-toggle-text);cursor:pointer;font:inherit;font-size:var(--uib-toggle-font-size);font-weight:850;line-height:1;white-space:nowrap;transition:background-color 140ms ease,color 140ms ease,border-color 140ms ease,box-shadow 140ms ease}.uib-toggle__button:first-child{border-inline-start:0}.uib-toggle__button:hover:not(:disabled){background:var(--uib-toggle-background-soft)}.uib-toggle__button:focus-visible{z-index:1;outline:none;box-shadow:inset var(--uib-toggle-focus)}.uib-toggle__button[aria-checked="true"]{z-index:1}.uib-toggle__button[data-value="null"][aria-checked="true"]{background:var(--uib-toggle-null);color:#fff}.uib-toggle__button[data-value="true"]{color:var(--uib-toggle-yes)}.uib-toggle__button[data-value="true"][aria-checked="true"]{background:var(--uib-toggle-yes);color:#fff}.uib-toggle__button[data-value="false"]{color:var(--uib-toggle-no)}.uib-toggle__button[data-value="false"][aria-checked="true"]{background:var(--uib-toggle-no);color:#fff}.uib-toggle__button:disabled{cursor:not-allowed;opacity:.58}:host([disabled]){cursor:not-allowed}.uib-toggle[aria-disabled="true"]{opacity:.72}.uib-toggle--required{grid-auto-columns:minmax(3.15rem,1fr)}:host([invalid]) .uib-toggle{border-color:var(--uib-color-danger,#b4232a)}@media(max-width:520px){.uib-field{align-items:flex-start;flex-wrap:wrap}.uib-field__label{flex:1 1 9rem}.uib-field__control{flex:0 1 auto}.uib-toggle{grid-auto-columns:minmax(2.8rem,1fr)}.uib-toggle__button{min-width:2.8rem;padding-inline:.48rem;font-size:.82rem}}@media(max-width:340px){.uib-field__control{width:100%}.uib-toggle{width:100%}}
`;
  function defaultLabels() {
    return [
      getUiBaseMessage("toggle.null", "N/A"),
      getUiBaseMessage("toggle.true", "\u2713"),
      getUiBaseMessage("toggle.false", "\u2715")
    ];
  }
  function valuesAreEqual(left, right) {
    return left === right;
  }
  var UibToggle = class extends UibBaseElement {
    static formAssociated = true;
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "value", "labels"];
    }
    constructor() {
      super();
      this._value = null;
      this._initialized = false;
      this._reflectingValue = false;
      this._internals = null;
      try {
        if (typeof this.attachInternals === "function") this._internals = this.attachInternals();
      } catch {
        this._internals = null;
      }
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      if (!this._initialized) this._initializeValueFromAttributes();
      this._updateFormValue();
      this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "value" && !this._reflectingValue) {
        this._setValue(newValue, { emit: false, reflect: false });
        return;
      }
      if (name === "required") {
        const normalized = normalizeNullableBoolean(this._value, this.required);
        if (!valuesAreEqual(this._value, normalized)) this._value = normalized;
        this._updateFormValue();
      }
      if (this.isConnected) this.render();
    }
    get labels() {
      return this.getAttribute("labels") || defaultLabels().join(",");
    }
    set labels(value) {
      if (value === null || value === void 0) this.removeAttribute("labels");
      else if (Array.isArray(value)) this.setAttribute("labels", value.join(","));
      else this.setAttribute("labels", String(value));
    }
    get value() {
      return normalizeNullableBoolean(this._value, this.required);
    }
    set value(value) {
      this._setValue(value, { emit: false, reflect: true });
    }
    formResetCallback() {
      this._initialized = false;
      this._initializeValueFromAttributes();
      this.render();
    }
    _initializeValueFromAttributes() {
      const defaultValue = this.required ? false : null;
      const value = this.hasAttribute("value") ? this.getAttribute("value") : defaultValue;
      this._setValue(value, { emit: false, reflect: false });
    }
    _setValue(value, options = {}) {
      const { emit = false, reflect = false } = options;
      const oldValue = this.value;
      const newValue = normalizeNullableBoolean(value, this.required);
      this._value = newValue;
      this._initialized = true;
      this._updateFormValue();
      if (reflect) this._reflectValue();
      if (this.isConnected) this.render();
      if (emit && !valuesAreEqual(oldValue, newValue)) this.emitValueChange("uib-toggle-change", oldValue, newValue);
    }
    _reflectValue() {
      this._reflectingValue = true;
      if (this._value === null) this.removeAttribute("value");
      else this.setAttribute("value", nullableBooleanToAttribute(this._value));
      this._reflectingValue = false;
    }
    _updateFormValue() {
      if (!this._internals || typeof this._internals.setFormValue !== "function") return;
      const current = this.value;
      this._internals.setFormValue(current === null ? null : String(current));
    }
    _parsedLabels() {
      const defaults = defaultLabels();
      const parts = splitCommaList(this.getAttribute("labels") || "");
      if (parts.length >= 3) return { nullLabel: parts[0], trueLabel: parts[1], falseLabel: parts[2] };
      if (parts.length === 2) return { nullLabel: defaults[0], trueLabel: parts[0], falseLabel: parts[1] };
      if (parts.length === 1) return { nullLabel: defaults[0], trueLabel: parts[0], falseLabel: defaults[2] };
      return { nullLabel: defaults[0], trueLabel: defaults[1], falseLabel: defaults[2] };
    }
    _selectValue(value) {
      if (this.disabled || this.readonly) return;
      this._setValue(value, { emit: true, reflect: true });
    }
    _moveSelection(direction) {
      if (this.disabled || this.readonly) return;
      const optionValues = this.required ? [true, false] : [null, true, false];
      const currentIndex = Math.max(0, optionValues.findIndex((optionValue) => valuesAreEqual(optionValue, this.value)));
      const nextIndex = (currentIndex + direction + optionValues.length) % optionValues.length;
      this._selectValue(optionValues[nextIndex]);
      this.shadowRoot.querySelector(`[data-value="${nullableBooleanToAttribute(optionValues[nextIndex])}"]`)?.focus();
    }
    render() {
      const labels = this._parsedLabels();
      const options = this.required ? [
        { value: true, label: labels.trueLabel, aria: getUiBaseMessage("toggle.trueAria", "Yes") },
        { value: false, label: labels.falseLabel, aria: getUiBaseMessage("toggle.falseAria", "No") }
      ] : [
        { value: null, label: labels.nullLabel, aria: getUiBaseMessage("toggle.nullAria", "Not applicable") },
        { value: true, label: labels.trueLabel, aria: getUiBaseMessage("toggle.trueAria", "Yes") },
        { value: false, label: labels.falseLabel, aria: getUiBaseMessage("toggle.falseAria", "No") }
      ];
      const currentValue = this.value;
      const requiredClass = this.required ? " uib-toggle--required" : "";
      const labelId = `${this.componentId}-label`;
      const helpId = this.help ? `${this.componentId}-help` : "";
      const errorId = this.error || this.invalid ? `${this.componentId}-error` : "";
      const describedBy = this.describedBy(helpId, errorId);
      const groupLabel = this.ariaLabel || this.label || this.name || "Toggle";
      const labelMarkup = this.label || this.help ? `<span id="` + labelId + `" class="uib-field__label" part="label"><slot name="label">` + escapeHtml(this.label || groupLabel) + `</slot>` + (this.required ? '<span class="uib-field__required" aria-hidden="true">*</span>' : "") + (this.help ? `<uib-help id="${helpId}" text="${escapeHtml(this.help)}" mode="${escapeHtml(this.helpMode)}"></uib-help>` : "") + `</span>` : "";
      const buttons = options.map((option) => {
        const selected = valuesAreEqual(option.value, currentValue);
        const valueText = nullableBooleanToAttribute(option.value);
        const tabIndex = selected ? "0" : "-1";
        return `<button class="uib-toggle__button" part="button" type="button" role="radio" data-value="` + valueText + `" aria-label="` + escapeHtml(option.aria) + `" aria-checked="` + (selected ? "true" : "false") + `" tabindex="` + tabIndex + `" ` + (this.disabled ? "disabled" : "") + `>` + escapeHtml(option.label) + `</button>`;
      }).join("");
      const labelledBy = labelMarkup ? `aria-labelledby="${labelId}"` : `aria-label="${escapeHtml(groupLabel)}"`;
      const described = describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : "";
      const errorMarkup = errorId ? `<span id="` + errorId + `" class="uib-field__error" part="error">` + escapeHtml(this.error || `${groupLabel} is invalid.`) + `</span>` : "";
      this.shadowRoot.innerHTML = `<style> ` + styles5 + ` </style><div class="uib-field" part="field"> ` + labelMarkup + ` <span class="uib-field__control" part="control"><span class="uib-toggle` + requiredClass + `" part="segmented-control" role="radiogroup" ` + labelledBy + ` ` + described + ` aria-disabled="` + (this.disabled ? "true" : "false") + `" aria-readonly="` + (this.readonly ? "true" : "false") + `" aria-invalid="` + (this.invalid ? "true" : "false") + `" > ` + buttons + ` </span></span></div> ` + errorMarkup + ` `;
      this.shadowRoot.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => this._selectValue(parseNullableBoolean(button.dataset.value)));
      });
      this.shadowRoot.querySelector(".uib-toggle")?.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          this._moveSelection(1);
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          this._moveSelection(-1);
        } else if (event.key === "Home") {
          event.preventDefault();
          this._selectValue(this.required ? true : null);
          this.shadowRoot.querySelector("button")?.focus();
        } else if (event.key === "End") {
          event.preventDefault();
          this._selectValue(false);
          this.shadowRoot.querySelector('[data-value="false"]')?.focus();
        }
      });
    }
  };
  defineUiBaseElement("uib-toggle", UibToggle);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/forms/uib-checkbox.js
  var styles6 = `
:host{--uib-checkbox-text:var(--uib-color-ink,#13294b);--uib-checkbox-muted:var(--uib-color-muted,#53657f);--uib-checkbox-background:var(--uib-color-surface,#fff);--uib-checkbox-border:var(--uib-color-border-strong,#aab8cc);--uib-checkbox-border-strong:var(--uib-color-primary,#174a8b);--uib-checkbox-checked:var(--uib-color-success,#2e7d32);--uib-checkbox-focus:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25));display:block;color:var(--uib-checkbox-text);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-checkbox{display:inline-flex;align-items:flex-start;gap:.55rem;min-height:1.8rem;max-width:100%;cursor:pointer;line-height:1.45}.uib-checkbox__input{width:1.05rem;height:1.05rem;min-width:1.05rem;margin:.17rem 0 0;padding:0;border:1px solid var(--uib-checkbox-border);border-radius:.3rem;background:var(--uib-checkbox-background);accent-color:var(--uib-checkbox-checked);cursor:pointer}.uib-checkbox__input:focus-visible{outline:none;box-shadow:var(--uib-checkbox-focus)}.uib-checkbox__content{display:grid;gap:.12rem;min-width:0}.uib-checkbox__label-row{display:inline-flex;gap:.35rem;align-items:center;min-width:0}.uib-checkbox__label{font-weight:800;overflow-wrap:anywhere}.uib-checkbox__required{color:var(--uib-color-danger,#b4232a);font-weight:900}.uib-checkbox__hint{color:var(--uib-checkbox-muted);font-size:var(--uib-font-size-sm,.875rem)}.uib-checkbox__error{color:var(--uib-color-danger,#b4232a);font-size:var(--uib-font-size-sm,.875rem)}.uib-checkbox--disabled,.uib-checkbox--readonly{cursor:not-allowed;opacity:.62}.uib-checkbox--disabled .uib-checkbox__input,.uib-checkbox--readonly .uib-checkbox__input{cursor:not-allowed}:host([invalid]) .uib-checkbox__input{border-color:var(--uib-color-danger,#b4232a)}@media(max-width:420px){.uib-checkbox{width:100%}}
`;
  var UibCheckbox = class extends UibBaseElement {
    static formAssociated = true;
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "value", "checked", "hint"];
    }
    constructor() {
      super();
      this._value = false;
      this._initialized = false;
      this._reflecting = false;
      this._internals = null;
      try {
        if (typeof this.attachInternals === "function") this._internals = this.attachInternals();
      } catch {
        this._internals = null;
      }
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      if (!this._initialized) this._initializeValueFromAttributes();
      this._updateFormValue();
      this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue || this._reflecting) return;
      if (name === "value") {
        this._setValue(newValue, { emit: false, reflect: false });
        return;
      }
      if (name === "checked") {
        this._setValue(this.hasAttribute("checked"), { emit: false, reflect: false });
        return;
      }
      if (this.isConnected) this.render();
    }
    get value() {
      return this._value === true;
    }
    set value(value) {
      this._setValue(value, { emit: false, reflect: true });
    }
    get checked() {
      return this.value;
    }
    set checked(value) {
      this._setValue(value, { emit: false, reflect: true });
    }
    get hint() {
      return this.getAttribute("hint") || "";
    }
    set hint(value) {
      if (value === null || value === void 0) this.removeAttribute("hint");
      else this.setAttribute("hint", String(value));
    }
    formResetCallback() {
      this._initialized = false;
      this._initializeValueFromAttributes();
      this.render();
    }
    _initializeValueFromAttributes() {
      if (this.hasAttribute("value")) {
        this._setValue(this.getAttribute("value"), { emit: false, reflect: false });
        return;
      }
      this._setValue(this.hasAttribute("checked"), { emit: false, reflect: false });
    }
    _setValue(value, options = {}) {
      const { emit = false, reflect = false } = options;
      const oldValue = this.value;
      const newValue = parseBoolean(value, false);
      this._value = newValue;
      this._initialized = true;
      this._updateFormValue();
      if (reflect) this._reflectValue();
      if (this.isConnected) this.render();
      if (emit && oldValue !== newValue) this.emitValueChange("uib-checkbox-change", oldValue, newValue);
    }
    _reflectValue() {
      this._reflecting = true;
      this.setAttribute("value", booleanToAttribute(this._value));
      this.toggleAttribute("checked", this._value);
      this._reflecting = false;
    }
    _updateFormValue() {
      if (!this._internals || typeof this._internals.setFormValue !== "function") return;
      this._internals.setFormValue(String(this.value));
    }
    _handleInputChange(event) {
      if (this.disabled || this.readonly) return;
      this._setValue(event.currentTarget.checked, { emit: true, reflect: true });
    }
    render() {
      const labelText = this.label || this.getAttribute("aria-label") || getUiBaseMessage("checkbox.defaultLabel", "Checkbox");
      const labelMarkup = this.hasAttribute("label") || this.hasAttribute("aria-label") ? escapeHtml(labelText) : `<slot>` + escapeHtml(labelText) + `</slot>`;
      const helpId = this.help ? `${this.componentId}-help` : "";
      const errorId = this.error || this.invalid ? `${this.componentId}-error` : "";
      const describedBy = this.describedBy(helpId, errorId);
      const hintMarkup = this.hint ? `<span class="uib-checkbox__hint" part="hint">` + escapeHtml(this.hint) + `</span>` : "";
      const helpMarkup = this.help ? `<uib-help id="` + helpId + `" text="` + escapeHtml(this.help) + `" mode="` + escapeHtml(this.helpMode) + `"></uib-help>` : "";
      const errorMarkup = errorId ? `<span id="` + errorId + `" class="uib-checkbox__error" part="error">` + escapeHtml(this.error || `${labelText} is invalid.`) + `</span>` : "";
      const disabledClass = this.disabled ? " uib-checkbox--disabled" : "";
      const readonlyClass = this.readonly ? " uib-checkbox--readonly" : "";
      const described = describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : "";
      this.shadowRoot.innerHTML = `<style> ` + styles6 + ` </style><label class="uib-checkbox` + disabledClass + readonlyClass + `" part="field"><input class="uib-checkbox__input" part="input" type="checkbox" ` + (this.value ? "checked" : "") + ` ` + (this.disabled ? "disabled" : "") + ` ` + (this.required ? "required" : "") + ` ` + described + ` aria-invalid="` + (this.invalid ? "true" : "false") + `" /><span class="uib-checkbox__content" part="content"><span class="uib-checkbox__label-row"><span class="uib-checkbox__label" part="label"> ` + labelMarkup + ` </span> ` + (this.required ? '<span class="uib-checkbox__required" aria-hidden="true">*</span>' : "") + ` ` + helpMarkup + ` </span> ` + hintMarkup + ` ` + errorMarkup + ` </span></label>`;
      this.shadowRoot.querySelector("input")?.addEventListener("change", (event) => this._handleInputChange(event));
    }
  };
  defineUiBaseElement("uib-checkbox", UibCheckbox);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/navigation/uib-menuitem.js
  var styles7 = `
:host{display:inline-block;position:relative;color:var(--uib-menu-text,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}:host([hidden]){display:none}*,*::before,*::after{box-sizing:border-box}.uib-menuitem{position:relative}.uib-menuitem__link,.uib-menuitem__button{display:inline-flex;align-items:center;justify-content:space-between;gap:.35rem;min-height:2.35rem;padding:.55rem .75rem;border:1px solid transparent;border-radius:var(--uib-radius-pill,999px);background:transparent;color:inherit;font:inherit;font-weight:800;line-height:1.2;text-decoration:none;cursor:pointer;white-space:nowrap}.uib-menuitem__link:hover,.uib-menuitem__button:hover{background:var(--uib-color-surface-soft,#f8fbff);border-color:var(--uib-color-border,#d9e2f0)}.uib-menuitem__link:focus-visible,.uib-menuitem__button:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-menuitem__link[aria-current="page"],:host([active]) .uib-menuitem__link,:host([active]) .uib-menuitem__button{background:var(--uib-color-primary,#174a8b);border-color:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}.uib-menuitem__submenu{position:absolute;z-index:var(--uib-z-index-dropdown,1000);inset-block-start:calc(100% + .25rem);inset-inline-start:0;display:grid;gap:.2rem;min-width:13rem;padding:.45rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-md,0 14px 40px rgba(10,31,68,.1))}.uib-menuitem__submenu[hidden]{display:none}.uib-menuitem__chevron{transition:transform 140ms ease}:host([open]) .uib-menuitem__chevron{transform:rotate(180deg)}:host([disabled]){opacity:.58;pointer-events:none}.uib-menuitem__submenu ::slotted(uib-menuitem){display:block}:host([mobile]){display:block;width:100%}:host([mobile]) .uib-menuitem__link,:host([mobile]) .uib-menuitem__button{width:100%;border-radius:var(--uib-radius-md,.75rem);white-space:normal}:host([mobile]) .uib-menuitem__submenu{position:static;min-width:0;margin-inline-start:.75rem;margin-block:.2rem .4rem;box-shadow:none;background:var(--uib-color-surface-soft,#f8fbff)}
`;
  var UibMenuItem = class extends UibBaseElement {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "href", "target", "rel", "label", "active", "open", "mobile"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    get href() {
      return this.getAttribute("href") || "";
    }
    set href(value) {
      if (value === null || value === void 0) this.removeAttribute("href");
      else this.setAttribute("href", String(value));
    }
    get target() {
      return this.getAttribute("target") || "";
    }
    get rel() {
      return this.getAttribute("rel") || "";
    }
    get active() {
      return this.hasAttribute("active");
    }
    set active(value) {
      this.toggleAttribute("active", Boolean(value));
    }
    get open() {
      return this.hasAttribute("open");
    }
    set open(value) {
      this.toggleAttribute("open", Boolean(value));
    }
    get hasSubmenu() {
      return Array.from(this.children).some((child) => child.localName === "uib-menuitem");
    }
    _labelText() {
      return this.label || getDirectTextContent(this) || this.href || "Menu item";
    }
    _toggleOpen() {
      if (this.disabled) return;
      this.open = !this.open;
    }
    _close() {
      this.open = false;
    }
    _emitSelect(event) {
      if (this.disabled) {
        event.preventDefault();
        return;
      }
      const detail = {
        name: this.name,
        href: this.href,
        text: this._labelText(),
        oldValue: null,
        newValue: this.href || this._labelText()
      };
      this.emitMtEvent("uib-menuitem-select", detail);
      this.emitMtEvent("uib-menu-select", detail);
    }
    render() {
      const labelText = this._labelText();
      const submenu = this.hasSubmenu;
      const submenuId = `${this.componentId}-submenu`;
      const current = this.active ? ' aria-current="page"' : "";
      const disabled = this.disabled ? ' aria-disabled="true" tabindex="-1"' : "";
      if (submenu) {
        this.shadowRoot.innerHTML = `<style>` + styles7 + `</style><div class="uib-menuitem" part="item"><button class="uib-menuitem__button" part="button" type="button" aria-expanded="` + (this.open ? "true" : "false") + `" aria-controls="` + submenuId + `"` + disabled + `><span part="label">` + escapeHtml(labelText) + `</span><uib-icon class="uib-menuitem__chevron" name="chevron-down" decorative></uib-icon></button><div id="` + submenuId + `" class="uib-menuitem__submenu" part="submenu"` + (this.open ? "" : "hidden") + `><slot></slot></div></div>`;
        const button = this.shadowRoot.querySelector("button");
        button?.addEventListener("click", () => this._toggleOpen());
        this.shadowRoot.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            this._close();
            button?.focus();
          }
        });
        return;
      }
      if (this.href) {
        const target = this.target ? ` target="${escapeHtml(this.target)}"` : "";
        const rel = this.rel ? ` rel="${escapeHtml(this.rel)}"` : this.target === "_blank" ? ' rel="noopener noreferrer"' : "";
        this.shadowRoot.innerHTML = `<style>` + styles7 + `</style><div class="uib-menuitem" part="item"><a class="uib-menuitem__link" part="link" href="` + escapeHtml(this.href) + `"` + target + rel + current + disabled + `><slot>` + escapeHtml(labelText) + `</slot></a></div>`;
        this.shadowRoot.querySelector("a")?.addEventListener("click", (event) => this._emitSelect(event));
        return;
      }
      this.shadowRoot.innerHTML = `<style>` + styles7 + `</style><div class="uib-menuitem" part="item"><button class="uib-menuitem__button" part="button" type="button"` + disabled + `><slot>` + escapeHtml(labelText) + `</slot></button></div>`;
      this.shadowRoot.querySelector("button")?.addEventListener("click", (event) => this._emitSelect(event));
    }
  };
  defineUiBaseElement("uib-menuitem", UibMenuItem);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/navigation/uib-menu.js
  var styles8 = `
:host{--uib-menu-breakpoint:768px;display:block;color:var(--uib-menu-text,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-menu{display:flex;align-items:center;justify-content:space-between;gap:var(--uib-space-3,.75rem);max-width:100%}.uib-menu__toggle{display:none;align-items:center;justify-content:center;gap:.45rem;min-height:2.5rem;padding:.55rem .85rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:850;cursor:pointer}.uib-menu__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-menu__nav{min-width:0}.uib-menu__items{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:.2rem;min-width:0}.uib-menu__nav[hidden]{display:none}:host([data-mobile="true"]) .uib-menu{display:grid;justify-items:end}:host([data-mobile="true"]) .uib-menu__toggle{display:inline-flex}:host([data-mobile="true"]) .uib-menu__nav{width:min(100vw - 2rem,28rem);justify-self:stretch}:host([data-mobile="true"]) .uib-menu__items{display:grid;justify-content:stretch;gap:.25rem;width:100%;margin-top:.5rem;padding:.5rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-md,0 14px 40px rgba(10,31,68,.1))}:host([data-mobile="true"]) ::slotted(uib-menuitem){display:block;width:100%}
`;
  var UibMenu = class extends UibBaseElement {
    static get observedAttributes() {
      return [...UibBaseElement.commonAttributes, "label", "breakpoint", "open", "collapse-label", "close-label"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._mobile = false;
      this._media = null;
      this._boundMediaChange = () => this._syncResponsiveState();
      this._boundResize = () => this._configureMediaQuery();
    }
    connectedCallback() {
      this.render();
      this._configureMediaQuery();
      window.addEventListener("resize", this._boundResize);
      this.addEventListener("uib-menuitem-select", () => {
        if (this._mobile) this.open = false;
      });
    }
    disconnectedCallback() {
      this._media?.removeEventListener?.("change", this._boundMediaChange);
      window.removeEventListener("resize", this._boundResize);
    }
    get open() {
      return this.hasAttribute("open");
    }
    set open(value) {
      this.toggleAttribute("open", Boolean(value));
    }
    get breakpoint() {
      return this.getAttribute("breakpoint") || "";
    }
    set breakpoint(value) {
      if (value === null || value === void 0) this.removeAttribute("breakpoint");
      else this.setAttribute("breakpoint", String(value));
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "breakpoint" && this.isConnected) this._configureMediaQuery();
      if (this.isConnected) this.render();
    }
    _breakpointPx() {
      const attr = this.breakpoint;
      if (attr) return readCssLengthPx(attr, 768);
      const cssValue = window.getComputedStyle(this).getPropertyValue("--uib-menu-breakpoint");
      return readCssLengthPx(cssValue, 768);
    }
    _configureMediaQuery() {
      this._media?.removeEventListener?.("change", this._boundMediaChange);
      const px = Math.max(240, Math.round(this._breakpointPx()));
      this._media = window.matchMedia(`(max-width: ${px}px)`);
      this._media.addEventListener?.("change", this._boundMediaChange);
      this._syncResponsiveState();
    }
    _syncResponsiveState() {
      const mobile = Boolean(this._media?.matches);
      if (this._mobile !== mobile) {
        this._mobile = mobile;
        this.toggleAttribute("data-mobile", mobile);
        if (!mobile) this.open = true;
        if (mobile && !this.hasAttribute("open")) this.open = false;
        this._applyMobileToItems();
        this.render();
        return;
      }
      this._applyMobileToItems();
    }
    _applyMobileToItems() {
      this.querySelectorAll("uib-menuitem").forEach((item2) => item2.toggleAttribute("mobile", this._mobile));
    }
    _toggleOpen() {
      this.open = !this.open;
    }
    render() {
      const navId = `${this.componentId}-nav`;
      const label = this.ariaLabel || this.label || "Primary navigation";
      const collapseLabel = this.getAttribute("collapse-label") || getUiBaseMessage("common.openMenu", "Open menu");
      const closeLabel = this.getAttribute("close-label") || getUiBaseMessage("common.closeMenu", "Close menu");
      const isOpen = !this._mobile || this.open;
      const buttonLabel = isOpen ? closeLabel : collapseLabel;
      this.shadowRoot.innerHTML = `<style>` + styles8 + `</style><div class="uib-menu" part="base"><button class="uib-menu__toggle" part="toggle" type="button" aria-label="` + escapeHtml(buttonLabel) + `" aria-expanded="` + (isOpen ? "true" : "false") + `" aria-controls="` + navId + `"><uib-icon name="` + (isOpen ? "close" : "menu") + `" decorative></uib-icon><span>` + escapeHtml(getUiBaseMessage("common.menu", "Menu")) + `</span></button><nav id="` + navId + `" class="uib-menu__nav" part="nav" aria-label="` + escapeHtml(label) + `"` + (isOpen ? "" : "hidden") + `><div class="uib-menu__items" part="items"><slot></slot></div></nav></div>`;
      this.shadowRoot.querySelector(".uib-menu__toggle")?.addEventListener("click", () => this._toggleOpen());
      this.shadowRoot.querySelector("slot")?.addEventListener("slotchange", () => this._applyMobileToItems());
      this.shadowRoot.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && this._mobile && this.open) {
          this.open = false;
          this.shadowRoot.querySelector(".uib-menu__toggle")?.focus();
        }
      });
      this._applyMobileToItems();
    }
  };
  defineUiBaseElement("uib-menu", UibMenu);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/uib-eyebrow.js
  var styles9 = `
:host{display:inline-block;color:var(--uib-eyebrow-color,var(--uib-color-primary,#174a8b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);font-size:var(--uib-eyebrow-size,.8rem);font-weight:var(--uib-eyebrow-weight,900);letter-spacing:var(--uib-eyebrow-spacing,.08em);line-height:1.2;text-transform:uppercase}.eyebrow{margin:0}
`;
  var UibEyebrow = class extends HTMLElement {
    static get observedAttributes() {
      return ["text"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    render() {
      const text = this.getAttribute("text") || this.textContent.trim();
      this.shadowRoot.innerHTML = `<style> ` + styles9 + ` </style><p class="eyebrow" part="eyebrow"><slot> ` + escapeHtml(text) + ` </slot></p>`;
    }
  };
  defineUiBaseElement("uib-eyebrow", UibEyebrow);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/uib-heading.js
  var styles10 = `
:host{--uib-heading-level-size:4.7rem;--uib-heading-compact-level-size:2.7rem;--uib-heading-large-level-size:5.4rem;display:block;color:var(--uib-heading-color,var(--uib-heading-headline-color,var(--uib-color-ink,#13294b)));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);text-align:var(--uib-heading-align,start)}:host([level="2"]){--uib-heading-level-size:3.7rem;--uib-heading-compact-level-size:2.35rem;--uib-heading-large-level-size:4.55rem}:host([level="3"]){--uib-heading-level-size:3rem;--uib-heading-compact-level-size:2rem;--uib-heading-large-level-size:3.75rem}:host([level="4"]){--uib-heading-level-size:2.35rem;--uib-heading-compact-level-size:1.7rem;--uib-heading-large-level-size:3rem}:host([level="5"]){--uib-heading-level-size:1.85rem;--uib-heading-compact-level-size:1.45rem;--uib-heading-large-level-size:2.4rem}:host([level="6"]){--uib-heading-level-size:1.45rem;--uib-heading-compact-level-size:1.22rem;--uib-heading-large-level-size:1.9rem}.heading{margin:0;color:var(--uib-heading-color,var(--uib-heading-headline-color,currentColor));font-size:var(--uib-heading-size,var(--uib-heading-level-size));line-height:var(--uib-heading-line-height,.95);letter-spacing:var(--uib-heading-letter-spacing,0);font-weight:var(--uib-heading-weight,900)}:host([size="compact"]) .heading{font-size:var(--uib-heading-size,var(--uib-heading-compact-level-size))}:host([size="large"]) .heading{font-size:var(--uib-heading-size,var(--uib-heading-large-level-size))}:host([align="center"]){text-align:center}:host([align="end"]){text-align:end}
`;
  function safeLevel(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 6 ? parsed : 1;
  }
  var UibHeading = class extends HTMLElement {
    static get observedAttributes() {
      return ["text", "heading", "level", "size", "align"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    render() {
      const text = this.getAttribute("text") || this.getAttribute("heading") || "";
      const level = safeLevel(this.getAttribute("level"));
      const tag = `h${level}`;
      this.shadowRoot.innerHTML = `<style> ` + styles10 + ` </style><` + tag + ` class="heading" part="heading"><slot>` + escapeHtml(text) + `</slot></` + tag + `>`;
    }
  };
  defineUiBaseElement("uib-heading", UibHeading);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/uib-heading-block.js
  var styles11 = `
:host{display:block;color:var(--uib-heading-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}.block{display:grid;gap:var(--uib-heading-gap,.65rem);text-align:var(--uib-heading-align,start)}.subheadline{margin:0;max-width:var(--uib-heading-subheadline-width,62ch);color:var(--uib-heading-subheadline-color,var(--uib-color-muted,#40516f));font-size:var(--uib-heading-subheadline-size,1.08rem);line-height:1.6;font-weight:600}.body{margin:0;max-width:var(--uib-heading-body-width,68ch);color:var(--uib-heading-body-color,var(--uib-color-muted,#40516f));line-height:1.6}:host([align="center"]) .block{align-items:center;text-align:center}.eyebrow-slot{display:block;margin:0 0 .15rem}
`;
  var UibHeadingBlock = class extends HTMLElement {
    static get observedAttributes() {
      return ["eyebrow", "headline", "subheadline", "body", "level", "size", "align"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    render() {
      const eyebrow = this.getAttribute("eyebrow") || "";
      const headline = this.getAttribute("headline") || "";
      const subheadline = this.getAttribute("subheadline") || this.getAttribute("subtitle") || "";
      const body = this.getAttribute("body") || "";
      const level = this.getAttribute("level") || "";
      const size = this.getAttribute("size") || "";
      const align = this.getAttribute("align") || "";
      this.shadowRoot.innerHTML = `<style> ` + styles11 + ` </style><div class="block" part="block"> ` + (eyebrow ? `<span class="eyebrow-slot"><uib-eyebrow text="${escapeHtml(eyebrow)}"></uib-eyebrow></span>` : "") + `<uib-heading level="${escapeHtml(level)}" size="${escapeHtml(size)}" align="${escapeHtml(align)}" exportparts="heading: headline"><slot name="headline">${escapeHtml(headline)}</slot></uib-heading> ` + (subheadline ? `<p class="subheadline" part="subheadline"><slot name="subheadline">${escapeHtml(subheadline)}</slot></p>` : "") + ` ` + (body ? `<p class="body" part="body"><slot name="body">${escapeHtml(body)}</slot></p>` : "") + ` </div>`;
    }
  };
  defineUiBaseElement("uib-heading-block", UibHeadingBlock);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/uib-instruction.js
  var VARIANTS = ["info", "tip", "warning", "danger", "success"];
  var variantDefaults = {
    info: { marker: "i", label: "Information" },
    tip: { marker: "\u2605", label: "Tip" },
    warning: { marker: "!", label: "Warning" },
    danger: { marker: "!", label: "Important warning" },
    success: { marker: "\u2713", label: "Success" }
  };
  var styles12 = `
:host{display:block;color:var(--uib-instruction-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}
*,*::before,*::after{box-sizing:border-box}
.instruction{--uib-instruction-accent:var(--uib-color-info,var(--uib-color-primary,#174a8b));--uib-instruction-accent-soft:rgba(23,74,139,.1);display:block;overflow:hidden;border:1px solid var(--uib-instruction-border,var(--uib-color-border,#d9e2f0));border-inline-start:var(--uib-instruction-accent-width,5px) solid var(--uib-instruction-accent);border-radius:var(--uib-instruction-radius,var(--uib-radius-lg,1rem));background:var(--uib-instruction-bg,var(--uib-color-surface,#fff));box-shadow:var(--uib-instruction-shadow,var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08)))}
.instruction--tip{--uib-instruction-accent:var(--uib-color-accent,#f4bd46);--uib-instruction-accent-soft:rgba(244,189,70,.18)}
.instruction--warning{--uib-instruction-accent:var(--uib-color-warning,#9f6500);--uib-instruction-accent-soft:rgba(159,101,0,.12)}
.instruction--danger{--uib-instruction-accent:var(--uib-color-danger,#b4232a);--uib-instruction-accent-soft:rgba(180,35,42,.12)}
.instruction--success{--uib-instruction-accent:var(--uib-color-success,#2e7d32);--uib-instruction-accent-soft:rgba(46,125,50,.12)}
.instruction--compact .instruction__summary,.instruction--compact .instruction__body,.instruction--compact .instruction__footer{padding:var(--uib-space-3,.75rem)}
.instruction--disabled{opacity:.58}
details.instruction{padding:0}
details.instruction:not([open]) .instruction__footer{display:none}
summary.instruction__summary{cursor:pointer;list-style:none}
summary.instruction__summary::-webkit-details-marker{display:none}
.instruction__summary{display:flex;gap:var(--uib-space-3,.75rem);align-items:flex-start;padding:var(--uib-space-4,1rem);background:linear-gradient(90deg,var(--uib-instruction-accent-soft),transparent)}
.instruction__summary:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}
.instruction--disabled .instruction__summary{cursor:not-allowed}
.instruction__marker{display:inline-grid;flex:0 0 auto;width:2rem;height:2rem;place-items:center;border-radius:var(--uib-radius-pill,999px);background:var(--uib-instruction-accent);color:var(--uib-instruction-marker-color,var(--uib-color-primary-contrast,#fff));font-weight:900;line-height:1}
.instruction__header{min-width:0;display:grid;gap:.3rem;flex:1}
.instruction__title-row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:space-between}
.instruction__title{margin:0;color:var(--uib-instruction-heading-color,currentColor);font-size:var(--uib-instruction-heading-size,1.08rem);font-weight:900;line-height:1.2}
.instruction__description{margin:0;max-width:var(--uib-instruction-summary-width,68ch);color:var(--uib-instruction-muted,var(--uib-color-muted,#53657f));line-height:1.55}
.instruction__status{display:inline-flex;align-items:center;min-height:1.55rem;padding:.18rem .55rem;border-radius:var(--uib-radius-pill,999px);background:var(--uib-instruction-accent-soft);color:var(--uib-instruction-accent);font-size:var(--uib-font-size-xs,.75rem);font-weight:900;text-transform:uppercase;letter-spacing:.04em}
.instruction__body{display:grid;gap:var(--uib-space-4,1rem);padding:0 var(--uib-space-4,1rem) var(--uib-space-4,1rem)}
.instruction__copy{display:block;max-width:var(--uib-instruction-body-width,72ch);line-height:1.6}
.instruction__steps{display:grid;gap:var(--uib-space-3,.75rem)}
.instruction__step-list{display:grid;gap:var(--uib-space-3,.75rem);margin:0;padding:0;list-style-position:inside;counter-reset:instruction-step}
.instruction--numbered .instruction__step-list{padding-inline-start:1.2rem;list-style:decimal}
::slotted([slot="step"]){display:block;margin:0;padding:.78rem .85rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);line-height:1.55}
:host([numbered]) ::slotted([slot="step"]){display:list-item}
::slotted([slot="step"][current]),::slotted([slot="step"][aria-current="step"]),::slotted([slot="step"][status="current"]){border-color:var(--uib-instruction-accent);box-shadow:inset 0 0 0 1px var(--uib-instruction-accent)}
::slotted([slot="step"][complete]),::slotted([slot="step"][status="complete"]){border-color:rgba(46,125,50,.35);background:rgba(46,125,50,.08)}
::slotted([slot="step"][disabled]),::slotted([slot="step"][aria-disabled="true"]),::slotted([slot="step"][status="disabled"]){opacity:.58}
.instruction__progress{display:grid;gap:.35rem}
.instruction__progress-label{display:flex;justify-content:space-between;gap:var(--uib-space-2,.5rem);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem);font-weight:800}
.instruction__progress-track{overflow:hidden;height:.45rem;border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-border,#d9e2f0)}
.instruction__progress-value{height:100%;width:var(--uib-instruction-progress-value,0%);border-radius:inherit;background:var(--uib-instruction-accent)}
.instruction__actions{display:flex;flex-wrap:wrap;gap:var(--uib-space-2,.5rem);align-items:center}
.instruction__actions[hidden],.instruction__footer[hidden],.instruction__steps[hidden],.instruction__progress[hidden]{display:none!important}
.instruction__footer{padding:var(--uib-space-4,1rem);border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}
`;
  function hasNamedSlot(element, name) {
    return Array.from(element.children).some((child) => child.getAttribute?.("slot") === name);
  }
  function stepStatus(step) {
    const status = (step.getAttribute?.("status") || "").toLowerCase();
    if (step.hasAttribute?.("complete") || status === "complete") return "complete";
    if (step.hasAttribute?.("current") || step.getAttribute?.("aria-current") === "step" || status === "current") return "current";
    if (step.hasAttribute?.("disabled") || step.getAttribute?.("aria-disabled") === "true" || status === "disabled") return "disabled";
    return "";
  }
  var UibInstruction = class extends UibBaseElement {
    static get observedAttributes() {
      return [
        ...UibBaseElement.commonAttributes,
        "heading",
        "summary",
        "variant",
        "icon",
        "collapsible",
        "open",
        "density",
        "numbered",
        "complete",
        "current",
        "show-progress"
      ];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._observer = null;
    }
    connectedCallback() {
      this.render();
      this._connectObserver();
    }
    disconnectedCallback() {
      this._observer?.disconnect();
      this._observer = null;
    }
    get heading() {
      return this.getAttribute("heading") || this.label || "Instruction";
    }
    get summary() {
      return this.getAttribute("summary") || "";
    }
    get variant() {
      const value = (this.getAttribute("variant") || "info").toLowerCase();
      return VARIANTS.includes(value) ? value : "info";
    }
    get collapsible() {
      return this.hasAttribute("collapsible");
    }
    get open() {
      return !this.collapsible || this.hasAttribute("open");
    }
    set open(value) {
      this.toggleAttribute("open", Boolean(value));
    }
    get density() {
      return this.getAttribute("density") === "compact" ? "compact" : "comfortable";
    }
    get numbered() {
      return this.hasAttribute("numbered");
    }
    get complete() {
      return this.hasAttribute("complete");
    }
    get current() {
      return this.hasAttribute("current");
    }
    get showProgress() {
      return this.hasAttribute("show-progress");
    }
    _connectObserver() {
      this._observer?.disconnect();
      this._observer = new MutationObserver(() => {
        if (this.isConnected) this.render();
      });
      this._observer.observe(this, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["slot", "complete", "current", "disabled", "status", "aria-current", "aria-disabled"]
      });
    }
    _steps() {
      return Array.from(this.children).filter((child) => child.getAttribute?.("slot") === "step");
    }
    _progress() {
      const steps = this._steps();
      const total = steps.length;
      const complete = steps.filter((step) => stepStatus(step) === "complete").length;
      const currentIndex = steps.findIndex((step) => stepStatus(step) === "current");
      const percent = total ? Math.round(complete / total * 100) : 0;
      return { total, complete, currentIndex, percent };
    }
    _statusLabel(progress) {
      if (this.complete) return "Complete";
      if (this.current) return "Current";
      if (progress.total) return `${progress.complete}/${progress.total} done`;
      return variantDefaults[this.variant].label;
    }
    _summaryContent(progress) {
      const marker = this.getAttribute("icon") || variantDefaults[this.variant].marker;
      const summary = this.summary;
      return `<span class="instruction__marker" part="marker" aria-hidden="true">${escapeHtml(marker)}</span><span class="instruction__header" part="header"><span class="instruction__title-row"><span class="instruction__title" part="title">${escapeHtml(this.heading)}</span><span class="instruction__status" part="status">${escapeHtml(this._statusLabel(progress))}</span></span>` + (summary ? `<span class="instruction__description" part="description">${escapeHtml(summary)}</span>` : "") + `</span>`;
    }
    _bodyContent(progress) {
      const hasSteps = progress.total > 0;
      const hasActions = hasNamedSlot(this, "actions");
      const hasFooter = hasNamedSlot(this, "footer");
      const showProgress = this.showProgress || hasSteps;
      return `<div class="instruction__body" part="body"><div class="instruction__copy" part="content"><slot></slot></div><div class="instruction__steps" part="steps" ${hasSteps ? "" : "hidden"}><ol class="instruction__step-list" part="step-list"><slot name="step"></slot></ol></div><div class="instruction__progress" part="progress" ${showProgress ? "" : "hidden"} style="--uib-instruction-progress-value:${progress.percent}%"><div class="instruction__progress-label"><span>${progress.total ? "Step progress" : "Progress"}</span><span>${progress.total ? `${progress.complete} of ${progress.total}` : `${progress.percent}%`}</span></div><div class="instruction__progress-track" aria-hidden="true"><div class="instruction__progress-value"></div></div></div><div class="instruction__actions" part="actions" ${hasActions ? "" : "hidden"}><slot name="actions"></slot></div></div><div class="instruction__footer" part="footer" ${hasFooter ? "" : "hidden"}><slot name="footer"></slot></div>`;
    }
    _classes() {
      return [
        "instruction",
        `instruction--${this.variant}`,
        `instruction--${this.density}`,
        this.numbered ? "instruction--numbered" : "",
        this.complete ? "instruction--complete" : "",
        this.current ? "instruction--current" : "",
        this.disabled ? "instruction--disabled" : "",
        this.cssClass
      ].filter(Boolean).join(" ");
    }
    _handleToggle(event) {
      if (this.disabled) {
        event.currentTarget.open = this.open;
        return;
      }
      const oldValue = this.open;
      const newValue = event.currentTarget.open;
      if (oldValue === newValue) return;
      this.open = newValue;
      this.emitValueChange("uib-instruction-toggle", oldValue, newValue, {
        variant: this.variant,
        complete: this.complete,
        current: this.current
      });
    }
    render() {
      const progress = this._progress();
      const classes = this._classes();
      const summary = `<slot name="summary">${this._summaryContent(progress)}</slot>`;
      const body = this._bodyContent(progress);
      const ariaLabel = this.ariaLabel ? ` aria-label="${escapeHtml(this.ariaLabel)}"` : "";
      const describedBy = this.describedBy();
      const ariaDescribedBy = describedBy ? ` aria-describedby="${escapeHtml(describedBy)}"` : "";
      const disabled = this.disabled ? ' aria-disabled="true"' : "";
      this.shadowRoot.innerHTML = this.collapsible ? `<style>${styles12}</style><details class="${classes}" part="base" ${this.open ? "open" : ""}${ariaLabel}${ariaDescribedBy}${disabled}><summary class="instruction__summary" part="summary">${summary}</summary>` + body + `</details>` : `<style>${styles12}</style><section class="${classes}" part="base" role="note"${ariaLabel}${ariaDescribedBy}${disabled}><div class="instruction__summary" part="summary">${summary}</div>` + body + `</section>`;
      const details = this.shadowRoot.querySelector("details");
      details?.addEventListener("toggle", (event) => this._handleToggle(event));
      details?.querySelector("summary")?.addEventListener("click", (event) => {
        if (this.disabled) event.preventDefault();
      });
    }
  };
  defineUiBaseElement("uib-instruction", UibInstruction);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/rich-text-html.js
  var allowedTags = /* @__PURE__ */ new Set([
    "A",
    "ABBR",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CODE",
    "DIV",
    "EM",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "I",
    "LI",
    "OL",
    "P",
    "PRE",
    "SMALL",
    "SPAN",
    "STRONG",
    "SUB",
    "SUP",
    "U",
    "UL"
  ]);
  var removedTags = /* @__PURE__ */ new Set(["BASE", "EMBED", "IFRAME", "LINK", "META", "OBJECT", "SCRIPT", "STYLE", "TEMPLATE"]);
  function safeHref2(value, baseUrl) {
    const href = String(value || "").trim();
    if (!href || href.startsWith("#") || href.startsWith("/") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
    try {
      const url = new URL(href, baseUrl);
      return ["http:", "https:"].includes(url.protocol) ? href : "";
    } catch {
      return "";
    }
  }
  function normalizeAnchor(anchor, baseUrl) {
    const href = safeHref2(anchor.getAttribute("href"), baseUrl);
    Array.from(anchor.attributes).forEach((attribute) => anchor.removeAttribute(attribute.name));
    if (!href) return;
    anchor.setAttribute("href", href);
    try {
      const url = new URL(href, baseUrl);
      if (["http:", "https:"].includes(url.protocol) && url.origin !== new URL(baseUrl).origin) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      }
    } catch {
    }
  }
  function sanitizeNode(node, baseUrl) {
    if (node.nodeType !== 1) return;
    const element = node;
    if (removedTags.has(element.tagName)) {
      element.remove();
      return;
    }
    if (!allowedTags.has(element.tagName)) {
      const children = Array.from(element.childNodes);
      element.replaceWith(...children);
      children.forEach((child) => sanitizeNode(child, baseUrl));
      return;
    }
    if (element.tagName === "A") normalizeAnchor(element, baseUrl);
    else Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    Array.from(element.childNodes).forEach((child) => sanitizeNode(child, baseUrl));
  }
  function sanitizeRichTextHtml(value, documentRef = globalThis.document) {
    if (!documentRef?.createElement) return "";
    const template = documentRef.createElement("template");
    template.innerHTML = String(value ?? "");
    const baseUrl = documentRef.baseURI || globalThis.location?.href || "http://localhost/";
    Array.from(template.content.childNodes).forEach((node) => sanitizeNode(node, baseUrl));
    return template.innerHTML;
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/content/uib-rich-text.js
  var styles13 = `
:host{display:block;color:var(--uib-rich-text-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);font-size:var(--uib-rich-text-font-size,1rem);line-height:var(--uib-rich-text-line-height,1.6)}
.rich-text{display:block;max-width:var(--uib-rich-text-width,72ch)}
::slotted(*){box-sizing:border-box}
::slotted(:is(p,ul,ol,blockquote,pre,h1,h2,h3,h4,h5,h6)){margin-block-start:0;margin-block-end:var(--uib-rich-text-block-gap,.85rem)}
::slotted(:is(h1,h2,h3,h4,h5,h6)){color:var(--uib-rich-text-heading-color,currentColor);font-weight:var(--uib-rich-text-heading-weight,850);line-height:1.18}
::slotted(h1){font-size:var(--uib-rich-text-h1-size,2rem)}
::slotted(h2){font-size:var(--uib-rich-text-h2-size,1.6rem)}
::slotted(h3){font-size:var(--uib-rich-text-h3-size,1.3rem)}
::slotted(:is(h4,h5,h6)){font-size:var(--uib-rich-text-h4-size,1.08rem)}
::slotted(:is(ul,ol)){padding-inline-start:1.35rem}
::slotted(blockquote){padding-inline-start:1rem;border-inline-start:4px solid var(--uib-rich-text-quote-border,var(--uib-color-border-strong,#aab8cc));color:var(--uib-rich-text-muted,var(--uib-color-muted,#53657f))}
::slotted(pre){overflow:auto;padding:.8rem;border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff)}
::slotted(code){font-family:var(--uib-font-family-mono,ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace)}
::slotted(a){color:var(--uib-rich-text-link-color,var(--uib-color-primary,#174a8b));text-decoration-thickness:.08em;text-underline-offset:.16em}
`;
  var UibRichText = class extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._handleSlotChange = () => this.normalizeContent();
    }
    connectedCallback() {
      this.render();
    }
    normalizeContent() {
      const sanitized = sanitizeRichTextHtml(this.innerHTML, this.ownerDocument);
      if (this.innerHTML !== sanitized) this.innerHTML = sanitized;
    }
    get html() {
      return this.innerHTML;
    }
    set html(value) {
      this.innerHTML = sanitizeRichTextHtml(value, this.ownerDocument);
    }
    render() {
      this.shadowRoot.innerHTML = `<style>${styles13}</style><div class="rich-text" part="base content"><slot></slot></div>`;
      this.shadowRoot.querySelector("slot")?.addEventListener("slotchange", this._handleSlotChange);
      this.normalizeContent();
    }
  };
  defineUiBaseElement("uib-rich-text", UibRichText);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/actions/uib-action-group.js
  var styles14 = `
:host{display:block}.group{display:flex;flex-wrap:wrap;align-items:center;gap:var(--uib-action-group-gap,.75rem)}:host([align="center"]) .group{justify-content:center}:host([align="end"]) .group{justify-content:flex-end}:host([stacked]) .group{display:grid;align-items:stretch}:host([stacked]) uib-action-button{width:100%}
`;
  function parseActions(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function boolish(value, fallback = true) {
    if (value === void 0 || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
  }
  var UibActionGroup = class extends HTMLElement {
    static get observedAttributes() {
      return ["actions", "align", "stacked"];
    }
    constructor() {
      super();
      this._actions = void 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get actions() {
      return Array.isArray(this._actions) ? this._actions : parseActions(this.getAttribute("actions"));
    }
    set actions(value) {
      this._actions = Array.isArray(value) ? value : [];
      setOrRemoveAttribute(this, "actions", JSON.stringify(this._actions));
      if (this.isConnected) this.render();
    }
    renderAction(action, index) {
      const item2 = action && typeof action === "object" ? action : {};
      const label = item2.label || item2.text || item2.title || `Action ${index + 1}`;
      const kind = item2.kind || item2.key || item2.name || item2.id || (index === 0 ? "primary" : index === 1 ? "secondary" : `action-${index + 1}`);
      const variant = item2.variant || (index === 0 ? "primary" : "secondary");
      const href = item2.href || item2.url || (String(item2.type || "").toLowerCase() === "link" ? item2.value : "");
      const actionToken = item2.action || item2.actionToken || item2.token || (String(item2.type || "").toLowerCase() === "action" ? item2.value : "");
      const shown = boolish(item2.shown ?? item2.show ?? item2.visible, true);
      if (!shown || !label) return "";
      return `<uib-action-button label="` + escapeHtml(label) + `" kind="` + escapeHtml(kind) + `" variant="` + escapeHtml(variant) + `" href="` + escapeHtml(href || "") + `" action-token="` + escapeHtml(actionToken || "") + `" ` + (boolish(item2.disabled, false) ? "disabled" : "") + ` ` + (item2.target ? `target="${escapeHtml(item2.target)}"` : "") + ` ` + (item2.rel ? `rel="${escapeHtml(item2.rel)}"` : "") + `></uib-action-button>`;
    }
    render() {
      const actionMarkup = this.actions.map((action, index) => this.renderAction(action, index)).join("");
      this.shadowRoot.innerHTML = `<style> ` + styles14 + ` </style><div class="group" part="group"> ` + (actionMarkup || "<slot></slot>") + ` </div>`;
    }
  };
  defineUiBaseElement("uib-action-group", UibActionGroup);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/media/uib-media.js
  var styles15 = `
:host{display:block;inline-size:100%;block-size:auto}.media{position:relative;display:block;inline-size:100%;overflow:hidden;border-radius:var(--uib-media-radius,inherit);background:var(--uib-media-bg,var(--uib-color-surface-soft,#eef4fb));aspect-ratio:var(--uib-media-ratio,auto)}.media img{display:block;inline-size:100%;block-size:100%;object-fit:var(--uib-media-fit,cover);object-position:var(--uib-media-position,center)}.fallback{display:grid;place-items:center;min-block-size:var(--uib-media-fallback-height,8rem);padding:1rem;color:var(--uib-media-fallback-color,var(--uib-color-muted,#53657f));font-weight:850;text-align:center}:host([role="icon"]) .media{aspect-ratio:1}:host([role="icon"]) .fallback{min-block-size:2.5rem}
`;
  function safeMediaSrc(value) {
    const src = String(value ?? "").trim();
    if (!src || /^javascript:/i.test(src)) return "";
    if (/^data:/i.test(src) && !/^data:image\//i.test(src)) return "";
    return src;
  }
  var UibMedia = class extends HTMLElement {
    static get observedAttributes() {
      return ["src", "alt", "fit", "ratio", "position", "role", "fallback-label"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get src() {
      return this.getAttribute("src") || "";
    }
    set src(value) {
      setOrRemoveAttribute(this, "src", value);
    }
    render() {
      const src = safeMediaSrc(this.src);
      const alt = this.getAttribute("alt") || "";
      const fit = this.getAttribute("fit") || (this.getAttribute("role") === "icon" ? "contain" : "cover");
      const ratio = this.getAttribute("ratio") || "";
      const position = this.getAttribute("position") || "center";
      const fallback = this.getAttribute("fallback-label") || alt || "Image unavailable";
      this.shadowRoot.innerHTML = `<style> ` + styles15 + ` </style><figure class="media" part="media" style="--uib-media-fit:` + escapeHtml(fit) + `;--uib-media-position:` + escapeHtml(position) + `;` + (ratio ? `--uib-media-ratio:${escapeHtml(ratio)};` : "") + `" > ` + (src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">` : `<div class="fallback" part="fallback">${escapeHtml(fallback)}</div>`) + ` </figure>`;
    }
  };
  defineUiBaseElement("uib-media", UibMedia);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/details/uib-detail-item.js
  var styles16 = `
:host{display:block;color:var(--uib-detail-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.detail{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.7rem;min-width:0;padding:var(--uib-detail-padding,.85rem);border:1px solid var(--uib-detail-border,var(--uib-color-border,rgba(19,41,75,.16)));border-radius:var(--uib-detail-radius,1rem);background:var(--uib-detail-bg,rgba(255,255,255,.72));box-shadow:var(--uib-detail-shadow,none)}.icon{width:var(--uib-detail-icon-size,2.35rem);height:var(--uib-detail-icon-size,2.35rem);display:grid;place-items:center;overflow:hidden;border-radius:var(--uib-detail-icon-radius,.82rem);background:var(--uib-detail-icon-bg,var(--uib-color-surface-soft,#eef4fb));color:var(--uib-detail-icon-color,var(--uib-color-primary,#174a8b));font-size:.78rem;font-weight:900;line-height:1}.icon uib-media,.icon uib-asset-image{width:100%;height:100%}.copy{min-width:0}.label{margin:0;color:var(--uib-detail-label-color,var(--uib-color-muted,#53657f));font-size:var(--uib-detail-label-size,.78rem);font-weight:900;letter-spacing:.04em;text-transform:uppercase}.value{margin:.12rem 0 0;color:var(--uib-detail-value-color,currentColor);font-size:var(--uib-detail-value-size,.98rem);font-weight:850;line-height:1.25;overflow-wrap:anywhere}.description{margin:.25rem 0 0;color:var(--uib-detail-description-color,var(--uib-color-muted,#53657f));font-size:.86rem;line-height:1.4}
`;
  function parseObject(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (!value) return {};
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function safeImageSrc(value) {
    const src = String(value ?? "").trim();
    if (!src || /^javascript:/i.test(src)) return "";
    if (/^data:/i.test(src) && !/^data:image\//i.test(src)) return "";
    if (/^https?:\/\//i.test(src) || /^data:image\//i.test(src)) return src;
    if (src.startsWith("/") || src.startsWith("./") || src.startsWith("../")) return src;
    if (/^[a-z0-9_.~%+-]+\.(svg|png|jpe?g|gif|webp|avif)([?#].*)?$/i.test(src)) return src;
    return "";
  }
  function firstText(...values) {
    for (const value of values) {
      if (value !== void 0 && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
  }
  function iconText(detail, index) {
    const raw = firstText(detail.icon, detail.label, Number.isFinite(index) ? index + 1 : 1);
    return raw ? raw.slice(0, 2).toUpperCase() : "1";
  }
  function assetEntry(assetMap, assetId) {
    if (!assetId || !assetMap || typeof assetMap !== "object") return void 0;
    return assetMap[assetId];
  }
  function assetEntryText(entry, ...keys) {
    if (!entry) return "";
    if (typeof entry === "string") return keys.includes("url") || keys.includes("src") ? entry : "";
    if (typeof entry !== "object") return "";
    for (const key of keys) {
      if (entry[key] !== void 0 && entry[key] !== null && String(entry[key]).trim() !== "") return String(entry[key]).trim();
    }
    return "";
  }
  function normalizeDetail(value = {}) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      label: firstText(row.label),
      value: firstText(row.value),
      description: firstText(row.description),
      icon: firstText(row.icon),
      iconUrl: firstText(row.iconUrl, row.icon_url, row.iconSrc, row.iconHref, row.iconImage),
      iconAssetId: firstText(row.iconAssetId, row.icon_asset_id, row.assetId, row.asset_id),
      iconAlt: firstText(row.iconAlt, row.icon_alt, row.alt)
    };
  }
  var UibDetailItem = class extends HTMLElement {
    static get observedAttributes() {
      return ["detail", "label", "value", "description", "icon", "icon-url", "icon-src", "asset-id", "icon-asset-id", "asset-map", "alt", "icon-alt", "index"];
    }
    constructor() {
      super();
      this._detail = void 0;
      this._assetMap = void 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get detail() {
      if (this._detail && typeof this._detail === "object") return normalizeDetail(this._detail);
      const detail = normalizeDetail(parseObject(this.getAttribute("detail")));
      return normalizeDetail({
        ...detail,
        label: firstText(this.getAttribute("label"), detail.label),
        value: firstText(this.getAttribute("value"), detail.value),
        description: firstText(this.getAttribute("description"), detail.description),
        icon: firstText(this.getAttribute("icon"), detail.icon),
        iconUrl: firstText(this.getAttribute("icon-url"), this.getAttribute("icon-src"), detail.iconUrl),
        iconAssetId: firstText(this.getAttribute("asset-id"), this.getAttribute("icon-asset-id"), detail.iconAssetId),
        iconAlt: firstText(this.getAttribute("icon-alt"), this.getAttribute("alt"), detail.iconAlt)
      });
    }
    set detail(value) {
      this._detail = normalizeDetail(value);
      setOrRemoveAttribute(this, "detail", JSON.stringify(this._detail));
      if (this.isConnected) this.render();
    }
    get assetMap() {
      if (this._assetMap && typeof this._assetMap === "object") return this._assetMap;
      return parseObject(this.getAttribute("asset-map"));
    }
    set assetMap(value) {
      this._assetMap = value && typeof value === "object" ? value : {};
      setOrRemoveAttribute(this, "asset-map", JSON.stringify(this._assetMap));
      if (this.isConnected) this.render();
    }
    get index() {
      const value = Number.parseInt(this.getAttribute("index") || "0", 10);
      return Number.isFinite(value) ? value : 0;
    }
    iconMarkup(detail) {
      const assetMap = this.assetMap;
      const entry = assetEntry(assetMap, detail.iconAssetId);
      const explicitSrc = safeImageSrc(detail.iconUrl);
      const mappedSrc = safeImageSrc(assetEntryText(entry, "url", "src", "href", "publicUrl", "public_url"));
      const src = explicitSrc || mappedSrc;
      const assetId = detail.iconAssetId;
      const alt = firstText(detail.iconAlt, assetEntryText(entry, "alt", "altText", "alt_text", "description"), detail.label);
      if (src || assetId) {
        if (typeof customElements !== "undefined" && customElements.get("uib-asset-image")) {
          return `<span class="icon icon--image"><uib-asset-image src="` + escapeHtml(src) + `" asset-id="` + escapeHtml(assetId) + `" alt="` + escapeHtml(alt) + `" role="icon" fit="contain" asset-map='` + escapeHtml(JSON.stringify(assetMap || {})) + `' fallback-label="` + escapeHtml(iconText(detail, this.index)) + `"></uib-asset-image></span>`;
        }
        if (src) {
          return `<span class="icon icon--image"><uib-media src="` + escapeHtml(src) + `" alt="` + escapeHtml(alt) + `" role="icon" fit="contain" fallback-label="` + escapeHtml(iconText(detail, this.index)) + `"></uib-media></span>`;
        }
      }
      return `<span class="icon icon--text" aria-hidden="true">` + escapeHtml(iconText(detail, this.index)) + `</span>`;
    }
    render() {
      const detail = this.detail;
      this.shadowRoot.innerHTML = `<style>` + styles16 + `</style><div class="detail" part="item"> ` + this.iconMarkup(detail) + ` <div class="copy"><dt class="label" part="label">` + escapeHtml(detail.label) + `</dt><dd class="value" part="value">` + escapeHtml(detail.value) + `</dd> ` + (detail.description ? `<dd class="description" part="description">${escapeHtml(detail.description)}</dd>` : "") + ` </div></div>`;
    }
  };
  defineUiBaseElement("uib-detail-item", UibDetailItem);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/details/uib-detail-item-edit.js
  var styles17 = `
:host{display:block;color:var(--uib-detail-editor-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem}.field{display:grid;gap:.3rem;color:var(--uib-color-muted,#53657f);font-size:.82rem;font-weight:850}.field--wide{grid-column:1/-1}.field-note{color:var(--uib-color-muted,#53657f);font-size:.78rem;font-weight:650;line-height:1.35}input,textarea{width:100%;min-height:2.35rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:.75rem;padding:.58rem .7rem;background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:700}textarea{min-height:4.5rem;resize:vertical}@media(max-width:720px){.fields{grid-template-columns:1fr}}
`;
  function parseObject2(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (!value) return {};
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function stringValue(value) {
    return value === null || value === void 0 ? "" : String(value);
  }
  function cleanDetail(value) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const detail = {
      label: stringValue(row.label),
      value: stringValue(row.value),
      icon: stringValue(row.icon),
      iconUrl: stringValue(row.iconUrl || row.icon_url || row.iconSrc || row.iconHref || row.iconImage),
      iconAssetId: stringValue(row.iconAssetId || row.icon_asset_id || row.assetId || row.asset_id),
      iconAlt: stringValue(row.iconAlt || row.icon_alt || row.alt),
      description: stringValue(row.description)
    };
    return Object.fromEntries(Object.entries(detail).filter(([, item2]) => item2 !== ""));
  }
  function firstTextValue(value, keys) {
    const queue = [value];
    const visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== "object" || visited.has(current)) continue;
      visited.add(current);
      for (const key of keys) {
        const candidate = current[key];
        if (candidate !== void 0 && candidate !== null && candidate !== "") return String(candidate);
      }
      for (const nestedKey of ["insert", "selection", "asset", "record", "storageRecord", "raw"]) {
        if (current[nestedKey]) queue.push(current[nestedKey]);
      }
    }
    return "";
  }
  var UibDetailItemEdit = class extends HTMLElement {
    static get observedAttributes() {
      return ["detail", "label", "use-asset-picker", "application-key", "api-base-url", "asset-map", "index"];
    }
    constructor() {
      super();
      this._detail = void 0;
      this._suppressAttributeRender = false;
      this.headers = void 0;
      this.getAuthHeaders = void 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected && !this._suppressAttributeRender) this.render();
    }
    get detail() {
      if (this._detail) return cleanDetail(this._detail);
      return cleanDetail(parseObject2(this.getAttribute("detail")));
    }
    set detail(value) {
      this._detail = cleanDetail(value);
      this.syncDetailAttribute(this._detail);
      if (this.isConnected) this.render();
    }
    get index() {
      const value = Number.parseInt(this.getAttribute("index") || "0", 10);
      return Number.isFinite(value) ? value : 0;
    }
    syncDetailAttribute(detail) {
      this._suppressAttributeRender = true;
      setOrRemoveAttribute(this, "detail", JSON.stringify(cleanDetail(detail)));
      this._suppressAttributeRender = false;
    }
    collectDetail() {
      const fieldValue2 = (name) => this.shadowRoot.querySelector(`[data-field="${name}"]`)?.value || "";
      return cleanDetail({
        label: fieldValue2("label"),
        value: fieldValue2("value"),
        icon: fieldValue2("icon"),
        iconUrl: fieldValue2("iconUrl"),
        iconAssetId: fieldValue2("iconAssetId"),
        iconAlt: fieldValue2("iconAlt"),
        description: fieldValue2("description")
      });
    }
    emitChange(extra = {}) {
      const detail = this.detail;
      const eventDetail = {
        index: this.index,
        oldValue: void 0,
        newValue: detail,
        detail,
        ...extra
      };
      this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true, detail: eventDetail }));
      this.dispatchEvent(new CustomEvent("uib-detail-item-edit-change", { bubbles: true, composed: true, detail: eventDetail }));
    }
    updateFromFields(extra = {}) {
      this._detail = this.collectDetail();
      this.emitChange(extra);
    }
    emitAssetChange(extra = {}) {
      const detail = this.detail;
      this.dispatchEvent(new CustomEvent("uib-detail-item-asset-change", {
        bubbles: true,
        composed: true,
        detail: {
          index: this.index,
          assetId: detail.iconAssetId || "",
          detail,
          ...extra
        }
      }));
    }
    setAssetId(assetId, extra = {}) {
      const input = this.shadowRoot.querySelector('[data-field="iconAssetId"]');
      if (input) input.value = assetId;
      this.updateFromFields({ field: "iconAssetId", assetId, ...extra });
      this.emitAssetChange({ assetId, ...extra });
    }
    pickerMarkup(detail) {
      if (!this.hasAttribute("use-asset-picker")) return "";
      const appKey = this.getAttribute("application-key") || "";
      const baseUrl = this.getAttribute("api-base-url") || "";
      const assetId = detail.iconAssetId || "";
      return `<div class="field field--wide"><span>Asset picker</span><span class="field-note">Selecting an asset stores its ID in iconAssetId. Icon URL and alt text below can override the resolved asset image and alt text.</span><uib-asset-picker data-detail-picker="true" data-picker-mode="simple" label="Detail icon asset" placeholder="Select or upload icon" value="` + escapeHtml(assetId) + `" application-key="` + escapeHtml(appKey) + `" default-application-key="` + escapeHtml(appKey) + `" api-base-url="` + escapeHtml(baseUrl) + `" selection-mode="single" view="list" default-layout="list" default-asset-type="image" default-file-type="image" default-reuse-scope="global" default-scope="global" default-visibility="public" asset-visibility="public" allow-upload insertable-only insertable-file-types="image,icon,svg" accepted-file-types="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif" copy-on-select="false" selection-behavior="select" ></uib-asset-picker></div>`;
    }
    configurePicker() {
      const picker = this.shadowRoot.querySelector("uib-asset-picker[data-detail-picker]");
      if (!picker) return;
      const assetId = this.detail.iconAssetId || "";
      picker.headers = typeof this.getAuthHeaders === "function" ? this.getAuthHeaders() : this.headers;
      picker.getAuthHeaders = this.getAuthHeaders;
      picker.value = assetId;
      picker.selectedAssetIds = assetId ? [assetId] : [];
      picker.addEventListener("uib-asset-select", (event) => {
        event.stopPropagation();
        const assetId2 = firstTextValue(event.detail, ["assetId", "asset_id", "id", "value"]);
        if (assetId2) this.setAssetId(assetId2, { asset: event.detail?.asset || event.detail?.selection?.asset || null, sourceEvent: event.type });
      });
      picker.addEventListener("asset-selected", (event) => {
        event.stopPropagation();
        const assetId2 = firstTextValue(event.detail, ["assetId", "asset_id", "id", "value"]);
        if (assetId2) this.setAssetId(assetId2, { asset: event.detail?.asset || event.detail?.selection?.asset || null, sourceEvent: event.type });
      });
      picker.addEventListener("uib-asset-clear", (event) => {
        event.stopPropagation();
        this.setAssetId("", { cleared: true, sourceEvent: event.type });
      });
      picker.addEventListener("asset-cleared", (event) => {
        event.stopPropagation();
        this.setAssetId("", { cleared: true, sourceEvent: event.type });
      });
      if (!picker.dataset.uibConfigured && typeof picker.loadAll === "function") {
        picker.dataset.uibConfigured = "true";
        window.setTimeout(() => void picker.loadAll(), 0);
      }
    }
    bind() {
      this.shadowRoot.querySelectorAll("input,textarea").forEach((input) => {
        input.addEventListener("input", () => this.updateFromFields());
      });
      this.configurePicker();
    }
    render() {
      const detail = this.detail;
      this.shadowRoot.innerHTML = `<style>` + styles17 + `</style><div class="fields" part="fields"><label class="field"><span>Label</span><input data-field="label" value="` + escapeHtml(detail.label || "") + `"></label><label class="field"><span>Value</span><input data-field="value" value="` + escapeHtml(detail.value || "") + `"></label><label class="field"><span>Text icon fallback</span><input data-field="icon" value="` + escapeHtml(detail.icon || "") + `" placeholder="ex: OK"></label><label class="field"><span>Icon asset ID</span><input data-field="iconAssetId" value="` + escapeHtml(detail.iconAssetId || "") + `" placeholder="asset_123"></label> ` + this.pickerMarkup(detail) + ` <label class="field"><span>Icon URL override</span><input data-field="iconUrl" value="` + escapeHtml(detail.iconUrl || "") + `" placeholder="/icons/example.svg"></label><label class="field"><span>Icon alt override</span><input data-field="iconAlt" value="` + escapeHtml(detail.iconAlt || "") + `"></label><label class="field field--wide"><span>Description</span><textarea data-field="description">` + escapeHtml(detail.description || "") + `</textarea></label></div>`;
      this.bind();
    }
  };
  defineUiBaseElement("uib-detail-item-edit", UibDetailItemEdit);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/details/uib-detail-list.js
  var styles18 = `
:host{display:block;color:var(--uib-detail-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.details{display:grid;grid-template-columns:repeat(var(--uib-detail-columns,auto-fit),minmax(var(--uib-detail-min-width,9rem),1fr));gap:var(--uib-detail-gap,.75rem);margin:0;padding:0;list-style:none}uib-detail-item{display:block;min-width:0}
`;
  function parseDetails(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function parseAssetMap(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (!value) return {};
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function cleanDetail2(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }
  var UibDetailList = class extends HTMLElement {
    static get observedAttributes() {
      return ["details", "asset-map"];
    }
    constructor() {
      super();
      this._details = void 0;
      this._assetMap = void 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get details() {
      return Array.isArray(this._details) ? this._details : parseDetails(this.getAttribute("details"));
    }
    set details(value) {
      this._details = Array.isArray(value) ? value : [];
      setOrRemoveAttribute(this, "details", JSON.stringify(this._details));
      if (this.isConnected) this.render();
    }
    get assetMap() {
      return this._assetMap && typeof this._assetMap === "object" ? this._assetMap : parseAssetMap(this.getAttribute("asset-map"));
    }
    set assetMap(value) {
      this._assetMap = value && typeof value === "object" ? value : {};
      setOrRemoveAttribute(this, "asset-map", JSON.stringify(this._assetMap));
      if (this.isConnected) this.render();
    }
    render() {
      const details = this.details;
      const assetMap = this.assetMap;
      const assetMapJson = JSON.stringify(assetMap || {});
      this.shadowRoot.innerHTML = `<style>` + styles18 + `</style><dl class="details" part="list"> ` + details.map((item2, index) => {
        const row = cleanDetail2(item2);
        return `<uib-detail-item
            part="item"
            index="${index}"
            label="${escapeHtml(row.label || "")}"
            value="${escapeHtml(row.value || "")}"
            description="${escapeHtml(row.description || "")}"
            icon="${escapeHtml(row.icon || "")}"
            icon-url="${escapeHtml(row.iconUrl || row.icon_url || row.iconSrc || row.iconHref || row.iconImage || "")}"
            asset-id="${escapeHtml(row.iconAssetId || row.icon_asset_id || row.assetId || row.asset_id || "")}"
            icon-alt="${escapeHtml(row.iconAlt || row.icon_alt || row.alt || "")}"
            asset-map='${escapeHtml(assetMapJson)}'
          ></uib-detail-item>`;
      }).join("") + ` </dl>`;
    }
  };
  defineUiBaseElement("uib-detail-list", UibDetailList);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/details/uib-detail-list-editor.js
  var styles19 = `
:host{display:block;color:var(--uib-detail-editor-color,var(--uib-color-ink,#13294b));font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.editor{display:grid;gap:1rem}.toolbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:.75rem}.title{margin:0;font-size:1rem;line-height:1.2}.hint{margin:.2rem 0 0;color:var(--uib-color-muted,#53657f);font-size:.88rem;line-height:1.45}.rows{display:grid;gap:.85rem}.row{display:grid;gap:.75rem;padding:.85rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:1rem;background:var(--uib-color-surface,#fff)}.actions{display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap}.button{display:inline-flex;align-items:center;justify-content:center;min-height:2.25rem;padding:.48rem .75rem;border:1px solid var(--uib-color-border-strong,#aab8cc);border-radius:999px;background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer;font:inherit;font-weight:850}.button--primary{border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:#fff}.button--danger{border-color:rgba(180,35,42,.35);color:var(--uib-color-danger,#b4232a)}.button:disabled{cursor:not-allowed;opacity:.48}.preview{padding:.75rem;border-radius:1rem;background:var(--uib-color-surface-soft,#f8fbff)}.empty{padding:1rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:1rem;color:var(--uib-color-muted,#53657f);text-align:center}uib-detail-item-edit{display:block}
`;
  function parseDetails2(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function parseObject3(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (!value) return {};
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  function cleanDetail3(value) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const detail = {
      label: String(row.label || ""),
      value: String(row.value || ""),
      icon: String(row.icon || ""),
      iconUrl: String(row.iconUrl || row.icon_url || row.iconSrc || row.iconHref || row.iconImage || ""),
      iconAssetId: String(row.iconAssetId || row.icon_asset_id || row.assetId || row.asset_id || ""),
      iconAlt: String(row.iconAlt || row.icon_alt || row.alt || ""),
      description: String(row.description || "")
    };
    return Object.fromEntries(Object.entries(detail).filter(([, item2]) => item2 !== ""));
  }
  var UibDetailListEditor = class extends HTMLElement {
    static get observedAttributes() {
      return ["details", "label", "asset-map", "use-asset-picker", "application-key", "api-base-url"];
    }
    constructor() {
      super();
      this._details = void 0;
      this.headers = void 0;
      this.getAuthHeaders = void 0;
      this._suppressAttributeRender = false;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected && !this._suppressAttributeRender) this.render();
    }
    get details() {
      return Array.isArray(this._details) ? this._details : parseDetails2(this.getAttribute("details")).map(cleanDetail3);
    }
    set details(value) {
      this._details = Array.isArray(value) ? value.map(cleanDetail3) : [];
      this.syncDetailsAttribute(this._details);
      if (this.isConnected) this.render();
    }
    get assetMap() {
      return parseObject3(this.getAttribute("asset-map"));
    }
    syncDetailsAttribute(details) {
      this._suppressAttributeRender = true;
      setOrRemoveAttribute(this, "details", JSON.stringify(details.map(cleanDetail3)));
      this._suppressAttributeRender = false;
    }
    emitDetailEvent(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    }
    emitChange(extra = {}) {
      const details = this.details.map(cleanDetail3);
      this.emitDetailEvent("change", { oldValue: void 0, newValue: details, details, ...extra });
      this.emitDetailEvent("uib-detail-list-editor-change", { details, ...extra });
    }
    setRows(details, eventType, eventDetail) {
      this._details = details.map(cleanDetail3);
      this.syncDetailsAttribute(this._details);
      this.emitDetailEvent(eventType, { details: this._details, ...eventDetail });
      this.emitChange(eventDetail);
      this.render();
    }
    collectRows() {
      const editors = [...this.shadowRoot.querySelectorAll("uib-detail-item-edit[data-index]")];
      if (!editors.length) return this.details;
      return editors.map((editor) => cleanDetail3(editor.detail || {}));
    }
    updateRow(index, detail) {
      const previous = this.details;
      const next = this.collectRows();
      next[index] = cleanDetail3(detail);
      this._details = next;
      this.syncDetailsAttribute(next);
      this.emitDetailEvent("uib-detail-update", { index, detail: next[index], oldDetail: previous[index], details: next });
      this.emitChange({ index, detail: next[index] });
      this.renderPreviewOnly();
    }
    updateAssetRow(index, detail, assetDetail = {}) {
      const previous = this.details;
      const next = this.collectRows();
      next[index] = cleanDetail3(detail);
      this._details = next;
      this.syncDetailsAttribute(next);
      const eventDetail = {
        index,
        detail: next[index],
        oldDetail: previous[index],
        assetId: next[index]?.iconAssetId || "",
        details: next,
        ...assetDetail
      };
      this.emitDetailEvent("uib-detail-asset-change", eventDetail);
      this.emitDetailEvent("uib-detail-update", eventDetail);
      this.emitChange({ index, detail: next[index], assetId: eventDetail.assetId, sourceEvent: assetDetail.sourceEvent });
      this.renderPreviewOnly();
    }
    addDetail() {
      const next = [...this.collectRows(), { label: "New detail", value: "", iconAssetId: "" }];
      this.setRows(next, "uib-detail-add", { index: next.length - 1, detail: next[next.length - 1] });
    }
    removeDetail(index) {
      const next = this.collectRows();
      const removed = next.splice(index, 1)[0];
      this.setRows(next, "uib-detail-remove", { index, detail: removed });
    }
    moveDetail(index, direction) {
      const next = this.collectRows();
      const target = Math.max(0, Math.min(next.length - 1, index + direction));
      if (target === index) return;
      const [item2] = next.splice(index, 1);
      next.splice(target, 0, item2);
      this.setRows(next, "uib-detail-move", { fromIndex: index, toIndex: target, detail: item2 });
    }
    renderPreviewOnly() {
      const preview = this.shadowRoot.querySelector(".preview");
      if (preview) {
        preview.innerHTML = `<uib-detail-list details='` + escapeHtml(JSON.stringify(this.details)) + `' asset-map='` + escapeHtml(JSON.stringify(this.assetMap)) + `'></uib-detail-list>`;
      }
    }
    rowMarkup(row, index, count) {
      const item2 = cleanDetail3(row);
      const appKey = this.getAttribute("application-key") || "";
      const baseUrl = this.getAttribute("api-base-url") || "";
      const useAssetPicker = this.hasAttribute("use-asset-picker") ? " use-asset-picker" : "";
      return `<article class="row" data-index="` + index + `"><uib-detail-item-edit data-index="` + index + `" index="` + index + `" detail='` + escapeHtml(JSON.stringify(item2)) + `' asset-map='` + escapeHtml(JSON.stringify(this.assetMap)) + `' application-key="` + escapeHtml(appKey) + `" api-base-url="` + escapeHtml(baseUrl) + `" ` + useAssetPicker + ` ></uib-detail-item-edit><div class="actions"><span class="hint">Detail ` + (index + 1) + `</span><span><button class="button" type="button" data-action="move" data-index="` + index + `" data-direction="-1" ` + (index === 0 ? "disabled" : "") + `>Up</button><button class="button" type="button" data-action="move" data-index="` + index + `" data-direction="1" ` + (index === count - 1 ? "disabled" : "") + `>Down</button><button class="button button--danger" type="button" data-action="remove" data-index="` + index + `">Remove</button></span></div></article>`;
    }
    configureItemEditors() {
      this.shadowRoot.querySelectorAll("uib-detail-item-edit[data-index]").forEach((editor) => {
        editor.headers = typeof this.getAuthHeaders === "function" ? this.getAuthHeaders() : this.headers;
        editor.getAuthHeaders = this.getAuthHeaders;
      });
    }
    bind() {
      this.shadowRoot.querySelector('[data-action="add"]')?.addEventListener("click", () => this.addDetail());
      this.shadowRoot.querySelectorAll('[data-action="remove"]').forEach((button) => {
        button.addEventListener("click", () => this.removeDetail(Number(button.getAttribute("data-index") || 0)));
      });
      this.shadowRoot.querySelectorAll('[data-action="move"]').forEach((button) => {
        button.addEventListener("click", () => this.moveDetail(Number(button.getAttribute("data-index") || 0), Number(button.getAttribute("data-direction") || 0)));
      });
      this.shadowRoot.querySelectorAll("uib-detail-item-edit[data-index]").forEach((editor) => {
        editor.addEventListener("uib-detail-item-edit-change", (event) => {
          event.stopPropagation();
          if (event.detail?.field === "iconAssetId" && event.detail?.sourceEvent) return;
          const index = Number(editor.getAttribute("data-index") || 0);
          this.updateRow(index, event.detail?.detail || {});
        });
        editor.addEventListener("uib-detail-item-asset-change", (event) => {
          event.stopPropagation();
          const index = Number(editor.getAttribute("data-index") || 0);
          this.updateAssetRow(index, event.detail?.detail || {}, event.detail || {});
        });
      });
      this.configureItemEditors();
    }
    render() {
      const details = this.details;
      const label = this.getAttribute("label") || "Details";
      this.shadowRoot.innerHTML = `<style> ` + styles19 + ` </style><section class="editor" part="editor"><div class="toolbar"><div><h3 class="title"> ` + escapeHtml(label) + ` </h3><p class="hint"> Edit detail rows with a dedicated detail item editor. Each item editor includes asset selection when asset picking is enabled. </p></div><button class="button button--primary" type="button" data-action="add"> Add detail </button></div><div class="rows"> ` + (details.length ? details.map((row, index) => this.rowMarkup(row, index, details.length)).join("") : '<div class="empty">No details yet.</div>') + ` </div><div class="preview"><uib-detail-list details='` + escapeHtml(JSON.stringify(details)) + `' asset-map='` + escapeHtml(JSON.stringify(this.assetMap)) + `'></uib-detail-list></div></section>`;
      this.bind();
    }
  };
  defineUiBaseElement("uib-detail-list-editor", UibDetailListEditor);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/platform/card-metadata.generated.js
  var CARD_COMPONENT_API = {
    "tagName": "uib-card",
    "package": "@ui-base/ui",
    "maturity": "experimental",
    "purpose": "Repeatable content surface with optional link, action and selection behavior.",
    "attributes": [
      {
        "name": "name",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "name runtime API."
      },
      {
        "name": "label",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "label runtime API."
      },
      {
        "name": "help",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "help runtime API."
      },
      {
        "name": "help-mode",
        "type": "string",
        "default": "tooltip",
        "observed": true,
        "serialization": "string",
        "description": "help-mode runtime API."
      },
      {
        "name": "title",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "title runtime API."
      },
      {
        "name": "disabled",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "disabled runtime API."
      },
      {
        "name": "readonly",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "readonly runtime API."
      },
      {
        "name": "required",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "required runtime API."
      },
      {
        "name": "hidden",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "hidden runtime API."
      },
      {
        "name": "invalid",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "invalid runtime API."
      },
      {
        "name": "error",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "error runtime API."
      },
      {
        "name": "css-class",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "css-class runtime API."
      },
      {
        "name": "aria-label",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "aria-label runtime API."
      },
      {
        "name": "aria-describedby",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "aria-describedby runtime API."
      },
      {
        "name": "heading",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "heading runtime API."
      },
      {
        "name": "variant",
        "type": "string",
        "default": "elevated",
        "observed": true,
        "serialization": "string",
        "enum": [
          "elevated",
          "outlined",
          "flat"
        ],
        "description": "variant runtime API."
      },
      {
        "name": "density",
        "type": "string",
        "default": "comfortable",
        "observed": true,
        "serialization": "string",
        "enum": [
          "comfortable",
          "compact"
        ],
        "description": "density runtime API."
      },
      {
        "name": "href",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "href runtime API."
      },
      {
        "name": "target",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "target runtime API."
      },
      {
        "name": "rel",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "rel runtime API."
      },
      {
        "name": "action",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "action runtime API."
      },
      {
        "name": "action-token",
        "type": "string",
        "default": "",
        "observed": true,
        "serialization": "string",
        "description": "action-token runtime API."
      },
      {
        "name": "interactive",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "interactive runtime API."
      },
      {
        "name": "selectable",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "selectable runtime API."
      },
      {
        "name": "selected",
        "type": "boolean",
        "default": false,
        "observed": true,
        "serialization": "presence",
        "description": "selected runtime API."
      }
    ],
    "properties": [
      {
        "name": "name",
        "type": "string",
        "attribute": "name",
        "writable": true,
        "default": "",
        "description": "name runtime API."
      },
      {
        "name": "label",
        "type": "string",
        "attribute": "label",
        "writable": true,
        "default": "",
        "description": "label runtime API."
      },
      {
        "name": "help",
        "type": "string",
        "attribute": "help",
        "writable": true,
        "default": "",
        "description": "help runtime API."
      },
      {
        "name": "helpMode",
        "type": "string",
        "attribute": "help-mode",
        "writable": true,
        "default": "tooltip",
        "description": "helpMode runtime API."
      },
      {
        "name": "titleText",
        "type": "string",
        "attribute": "title",
        "writable": true,
        "default": "",
        "description": "titleText runtime API."
      },
      {
        "name": "disabled",
        "type": "boolean",
        "attribute": "disabled",
        "writable": true,
        "default": false,
        "description": "disabled runtime API."
      },
      {
        "name": "readonly",
        "type": "boolean",
        "attribute": "readonly",
        "writable": true,
        "default": false,
        "description": "readonly runtime API."
      },
      {
        "name": "required",
        "type": "boolean",
        "attribute": "required",
        "writable": true,
        "default": false,
        "description": "required runtime API."
      },
      {
        "name": "hidden",
        "type": "boolean",
        "attribute": "hidden",
        "writable": true,
        "default": false,
        "description": "hidden runtime API."
      },
      {
        "name": "invalid",
        "type": "boolean",
        "attribute": "invalid",
        "writable": true,
        "default": false,
        "description": "invalid runtime API."
      },
      {
        "name": "error",
        "type": "string",
        "attribute": "error",
        "writable": true,
        "default": "",
        "description": "error runtime API."
      },
      {
        "name": "cssClass",
        "type": "string",
        "attribute": "css-class",
        "writable": true,
        "default": "",
        "description": "cssClass runtime API."
      },
      {
        "name": "ariaLabel",
        "type": "string",
        "attribute": "aria-label",
        "writable": false,
        "default": "",
        "description": "ariaLabel runtime API."
      },
      {
        "name": "ariaDescribedBy",
        "type": "string",
        "attribute": "aria-describedby",
        "writable": false,
        "default": "",
        "description": "ariaDescribedBy runtime API."
      },
      {
        "name": "heading",
        "type": "string",
        "attribute": "heading",
        "writable": false,
        "default": "",
        "fallback": "label",
        "description": "heading runtime API."
      },
      {
        "name": "variant",
        "type": "string",
        "attribute": "variant",
        "writable": false,
        "default": "elevated",
        "normalization": "lowercase-or-default",
        "description": "variant runtime API."
      },
      {
        "name": "density",
        "type": "string",
        "attribute": "density",
        "writable": false,
        "default": "comfortable",
        "normalization": "exact-compact-or-default",
        "description": "density runtime API."
      },
      {
        "name": "href",
        "type": "string",
        "attribute": "href",
        "writable": false,
        "default": "",
        "description": "href runtime API."
      },
      {
        "name": "target",
        "type": "string",
        "attribute": "target",
        "writable": false,
        "default": "",
        "description": "target runtime API."
      },
      {
        "name": "rel",
        "type": "string",
        "attribute": "rel",
        "writable": false,
        "default": "",
        "description": "rel runtime API."
      },
      {
        "name": "action",
        "type": "string",
        "attribute": "action",
        "writable": false,
        "default": "",
        "description": "action runtime API."
      },
      {
        "name": "actionToken",
        "type": "string",
        "attribute": "action-token",
        "writable": false,
        "default": "",
        "description": "actionToken runtime API."
      },
      {
        "name": "interactive",
        "type": "boolean",
        "attribute": "interactive",
        "writable": false,
        "default": false,
        "computedFrom": [
          "interactive",
          "href",
          "action",
          "action-token",
          "selectable"
        ],
        "description": "interactive runtime API."
      },
      {
        "name": "selectable",
        "type": "boolean",
        "attribute": "selectable",
        "writable": false,
        "default": false,
        "description": "selectable runtime API."
      },
      {
        "name": "selected",
        "type": "boolean",
        "attribute": "selected",
        "writable": true,
        "default": false,
        "programmaticSetEmits": false,
        "description": "selected runtime API."
      },
      {
        "name": "componentId",
        "type": "string",
        "writable": false,
        "role": "runtime-instance-id",
        "description": "componentId runtime API."
      }
    ],
    "events": [
      {
        "name": "change",
        "detail": {
          "name": "string",
          "oldValue": "boolean",
          "newValue": "boolean",
          "selected": "boolean"
        },
        "bubbles": true,
        "composed": true,
        "cancelable": false,
        "selectionAliasOf": "uib-card-select",
        "order": 1,
        "type": "",
        "description": "change runtime API."
      },
      {
        "name": "uib-card-select",
        "detail": {
          "name": "string",
          "oldValue": "boolean",
          "newValue": "boolean",
          "selected": "boolean"
        },
        "bubbles": true,
        "composed": true,
        "cancelable": false,
        "order": 2,
        "type": "",
        "description": "uib-card-select runtime API."
      },
      {
        "name": "uib-card-action",
        "detail": {
          "name": "string",
          "action": "string",
          "actionToken": "string",
          "selected": "boolean"
        },
        "bubbles": true,
        "composed": true,
        "cancelable": true,
        "order": 3,
        "cancellation": "prevent-original-event-default-after-selection",
        "type": "",
        "description": "uib-card-action runtime API."
      }
    ],
    "slots": [
      {
        "name": "default",
        "type": "",
        "description": "default runtime API."
      },
      {
        "name": "media",
        "type": "",
        "description": "media runtime API."
      },
      {
        "name": "header",
        "type": "",
        "description": "header runtime API."
      },
      {
        "name": "footer",
        "type": "",
        "description": "footer runtime API."
      }
    ],
    "cssParts": [
      {
        "name": "base",
        "type": "",
        "description": "base runtime API."
      },
      {
        "name": "media",
        "type": "",
        "description": "media runtime API."
      },
      {
        "name": "header",
        "type": "",
        "description": "header runtime API."
      },
      {
        "name": "body",
        "type": "",
        "description": "body runtime API."
      },
      {
        "name": "footer",
        "type": "",
        "description": "footer runtime API."
      }
    ],
    "cssVariables": [
      {
        "name": "--uib-color-ink",
        "type": "",
        "description": "--uib-color-ink runtime API."
      },
      {
        "name": "--uib-font-family-sans",
        "type": "",
        "description": "--uib-font-family-sans runtime API."
      },
      {
        "name": "--uib-color-border",
        "type": "",
        "description": "--uib-color-border runtime API."
      },
      {
        "name": "--uib-radius-lg",
        "type": "",
        "description": "--uib-radius-lg runtime API."
      },
      {
        "name": "--uib-color-surface",
        "type": "",
        "description": "--uib-color-surface runtime API."
      },
      {
        "name": "--uib-color-surface-soft",
        "type": "",
        "description": "--uib-color-surface-soft runtime API."
      },
      {
        "name": "--uib-shadow-sm",
        "type": "",
        "description": "--uib-shadow-sm runtime API."
      },
      {
        "name": "--uib-space-3",
        "type": "",
        "description": "--uib-space-3 runtime API."
      },
      {
        "name": "--uib-space-4",
        "type": "",
        "description": "--uib-space-4 runtime API."
      },
      {
        "name": "--uib-focus-ring",
        "type": "",
        "description": "--uib-focus-ring runtime API."
      },
      {
        "name": "--uib-color-primary",
        "type": "",
        "description": "--uib-color-primary runtime API."
      }
    ],
    "examples": [
      '<uib-card heading="Card" selectable><p>Card body.</p></uib-card>'
    ]
  };

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/metadata/index.js
  var uiAttributeDescriptions = {
    action: "Action identifier included in emitted action events.",
    actions: "JSON array or property value used to render child actions.",
    "action-token": "Stable action token included in emitted action events.",
    active: "Marks the current navigation item.",
    align: "Alignment within the component. Layout primitives use it for cross-axis alignment; content components use it for text alignment.",
    alt: "Accessible alternative text for media.",
    "api-base-url": "Base URL used by asset-picker integrations.",
    "application-key": "Application key passed to asset-picker integrations.",
    "aria-describedby": "ID reference for additional accessible description.",
    "aria-label": "Accessible label override.",
    "asset-id": "Asset identifier used to resolve an icon or image from an asset map.",
    "asset-map": "JSON object mapping asset IDs to URL and alt metadata.",
    body: "Supporting body copy rendered after heading or detail content.",
    breakpoint: "Responsive breakpoint, in pixels, where menu collapse behavior activates.",
    checked: "Boolean checked state.",
    class: "Optional host CSS class.",
    collapsible: "Allows a panel to collapse and expand.",
    "close-label": "Accessible label for the close menu button.",
    "collapse-label": "Accessible label for the collapsed menu button.",
    columns: "Fixed number of grid columns.",
    detail: "JSON detail item object.",
    details: "JSON array of detail item objects.",
    direction: "Flex direction used by stack layout.",
    disabled: "Disables user interaction.",
    density: "Controls component spacing density.",
    error: "Validation or error message.",
    eyebrow: "Small overline text rendered before the main heading, usually for a section label or category.",
    fit: "Media object-fit mode.",
    for: "ID of the control labelled by this label.",
    gap: "CSS gap value between children.",
    heading: "Heading text for layout surfaces, dialogs, accordions, or tabs.",
    headline: "Primary heading text rendered by heading-style components.",
    help: "Help text rendered inline or in a tooltip.",
    "help-mode": "Help display mode.",
    href: "Link URL.",
    icon: "Icon text, symbol, or fallback marker.",
    "icon-alt": "Accessible label for an icon URL or asset.",
    "icon-url": "Direct icon image URL.",
    index: "Item index included in detail editor events.",
    invalid: "Forces invalid visual styling.",
    interactive: "Adds interactive card affordance without requiring a link.",
    justify: "Main-axis alignment for flex layout primitives.",
    kind: "Semantic action kind included in emitted action events.",
    label: "Visible label text.",
    labels: "Comma-separated labels for toggle choices.",
    level: "Heading level from 1 through 6. Sets the rendered h1-h6 tag and default visual scale; invalid values fall back to the component default.",
    min: "Minimum grid item size.",
    mode: "Display mode.",
    name: "Control or event payload name.",
    numbered: "Shows instruction steps as an ordered list.",
    open: "Open state for menus, dialogs, help, and disclosures.",
    position: "Media object-position or splitter column template.",
    ratio: "Aspect ratio for media.",
    readonly: "Prevents user edits while preserving visible state.",
    rel: "Anchor rel attribute.",
    required: "Marks a control or label as required.",
    role: "ARIA role or media presentation role.",
    selectable: "Allows user interaction to toggle selected state.",
    selected: "Marks the component as selected.",
    "show-progress": "Shows progress for instruction steps or state.",
    size: "Visual size variant applied to the selected heading level.",
    src: "Media source URL.",
    stacked: "Stacks action buttons vertically.",
    summary: "Short supporting summary text.",
    target: "Anchor target attribute.",
    text: "Rendered text content.",
    title: "Tooltip/title text.",
    value: "Current control value.",
    variant: "Visual style variant.",
    wrap: "Allows row children to wrap."
  };
  var uiPropertyDescriptions = {
    actions: "Gets or sets the rendered action array.",
    assetMap: "Gets or sets the asset ID lookup map.",
    checked: "Gets or sets boolean checked state.",
    detail: "Gets or sets the detail item object.",
    details: "Gets or sets the detail item array.",
    disabled: "Gets or sets the disabled state.",
    getAuthHeaders: "Optional callback used by asset-picker integrations.",
    headers: "Optional request headers used by asset-picker integrations.",
    open: "Gets or sets open state.",
    selected: "Gets or sets selected state.",
    value: "Gets or sets the current value."
  };
  var uiEventDescriptions = {
    change: "Native-style change event that bubbles from interactive controls.",
    "uib-accordion-toggle": "Fires when the accordion disclosure state changes.",
    "uib-action": "Generic action event fired by action buttons and groups.",
    "uib-action-button-click": "Cancelable action-button click event with action metadata.",
    "uib-card-action": "Fires when an actionable card is activated.",
    "uib-card-select": "Fires when a selectable card toggles selected state.",
    "uib-checkbox-change": "Component-specific checkbox change event.",
    "uib-detail-add": "Fires when a detail row is added.",
    "uib-detail-asset-change": "Fires when a detail icon asset changes.",
    "uib-detail-item-edit-change": "Fires when one editable detail row changes.",
    "uib-detail-list-editor-change": "Fires when the editable detail list changes.",
    "uib-detail-remove": "Fires when a detail row is removed.",
    "uib-detail-update": "Fires when a detail row is updated.",
    "uib-dialog-close": "Fires when a dialog closes.",
    "uib-instruction-toggle": "Fires when a collapsible instruction opens or closes.",
    "uib-menu-select": "Fires when a menu item selection bubbles to the menu.",
    "uib-menuitem-select": "Fires when a menu item is selected.",
    "uib-panel-toggle": "Fires when a collapsible panel opens or closes.",
    "uib-toggle-change": "Component-specific toggle change event."
  };
  var uiSlotDescriptions = {
    body: "Custom body content.",
    default: "Primary child content.",
    end: "End pane content.",
    eyebrow: "Custom eyebrow content.",
    footer: "Footer content.",
    header: "Header content.",
    headline: "Custom headline content.",
    label: "Custom label content.",
    media: "Card media content.",
    start: "Start pane content.",
    step: "Instruction step content.",
    subheadline: "Custom subheadline content.",
    summary: "Custom accordion summary content."
  };
  var uiPartDescriptions = {
    backdrop: "Dialog backdrop.",
    actions: "Action area wrapper.",
    base: "Outer component container.",
    body: "Body content wrapper.",
    button: "Button element or button-like control.",
    closeButton: "Dialog close button.",
    close: "Dialog close button.",
    content: "Content wrapper.",
    control: "Interactive control wrapper.",
    editor: "Detail editor wrapper.",
    error: "Error message.",
    fallback: "Fallback media state.",
    field: "Field wrapper.",
    fields: "Editable fields wrapper.",
    footer: "Footer wrapper.",
    group: "Action group wrapper.",
    header: "Header wrapper.",
    help: "Help text or help trigger.",
    hint: "Hint text.",
    input: "Native input element.",
    item: "List or menu item.",
    items: "Menu item collection.",
    label: "Label text.",
    link: "Anchor element.",
    list: "List wrapper.",
    media: "Rendered media element.",
    nav: "Navigation wrapper.",
    panel: "Dialog or tab panel.",
    "pane-end": "Splitter end pane.",
    "pane-start": "Splitter start pane.",
    segmentedControl: "Toggle segmented control.",
    "segmented-control": "Toggle segmented control.",
    submenu: "Submenu wrapper.",
    summary: "Accordion summary row.",
    tab: "Tab element.",
    tablist: "Tab list wrapper.",
    text: "Text wrapper.",
    tooltip: "Tooltip wrapper.",
    toggle: "Collapse or expand toggle.",
    value: "Value text."
  };
  var cssVariableDescriptions = {
    "--uib-action-bg": "Action button background.",
    "--uib-action-border": "Action button border.",
    "--uib-action-color": "Action button text color.",
    "--uib-action-group-gap": "Gap between grouped actions.",
    "--uib-action-min-height": "Minimum action button height.",
    "--uib-action-padding": "Action button padding.",
    "--uib-action-radius": "Action button border radius.",
    "--uib-action-shadow": "Action button shadow.",
    "--uib-color-border": "Default border color.",
    "--uib-color-border-strong": "Strong border color.",
    "--uib-color-danger": "Danger/destructive color.",
    "--uib-color-ink": "Primary text color.",
    "--uib-color-muted": "Muted text color.",
    "--uib-color-primary": "Primary accent color.",
    "--uib-color-primary-contrast": "Text color on primary backgrounds.",
    "--uib-color-surface": "Default surface color.",
    "--uib-color-surface-soft": "Subtle surface color.",
    "--uib-focus-ring": "Focus ring shadow.",
    "--uib-instruction-accent-width": "Instruction accent border width.",
    "--uib-instruction-bg": "Instruction background.",
    "--uib-instruction-body-width": "Instruction body maximum readable width.",
    "--uib-instruction-border": "Instruction border color.",
    "--uib-instruction-color": "Instruction foreground color.",
    "--uib-instruction-heading-color": "Instruction heading color.",
    "--uib-instruction-heading-size": "Instruction heading font size.",
    "--uib-instruction-marker-color": "Instruction marker text color.",
    "--uib-instruction-muted": "Instruction supporting text color.",
    "--uib-instruction-radius": "Instruction border radius.",
    "--uib-instruction-shadow": "Instruction shadow.",
    "--uib-instruction-summary-width": "Instruction summary maximum readable width.",
    "--uib-radius-lg": "Large radius token.",
    "--uib-radius-md": "Medium radius token.",
    "--uib-radius-pill": "Pill radius token.",
    "--uib-rich-text-block-gap": "Vertical spacing between rich text blocks.",
    "--uib-rich-text-color": "Rich text foreground color.",
    "--uib-rich-text-font-size": "Rich text base font size.",
    "--uib-rich-text-heading-color": "Rich text heading color.",
    "--uib-rich-text-line-height": "Rich text line height.",
    "--uib-rich-text-link-color": "Rich text link color.",
    "--uib-rich-text-muted": "Muted rich text color for supporting text.",
    "--uib-rich-text-quote-border": "Rich text blockquote border color.",
    "--uib-rich-text-width": "Maximum readable line width.",
    "--uib-shadow-lg": "Large shadow token.",
    "--uib-shadow-sm": "Small shadow token.",
    "--uib-space-3": "Small layout gap.",
    "--uib-space-4": "Default layout gap.",
    "--uib-z-index-modal": "Modal z-index."
  };
  function item(name, descriptions, type = "") {
    return { name, type, description: descriptions[name] || `${name} API surface.` };
  }
  function items(names = [], descriptions = {}, type = "") {
    return names.map((name) => item(name, descriptions, type));
  }
  function api({
    tagName,
    purpose,
    maturity = MATURITY_LEVELS.PREVIEW,
    attributes = [],
    properties = [],
    events = [],
    slots = [],
    cssParts = [],
    cssVariables = [],
    examples = []
  }) {
    return {
      tagName,
      package: "@ui-base/ui",
      maturity,
      purpose,
      attributes: items(attributes, uiAttributeDescriptions),
      properties: items(properties, uiPropertyDescriptions),
      events: items(events, uiEventDescriptions),
      slots: items(slots, uiSlotDescriptions),
      cssParts: items(cssParts, uiPartDescriptions),
      cssVariables: items(cssVariables, cssVariableDescriptions),
      examples
    };
  }
  var UI_COMPONENT_API = {
    "uib-toggle": api({
      tagName: "uib-toggle",
      purpose: "Compact nullable boolean segmented control.",
      attributes: ["name", "value", "required", "labels", "label", "help", "help-mode", "disabled", "readonly", "invalid", "error", "aria-label", "aria-describedby"],
      properties: ["value", "disabled"],
      events: ["change", "uib-toggle-change"],
      slots: ["label"],
      cssParts: ["field", "label", "control", "segmented-control", "button", "error"],
      cssVariables: ["--uib-color-primary", "--uib-color-border", "--uib-focus-ring"],
      examples: ['<uib-toggle name="published" label="Published" help="Use N/A when unknown."></uib-toggle>']
    }),
    "uib-checkbox": api({
      tagName: "uib-checkbox",
      purpose: "Boolean checkbox control.",
      attributes: ["name", "value", "checked", "label", "help", "hint", "disabled", "readonly", "invalid", "error"],
      properties: ["value", "checked", "disabled"],
      events: ["change", "uib-checkbox-change"],
      slots: ["default"],
      cssParts: ["field", "input", "content", "label", "hint", "error"],
      cssVariables: ["--uib-color-primary", "--uib-color-border", "--uib-focus-ring"],
      examples: ['<uib-checkbox name="confirmed" label="Confirmed"></uib-checkbox>']
    }),
    "uib-label": api({
      tagName: "uib-label",
      purpose: "Plain or form-associated accessible label with optional help.",
      attributes: ["for", "text", "help", "help-mode", "title", "required", "accessible-text", "class"],
      slots: ["default"],
      cssParts: ["label"],
      examples: ['<uib-label text="Field label" help="Helpful context" required></uib-label>']
    }),
    "uib-help": api({
      tagName: "uib-help",
      purpose: "Tooltip or inline help content.",
      attributes: ["text", "mode", "open", "label"],
      properties: ["open"],
      slots: ["default"],
      cssParts: ["base", "button", "tooltip", "inline", "text"],
      examples: ['<uib-help text="Helpful context appears here."></uib-help>']
    }),
    "uib-menu": api({
      tagName: "uib-menu",
      purpose: "Responsive site navigation container with hamburger behavior.",
      attributes: ["label", "breakpoint", "open", "collapse-label", "close-label"],
      properties: ["open"],
      events: ["uib-menu-select"],
      slots: ["default"],
      cssParts: ["base", "toggle", "nav", "items"],
      examples: ['<uib-menu label="Primary"><uib-menuitem href="/ui/">UI</uib-menuitem></uib-menu>']
    }),
    "uib-menuitem": api({
      tagName: "uib-menuitem",
      purpose: "Navigation link or submenu trigger. Child menu items create dropdowns.",
      attributes: ["href", "target", "rel", "label", "active", "open", "disabled"],
      properties: ["open", "disabled"],
      events: ["uib-menuitem-select", "uib-menu-select"],
      slots: ["default"],
      cssParts: ["item", "link", "button", "submenu", "label"],
      examples: ['<uib-menuitem href="/ui/" active>UI</uib-menuitem>']
    }),
    "uib-stack": api({
      tagName: "uib-stack",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Flex stack layout primitive.",
      attributes: ["gap", "direction", "align", "justify"],
      slots: ["default"],
      cssParts: ["base"],
      cssVariables: ["--uib-space-3"],
      examples: ['<uib-stack gap="0.75rem"><button>Primary</button><button>Secondary</button></uib-stack>']
    }),
    "uib-grid": api({
      tagName: "uib-grid",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Responsive grid layout primitive.",
      attributes: ["columns", "min", "gap"],
      slots: ["default"],
      cssParts: ["base"],
      cssVariables: ["--uib-space-4"],
      examples: ['<uib-grid min="8rem"><span>One</span><span>Two</span></uib-grid>']
    }),
    "uib-row": api({
      tagName: "uib-row",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Horizontal flex row layout primitive.",
      attributes: ["gap", "align", "justify", "wrap"],
      slots: ["default"],
      cssParts: ["base"],
      examples: ["<uib-row wrap><span>Row A</span><span>Row B</span></uib-row>"]
    }),
    "uib-column": api({
      tagName: "uib-column",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Vertical flex column layout primitive.",
      attributes: ["gap", "align", "justify"],
      slots: ["default"],
      cssParts: ["base"],
      examples: ["<uib-column><span>Column A</span><span>Column B</span></uib-column>"]
    }),
    "uib-panel": api({
      tagName: "uib-panel",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Structural panel region with header, actions, body, footer, and optional collapse behavior.",
      attributes: ["label", "heading", "variant", "density", "collapsible", "open", "disabled"],
      properties: ["open", "disabled"],
      events: ["change", "uib-panel-toggle"],
      slots: ["default", "header", "actions", "footer"],
      cssParts: ["base", "header", "actions", "body", "footer", "content", "toggle"],
      examples: ['<uib-panel label="Panel fixture" collapsible open><button slot="actions">Edit</button><p>Panel body.</p><span slot="footer">Footer</span></uib-panel>']
    }),
    "uib-card": CARD_COMPONENT_API,
    "uib-dialog": api({
      tagName: "uib-dialog",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Modal dialog shell.",
      attributes: ["open", "heading", "label"],
      properties: ["open"],
      events: ["uib-dialog-close"],
      slots: ["default", "header", "footer"],
      cssParts: ["backdrop", "panel", "header", "body", "footer", "close-button"],
      cssVariables: ["--uib-z-index-modal", "--uib-shadow-lg"],
      examples: ['<uib-dialog heading="Fixture dialog" open><p>Dialog body content.</p></uib-dialog>']
    }),
    "uib-accordion": api({
      tagName: "uib-accordion",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Disclosure section with summary and body.",
      attributes: ["open", "heading", "label"],
      events: ["uib-accordion-toggle"],
      slots: ["default", "summary"],
      cssParts: ["base", "summary", "body"],
      examples: ['<uib-accordion heading="Accordion fixture"><p>Accordion body.</p></uib-accordion>']
    }),
    "uib-tabs": api({
      tagName: "uib-tabs",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Coordinated tab list with keyboard navigation and paired tab panels.",
      attributes: ["selected", "orientation", "name"],
      events: ["change", "uib-tabs-change"],
      slots: ["tab", "panel"],
      cssParts: ["base", "tablist", "panels"],
      examples: ['<uib-tabs selected="0"><uib-tab>Details</uib-tab><uib-tab>History</uib-tab><uib-tab-panel>Details content.</uib-tab-panel><uib-tab-panel>History content.</uib-tab-panel></uib-tabs>']
    }),
    "uib-tab": api({
      tagName: "uib-tab",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Focusable tab item managed by uib-tabs.",
      attributes: ["disabled", "aria-disabled"],
      slots: ["default"],
      examples: ["<uib-tab>Details</uib-tab>"]
    }),
    "uib-tab-panel": api({
      tagName: "uib-tab-panel",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Tab panel paired by direct-child order with uib-tab.",
      attributes: ["hidden"],
      slots: ["default"],
      examples: ["<uib-tab-panel>Details content.</uib-tab-panel>"]
    }),
    "uib-splitter": api({
      tagName: "uib-splitter",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      purpose: "Two-pane splitter layout primitive.",
      attributes: ["position"],
      slots: ["default", "start", "end"],
      cssParts: ["base", "pane-start", "pane-end"],
      examples: ['<uib-splitter><div slot="start">Start pane</div><div slot="end">End pane</div></uib-splitter>']
    }),
    "uib-eyebrow": api({
      tagName: "uib-eyebrow",
      purpose: "Small section label or overline text.",
      attributes: ["text"],
      slots: ["default"],
      cssParts: ["eyebrow"],
      examples: ['<uib-eyebrow text="Developer docs"></uib-eyebrow>']
    }),
    "uib-heading": api({
      tagName: "uib-heading",
      purpose: "Reusable h1-h6 heading renderer with level, size, and alignment controls.",
      attributes: ["text", "heading", "level", "size", "align"],
      slots: ["default"],
      cssParts: ["heading"],
      examples: ['<uib-heading text="Reusable heading" level="2" size="compact"></uib-heading>']
    }),
    "uib-heading-block": api({
      tagName: "uib-heading-block",
      purpose: "Reusable heading group that composes uib-heading with eyebrow, subheadline, and body content.",
      attributes: ["eyebrow", "headline", "subheadline", "body", "level", "size", "align"],
      slots: ["eyebrow", "headline", "subheadline", "body"],
      cssParts: ["base", "eyebrow", "headline", "subheadline", "body"],
      examples: ['<uib-heading-block eyebrow="Section" headline="Heading block" subheadline="Reusable content heading." body="Parent pages own the state."></uib-heading-block>']
    }),
    "uib-instruction": api({
      tagName: "uib-instruction",
      purpose: "Instructional content block with variants, optional details/summary collapse, dynamic slotted steps, actions, and progress state.",
      attributes: ["name", "label", "heading", "summary", "variant", "icon", "density", "collapsible", "open", "numbered", "complete", "current", "show-progress", "disabled", "aria-label", "aria-describedby"],
      properties: ["open", "disabled"],
      events: ["change", "uib-instruction-toggle"],
      slots: ["default", "summary", "step", "actions", "footer"],
      cssParts: ["base", "summary", "marker", "header", "title", "status", "description", "body", "content", "steps", "step-list", "progress", "actions", "footer"],
      cssVariables: ["--uib-instruction-color", "--uib-instruction-bg", "--uib-instruction-border", "--uib-instruction-accent-width", "--uib-instruction-radius", "--uib-instruction-shadow", "--uib-instruction-heading-color", "--uib-instruction-heading-size", "--uib-instruction-marker-color", "--uib-instruction-muted", "--uib-instruction-summary-width", "--uib-instruction-body-width"],
      examples: ['<uib-instruction heading="Before you publish" summary="Complete each required setup step." variant="tip" collapsible open numbered><p>Use this block for procedural guidance.</p><li slot="step" complete>Review required fields.</li><li slot="step" current>Preview the page.</li><uib-action-button slot="actions" label="Preview" variant="primary"></uib-action-button></uib-instruction>']
    }),
    "uib-rich-text": api({
      tagName: "uib-rich-text",
      purpose: "Readable rich text container for sanitized slotted content or the html property, with safe external link defaults.",
      properties: ["html"],
      slots: ["default"],
      cssParts: ["base", "content"],
      cssVariables: ["--uib-rich-text-color", "--uib-rich-text-font-size", "--uib-rich-text-line-height", "--uib-rich-text-width", "--uib-rich-text-block-gap", "--uib-rich-text-heading-color", "--uib-rich-text-link-color", "--uib-rich-text-muted", "--uib-rich-text-quote-border"],
      examples: ["<uib-rich-text><p><strong>Reservations are required.</strong> Book up to 30 days in advance.</p></uib-rich-text>"]
    }),
    "uib-action-button": api({
      tagName: "uib-action-button",
      purpose: "Single action rendered as a button or link.",
      attributes: ["label", "href", "action", "action-token", "variant", "kind", "disabled", "target", "rel", "icon"],
      properties: ["disabled"],
      events: ["uib-action-button-click", "uib-action"],
      slots: ["default"],
      cssParts: ["button"],
      cssVariables: ["--uib-action-bg", "--uib-action-border", "--uib-action-color", "--uib-action-min-height", "--uib-action-padding", "--uib-action-radius", "--uib-action-shadow"],
      examples: ['<uib-action-button label="Run action" action-token="RUN_ACTION" variant="primary"></uib-action-button>']
    }),
    "uib-action-group": api({
      tagName: "uib-action-group",
      purpose: "Renders an ordered group of action buttons from a JSON array or property.",
      attributes: ["actions", "align", "stacked"],
      properties: ["actions"],
      events: ["uib-action-button-click", "uib-action"],
      slots: ["default"],
      cssParts: ["group"],
      cssVariables: ["--uib-action-group-gap"],
      examples: [`<uib-action-group actions='[{"label":"Save","variant":"primary","actionToken":"SAVE"},{"label":"Cancel","variant":"secondary","actionToken":"CANCEL"}]'></uib-action-group>`]
    }),
    "uib-media": api({
      tagName: "uib-media",
      purpose: "Safe image/media presenter with fit, ratio, alt text, and fallback handling.",
      attributes: ["src", "alt", "fit", "ratio", "position", "role", "fallback-label"],
      cssParts: ["media", "fallback"],
      examples: ['<uib-media src="/apps/demo/assets/icons/availability.svg" alt="Availability" fit="contain" ratio="16:9"></uib-media>']
    }),
    "uib-detail-item": api({
      tagName: "uib-detail-item",
      purpose: "Displays one label/value detail item with optional icon metadata.",
      attributes: ["label", "value", "description", "icon", "asset-id", "icon-url", "icon-alt", "asset-map", "detail"],
      properties: ["detail", "assetMap"],
      cssParts: ["item", "label", "value", "description"],
      examples: ['<uib-detail-item label="Duration" value="60 minutes" icon="60"></uib-detail-item>']
    }),
    "uib-detail-item-edit": api({
      tagName: "uib-detail-item-edit",
      purpose: "Edits one detail item, including asset-backed icon fields.",
      attributes: ["detail", "label", "asset-map", "use-asset-picker", "application-key", "api-base-url", "index"],
      properties: ["detail", "headers", "getAuthHeaders"],
      events: ["change", "uib-detail-item-edit-change", "uib-detail-asset-change"],
      cssParts: ["fields"],
      examples: [`<uib-detail-item-edit index="0" detail='{"label":"Duration","value":"60 minutes","icon":"60"}'></uib-detail-item-edit>`]
    }),
    "uib-detail-list": api({
      tagName: "uib-detail-list",
      purpose: "Displays label/value/detail rows with text, URL, or asset-backed icons.",
      attributes: ["details", "asset-map"],
      properties: ["details", "assetMap"],
      cssParts: ["list", "item", "label", "value"],
      examples: [`<uib-detail-list details='[{"label":"Duration","value":"60 minutes","icon":"60"}]'></uib-detail-list>`]
    }),
    "uib-detail-list-editor": api({
      tagName: "uib-detail-list-editor",
      purpose: "Editable detail-row authoring component that emits clean detail arrays.",
      attributes: ["details", "asset-map", "label", "use-asset-picker", "application-key", "api-base-url"],
      properties: ["details", "assetMap"],
      events: ["uib-detail-add", "uib-detail-update", "uib-detail-asset-change", "uib-detail-remove", "uib-detail-list-editor-change"],
      cssParts: ["editor"],
      examples: [`<uib-detail-list-editor label="Editable details" details='[{"label":"Duration","value":"60 minutes","icon":"60"}]'></uib-detail-list-editor>`]
    })
  };
  var UI_BASE_UI_COMPONENTS = Object.values(UI_COMPONENT_API).map((componentApi) => createComponentMetadata({
    ...componentApi,
    attributes: componentApi.attributes.map((item2) => item2.name),
    properties: componentApi.properties.map((item2) => item2.name),
    events: componentApi.events.map((item2) => item2.name),
    slots: componentApi.slots.map((item2) => item2.name),
    cssParts: componentApi.cssParts.map((item2) => item2.name),
    cssVariables: componentApi.cssVariables.map((item2) => item2.name)
  }));

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/asset-core.js
  var ASSET_FILE_TYPES = [
    "image",
    "svg",
    "icon",
    "video",
    "audio",
    "pdf",
    "document",
    "json",
    "component_config",
    "external_url",
    "other"
  ];
  var ASSET_SCOPES = ["application", "shared", "global"];
  var ASSET_VISIBILITIES = ["public", "application_private", "shared_private", "global_private", "admin_only"];
  var DEFAULT_ASSET_UPLOAD_POLICY = {
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "application/pdf",
      "application/json",
      "text/plain"
    ],
    maxFileSizeBytes: 10 * 1024 * 1024,
    allowExternalUrl: true,
    allowJsonAsset: true,
    allowSvg: true,
    allowComponentConfig: true
  };
  var EMPTY_ASSET_PERMISSIONS = {
    canView: false,
    canSelect: false,
    canDownload: false,
    canCopyToApp: false,
    canCreate: false,
    canEditMetadata: false,
    canReplaceFile: false,
    canUploadNewVersion: false,
    canSubmitForReview: false,
    canApproveVersion: false,
    canRejectVersion: false,
    canArchive: false,
    canRestore: false,
    canHardDelete: false,
    canViewUsage: false,
    canManagePermissions: false
  };
  var MANAGER_ASSET_PERMISSIONS = Object.fromEntries(
    Object.keys(EMPTY_ASSET_PERMISSIONS).map((key) => [key, true])
  );
  var VIEWER_ASSET_PERMISSIONS = {
    ...EMPTY_ASSET_PERMISSIONS,
    canView: true,
    canSelect: true,
    canDownload: true,
    canViewUsage: true
  };
  var baseAssetStyles = `
  :host {
    --uib-assets-text: var(--uib-color-ink, #13294b);
    --uib-assets-muted: var(--uib-color-muted, #53657f);
    --uib-assets-surface: var(--uib-color-surface, #ffffff);
    --uib-assets-surface-soft: var(--uib-color-surface-soft, #f8fbff);
    --uib-assets-surface-tint: var(--uib-color-surface-tint, #eaf2fc);
    --uib-assets-border: var(--uib-color-border, #d9e2f0);
    --uib-assets-border-strong: var(--uib-color-border-strong, #aab8cc);
    --uib-assets-primary: var(--uib-color-primary, #174a8b);
    --uib-assets-primary-hover: var(--uib-color-primary-hover, #0b2f63);
    --uib-assets-primary-contrast: var(--uib-color-primary-contrast, #ffffff);
    --uib-assets-accent: var(--uib-color-accent, #f4bd46);
    --uib-assets-danger: var(--uib-color-danger, #b4232a);
    --uib-assets-warning: var(--uib-color-warning, #9f6500);
    --uib-assets-success: var(--uib-color-success, #2e7d32);
    --uib-assets-radius: var(--uib-radius-lg, 1rem);
    --uib-assets-radius-sm: var(--uib-radius-md, 0.75rem);
    --uib-assets-shadow: var(--uib-shadow-sm, 0 6px 18px rgba(10, 31, 68, 0.08));
    display: block;
    color: var(--uib-assets-text);
    font-family: var(--uib-font-family-sans, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  }

  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }

  .asset-card {
    border: 1px solid var(--uib-assets-border);
    border-radius: var(--uib-assets-radius);
    background: var(--uib-assets-surface);
    box-shadow: var(--uib-assets-shadow);
  }

  .surface-soft {
    border: 1px solid var(--uib-assets-border);
    border-radius: var(--uib-assets-radius-sm);
    background: var(--uib-assets-surface-soft);
  }

  .stack { display: grid; gap: 0.85rem; }
  .stack-sm { display: grid; gap: 0.5rem; }
  .row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
  .row-between { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
  .muted { color: var(--uib-assets-muted); }
  .small { font-size: 0.86rem; }
  .tiny { font-size: 0.76rem; }
  .title { margin: 0; color: var(--uib-assets-text); font-size: 1.1rem; line-height: 1.15; letter-spacing: -0.02em; }
  .subtitle { margin: 0.2rem 0 0; color: var(--uib-assets-muted); line-height: 1.45; }

  button,
  .asset-button,
  input,
  select,
  textarea { font: inherit; }

  button,
  .asset-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.35rem;
    padding: 0.58rem 0.85rem;
    border: 1px solid var(--uib-assets-border-strong);
    border-radius: 999px;
    background: var(--uib-assets-surface);
    color: var(--uib-assets-text);
    cursor: pointer;
    font-weight: 850;
    text-decoration: none;
  }

  button:hover,
  .asset-button:hover { border-color: var(--uib-assets-primary); color: var(--uib-assets-primary); }
  button.primary,
  .asset-button.primary { border-color: var(--uib-assets-primary); background: var(--uib-assets-primary); color: var(--uib-assets-primary-contrast); }
  button.primary:hover,
  .asset-button.primary:hover { border-color: var(--uib-assets-primary-hover); background: var(--uib-assets-primary-hover); color: var(--uib-assets-primary-contrast); }
  button.danger { border-color: rgba(180, 35, 42, 0.35); color: var(--uib-assets-danger); }
  button:disabled { cursor: not-allowed; opacity: 0.48; }

  input,
  select,
  textarea {
    width: 100%;
    min-height: 2.45rem;
    border: 1px solid var(--uib-assets-border);
    border-radius: 0.75rem;
    padding: 0.65rem 0.75rem;
    background: var(--uib-assets-surface);
    color: var(--uib-assets-text);
  }

  textarea { min-height: 7rem; resize: vertical; }
  label { display: grid; gap: 0.35rem; color: var(--uib-assets-muted); font-size: 0.85rem; font-weight: 850; }

  :is(button, input, select, textarea, [tabindex]):focus-visible {
    outline: none;
    box-shadow: var(--uib-focus-ring, 0 0 0 4px rgba(23, 74, 139, 0.25));
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 1.55rem;
    padding: 0.22rem 0.5rem;
    border: 1px solid var(--uib-assets-border);
    border-radius: 999px;
    background: var(--uib-assets-surface-soft);
    color: var(--uib-assets-muted);
    font-size: 0.74rem;
    font-weight: 850;
    line-height: 1;
    white-space: nowrap;
  }

  .badge.strong { background: var(--uib-assets-surface-tint); color: var(--uib-assets-primary); border-color: rgba(23, 74, 139, 0.18); }
  .badge.warning { background: #fff7e6; color: var(--uib-assets-warning); border-color: rgba(159, 101, 0, 0.28); }
  .badge.success { background: #edf8ee; color: var(--uib-assets-success); border-color: rgba(46, 125, 50, 0.25); }
  .badge.danger { background: #fff1f1; color: var(--uib-assets-danger); border-color: rgba(180, 35, 42, 0.25); }

  .data-table { width: 100%; border-collapse: collapse; }
  .data-table th,
  .data-table td { padding: 0.75rem; border-bottom: 1px solid var(--uib-assets-border); text-align: left; vertical-align: top; }
  .data-table th { color: var(--uib-assets-muted); font-size: 0.76rem; letter-spacing: 0.04em; text-transform: uppercase; }
  .data-table tbody tr { cursor: pointer; }
  .data-table tbody tr:hover { background: var(--uib-assets-surface-soft); }
  .data-table tbody tr[aria-selected="true"] { background: var(--uib-assets-surface-tint); }

  .empty-state {
    padding: 1.25rem;
    border: 1px dashed var(--uib-assets-border-strong);
    border-radius: var(--uib-assets-radius-sm);
    background: var(--uib-assets-surface-soft);
    color: var(--uib-assets-muted);
    text-align: center;
  }

  .restricted {
    color: var(--uib-assets-muted);
    font-style: italic;
  }

  .code-block {
    overflow: auto;
    padding: 0.85rem;
    border-radius: 0.75rem;
    background: #061528;
    color: #dce9ff;
    font-family: var(--uib-font-family-mono, Consolas, monospace);
    font-size: 0.84rem;
    line-height: 1.5;
  }
`;
  function escapeHtml2(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }
  function parseJson(value, fallback = null) {
    if (value === void 0 || value === null || value === "") return fallback;
    try {
      return JSON.parse(String(value));
    } catch {
      return fallback;
    }
  }
  function boolFromAttribute(value, defaultValue = false) {
    if (value === null || value === void 0) return defaultValue;
    return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
  }
  function humanize(value) {
    return String(value || "").replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  function normalizeAsset(asset) {
    const shaped = asset && typeof asset === "object" ? asset : {};
    const source = shaped?.storageRecord || shaped?.record ? { ...shaped.storageRecord || {}, ...shaped.record || {}, ...shaped.asset || {} } : asset?.record || asset?.asset || asset || {};
    const hasPermissionPayload = source.permissions && typeof source.permissions === "object";
    const permissions = hasPermissionPayload ? { ...EMPTY_ASSET_PERMISSIONS, ...source.permissions } : { ...VIEWER_ASSET_PERMISSIONS };
    const fileType = source.fileType || source.assetType || source.asset_type || source.type || "other";
    const publicUrl = source.publicUrl || source.public_url || source.url || "";
    const downloadUrl = source.downloadUrl || source.download_url || "";
    const primaryUrl = publicUrl || downloadUrl;
    const category = source.category || source.categoryKey || source.category_key || "";
    const listFromValue = (value) => {
      if (Array.isArray(value)) return value;
      const parsed = parseJson(value, null);
      if (Array.isArray(parsed)) return parsed;
      if (typeof value === "string") return value.split(",").map((item2) => item2.trim()).filter(Boolean);
      return [];
    };
    const parsedCategories = [
      ...listFromValue(source.categories),
      ...listFromValue(source.categoriesJson),
      ...listFromValue(source.categories_json),
      ...listFromValue(source.tags)
    ];
    const tags = listFromValue(source.tags);
    const categories = Array.from(new Set([category, ...parsedCategories].filter(Boolean)));
    const applicationId = source.applicationId || source.application_id || source.applicationKey || source.application_key || "";
    const ownerApplicationKey = source.ownerApplicationKey || source.owner_application_key || applicationId;
    const scope = source.scope || source.reuseScope || source.reuse_scope || "application";
    const visibility = source.visibility || source.assetVisibility || source.asset_visibility || (source.isPublic === true || source.is_public === true ? "public" : "application_private");
    return {
      id: source.id || source.assetId || source.asset_id || "",
      key: source.key || source.assetKey || source.asset_key || source.id || source.assetId || source.asset_id || "",
      name: source.name || source.displayName || source.display_name || source.fileName || source.originalFileName || source.original_file_name || source.key || source.assetKey || source.asset_key || "Untitled asset",
      description: source.description || "",
      fileName: source.fileName || source.originalFileName || source.original_file_name || "",
      fileType,
      assetType: fileType,
      mimeType: source.mimeType || source.mime_type || "",
      sourceType: source.sourceType || source.source_type || "local_file",
      url: primaryUrl,
      publicUrl,
      downloadUrl,
      thumbnailUrl: source.thumbnailUrl || source.thumbnail_url || source.previewUrl || source.preview_url || primaryUrl,
      categories,
      category: category || categories[0] || "",
      tags,
      folderPath: source.folderPath || source.folder_path || "",
      scope,
      reuseScope: scope,
      visibility,
      assetVisibility: visibility,
      applicationId,
      applicationKey: applicationId,
      ownerApplicationKey,
      ownerId: source.ownerId || source.owner_id || source.createdBy || source.created_by || "",
      permissionSetKey: source.permissionSetKey || source.permission_set_key || "application-asset-manager",
      parentRecordId: source.parentRecordId || source.parent_record_id || "",
      parentRecordType: source.parentRecordType || source.parent_record_type || "",
      currentVersionId: source.currentVersionId || source.current_version_id || source.versionId || source.version_id || "",
      currentVersionNumber: Number(source.currentVersionNumber || source.current_version_number || source.assetVersion || source.asset_version || 1),
      isActive: source.isActive !== void 0 ? Boolean(source.isActive) : source.is_active !== false,
      archivedAt: source.archivedAt || source.archived_at || source.dateDeleted || source.date_deleted || "",
      archivedBy: source.archivedBy || source.archived_by || source.deletedBy || source.deleted_by || "",
      lastUpdatedAt: source.lastUpdatedAt || source.last_updated_at || source.updatedAt || source.dateUpdated || source.date_updated || "",
      createdAt: source.createdAt || source.created_at || source.dateCreated || source.date_created || "",
      updatedAt: source.updatedAt || source.updated_at || source.dateUpdated || source.date_updated || "",
      fileSizeBytes: Number(source.fileSizeBytes || source.file_size_bytes || 0),
      checksumSha256: source.checksumSha256 || source.checksum_sha256 || "",
      storagePath: source.storagePath || source.storage_path || "",
      altText: source.altText || source.alt_text || source.alt || "",
      caption: source.caption || "",
      maskedFields: asArray(source.maskedFields || source.masked_fields),
      permissions,
      raw: source.raw || source
    };
  }
  function normalizeAssets(assets) {
    return asArray(assets).map(normalizeAsset).filter((asset) => asset.permissions.canView !== false);
  }
  function assetSelection(asset, versionMode = "pinned") {
    const normalized = normalizeAsset(asset);
    return {
      assetId: normalized.id,
      assetKey: normalized.key,
      versionMode,
      versionId: versionMode === "pinned" ? normalized.currentVersionId : void 0,
      versionNumber: versionMode === "pinned" ? normalized.currentVersionNumber : void 0,
      name: normalized.name,
      fileType: normalized.fileType,
      assetType: normalized.assetType || normalized.fileType,
      mimeType: normalized.mimeType,
      applicationKey: normalized.applicationKey,
      ownerApplicationKey: normalized.ownerApplicationKey,
      reuseScope: normalized.reuseScope || normalized.scope,
      assetVisibility: normalized.assetVisibility || normalized.visibility,
      publicUrl: normalized.publicUrl || normalized.url,
      downloadUrl: normalized.downloadUrl,
      altText: normalized.altText,
      description: normalized.description,
      url: normalized.url
    };
  }
  function emitAssetEvent(target, name, detail = {}) {
    target.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }
  function cssClassTokens2(element) {
    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean);
  }
  function applyCssClassToShadowRoot2(element) {
    if (!element) return;
    const root = element.shadowRoot || element;
    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");
    if (!target) return;
    target.classList.remove(...element.__uibCssClassTokens || []);
    const next = cssClassTokens2(element);
    if (next.length) target.classList.add(...next);
    element.__uibCssClassTokens = next;
  }
  function installCssClassProperty2(constructor) {
    const prototype = constructor?.prototype;
    if (!prototype) return constructor;
    if (!Object.getOwnPropertyDescriptor(prototype, "cssClass")) {
      Object.defineProperty(prototype, "cssClass", {
        configurable: true,
        enumerable: true,
        get() {
          return this.getAttribute("css-class") || "";
        },
        set(value) {
          if (value === null || value === void 0 || value === false) this.removeAttribute("css-class");
          else this.setAttribute("css-class", String(value));
        }
      });
    }
    const observed = Array.isArray(constructor.observedAttributes) ? constructor.observedAttributes : [];
    if (!observed.includes("css-class")) {
      Object.defineProperty(constructor, "observedAttributes", {
        configurable: true,
        value: [...observed, "css-class"]
      });
    }
    if (typeof prototype.render === "function" && !prototype.__uibCssClassRenderWrapped) {
      const render = prototype.render;
      prototype.render = function renderWithCssClass(...args) {
        const result = render.apply(this, args);
        applyCssClassToShadowRoot2(this);
        return result;
      };
      prototype.__uibCssClassRenderWrapped = true;
    }
    return constructor;
  }
  function registerElement(name, constructor) {
    installCssClassProperty2(constructor);
    if (typeof customElements !== "undefined" && !customElements.get(name)) {
      customElements.define(name, constructor);
    }
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/components/uib-asset-image.js
  var styles20 = `
${baseAssetStyles}
:host{display:block;inline-size:100%;block-size:100%}.asset-image{inline-size:100%;block-size:100%;min-block-size:var(--uib-asset-image-min-height,0)}.asset-image uib-media{inline-size:100%;block-size:100%}.asset-image--unresolved{display:grid;place-items:center;min-block-size:var(--uib-asset-image-placeholder-height,4rem);padding:.75rem;border:1px dashed var(--uib-assets-border-strong);border-radius:var(--uib-assets-radius-sm);background:var(--uib-assets-surface-soft);color:var(--uib-assets-muted);text-align:center;font-size:.8rem;font-weight:850}.asset-image--icon{max-inline-size:var(--uib-asset-image-icon-size,4rem);aspect-ratio:1}.asset-image--background{position:absolute;inset:0;min-block-size:100%}.asset-image--background uib-media{position:absolute;inset:0}
`;
  function valueFrom(record, keys) {
    if (!record || typeof record !== "object") return "";
    for (const key of keys) {
      const value = record[key];
      if (value !== void 0 && value !== null && value !== "") return String(value);
    }
    return "";
  }
  function normalizeAssetMap(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    return parseJson(value, {}) || {};
  }
  function sourceFromAssetMap(assetMap, assetId) {
    if (!assetId || !assetMap || typeof assetMap !== "object") return "";
    const entry = assetMap[assetId];
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    return valueFrom(entry, ["url", "src", "publicUrl", "public_url", "downloadUrl", "download_url", "thumbnailUrl", "thumbnail_url"]);
  }
  function altFromAssetMap(assetMap, assetId) {
    if (!assetId || !assetMap || typeof assetMap !== "object") return "";
    const entry = assetMap[assetId];
    if (!entry || typeof entry === "string") return "";
    return valueFrom(entry, ["alt", "altText", "alt_text", "name", "label"]);
  }
  var UibAssetImage = class extends HTMLElement {
    static get observedAttributes() {
      return ["src", "asset-id", "asset", "asset-map", "alt", "fit", "role", "visual-role", "ratio", "fallback-label"];
    }
    constructor() {
      super();
      this._asset = void 0;
      this._assetMap = void 0;
      this._assetResolver = void 0;
      this._resolvedSrc = "";
      this._resolveToken = 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
      void this.resolveAsync();
    }
    attributeChangedCallback() {
      if (!this.isConnected) return;
      this.render();
      void this.resolveAsync();
    }
    get assetId() {
      return this.getAttribute("asset-id") || "";
    }
    set assetId(value) {
      if (value === void 0 || value === null || value === "") this.removeAttribute("asset-id");
      else this.setAttribute("asset-id", String(value));
    }
    get asset() {
      if (this._asset) return this._asset;
      return parseJson(this.getAttribute("asset"), null);
    }
    set asset(value) {
      this._asset = value;
      if (this.isConnected) {
        this.render();
        void this.resolveAsync();
      }
    }
    get assetMap() {
      return normalizeAssetMap(this._assetMap || this.getAttribute("asset-map"));
    }
    set assetMap(value) {
      this._assetMap = value;
      if (this.isConnected) {
        this.render();
        void this.resolveAsync();
      }
    }
    get assetResolver() {
      return this._assetResolver;
    }
    set assetResolver(value) {
      this._assetResolver = typeof value === "function" ? value : void 0;
      if (this.isConnected) void this.resolveAsync();
    }
    currentSource() {
      const explicitSrc = safeMediaSrc(this.getAttribute("src") || "");
      if (explicitSrc) return explicitSrc;
      const asset = this.asset;
      if (asset) {
        const normalized = normalizeAsset(asset);
        const assetSrc = safeMediaSrc(normalized.publicUrl || normalized.url || normalized.downloadUrl || normalized.thumbnailUrl || "");
        if (assetSrc) return assetSrc;
      }
      const mapped = safeMediaSrc(sourceFromAssetMap(this.assetMap, this.assetId));
      if (mapped) return mapped;
      return safeMediaSrc(this._resolvedSrc);
    }
    currentAlt() {
      const explicitAlt = this.getAttribute("alt") || "";
      if (explicitAlt) return explicitAlt;
      const asset = this.asset;
      if (asset) {
        const normalized = normalizeAsset(asset);
        return normalized.altText || normalized.name || "";
      }
      return altFromAssetMap(this.assetMap, this.assetId) || this.assetId || "";
    }
    async resolveAsync() {
      if (!this.assetId || this.currentSource() || typeof this.assetResolver !== "function") return;
      const token = ++this._resolveToken;
      try {
        const result = await this.assetResolver(this.assetId, this);
        if (token !== this._resolveToken) return;
        if (typeof result === "string") {
          this._resolvedSrc = result;
        } else if (result && typeof result === "object") {
          this._asset = result;
          this._resolvedSrc = valueFrom(result, ["url", "src", "publicUrl", "public_url", "downloadUrl", "download_url", "thumbnailUrl", "thumbnail_url"]);
        }
        this.render();
      } catch (error) {
        this.dispatchEvent(new CustomEvent("uib-asset-image-resolution-error", {
          bubbles: true,
          composed: true,
          detail: { assetId: this.assetId, error }
        }));
      }
    }
    render() {
      const role = this.getAttribute("visual-role") || this.getAttribute("role") || "image";
      const src = this.currentSource();
      const alt = this.currentAlt();
      const fit = this.getAttribute("fit") || (role === "icon" || role === "svg" ? "contain" : "cover");
      const ratio = this.getAttribute("ratio") || (role === "icon" ? "1/1" : "16/9");
      const fallback = this.getAttribute("fallback-label") || (this.assetId ? `Asset ${this.assetId}` : "No image selected");
      this.shadowRoot.innerHTML = `<style> ` + styles20 + ` </style><div class="asset-image asset-image--` + escapeHtml2(role) + `" part="container"> ` + (src ? `<uib-media
            src="${escapeHtml2(src)}"
            alt="${escapeHtml2(alt)}"
            role="${escapeHtml2(role)}"
            fit="${escapeHtml2(fit)}"
            ratio="${escapeHtml2(ratio)}"
          ></uib-media>` : `<div class="asset-image--unresolved" part="placeholder">
            ${escapeHtml2(fallback)}
          </div>`) + ` </div>`;
    }
  };
  registerElement("uib-asset-image", UibAssetImage);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/hero/src/hero-data.js
  var CTA_KEYS = ["primary", "secondary", "third", "fourth"];
  var CTA_VARIANTS = ["primary", "secondary", "tertiary", "destructive"];
  var HERO_FIELD_DEFINITIONS = [
    { name: "id", label: "ID", section: "Identity", kind: "text" },
    { name: "application_key", label: "Application key", section: "Identity", kind: "text" },
    { name: "hero_key", label: "Hero key", section: "Identity", kind: "text" },
    { name: "page_key", label: "Page key", section: "Identity", kind: "text" },
    { name: "route_path", label: "Route path", section: "Identity", kind: "text" },
    { name: "placement", label: "Placement", section: "Identity", kind: "text" },
    { name: "name", label: "Name", section: "Content", kind: "text", required: true },
    { name: "description", label: "Description", section: "Content", kind: "textarea" },
    { name: "eyebrow", label: "Eyebrow", section: "Content", kind: "text" },
    { name: "headline", label: "Headline", section: "Content", kind: "textarea", required: true },
    { name: "subheadline", label: "Subheadline", section: "Content", kind: "textarea" },
    { name: "trust_signal", label: "Trust signal", section: "Content", kind: "textarea" },
    { name: "theme", label: "Theme", section: "Visual", kind: "select", options: ["organization", "light", "dark"] },
    { name: "size", label: "Size", section: "Visual", kind: "select", options: ["compact", "default", "large"] },
    { name: "visual_mode", label: "Visual mode", section: "Visual", kind: "select", options: ["panel-right", "panel-left", "background"] },
    { name: "layout_opacity", label: "Layout opacity", section: "Visual", kind: "number" },
    { name: "navigation_slot_mode", label: "Navigation slot mode", section: "Rich Slots", kind: "select", options: ["empty", "custom"] },
    { name: "navigation_slot", label: "Navigation slot", section: "Rich Slots", kind: "html" },
    { name: "visual_slot_mode", label: "Visual slot mode", section: "Rich Slots", kind: "select", options: ["empty", "custom"] },
    { name: "visual_slot", label: "Visual slot", section: "Rich Slots", kind: "html" },
    { name: "trust_slot_mode", label: "Trust slot mode", section: "Rich Slots", kind: "select", options: ["empty", "custom"] },
    { name: "trust_slot", label: "Trust slot", section: "Rich Slots", kind: "html" },
    { name: "after_content_slot_mode", label: "After content slot mode", section: "Rich Slots", kind: "select", options: ["empty", "custom"] },
    { name: "after_content_slot", label: "After content slot", section: "Rich Slots", kind: "html" }
  ];
  function escapeHtml3(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function cssClassTokens3(element) {
    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean);
  }
  function applyCssClassToRoot(element) {
    if (!element) return;
    const root = element.shadowRoot || element;
    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");
    if (!target) return;
    target.classList.remove(...element.__uibCssClassTokens || []);
    const next = cssClassTokens3(element);
    if (next.length) target.classList.add(...next);
    element.__uibCssClassTokens = next;
  }
  function registerHeroElement(tagName, elementClass) {
    const prototype = elementClass?.prototype;
    if (prototype && !Object.getOwnPropertyDescriptor(prototype, "cssClass")) {
      Object.defineProperty(prototype, "cssClass", {
        configurable: true,
        enumerable: true,
        get() {
          return this.getAttribute("css-class") || "";
        },
        set(value) {
          if (value === null || value === void 0 || value === false) this.removeAttribute("css-class");
          else this.setAttribute("css-class", String(value));
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
    if (prototype && typeof prototype.render === "function" && !prototype.__uibCssClassRenderWrapped) {
      const render = prototype.render;
      prototype.render = function renderWithCssClass(...args) {
        const result = render.apply(this, args);
        applyCssClassToRoot(this);
        return result;
      };
      prototype.__uibCssClassRenderWrapped = true;
    }
    if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
      customElements.define(tagName, elementClass);
    }
    return elementClass;
  }
  function parseBoolean2(value, fallback = false) {
    if (value === true || value === false) return value;
    if (value === void 0 || value === null || value === "") return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
    return fallback;
  }
  function parseJson2(value, fallback) {
    if (Array.isArray(value) || value && typeof value === "object") return value;
    if (!value) return fallback;
    try {
      return JSON.parse(String(value));
    } catch {
      return fallback;
    }
  }
  function parseArray(value) {
    const parsed = parseJson2(value, []);
    return Array.isArray(parsed) ? parsed : [];
  }
  function parseObject4(value) {
    const parsed = parseJson2(value, {});
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  }
  function cloneRecord(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }
  function recordsEqual(left, right) {
    return JSON.stringify(normalizeHeroRecord(left || {})) === JSON.stringify(normalizeHeroRecord(right || {}));
  }
  function dispatch(element, type, detail) {
    element.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }
  function stringValue2(value) {
    return value === null || value === void 0 ? "" : String(value);
  }
  function slugify(value) {
    return stringValue2(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function normalizeHeroVisualToken(value) {
    const raw = String(value || "").trim().toLowerCase().replaceAll("_", "-");
    if (!raw) return "";
    if (raw === "background" || raw === "bg" || raw === "image-background") return "background";
    if (["panel-left", "left", "image-left", "visual-left"].includes(raw)) return "panel-left";
    if (["panel-right", "right", "image-right", "visual-right"].includes(raw)) return "panel-right";
    return "";
  }
  function visualPositionForMode(mode) {
    const normalized = normalizeHeroVisualToken(mode);
    if (normalized === "background") return "background";
    if (normalized === "panel-left") return "left";
    return "right";
  }
  function resolveHeroVisualMode(record = {}) {
    const role = String(record.visual_role || "").trim().toLowerCase();
    if (role === "background") return "background";
    return normalizeHeroVisualToken(record.visual_mode) || normalizeHeroVisualToken(record.visual_position) || "panel-right";
  }
  function normalizeHeroVisualFields(record) {
    const next = record;
    const hasUrl = Boolean(stringValue2(next.visual_src).trim());
    const hasAsset = Boolean(stringValue2(next.visual_asset_id).trim());
    const source = hasUrl ? "url" : hasAsset ? "asset" : String(next.visual_source || "none").toLowerCase();
    next.visual_source = ["none", "url", "asset"].includes(source) ? source : "none";
    next.visual_role = ["image", "icon", "background", "svg"].includes(String(next.visual_role || "").toLowerCase()) ? String(next.visual_role).toLowerCase() : resolveHeroVisualMode(next) === "background" ? "background" : "image";
    next.visual_mode = next.visual_role === "background" ? "background" : resolveHeroVisualMode(next);
    next.visual_position = visualPositionForMode(next.visual_mode);
    return next;
  }
  function normalizeHeroAction(value = {}, index = 0) {
    const source = value && typeof value === "object" ? value : {};
    const key = CTA_KEYS[index] || `action${index + 1}`;
    const type = String(source.type || source.kind || source.actionType || "").toLowerCase() === "action" ? "action" : "link";
    const explicitValue = source.value ?? source.href ?? source.url ?? source.actionToken ?? source.token ?? source.action;
    return {
      id: stringValue2(source.id ?? source.actionId ?? source.buttonId) || `${key}HeroAction`,
      name: stringValue2(source.name ?? source.key) || `${key}Cta`,
      label: stringValue2(source.label ?? source.text ?? source.buttonLabel),
      type,
      value: stringValue2(explicitValue),
      show: parseBoolean2(source.show ?? source.shown ?? source.visible ?? source.isVisible, true),
      disabled: parseBoolean2(source.disabled ?? source.buttonDisabled ?? source.actionDisabled, false),
      variant: CTA_VARIANTS.includes(String(source.variant || "").toLowerCase()) ? String(source.variant).toLowerCase() : index === 0 ? "primary" : index === 2 ? "destructive" : "secondary",
      help: stringValue2(source.help ?? source.helpText),
      title: stringValue2(source.title) || `${key.slice(0, 1).toUpperCase()}${key.slice(1)} CTA`,
      ariaLabel: stringValue2(source.ariaLabel ?? source["aria-label"] ?? source.accessibleText ?? source.label ?? ""),
      target: stringValue2(source.target),
      rel: stringValue2(source.rel)
    };
  }
  function normalizeHeroActionList(value) {
    if (typeof value === "string") return parseArray(value).map((item2, index) => normalizeHeroAction(item2, index));
    if (Array.isArray(value)) return value.map((item2, index) => normalizeHeroAction(item2, index));
    if (value && typeof value === "object") return [normalizeHeroAction(value, 0)];
    return [];
  }
  function ctaFieldName(key, field) {
    return field === "disabled" ? `${key}_cta_disabled` : `${key}_cta_${field}`;
  }
  function ctaShowFieldName(key) {
    return `show_${key}_cta`;
  }
  function legacyActionHasValue(record, key) {
    return [
      ctaFieldName(key, "label"),
      ctaFieldName(key, "href"),
      ctaFieldName(key, "action_token"),
      ctaFieldName(key, "id"),
      ctaFieldName(key, "name")
    ].some((field) => Boolean(stringValue2(record[field]).trim()));
  }
  function legacyActionForRecord(record, key, index) {
    const explicitType = String(record[ctaFieldName(key, "type")] || "").toLowerCase();
    const type = explicitType === "action" || !record[ctaFieldName(key, "href")] && record[ctaFieldName(key, "action_token")] ? "action" : "link";
    return normalizeHeroAction({
      id: record[ctaFieldName(key, "id")],
      name: record[ctaFieldName(key, "name")],
      label: record[ctaFieldName(key, "label")],
      type,
      value: type === "action" ? record[ctaFieldName(key, "action_token")] : record[ctaFieldName(key, "href")],
      show: record[ctaShowFieldName(key)] === void 0 ? true : record[ctaShowFieldName(key)],
      disabled: record[ctaFieldName(key, "disabled")],
      variant: record[ctaFieldName(key, "variant")],
      help: record[ctaFieldName(key, "help")],
      title: record[ctaFieldName(key, "title")],
      ariaLabel: record[ctaFieldName(key, "aria_label")],
      target: record[ctaFieldName(key, "target")],
      rel: record[ctaFieldName(key, "rel")]
    }, index);
  }
  function heroActionsForRecord(record = {}) {
    const canonical = stringValue2(record["action-components"]).trim() || stringValue2(record.action_components).trim() || stringValue2(record.hero_action_buttons).trim() || stringValue2(record.actions).trim();
    if (canonical) return normalizeHeroActionList(canonical);
    return CTA_KEYS.filter((key) => legacyActionHasValue(record, key)).map((key, index) => legacyActionForRecord(record, key, index));
  }
  function applyHeroActionsToRecord(record, value) {
    const actions = normalizeHeroActionList(value);
    const json = JSON.stringify(actions);
    record["action-components"] = json;
    record.action_components = json;
    record.hero_action_buttons = json;
    record.actions = json;
    CTA_KEYS.forEach((key, index) => {
      const action = actions[index];
      record[ctaFieldName(key, "label")] = action?.label || "";
      record[ctaFieldName(key, "type")] = action?.type || "";
      record[ctaFieldName(key, "href")] = action?.type === "link" ? action.value : "";
      record[ctaFieldName(key, "action_token")] = action?.type === "action" ? action.value : "";
      record[ctaShowFieldName(key)] = action?.show ? "true" : "false";
      record[ctaFieldName(key, "disabled")] = action?.disabled ? "true" : "false";
      record[ctaFieldName(key, "variant")] = action?.variant || "";
      record[ctaFieldName(key, "id")] = action?.id || "";
      record[ctaFieldName(key, "name")] = action?.name || "";
      record[ctaFieldName(key, "help")] = action?.help || "";
      record[ctaFieldName(key, "title")] = action?.title || "";
      record[ctaFieldName(key, "aria_label")] = action?.ariaLabel || "";
      record[ctaFieldName(key, "target")] = action?.target || "";
      record[ctaFieldName(key, "rel")] = action?.rel || "";
    });
    return record;
  }
  function normalizeHeroRecord(value = {}) {
    const record = {};
    for (const [key, raw] of Object.entries(value || {})) {
      if (raw === void 0 || raw === null) record[key] = "";
      else if (typeof raw === "string") record[key] = raw;
      else if (typeof raw === "boolean") record[key] = raw ? "true" : "false";
      else if (typeof raw === "number") record[key] = String(raw);
      else record[key] = JSON.stringify(raw);
    }
    if (!record.name && record.headline) record.name = record.headline;
    if (!record.hero_key && record.name) record.hero_key = slugify(record.name);
    if (!record.page_key) record.page_key = "home";
    if (!record.route_path && record.application_key) record.route_path = `/${record.application_key}`;
    if (!record.placement) record.placement = "primary";
    if (!record.theme) record.theme = "organization";
    if (!record.size) record.size = "large";
    if (!record.layout_opacity) record.layout_opacity = "0.8";
    if (!record.nav_items) record.nav_items = "[]";
    if (!record.details) record.details = "[]";
    normalizeHeroVisualFields(record);
    applyHeroActionsToRecord(record, heroActionsForRecord(record));
    return record;
  }
  function createDefaultHeroRecord() {
    return normalizeHeroRecord({
      id: "hero_sample_home",
      application_key: "sample",
      hero_key: "home",
      page_key: "home",
      route_path: "/sample",
      placement: "primary",
      name: "Home Hero",
      eyebrow: "Featured experience",
      headline: "Explore the sample application",
      subheadline: "Use this generic Hero as a starting point for a landing page, tour page, or application entry point.",
      trust_signal: "This reusable editor emits events so the parent demo or application owns persistence.",
      visual_source: "url",
      visual_role: "background",
      visual_mode: "background",
      visual_src: genericHeroVisualDataUri("UI Base Hero"),
      visual_alt: "Generic UI Base hero visual",
      nav_items: JSON.stringify([
        { label: "Overview", href: "#overview" },
        { label: "Services", href: "#services" },
        { label: "Reports", href: "#reports" },
        { label: "Contact", href: "#contact" }
      ]),
      details: JSON.stringify([
        { label: "Duration", value: "60 minutes", icon: "60" },
        { label: "Capacity", value: "Up to 20 people", icon: "20" },
        { label: "Availability", value: "Weekdays", icon: "WD" },
        { label: "Cost", value: "Free", icon: "$" }
      ]),
      actions: JSON.stringify([
        { id: "primaryHeroAction", name: "primaryCta", label: "Start Request", type: "action", value: "START_REQUEST", show: true, disabled: false, variant: "primary" },
        { id: "secondaryHeroAction", name: "secondaryCta", label: "Learn More", type: "link", value: "#overview", show: true, disabled: false, variant: "secondary" }
      ])
    });
  }
  function genericHeroVisualDataUri(label) {
    const safeLabel = encodeURIComponent(label);
    return `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='960'%20height='540'%20viewBox='0%200%20960%20540'%3E%3Crect%20width='960'%20height='540'%20rx='42'%20fill='%23eef4fb'/%3E%3Ccircle%20cx='770'%20cy='130'%20r='92'%20fill='%23f4bd46'%20opacity='.7'/%3E%3Crect%20x='96'%20y='110'%20width='360'%20height='56'%20rx='28'%20fill='%23174a8b'%20opacity='.92'/%3E%3Crect%20x='96'%20y='205'%20width='650'%20height='30'%20rx='15'%20fill='%2313294b'%20opacity='.22'/%3E%3Crect%20x='96'%20y='260'%20width='520'%20height='30'%20rx='15'%20fill='%2313294b'%20opacity='.16'/%3E%3Ctext%20x='96'%20y='485'%20fill='%2313294b'%20font-family='Arial,sans-serif'%20font-size='34'%20font-weight='700'%3E${safeLabel}%3C/text%3E%3C/svg%3E`;
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/hero/src/uib-hero.js
  var BOOLEAN_FALSE_VALUES = /* @__PURE__ */ new Set(["false", "0", "no", "off"]);
  var styles21 = `
  :host {
    --uib-hero-background: #f8fbff;
    --uib-hero-surface: rgba(255, 255, 255, 0.88);
    --uib-hero-text-color: #13294b;
    --uib-hero-muted-color: #40516f;
    --uib-hero-border-color: rgba(19, 41, 75, 0.14);
    --uib-hero-accent-color: #174a8b;
    --uib-hero-accent-contrast: #ffffff;
    --uib-hero-secondary-background: rgba(255, 255, 255, 0.72);
    --uib-hero-secondary-color: #13294b;
    --uib-hero-action-panel-background: rgba(255, 255, 255, 0.72);
    --uib-hero-action-panel-border-color: rgba(19, 41, 75, 0.16);
    --uib-hero-detail-background: rgba(255, 255, 255, 0.72);
    --uib-hero-shadow: 0 22px 60px rgba(10, 31, 68, 0.12);
    --uib-hero-radius: 28px;
    --uib-hero-max-width: 1180px;
    --uib-hero-gap: 2rem;
    --uib-hero-layout-opacity: 0.8;
    display: block;
    color: var(--uib-hero-text-color);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    user-select: text;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .uib-hero {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    background: var(--uib-hero-background);
    border: 1px solid var(--uib-hero-border-color);
    border-radius: var(--uib-hero-radius);
    box-shadow: var(--uib-hero-shadow);
  }

  .uib-hero--dark {
    --uib-hero-background: linear-gradient(135deg, #082b27 0%, #103b34 46%, #0d1f1e 100%);
    --uib-hero-surface: rgba(8, 31, 34, 0.78);
    --uib-hero-text-color: #ffffff;
    --uib-hero-muted-color: #d7e6df;
    --uib-hero-border-color: rgba(255, 255, 255, 0.16);
    --uib-hero-accent-color: #f4bd46;
    --uib-hero-accent-contrast: #0d1f1e;
    --uib-hero-secondary-background: rgba(255, 255, 255, 0.08);
    --uib-hero-secondary-color: #ffffff;
    --uib-hero-action-panel-background: rgba(8, 31, 34, 0.62);
    --uib-hero-action-panel-border-color: rgba(255, 255, 255, 0.18);
    --uib-hero-detail-background: rgba(255, 255, 255, 0.08);
  }

  .uib-hero--organization {
    --uib-hero-background: linear-gradient(135deg, #ffffff 0%, #eef5ff 52%, #dfeafa 100%);
    --uib-hero-accent-color: #0b3b75;
    --uib-hero-accent-contrast: #ffffff;
  }

  .uib-hero__nav {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.05rem clamp(1rem, 3vw, 2rem);
    border-bottom: 1px solid var(--uib-hero-border-color);
  }

  .uib-hero__brand {
    min-width: max-content;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .uib-hero__brand-mark {
    width: 2.15rem;
    height: 2.15rem;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    color: var(--uib-hero-accent-contrast);
    background: var(--uib-hero-accent-color);
    font-size: 0.85rem;
    font-weight: 900;
  }

  .uib-hero__nav-links {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.35rem 1rem;
  }

  .uib-hero__nav-links a,
  ::slotted([slot="navigation"] a) {
    color: inherit;
    text-decoration: none;
    font-size: 0.88rem;
    font-weight: 700;
    opacity: 0.88;
  }

  .uib-hero__nav-links a:hover,
  ::slotted([slot="navigation"] a:hover) {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 0.25rem;
  }

  .uib-hero__layout {
    position: relative;
    z-index: 2;
    max-width: var(--uib-hero-max-width);
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.95fr);
    gap: var(--uib-hero-gap);
    align-items: center;
    padding: clamp(2rem, 5vw, 4.5rem) clamp(1.25rem, 4vw, 3rem);
    opacity: var(--uib-hero-layout-opacity, 0.8);
  }

  .uib-hero--left .uib-hero__layout {
    grid-template-columns: minmax(300px, 0.95fr) minmax(0, 1fr);
  }

  .uib-hero--left .uib-hero__content {
    order: 2;
  }

  .uib-hero--left .uib-hero__visual {
    order: 1;
  }

  .uib-hero--background .uib-hero__layout {
    grid-template-columns: minmax(0, 0.72fr);
    min-height: 540px;
  }

  .uib-hero--background .uib-hero__nav {
    background: var(--uib-hero-surface);
    backdrop-filter: blur(10px);
  }

  .uib-hero--background .uib-hero__details {
    background: var(--uib-hero-surface);
    backdrop-filter: blur(10px);
  }

  .uib-hero--background .uib-hero__content {
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--uib-hero-border-color);
    border-radius: 24px;
    background: var(--uib-hero-surface);
    backdrop-filter: blur(12px);
  }

  .uib-hero--background .uib-hero__visual {
    position: absolute;
    inset: 0;
    z-index: 0;
    min-height: 100%;
    border-radius: inherit;
    opacity: 0.88;
  }

  .uib-hero--background .uib-hero__visual::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(6, 20, 40, 0.72), rgba(6, 20, 40, 0.18));
  }

  .uib-hero__content {
    min-width: 0;
  }

  .uib-hero__eyebrow {
    margin: 0 0 0.7rem;
    color: var(--uib-hero-accent-color);
    font-size: 0.85rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .uib-hero__headline {
    margin: 0;
    max-width: 12ch;
    font-size: clamp(2.15rem, 6vw, 5.2rem);
    line-height: 0.95;
    letter-spacing: -0.06em;
    color: var(--uib-hero-text-color);
  }

  .uib-hero--compact .uib-hero__headline {
    font-size: clamp(1.9rem, 4vw, 3.2rem);
  }

  .uib-hero--large .uib-hero__headline {
    font-size: clamp(2.6rem, 8vw, 6.1rem);
  }

  .uib-hero__subheadline {
    margin: 1rem 0 0;
    max-width: 60ch;
    color: var(--uib-hero-muted-color);
    font-size: clamp(1rem, 1.7vw, 1.18rem);
    line-height: 1.65;
  }

  .uib-hero__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    width: fit-content;
    max-width: 100%;
    margin-top: 1.55rem;
    padding: 0.8rem;
    border: 1px solid var(--uib-hero-action-panel-border-color, var(--uib-hero-border-color));
    border-radius: 1.1rem;
    background: var(--uib-hero-action-panel-background, rgba(255, 255, 255, 0.72));
    backdrop-filter: blur(10px);
  }

  .uib-hero__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.85rem 1.15rem;
    border-radius: 0.65rem;
    border: 1px solid transparent;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 850;
    text-decoration: none;
    cursor: pointer;
    transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
  }

  .uib-hero__button:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(10, 31, 68, 0.16);
  }

  .uib-hero__button--primary {
    color: var(--uib-hero-accent-contrast);
    background: var(--uib-hero-accent-color);
  }

  .uib-hero__button--secondary,
  .uib-hero__button--tertiary,
  .uib-hero__button--third {
    color: var(--uib-hero-secondary-color);
    background: var(--uib-hero-secondary-background);
    border-color: var(--uib-hero-border-color);
  }

  .uib-hero__button--tertiary,
  .uib-hero__button--third {
    background: color-mix(in srgb, var(--uib-hero-accent-color) 10%, var(--uib-hero-secondary-background));
  }

  .uib-hero__button--destructive {
    color: var(--uib-hero-destructive-color, #ffffff);
    background: var(--uib-hero-destructive-background, #b42318);
    border-color: var(--uib-hero-destructive-border-color, #b42318);
  }

  .uib-hero__button--fourth {
    color: var(--uib-hero-text-color);
    background: transparent;
    border-color: var(--uib-hero-border-color);
  }

  .uib-hero__button[aria-disabled="true"],
  .uib-hero__button:disabled {
    opacity: 0.48;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .uib-hero__trust {
    margin-top: 1rem;
    color: var(--uib-hero-muted-color);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .uib-hero__details {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0;
    border-top: 1px solid var(--uib-hero-border-color);
    background: var(--uib-hero-detail-background);
  }

  .uib-hero__detail {
    min-width: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.8rem;
    align-items: center;
    padding: 1rem clamp(1rem, 3vw, 1.4rem);
    border-right: 1px solid var(--uib-hero-border-color);
  }

  .uib-hero__detail:last-child {
    border-right: 0;
  }

  .uib-hero__detail-icon {
    width: 2.2rem;
    height: 2.2rem;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 999px;
    color: var(--uib-hero-accent-color);
    border: 1px solid currentColor;
    font-size: 0.9rem;
    font-weight: 900;
    text-transform: uppercase;
    overflow: hidden;
  }

  .uib-hero__detail-icon--image {
    padding: 0.28rem;
    background: rgba(255, 255, 255, 0.7);
  }

  .uib-hero__detail-icon-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .uib-hero__detail-label {
    margin: 0;
    color: var(--uib-hero-text-color);
    font-size: 0.77rem;
    font-weight: 900;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .uib-hero__detail-value {
    margin: 0.18rem 0 0;
    color: var(--uib-hero-muted-color);
    font-size: 0.92rem;
    line-height: 1.35;
  }

  .uib-hero__visual {
    position: relative;
    min-height: 300px;
    border-radius: 24px;
    overflow: hidden;
  }

  .uib-hero__visual img {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 300px;
    object-fit: cover;
  }

  ::slotted([slot="visual"]) {
    display: block;
    width: 100%;
    height: 100%;
    min-height: inherit;
  }

  .uib-hero--background ::slotted([slot="visual"]) {
    min-height: 100%;
    border-radius: inherit;
  }

  .uib-hero__visual-placeholder {
    min-height: 360px;
    height: 100%;
    border: 1px solid var(--uib-hero-border-color);
    border-radius: 24px;
    background:
      radial-gradient(circle at 72% 25%, rgba(255,255,255,0.72), transparent 20%),
      linear-gradient(135deg, rgba(23,74,139,0.18), rgba(23,74,139,0.04));
    display: grid;
    place-items: center;
    padding: 1.5rem;
  }

  .uib-hero__visual-card {
    width: min(360px, 92%);
    min-height: 220px;
    border-radius: 22px;
    padding: 1.25rem;
    color: var(--uib-hero-text-color);
    background: var(--uib-hero-surface);
    border: 1px solid var(--uib-hero-border-color);
    box-shadow: 0 24px 54px rgba(10, 31, 68, 0.16);
  }

  .uib-hero__visual-line {
    height: 0.75rem;
    margin-top: 0.8rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--uib-hero-accent-color) 24%, transparent);
  }

  .uib-hero__visual-line:nth-child(2) { width: 82%; }
  .uib-hero__visual-line:nth-child(3) { width: 58%; }
  .uib-hero__visual-line:nth-child(4) { width: 72%; }

  @media (max-width: 820px) {
    .uib-hero__nav {
      align-items: flex-start;
      flex-direction: column;
    }

    .uib-hero__layout,
    .uib-hero--left .uib-hero__layout {
      grid-template-columns: 1fr;
    }

    .uib-hero--left .uib-hero__content,
    .uib-hero--left .uib-hero__visual {
      order: initial;
    }

    .uib-hero--background .uib-hero__layout {
      min-height: 0;
      grid-template-columns: 1fr;
    }

    .uib-hero--background .uib-hero__visual {
      position: absolute;
      min-height: 100%;
    }

    .uib-hero__headline {
      max-width: 14ch;
    }
  }

  @media (max-width: 560px) {
    .uib-hero__actions {
      align-items: stretch;
      flex-direction: column;
      width: 100%;
    }

    .uib-hero__button {
      width: 100%;
    }

    .uib-hero__details {
      grid-template-columns: 1fr;
    }

    .uib-hero__detail {
      border-right: 0;
      border-bottom: 1px solid var(--uib-hero-border-color);
    }

    .uib-hero__detail:last-child {
      border-bottom: 0;
    }
  }
`;
  function boolFromAttribute2(value, fallback) {
    if (value === null || value === void 0) return fallback;
    if (value === "") return true;
    return !BOOLEAN_FALSE_VALUES.has(String(value).trim().toLowerCase());
  }
  function escapeHtml4(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function parseJsonArray(value, fallback = []) {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn("[uib-hero] Could not parse JSON array attribute.", error);
      return fallback;
    }
  }
  function safeHref3(value) {
    const href = String(value ?? "").trim();
    if (!href) return "#";
    if (/^javascript:/i.test(href)) return "#";
    return href;
  }
  function normalizeLayoutOpacity(value, fallback = 0.8) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(1, Math.max(0, parsed));
  }
  function normalizeVisualPosition(modeValue, positionValue, roleValue = "") {
    const rawRole = String(roleValue ?? "").trim().toLowerCase();
    const rawMode = String(modeValue ?? "").trim().toLowerCase();
    const rawPosition = String(positionValue ?? "").trim().toLowerCase();
    const raw = rawPosition || rawMode || rawRole || "right";
    if (["background", "background-full", "full-background", "hero-background"].includes(raw)) {
      return "background";
    }
    if (["panel-left", "left", "image-left", "visual-left"].includes(raw)) {
      return "left";
    }
    return "right";
  }
  function normalizeVisualSource(value, visualSrc = "", visualAssetId = "") {
    if (String(visualSrc || "").trim()) return "url";
    const raw = String(value ?? "").trim().toLowerCase();
    if (["url", "asset", "none"].includes(raw)) return raw;
    if (String(visualAssetId || "").trim()) return "asset";
    return "none";
  }
  function normalizeVisualRole(value, placementValue = "") {
    const raw = String(value ?? "").trim().toLowerCase().replaceAll("_", "-");
    if (["image", "icon", "background", "svg"].includes(raw)) return raw;
    const placement = String(placementValue ?? "").trim().toLowerCase();
    if (["background", "background-full", "full-background", "hero-background"].includes(placement)) return "background";
    return "image";
  }
  function resolveVisualSourceValue(source, visualSrc, visualAssetId) {
    const src = String(visualSrc || "").trim();
    if (src) return { source: "url", src, assetId: String(visualAssetId || "").trim() };
    const assetId = String(visualAssetId || "").trim();
    if (assetId && source !== "none") return { source: "asset", src: "", assetId };
    return { source: "none", src: "", assetId: "" };
  }
  var CTA_KINDS = ["primary", "secondary", "third", "fourth"];
  var CTA_VARIANTS2 = ["primary", "secondary", "tertiary", "destructive", "third", "fourth"];
  var HERO_DATA_ATTRIBUTES = /* @__PURE__ */ new Set(["hero-data", "hero-json"]);
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  function normalizeLookupKey(value) {
    return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  function valueFrom2(source, keys) {
    if (!isPlainObject(source)) return void 0;
    const wantedKeys = Array.isArray(keys) ? keys : [keys];
    for (const key of wantedKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];
    }
    const normalized = new Map(Object.keys(source).map((key) => [normalizeLookupKey(key), key]));
    for (const key of wantedKeys) {
      const actualKey = normalized.get(normalizeLookupKey(key));
      if (actualKey !== void 0) return source[actualKey];
    }
    return void 0;
  }
  function hasValue(value) {
    if (value === void 0 || value === null) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }
  function firstValue(...values) {
    for (const value of values) {
      if (hasValue(value)) return value;
    }
    return void 0;
  }
  function parseMaybeJson(value) {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
  function looksLikeHeroPayload(value) {
    if (!isPlainObject(value)) return false;
    return [
      "headline",
      "subheadline",
      "eyebrow",
      "trustSignal",
      "trust-signal",
      "primaryCta",
      "primaryCTA",
      "primaryAction",
      "primaryButton",
      "secondaryCta",
      "thirdCta",
      "fourthCta",
      "actionComponents",
      "action-components",
      "action_components",
      "actions",
      "callToActions",
      "ctas",
      "buttons",
      "actionButtons",
      "visual",
      "image",
      "media",
      "navItems",
      "navigation",
      "details",
      "tourDetails",
      "brandLabel",
      "brand-label",
      "brand"
    ].some((key) => valueFrom2(value, key) !== void 0);
  }
  function unwrapHeroData(value) {
    let current = parseMaybeJson(value);
    for (let index = 0; index < 6; index += 1) {
      if (!isPlainObject(current)) return {};
      if (looksLikeHeroPayload(current)) return current;
      const next = valueFrom2(current, [
        "hero",
        "heroData",
        "heroConfig",
        "heroConfiguration",
        "configuration",
        "config",
        "settings",
        "properties",
        "attributes",
        "data",
        "json",
        "payload",
        "value"
      ]);
      if (!hasValue(next) || next === current) return current;
      current = parseMaybeJson(next);
    }
    return isPlainObject(current) ? current : {};
  }
  function asArray2(value) {
    const parsed = parseMaybeJson(value);
    if (Array.isArray(parsed)) return parsed;
    if (isPlainObject(parsed)) {
      const items2 = valueFrom2(parsed, ["items", "values", "links", "details", "actions"]);
      const parsedItems = parseMaybeJson(items2);
      if (Array.isArray(parsedItems)) return parsedItems;
    }
    return void 0;
  }
  function boolFromValue(value, fallback) {
    if (value === void 0 || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    if (BOOLEAN_FALSE_VALUES.has(normalized)) return false;
    if (["true", "1", "yes", "on", "show", "visible", "enabled"].includes(normalized)) return true;
    return fallback;
  }
  function titleCaseKind(kind) {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
  function actionObjectKeys(kind) {
    const title = titleCaseKind(kind);
    return [
      `${kind}Cta`,
      `${kind}CTA`,
      `${kind}Action`,
      `${kind}Button`,
      `${kind}CallToAction`,
      `${kind}-cta`,
      `${kind}-action`,
      `${kind}-button`,
      `cta${title}`,
      `action${title}`
    ];
  }
  function flatActionKeys(kind, field) {
    const title = titleCaseKind(kind);
    const fieldTitle = titleCaseKind(field);
    return [
      `${kind}Cta${fieldTitle}`,
      `${kind}CTA${fieldTitle}`,
      `${kind}${fieldTitle}`,
      `${kind}-cta-${field}`,
      `${kind}-${field}`,
      `${field}${title}Cta`
    ];
  }
  function normalizeActionKind(value, fallback) {
    const normalized = normalizeLookupKey(value);
    if (!normalized) return fallback;
    if (["primary", "primarycta", "primaryaction", "first", "1"].includes(normalized)) return "primary";
    if (["secondary", "secondarycta", "secondaryaction", "second", "2"].includes(normalized)) return "secondary";
    if (["third", "thirdcta", "thirdaction", "tertiary", "tertiarycta", "3"].includes(normalized)) return "third";
    if (["fourth", "fourthcta", "fourthaction", "quaternary", "4"].includes(normalized)) return "fourth";
    return fallback;
  }
  function normalizeActionVariant(value, fallback = "secondary") {
    const normalized = normalizeLookupKey(value);
    if (!normalized) return fallback;
    if (["primary", "primarycta", "primaryaction"].includes(normalized)) return "primary";
    if (["secondary", "secondarycta", "secondaryaction"].includes(normalized)) return "secondary";
    if (["tertiary", "third", "thirdcta", "thirdaction"].includes(normalized)) return "tertiary";
    if (["destructive", "danger", "delete", "remove", "cancel"].includes(normalized)) return "destructive";
    if (["fourth", "fourthcta", "fourthaction", "quaternary"].includes(normalized)) return "fourth";
    return CTA_VARIANTS2.includes(normalized) ? normalized : fallback;
  }
  function classifyCtaType(value) {
    const normalized = normalizeLookupKey(value);
    if (!normalized) return "";
    if (["link", "url", "href", "route", "navigation", "navigate"].includes(normalized)) return "Link";
    if (["action", "callback", "event", "command", "function"].includes(normalized)) return "Action";
    return String(value);
  }
  function looksLikeHref(value) {
    const text = String(value ?? "").trim();
    return Boolean(text && (text.startsWith("#") || text.startsWith("/") || text.startsWith("./") || text.startsWith("../") || /^https?:\/\//i.test(text)));
  }
  function normalizeCtaAction(rawAction, source, kind) {
    const actionObject = isPlainObject(rawAction) ? rawAction : {};
    const flatLabel = valueFrom2(source, flatActionKeys(kind, "label"));
    const flatHref = valueFrom2(source, flatActionKeys(kind, "href"));
    const flatAction = valueFrom2(source, flatActionKeys(kind, "action"));
    const flatType = valueFrom2(source, flatActionKeys(kind, "type"));
    const flatValue = valueFrom2(source, flatActionKeys(kind, "value"));
    const title = titleCaseKind(kind);
    const label = firstValue(
      valueFrom2(actionObject, ["label", "Label", "text", "title", "name", "buttonLabel", "ctaLabel"]),
      flatLabel
    );
    const ctaType = classifyCtaType(firstValue(
      valueFrom2(actionObject, ["type", "Type", "ctaType", "buttonType", "linkType", "actionType"]),
      flatType
    ));
    const rawValue = firstValue(
      valueFrom2(actionObject, ["value", "Value", "ctaValue", "buttonValue"]),
      flatValue
    );
    const explicitHref = firstValue(
      valueFrom2(actionObject, ["href", "Href", "url", "URL", "link", "route", "to", "target", "targetUrl"]),
      flatHref
    );
    const explicitAction = firstValue(
      valueFrom2(actionObject, ["action", "Action", "actionToken", "action_token", "token", "callback", "command", "event", "eventName", "actionName"]),
      flatAction
    );
    let href = explicitHref;
    let action = explicitAction;
    if (ctaType === "Link") {
      href = firstValue(href, rawValue);
    } else if (ctaType === "Action") {
      action = firstValue(action, rawValue);
    } else if (hasValue(rawValue)) {
      if (!hasValue(href) && looksLikeHref(rawValue)) href = rawValue;
      else if (!hasValue(action)) action = rawValue;
    }
    const showValue = firstValue(
      valueFrom2(actionObject, ["show", "Show", "shown", "visible", "isVisible", "display", "enabled"]),
      valueFrom2(source, [`show${title}Cta`, `${kind}Shown`, `show-${kind}-cta`, `${kind}Show`])
    );
    const disabledValue = firstValue(
      valueFrom2(actionObject, ["disabled", "Disabled", "isDisabled", "disable"]),
      valueFrom2(source, [`${kind}CtaDisabled`, `${kind}Disabled`, `${kind}-cta-disabled`, `disable${title}Cta`])
    );
    const variant = normalizeActionVariant(
      firstValue(
        valueFrom2(actionObject, ["variant", "Variant", "style", "tone", "appearance", "buttonVariant"]),
        valueFrom2(source, flatActionKeys(kind, "variant"))
      ),
      kind === "primary" ? "primary" : kind === "third" ? "tertiary" : kind === "fourth" ? "fourth" : "secondary"
    );
    return {
      label,
      href,
      action,
      ctaType,
      variant,
      shown: boolFromValue(showValue, true),
      disabled: boolFromValue(disabledValue, false)
    };
  }
  function normalizeActions(source) {
    const output = {};
    const actionsCollection = asArray2(firstValue(
      valueFrom2(source, ["actionComponents", "action-components", "action_components", "actions", "callToActions", "call-to-actions", "ctas", "ctaButtons", "buttons", "actionButtons", "heroActions", "heroActionButtons", "hero_action_buttons"])
    ));
    if (actionsCollection) {
      actionsCollection.forEach((item2, index) => {
        const kind = normalizeActionKind(valueFrom2(item2, ["kind", "slot", "key", "cta", "ctaKey", "buttonKey", "position", "placement", "id"]), CTA_KINDS[index]);
        if (kind && CTA_KINDS.includes(kind)) output[kind] = normalizeCtaAction(item2, source, kind);
      });
      CTA_KINDS.forEach((kind) => {
        if (!output[kind]) {
          output[kind] = { label: "", href: "", action: "", ctaType: "", shown: false, disabled: false };
        }
      });
      return output;
    }
    CTA_KINDS.forEach((kind) => {
      const actionObject = valueFrom2(source, actionObjectKeys(kind));
      const normalized = normalizeCtaAction(actionObject, source, kind);
      if (hasValue(normalized.label) || hasValue(normalized.href) || hasValue(normalized.action) || hasValue(actionObject)) {
        output[kind] = normalized;
      }
    });
    return output;
  }
  function actionComponentsForSource(source) {
    const actionsCollection = asArray2(firstValue(
      valueFrom2(source, ["actionComponents", "action-components", "action_components", "actions", "callToActions", "call-to-actions", "ctas", "ctaButtons", "buttons", "actionButtons", "heroActions", "heroActionButtons", "hero_action_buttons"])
    ));
    if (actionsCollection) {
      return actionsCollection.map((item2, index) => {
        const action = isPlainObject(item2) ? item2 : {};
        const kind = normalizeActionKind(
          valueFrom2(action, ["kind", "slot", "key", "cta", "ctaKey", "buttonKey", "position", "placement", "id", "name"]),
          CTA_KINDS[index] || `action-${index + 1}`
        );
        return {
          kind,
          id: valueFrom2(action, ["id", "actionId", "buttonId"]) || valueFrom2(action, ["name", "key"]) || `${kind}-${index + 1}`,
          ...normalizeCtaAction(action, {}, kind)
        };
      }).filter((action) => action.shown && Boolean(action.label));
    }
    const normalizedActions = normalizeActions(source);
    return CTA_KINDS.map((kind) => normalizedActions[kind] ? { kind, id: `${kind}-${CTA_KINDS.indexOf(kind) + 1}`, ...normalizedActions[kind] } : void 0).filter((action) => action && action.shown && Boolean(action.label));
  }
  function normalizeHeroData(value) {
    const source = unwrapHeroData(value);
    const brand = valueFrom2(source, ["brand", "brandInfo", "navigationBrand"]) || {};
    const visual = valueFrom2(source, ["visual", "image", "media", "heroImage", "background", "backgroundImage"]) || {};
    const navigation = asArray2(firstValue(
      valueFrom2(source, ["navItems", "navigation", "navigationItems", "nav", "links"])
    ));
    const details = asArray2(firstValue(
      valueFrom2(source, ["details", "detailItems", "tourDetails", "bullets", "bulletPoints", "facts", "keyDetails"])
    ));
    const actions = normalizeActions(source);
    const actionComponents = actionComponentsForSource(source);
    const attrs = {};
    const attrMap = [
      ["eyebrow", firstValue(valueFrom2(source, ["eyebrow", "overline", "kicker"]))],
      ["headline", firstValue(valueFrom2(source, ["headline", "title", "heading"]))],
      ["subheadline", firstValue(valueFrom2(source, ["subheadline", "subHeadline", "description", "summary", "body", "copy"]))],
      ["trust-signal", firstValue(valueFrom2(source, ["trustSignal", "trust-signal", "trust", "confidenceText"]))],
      ["theme", firstValue(valueFrom2(source, ["theme", "variant"]))],
      ["size", firstValue(valueFrom2(source, ["size", "density"]))],
      ["brand-label", firstValue(valueFrom2(brand, ["label", "name", "title"]), valueFrom2(source, ["brandLabel", "brand-label"]))],
      ["brand-mark", firstValue(valueFrom2(brand, ["mark", "iconText", "initials"]), valueFrom2(source, ["brandMark", "brand-mark"]))],
      ["visual-source", firstValue(valueFrom2(visual, ["source", "visualSource", "sourceType"]), valueFrom2(source, ["visualSource", "visual_source"]))],
      ["visual-role", firstValue(valueFrom2(visual, ["role", "visualRole", "type", "presentation"]), valueFrom2(source, ["visualRole", "visual_role"]))],
      ["visual-src", firstValue(valueFrom2(visual, ["src", "url", "href", "imageUrl", "imageSrc", "backgroundImageUrl", "value"]), valueFrom2(source, ["visualSrc", "visual_src", "visualUrl", "imageUrl", "imageSrc", "backgroundImageUrl", "backgroundImageSrc", "backgroundImage"]))],
      ["visual-asset-id", firstValue(valueFrom2(visual, ["assetId", "asset_id", "visualAssetId", "visual_asset_id"]), valueFrom2(source, ["visualAssetId", "visual_asset_id", "assetId", "asset_id"]))],
      ["visual-alt", firstValue(valueFrom2(visual, ["alt", "altText", "description"]), valueFrom2(source, ["visualAlt", "visual_alt", "imageAlt", "altText"]))],
      ["visual-mode", firstValue(valueFrom2(visual, ["mode", "visualMode", "position", "layout"]), valueFrom2(source, ["visualMode", "visualPosition", "imagePosition"]))],
      ["visual-position", firstValue(valueFrom2(visual, ["position", "visualPosition"]), valueFrom2(source, ["visualPosition"]))],
      ["layout-opacity", firstValue(valueFrom2(source, ["layoutOpacity", "layout-opacity", "opacity", "layoutAlpha"]))]
    ];
    attrMap.forEach(([attribute, attrValue]) => {
      if (hasValue(attrValue)) attrs[attribute] = String(attrValue);
    });
    if (actionComponents.length) {
      attrs["action-components"] = JSON.stringify(actionComponents);
    }
    Object.entries(actions).forEach(([kind, action]) => {
      if (hasValue(action.label)) attrs[`${kind}-cta-label`] = String(action.label);
      else if (action.shown === false) attrs[`${kind}-cta-label`] = "";
      if (hasValue(action.href)) attrs[`${kind}-cta-href`] = String(action.href);
      else if (action.shown === false) attrs[`${kind}-cta-href`] = "";
      if (hasValue(action.action)) attrs[`${kind}-cta-action`] = String(action.action);
      else if (action.shown === false) attrs[`${kind}-cta-action`] = "";
      if (hasValue(action.ctaType)) attrs[`${kind}-cta-type`] = String(action.ctaType);
      else if (action.shown === false) attrs[`${kind}-cta-type`] = "";
      attrs[`show-${kind}-cta`] = action.shown ? "true" : "false";
      attrs[`${kind}-cta-disabled`] = action.disabled ? "true" : "false";
    });
    return { attrs, details, navItems: navigation };
  }
  var BaseHTMLElement = typeof HTMLElement === "undefined" ? class {
  } : HTMLElement;
  var UibHero = class extends BaseHTMLElement {
    static get observedAttributes() {
      return [
        "eyebrow",
        "headline",
        "subheadline",
        "primary-cta-label",
        "primary-cta-href",
        "primary-cta-action",
        "primary-cta-action-token",
        "primary-cta-type",
        "show-primary-cta",
        "primary-cta-disabled",
        "secondary-cta-label",
        "secondary-cta-href",
        "secondary-cta-action",
        "secondary-cta-action-token",
        "secondary-cta-type",
        "show-secondary-cta",
        "secondary-cta-disabled",
        "third-cta-label",
        "third-cta-href",
        "third-cta-action",
        "third-cta-action-token",
        "third-cta-type",
        "show-third-cta",
        "third-cta-disabled",
        "fourth-cta-label",
        "fourth-cta-href",
        "fourth-cta-action",
        "fourth-cta-action-token",
        "fourth-cta-type",
        "show-fourth-cta",
        "fourth-cta-disabled",
        "visual-source",
        "visual-role",
        "visual-src",
        "visual-asset-id",
        "visual-alt",
        "visual-mode",
        "visual-position",
        "layout-opacity",
        "trust-signal",
        "nav-items",
        "details",
        "asset-map",
        "theme",
        "size",
        "brand-label",
        "brand-mark",
        "hero-data",
        "hero-json",
        "action-components",
        "hero-action-buttons",
        "actions",
        "action-buttons"
      ];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._details = void 0;
      this._navItems = void 0;
      this._heroData = void 0;
      this._isApplyingHeroData = false;
    }
    connectedCallback() {
      const serializedHeroData = this.getAttribute("hero-data") || this.getAttribute("hero-json");
      if (serializedHeroData) {
        this.loadHeroData(serializedHeroData);
        return;
      }
      this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (HERO_DATA_ATTRIBUTES.has(name)) {
        this.loadHeroData(newValue);
        return;
      }
      if (this.isConnected && !this._isApplyingHeroData) this.render();
    }
    get details() {
      if (this.hasAttribute("details")) return parseJsonArray(this.getAttribute("details"));
      return Array.isArray(this._details) ? this._details : [];
    }
    set details(value) {
      this._details = Array.isArray(value) ? value : [];
      if (this.isConnected && !this._isApplyingHeroData) this.render();
    }
    get navItems() {
      if (this.hasAttribute("nav-items")) return parseJsonArray(this.getAttribute("nav-items"));
      return Array.isArray(this._navItems) ? this._navItems : [];
    }
    set navItems(value) {
      this._navItems = Array.isArray(value) ? value : [];
      if (this.isConnected && !this._isApplyingHeroData) this.render();
    }
    get heroData() {
      return this._heroData;
    }
    set heroData(value) {
      this.loadHeroData(value);
    }
    /**
     * Loads Hero configuration from App Management UI / ORM JSON.
     *
     * The loader accepts a direct Hero object, a JSON string, or a wrapped ORM
     * response such as { data: { ... } }, { hero: { ... } }, or
     * { config: "{...}" }. It normalizes common app-management CTA objects
     * with label, Type, value, Show, and Disabled fields into the Hero's
     * attribute model.
     *
     * @param {object|string} value Hero configuration object or JSON string.
     * @returns {UibHero} The current element for chaining.
     */
    loadHeroData(value) {
      this._heroData = parseMaybeJson(value);
      const normalized = normalizeHeroData(value);
      this._isApplyingHeroData = true;
      try {
        Object.entries(normalized.attrs).forEach(([name, attrValue]) => {
          if (hasValue(attrValue)) this.setAttribute(name, String(attrValue));
          else this.removeAttribute(name);
        });
        if (Array.isArray(normalized.details)) this._details = normalized.details;
        if (Array.isArray(normalized.navItems)) this._navItems = normalized.navItems;
      } finally {
        this._isApplyingHeroData = false;
      }
      if (this.isConnected) this.render();
      return this;
    }
    get showPrimaryCta() {
      return boolFromAttribute2(this.getAttribute("show-primary-cta"), true);
    }
    set showPrimaryCta(value) {
      this.setAttribute("show-primary-cta", value ? "true" : "false");
    }
    get showSecondaryCta() {
      return boolFromAttribute2(this.getAttribute("show-secondary-cta"), true);
    }
    set showSecondaryCta(value) {
      this.setAttribute("show-secondary-cta", value ? "true" : "false");
    }
    get showThirdCta() {
      return boolFromAttribute2(this.getAttribute("show-third-cta"), true);
    }
    set showThirdCta(value) {
      this.setAttribute("show-third-cta", value ? "true" : "false");
    }
    get showFourthCta() {
      return boolFromAttribute2(this.getAttribute("show-fourth-cta"), true);
    }
    set showFourthCta(value) {
      this.setAttribute("show-fourth-cta", value ? "true" : "false");
    }
    get primaryCtaDisabled() {
      return boolFromAttribute2(this.getAttribute("primary-cta-disabled"), false);
    }
    set primaryCtaDisabled(value) {
      this.setAttribute("primary-cta-disabled", value ? "true" : "false");
    }
    get secondaryCtaDisabled() {
      return boolFromAttribute2(this.getAttribute("secondary-cta-disabled"), false);
    }
    set secondaryCtaDisabled(value) {
      this.setAttribute("secondary-cta-disabled", value ? "true" : "false");
    }
    get thirdCtaDisabled() {
      return boolFromAttribute2(this.getAttribute("third-cta-disabled"), false);
    }
    set thirdCtaDisabled(value) {
      this.setAttribute("third-cta-disabled", value ? "true" : "false");
    }
    get fourthCtaDisabled() {
      return boolFromAttribute2(this.getAttribute("fourth-cta-disabled"), false);
    }
    set fourthCtaDisabled(value) {
      this.setAttribute("fourth-cta-disabled", value ? "true" : "false");
    }
    get layoutOpacity() {
      return normalizeLayoutOpacity(this.getAttribute("layout-opacity"), 0.8);
    }
    set layoutOpacity(value) {
      this.setAttribute("layout-opacity", String(normalizeLayoutOpacity(value, 0.8)));
    }
    render() {
      const headline = this.getAttribute("headline") || "Page headline";
      const subheadline = this.getAttribute("subheadline") || "";
      const eyebrow = this.getAttribute("eyebrow") || "";
      const theme = this.getAttribute("theme") || "light";
      const size = this.getAttribute("size") || "default";
      const visualSrc = this.getAttribute("visual-src") || "";
      const visualAssetId = this.getAttribute("visual-asset-id") || "";
      const visualSource = normalizeVisualSource(this.getAttribute("visual-source"), visualSrc, visualAssetId);
      const visualRole = normalizeVisualRole(this.getAttribute("visual-role"), this.getAttribute("visual-mode") || this.getAttribute("visual-position"));
      const visualPosition = normalizeVisualPosition(this.getAttribute("visual-mode"), this.getAttribute("visual-position"), visualRole);
      const layoutOpacity = this.layoutOpacity;
      const visualAlt = this.getAttribute("visual-alt") || "";
      const trustSignal = this.getAttribute("trust-signal") || "";
      const brandLabel = this.getAttribute("brand-label") || "";
      const brandMark = this.getAttribute("brand-mark") || "UIB";
      const assetMap = this.getAttribute("asset-map") || "";
      const navMarkup = this.renderNavigation(brandLabel, brandMark, this.navItems);
      const detailsMarkup = this.renderDetails(this.details, assetMap);
      const actionsMarkup = this.renderActions();
      const resolvedVisual = resolveVisualSourceValue(visualSource, visualSrc, visualAssetId);
      const visualMarkup = resolvedVisual.source !== "none" ? `<uib-asset-image src="` + escapeHtml4(safeHref3(resolvedVisual.src)) + `" asset-id="` + escapeHtml4(resolvedVisual.assetId) + `" asset-map='` + escapeHtml4(assetMap) + `' alt="` + escapeHtml4(visualAlt) + `" role="` + escapeHtml4(visualRole) + `" fit="` + (visualRole === "icon" || visualRole === "svg" ? "contain" : "cover") + `" fallback-label="` + escapeHtml4(headline) + `"></uib-asset-image>` : `<div class="uib-hero__visual-placeholder" aria-hidden="true"><div class="uib-hero__visual-card"><strong>` + escapeHtml4(headline) + `</strong><div class="uib-hero__visual-line"></div><div class="uib-hero__visual-line"></div><div class="uib-hero__visual-line"></div></div></div>`;
      const visualContainerMarkup = `<div class="uib-hero__visual" part="visual" data-visual-role="` + escapeHtml4(visualRole) + `" data-visual-source="` + escapeHtml4(resolvedVisual.source) + `"><slot name="visual">` + visualMarkup + `</slot></div>`;
      const usesBackgroundVisual = visualPosition === "background";
      this.shadowRoot.innerHTML = `<style>` + styles21 + `</style><section class="uib-hero uib-hero--` + escapeHtml4(theme) + ` uib-hero--` + escapeHtml4(size) + ` uib-hero--` + escapeHtml4(visualPosition) + `" part="hero" aria-label="` + escapeHtml4(headline) + `" style="--uib-hero-layout-opacity: ` + layoutOpacity + `;"> ` + (usesBackgroundVisual ? visualContainerMarkup : "") + ` ` + navMarkup + ` <div class="uib-hero__layout" part="layout"><div class="uib-hero__content" part="content"><uib-heading-block eyebrow="` + escapeHtml4(eyebrow) + `" headline="` + escapeHtml4(headline) + `" subheadline="` + escapeHtml4(subheadline) + `" size="` + escapeHtml4(size) + `"></uib-heading-block> ` + actionsMarkup + ` <div class="uib-hero__trust" part="trust"><slot name="trust">` + (trustSignal ? escapeHtml4(trustSignal) : "") + `</slot></div><slot name="after-content"></slot></div> ` + (usesBackgroundVisual ? "" : visualContainerMarkup) + ` </div> ` + detailsMarkup + ` </section>`;
      this.bindActionHandlers();
    }
    renderNavigation(brandLabel, brandMark, items2) {
      const hasNav = brandLabel || items2.length;
      return `<header class="uib-hero__nav" part="nav" ` + (hasNav ? "" : "hidden") + `><div class="uib-hero__brand" part="brand" ` + (brandLabel ? "" : "hidden") + `><span class="uib-hero__brand-mark" part="brand-mark" aria-hidden="true">` + escapeHtml4(brandMark) + `</span><span>` + escapeHtml4(brandLabel) + `</span></div><div class="uib-hero__nav-links" part="nav-links"><slot name="navigation">` + items2.map((item2) => {
        const label = escapeHtml4(item2.label || "Link");
        const href = escapeHtml4(safeHref3(item2.href));
        return `<a href="${href}">${label}</a>`;
      }).join("") + `</slot></div></header>`;
    }
    explicitActionButtons() {
      const serialized = this.getAttribute("action-components") || this.getAttribute("hero-action-buttons") || this.getAttribute("actions") || this.getAttribute("action-buttons") || "";
      const collection = asArray2(serialized);
      if (!collection) return void 0;
      return collection.map((item2, index) => {
        const action = isPlainObject(item2) ? item2 : {};
        const kind = normalizeActionKind(
          valueFrom2(action, ["kind", "slot", "key", "cta", "ctaKey", "buttonKey", "position", "placement"]),
          CTA_KINDS[index] || "secondary"
        );
        return {
          kind,
          index,
          id: valueFrom2(action, ["id", "name", "actionId", "key"]) || `${kind}-${index + 1}`,
          ...normalizeCtaAction(action, {}, kind)
        };
      }).filter((action) => action.shown && Boolean(action.label));
    }
    renderActions() {
      const explicitActions = this.explicitActionButtons();
      const actions = explicitActions || [
        {
          kind: "primary",
          label: this.getAttribute("primary-cta-label") || "",
          href: this.getAttribute("primary-cta-href") || "",
          action: this.getAttribute("primary-cta-action") || this.getAttribute("primary-cta-action-token") || "",
          ctaType: this.getAttribute("primary-cta-type") || "",
          shown: this.showPrimaryCta,
          disabled: this.primaryCtaDisabled
        },
        {
          kind: "secondary",
          label: this.getAttribute("secondary-cta-label") || "",
          href: this.getAttribute("secondary-cta-href") || "",
          action: this.getAttribute("secondary-cta-action") || this.getAttribute("secondary-cta-action-token") || "",
          ctaType: this.getAttribute("secondary-cta-type") || "",
          shown: this.showSecondaryCta,
          disabled: this.secondaryCtaDisabled
        },
        {
          kind: "third",
          label: this.getAttribute("third-cta-label") || "",
          href: this.getAttribute("third-cta-href") || "",
          action: this.getAttribute("third-cta-action") || this.getAttribute("third-cta-action-token") || "",
          ctaType: this.getAttribute("third-cta-type") || "",
          shown: this.showThirdCta,
          disabled: this.thirdCtaDisabled
        },
        {
          kind: "fourth",
          label: this.getAttribute("fourth-cta-label") || "",
          href: this.getAttribute("fourth-cta-href") || "",
          action: this.getAttribute("fourth-cta-action") || this.getAttribute("fourth-cta-action-token") || "",
          ctaType: this.getAttribute("fourth-cta-type") || "",
          shown: this.showFourthCta,
          disabled: this.fourthCtaDisabled
        }
      ].filter((action) => action.shown && Boolean(action.label));
      if (!actions.length) return "";
      return `<div class="uib-hero__actions" aria-label="Hero actions"><uib-action-group actions='` + escapeHtml4(JSON.stringify(actions)) + `'></uib-action-group></div>`;
    }
    renderAction(action) {
      const safeLabel = escapeHtml4(action.label);
      const safeLink = safeHref3(action.href);
      const variant = normalizeActionVariant(action.variant, action.kind || "secondary");
      const actionName = variant;
      const actionKey = action.kind || action.id || actionName;
      const className = `uib-hero__button uib-hero__button--${variant}`;
      const disabledAttrs = action.disabled ? ' aria-disabled="true" tabindex="-1"' : ' aria-disabled="false"';
      const dataAttrs = [
        `data-uib-hero-action="${escapeHtml4(actionName)}"`,
        `data-uib-hero-action-key="${escapeHtml4(actionKey)}"`,
        `data-uib-hero-cta-variant="${escapeHtml4(variant)}"`,
        `data-uib-hero-cta-action="${escapeHtml4(action.action || "")}"`,
        `data-uib-hero-cta-action-token="${escapeHtml4(action.action || "")}"`,
        `data-uib-hero-cta-type="${escapeHtml4(action.ctaType || "")}"`
      ].join(" ");
      if (safeLink && safeLink !== "#") {
        return `<a class="` + className + `" href="` + escapeHtml4(safeLink) + `" ` + dataAttrs + disabledAttrs + `> ` + safeLabel + ` </a>`;
      }
      return `<button class="` + className + `" type="button" ` + dataAttrs + ` aria-disabled="` + (action.disabled ? "true" : "false") + `">` + safeLabel + `</button>`;
    }
    renderDetails(items2, assetMap = "") {
      if (!items2.length) return "";
      return `<div class="uib-hero__details" part="details"><uib-detail-list details='` + escapeHtml4(JSON.stringify(items2)) + `' asset-map='` + escapeHtml4(assetMap) + `'></uib-detail-list></div>`;
    }
    bindActionHandlers() {
      this.shadowRoot.querySelectorAll("uib-action-button").forEach((element) => {
        element.addEventListener("uib-action-button-click", (event) => {
          const sourceDetail = event.detail || {};
          const kind = sourceDetail.kind || sourceDetail.action || "action";
          const variant = sourceDetail.variant || kind || "";
          const ctaAction = sourceDetail.action || "";
          const actionToken = sourceDetail.actionToken || ctaAction;
          const href = sourceDetail.href || "";
          const label = sourceDetail.label || "";
          const disabled = Boolean(sourceDetail.disabled);
          const detail = { cta: kind, variant, action: ctaAction || kind, ctaAction, actionToken, ctaType: href ? "link" : actionToken ? "action" : "", href, label, disabled, hasHref: Boolean(href && href !== "#"), originalEvent: event };
          const unifiedEvent = new CustomEvent("uib-hero-cta", { bubbles: true, composed: true, cancelable: true, detail });
          const legacyEvent = new CustomEvent(`uib-hero-${kind}-cta`, { bubbles: true, composed: true, cancelable: true, detail });
          const unifiedAllowed = this.dispatchEvent(unifiedEvent);
          const legacyAllowed = this.dispatchEvent(legacyEvent);
          if (disabled || !unifiedAllowed || !legacyAllowed) event.preventDefault();
        });
      });
    }
  };
  registerHeroElement("uib-hero", UibHero);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/hero/src/uib-hero-preview.js
  function recordValue(record, ...keys) {
    for (const key of keys) {
      const value = record[key];
      if (value !== void 0 && value !== null && value !== "") return String(value);
    }
    return "";
  }
  function slotMarkup(record, name, modeField, contentField) {
    const mode = record[modeField] || "empty";
    const content = record[contentField] || "";
    if (mode !== "custom" || !String(content).trim()) return "";
    return `<div slot="` + escapeHtml3(name) + `">` + content + `</div>`;
  }
  var UibHeroPreview = class extends HTMLElement {
    static get observedAttributes() {
      return ["hero-data", "hero-json", "asset-map", "application-key", "brand-label", "brand-mark"];
    }
    constructor() {
      super();
      this.heroRecord = {};
    }
    connectedCallback() {
      if (!Object.keys(this.heroRecord).length) this.readHeroDataFromAttributes();
      this.render();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "hero-data" || name === "hero-json") this.readHeroDataFromAttributes();
      if (this.isConnected) this.render();
    }
    set record(value) {
      this.heroRecord = normalizeHeroRecord(value || {});
      if (this.isConnected) this.render();
    }
    get record() {
      return { ...this.heroRecord };
    }
    set heroData(value) {
      this.record = value;
    }
    get heroData() {
      return this.record;
    }
    loadHeroData(value) {
      this.record = parseObject4(value);
    }
    readHeroDataFromAttributes() {
      const raw = this.getAttribute("hero-data") || this.getAttribute("hero-json") || "";
      if (raw) this.heroRecord = normalizeHeroRecord(parseObject4(raw));
    }
    render() {
      const record = normalizeHeroRecord(this.heroRecord);
      this.heroRecord = record;
      const navItems = record.nav_items || "[]";
      const details = record.details || "[]";
      const navCount = parseArray(navItems).length;
      const detailsCount = parseArray(details).length;
      const actionsJson = JSON.stringify(heroActionsForRecord(record));
      const applicationKey = record.application_key || this.getAttribute("application-key") || "";
      const brandLabel = this.getAttribute("brand-label") || (applicationKey ? `${applicationKey} preview` : "Hero preview");
      const brandMark = this.getAttribute("brand-mark") || (applicationKey || "UIB").slice(0, 2).toUpperCase();
      const visualMode = resolveHeroVisualMode(record);
      const assetMap = this.getAttribute("asset-map") || record.asset_map || "";
      this.innerHTML = `<style> :host{display:block;color:var(--uib-hero-editor-text,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)} *,*::before,*::after{box-sizing:border-box} .preview-card{display:grid;gap:1rem} .preview-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap} h2{margin:0;color:var(--uib-color-primary,#174a8b);font-size:1.05rem;line-height:1.2} p{margin:.25rem 0 0;color:var(--uib-color-muted,#53657f);line-height:1.45} .status{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;color:var(--uib-color-muted,#53657f);font-size:.85rem;font-weight:750} .badge{display:inline-flex;align-items:center;min-height:1.55rem;padding:.16rem .55rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:999px;background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-primary,#174a8b);font-size:.74rem;font-weight:900;text-transform:uppercase} .shell{min-width:0;overflow:auto;padding:.75rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:1rem;background:var(--uib-color-surface-soft,#f8fbff)} uib-hero{min-width:min(100%,52rem)} </style><section class="preview-card"><div class="preview-head"><div><h2> Live preview </h2><p> The preview renders the currently edited Hero record. </p></div><div class="status"><span class="badge"> ` + escapeHtml3(record.theme || "theme") + ` </span><span> ` + navCount + ` nav item ` + (navCount === 1 ? "" : "s") + ` </span><span> ` + detailsCount + ` detail ` + (detailsCount === 1 ? "" : "s") + ` </span></div></div><div class="shell"><uib-hero eyebrow="` + escapeHtml3(record.eyebrow) + `" headline="` + escapeHtml3(record.headline || "Hero headline") + `" subheadline="` + escapeHtml3(record.subheadline) + `" action-components="` + escapeHtml3(actionsJson) + `" visual-source="` + escapeHtml3(record.visual_source || "none") + `" visual-role="` + escapeHtml3(record.visual_role || "image") + `" visual-src="` + escapeHtml3(recordValue(record, "visual_src", "visualSrc")) + `" visual-asset-id="` + escapeHtml3(recordValue(record, "visual_asset_id", "visualAssetId")) + `" visual-alt="` + escapeHtml3(recordValue(record, "visual_alt", "visualAlt")) + `" visual-mode="` + escapeHtml3(visualMode) + `" visual-position="` + escapeHtml3(visualPositionForMode(visualMode)) + `" layout-opacity="` + escapeHtml3(record.layout_opacity || "0.8") + `" trust-signal="` + escapeHtml3(record.trust_signal) + `" nav-items="` + escapeHtml3(navItems) + `" details="` + escapeHtml3(details) + `" asset-map="` + escapeHtml3(assetMap) + `" theme="` + escapeHtml3(record.theme || "organization") + `" size="` + escapeHtml3(record.size || "large") + `" brand-label="` + escapeHtml3(brandLabel) + `" brand-mark="` + escapeHtml3(brandMark) + `"> ` + slotMarkup(record, "navigation", "navigation_slot_mode", "navigation_slot") + ` ` + slotMarkup(record, "visual", "visual_slot_mode", "visual_slot") + ` ` + slotMarkup(record, "trust", "trust_slot_mode", "trust_slot") + ` ` + slotMarkup(record, "after-content", "after_content_slot_mode", "after_content_slot") + ` </uib-hero></div></section>`;
    }
  };
  registerHeroElement("uib-hero-preview", UibHeroPreview);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/providers/orm-asset-provider.js
  function joinUrl(baseUrl, path) {
    return `${String(baseUrl || "").replace(/\/$/, "")}${path}`;
  }
  function queryString(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === void 0 || value === null || value === "" || value === "all") return;
      search.set(key, String(value));
    });
    const text = search.toString();
    return text ? `?${text}` : "";
  }
  function unwrapRecord(value) {
    if (value?.storageRecord || value?.record) {
      return { ...value.storageRecord || {}, ...value.record || {}, ...value.asset || {} };
    }
    return value?.record || value?.asset || value;
  }
  function recordsFromBody(body) {
    if (Array.isArray(body)) return body.map(unwrapRecord);
    if (Array.isArray(body?.records)) return body.records.map(unwrapRecord);
    if (Array.isArray(body?.items)) return body.items.map(unwrapRecord);
    return [];
  }
  function normalizeCategory(category) {
    const record = unwrapRecord(category) || {};
    return {
      key: record.key || record.categoryKey || record.category_key || record.id || "",
      name: record.name || record.displayName || record.display_name || record.categoryKey || record.category_key || record.key || "",
      description: record.description || "",
      raw: record
    };
  }
  async function parseResponse(response) {
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      const error = new Error(body?.error || body?.message || `Request failed with ${response.status}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  }
  function appendFormValue(form, key, value) {
    if (value === void 0 || value === null || value === "") return;
    if (Array.isArray(value)) form.append(key, JSON.stringify(value));
    else if (typeof value === "object" && !(typeof Blob !== "undefined" && value instanceof Blob)) form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  }
  function assetUpdatePayload(patch = {}) {
    const out = { ...patch };
    if (Object.prototype.hasOwnProperty.call(out, "key") && !Object.prototype.hasOwnProperty.call(out, "asset_key")) out.asset_key = out.key;
    if (Object.prototype.hasOwnProperty.call(out, "assetKey") && !Object.prototype.hasOwnProperty.call(out, "asset_key")) out.asset_key = out.assetKey;
    if (Object.prototype.hasOwnProperty.call(out, "scope") && !Object.prototype.hasOwnProperty.call(out, "reuse_scope")) out.reuse_scope = out.scope;
    if (Object.prototype.hasOwnProperty.call(out, "reuseScope") && !Object.prototype.hasOwnProperty.call(out, "reuse_scope")) out.reuse_scope = out.reuseScope;
    if (Object.prototype.hasOwnProperty.call(out, "visibility") && !Object.prototype.hasOwnProperty.call(out, "asset_visibility")) out.asset_visibility = out.visibility;
    if (Object.prototype.hasOwnProperty.call(out, "assetVisibility") && !Object.prototype.hasOwnProperty.call(out, "asset_visibility")) out.asset_visibility = out.assetVisibility;
    if (Array.isArray(out.categories) && !out.category) out.category = out.categories[0] || "";
    if (Array.isArray(out.tags)) out.tags = JSON.stringify(out.tags);
    delete out.key;
    delete out.assetKey;
    delete out.scope;
    delete out.reuseScope;
    delete out.visibility;
    delete out.assetVisibility;
    delete out.categories;
    return out;
  }
  function assetCreatePayload(request = {}) {
    const scope = request.reuseScope || request.reuse_scope || request.scope || "global";
    const visibility = request.assetVisibility || request.asset_visibility || request.visibility || "public";
    const fileType = request.assetType || request.asset_type || request.fileType || "other";
    const category = request.category || request.categoryKey || request.category_key || request.categories?.[0] || "general";
    return {
      asset_key: request.assetKey || request.asset_key || request.key,
      name: request.name,
      description: request.description,
      asset_type: fileType,
      fileType,
      mime_type: request.mimeType || request.mime_type,
      mimeType: request.mimeType || request.mime_type,
      category,
      categories: request.categories || [category].filter(Boolean),
      reuse_scope: scope,
      scope,
      asset_visibility: visibility,
      visibility,
      tags: request.tags || [],
      usage_context: request.usageContext || request.usage_context,
      alt_text: request.altText || request.alt_text,
      caption: request.caption,
      is_active: request.isActive ?? request.is_active ?? true,
      is_public: visibility === "public",
      original_file_name: request.originalFileName || request.original_file_name || request.fileName,
      fileName: request.fileName,
      file_size_bytes: request.fileSizeBytes || request.file_size_bytes,
      application_key: request.applicationKey || request.application_key
    };
  }
  var OrmAssetProvider = class {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || "";
      this.applicationKey = options.applicationKey || "";
      this.getAuthHeaders = options.getAuthHeaders || (() => ({}));
      this.fetchImpl = options.fetch || globalThis.fetch?.bind(globalThis);
      this.supportsDirectFileUpload = true;
      if (!this.fetchImpl) throw new Error("OrmAssetProvider requires fetch support or an options.fetch implementation.");
    }
    headers(extra = {}) {
      return { ...this.getAuthHeaders(), ...extra };
    }
    canManageFromHeaders() {
      const headers = this.headers();
      return ["X-Orm-Admin", "X-Application-Admin", "X-Shared-Asset-Admin", "X-Global-Asset-Admin", "X-Admin-Applications"].some((name) => Boolean(headers[name] || headers[name.toLowerCase()]));
    }
    normalizeAssetRecord(record) {
      const normalized = normalizeAsset(record);
      if (this.canManageFromHeaders()) normalized.permissions = { ...normalized.permissions, ...MANAGER_ASSET_PERMISSIONS };
      return normalized;
    }
    async request(path, options = {}) {
      const headers = this.headers(options.headers || {});
      if (options.body instanceof FormData) delete headers["Content-Type"];
      const response = await this.fetchImpl(joinUrl(this.baseUrl, path), {
        ...options,
        headers
      });
      return parseResponse(response);
    }
    assetsPath(assetId = "", suffix = "", applicationKey = this.applicationKey) {
      const scopePath = applicationKey ? `/applications/${encodeURIComponent(applicationKey)}/assets` : "/assets";
      return `${scopePath}${assetId ? `/${encodeURIComponent(assetId)}` : ""}${suffix}`;
    }
    async search(request = {}) {
      const filters = request.filters || {};
      const applicationKey = request.applicationKey ?? filters.applicationKey ?? this.applicationKey;
      const body = await this.request(`${this.assetsPath("", "", applicationKey)}${queryString({
        search: request.query,
        q: request.query,
        application_key: filters.applicationKey,
        asset_type: filters.fileType,
        fileType: filters.fileType,
        reuse_scope: filters.scope,
        scope: filters.scope,
        asset_visibility: filters.visibility,
        visibility: filters.visibility,
        category: filters.category,
        status: filters.status,
        includeShared: request.includeShared ? "true" : "",
        includeInactive: filters.status === "archived" || request.includeInactive ? "true" : ""
      })}`);
      const records = recordsFromBody(body).map((record) => this.normalizeAssetRecord(record));
      return { count: body?.count ?? records.length, records, facets: body?.facets || {} };
    }
    async getAsset(assetId, applicationKey = this.applicationKey) {
      return this.normalizeAssetRecord(unwrapRecord(await this.request(this.assetsPath(assetId, "", applicationKey))));
    }
    async createAsset(request = {}) {
      const payload = assetCreatePayload(request);
      if (typeof Blob !== "undefined" && request.file instanceof Blob) {
        const form = new FormData();
        form.append("file", request.file, request.fileName || request.file.name || "asset");
        Object.entries(payload).forEach(([key, value]) => appendFormValue(form, key, value));
        const created = await this.request(this.assetsPath("", "", request.applicationKey || request.application_key || this.applicationKey), {
          method: "POST",
          body: form
        });
        return this.normalizeAssetRecord(unwrapRecord(created));
      }
      return this.normalizeAssetRecord(unwrapRecord(await this.request(this.assetsPath("", "", request.applicationKey || request.application_key || this.applicationKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })));
    }
    async updateAsset(assetId, patch = {}) {
      const payload = assetUpdatePayload(patch);
      return this.normalizeAssetRecord(unwrapRecord(await this.request(this.assetsPath(assetId, "", patch.applicationKey || patch.application_key || this.applicationKey), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })));
    }
    async uploadAssetFile(assetId, file, options = {}) {
      const form = new FormData();
      form.append("file", file);
      Object.entries(options).forEach(([key, value]) => appendFormValue(form, key, value));
      return this.request(this.assetsPath(assetId, "/replace-file", options.applicationKey || this.applicationKey), { method: "POST", body: form });
    }
    async copyAssetToApplication(assetId, applicationKey = this.applicationKey, options = {}) {
      const body = await this.request(this.assetsPath(assetId, "/copy", applicationKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options)
      });
      return this.normalizeAssetRecord(unwrapRecord(body));
    }
    async createExternalUrlAsset(request = {}) {
      return this.normalizeAssetRecord(unwrapRecord(await this.request(`${this.assetsPath("", "", request.applicationKey || request.application_key || this.applicationKey)}/external-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      })));
    }
    async createJsonAsset(request = {}) {
      return this.normalizeAssetRecord(unwrapRecord(await this.request(`${this.assetsPath("", "", request.applicationKey || request.application_key || this.applicationKey)}/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      })));
    }
    async archiveAsset(assetId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async restoreAsset(assetId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async hardDeleteAsset(assetId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/hard-delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async submitVersion(assetId, versionId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/versions/${encodeURIComponent(versionId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async approveVersion(assetId, versionId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/versions/${encodeURIComponent(versionId)}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async rejectVersion(assetId, versionId, reason = "") {
      return this.request(`${this.assetsPath(assetId)}/versions/${encodeURIComponent(versionId)}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
    }
    async listCategories() {
      try {
        const body = await this.request("/assets/categories");
        return recordsFromBody(body).map(normalizeCategory);
      } catch (error) {
        if (error.status !== 404) throw error;
        const fallback = await this.request("/asset-categories");
        return recordsFromBody(fallback).map(normalizeCategory);
      }
    }
    async listPermissionSets() {
      try {
        const body = await this.request("/assets/permission-sets");
        return recordsFromBody(body);
      } catch (error) {
        if (error.status === 404) return [];
        throw error;
      }
    }
    async listUsage(assetId) {
      try {
        const body = await this.request(`${this.assetsPath(assetId)}/usage`);
        return recordsFromBody(body);
      } catch (error) {
        if (error.status === 404) return [];
        throw error;
      }
    }
    async listVersions(assetId) {
      try {
        const body = await this.request(`${this.assetsPath(assetId)}/versions`);
        return recordsFromBody(body);
      } catch (error) {
        if (error.status === 404) return [];
        throw error;
      }
    }
    async getUploadPolicy() {
      try {
        return await this.request("/assets/upload-policy");
      } catch (error) {
        if (error.status === 404) return null;
        throw error;
      }
    }
  };
  function createOrmAssetProvider(options = {}) {
    return new OrmAssetProvider(options);
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/components/uib-asset-thumbnail.js
  var BaseHTMLElement2 = typeof HTMLElement === "undefined" ? class {
  } : HTMLElement;
  function fileProfile(asset) {
    const mimeType = String(asset?.mimeType || "").toLowerCase();
    const fileName = String(asset?.fileName || asset?.name || "").toLowerCase();
    const fileType = String(asset?.fileType || asset?.assetType || "other").toLowerCase();
    if (fileType === "pdf" || mimeType.includes("pdf") || fileName.endsWith(".pdf")) return { label: "PDF", title: "PDF document", kind: "pdf" };
    if (/\.(doc|docx|rtf)$/.test(fileName) || mimeType.includes("word") || mimeType.includes("officedocument.wordprocessingml")) return { label: "DOC", title: "Word document", kind: "word" };
    if (/\.(xls|xlsx|csv)$/.test(fileName) || mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType.includes("csv")) return { label: "XLS", title: "Excel spreadsheet", kind: "excel" };
    if (/\.(ppt|pptx)$/.test(fileName) || mimeType.includes("powerpoint") || mimeType.includes("presentation")) return { label: "PPT", title: "PowerPoint presentation", kind: "powerpoint" };
    if (/\.(txt|md)$/.test(fileName) || mimeType.startsWith("text/")) return { label: "TXT", title: "Text document", kind: "text" };
    if (/\.(json)$/.test(fileName) || mimeType.includes("json") || fileType === "json") return { label: "JSON", title: "JSON asset", kind: "json" };
    if (mimeType.startsWith("video/") || fileType === "video") return { label: "VID", title: "Video asset", kind: "video" };
    if (mimeType.startsWith("audio/") || fileType === "audio") return { label: "AUD", title: "Audio asset", kind: "audio" };
    if (fileType === "document") return { label: "DOC", title: "Document", kind: "document" };
    if (fileType === "external_url") return { label: "URL", title: "External URL", kind: "url" };
    return { label: String(fileType || "file").slice(0, 4).toUpperCase(), title: humanize(fileType || "file"), kind: "file" };
  }
  var UibAssetThumbnail = class extends BaseHTMLElement2 {
    static get observedAttributes() {
      return ["label", "file-type", "thumbnail-url", "url", "mime-type", "file-name"];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._asset = null;
    }
    set asset(value) {
      this._asset = value ? normalizeAsset(value) : null;
      if (this.isConnected) this.render();
    }
    get asset() {
      return this._asset;
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    render() {
      const asset = this._asset || normalizeAsset({
        name: this.getAttribute("label") || "Asset",
        fileType: this.getAttribute("file-type") || "other",
        thumbnailUrl: this.getAttribute("thumbnail-url") || this.getAttribute("url") || "",
        url: this.getAttribute("url") || "",
        mimeType: this.getAttribute("mime-type") || "",
        fileName: this.getAttribute("file-name") || ""
      });
      const url = asset.thumbnailUrl || asset.url;
      const isImage = url && ["image", "svg", "icon"].includes(String(asset.fileType || "").toLowerCase());
      const profile = fileProfile(asset);
      this.shadowRoot.innerHTML = `<style>` + baseAssetStyles + ` .thumb { overflow: hidden; width: 100%; min-height: 7rem; display: grid; place-items: center; border: 1px solid var(--uib-assets-border); border-radius: 0.9rem; background: linear-gradient(135deg, rgba(23, 74, 139, 0.08), rgba(244, 189, 70, 0.12)), var(--uib-assets-surface-soft); } img { width: 100%; height: 100%; min-height: 7rem; object-fit: cover; } .fallback { display: grid; gap: 0.35rem; place-items: center; padding: 0.85rem; color: var(--uib-assets-muted); text-align: center; } .file-icon { position: relative; width: 3.7rem; height: 4.4rem; display: grid; place-items: end center; padding: 0.45rem 0.3rem; border-radius: 0.35rem; border: 1px solid rgba(19, 41, 75, 0.18); background: var(--uib-assets-surface); color: var(--uib-assets-text); font-size: 0.82rem; font-weight: 950; line-height: 1; box-shadow: 0 8px 18px rgba(10, 31, 68, 0.08); } .file-icon::before { content: ''; position: absolute; top: -1px; right: -1px; border-top: 1.05rem solid var(--uib-assets-surface-soft); border-left: 1.05rem solid transparent; border-radius: 0 0.35rem 0 0; } .file-icon::after { content: ''; position: absolute; left: 0.48rem; right: 0.48rem; bottom: 1.45rem; height: 0.45rem; border-top: 2px solid currentColor; border-bottom: 2px solid currentColor; opacity: 0.42; } .file-icon[data-kind="pdf"] { color: #b4232a; } .file-icon[data-kind="word"] { color: #174a8b; } .file-icon[data-kind="excel"] { color: #2e7d32; } .file-icon[data-kind="powerpoint"] { color: #b85c00; } .file-icon[data-kind="video"] { color: #6c3dbb; } .file-icon[data-kind="audio"] { color: #7a4f00; } .file-label { font-size: 0.75rem; font-weight: 800; } </style><div class="thumb" role="img" aria-label="` + escapeHtml2(asset.name) + ` thumbnail"> ` + (isImage ? `<img src="${escapeHtml2(url)}" alt="${escapeHtml2(asset.name)}" loading="lazy" />` : `
          <div class="fallback">
            <span class="file-icon" data-kind="${escapeHtml2(profile.kind)}">${escapeHtml2(profile.label)}</span>
            <span class="file-label">${escapeHtml2(profile.title)}</span>
          </div>
        `) + ` </div>`;
    }
  };
  registerElement("uib-asset-thumbnail", UibAssetThumbnail);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/components/uib-asset-picker.js
  var BaseHTMLElement3 = typeof HTMLElement === "undefined" ? class {
  } : HTMLElement;
  var DEFAULT_PICKER_INSERTABLE_TYPES = ["image", "icon", "document", "svg", "pdf"];
  var DEFAULT_PICKER_ACCEPT = ["image/*", "application/pdf", "text/plain"];
  var DEFAULT_PICKER_STATUS = "active";
  function attrList(value, fallback = []) {
    if (!value) return [...fallback];
    return String(value).split(",").map((item2) => item2.trim()).filter(Boolean);
  }
  function categoryKey(category) {
    if (typeof category === "string") return category;
    return category?.key || category?.categoryKey || category?.category_key || category?.value || category?.id || "";
  }
  function categoryName(category) {
    if (typeof category === "string") return humanize(category);
    return category?.name || category?.displayName || category?.display_name || categoryKey(category);
  }
  function stripExtension(fileName = "") {
    return String(fileName || "Asset").replace(/\.[^.]+$/, "") || "Asset";
  }
  function slugify2(value) {
    return String(value || "asset").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "asset";
  }
  function uniqueUploadKey(name) {
    const base = slugify2(name);
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${base}-${stamp}-${random}`;
  }
  function inferFileType(file) {
    const mimeType = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    if (mimeType.startsWith("image/")) return name.includes("icon") || mimeType === "image/svg+xml" && name.includes("icon") ? "icon" : "image";
    if (mimeType === "application/pdf" || /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/.test(name)) return "document";
    if (mimeType.startsWith("text/")) return "document";
    if (mimeType === "application/json" || name.endsWith(".json")) return "json";
    return "other";
  }
  function acceptedMatches(file, acceptedTypes = []) {
    if (!file) return false;
    if (!acceptedTypes.length) return true;
    const fileType = String(file.type || "").toLowerCase();
    const fileName = String(file.name || "").toLowerCase();
    return acceptedTypes.some((accepted) => {
      const value = String(accepted || "").trim().toLowerCase();
      if (!value) return false;
      if (value.endsWith("/*")) return fileType.startsWith(value.slice(0, -1));
      if (value.startsWith(".")) return fileName.endsWith(value);
      return fileType === value;
    });
  }
  function parseSelectionValue(value) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    const parsed = parseJson(value, null);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (value === void 0 || value === null || value === "") return [];
    return String(value).split(",").map((item2) => item2.trim()).filter(Boolean);
  }
  function buildInsertPayload(asset, extra = {}) {
    const normalized = normalizeAsset(asset);
    return {
      assetId: normalized.id,
      assetKey: normalized.key,
      name: normalized.name,
      assetType: normalized.assetType || normalized.fileType,
      mimeType: normalized.mimeType,
      applicationKey: normalized.applicationKey,
      ownerApplicationKey: normalized.ownerApplicationKey,
      reuseScope: normalized.reuseScope || normalized.scope,
      assetVisibility: normalized.assetVisibility || normalized.visibility,
      publicUrl: normalized.publicUrl || normalized.url,
      downloadUrl: normalized.downloadUrl,
      altText: normalized.altText,
      description: normalized.description,
      ...extra
    };
  }
  function fileFromFormValue(value) {
    if (typeof File !== "undefined" && value instanceof File && value.size) return value;
    if (typeof Blob !== "undefined" && value instanceof Blob && value.size) return value;
    return null;
  }
  var UibAssetPicker = class extends BaseHTMLElement3 {
    static formAssociated = true;
    static get observedAttributes() {
      return [
        "name",
        "value",
        "label",
        "placeholder",
        "disabled",
        "selection-mode",
        "application-key",
        "default-application-key",
        "api-base-url",
        "view",
        "default-layout",
        "allow-upload",
        "insertable-only",
        "insertable-file-types",
        "accepted-file-types",
        "max-selection",
        "default-asset-type",
        "default-file-type",
        "default-category",
        "default-reuse-scope",
        "default-scope",
        "default-visibility",
        "default-status",
        "default-search",
        "reuse-scope",
        "asset-visibility",
        "category",
        "copy-on-select",
        "selection-behavior",
        "include-shared"
      ];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._internals = this.attachInternals?.() || null;
      this._provider = null;
      this._providerAssigned = false;
      this._headers = {};
      this._getAuthHeaders = null;
      this._assets = [];
      this._assetCache = /* @__PURE__ */ new Map();
      this._categories = [];
      this._permissionSets = [];
      this._uploadPolicy = null;
      this._selectedAssetIds = /* @__PURE__ */ new Set();
      this._selectedAsset = null;
      this._query = "";
      this._filters = { applicationKey: "", fileType: "all", scope: "all", visibility: "all", category: "all", status: DEFAULT_PICKER_STATUS };
      this._defaultsApplied = false;
      this._open = false;
      this._filtersOpen = false;
      this._uploadOpen = false;
      this._loading = false;
      this._message = "";
      this._uploadMessage = "";
      this._value = "";
      this._suppressValueAttribute = false;
      this._pendingUploadFile = null;
      this._pendingUploadPreviewUrl = "";
      this._pendingUploadFileName = "";
      this._pendingUploadDescription = "";
      this._searchTimer = null;
      this._onDocumentClick = (event) => {
        if (!this._open) return;
        if (event.composedPath?.().includes(this)) return;
        this.close();
      };
      this._onKeyDown = (event) => {
        if (event.key === "Escape" && this._open) {
          event.stopPropagation();
          this.close();
        }
      };
    }
    set provider(value) {
      this._providerAssigned = Boolean(value);
      this._provider = value || null;
      if (this.isConnected) this.loadAll();
    }
    get provider() {
      this.ensureProvider();
      return this._provider;
    }
    set headers(value) {
      this._headers = value && typeof value === "object" ? { ...value } : {};
    }
    get headers() {
      return this._headers;
    }
    set getAuthHeaders(value) {
      this._getAuthHeaders = typeof value === "function" ? value : null;
    }
    get getAuthHeaders() {
      return this._getAuthHeaders;
    }
    set assets(value) {
      this._assets = this.filterInsertableAssets(normalizeAssets(value));
      this.cacheAssets(this._assets);
      this.syncSelectedAssets();
      if (this.isConnected) this.render();
    }
    get assets() {
      return this._assets;
    }
    set categories(value) {
      this._categories = Array.isArray(value) ? value : [];
      if (this.isConnected) this.render();
    }
    get categories() {
      return this._categories;
    }
    set uploadPolicy(value) {
      this._uploadPolicy = value || null;
      if (this.isConnected) this.render();
    }
    get uploadPolicy() {
      return this._uploadPolicy;
    }
    set value(value) {
      this.setValue(value, { reflect: true, render: true });
    }
    get value() {
      return this._value;
    }
    connectedCallback() {
      this.setValue(this.getAttribute("value") || this._value || "", { reflect: false, render: false });
      this.applyDefaultFilters();
      this.ensureProvider();
      this.loadAll();
      if (typeof document !== "undefined") document.addEventListener("click", this._onDocumentClick);
      this.addEventListener("keydown", this._onKeyDown);
      this.render();
    }
    disconnectedCallback() {
      if (typeof document !== "undefined") document.removeEventListener("click", this._onDocumentClick);
      this.removeEventListener("keydown", this._onKeyDown);
      this.revokePendingUploadPreview();
      if (this._searchTimer) clearTimeout(this._searchTimer);
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "value") {
        if (!this._suppressValueAttribute) this.setValue(newValue || "", { reflect: false, render: this.isConnected });
        return;
      }
      if (name === "api-base-url" || name === "application-key") {
        if (!this._providerAssigned) this._provider = null;
      }
      if (name.startsWith("default-") || ["application-key", "category", "reuse-scope", "asset-visibility"].includes(name)) {
        this.applyDefaultFilters({ force: true });
      }
      if (name === "selection-mode") this.setValue(this._value, { reflect: true, render: false });
      if (this.isConnected) {
        if (["api-base-url", "application-key", "default-application-key", "insertable-only", "insertable-file-types"].includes(name) || name.startsWith("default-")) this.loadAssets();
        else this.render();
      }
    }
    selectionMode() {
      return this.getAttribute("selection-mode") || "single";
    }
    isMultiple() {
      return this.selectionMode() === "multiple";
    }
    fieldName() {
      return this.getAttribute("name") || "";
    }
    label() {
      return this.getAttribute("label") || "";
    }
    placeholder() {
      return this.getAttribute("placeholder") || (this.isMultiple() ? "Choose assets" : "Choose an asset");
    }
    disabled() {
      return boolFromAttribute(this.getAttribute("disabled"), false);
    }
    view() {
      return this.getAttribute("view") || this.getAttribute("default-layout") || "list";
    }
    allowUpload() {
      return boolFromAttribute(this.getAttribute("allow-upload"), false);
    }
    insertableOnly() {
      return boolFromAttribute(this.getAttribute("insertable-only"), true);
    }
    insertableFileTypes() {
      return attrList(this.getAttribute("insertable-file-types"), DEFAULT_PICKER_INSERTABLE_TYPES);
    }
    acceptedFileTypes() {
      return attrList(this.getAttribute("accepted-file-types"), DEFAULT_PICKER_ACCEPT);
    }
    includeShared() {
      return boolFromAttribute(this.getAttribute("include-shared"), true);
    }
    maxSelection() {
      const value = Number(this.getAttribute("max-selection") || 0);
      return Number.isFinite(value) && value > 0 ? value : 0;
    }
    selectionBehavior() {
      return this.getAttribute("selection-behavior") || "reference";
    }
    copyOnSelect() {
      return boolFromAttribute(this.getAttribute("copy-on-select"), this.selectionBehavior() === "copy");
    }
    activeApplicationKey() {
      return this._filters.applicationKey || this.getAttribute("application-key") || this.getAttribute("default-application-key") || "";
    }
    setValue(value, { reflect = false, render = false } = {}) {
      const ids = parseSelectionValue(value);
      this._selectedAssetIds = this.isMultiple() ? new Set(ids) : new Set(ids.slice(0, 1));
      this._value = this.selectionValue();
      this.syncSelectedAssets();
      this.updateFormValue();
      if (reflect && this.getAttribute("value") !== this._value) {
        this._suppressValueAttribute = true;
        if (this._value === "") this.removeAttribute("value");
        else this.setAttribute("value", this._value);
        this._suppressValueAttribute = false;
      }
      if (render && this.isConnected) this.render();
    }
    selectionValue() {
      const ids = Array.from(this._selectedAssetIds).filter(Boolean);
      return this.isMultiple() ? JSON.stringify(ids) : ids[0] || "";
    }
    updateValueFromSelection({ emitNative = false } = {}) {
      this._value = this.selectionValue();
      this.updateFormValue();
      if (this.getAttribute("value") !== this._value) {
        this._suppressValueAttribute = true;
        if (this._value === "") this.removeAttribute("value");
        else this.setAttribute("value", this._value);
        this._suppressValueAttribute = false;
      }
      if (emitNative) this.emitNativeFormEvents();
    }
    updateFormValue() {
      this._internals?.setFormValue?.(this._value);
      this.syncFallbackInput();
    }
    syncFallbackInput() {
      if (this._internals || typeof document === "undefined") return;
      const existing = Array.from(this.children).find((child) => child?.dataset?.uibAssetPickerValue === "true");
      const name = this.fieldName();
      if (!name) {
        existing?.remove();
        return;
      }
      const input = existing || document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = this._value;
      input.dataset.uibAssetPickerValue = "true";
      if (!existing) this.appendChild(input);
    }
    emitNativeFormEvents() {
      this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }
    cacheAssets(assets = []) {
      normalizeAssets(assets).forEach((asset) => {
        if (asset.id) this._assetCache.set(asset.id, asset);
      });
    }
    selectedAssets() {
      const ids = Array.from(this._selectedAssetIds);
      return ids.map((id) => this._assetCache.get(id) || this._assets.find((asset) => asset.id === id)).filter(Boolean);
    }
    syncSelectedAssets() {
      const selectedAssets = this.selectedAssets();
      this._selectedAsset = selectedAssets[0] || null;
    }
    applyDefaultFilters({ force = false } = {}) {
      if (this._defaultsApplied && !force) return;
      this._query = this.getAttribute("default-search") || this._query || "";
      this._filters = {
        ...this._filters,
        applicationKey: this.getAttribute("default-application-key") || this.getAttribute("application-key") || this._filters.applicationKey || "",
        fileType: this.getAttribute("default-asset-type") || this.getAttribute("default-file-type") || this._filters.fileType || "all",
        scope: this.getAttribute("default-reuse-scope") || this.getAttribute("default-scope") || this.getAttribute("reuse-scope") || this._filters.scope || "all",
        visibility: this.getAttribute("default-visibility") || this.getAttribute("asset-visibility") || this._filters.visibility || "all",
        category: this.getAttribute("default-category") || this.getAttribute("category") || this._filters.category || "all",
        status: this.getAttribute("default-status") || this._filters.status || DEFAULT_PICKER_STATUS
      };
      this._defaultsApplied = true;
    }
    ensureProvider() {
      if (this._provider || this._providerAssigned) return;
      const baseUrl = this.getAttribute("api-base-url");
      if (!baseUrl) return;
      this._provider = createOrmAssetProvider({
        baseUrl,
        applicationKey: this.getAttribute("application-key") || this.getAttribute("default-application-key") || "",
        getAuthHeaders: () => this._getAuthHeaders ? this._getAuthHeaders() : { ...this._headers }
      });
    }
    async loadAll() {
      await Promise.all([this.loadLookups(), this.loadAssets()]);
    }
    async loadLookups() {
      this.ensureProvider();
      if (!this._provider) {
        this.render();
        return;
      }
      try {
        const [categories, permissionSets, uploadPolicy] = await Promise.all([
          this._provider.listCategories?.() ?? [],
          this._provider.listPermissionSets?.() ?? [],
          this._provider.getUploadPolicy?.() ?? null
        ]);
        this._categories = categories || [];
        this._permissionSets = permissionSets || [];
        this._uploadPolicy = uploadPolicy || this._uploadPolicy;
      } catch (error) {
        this._message = error instanceof Error ? error.message : String(error);
      }
      this.render();
    }
    async loadAssets() {
      this.ensureProvider();
      if (!this._provider) {
        this.syncSelectedAssets();
        this.render();
        return;
      }
      this._loading = true;
      this.render();
      try {
        const result = await this._provider.search({
          query: this._query,
          filters: this._filters,
          applicationKey: this.activeApplicationKey(),
          includeShared: this.includeShared()
        });
        this._assets = this.filterInsertableAssets(normalizeAssets(result?.records || []));
        this.cacheAssets(this._assets);
        this.syncSelectedAssets();
        this._message = `${this._assets.length} asset${this._assets.length === 1 ? "" : "s"} loaded.`;
        this.updateValueFromSelection();
      } catch (error) {
        this._message = error instanceof Error ? error.message : String(error);
      } finally {
        this._loading = false;
        this.render();
      }
    }
    filterInsertableAssets(assets) {
      if (!this.insertableOnly()) return assets;
      const allowed = new Set(this.insertableFileTypes().map((type) => type.toLowerCase()));
      return assets.filter((asset) => allowed.has(String(asset.fileType || "").toLowerCase()));
    }
    open(options = {}) {
      if (this.disabled()) return;
      const { upload = false } = options || {};
      this._open = true;
      this._filtersOpen = false;
      this._uploadOpen = Boolean(upload);
      if (upload) this._uploadMessage = this._pendingUploadFile ? `Selected ${this._pendingUploadFile.name}. Press upload to save it.` : "";
      this.render();
      queueMicrotask(() => {
        if (upload) {
          this.shadowRoot.querySelector('input[name="assetFile"]')?.focus();
          return;
        }
        this.shadowRoot.querySelector("[data-search-input]")?.focus();
      });
    }
    close() {
      this._open = false;
      this._filtersOpen = false;
      this._uploadOpen = false;
      this._uploadMessage = "";
      this.render();
    }
    openUpload() {
      this.open({ upload: true });
    }
    toggleOpen() {
      if (this._open) this.close();
      else this.open();
    }
    render() {
      const activeElement = this.shadowRoot?.activeElement || null;
      const restoreSearchFocus = activeElement?.matches?.("[data-search-input]");
      const searchSelectionStart = restoreSearchFocus ? activeElement.selectionStart : null;
      const searchSelectionEnd = restoreSearchFocus ? activeElement.selectionEnd : null;
      const selectedAssets = this.selectedAssets();
      const selectedIds = Array.from(this._selectedAssetIds);
      const selectedCount = selectedIds.length;
      const label = this.label();
      const placeholder = this.placeholder();
      const name = this.fieldName();
      const disabled = this.disabled();
      const open = this._open;
      const selectionMode = this.selectionMode();
      const canUseSelected = this.isMultiple() && selectedCount > 0;
      const selectedSummary = this.renderSelectedSummary(selectedAssets, selectedIds, placeholder);
      const filterPanelId = "uib-asset-picker-filters";
      const uploadPanelId = "uib-asset-picker-upload";
      this.shadowRoot.innerHTML = `<style>` + baseAssetStyles + ` :host { display: block; position: relative; } .picker-shell { display: grid; gap: 0.35rem; position: relative; } .field-label { display: inline-flex; color: var(--uib-assets-muted); font-size: 0.85rem; font-weight: 850; } .control-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 0.45rem; align-items: stretch; } .picker-value { width: 100%; min-height: 3.1rem; display: grid; align-items: center; border: 1px solid var(--uib-assets-border-strong); border-radius: 0.85rem; padding: 0.35rem 0.5rem; background: var(--uib-assets-surface); } .picker-action, .clear-button, .filter-icon, .upload-icon, .dialog-close { min-width: 2.25rem; min-height: 2.25rem; border-radius: 999px; white-space: nowrap; } .picker-action.primary { padding-inline: 0.9rem; } .picker-action.primary.icon-button { padding: 0; color: var(--uib-assets-primary-contrast); background: var(--uib-assets-primary); border-color: var(--uib-assets-primary); } .icon-button { width: 2.35rem; min-width: 2.35rem; padding: 0; display: inline-grid; place-items: center; font-size: 1.05rem; line-height: 1; } .picker-value[data-disabled="true"], .picker-action:disabled, .clear-button:disabled { cursor: not-allowed; opacity: 0.58; } .selected-single, .placeholder-line { display: grid; grid-template-columns: 42px minmax(0, 1fr); gap: 0.55rem; align-items: center; min-width: 0; } .placeholder-thumb { width: 42px; height: 42px; border-radius: 0.65rem; border: 1px dashed var(--uib-assets-border-strong); background: var(--uib-assets-surface-soft); display: grid; place-items: center; color: var(--uib-assets-muted); font-weight: 950; } .selected-single uib-asset-thumbnail { width: 42px; } .selected-text { display: grid; min-width: 0; } .selected-name { overflow: hidden; color: var(--uib-assets-text); font-weight: 950; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; } .selected-meta { overflow: hidden; color: var(--uib-assets-muted); font-size: 0.76rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; } .chip-wrap { display: flex; flex-wrap: wrap; gap: 0.35rem; min-width: 0; } .asset-chip { display: inline-grid; grid-template-columns: 28px minmax(0, auto); gap: 0.35rem; align-items: center; max-width: 15rem; padding: 0.22rem 0.45rem 0.22rem 0.28rem; border: 1px solid var(--uib-assets-border); border-radius: 999px; background: var(--uib-assets-surface-soft); } .asset-chip uib-asset-thumbnail { width: 28px; } .asset-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.8rem; font-weight: 850; } .modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 1rem; background: rgba(6, 21, 40, 0.56); } .modal-dialog { width: min(36rem, calc(100vw - 2rem)); max-height: min(74vh, 40rem); display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: 0.55rem; overflow: hidden; padding: 0.85rem; border: 1px solid var(--uib-assets-border-strong); border-radius: var(--uib-assets-radius); background: var(--uib-assets-surface); box-shadow: 0 24px 72px rgba(10, 31, 68, 0.28); } .dialog-header { display: flex; gap: 0.75rem; align-items: start; justify-content: space-between; } .dialog-title-wrap { min-width: 0; } .picker-toolbar { display: grid; grid-template-columns: minmax(12rem, 1fr) auto auto; gap: 0.35rem; align-items: center; } .picker-toolbar input { min-height: 2.35rem; } .dialog-panels { display: grid; gap: 0.45rem; } .filter-panel, .upload-panel { display: grid; gap: 0.55rem; padding: 0.6rem; border: 1px solid var(--uib-assets-border); border-radius: 0.75rem; background: var(--uib-assets-surface-soft); } .filter-panel { width: min(100%, 30rem); justify-self: start; box-shadow: 0 8px 24px rgba(10, 31, 68, 0.08); } .filter-panel[hidden], .upload-panel[hidden], [hidden] { display: none !important; } .filter-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: end; } .filter-grid label { width: auto; min-width: 7.2rem; max-width: 10.5rem; } .filter-grid input, .filter-grid select { width: auto; min-width: 7.2rem; max-width: 10.5rem; } .filter-grid input[name="applicationKey"] { max-width: 10rem; } .filter-actions, .picker-footer { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; justify-content: space-between; } .status { min-height: 1.25rem; color: var(--uib-assets-muted); font-size: 0.78rem; } .modal-body { min-height: 0; overflow: auto; padding-right: 0.15rem; } .asset-options { display: grid; gap: 0.3rem; } .asset-option { width: 100%; min-height: auto; display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 0.5rem; align-items: center; padding: 0.42rem; border-radius: 0.7rem; text-align: left; background: var(--uib-assets-surface); } .asset-option[aria-selected="true"], .asset-option[aria-pressed="true"] { border-color: var(--uib-assets-primary); background: var(--uib-assets-surface-tint); } .asset-option uib-asset-thumbnail { width: 44px; } .asset-name { overflow: hidden; margin: 0; padding-left: 0.75rem; color: var(--uib-assets-text); font-weight: 900; text-overflow: ellipsis; white-space: nowrap; } .selected-mark { display: inline-grid; width: 1.35rem; height: 1.35rem; place-items: center; border-radius: 999px; border: 1px solid var(--uib-assets-border-strong); color: var(--uib-assets-muted); font-size: 0.75rem; font-weight: 950; } .asset-option[aria-selected="true"] .selected-mark, .asset-option[aria-pressed="true"] .selected-mark { background: var(--uib-assets-primary); border-color: var(--uib-assets-primary); color: var(--uib-assets-primary-contrast); } .upload-grid { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 0.55rem; align-items: start; } .upload-preview { min-height: 64px; display: grid; place-items: center; border: 1px dashed var(--uib-assets-border-strong); border-radius: 0.7rem; background: var(--uib-assets-surface); color: var(--uib-assets-muted); font-size: 0.78rem; text-align: center; } .upload-preview img { width: 100%; height: 64px; object-fit: cover; border-radius: 0.6rem; } .upload-fields { display: grid; gap: 0.55rem; } .upload-fields textarea { min-height: 4.5rem; } .file-row { display: flex; flex-wrap: wrap; gap: 0.45rem; align-items: center; } .small-button { min-height: 2rem; padding: 0.3rem 0.7rem; border-radius: 0.65rem; font-size: 0.84rem; } .selected-file-name { color: var(--uib-assets-muted); font-size: 0.84rem; font-weight: 750; } .visually-hidden-file { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; pointer-events: none; } .upload-status { margin: 0; padding: 0.45rem 0.6rem; border: 1px solid var(--uib-assets-border); border-radius: 0.65rem; background: var(--uib-assets-surface); color: var(--uib-assets-text); font-size: 0.84rem; font-weight: 750; } .strong { color: var(--uib-assets-text); font-weight: 850; } @media (max-width: 640px) { .control-row { grid-template-columns: 1fr; } .picker-action, .clear-button { justify-self: start; } .modal-backdrop { align-items: end; padding: 0.5rem; } .modal-dialog { width: 100%; max-height: 94vh; } .picker-toolbar, .filter-grid, .upload-grid { grid-template-columns: 1fr; } } </style><div class="picker-shell" data-open="` + (open ? "true" : "false") + `"> ` + (name ? `<input type="hidden" name="${escapeHtml2(name)}" value="${escapeHtml2(this._value)}" />` : "") + ` ` + (label ? `<span class="field-label">${escapeHtml2(label)}</span>` : "") + ` <div class="control-row"><div class="picker-value" data-disabled="` + (disabled ? "true" : "false") + `" aria-live="polite" title="Selected asset for this field"> ` + selectedSummary + ` </div><button type="button" class="picker-action primary icon-button" data-open-picker title="Browse existing assets" aria-label="Browse existing assets" ` + (disabled ? "disabled" : "") + `><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10.5 4a6.5 6.5 0 0 1 5.17 10.44l4.45 4.44-1.41 1.41-4.45-4.44A6.5 6.5 0 1 1 10.5 4Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"></path></svg></button> ` + (this.allowUpload() ? `<button type="button" class="picker-action icon-button" data-open-upload title="Upload a new asset" aria-label="Upload a new asset" ${disabled ? "disabled" : ""}>\u21E7</button>` : "") + ` ` + (selectedCount ? `<button type="button" class="clear-button danger" data-clear-selection title="Clear selected asset" ${disabled ? "disabled" : ""}>Clear</button>` : "") + ` </div> ` + (open ? this.renderModal(selectionMode, canUseSelected, filterPanelId, uploadPanelId) : "") + ` </div>`;
      this.wireEvents();
      this.assignThumbnails();
      if (restoreSearchFocus) {
        queueMicrotask(() => {
          const input = this.shadowRoot.querySelector("[data-search-input]");
          if (!input) return;
          input.focus();
          if (typeof searchSelectionStart === "number" && typeof input.setSelectionRange === "function") {
            input.setSelectionRange(searchSelectionStart, searchSelectionEnd ?? searchSelectionStart);
          }
        });
      }
    }
    renderSelectedSummary(selectedAssets, selectedIds, placeholder) {
      if (this.isMultiple()) {
        if (!selectedIds.length) {
          return `<span class="placeholder-line"><span class="placeholder-thumb" aria-hidden="true">+</span><span class="selected-text"><span class="selected-name">` + escapeHtml2(placeholder) + `</span><span class="selected-meta">Attach one or more assets</span></span></span>`;
        }
        return `<span class="chip-wrap">` + selectedIds.map((id) => {
          const asset2 = selectedAssets.find((item2) => item2.id === id);
          return `<span class="asset-chip" data-chip-id="${escapeHtml2(id)}">${asset2 ? "<uib-asset-thumbnail></uib-asset-thumbnail>" : '<span class="placeholder-thumb" aria-hidden="true">?</span>'}<span>${escapeHtml2(asset2?.name || id)}</span></span>`;
        }).join("") + `</span>`;
      }
      const selectedId = selectedIds[0] || "";
      const asset = selectedAssets[0] || null;
      if (!selectedId) {
        return `<span class="placeholder-line"><span class="placeholder-thumb" aria-hidden="true">+</span><span class="selected-text"><span class="selected-name">` + escapeHtml2(placeholder) + `</span><span class="selected-meta">Attach an image, file, or asset</span></span></span>`;
      }
      return `<span class="selected-single">` + (asset ? '<uib-asset-thumbnail class="selected-thumbnail"></uib-asset-thumbnail>' : '<span class="placeholder-thumb" aria-hidden="true">?</span>') + `<span class="selected-text"><span class="selected-name">` + escapeHtml2(asset?.name || selectedId) + `</span><span class="selected-meta">` + escapeHtml2(asset ? [asset.fileType, asset.category].filter(Boolean).join(" \xB7 ") : "Asset selected") + `</span></span></span>`;
    }
    renderModal(selectionMode, canUseSelected, filterPanelId, uploadPanelId) {
      const allowUpload = this.allowUpload();
      const view = "list";
      const filtersButtonLabel = this._filtersOpen ? "Hide more filters" : "Show more filters";
      const uploadButtonLabel = this._uploadOpen ? "Hide upload form" : "Upload a new asset";
      return `<div class="modal-backdrop" data-modal-backdrop role="presentation"><section class="modal-dialog" role="dialog" aria-modal="true" aria-label="Choose asset"><div class="dialog-header"><div class="dialog-title-wrap"><h2 class="title"> Choose an asset </h2><p class="subtitle"> Search existing assets first. Upload a new file only when needed. </p></div><button type="button" class="dialog-close icon-button" data-close-picker aria-label="Close asset picker" title="Close asset picker"> \xD7 </button></div><div class="dialog-panels"><div class="picker-toolbar"><input data-search-input value="` + escapeHtml2(this._query) + `" placeholder="Search assets" aria-label="Search assets" title="Search assets by name, description, tag, or file name" /><button type="button" class="filter-icon icon-button ` + (this._filtersOpen ? "primary" : "") + `" data-toggle-filters aria-controls="` + filterPanelId + `" aria-expanded="` + (this._filtersOpen ? "true" : "false") + `" title="` + filtersButtonLabel + `" aria-label="` + filtersButtonLabel + `"> \u2630 </button> ` + (allowUpload ? `<button type="button" data-toggle-upload class="upload-icon icon-button ${this._uploadOpen ? "primary" : ""}" aria-controls="${uploadPanelId}" aria-expanded="${this._uploadOpen ? "true" : "false"}" title="${uploadButtonLabel}" aria-label="${uploadButtonLabel}">\u21E7</button>` : "") + ` </div><div class="status" aria-live="polite"> ` + (this._loading ? "Loading assets..." : escapeHtml2(this._message || "Choose an asset.")) + ` </div> ` + (this._filtersOpen ? `
            <form id="${filterPanelId}" class="filter-panel" data-filter-panel-open="true">
            ${this.renderFilterFields()}
            </form>
            ` : "") + ` ` + (allowUpload && this._uploadOpen ? `
            <form id="${uploadPanelId}" class="upload-panel" data-upload-panel-open="true">
            ${this.renderUploadFields()}
            </form>
            ` : "") + ` </div><div class="modal-body"> ` + (this._assets.length ? `
            <div class="asset-options" data-view="${escapeHtml2(view)}" role="listbox" aria-multiselectable="${this.isMultiple() ? "true" : "false"}">
            ${this._assets.map((asset) => this.renderAssetOption(asset)).join("")}
            </div>
            ` : `<div class="empty-state">No insertable assets match the current filters. Try a broader search, change filters, or upload a new file.</div>`) + ` </div> ` + (selectionMode === "multiple" ? `<div class="picker-footer"><span class="small muted">${this._selectedAssetIds.size} selected</span><button type="button" class="primary" data-use-selected title="Use the selected assets" ${canUseSelected ? "" : "disabled"}>Use Selected</button></div>` : "") + ` </section></div>`;
    }
    renderFilterFields() {
      const filters = this._filters;
      const option = (value, label, selected) => `<option value="` + escapeHtml2(value) + `" ` + (value === selected ? "selected" : "") + `>` + escapeHtml2(label) + `</option>`;
      return `<div class="filter-grid"><label title="Limit results to assets for one application">Application <input name="applicationKey" value="` + escapeHtml2(filters.applicationKey || "") + `" placeholder="demo-app" title="Limit results to assets for one application" /></label><label title="Limit results to one category">Category <select name="category" title="Limit results to one category">` + option("all", "All categories", filters.category) + this._categories.map((category) => option(categoryKey(category), categoryName(category), filters.category)).join("") + `</select></label><label title="Limit results to one file type">File type <select name="fileType" title="Limit results to one file type">` + option("all", "All file types", filters.fileType) + ASSET_FILE_TYPES.map((type) => option(type, humanize(type), filters.fileType)).join("") + `</select></label><label title="Limit results by reuse scope">Scope <select name="scope" title="Limit results by reuse scope">` + option("all", "All scopes", filters.scope) + ASSET_SCOPES.map((scope) => option(scope, humanize(scope), filters.scope)).join("") + `</select></label><label title="Limit results by visibility">Visibility <select name="visibility" title="Limit results by visibility">` + option("all", "All visibility", filters.visibility) + ASSET_VISIBILITIES.map((visibility) => option(visibility, humanize(visibility), filters.visibility)).join("") + `</select></label><label title="Limit results by status">Status <select name="status" title="Limit results by status">` + option("active", "Active", filters.status) + option("archived", "Archived", filters.status) + option("all", "Active and archived", filters.status) + `</select></label></div><div class="filter-actions"><button type="submit" class="primary" title="Apply selected filters">Apply filters</button><button type="button" data-clear-filters title="Clear filters and show broader results">Clear</button></div>`;
    }
    renderUploadFields() {
      const accept = this.acceptedFileTypes().join(",");
      const hasPendingFile = Boolean(this._pendingUploadFile);
      const preview = this._pendingUploadPreviewUrl ? `<img src="` + escapeHtml2(this._pendingUploadPreviewUrl) + `" alt="` + escapeHtml2(this._pendingUploadFileName || "Selected file") + ` preview" />` : `<span>` + escapeHtml2(this._pendingUploadFileName || "No file selected") + `</span>`;
      const uploadStatus = this._uploadMessage ? `<p class="upload-status" role="status" aria-live="polite"> ` + escapeHtml2(this._uploadMessage) + ` </p>` : "";
      return `<div class="row-between"><div><h2 class="title"> Upload asset </h2><p class="subtitle small"> Choose a file and optionally add a description. Defaults are applied automatically. </p></div><button type="button" class="primary icon-button" data-upload-submit title="Upload selected file" aria-label="Upload selected file"> \u21E7 </button></div><div class="upload-grid"><div class="upload-preview"> ` + preview + ` </div><div class="upload-fields"><label title="Choose a local file to upload"> File <span class="file-row"><button type="button" class="small-button" data-choose-upload-file title="Choose a local file to upload"> Choose file </button><span class="selected-file-name" title="Selected file name"> ` + escapeHtml2(this._pendingUploadFileName || "No file selected") + ` </span></span><input class="visually-hidden-file" data-upload-file-input name="assetFile" type="file" accept="` + escapeHtml2(accept) + `" title="Choose a local file to upload" /></label><label title="Describe the asset for future search and reuse"> Description <textarea name="description" data-upload-description placeholder="Optional description" title="Describe the asset for future search and reuse"> ` + escapeHtml2(this._pendingUploadDescription || "") + ` </textarea></label> ` + uploadStatus + ` <p class="subtitle small"> Defaults: type inferred from file, scope ` + escapeHtml2(this.uploadDefaultScope()) + ` , visibility ` + escapeHtml2(this.uploadDefaultVisibility()) + ` , category ` + escapeHtml2(this.uploadDefaultCategory()) + ` , status active. </p> ` + (hasPendingFile ? '<p class="subtitle small strong">Ready to upload the selected file.</p>' : '<p class="subtitle small">Select a file before pressing upload.</p>') + ` </div></div>`;
    }
    renderAssetOption(asset) {
      const selected = this._selectedAssetIds.has(asset.id);
      const pressed = selected ? "true" : "false";
      const checkText = selected ? "\u2713" : this.isMultiple() ? "+" : "";
      return `<button type="button" class="asset-option" data-id="` + escapeHtml2(asset.id) + `" role="option" aria-pressed="` + pressed + `" aria-selected="` + pressed + `" title="Choose ` + escapeHtml2(asset.name) + `"><uib-asset-thumbnail></uib-asset-thumbnail><p class="asset-name"> ` + escapeHtml2(asset.name) + ` </p><span class="selected-mark" aria-hidden="true"> ` + escapeHtml2(checkText) + ` </span></button>`;
    }
    wireEvents() {
      this.shadowRoot.querySelector("[data-open-picker]")?.addEventListener("click", () => this.open());
      this.shadowRoot.querySelector("[data-open-upload]")?.addEventListener("click", () => this.openUpload());
      this.shadowRoot.querySelector("[data-toggle-picker]")?.addEventListener("click", () => this.toggleOpen());
      this.shadowRoot.querySelector("[data-close-picker]")?.addEventListener("click", () => this.close());
      this.shadowRoot.querySelector("[data-modal-backdrop]")?.addEventListener("click", (event) => {
        if (event.target === event.currentTarget) this.close();
      });
      this.shadowRoot.querySelector("[data-clear-selection]")?.addEventListener("click", () => this.clearSelection());
      this.shadowRoot.querySelector("[data-toggle-filters]")?.addEventListener("click", () => {
        this._filtersOpen = !this._filtersOpen;
        this.render();
      });
      this.shadowRoot.querySelector("[data-toggle-upload]")?.addEventListener("click", () => {
        this._uploadOpen = !this._uploadOpen;
        this.render();
      });
      this.shadowRoot.querySelector("[data-search-input]")?.addEventListener("input", (event) => {
        this._query = String(event.currentTarget.value || "").trim();
        if (this._searchTimer) clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => this.loadAssets(), 180);
      });
      this.shadowRoot.querySelector("form.filter-panel")?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.handleFilterSubmit(event.currentTarget);
      });
      this.shadowRoot.querySelector("[data-clear-filters]")?.addEventListener("click", () => this.clearFilters());
      const uploadFileInput = this.shadowRoot.querySelector("[data-upload-file-input]");
      this.shadowRoot.querySelector("[data-choose-upload-file]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        uploadFileInput?.click();
      });
      uploadFileInput?.addEventListener("change", (event) => {
        this.setPendingUploadFile(event.currentTarget.files?.[0] || null);
      });
      this.shadowRoot.querySelector("[data-upload-description]")?.addEventListener("input", (event) => {
        this._pendingUploadDescription = String(event.currentTarget.value || "");
      });
      this.shadowRoot.querySelector("[data-upload-submit]")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void this.handleUpload(event.currentTarget?.closest("form.upload-panel") || null);
      });
      this.shadowRoot.querySelector("form.upload-panel")?.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleUpload(event.currentTarget);
      });
      this.shadowRoot.querySelectorAll(".asset-option").forEach((button) => {
        button.addEventListener("click", () => this.handleAssetClick(button.dataset.id));
      });
      this.shadowRoot.querySelector("[data-use-selected]")?.addEventListener("click", () => this.emitMultipleSelection());
    }
    assignThumbnails() {
      this.shadowRoot.querySelector(".selected-thumbnail")?.setAttribute("data-ready", "true");
      const selectedThumbnail = this.shadowRoot.querySelector(".selected-thumbnail");
      if (selectedThumbnail) selectedThumbnail.asset = this._selectedAsset;
      this.shadowRoot.querySelectorAll(".asset-chip").forEach((chip) => {
        const thumbnail = chip.querySelector("uib-asset-thumbnail");
        if (!thumbnail) return;
        thumbnail.asset = this._assetCache.get(chip.dataset.chipId) || this._assets.find((asset) => asset.id === chip.dataset.chipId) || null;
      });
      this.shadowRoot.querySelectorAll(".asset-option uib-asset-thumbnail").forEach((thumbnail, index) => {
        thumbnail.asset = this._assets[index];
      });
    }
    handleFilterSubmit(form) {
      const formData = new FormData(form);
      this._filters = {
        ...this._filters,
        applicationKey: String(formData.get("applicationKey") || "").trim(),
        category: String(formData.get("category") || "all"),
        fileType: String(formData.get("fileType") || "all"),
        scope: String(formData.get("scope") || "all"),
        visibility: String(formData.get("visibility") || "all"),
        status: String(formData.get("status") || DEFAULT_PICKER_STATUS)
      };
      this.loadAssets();
    }
    clearFilters() {
      this._query = "";
      this._filters = { applicationKey: "", fileType: "all", scope: "all", visibility: "all", category: "all", status: DEFAULT_PICKER_STATUS };
      this._defaultsApplied = false;
      this.applyDefaultFilters({ force: true });
      this.loadAssets();
    }
    setPendingUploadFile(file) {
      this.revokePendingUploadPreview();
      this._pendingUploadFile = file || null;
      this._pendingUploadFileName = file?.name || "";
      this._uploadMessage = file ? `Selected ${file.name}. Press upload to save it.` : "";
      if (file && String(file.type || "").startsWith("image/") && typeof URL !== "undefined" && URL.createObjectURL) {
        this._pendingUploadPreviewUrl = URL.createObjectURL(file);
      }
      this.render();
    }
    revokePendingUploadPreview() {
      if (this._pendingUploadPreviewUrl && typeof URL !== "undefined" && URL.revokeObjectURL) URL.revokeObjectURL(this._pendingUploadPreviewUrl);
      this._pendingUploadPreviewUrl = "";
    }
    showUploadProblem(message, detail = {}) {
      this._uploadMessage = message;
      this._message = message;
      emitAssetEvent(this, "asset-upload-invalid", { errors: [message], ...detail });
      emitAssetEvent(this, "uib-asset-upload-invalid", { errors: [message], ...detail });
      this.render();
    }
    uploadDefaultCategory() {
      return this._filters.category && this._filters.category !== "all" ? this._filters.category : this.getAttribute("default-category") || this.getAttribute("category") || "general";
    }
    uploadDefaultScope() {
      return this._filters.scope && this._filters.scope !== "all" ? this._filters.scope : this.getAttribute("default-reuse-scope") || this.getAttribute("default-scope") || this.getAttribute("reuse-scope") || "global";
    }
    uploadDefaultVisibility() {
      return this._filters.visibility && this._filters.visibility !== "all" ? this._filters.visibility : this.getAttribute("default-visibility") || this.getAttribute("asset-visibility") || "public";
    }
    uploadDefaultAssetType(file) {
      const configured = this._filters.fileType && this._filters.fileType !== "all" ? this._filters.fileType : this.getAttribute("default-asset-type") || this.getAttribute("default-file-type") || "";
      return configured || inferFileType(file);
    }
    validateUpload(file) {
      const errors = [];
      if (!file) errors.push("Choose a file to upload.");
      const maxFileSizeBytes = Number(this._uploadPolicy?.maxFileSizeBytes || 0);
      if (file && maxFileSizeBytes && file.size > maxFileSizeBytes) errors.push(`File exceeds ${maxFileSizeBytes} bytes.`);
      if (file && !acceptedMatches(file, this.acceptedFileTypes())) errors.push(`File type is not allowed: ${file.type || file.name || "unknown"}.`);
      return errors;
    }
    async handleUpload(form = null) {
      this.ensureProvider();
      const formData = form ? new FormData(form) : null;
      const descriptionControl = this.shadowRoot.querySelector("[data-upload-description]");
      if (descriptionControl) this._pendingUploadDescription = String(descriptionControl.value || "");
      const file = this._pendingUploadFile || fileFromFormValue(formData?.get("assetFile"));
      const actualFile = fileFromFormValue(file);
      const errors = this.validateUpload(actualFile);
      if (errors.length) {
        this._uploadMessage = errors.join(" ");
        this._message = errors.join(" ");
        emitAssetEvent(this, "asset-upload-invalid", { errors });
        emitAssetEvent(this, "uib-asset-upload-invalid", { errors });
        this.render();
        return;
      }
      const name = stripExtension(actualFile.name);
      const category = this.uploadDefaultCategory();
      const scope = this.uploadDefaultScope();
      const visibility = this.uploadDefaultVisibility();
      const fileType = this.uploadDefaultAssetType(actualFile);
      const request = {
        sourceType: "local_file",
        name,
        key: uniqueUploadKey(name),
        description: String(this._pendingUploadDescription || formData?.get("description") || "").trim(),
        file: actualFile,
        fileName: actualFile.name,
        originalFileName: actualFile.name,
        fileSizeBytes: actualFile.size,
        fileType,
        assetType: fileType,
        mimeType: actualFile.type || "",
        category,
        categories: [category].filter(Boolean),
        tags: [],
        scope,
        reuseScope: scope,
        reuse_scope: scope,
        visibility,
        assetVisibility: visibility,
        asset_visibility: visibility,
        status: "active",
        isActive: true,
        is_active: true,
        applicationKey: this.activeApplicationKey() || this.getAttribute("application-key") || ""
      };
      this._uploadMessage = `Uploading ${actualFile.name}...`;
      emitAssetEvent(this, "asset-upload-request", { request });
      emitAssetEvent(this, "uib-asset-upload-request", { request });
      if (!this._provider?.createAsset) {
        this._uploadMessage = "Live upload is unavailable because the ORM provider is not connected.";
        this._message = "Live upload is unavailable because the ORM provider is not connected.";
        emitAssetEvent(this, "asset-upload-invalid", { errors: ["ORM provider is not connected."] });
        emitAssetEvent(this, "uib-asset-upload-invalid", { errors: ["ORM provider is not connected."] });
        this.render();
        return;
      }
      this._loading = true;
      this._message = "Uploading asset...";
      this.render();
      try {
        const created = await this.createAssetFromRequest(request);
        const asset = normalizeAsset(created);
        this.cacheAssets([asset]);
        this._pendingUploadFile = null;
        this._pendingUploadFileName = "";
        this._pendingUploadDescription = "";
        this.revokePendingUploadPreview();
        await this.loadAssets();
        this._uploadMessage = `Uploaded ${asset.name}.`;
        this._message = `Uploaded ${asset.name}.`;
        emitAssetEvent(this, "asset-uploaded", { asset, insert: buildInsertPayload(asset, { uploaded: true }) });
        emitAssetEvent(this, "uib-asset-uploaded", { asset, insert: buildInsertPayload(asset, { uploaded: true }) });
        emitAssetEvent(this, "uib-asset-created", { asset });
        if (this.isMultiple()) {
          this._selectedAssetIds.add(asset.id);
          this.updateValueFromSelection({ emitNative: true });
          emitAssetEvent(this, "asset-selection-change", this.currentMultiSelectionDetail({ uploaded: true }));
          this.render();
        } else {
          await this.emitSingleSelection(asset, { uploaded: true });
        }
      } catch (error) {
        if (await this.handleUploadConflict(error, request)) return;
        const message = this.uploadErrorMessage(error);
        this._uploadMessage = message;
        this._message = message;
        emitAssetEvent(this, "asset-upload-error", { error: message, request, detail: error?.body || null });
        emitAssetEvent(this, "uib-asset-upload-error", { error: message, request, detail: error?.body || null });
        this.render();
      } finally {
        this._loading = false;
        this.render();
      }
    }
    async createAssetFromRequest(request) {
      const asset = await this._provider.createAsset(request);
      if (request.file && !this._provider.supportsDirectFileUpload && this._provider.uploadAssetFile) {
        await this._provider.uploadAssetFile(asset.id, request.file, { notes: "Initial upload.", applicationKey: request.applicationKey });
        if (this._provider.getAsset) return this._provider.getAsset(asset.id, request.applicationKey);
      }
      return asset;
    }
    uploadErrorMessage(error) {
      const body = error?.body || null;
      if (typeof body === "string" && body.trim()) return body.trim();
      const bodyMessage = body?.message || body?.detail || body?.title || body?.error || "";
      if (bodyMessage) return String(bodyMessage);
      if (error?.message) return String(error.message);
      return "Upload failed.";
    }
    conflictAssetId(error) {
      const body = error?.body || {};
      const candidates = [
        body.assetId,
        body.asset_id,
        body.existingAssetId,
        body.existing_asset_id,
        body.id,
        body.asset?.assetId,
        body.asset?.asset_id,
        body.asset?.id,
        body.record?.assetId,
        body.record?.asset_id,
        body.record?.id,
        body.existing?.assetId,
        body.existing?.asset_id,
        body.existing?.id
      ];
      return candidates.map((value) => String(value || "").trim()).find(Boolean) || "";
    }
    isUploadConflict(error) {
      const status = Number(error?.status || error?.body?.status || 0);
      if (status === 409) return true;
      return /already exists|duplicate|conflict/i.test(this.uploadErrorMessage(error));
    }
    findExistingAssetForConflict(assetId, request = {}) {
      const id = String(assetId || "").trim();
      const key = String(request.key || request.assetKey || request.asset_key || "").trim();
      const name = String(request.name || "").trim().toLowerCase();
      const originalFileName = String(request.originalFileName || request.fileName || "").trim().toLowerCase();
      const baseFileName = stripExtension(originalFileName).trim().toLowerCase();
      return this._assets.find((asset) => {
        const normalized = normalizeAsset(asset);
        if (id && normalized.id === id) return true;
        if (key && normalized.key === key) return true;
        const assetName = String(normalized.name || "").trim().toLowerCase();
        return Boolean(assetName && (assetName === name || assetName === baseFileName));
      }) || null;
    }
    async handleUploadConflict(error, request = {}) {
      if (!this.isUploadConflict(error)) return false;
      const message = this.uploadErrorMessage(error) || "Asset already exists.";
      const assetId = this.conflictAssetId(error);
      let existingAsset = null;
      let fetchErrorMessage = "";
      if (assetId && this._provider?.getAsset) {
        try {
          existingAsset = normalizeAsset(await this._provider.getAsset(assetId, request.applicationKey));
        } catch (fetchError) {
          fetchErrorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        }
      }
      if (!existingAsset) existingAsset = this.findExistingAssetForConflict(assetId, request);
      if (!existingAsset) {
        try {
          await this.loadAssets();
          existingAsset = this.findExistingAssetForConflict(assetId, request);
        } catch (loadError) {
          if (!fetchErrorMessage) fetchErrorMessage = loadError instanceof Error ? loadError.message : String(loadError);
        }
      }
      const detail = {
        error: message,
        assetId,
        request,
        asset: existingAsset || null,
        detail: error?.body || null,
        fetchError: fetchErrorMessage || null
      };
      emitAssetEvent(this, "asset-upload-conflict", detail);
      emitAssetEvent(this, "uib-asset-upload-conflict", detail);
      if (existingAsset) {
        const asset = normalizeAsset(existingAsset);
        this.cacheAssets([asset]);
        this._pendingUploadFile = null;
        this._pendingUploadFileName = "";
        this._pendingUploadDescription = "";
        this.revokePendingUploadPreview();
        this._uploadMessage = `Asset already exists. Selected ${asset.name}.`;
        this._message = this._uploadMessage;
        if (this.isMultiple()) {
          this._selectedAssetIds.add(asset.id);
          this.updateValueFromSelection({ emitNative: true });
          emitAssetEvent(this, "asset-selection-change", this.currentMultiSelectionDetail({ uploadConflict: true, existing: true }));
          this.render();
        } else {
          await this.emitSingleSelection(asset, { uploadConflict: true, existing: true });
        }
        return true;
      }
      this._uploadMessage = `${message} The existing asset could not be shown. It may be hidden by current filters, application scope, visibility permissions, or status.`;
      if (fetchErrorMessage) this._uploadMessage += ` ${fetchErrorMessage}`;
      this._message = this._uploadMessage;
      this.render();
      return true;
    }
    async handleAssetClick(assetId) {
      if (this.disabled()) return;
      const asset = this._assets.find((item2) => item2.id === assetId);
      if (!asset) return;
      this._selectedAsset = asset;
      if (this.isMultiple()) {
        if (this._selectedAssetIds.has(asset.id)) this._selectedAssetIds.delete(asset.id);
        else {
          const maxSelection = this.maxSelection();
          if (maxSelection && this._selectedAssetIds.size >= maxSelection) {
            this._message = `You can select up to ${maxSelection} asset${maxSelection === 1 ? "" : "s"}.`;
            this.render();
            return;
          }
          this._selectedAssetIds.add(asset.id);
        }
        this.updateValueFromSelection({ emitNative: true });
        emitAssetEvent(this, "asset-selection-change", this.currentMultiSelectionDetail());
        this.render();
        return;
      }
      await this.emitSingleSelection(asset);
    }
    shouldCopyAsset(asset) {
      if (!this.copyOnSelect()) return false;
      const applicationKey = this.activeApplicationKey();
      if (!applicationKey) return false;
      const normalized = normalizeAsset(asset);
      const assetApplicationKey = normalized.applicationKey || normalized.ownerApplicationKey || "";
      return normalized.scope !== "application" || Boolean(assetApplicationKey && assetApplicationKey !== applicationKey);
    }
    async resolveAssetForSelection(asset) {
      const normalized = normalizeAsset(asset);
      if (!this.shouldCopyAsset(normalized)) return { asset: normalized, copied: false };
      if (!this._provider?.copyAssetToApplication) {
        this._message = "Copy is not available from the current asset provider; selected the original asset.";
        return { asset: normalized, copied: false, copyUnavailable: true };
      }
      emitAssetEvent(this, "asset-copy-request", { asset: normalized, applicationKey: this.activeApplicationKey() });
      emitAssetEvent(this, "uib-asset-copy-to-app-request", { asset: normalized, applicationKey: this.activeApplicationKey() });
      try {
        const copied = normalizeAsset(await this._provider.copyAssetToApplication(normalized.id, this.activeApplicationKey(), { source: "asset-picker" }));
        this.cacheAssets([copied]);
        await this.loadAssets();
        return { asset: copied, copied: true, sourceAssetId: normalized.id };
      } catch (error) {
        this._message = `Could not copy asset into this application; selected the original asset instead. ${error instanceof Error ? error.message : String(error)}`;
        emitAssetEvent(this, "asset-copy-failed", { asset: normalized, applicationKey: this.activeApplicationKey(), error });
        emitAssetEvent(this, "uib-asset-copy-failed", { asset: normalized, applicationKey: this.activeApplicationKey(), error });
        return { asset: normalized, copied: false, copyFailed: true, copyError: error instanceof Error ? error.message : String(error) };
      }
    }
    async emitSingleSelection(asset, extra = {}) {
      this.ensureProvider();
      this._loading = true;
      this.render();
      try {
        const resolved = await this.resolveAssetForSelection(asset);
        const selectedAsset = normalizeAsset(resolved.asset);
        this.cacheAssets([selectedAsset]);
        this._selectedAsset = selectedAsset;
        this._selectedAssetIds = /* @__PURE__ */ new Set([selectedAsset.id]);
        this.updateValueFromSelection({ emitNative: true });
        const insert = buildInsertPayload(selectedAsset, {
          ...extra,
          copied: resolved.copied,
          sourceAssetId: resolved.sourceAssetId,
          copyUnavailable: resolved.copyUnavailable
        });
        const selection = assetSelection(selectedAsset);
        const detail = { ...insert, value: selectedAsset.id, asset: selectedAsset, selection };
        emitAssetEvent(this, "asset-selected", detail);
        emitAssetEvent(this, "uib-asset-select", { asset: selectedAsset, selection, insert, value: selectedAsset.id });
        this._message = `Selected ${selectedAsset.name}.`;
        this._open = false;
        this._filtersOpen = false;
        this._uploadOpen = false;
      } catch (error) {
        this._message = error instanceof Error ? error.message : String(error);
      } finally {
        this._loading = false;
        this.render();
      }
    }
    currentMultiSelectionDetail(extra = {}) {
      const rawAssets = this.selectedAssets();
      const inserts = rawAssets.map((asset) => buildInsertPayload(asset, extra));
      return {
        value: this.selectionValue(),
        assetIds: Array.from(this._selectedAssetIds),
        assets: inserts,
        selections: rawAssets.map((asset) => assetSelection(asset)),
        rawAssets
      };
    }
    async emitMultipleSelection() {
      const assets = this.selectedAssets();
      if (!assets.length) return;
      this._loading = true;
      this.render();
      try {
        const resolvedAssets = [];
        const inserts = [];
        for (const asset of assets) {
          const resolved = await this.resolveAssetForSelection(asset);
          const selectedAsset = normalizeAsset(resolved.asset);
          this.cacheAssets([selectedAsset]);
          resolvedAssets.push(selectedAsset);
          inserts.push(buildInsertPayload(selectedAsset, {
            copied: resolved.copied,
            sourceAssetId: resolved.sourceAssetId,
            copyUnavailable: resolved.copyUnavailable
          }));
        }
        this._selectedAssetIds = new Set(resolvedAssets.map((asset) => asset.id));
        this.syncSelectedAssets();
        this.updateValueFromSelection({ emitNative: true });
        const selections = resolvedAssets.map((asset) => assetSelection(asset));
        emitAssetEvent(this, "assets-selected", { value: this.selectionValue(), assetIds: Array.from(this._selectedAssetIds), assets: inserts, selections, rawAssets: resolvedAssets });
        emitAssetEvent(this, "uib-assets-select", { value: this.selectionValue(), assets: resolvedAssets, selections, inserts });
        this._message = `Selected ${resolvedAssets.length} asset${resolvedAssets.length === 1 ? "" : "s"}.`;
        this._open = false;
        this._filtersOpen = false;
        this._uploadOpen = false;
      } catch (error) {
        this._message = error instanceof Error ? error.message : String(error);
      } finally {
        this._loading = false;
        this.render();
      }
    }
    clearSelection() {
      this._selectedAssetIds = /* @__PURE__ */ new Set();
      this._selectedAsset = null;
      this.updateValueFromSelection({ emitNative: true });
      emitAssetEvent(this, "asset-cleared", { value: this._value });
      emitAssetEvent(this, "uib-asset-clear", { value: this._value });
      this.render();
    }
  };
  registerElement("uib-asset-picker", UibAssetPicker);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/assets/src/components/uib-visual-source-control.js
  var styles22 = `
${baseAssetStyles}
.visual-control{display:grid;gap:1rem}.visual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.visual-field{display:grid;gap:.35rem;color:var(--uib-assets-muted);font-size:.85rem;font-weight:850}.visual-field--wide{grid-column:1/-1}.visual-preview{display:grid;grid-template-columns:minmax(9rem,14rem) minmax(0,1fr);gap:.85rem;align-items:center;padding:.85rem;border:1px solid var(--uib-assets-border);border-radius:var(--uib-assets-radius-sm);background:var(--uib-assets-surface-soft)}.visual-preview uib-asset-image{min-height:7rem}.visual-summary{display:grid;gap:.35rem}.visual-summary strong{color:var(--uib-assets-text)}.visual-note{margin:0;color:var(--uib-assets-muted);font-size:.86rem;line-height:1.45}@media(max-width:720px){.visual-grid,.visual-preview{grid-template-columns:1fr}}
`;
  function cleanSource(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["url", "asset", "none"].includes(normalized)) return normalized;
    return "none";
  }
  function cleanRole(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["image", "icon", "background", "svg"].includes(normalized)) return normalized;
    return "image";
  }
  function firstTextValue2(value, keys) {
    const queue = [value];
    const visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== "object" || visited.has(current)) continue;
      visited.add(current);
      for (const key of keys) {
        const candidate = current[key];
        if (candidate !== void 0 && candidate !== null && candidate !== "") return String(candidate);
      }
      for (const nestedKey of ["insert", "selection", "asset", "record", "storageRecord", "raw"]) {
        if (current[nestedKey]) queue.push(current[nestedKey]);
      }
    }
    return "";
  }
  var UibVisualSourceControl = class extends HTMLElement {
    static get observedAttributes() {
      return ["visual-source", "visual-role", "src", "asset-id", "alt", "label", "application-key", "api-base-url", "use-asset-picker"];
    }
    constructor() {
      super();
      this.headers = void 0;
      this.getAuthHeaders = void 0;
      this._suppressAttributeRender = false;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected && !this._suppressAttributeRender) this.render();
    }
    value() {
      return {
        visualSource: cleanSource(this.getAttribute("visual-source")),
        visualRole: cleanRole(this.getAttribute("visual-role")),
        visualSrc: this.getAttribute("src") || "",
        visualAssetId: this.getAttribute("asset-id") || "",
        visualAlt: this.getAttribute("alt") || ""
      };
    }
    setValue(value, emit = true) {
      const next = value || {};
      this._suppressAttributeRender = true;
      this.setAttribute("visual-source", cleanSource(next.visualSource || next.source || this.getAttribute("visual-source")));
      this.setAttribute("visual-role", cleanRole(next.visualRole || next.role || this.getAttribute("visual-role")));
      this.setAttribute("src", String(next.visualSrc ?? next.src ?? this.getAttribute("src") ?? ""));
      this.setAttribute("asset-id", String(next.visualAssetId ?? next.assetId ?? this.getAttribute("asset-id") ?? ""));
      this.setAttribute("alt", String(next.visualAlt ?? next.alt ?? this.getAttribute("alt") ?? ""));
      this._suppressAttributeRender = false;
      if (emit) this.emitChange();
    }
    emitChange() {
      const detail = this.value();
      this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true, detail }));
      this.dispatchEvent(new CustomEvent("uib-visual-source-change", { bubbles: true, composed: true, detail }));
    }
    collectAndEmit() {
      const source = this.shadowRoot.querySelector('[data-field="visualSource"]')?.value || "none";
      const role = this.shadowRoot.querySelector('[data-field="visualRole"]')?.value || "image";
      const src = this.shadowRoot.querySelector('[data-field="visualSrc"]')?.value || "";
      const assetId = this.shadowRoot.querySelector('[data-field="visualAssetId"]')?.value || "";
      const alt = this.shadowRoot.querySelector('[data-field="visualAlt"]')?.value || "";
      this._suppressAttributeRender = true;
      this.setAttribute("visual-source", cleanSource(source));
      this.setAttribute("visual-role", cleanRole(role));
      this.setAttribute("src", src);
      this.setAttribute("asset-id", assetId);
      this.setAttribute("alt", alt);
      this._suppressAttributeRender = false;
      this.emitChange();
      this.renderPreviewOnly();
    }
    pickerMarkup(value) {
      if (!this.hasAttribute("use-asset-picker")) return "";
      const appKey = this.getAttribute("application-key") || "";
      const baseUrl = this.getAttribute("api-base-url") || "";
      return `<label class="visual-field visual-field--wide"><span>Asset picker</span><uib-asset-picker data-visual-picker="true" data-picker-mode="simple" label="Visual asset" placeholder="Select or upload visual asset" value="` + escapeHtml2(value.visualAssetId) + `" application-key="` + escapeHtml2(appKey) + `" default-application-key="` + escapeHtml2(appKey) + `" api-base-url="` + escapeHtml2(baseUrl) + `" selection-mode="single" view="list" default-layout="list" default-asset-type="image" default-file-type="image" default-reuse-scope="global" default-scope="global" default-visibility="public" asset-visibility="public" allow-upload insertable-only insertable-file-types="image,icon,svg" accepted-file-types="image/png,image/jpeg,image/gif,image/webp,image/svg+xml,image/avif" copy-on-select="false" selection-behavior="select" ></uib-asset-picker></label>`;
    }
    configurePicker() {
      const picker = this.shadowRoot.querySelector("uib-asset-picker[data-visual-picker]");
      if (!picker) return;
      picker.headers = typeof this.getAuthHeaders === "function" ? this.getAuthHeaders() : this.headers;
      picker.getAuthHeaders = this.getAuthHeaders;
      picker.selectedAssetIds = picker.getAttribute("value") ? [picker.getAttribute("value")] : [];
      const handleSelection = (event) => {
        event.stopPropagation();
        const assetId = firstTextValue2(event.detail, ["assetId", "asset_id", "id", "value"]);
        if (!assetId) return;
        const input = this.shadowRoot.querySelector('[data-field="visualAssetId"]');
        if (input) input.value = assetId;
        const source = this.shadowRoot.querySelector('[data-field="visualSource"]');
        if (source) source.value = "asset";
        this.collectAndEmit();
      };
      picker.addEventListener("uib-asset-select", handleSelection);
      picker.addEventListener("asset-selected", handleSelection);
      picker.addEventListener("uib-asset-clear", (event) => {
        event.stopPropagation();
        const input = this.shadowRoot.querySelector('[data-field="visualAssetId"]');
        if (input) input.value = "";
        this.collectAndEmit();
      });
      if (!picker.dataset.uibConfigured && typeof picker.loadAll === "function") {
        picker.dataset.uibConfigured = "true";
        window.setTimeout(() => void picker.loadAll(), 0);
      }
    }
    renderPreviewOnly() {
      const preview = this.shadowRoot.querySelector(".visual-preview");
      if (!preview) return;
      const value = this.value();
      preview.innerHTML = `<uib-asset-image src="` + escapeHtml2(value.visualSrc) + `" asset-id="` + escapeHtml2(value.visualAssetId) + `" alt="` + escapeHtml2(value.visualAlt) + `" role="` + escapeHtml2(value.visualRole) + `" fit="` + (value.visualRole === "icon" || value.visualRole === "svg" ? "contain" : "cover") + `"></uib-asset-image><div class="visual-summary"><strong> ` + escapeHtml2(value.visualSource) + ` / ` + escapeHtml2(value.visualRole) + ` </strong><p class="visual-note"> URL source wins when src has a value. Asset ID remains available for storage and preview resolution. </p></div>`;
    }
    bind() {
      this.shadowRoot.querySelectorAll("select,input").forEach((input) => {
        input.addEventListener("input", () => this.collectAndEmit());
        input.addEventListener("change", () => this.collectAndEmit());
      });
      this.configurePicker();
    }
    render() {
      const value = this.value();
      const label = this.getAttribute("label") || "Visual source";
      this.shadowRoot.innerHTML = `<style> ` + styles22 + ` </style><section class="visual-control" part="control"><div><h3 class="title"> ` + escapeHtml2(label) + ` </h3><p class="subtitle"> Source tells where the visual comes from. Role tells how the Hero should present it. </p></div><div class="visual-grid"><label class="visual-field"><span> Source </span><select data-field="visualSource"><option value="none" ` + (value.visualSource === "none" ? "selected" : "") + `> None </option><option value="url" ` + (value.visualSource === "url" ? "selected" : "") + `> URL </option><option value="asset" ` + (value.visualSource === "asset" ? "selected" : "") + `> Asset ID </option></select></label><label class="visual-field"><span> Role </span><select data-field="visualRole"><option value="image" ` + (value.visualRole === "image" ? "selected" : "") + `> Image </option><option value="icon" ` + (value.visualRole === "icon" ? "selected" : "") + `> Icon </option><option value="background" ` + (value.visualRole === "background" ? "selected" : "") + `> Background </option><option value="svg" ` + (value.visualRole === "svg" ? "selected" : "") + `> SVG </option></select></label><label class="visual-field visual-field--wide"><span> URL / data image </span><input data-field="visualSrc" value="` + escapeHtml2(value.visualSrc) + `" placeholder="https://example.local/image.png or data:image/svg+xml,..."></label><label class="visual-field"><span> Asset ID </span><input data-field="visualAssetId" value="` + escapeHtml2(value.visualAssetId) + `" placeholder="asset_123"></label><label class="visual-field"><span> Alt text </span><input data-field="visualAlt" value="` + escapeHtml2(value.visualAlt) + `"></label> ` + this.pickerMarkup(value) + ` </div><div class="visual-preview" part="preview"></div></section>`;
      this.renderPreviewOnly();
      this.bind();
    }
  };
  registerElement("uib-visual-source-control", UibVisualSourceControl);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/hero/src/uib-hero-editor.js
  var EDIT_SECTIONS = ["Identity", "Content", "Visual", "Rich Slots"];
  function fieldValue(form, name) {
    return form.elements[name]?.value ?? "";
  }
  function actionLabel(index) {
    const key = CTA_KEYS[index];
    return key ? `${key.slice(0, 1).toUpperCase()}${key.slice(1)} CTA` : `Action ${index + 1}`;
  }
  var UibHeroEditor = class extends HTMLElement {
    static get observedAttributes() {
      return ["hero-data", "hero-json", "asset-map", "application-key", "brand-label", "brand-mark", "autosave"];
    }
    constructor() {
      super();
      this.originalRecord = createDefaultHeroRecord();
      this.currentRecord = cloneRecord(this.originalRecord);
      this.state = "clean";
      this.error = "";
      this.editorPanelOpen = true;
      this.autosaveTimer = 0;
    }
    connectedCallback() {
      this.loadFromAttributes();
      this.render();
    }
    disconnectedCallback() {
      if (this.autosaveTimer) window.clearTimeout(this.autosaveTimer);
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;
      if (name === "hero-data" || name === "hero-json" || name === "application-key") {
        this.loadFromAttributes();
      }
      if (this.isConnected) this.render();
    }
    set heroData(value) {
      const record = normalizeHeroRecord(value && typeof value === "object" ? value : parseObject4(value));
      this.originalRecord = cloneRecord(record);
      this.currentRecord = cloneRecord(record);
      this.state = "clean";
      this.error = "";
      if (this.isConnected) this.render();
    }
    get heroData() {
      return cloneRecord(this.currentRecord);
    }
    set value(value) {
      this.heroData = value;
    }
    get value() {
      return this.heroData;
    }
    loadHeroData(value) {
      this.heroData = value;
    }
    loadFromAttributes() {
      const raw = this.getAttribute("hero-data") || this.getAttribute("hero-json") || "";
      if (raw) {
        this.heroData = parseObject4(raw);
        return;
      }
      if (!Object.keys(this.currentRecord || {}).length) this.heroData = createDefaultHeroRecord();
      const appKey = this.getAttribute("application-key");
      if (appKey && (!this.currentRecord.application_key || this.currentRecord.application_key === "sample")) {
        this.currentRecord.application_key = appKey;
        this.originalRecord.application_key = appKey;
        if (!this.currentRecord.route_path || this.currentRecord.route_path === "/sample") this.currentRecord.route_path = `/${appKey}`;
        if (!this.originalRecord.route_path || this.originalRecord.route_path === "/sample") this.originalRecord.route_path = `/${appKey}`;
      }
    }
    get autosave() {
      return this.hasAttribute("autosave") && this.getAttribute("autosave") !== "false";
    }
    stateLabel() {
      if (this.state === "dirty") return "dirty";
      if (this.state === "saved") return "saved";
      if (this.state === "saving") return "saving";
      if (this.state === "error") return "needs attention";
      return "clean";
    }
    collectFormRecord() {
      const form = this.querySelector("form");
      if (!form) return cloneRecord(this.currentRecord);
      const next = cloneRecord(this.currentRecord);
      HERO_FIELD_DEFINITIONS.forEach((field) => {
        next[field.name] = fieldValue(form, field.name);
      });
      next.nav_items = JSON.stringify(this.collectNavRows());
      next.details = JSON.stringify(this.detailsEditor()?.details || parseArray(next.details));
      const visual = this.querySelector("uib-visual-source-control")?.value?.();
      next.visual_source = visual?.visualSource || next.visual_source || "none";
      next.visual_role = visual?.visualRole || next.visual_role || "image";
      next.visual_src = visual?.visualSrc || "";
      next.visual_asset_id = visual?.visualAssetId || "";
      next.visual_alt = visual?.visualAlt || "";
      return normalizeHeroRecord(next);
    }
    detailsEditor() {
      return this.querySelector("uib-detail-list-editor");
    }
    collectNavRows() {
      const rows = [...this.querySelectorAll("[data-nav-row]")];
      if (!rows.length) return parseArray(this.currentRecord.nav_items);
      return rows.map((row) => ({
        label: row.querySelector("[data-nav-label]")?.value || "",
        href: row.querySelector("[data-nav-href]")?.value || ""
      })).filter((row) => row.label || row.href);
    }
    setCurrentFromForm(options = {}) {
      const previous = cloneRecord(this.currentRecord);
      this.currentRecord = this.collectFormRecord();
      this.state = recordsEqual(this.currentRecord, this.originalRecord) ? "clean" : "dirty";
      this.error = "";
      this.updatePreview();
      this.renderFooterOnly();
      if (JSON.stringify(previous) !== JSON.stringify(this.currentRecord)) {
        dispatch(this, "change", { oldValue: previous, newValue: this.heroData, record: this.heroData });
        dispatch(this, "uib-hero-editor-change", { oldValue: previous, newValue: this.heroData, record: this.heroData });
      }
      if (options.autosave) this.queueAutosave();
    }
    queueAutosave() {
      if (this.autosaveTimer) window.clearTimeout(this.autosaveTimer);
      if (!this.autosave || this.state !== "dirty") return;
      this.autosaveTimer = window.setTimeout(() => this.save("autosave"), 1200);
    }
    updatePreview() {
      const preview = this.querySelector("uib-hero-preview");
      if (preview) preview.record = this.currentRecord;
    }
    renderFooterOnly() {
      const footer = this.querySelector(".uib-hero-editor__footer");
      if (footer) footer.outerHTML = this.footerMarkup();
      this.bindFooter();
    }
    validate() {
      const errors = [];
      if (!String(this.currentRecord.headline || "").trim()) errors.push("Headline is required.");
      if (!String(this.currentRecord.name || "").trim()) errors.push("Name is required.");
      return errors;
    }
    save(trigger = "manual") {
      this.setCurrentFromForm();
      const errors = this.validate();
      if (errors.length) {
        this.state = "error";
        this.error = errors.join(" ");
        this.renderFooterOnly();
        return;
      }
      this.originalRecord = cloneRecord(this.currentRecord);
      this.state = "saved";
      this.error = "";
      this.renderFooterOnly();
      dispatch(this, "uib-hero-editor-save", { record: this.heroData, value: this.heroData, trigger });
    }
    addNavRow() {
      this.setCurrentFromForm();
      const rows = parseArray(this.currentRecord.nav_items);
      rows.push({ label: "New link", href: "#" });
      this.currentRecord.nav_items = JSON.stringify(rows);
      this.state = "dirty";
      this.render();
    }
    removeNavRow(index) {
      this.setCurrentFromForm();
      const rows = parseArray(this.currentRecord.nav_items);
      rows.splice(index, 1);
      this.currentRecord.nav_items = JSON.stringify(rows);
      this.state = "dirty";
      this.render();
    }
    moveNavRow(index, direction) {
      this.setCurrentFromForm();
      const rows = parseArray(this.currentRecord.nav_items);
      const target = Math.max(0, Math.min(rows.length - 1, index + direction));
      if (target === index) return;
      const [row] = rows.splice(index, 1);
      rows.splice(target, 0, row);
      this.currentRecord.nav_items = JSON.stringify(rows);
      this.state = "dirty";
      this.render();
    }
    addAction() {
      this.setCurrentFromForm();
      const actions = heroActionsForRecord(this.currentRecord);
      actions.push(normalizeHeroAction({ label: `Action ${actions.length + 1}`, value: "#", variant: "secondary" }, actions.length));
      applyHeroActionsToRecord(this.currentRecord, actions);
      this.state = "dirty";
      this.render();
    }
    removeAction(index) {
      this.setCurrentFromForm();
      const actions = heroActionsForRecord(this.currentRecord);
      actions.splice(index, 1);
      applyHeroActionsToRecord(this.currentRecord, actions);
      this.state = "dirty";
      this.render();
    }
    moveAction(index, direction) {
      this.setCurrentFromForm();
      const actions = heroActionsForRecord(this.currentRecord);
      const target = Math.max(0, Math.min(actions.length - 1, index + direction));
      if (target === index) return;
      const [action] = actions.splice(index, 1);
      actions.splice(target, 0, action);
      applyHeroActionsToRecord(this.currentRecord, actions);
      this.state = "dirty";
      this.render();
    }
    updateActionFromInput(input) {
      const card = input.closest("[data-action-row]");
      if (!card) return;
      const index = Number(card.dataset.actionRow || 0);
      const actions = heroActionsForRecord(this.currentRecord);
      actions[index] = normalizeHeroAction({
        ...actions[index],
        id: card.querySelector('[data-action-field="id"]')?.value || "",
        name: card.querySelector('[data-action-field="name"]')?.value || "",
        label: card.querySelector('[data-action-field="label"]')?.value || "",
        type: card.querySelector('[data-action-field="type"]')?.value || "link",
        value: card.querySelector('[data-action-field="value"]')?.value || "",
        variant: card.querySelector('[data-action-field="variant"]')?.value || "secondary",
        show: card.querySelector('[data-action-field="show"]')?.checked || false,
        disabled: card.querySelector('[data-action-field="disabled"]')?.checked || false,
        ariaLabel: card.querySelector('[data-action-field="ariaLabel"]')?.value || "",
        target: card.querySelector('[data-action-field="target"]')?.value || "",
        rel: card.querySelector('[data-action-field="rel"]')?.value || ""
      }, index);
      applyHeroActionsToRecord(this.currentRecord, actions);
      this.state = recordsEqual(this.currentRecord, this.originalRecord) ? "clean" : "dirty";
      this.updatePreview();
      this.renderFooterOnly();
      dispatch(this, "uib-hero-editor-change", { record: this.heroData, value: this.heroData });
      this.queueAutosave();
    }
    bind() {
      const form = this.querySelector("form");
      form?.addEventListener("input", (event) => {
        if (event.target?.closest?.("[data-action-row]")) return;
        this.setCurrentFromForm({ autosave: true });
      });
      form?.addEventListener("change", (event) => {
        if (event.target?.closest?.("[data-action-row]")) return;
        this.setCurrentFromForm({ autosave: true });
      });
      this.querySelector("[data-toggle-editor]")?.addEventListener("click", () => {
        if (this.editorPanelOpen) this.setCurrentFromForm();
        this.editorPanelOpen = !this.editorPanelOpen;
        this.render();
      });
      this.querySelector("[data-add-nav]")?.addEventListener("click", () => this.addNavRow());
      this.querySelectorAll("[data-remove-nav]").forEach((button) => button.addEventListener("click", () => this.removeNavRow(Number(button.dataset.removeNav))));
      this.querySelectorAll("[data-move-nav]").forEach((button) => button.addEventListener("click", () => this.moveNavRow(Number(button.dataset.moveNav), Number(button.dataset.direction))));
      this.querySelector("[data-add-action]")?.addEventListener("click", () => this.addAction());
      this.querySelectorAll("[data-remove-action]").forEach((button) => button.addEventListener("click", () => this.removeAction(Number(button.dataset.removeAction))));
      this.querySelectorAll("[data-move-action]").forEach((button) => button.addEventListener("click", () => this.moveAction(Number(button.dataset.moveAction), Number(button.dataset.direction))));
      this.querySelectorAll("[data-action-field]").forEach((input) => {
        input.addEventListener(input.type === "text" || input.tagName === "TEXTAREA" ? "input" : "change", () => this.updateActionFromInput(input));
      });
      this.querySelector("uib-visual-source-control")?.addEventListener("uib-visual-source-change", (event) => {
        event.stopPropagation();
        this.setCurrentFromForm({ autosave: true });
      });
      this.detailsEditor()?.addEventListener("uib-detail-list-editor-change", (event) => {
        event.stopPropagation();
        this.setCurrentFromForm({ autosave: true });
      });
      this.bindFooter();
      this.updatePreview();
    }
    bindFooter() {
      this.querySelector("[data-save-hero]")?.addEventListener("click", () => this.save("manual"));
      this.querySelector("[data-reset-hero]")?.addEventListener("click", () => {
        this.currentRecord = cloneRecord(this.originalRecord);
        this.state = "clean";
        this.error = "";
        this.render();
        dispatch(this, "uib-hero-editor-reset", { record: this.heroData, value: this.heroData });
      });
    }
    fieldMarkup(field) {
      const value = this.currentRecord[field.name] || "";
      const base = `name="${escapeHtml3(field.name)}" ${field.required ? "required" : ""}`;
      if (field.kind === "textarea" || field.kind === "html") {
        return `<label class="field field--wide"><span>` + escapeHtml3(field.label) + `</span><textarea ` + base + ` rows="` + (field.kind === "html" ? 5 : 3) + `">` + escapeHtml3(value) + `</textarea></label>`;
      }
      if (field.kind === "select") {
        return `<label class="field"><span>` + escapeHtml3(field.label) + `</span><select ` + base + `>` + field.options.map((option) => `<option value="${escapeHtml3(option)}" ${value === option ? "selected" : ""}>${escapeHtml3(option)}</option>`).join("") + `</select></label>`;
      }
      return `<label class="field"><span>` + escapeHtml3(field.label) + `</span><input ` + base + ` type="` + (field.kind === "number" ? "number" : "text") + `" value="` + escapeHtml3(value) + `" ` + (field.name === "layout_opacity" ? 'step="0.05" min="0" max="1"' : "") + `></label>`;
    }
    sectionMarkup(section) {
      const fields = HERO_FIELD_DEFINITIONS.filter((field) => field.section === section);
      return `<details class="section" open><summary>` + escapeHtml3(section) + `</summary><div class="section-body"> ` + fields.map((field) => this.fieldMarkup(field)).join("") + ` </div></details>`;
    }
    visualControlMarkup() {
      return `<details class="section" open><summary>Visual source</summary><div class="section-body section-body--single"><uib-visual-source-control label="Hero visual" visual-source="` + escapeHtml3(this.currentRecord.visual_source || "none") + `" visual-role="` + escapeHtml3(this.currentRecord.visual_role || "image") + `" src="` + escapeHtml3(this.currentRecord.visual_src || "") + `" asset-id="` + escapeHtml3(this.currentRecord.visual_asset_id || "") + `" alt="` + escapeHtml3(this.currentRecord.visual_alt || "") + `" application-key="` + escapeHtml3(this.currentRecord.application_key || this.getAttribute("application-key") || "") + `" ></uib-visual-source-control></div></details>`;
    }
    actionsMarkup() {
      const actions = heroActionsForRecord(this.currentRecord);
      return `<details class="section" open><summary> Actions </summary><div class="section-body section-body--single"><div class="toolbar"><p> Configure the Hero action buttons. Link values become hrefs; Action values are emitted for the parent application. </p><button class="button button--primary" type="button" data-add-action> Add action </button></div><div class="action-list"> ` + (actions.length ? actions.map((action, index) => this.actionMarkup(action, index, actions.length)).join("") : '<p class="empty">No actions configured.</p>') + ` </div></div></details>`;
    }
    actionMarkup(action, index, length) {
      const valueLabel = action.type === "action" ? "Action token" : "Href";
      return `<article class="action-card" data-action-row="` + index + `"><div class="action-head"><strong>` + escapeHtml3(actionLabel(index)) + `</strong><div class="button-row"><button class="icon-button" type="button" data-move-action="` + index + `" data-direction="-1" ` + (index === 0 ? "disabled" : "") + ` aria-label="Move action up">\u2191</button><button class="icon-button" type="button" data-move-action="` + index + `" data-direction="1" ` + (index === length - 1 ? "disabled" : "") + ` aria-label="Move action down">\u2193</button><button class="icon-button icon-button--danger" type="button" data-remove-action="` + index + `" aria-label="Remove action">\xD7</button></div></div><div class="action-grid"><label class="field"><span>Label</span><input data-action-field="label" type="text" value="` + escapeHtml3(action.label) + `"></label><label class="field"><span>Type</span><select data-action-field="type"><option value="link" ` + (action.type === "link" ? "selected" : "") + `>Link</option><option value="action" ` + (action.type === "action" ? "selected" : "") + `>Action</option></select></label><label class="field field--wide"><span>` + escapeHtml3(valueLabel) + `</span><input data-action-field="value" type="text" value="` + escapeHtml3(action.value) + `"></label><label class="field"><span>Variant</span><select data-action-field="variant">` + CTA_VARIANTS.map((variant) => `<option value="${escapeHtml3(variant)}" ${action.variant === variant ? "selected" : ""}>${escapeHtml3(variant)}</option>`).join("") + `</select></label><div class="check-row"><label><input data-action-field="show" type="checkbox" ` + (action.show ? "checked" : "") + `> Show</label><label><input data-action-field="disabled" type="checkbox" ` + (action.disabled ? "checked" : "") + `> Disabled</label></div><details class="advanced"><summary>Advanced</summary><div class="action-grid"><label class="field"><span>ID</span><input data-action-field="id" type="text" value="` + escapeHtml3(action.id) + `"></label><label class="field"><span>Name</span><input data-action-field="name" type="text" value="` + escapeHtml3(action.name) + `"></label><label class="field"><span>Accessible text</span><input data-action-field="ariaLabel" type="text" value="` + escapeHtml3(action.ariaLabel) + `"></label><label class="field"><span>Target</span><input data-action-field="target" type="text" value="` + escapeHtml3(action.target) + `"></label><label class="field"><span>Rel</span><input data-action-field="rel" type="text" value="` + escapeHtml3(action.rel) + `"></label></div></details></div></article>`;
    }
    navigationMarkup() {
      const rows = parseArray(this.currentRecord.nav_items);
      return `<details class="section" open><summary> Navigation </summary><div class="section-body section-body--single"><div class="toolbar"><p> Edit generated navigation links. </p><button class="button button--primary" type="button" data-add-nav> Add link </button></div><div class="row-list"> ` + (rows.length ? rows.map((row, index) => `
            <div class="nav-row" data-nav-row>
            <label class="field"><span>Label</span><input data-nav-label type="text" value="${escapeHtml3(row.label || "")}"></label>
            <label class="field"><span>Href</span><input data-nav-href type="text" value="${escapeHtml3(row.href || "")}"></label>
            <div class="button-row">
            <button class="icon-button" type="button" data-move-nav="${index}" data-direction="-1" ${index === 0 ? "disabled" : ""} aria-label="Move link up">\u2191</button>
            <button class="icon-button" type="button" data-move-nav="${index}" data-direction="1" ${index === rows.length - 1 ? "disabled" : ""} aria-label="Move link down">\u2193</button>
            <button class="icon-button icon-button--danger" type="button" data-remove-nav="${index}" aria-label="Remove link">\xD7</button>
            </div>
            </div>`).join("") : '<p class="empty">No navigation links configured.</p>') + ` </div></div></details>`;
    }
    detailsMarkup() {
      return `<details class="section" open><summary>Details</summary><div class="section-body section-body--single"><uib-detail-list-editor data-details-editor label="Hero details" details="` + escapeHtml3(this.currentRecord.details || "[]") + `" asset-map="` + escapeHtml3(this.getAttribute("asset-map") || this.currentRecord.asset_map || "") + `" application-key="` + escapeHtml3(this.currentRecord.application_key || this.getAttribute("application-key") || "") + `" ></uib-detail-list-editor></div></details>`;
    }
    footerMarkup() {
      return `<div class="uib-hero-editor__footer"><div class="status"><span class="badge badge--` + escapeHtml3(this.state) + `">` + escapeHtml3(this.stateLabel()) + `</span><span>` + (this.autosave ? "Autosave is enabled." : "Save emits an event for the parent app.") + `</span> ` + (this.error ? `<span class="error" role="alert">${escapeHtml3(this.error)}</span>` : "") + ` </div><div class="button-row"><button class="button" type="button" data-reset-hero ` + (this.state === "clean" ? "disabled" : "") + `>Reset</button><button class="button button--primary" type="button" data-save-hero>Save</button></div></div>`;
    }
    toolbarMarkup() {
      return `<div class="uib-hero-editor__toolbar"><div class="status"><span class="badge badge--` + escapeHtml3(this.state) + `">` + escapeHtml3(this.stateLabel()) + `</span><span>` + escapeHtml3(this.currentRecord.application_key || this.getAttribute("application-key") || "hero") + `</span><span>/</span><span>` + escapeHtml3(this.currentRecord.hero_key || "home") + `</span></div><button class="button" type="button" data-toggle-editor>` + (this.editorPanelOpen ? "Hide editing panel" : "Open editing panel") + `</button></div>`;
    }
    styles() {
      return `<style> :host{display:block;color:var(--uib-hero-editor-text,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)} *,*::before,*::after{box-sizing:border-box} .uib-hero-editor{display:grid;gap:1rem} .uib-hero-editor__toolbar,.uib-hero-editor__footer,.toolbar,.action-head{display:flex;align-items:center;justify-content:space-between;gap:.85rem;flex-wrap:wrap} .workspace{display:grid;grid-template-columns:minmax(20rem,28rem) minmax(0,1fr);gap:1rem;align-items:start} .workspace--preview-only{grid-template-columns:1fr} aside{display:grid;gap:.75rem;max-height:calc(100vh - 8rem);overflow:auto;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:1rem;background:var(--uib-color-surface,#fff)} .preview-panel{min-width:0;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:1rem;background:var(--uib-color-surface,#fff)} .section{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:.85rem;background:var(--uib-color-surface-soft,#f8fbff);overflow:hidden} summary{padding:.85rem 1rem;color:var(--uib-color-primary,#174a8b);font-weight:900;cursor:pointer} .section-body{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;padding:0 1rem 1rem} .section-body--single{grid-template-columns:1fr} .field{display:grid;gap:.35rem;min-width:0;color:var(--uib-color-ink,#13294b);font-size:.9rem;font-weight:850} .field--wide{grid-column:1/-1} input,textarea,select{width:100%;min-height:2.45rem;padding:.55rem .68rem;border:1px solid var(--uib-color-border-strong,#aab8cc);border-radius:.65rem;background:var(--uib-color-surface,#fff);color:inherit;font:inherit;font-weight:500} textarea{resize:vertical;line-height:1.4} input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible{outline:3px solid color-mix(in srgb,var(--uib-color-primary,#174a8b) 28%,transparent);outline-offset:2px} .button,.icon-button{display:inline-flex;align-items:center;justify-content:center;min-height:2.35rem;padding:.5rem .75rem;border:1px solid var(--uib-color-border-strong,#aab8cc);border-radius:999px;background:var(--uib-color-surface,#fff);color:var(--uib-color-primary,#174a8b);font:inherit;font-weight:850;cursor:pointer} .button--primary{border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:#fff} .icon-button{width:2.2rem;padding:.35rem;font-size:1rem} .icon-button--danger{border-color:rgba(180,35,42,.35);color:var(--uib-color-danger,#b4232a)} button:disabled{cursor:not-allowed;opacity:.52} .status,.button-row,.check-row{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap} .status{color:var(--uib-color-muted,#53657f);font-size:.88rem;font-weight:750} .badge{display:inline-flex;align-items:center;min-height:1.55rem;padding:.16rem .58rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:999px;background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-primary,#174a8b);font-size:.74rem;font-weight:900;text-transform:uppercase} .badge--dirty,.badge--error{border-color:rgba(180,35,42,.28);background:#fff6ed;color:#9a3412} .badge--saved{border-color:rgba(22,101,52,.28);background:#f0fdf4;color:#166534} .error{color:var(--uib-color-danger,#b4232a)} .row-list,.action-list{display:grid;gap:.75rem} .nav-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) auto;gap:.65rem;align-items:end;padding:.75rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:.85rem;background:var(--uib-color-surface,#fff)} .action-card{display:grid;gap:.75rem;padding:.85rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:.85rem;background:var(--uib-color-surface,#fff)} .action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem} .advanced{grid-column:1/-1;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:.75rem;background:var(--uib-color-surface-soft,#f8fbff)} .advanced .action-grid{padding:0 .85rem .85rem} .empty,p{margin:0;color:var(--uib-color-muted,#53657f);line-height:1.45} @media(max-width:980px){.workspace{grid-template-columns:1fr}aside{max-height:none}.nav-row,.action-grid,.section-body{grid-template-columns:1fr}} </style>`;
    }
    render() {
      const layoutClass = this.editorPanelOpen ? "workspace" : "workspace workspace--preview-only";
      this.innerHTML = ` ` + this.styles() + ` <section class="uib-hero-editor"> ` + this.toolbarMarkup() + ` <section class="` + layoutClass + `"> ` + (this.editorPanelOpen ? `
            <aside>
              <form novalidate>
                ${EDIT_SECTIONS.map((section) => this.sectionMarkup(section)).join("")}
                ${this.visualControlMarkup()}
                ${this.actionsMarkup()}
                ${this.navigationMarkup()}
                ${this.detailsMarkup()}
                ${this.footerMarkup()}
              </form>
            </aside>` : "") + ` <div class="preview-panel"><uib-hero-preview asset-map="` + escapeHtml3(this.getAttribute("asset-map") || this.currentRecord.asset_map || "") + `" application-key="` + escapeHtml3(this.currentRecord.application_key || this.getAttribute("application-key") || "") + `" brand-label="` + escapeHtml3(this.getAttribute("brand-label") || "") + `" brand-mark="` + escapeHtml3(this.getAttribute("brand-mark") || "") + `" ></uib-hero-preview></div></section></section>`;
      this.bind();
    }
  };
  registerHeroElement("uib-hero-editor", UibHeroEditor);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/hero/src/defaults.js
  var BASE_HERO_DEFAULTS = {
    eyebrow: "",
    headline: "Page headline",
    subheadline: "",
    trustSignal: "",
    theme: "light",
    size: "default",
    brandLabel: "",
    brandMark: "UIB",
    visualMode: "panel-right",
    visualAlt: "",
    layoutOpacity: 0.8,
    actions: {
      primary: { label: "", href: "#", shown: true, disabled: false },
      secondary: { label: "", href: "#", shown: true, disabled: false },
      third: { label: "", href: "#", shown: true, disabled: false },
      fourth: { label: "", href: "#", shown: true, disabled: false }
    },
    navItems: [],
    details: []
  };
  var SAMPLE_TOUR_BASE_DETAILS = [
    { label: "Tour Length", value: "45 minutes", icon: "TL", iconFile: "tour-length", iconAlt: "Tour length" },
    { label: "Tour Size", value: "Up to 25 people", icon: "TS", iconFile: "tour-size", iconAlt: "Tour size" },
    { label: "Availability", value: "Tue - Fri, 9:00 AM - 3:00 PM", icon: "AV", iconFile: "availability", iconAlt: "Availability" },
    { label: "Cost", value: "Free", icon: "CO", iconFile: "cost", iconAlt: "Cost" },
    { label: "Ages", value: "8+ recommended", icon: "AG", iconFile: "ages", iconAlt: "Ages" }
  ];
  var SAMPLE_TOUR_NAV_ITEMS = [
    { label: "Overview", href: "#overview" },
    { label: "Choose Date", href: "#booking" },
    { label: "Visitor Info", href: "#visit" },
    { label: "Reservation Help", href: "#reservation-help" }
  ];
  var HERO_DEFAULTS = deepFreeze(cloneDefaults(BASE_HERO_DEFAULTS));
  var SAMPLE_TOUR_HERO_DEFAULTS = deepFreeze(createSampleTourHeroDefaults());
  function createSampleTourHeroDefaults(options = {}) {
    const iconBasePath = trimTrailingSlash(options.iconBasePath || "");
    const details = SAMPLE_TOUR_BASE_DETAILS.map((detail) => {
      const { iconFile, ...publicDetail } = detail;
      if (!iconBasePath) return publicDetail;
      return {
        ...publicDetail,
        iconUrl: `${iconBasePath}/${iconFile}.svg`
      };
    });
    return cloneDefaults({
      ...BASE_HERO_DEFAULTS,
      eyebrow: "Visit the Sample Visitor Center",
      headline: "Tour the Sample Visitor Center",
      subheadline: "Go behind the scenes and see how the visitor experience is delivered. Choose a public tour date, review visitor requirements, and begin a reservation flow.",
      trustSignal: "Advance reservations are required. Closed federal holidays.",
      theme: "dark",
      size: "large",
      brandLabel: "Sample Organization",
      brandMark: "M",
      visualMode: "background",
      layoutOpacity: 0.84,
      actions: {
        primary: { label: "Book a Tour", href: "#booking", shown: true, disabled: false },
        secondary: { label: "Plan Your Visit", href: "#visit", shown: true, disabled: false },
        third: { label: "Cancel Reservation", href: "#reservation-help", shown: true, disabled: false },
        fourth: { label: "Book Group Tour", href: "#reservation-help", shown: true, disabled: false }
      },
      navItems: SAMPLE_TOUR_NAV_ITEMS,
      details
    });
  }
  function cloneDefaults(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function deepFreeze(value) {
    if (value && typeof value === "object") {
      Object.freeze(value);
      for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
  }
  function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/tour-ui/src/reservations/base-tour-reservation.js
  var DEFAULT_TOAST_DURATION = 4200;
  var FALSE_VALUES3 = /* @__PURE__ */ new Set(["false", "0", "no", "off"]);
  var styles23 = `
:host{display:block;min-height:100%;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-tour-card{position:relative;min-height:100%;display:grid;grid-template-columns:auto minmax(0,1fr);gap:var(--uib-space-4,1rem);overflow:hidden}.uib-tour-card--cancel{--uib-tour-accent:var(--uib-color-danger,#9d2b3a)}.uib-tour-card--find{--uib-tour-accent:var(--uib-color-success,#23634f)}.uib-tour-card--group{--uib-tour-accent:#6e4aa3}.uib-tour-card__icon{display:inline-grid;place-items:center}.uib-tour-card__content{min-width:0;display:grid;gap:var(--uib-space-3,.75rem)}.uib-tour-card__eyebrow,.uib-tour-card__heading,.uib-tour-card__description{margin:0}.uib-tour-card__action-row{display:flex;flex-wrap:wrap;gap:var(--uib-space-3,.75rem);align-items:center}.uib-tour-card__button{font:inherit;cursor:pointer}.uib-tour-card__button:disabled{cursor:not-allowed;opacity:.55}.uib-tour-toast{pointer-events:none;transition:opacity 180ms ease,transform 180ms ease}.uib-tour-toast:not(.uib-tour-toast--visible){transform:translateY(.8rem);opacity:0}.uib-tour-toast--visible{opacity:1;transform:translateY(0)}[hidden]{display:none!important}@media(max-width:540px){.uib-tour-card{grid-template-columns:1fr}.uib-tour-toast{grid-column:1/-1}}
`;
  function escapeHtml5(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function cssClassTokens4(element) {
    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\s+/).map((value) => value.trim()).filter(Boolean);
  }
  function applyCssClassToRoot2(element) {
    if (!element) return;
    const root = element.shadowRoot || element;
    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");
    if (!target) return;
    target.classList.remove(...element.__uibCssClassTokens || []);
    const next = cssClassTokens4(element);
    if (next.length) target.classList.add(...next);
    element.__uibCssClassTokens = next;
  }
  function enabledBoolean(value) {
    if (value === null) return false;
    return !FALSE_VALUES3.has(String(value).trim().toLowerCase());
  }
  function parseDuration(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_TOAST_DURATION;
  }
  var UibTourReservationBase = class extends HTMLElement {
    static get observedAttributes() {
      return ["heading", "eyebrow", "description", "action-label", "toast-message", "toast-duration", "disabled", "variant", "css-class"];
    }
    constructor(defaults) {
      super();
      this.defaults = defaults;
      this._toastVisible = false;
      this._toastMessage = "";
      this._toastTimer = void 0;
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    disconnectedCallback() {
      this.clearToastTimer();
    }
    attributeChangedCallback() {
      if (this.isConnected) this.render();
    }
    get heading() {
      return this.getAttribute("heading") || this.defaults.heading;
    }
    set heading(value) {
      this.setAttribute("heading", value);
    }
    get eyebrow() {
      return this.getAttribute("eyebrow") || this.defaults.eyebrow;
    }
    set eyebrow(value) {
      this.setAttribute("eyebrow", value);
    }
    get description() {
      return this.getAttribute("description") || this.defaults.description;
    }
    set description(value) {
      this.setAttribute("description", value);
    }
    get actionLabel() {
      return this.getAttribute("action-label") || this.defaults.actionLabel;
    }
    set actionLabel(value) {
      this.setAttribute("action-label", value);
    }
    get toastMessage() {
      return this.getAttribute("toast-message") || this.defaults.toastMessage;
    }
    set toastMessage(value) {
      this.setAttribute("toast-message", value);
    }
    get toastDuration() {
      return parseDuration(this.getAttribute("toast-duration"));
    }
    set toastDuration(value) {
      this.setAttribute("toast-duration", String(value));
    }
    get disabled() {
      return enabledBoolean(this.getAttribute("disabled"));
    }
    set disabled(value) {
      if (value) this.setAttribute("disabled", "");
      else this.removeAttribute("disabled");
    }
    get variant() {
      return this.getAttribute("variant") || this.defaults.variant;
    }
    set variant(value) {
      this.setAttribute("variant", value);
    }
    get cssClass() {
      return this.getAttribute("css-class") || "";
    }
    set cssClass(value) {
      if (value === null || value === void 0 || value === false) this.removeAttribute("css-class");
      else this.setAttribute("css-class", String(value));
    }
    call(optionalDetail = {}) {
      const detail = { action: this.defaults.action, heading: this.heading, label: this.actionLabel, disabled: this.disabled, source: this, ...optionalDetail };
      if (this.disabled) {
        this.showToast(`${this.heading} is currently disabled.`, this.toastDuration);
        return detail;
      }
      this.dispatchEvent(new CustomEvent("uib-tour-reservation-action", { bubbles: true, composed: true, cancelable: true, detail }));
      this.dispatchEvent(new CustomEvent(this.defaults.eventName, { bubbles: true, composed: true, cancelable: true, detail }));
      this.showToast(this.toastMessage, this.toastDuration);
      return detail;
    }
    showToast(message = this.toastMessage, duration = this.toastDuration) {
      this.clearToastTimer();
      this._toastMessage = String(message || this.toastMessage);
      this._toastVisible = true;
      this.render();
      const normalizedDuration = parseDuration(duration);
      if (normalizedDuration > 0) this._toastTimer = window.setTimeout(() => this.hideToast(), normalizedDuration);
      this.dispatchEvent(new CustomEvent("uib-tour-toast-show", { bubbles: true, composed: true, detail: { action: this.defaults.action, message: this._toastMessage } }));
    }
    hideToast() {
      this.clearToastTimer();
      this._toastVisible = false;
      this.render();
    }
    clearToastTimer() {
      if (this._toastTimer) {
        window.clearTimeout(this._toastTimer);
        this._toastTimer = void 0;
      }
    }
    render() {
      const titleId = `${this.defaults.action}-title`;
      const descriptionId = `${this.defaults.action}-description`;
      const toastClass = this._toastVisible ? "uib-tour-toast uib-tour-toast--visible" : "uib-tour-toast";
      const toastText = this._toastMessage || this.toastMessage;
      this.shadowRoot.innerHTML = `<style> ` + styles23 + ` </style><section class="uib-tour-card uib-tour-card--` + escapeHtml5(this.variant) + `" part="card" aria-labelledby="` + titleId + `" aria-describedby="` + descriptionId + `"><div class="uib-tour-card__icon" part="icon" aria-hidden="true"> ` + escapeHtml5(this.defaults.icon) + ` </div><div class="uib-tour-card__content" part="content"><p class="uib-tour-card__eyebrow" part="eyebrow"> ` + escapeHtml5(this.eyebrow) + ` </p><h3 id="` + titleId + `" class="uib-tour-card__heading" part="heading"> ` + escapeHtml5(this.heading) + ` </h3><p id="` + descriptionId + `" class="uib-tour-card__description" part="description"> ` + escapeHtml5(this.description) + ` </p><div class="uib-tour-card__action-row" part="action-row"><button class="uib-tour-card__button" part="button" type="button" ` + (this.disabled ? "disabled" : "") + `> ` + escapeHtml5(this.actionLabel) + ` </button> ` + (this.disabled ? '<span class="uib-tour-card__disabled-note" part="disabled-note">Action disabled by parent state.</span>' : "") + ` </div></div><div class="` + toastClass + `" part="toast" role="alert" aria-live="assertive" ` + (this._toastVisible ? "" : "hidden") + `> ` + escapeHtml5(toastText) + ` </div></section>`;
      applyCssClassToRoot2(this);
      this.shadowRoot.querySelector("button")?.addEventListener("click", () => this.call({ trigger: "button" }));
    }
  };
  function registerTourElement(tagName, elementClass) {
    if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
      customElements.define(tagName, elementClass);
    }
    return elementClass;
  }

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/tour-ui/src/reservations/uib-new-reservation.js
  var UibNewReservation = class extends UibTourReservationBase {
    constructor() {
      super({
        action: "new-reservation",
        eventName: "uib-tour-new-reservation",
        variant: "new",
        icon: "+",
        eyebrow: "New reservation",
        heading: "New Reservation",
        description: "Start a new tour reservation and collect basic visit preferences.",
        actionLabel: "Start New Reservation",
        toastMessage: "New reservation component called."
      });
    }
  };
  registerTourElement("uib-new-reservation", UibNewReservation);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/tour-ui/src/reservations/uib-cancel-reservation.js
  var UibCancelReservation = class extends UibTourReservationBase {
    constructor() {
      super({
        action: "cancel-reservation",
        eventName: "uib-tour-cancel-reservation",
        variant: "cancel",
        icon: "X",
        eyebrow: "Cancel reservation",
        heading: "Cancel Reservation",
        description: "Look up an existing reservation and start a cancellation flow.",
        actionLabel: "Cancel Reservation",
        toastMessage: "Cancel reservation component called."
      });
    }
  };
  registerTourElement("uib-cancel-reservation", UibCancelReservation);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/tour-ui/src/reservations/uib-find-reservation.js
  var UibFindReservation = class extends UibTourReservationBase {
    constructor() {
      super({
        action: "find-reservation",
        eventName: "uib-tour-find-reservation",
        variant: "find",
        icon: "?",
        eyebrow: "Find reservation",
        heading: "Find Reservation",
        description: "Find an existing reservation by confirmation number and visitor email.",
        actionLabel: "Find Reservation",
        toastMessage: "Find reservation component called."
      });
    }
  };
  registerTourElement("uib-find-reservation", UibFindReservation);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/tour-ui/src/reservations/uib-book-group-reservation.js
  var UibBookGroupReservation = class extends UibTourReservationBase {
    constructor() {
      super({
        action: "book-group-reservation",
        eventName: "uib-tour-book-group-reservation",
        variant: "group",
        icon: "G",
        eyebrow: "Group reservation",
        heading: "Book Group Reservation",
        description: "Request a tour time for a larger group, school, or organization.",
        actionLabel: "Book Group Reservation",
        toastMessage: "Book group reservation component called."
      });
    }
  };
  registerTourElement("uib-book-group-reservation", UibBookGroupReservation);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-rich-text.js
  var styles24 = `
${formControlStyles}
.rich-text{display:grid;gap:.5rem}.toolbar{display:flex;flex-wrap:wrap;gap:.25rem;padding:.35rem;border:1px solid var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff)}.toolbar__group{display:flex;gap:.15rem;padding-inline-end:.35rem;border-inline-end:1px solid var(--uib-color-border,#d8e0eb)}.toolbar__group:last-child{padding:0;border:0}.tool{min-width:2.2rem;min-height:2.2rem;border:1px solid transparent;border-radius:.4rem;background:transparent;color:var(--uib-color-ink,#13294b);cursor:pointer;font:inherit;font-weight:750}.tool:hover{background:var(--uib-color-surface,#fff);border-color:var(--uib-color-border-strong,#aab8cc)}.tool:focus-visible,.editor:focus-visible,.source:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.tool[aria-pressed=true]{border-color:var(--uib-color-primary,#174a8b);background:color-mix(in srgb,var(--uib-color-primary,#174a8b) 13%,white);color:var(--uib-color-primary,#174a8b)}.block-select{min-height:2.2rem;border:1px solid transparent;border-radius:.4rem;background:transparent;color:inherit;font:inherit;cursor:pointer}.editor,.source,.preview{min-height:var(--uib-forms-rich-text-min-height,12rem);padding:var(--uib-forms-control-padding,.75rem);border:1px solid var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface,#fff);line-height:1.55}.editor[contenteditable=true]{cursor:text}.editor:empty::before{content:attr(data-placeholder);color:var(--uib-color-muted,#53657f);pointer-events:none}.source{width:100%;resize:vertical;font-family:var(--uib-font-family-mono,ui-monospace,SFMono-Regular,Consolas,monospace);font-size:.875rem}.mode-tabs{display:flex;gap:.2rem}.mode-tab{min-height:2.15rem;padding-inline:.8rem;border:1px solid var(--uib-color-border-strong,#aab8cc);background:var(--uib-color-surface,#fff);color:inherit;cursor:pointer;font:inherit}.mode-tab:first-child{border-radius:.45rem 0 0 .45rem}.mode-tab:last-child{border-radius:0 .45rem .45rem 0}.mode-tab[aria-selected=true]{background:var(--uib-color-primary,#174a8b);border-color:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}.preview{overflow:auto}.preview uib-rich-text{display:block}.error{color:var(--uib-color-danger,#b4232a);font-size:var(--uib-font-size-sm,.875rem)}:host([disabled]){opacity:.62}.toolbar[aria-disabled=true] .tool,.toolbar[aria-disabled=true] .block-select{cursor:not-allowed}@media(max-width:480px){.toolbar__group{padding-inline-end:.15rem}.tool{min-width:2rem}.block-select{max-width:7rem}}
`;
  var commands = [
    ["bold", "B", "Bold (Ctrl+B)", "bold"],
    ["italic", "I", "Italic (Ctrl+I)", "italic"],
    ["underline", "U", "Underline (Ctrl+U)", "underline"],
    ["unordered", "\u2022\u2261", "Bulleted list", "insertUnorderedList"],
    ["ordered", "1\u2261", "Numbered list", "insertOrderedList"],
    ["outdent", "\u21E4", "Outdent", "outdent"],
    ["indent", "\u21E5", "Indent", "indent"],
    ["link", "\u2197", "Add link", "link"],
    ["quote", "\u275D", "Block quote", "formatBlock:blockquote"],
    ["undo", "\u21B6", "Undo", "undo"],
    ["redo", "\u21B7", "Redo", "redo"]
  ];
  var UibFormsRichText = class extends UibFormControlBase {
    static inputType = "text";
    static defaultLabel = "Rich text";
    static get observedAttributes() {
      return [...super.observedAttributes, "mode"];
    }
    constructor() {
      super();
      this._mode = this.getAttribute("mode") || "visual";
      this._committedValue = this.value;
    }
    connectedCallback() {
      if (!this._initialized) {
        const sanitized = sanitizeRichTextHtml(this.getAttribute("value") || "", this.ownerDocument);
        this._value = sanitized;
        this._initialized = true;
        if (this.getAttribute("value") !== sanitized) {
          this._reflecting = true;
          this.setAttribute("value", sanitized);
          this._reflecting = false;
        }
      }
      super.connectedCallback();
      this._committedValue = this._value;
      this._updateFormValue();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === "value" && oldValue !== newValue && !this._reflecting) {
        const sanitized = sanitizeRichTextHtml(newValue, this.ownerDocument);
        if (sanitized !== (newValue || "")) {
          this._reflecting = true;
          this.setAttribute("value", sanitized);
          this._reflecting = false;
          newValue = sanitized;
        }
      }
      if (name === "mode" && oldValue !== newValue) this._mode = ["visual", "source", "preview"].includes(newValue) ? newValue : "visual";
      super.attributeChangedCallback(name, oldValue, newValue);
    }
    get value() {
      return super.value;
    }
    set value(value) {
      super.value = sanitizeRichTextHtml(value, this.ownerDocument);
    }
    get mode() {
      return this._mode;
    }
    set mode(value) {
      this.setAttribute("mode", ["visual", "source", "preview"].includes(value) ? value : "visual");
    }
    _setUserValue(value) {
      const oldValue = this.value;
      const newValue = sanitizeRichTextHtml(value, this.ownerDocument);
      this._value = newValue;
      this._reflecting = true;
      this.setAttribute("value", newValue);
      this._reflecting = false;
      this._updateFormValue();
      if (oldValue !== newValue) this.emitMtEvent("input", { name: this.name, oldValue, newValue });
      return newValue;
    }
    _commitValue() {
      if (this._committedValue === this.value) return;
      const oldValue = this._committedValue;
      this._committedValue = this.value;
      this.checkValidity();
      this.emitValueChange("uib-forms-rich-text-change", oldValue, this.value);
    }
    _editorInput(event) {
      const editor = event.currentTarget;
      const normalized = this._setUserValue(editor.innerHTML);
      if (editor.innerHTML !== normalized) editor.innerHTML = normalized;
    }
    _sourceInput(event) {
      const source = event.currentTarget;
      const normalized = this._setUserValue(source.value);
      if (source.value !== normalized) source.value = normalized;
    }
    _runCommand(command) {
      const editor = this.shadowRoot.querySelector("[data-editor]");
      if (!editor || this.disabled || this.readonly) return;
      editor.focus();
      if (command === "link") {
        const href = globalThis.prompt?.("Link URL");
        if (!href) return;
        this.ownerDocument.execCommand("createLink", false, href);
      } else if (command.startsWith("formatBlock:")) {
        this.ownerDocument.execCommand("formatBlock", false, command.slice("formatBlock:".length));
      } else {
        this.ownerDocument.execCommand(command, false);
      }
      this._setUserValue(editor.innerHTML);
    }
    _setBlock(event) {
      const editor = this.shadowRoot.querySelector("[data-editor]");
      if (!editor || this.disabled || this.readonly) return;
      editor.focus();
      this.ownerDocument.execCommand("formatBlock", false, event.currentTarget.value);
      this._setUserValue(editor.innerHTML);
    }
    _keyDown(event) {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      const shortcuts = { b: "bold", i: "italic", u: "underline" };
      if (!shortcuts[key]) return;
      event.preventDefault();
      this._runCommand(shortcuts[key]);
    }
    _modeMarkup() {
      return ["visual", "source", "preview"].map((mode) => `<button class="mode-tab" type="button" role="tab" aria-selected="${this.mode === mode}" data-mode="${mode}">${mode === "source" ? "HTML source" : mode[0].toUpperCase() + mode.slice(1)}</button>`).join("");
    }
    render() {
      const inputId = `${this.componentId}-editor`;
      const helpId = this.help ? `${this.componentId}-help` : "";
      const validation = this._validation();
      const shouldShowError = this.invalid || !validation.valid;
      const errorText = this.error || validation.message;
      const errorId = shouldShowError && errorText ? `${this.componentId}-error` : "";
      const describedBy = this.describedBy(helpId, errorId);
      const label = this.label || this.name || this.constructor.defaultLabel;
      const disabled = this.disabled || this.readonly;
      const toolbarButtons = (items2) => items2.map(([, icon, labelText, command]) => `<button class="tool" type="button" data-command="${command}" aria-label="${labelText}" title="${labelText}" ${disabled ? "disabled" : ""}>${icon}</button>`).join("");
      const toolbar = `<div class="toolbar" part="toolbar" aria-disabled="${disabled}"><span class="toolbar__group">${toolbarButtons(commands.slice(0, 3))}</span><span class="toolbar__group"><select class="block-select" data-block aria-label="Text style" ${disabled ? "disabled" : ""}><option value="p">Paragraph</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option></select></span><span class="toolbar__group">${toolbarButtons(commands.slice(3))}</span></div>`;
      this.shadowRoot.innerHTML = `<style>${styles24}</style><div class="uib-field rich-text" part="field"><span class="uib-field__label" part="label"><slot name="label"><uib-label for="${inputId}" text="${escapeHtml(label)}"></uib-label></slot>${this.required ? '<span class="uib-field__required" part="required" aria-hidden="true">*</span>' : ""}</span><div class="mode-tabs" role="tablist" aria-label="Rich text mode">${this._modeMarkup()}</div>${this.mode === "visual" ? `${toolbar}<div id="${inputId}" class="editor" part="control editor" data-editor contenteditable="${disabled ? "false" : "true"}" role="textbox" aria-multiline="true" aria-describedby="${escapeHtml(describedBy)}" data-placeholder="${escapeHtml(this.placeholder)}"></div>` : this.mode === "source" ? `<textarea id="${inputId}" class="source" part="control source" data-source aria-describedby="${escapeHtml(describedBy)}" ${disabled ? "disabled" : ""}></textarea>` : `<div class="preview" part="control preview"><uib-rich-text data-preview></uib-rich-text></div>`}${this.help ? `<span id="${helpId}" class="uib-field__help" part="help"><uib-help text="${escapeHtml(this.help)}" mode="${escapeHtml(this.helpMode || "tooltip")}"></uib-help></span>` : ""}${errorId ? `<div id="${errorId}" class="error" part="error">${escapeHtml(errorText)}</div>` : ""}</div>`;
      const editor = this.shadowRoot.querySelector("[data-editor]");
      const source = this.shadowRoot.querySelector("[data-source]");
      const preview = this.shadowRoot.querySelector("[data-preview]");
      if (editor) {
        editor.innerHTML = this.value;
        editor.addEventListener("input", (event) => this._editorInput(event));
        editor.addEventListener("blur", () => this._commitValue());
        editor.addEventListener("keydown", (event) => this._keyDown(event));
      }
      if (source) {
        source.value = this.value;
        source.addEventListener("input", (event) => this._sourceInput(event));
        source.addEventListener("blur", () => this._commitValue());
      }
      if (preview) preview.html = this.value;
      this.shadowRoot.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
        this._commitValue();
        this.mode = button.dataset.mode;
      }));
      this.shadowRoot.querySelectorAll("[data-command]").forEach((button) => {
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => this._runCommand(button.dataset.command));
      });
      this.shadowRoot.querySelector("[data-block]")?.addEventListener("change", (event) => this._setBlock(event));
    }
  };
  defineFormControl("uib-forms-rich-text", UibFormsRichText);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-select.js
  var UibFormsSelect = class extends UibFormControlBase {
    static inputType = "select";
    static controlKind = "select";
    static defaultLabel = "Select";
  };
  defineFormControl("uib-forms-select", UibFormsSelect);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/controls/uib-forms-checkbox.js
  var styles25 = `
:host{display:block}
uib-checkbox{display:block}
`;
  var UibFormsCheckbox = class extends UibBaseElement {
    static formAssociated = true;
    static get observedAttributes() {
      return [
        ...UibBaseElement.commonAttributes,
        "checked",
        "value",
        "hint"
      ];
    }
    constructor() {
      super();
      this._defaultChecked = null;
      this._internals = null;
      try {
        if (typeof this.attachInternals === "function") this._internals = this.attachInternals();
      } catch {
        this._internals = null;
      }
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      if (this._defaultChecked === null) this._defaultChecked = this.hasAttribute("checked");
      this._updateFormValue();
      this.render();
    }
    attributeChangedCallback() {
      if (this.isConnected) {
        this._updateFormValue();
        this.render();
      }
    }
    get checked() {
      return this.hasAttribute("checked");
    }
    set checked(value) {
      this.toggleAttribute("checked", Boolean(value));
    }
    get value() {
      return this.getAttribute("value") || "on";
    }
    set value(value) {
      if (value === null || value === void 0) this.removeAttribute("value");
      else this.setAttribute("value", String(value));
    }
    get hint() {
      return this.getAttribute("hint") || "";
    }
    set hint(value) {
      if (value === null || value === void 0) this.removeAttribute("hint");
      else this.setAttribute("hint", String(value));
    }
    formResetCallback() {
      this.checked = this._defaultChecked === true;
      this._updateFormValue();
      this.render();
    }
    _updateFormValue() {
      if (this._internals && typeof this._internals.setFormValue === "function") {
        this._internals.setFormValue(this.checked ? this.value : null);
      }
    }
    _validation() {
      if (this.required && !this.checked) {
        return {
          valid: false,
          message: this.error || `${this.label || this.name || "Checkbox"} is required.`
        };
      }
      return { valid: true, message: "" };
    }
    checkValidity() {
      const result = this._validation();
      this.invalid = !result.valid;
      if (!result.valid) this._emitCommonControlEvent("invalid", null, { validation: result });
      return result.valid;
    }
    _eventDetail(extra = {}) {
      return {
        name: this.name,
        checked: this.checked,
        value: this.checked ? this.value : "",
        ...extra
      };
    }
    _emitCommonControlEvent(type, sourceEvent = null, extra = {}) {
      this.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: sourceEvent?.cancelable ?? false,
        detail: this._eventDetail({ sourceEvent, ...extra })
      }));
    }
    _emitKeyboardEvent(type, event) {
      this.dispatchEvent(new KeyboardEvent(type, {
        key: event.key,
        code: event.code,
        location: event.location,
        repeat: event.repeat,
        isComposing: event.isComposing,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
        bubbles: true,
        composed: true,
        cancelable: event.cancelable
      }));
    }
    _syncFromUiCheckbox(event) {
      event.stopPropagation();
      const oldValue = this.checked;
      const newValue = Boolean(event.detail?.newValue ?? event.currentTarget.checked);
      if (oldValue !== newValue) this.checked = newValue;
      this._updateFormValue();
      return { oldValue, newValue };
    }
    _handleUiCheckboxChange(event) {
      const { oldValue, newValue } = this._syncFromUiCheckbox(event);
      this.checkValidity();
      const detail = this._eventDetail({ oldValue, newValue });
      this.emitMtEvent("input", detail);
      this.emitMtEvent("change", detail);
      this.emitMtEvent("uib-forms-checkbox-change", detail);
    }
    _bindUiCheckboxEvents(control) {
      if (!control) return;
      control.addEventListener("uib-checkbox-change", (event) => this._handleUiCheckboxChange(event));
      control.addEventListener("change", (event) => event.stopPropagation());
      control.addEventListener("focus", (event) => this._emitCommonControlEvent("focus", event));
      control.addEventListener("blur", (event) => this._emitCommonControlEvent("blur", event));
      control.addEventListener("focusin", (event) => this._emitCommonControlEvent("focusin", event));
      control.addEventListener("focusout", (event) => this._emitCommonControlEvent("focusout", event));
      control.addEventListener("keydown", (event) => this._emitKeyboardEvent("keydown", event));
      control.addEventListener("keyup", (event) => this._emitKeyboardEvent("keyup", event));
      control.addEventListener("invalid", (event) => this._emitCommonControlEvent("invalid", event));
    }
    render() {
      const validation = this._validation();
      const shouldShowError = this.invalid || !validation.valid;
      const errorText = this.error || validation.message;
      const label = this.label || this.textContent.trim() || this.name || "Checkbox";
      const ariaLabel = this.ariaLabel || "";
      const ariaDescribedBy = this.describedBy();
      this.shadowRoot.innerHTML = `<style>` + styles25 + `</style><uib-checkbox exportparts="field,input,content,label,required,hint,help,error" ` + (this.checked ? "checked" : "") + ` ` + (this.disabled ? "disabled" : "") + ` ` + (this.readonly ? "readonly" : "") + ` ` + (this.required ? "required" : "") + ` ` + (this.invalid || !validation.valid ? "invalid" : "") + ` label="` + escapeHtml(label) + `" help="` + escapeHtml(this.help) + `" help-mode="` + escapeHtml(this.helpMode || "tooltip") + `" hint="` + escapeHtml(this.hint) + `" error="` + (shouldShowError ? escapeHtml(errorText) : "") + `" ` + (ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : "") + ` ` + (ariaDescribedBy ? `aria-describedby="${escapeHtml(ariaDescribedBy)}"` : "") + ` ></uib-checkbox>`;
      this._bindUiCheckboxEvents(this.shadowRoot.querySelector("uib-checkbox"));
    }
  };
  defineUiBaseElement("uib-forms-checkbox", UibFormsCheckbox);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/display/uib-forms-display-field.js
  var styles26 = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.uib-forms-display-field{display:grid;gap:var(--uib-forms-display-field-gap,var(--uib-forms-field-gap,.35rem));max-width:100%}.uib-forms-display-field--horizontal,.uib-forms-display-field--auto{grid-template-columns:minmax(8rem,var(--uib-forms-display-field-label-width,12rem)) minmax(0,1fr);align-items:start;column-gap:var(--uib-forms-display-field-column-gap,var(--uib-space-4,1rem))}.uib-forms-display-field__label{display:inline-flex;align-items:center;gap:.35rem;color:var(--uib-color-ink,#13294b);font-weight:850;line-height:1.35}.uib-forms-display-field__value{min-width:0;color:var(--uib-color-ink,#13294b);font:inherit;line-height:1.45;overflow-wrap:anywhere;white-space:pre-wrap}.uib-forms-display-field__help{color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem);line-height:1.4}.uib-forms-display-field--horizontal .uib-forms-display-field__help,.uib-forms-display-field--auto .uib-forms-display-field__help{grid-column:2}@media (max-width:560px){.uib-forms-display-field--auto{grid-template-columns:1fr}.uib-forms-display-field--auto .uib-forms-display-field__help{grid-column:auto}}
`;
  function normalizedOrientation(value) {
    const orientation = String(value || "").trim().toLowerCase();
    return orientation === "horizontal" || orientation === "auto" ? orientation : "vertical";
  }
  function normalizedType(value) {
    const type = String(value || "").trim().toLowerCase();
    return type === "password" ? "password" : "text";
  }
  function maskedValue(value) {
    const text = String(value ?? "");
    return text ? "*".repeat(text.length) : "";
  }
  var UibFormsDisplayField = class extends UibBaseElement {
    static get observedAttributes() {
      return [
        ...UibBaseElement.commonAttributes,
        "value",
        "display-value",
        "orientation",
        "empty-value",
        "type"
      ];
    }
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
      this.render();
    }
    get value() {
      return this.getAttribute("value") || "";
    }
    set value(value) {
      if (value === null || value === void 0) this.removeAttribute("value");
      else this.setAttribute("value", String(value));
    }
    get displayValue() {
      return this.getAttribute("display-value") || "";
    }
    set displayValue(value) {
      if (value === null || value === void 0) this.removeAttribute("display-value");
      else this.setAttribute("display-value", String(value));
    }
    get orientation() {
      return normalizedOrientation(this.getAttribute("orientation"));
    }
    set orientation(value) {
      if (value === null || value === void 0) this.removeAttribute("orientation");
      else this.setAttribute("orientation", normalizedOrientation(value));
    }
    get emptyValue() {
      return this.getAttribute("empty-value") || "-";
    }
    set emptyValue(value) {
      if (value === null || value === void 0) this.removeAttribute("empty-value");
      else this.setAttribute("empty-value", String(value));
    }
    get type() {
      return normalizedType(this.getAttribute("type"));
    }
    set type(value) {
      if (value === null || value === void 0) this.removeAttribute("type");
      else this.setAttribute("type", normalizedType(value));
    }
    _formattedValue() {
      const value = this.displayValue || this.value;
      const formatted = this.type === "password" ? maskedValue(value) : value;
      return formatted || this.emptyValue;
    }
    render() {
      const label = this.label || this.name || "Field";
      const helpId = this.help ? `${this.componentId}-help` : "";
      const describedBy = this.describedBy(helpId);
      const orientation = this.orientation;
      const tooltipHelp = this.help && this.helpMode !== "inline" ? `<span id="` + helpId + `" class="uib-forms-display-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="tooltip"></uib-help></span>` : "";
      const help = this.help && this.helpMode === "inline" ? `<span id="` + helpId + `" class="uib-forms-display-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="inline"></uib-help></span>` : "";
      this.shadowRoot.innerHTML = `<style>` + styles26 + `</style><div class="uib-forms-display-field uib-forms-display-field--` + orientation + `" part="field" data-uib-css-class-root><span class="uib-forms-display-field__label" part="label"><slot name="label"><uib-label text="` + escapeHtml(label) + `"></uib-label></slot>` + tooltipHelp + `</span><span class="uib-forms-display-field__value" part="value" ` + (describedBy ? `aria-describedby="${escapeHtml(describedBy)}"` : "") + `>` + escapeHtml(this._formattedValue()) + `</span>` + help + `</div>`;
    }
  };
  defineUiBaseElement("uib-forms-display-field", UibFormsDisplayField);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/uib-recent-values-manager.js
  var styles27 = `
:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.manager{display:grid;gap:1rem}.header{display:grid;gap:.25rem}.header h2{margin:0;font-size:1.15rem;line-height:1.2}.header p,.empty{margin:0;color:var(--uib-color-muted,#53657f)}.groups{display:grid;gap:.75rem}.group{display:grid;gap:.65rem;padding:.85rem;border:1px solid var(--uib-color-border,#d8e1ee);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface,#fff)}.group-header{display:flex;gap:.75rem;align-items:start;justify-content:space-between}.group-title{min-width:0}.group-title h3{margin:0;font-size:1rem;line-height:1.25}.key{display:block;overflow:hidden;margin-top:.15rem;color:var(--uib-color-muted,#53657f);font-size:.82rem;text-overflow:ellipsis;white-space:nowrap}.values{display:grid;gap:.4rem;margin:0;padding:0;list-style:none}.value-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:center}.value{overflow:hidden;padding:.35rem .5rem;border-radius:var(--uib-radius-sm,.5rem);background:var(--uib-color-surface-muted,#f5f8fc);text-overflow:ellipsis;white-space:nowrap}.button{min-height:2rem;border:1px solid var(--uib-color-border-strong,#bdcbdd);border-radius:var(--uib-radius-sm,.5rem);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:750;cursor:pointer}.button:hover{border-color:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary,#174a8b)}.button:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.clear{padding-inline:.7rem}.delete{width:2rem;padding:0}@media (max-width:560px){.group-header,.value-row{grid-template-columns:1fr}.group-header{display:grid}.button.clear,.button.delete{width:100%}.button.delete{padding-inline:.7rem}}
`;
  var UibRecentValuesManager = class extends UibBaseElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._refresh = () => this.render();
    }
    connectedCallback() {
      this.render();
      window.addEventListener("storage", this._refresh);
      document.addEventListener("uib-recent-values-save", this._refresh);
      document.addEventListener("uib-recent-values-clear", this._refresh);
    }
    disconnectedCallback() {
      window.removeEventListener("storage", this._refresh);
      document.removeEventListener("uib-recent-values-save", this._refresh);
      document.removeEventListener("uib-recent-values-clear", this._refresh);
    }
    _emitClear(detail) {
      this.emitMtEvent("uib-recent-values-clear", detail);
    }
    _clearGroup(key) {
      if (!window.confirm(`Clear all recent values for ${key}?`)) return;
      clearRecentValues(key);
      this._emitClear({ key, value: null, values: [] });
      this.render();
    }
    _deleteValue(key, value) {
      const values = removeRecentValue(key, value);
      this._emitClear({ key, value, values });
      this.render();
    }
    render() {
      const groups = listRecentValueGroups();
      this.shadowRoot.innerHTML = `<style>` + styles27 + `</style><section class="manager" part="manager"><div class="header" part="header"><h2>Recent values</h2><p>Saved local input history from this browser.</p></div>` + (groups.length ? `<div class="groups" part="groups">` + groups.map((group) => `<article class="group" part="group" data-key="${escapeHtml(group.key)}"><div class="group-header"><div class="group-title"><h3>${escapeHtml(group.label || group.name || group.key)}</h3><code class="key">${escapeHtml(group.key)}</code></div><button class="button clear" type="button" data-clear-key="${escapeHtml(group.key)}">Clear all</button></div><ul class="values">` + group.values.map((value) => `<li class="value-row"><span class="value" title="${escapeHtml(value)}">${escapeHtml(value)}</span><button class="button delete" type="button" title="Delete value" aria-label="Delete ${escapeHtml(value)}" data-delete-key="${escapeHtml(group.key)}" data-delete-value="${escapeHtml(value)}">x</button></li>`).join("") + `</ul></article>`).join("") + `</div>` : `<p class="empty" part="empty">No recent values saved.</p>`) + `</section>`;
      this.shadowRoot.querySelectorAll("[data-clear-key]").forEach((button) => {
        button.addEventListener("click", () => this._clearGroup(button.dataset.clearKey));
      });
      this.shadowRoot.querySelectorAll("[data-delete-key]").forEach((button) => {
        button.addEventListener("click", () => this._deleteValue(button.dataset.deleteKey, button.dataset.deleteValue));
      });
    }
  };
  defineUiBaseElement("uib-recent-values-manager", UibRecentValuesManager);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/layout/uib-forms-field.js
  var styles28 = `
:host{display:block;font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui)}
.uib-forms-field{display:grid;gap:var(--uib-forms-field-gap,.35rem)}
.uib-forms-field__label{display:inline-flex;align-items:center;gap:.35rem;line-height:1.35}
`;
  var UibFormsField = class extends UibBaseElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.render();
    }
    render() {
      const label = this.label || "";
      const tooltipHelp = this.help && this.helpMode !== "inline" ? `<span class="uib-forms-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="tooltip"></uib-help></span>` : "";
      const help = this.help && this.helpMode === "inline" ? `<span class="uib-forms-field__help" part="help"><uib-help text="` + escapeHtml(this.help) + `" mode="inline"></uib-help></span>` : "";
      this.shadowRoot.innerHTML = `<style> ` + styles28 + ` </style><div class="uib-forms-field" part="field"><span class="uib-forms-field__label" part="label"><slot name="label"><uib-label text="` + escapeHtml(label) + `"></uib-label></slot> ` + tooltipHelp + ` </span><slot></slot>` + help + `</div>`;
    }
  };
  defineUiBaseElement("uib-forms-field", UibFormsField);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/layout/uib-forms-input-group.js
  var styles29 = `:host{display:block}.uib-forms-input-group{display:flex;flex-wrap:wrap;gap:var(--uib-space-2,.5rem);align-items:end}.uib-forms-input-group ::slotted(*){flex:1 1 var(--uib-forms-input-group-item-width,12rem)}`;
  var UibFormsInputGroup = class extends UibBaseElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.render();
    }
    render() {
      this.shadowRoot.innerHTML = `<style> ` + styles29 + ` </style><div class="uib-forms-input-group" part="group"><slot></slot></div>`;
    }
  };
  defineUiBaseElement("uib-forms-input-group", UibFormsInputGroup);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/layout/uib-forms-wizard.js
  var styles30 = `:host{display:block;font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui)}.uib-forms-wizard{display:grid;gap:var(--uib-space-4,1rem)}`;
  var UibFormsWizard = class extends UibBaseElement {
    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this.render();
    }
    render() {
      this.shadowRoot.innerHTML = `<style> ` + styles30 + ` </style><section class="uib-forms-wizard" part="wizard"><div class="uib-forms-wizard__title" part="title"><slot name="title"> ` + escapeHtml(this.label || "Wizard") + ` </slot></div><slot></slot><div class="uib-forms-wizard__note" part="note"> Experimental stub: step coordination, validation gates, and navigation will be implemented later. </div></section>`;
    }
  };
  defineUiBaseElement("uib-forms-wizard", UibFormsWizard);

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/forms/src/metadata.js
  var sharedFieldAttributes = [
    { name: "name", type: "string", description: "Form field name used in form serialization and event detail payloads." },
    { name: "label", type: "string", description: "Visible label text. A named label slot can override the rendered label content." },
    { name: "help", type: "string", description: "Optional helper text rendered below the control." },
    { name: "required", type: "boolean", description: "Marks the control as required during validation." },
    { name: "disabled", type: "boolean", description: "Disables the control and removes it from normal interaction." },
    { name: "readonly", type: "boolean", description: "Prevents user edits while keeping the value visible and form-associated." },
    { name: "invalid", type: "boolean", description: "Forces invalid visual styling on the control." },
    { name: "error", type: "string", description: "Custom validation message shown when the control is invalid." },
    { name: "value", type: "string", description: "Current string value reflected into the inner form control." },
    { name: "placeholder", type: "string", description: "Placeholder text shown when the control value is empty." },
    { name: "minlength", type: "number", description: "Minimum number of characters required for text validation." },
    { name: "maxlength", type: "number", description: "Maximum number of characters allowed for text validation." },
    { name: "pattern", type: "string", description: "Regular expression pattern the value must match." },
    { name: "autocomplete", type: "string", description: "Browser autocomplete hint passed to the native control." },
    { name: "recent-values", type: "boolean", description: "Enables localStorage-backed recent values for eligible single-line text inputs." },
    { name: "recent-values-limit", type: "number", description: "Maximum saved recent values. Defaults to 5; 0 or negative values disable the feature." },
    { name: "recent-values-key", type: "string", description: "Optional storage key suffix. Defaults to the field name." }
  ];
  var recentValueAttributeNames = ["recent-values", "recent-values-limit", "recent-values-key"];
  var sharedFieldProperties = [
    { name: "value", type: "string", description: "Gets or sets the current value and updates the associated form value." },
    { name: "name", type: "string", description: "Reflects the name attribute." },
    { name: "label", type: "string", description: "Reflects the label attribute." },
    { name: "disabled", type: "boolean", description: "Reflects the disabled state." },
    { name: "readonly", type: "boolean", description: "Reflects the readonly state." },
    { name: "required", type: "boolean", description: "Reflects the required state." },
    { name: "invalid", type: "boolean", description: "Reflects the invalid state." }
  ];
  var commonControlEvents = [
    { name: "input", description: "Bubbling event fired as the current value changes." },
    { name: "change", description: "Bubbling event fired when the committed value changes." },
    { name: "focus", description: "Bubbling host-level focus notification from the internal control." },
    { name: "blur", description: "Bubbling host-level blur notification from the internal control." },
    { name: "focusin", description: "Bubbling host-level focusin notification from the internal control." },
    { name: "focusout", description: "Bubbling host-level focusout notification from the internal control." },
    { name: "keydown", description: "KeyboardEvent re-dispatched from the host when the internal control receives keydown." },
    { name: "keyup", description: "KeyboardEvent re-dispatched from the host when the internal control receives keyup." },
    { name: "invalid", description: "Bubbling event fired when native or component validation fails." }
  ];
  var sharedFieldEvents = (tagName) => [
    ...commonControlEvents,
    { name: `${tagName}-change`, description: "Custom event fired when the committed value changes. Detail includes name, oldValue, and newValue." }
  ];
  var recentFieldEvents = (tagName) => [
    ...sharedFieldEvents(tagName),
    { name: "uib-recent-values-save", description: "Fires after a recent value is saved. Detail includes name, key, value, values, and limit." }
  ];
  var sharedFieldSlots = [
    { name: "label", description: "Optional custom label content." }
  ];
  var sharedFieldParts = [
    { name: "field", description: "Outer field wrapper." },
    { name: "label", description: "Label element." },
    { name: "required", description: "Required marker." },
    { name: "control", description: "Native input, textarea, or select control." },
    { name: "control-invalid", description: "Applied to the control when invalid." },
    { name: "control-disabled", description: "Applied to the control when disabled or readonly." },
    { name: "help", description: "Helper text." },
    { name: "error", description: "Validation error text." }
  ];
  var sharedFieldCssVariables = [
    { name: "--uib-forms-field-gap", description: "Gap between label, control, help, and error text." },
    { name: "--uib-size-control-height-md", description: "Minimum control height." },
    { name: "--uib-forms-control-padding", description: "Padding applied to native controls." },
    { name: "--uib-color-border-strong", description: "Default control border color." },
    { name: "--uib-color-primary", description: "Focus and primary accent color." },
    { name: "--uib-focus-ring", description: "Focus ring shadow used on keyboard focus." }
  ];
  function fieldApi(tagName, overrides = {}) {
    return {
      tagName,
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: sharedFieldAttributes,
      properties: sharedFieldProperties,
      events: sharedFieldEvents(tagName),
      slots: sharedFieldSlots,
      cssParts: sharedFieldParts,
      cssVariables: sharedFieldCssVariables,
      examples: [`<${tagName} name="fieldName" label="Field label"></${tagName}>`],
      ...overrides
    };
  }
  var FORM_COMPONENT_API = {
    "uib-forms-form": {
      tagName: "uib-forms-form",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.PREVIEW,
      attributes: [
        { name: "name", type: "string", description: "Form name included in submit event detail." },
        { name: "label", type: "string", description: "Accessible label for the internal form element." },
        { name: "submit-label", type: "string", description: "Text for the default submit button." },
        { name: "novalidate", type: "boolean", description: "Skips child component validation before submit event emission." },
        { name: "disabled", type: "boolean", description: "Common disabled state for styling and host-level integration." }
      ],
      properties: [
        { name: "name", type: "string", description: "Reflects the name attribute." },
        { name: "label", type: "string", description: "Reflects the label attribute." }
      ],
      events: [
        { name: "uib-forms-form-submit", description: "Custom submit event. Detail includes name, values, oldValue, newValue, and valid." }
      ],
      slots: [
        { name: "default", description: "Form controls or other form content." },
        { name: "actions", description: "Optional custom action area replacing the default submit button." }
      ],
      cssParts: [
        { name: "form", description: "Internal form element." },
        { name: "actions", description: "Action row wrapper." },
        { name: "submit", description: "Default submit button." }
      ],
      cssVariables: [
        { name: "--uib-forms-form-gap", description: "Gap between form children." },
        { name: "--uib-forms-button-padding", description: "Padding for the default submit button." },
        { name: "--uib-color-primary", description: "Default submit button background and border color." }
      ],
      examples: ['<uib-forms-form name="contact" submit-label="Send"><uib-forms-textbox name="fullName" label="Full name" required></uib-forms-textbox></uib-forms-form>']
    },
    "uib-forms-textbox": fieldApi("uib-forms-textbox", {
      events: recentFieldEvents("uib-forms-textbox"),
      examples: ['<uib-forms-textbox name="visitorName" label="Name" placeholder="Enter a name"></uib-forms-textbox>']
    }),
    "uib-forms-number": fieldApi("uib-forms-number", {
      attributes: [
        ...sharedFieldAttributes.filter((item2) => !["minlength", "maxlength", "pattern", ...recentValueAttributeNames].includes(item2.name)),
        { name: "min", type: "number", description: "Minimum numeric value." },
        { name: "max", type: "number", description: "Maximum numeric value." },
        { name: "step", type: "number", description: "Allowed numeric increment for the native number input." }
      ],
      examples: ['<uib-forms-number name="groupSize" label="Group size" min="1" max="30" step="1"></uib-forms-number>']
    }),
    "uib-forms-date": fieldApi("uib-forms-date", {
      attributes: [
        ...sharedFieldAttributes.filter((item2) => !["minlength", "maxlength", "pattern", "placeholder", ...recentValueAttributeNames].includes(item2.name)),
        { name: "min", type: "date", description: "Earliest selectable date in YYYY-MM-DD format." },
        { name: "max", type: "date", description: "Latest selectable date in YYYY-MM-DD format." },
        { name: "step", type: "number", description: "Allowed day increment for the native date input." }
      ],
      examples: ['<uib-forms-date name="visitDate" label="Visit date" min="2026-01-01"></uib-forms-date>']
    }),
    "uib-forms-email": fieldApi("uib-forms-email", {
      attributes: sharedFieldAttributes.filter((item2) => item2.name !== "pattern"),
      events: recentFieldEvents("uib-forms-email"),
      examples: ['<uib-forms-email name="email" label="Email" autocomplete="email"></uib-forms-email>']
    }),
    "uib-forms-password": fieldApi("uib-forms-password", {
      attributes: sharedFieldAttributes.filter((item2) => !["pattern", ...recentValueAttributeNames].includes(item2.name)),
      cssParts: [
        ...sharedFieldParts,
        { name: "control-wrap", description: "Password input and visibility toggle wrapper." },
        { name: "toggle", description: "Show or hide password button." }
      ],
      cssVariables: [
        ...sharedFieldCssVariables,
        { name: "--uib-forms-password-control-padding-end", description: "Inline-end input padding reserved for the visibility toggle." }
      ],
      examples: ['<uib-forms-password name="accessCode" label="Access code" autocomplete="current-password"></uib-forms-password>']
    }),
    "uib-forms-phone": fieldApi("uib-forms-phone", {
      attributes: sharedFieldAttributes.filter((item2) => !["minlength", "maxlength", "pattern"].includes(item2.name)),
      events: recentFieldEvents("uib-forms-phone"),
      examples: ['<uib-forms-phone name="phone" label="Phone" autocomplete="tel"></uib-forms-phone>']
    }),
    "uib-forms-textarea": fieldApi("uib-forms-textarea", {
      attributes: sharedFieldAttributes.filter((item2) => !["autocomplete", ...recentValueAttributeNames].includes(item2.name)),
      examples: ['<uib-forms-textarea name="notes" label="Notes" placeholder="Add notes"></uib-forms-textarea>']
    }),
    "uib-forms-rich-text": fieldApi("uib-forms-rich-text", {
      attributes: [
        ...sharedFieldAttributes.filter((item2) => !["autocomplete", "pattern", ...recentValueAttributeNames].includes(item2.name)),
        { name: "mode", type: "string", description: "Active editor mode: visual, source, or preview. Defaults to visual." }
      ],
      properties: [
        ...sharedFieldProperties,
        { name: "mode", type: "string", description: "Gets or sets the active visual, source, or preview mode." }
      ],
      events: sharedFieldEvents("uib-forms-rich-text"),
      cssParts: [
        ...sharedFieldParts,
        { name: "toolbar", description: "Visual-mode formatting toolbar." },
        { name: "editor", description: "Visual editable content surface." },
        { name: "source", description: "HTML source textarea." },
        { name: "preview", description: "Read-only uib-rich-text preview surface." }
      ],
      cssVariables: [
        ...sharedFieldCssVariables,
        { name: "--uib-forms-rich-text-min-height", description: "Minimum height of the editor, source, and preview surfaces." }
      ],
      examples: ['<uib-forms-rich-text name="description" label="Description" value="<p>Formatted content.</p>"></uib-forms-rich-text>']
    }),
    "uib-forms-select": fieldApi("uib-forms-select", {
      attributes: sharedFieldAttributes.filter((item2) => !["placeholder", "minlength", "maxlength", "pattern", "autocomplete", ...recentValueAttributeNames].includes(item2.name)).concat([
        { name: "options", type: "string", description: "Comma-separated option values rendered as native option elements." }
      ]),
      slots: [
        { name: "default", description: "Optional native option elements. Used after generated comma-separated options." },
        ...sharedFieldSlots
      ],
      examples: ['<uib-forms-select name="location" label="Location" options="Main Hall,Annex,Remote"></uib-forms-select>']
    }),
    "uib-forms-checkbox": {
      tagName: "uib-forms-checkbox",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [
        { name: "name", type: "string", description: "Form field name used in form serialization and event detail payloads." },
        { name: "label", type: "string", description: "Visible label text. Default slot content can also provide label text." },
        { name: "help", type: "string", description: "Optional helper text rendered below the checkbox label." },
        { name: "checked", type: "boolean", description: "Boolean checked state." },
        { name: "value", type: "string", description: 'Submitted value when checked. Defaults to "on".' },
        { name: "required", type: "boolean", description: "Requires the checkbox to be checked during validation." },
        { name: "disabled", type: "boolean", description: "Disables the checkbox." },
        { name: "readonly", type: "boolean", description: "Prevents edits by disabling the internal checkbox while keeping host state visible." },
        { name: "invalid", type: "boolean", description: "Forces invalid visual styling." },
        { name: "error", type: "string", description: "Custom validation message shown when invalid." }
      ],
      properties: [
        { name: "checked", type: "boolean", description: "Gets or sets the checked state." },
        { name: "value", type: "string", description: "Gets or sets the submitted value when checked." },
        { name: "name", type: "string", description: "Reflects the name attribute." },
        { name: "disabled", type: "boolean", description: "Reflects the disabled state." },
        { name: "readonly", type: "boolean", description: "Reflects the readonly state." },
        { name: "required", type: "boolean", description: "Reflects the required state." },
        { name: "invalid", type: "boolean", description: "Reflects the invalid state." }
      ],
      events: [
        ...commonControlEvents,
        { name: "uib-forms-checkbox-change", description: "Custom event fired when checked state changes. Detail includes name, checked, oldValue, newValue, and value." }
      ],
      slots: [
        { name: "default", description: "Optional custom label content." }
      ],
      cssParts: [
        { name: "field", description: "Outer label wrapper." },
        { name: "input", description: "Native checkbox input." },
        { name: "content", description: "Label, help, and error content wrapper." },
        { name: "label", description: "Visible label text." },
        { name: "required", description: "Required marker." },
        { name: "help", description: "Helper text." },
        { name: "error", description: "Validation error text." }
      ],
      cssVariables: [
        { name: "--uib-color-primary", description: "Checkbox accent color." },
        { name: "--uib-color-border-strong", description: "Default checkbox border color." },
        { name: "--uib-focus-ring", description: "Focus ring shadow used on keyboard focus." }
      ],
      examples: ['<uib-forms-checkbox name="confirmed" label="Confirmed" value="yes"></uib-forms-checkbox>']
    },
    "uib-forms-display-field": {
      tagName: "uib-forms-display-field",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [
        { name: "name", type: "string", description: "Optional field name for host-level integration and labeling fallback." },
        { name: "label", type: "string", description: "Visible label text. A named label slot can override the rendered label content." },
        { name: "value", type: "string", description: "Raw field value used when display-value is not provided." },
        { name: "display-value", type: "string", description: "Formatted value shown to users. Useful for select labels or preformatted values." },
        { name: "orientation", type: "string", description: "Layout direction for label and value. Supports vertical, horizontal, and auto. Defaults to vertical." },
        { name: "empty-value", type: "string", description: 'Fallback text shown when value and display-value are empty. Defaults to "-".' },
        { name: "type", type: "string", description: "Display treatment for the value. Use password to mask the rendered value." },
        { name: "help", type: "string", description: "Optional helper text rendered below the display value." }
      ],
      properties: [
        { name: "value", type: "string", description: "Gets or sets the raw value." },
        { name: "displayValue", type: "string", description: "Gets or sets the formatted display value." },
        { name: "orientation", type: "string", description: "Gets or sets vertical, horizontal, or auto layout." },
        { name: "emptyValue", type: "string", description: "Gets or sets the empty-value fallback." },
        { name: "type", type: "string", description: "Gets or sets the display treatment." }
      ],
      events: [],
      slots: [
        { name: "label", description: "Optional custom label content." }
      ],
      cssParts: [
        { name: "field", description: "Outer display field wrapper." },
        { name: "label", description: "Label element." },
        { name: "value", description: "Rendered display value." },
        { name: "help", description: "Helper text." }
      ],
      cssVariables: [
        { name: "--uib-forms-display-field-gap", description: "Gap between label, value, and help text." },
        { name: "--uib-forms-display-field-label-width", description: "Label column width in horizontal layout." },
        { name: "--uib-forms-display-field-column-gap", description: "Column gap in horizontal layout." }
      ],
      examples: ['<uib-forms-display-field label="Email" display-value="person@example.local"></uib-forms-display-field>']
    },
    "uib-recent-values-manager": {
      tagName: "uib-recent-values-manager",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [],
      properties: [],
      events: [
        { name: "uib-recent-values-clear", description: "Fires after a recent value is deleted or a key is cleared. Detail includes key, value, and values." }
      ],
      slots: [],
      cssParts: [
        { name: "manager", description: "Outer manager panel." },
        { name: "header", description: "Panel heading wrapper." },
        { name: "groups", description: "Recent-value group list." },
        { name: "group", description: "Single storage-key group." },
        { name: "empty", description: "Empty state text." }
      ],
      cssVariables: [
        { name: "--uib-color-border", description: "Group border color." },
        { name: "--uib-color-primary", description: "Button hover and focus accent color." },
        { name: "--uib-focus-ring", description: "Focus ring shadow used on keyboard focus." }
      ],
      examples: ["<uib-recent-values-manager></uib-recent-values-manager>"]
    },
    "uib-forms-field": {
      tagName: "uib-forms-field",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [
        { name: "label", type: "string", description: "Fallback label text when the label slot is not provided." },
        { name: "help", type: "string", description: "Optional helper text rendered after the slotted control." }
      ],
      properties: [
        { name: "label", type: "string", description: "Reflects the label attribute." },
        { name: "help", type: "string", description: "Reflects the help attribute." }
      ],
      events: [],
      slots: [
        { name: "default", description: "Native or custom control to wrap." },
        { name: "label", description: "Custom label content." }
      ],
      cssParts: [
        { name: "field", description: "Outer field wrapper." },
        { name: "label", description: "Label wrapper." },
        { name: "help", description: "Helper text." }
      ],
      cssVariables: [
        { name: "--uib-forms-field-gap", description: "Gap between label, control, and helper text." }
      ],
      examples: ['<uib-forms-field label="Wrapped field"><input value="Native input"></uib-forms-field>']
    },
    "uib-forms-input-group": {
      tagName: "uib-forms-input-group",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [],
      properties: [],
      events: [],
      slots: [
        { name: "default", description: "Related controls to lay out as a responsive group." }
      ],
      cssParts: [
        { name: "group", description: "Flex group wrapper." }
      ],
      cssVariables: [
        { name: "--uib-space-2", description: "Gap between grouped controls." },
        { name: "--uib-forms-input-group-item-width", description: "Preferred flex-basis for each slotted control." }
      ],
      examples: ['<uib-forms-input-group><uib-forms-textbox name="first" label="First"></uib-forms-textbox><uib-forms-textbox name="second" label="Second"></uib-forms-textbox></uib-forms-input-group>']
    },
    "uib-forms-wizard": {
      tagName: "uib-forms-wizard",
      package: "@ui-base/forms",
      maturity: MATURITY_LEVELS.EXPERIMENTAL,
      attributes: [
        { name: "label", type: "string", description: "Wizard title text when the title slot is not provided." }
      ],
      properties: [
        { name: "label", type: "string", description: "Reflects the label attribute." }
      ],
      events: [],
      slots: [
        { name: "default", description: "Wizard step content owned by the parent page." },
        { name: "title", description: "Custom wizard title content." }
      ],
      cssParts: [
        { name: "wizard", description: "Outer wizard shell." },
        { name: "title", description: "Wizard title wrapper." },
        { name: "note", description: "Experimental status note." }
      ],
      cssVariables: [
        { name: "--uib-space-4", description: "Gap and padding used by the wizard shell." }
      ],
      examples: ['<uib-forms-wizard label="Reservation steps"><p>Step content</p></uib-forms-wizard>']
    }
  };
  var UI_BASE_FORM_COMPONENTS = Object.values(FORM_COMPONENT_API).map((api2) => createComponentMetadata({
    ...api2,
    attributes: api2.attributes.map((item2) => item2.name),
    properties: api2.properties.map((item2) => item2.name),
    events: api2.events.map((item2) => item2.name),
    slots: api2.slots.map((item2) => item2.name),
    cssParts: api2.cssParts.map((item2) => item2.name),
    cssVariables: api2.cssVariables.map((item2) => item2.name)
  })).sort((a, b) => a.tagName.localeCompare(b.tagName));

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/platform/definition.js
  function copySerializable(value) {
    const seen = /* @__PURE__ */ new Set();
    const visit = (item2, path = "$") => {
      if (item2 === null || typeof item2 === "string" || typeof item2 === "boolean") return;
      if (typeof item2 === "number" && Number.isFinite(item2)) return;
      if (!item2 || typeof item2 !== "object") throw new TypeError(`${path} must contain JSON values only.`);
      if (seen.has(item2)) throw new TypeError(`${path} contains a cycle.`);
      if (!Array.isArray(item2) && Object.getPrototypeOf(item2) !== Object.prototype && Object.getPrototypeOf(item2) !== null) throw new TypeError(`${path} contains a runtime object.`);
      seen.add(item2);
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item2))) {
        if (Array.isArray(item2) && key === "length") continue;
        if (["__proto__", "constructor", "prototype"].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} is not a data field.`);
        visit(descriptor.value, `${path}.${key}`);
      }
      seen.delete(item2);
    };
    visit(value);
    return JSON.parse(JSON.stringify(value));
  }
  function freezeDefinition(value) {
    for (const child of Object.values(value)) if (child && typeof child === "object") freezeDefinition(child);
    return Object.freeze(value);
  }
  var isSettingVisible = (setting, values) => !setting.visibleWhen || values[setting.visibleWhen.setting] === setting.visibleWhen.equals;
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
      if (setting.format === "comma-options" && value && (value.split(",").some((item2) => !item2.trim()) || new Set(value.split(",").map((item2) => item2.trim())).size !== value.split(",").length)) errors.push(`${setting.label} requires distinct nonempty comma-separated values.`);
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/platform/registry.js
  var ComponentRegistry = class {
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

  // evidence/v1-stage1-20261104/browser-target/node_modules/@ui-base/ui/src/platform/renderer.js
  function renderComponentInstance(definition, instance, { registry, document: ownerDocument = document, preview = false, onEvent = () => {
  } } = {}) {
    if (definition.implementation.type !== "code") throw new Error("Composite rendering is outside this reference stage.");
    if (definition.implementation.runtimeBinding.kind !== "custom-element") throw new Error("Unsupported runtime binding.");
    const errors = validateSettings(definition, instance.settings, { registry, resolveHandlers: !preview });
    if (instance.componentId !== definition.identity.componentId) errors.push("Instance Component identity does not match its Definition.");
    const serviceRefs = copySerializable(instance.serviceRefs || {});
    const declaredServices = definition.dependencies.services || [];
    for (const name of Object.keys(serviceRefs)) if (!declaredServices.some((service) => service.name === name)) errors.push(`Unknown service reference: ${name}.`);
    for (const service of declaredServices) if (service.required && !serviceRefs[service.name]) errors.push(`Service reference is required: ${service.name}.`);
    if (errors.length) throw new Error(errors.join("\n"));
    const tag = definition.implementation.runtimeBinding.tagName;
    if (!ownerDocument.defaultView.customElements.get(tag)) throw new Error(`Runtime implementation is not registered: ${tag}.`);
    const element = ownerDocument.createElement(tag);
    const values = { ...defaultSettings(definition), ...instance.settings };
    for (const [name, setting] of Object.entries(definition.builder.settings)) {
      if (!isSettingVisible(setting, values) || setting.omitWhenUnset && !Object.hasOwn(instance.settings, name)) continue;
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
        const setting = Object.entries(definition.builder.settings).find(([, item2]) => item2.binding.kind === "event" && item2.binding.name === name);
        const handlerId = setting && values[setting[0]];
        if (handlerId && registry.handler(handlerId)(payload, { element, event }) === false && event.cancelable) event.preventDefault();
      });
    }
    if (preview) element.addEventListener("click", (event) => {
      if (event.composedPath().some((node) => node?.localName === "a")) event.preventDefault();
    }, { capture: true });
    return element;
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
    if (contract.enum && !contract.enum.some((item2) => JSON.stringify(item2) === JSON.stringify(value))) errors.push(`${label} is outside its allowed values.`);
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
      const value = values[key];
      if (contract.format === "comma-options" && typeof value === "string" && value && (value.split(",").some((item2) => !item2.trim()) || new Set(value.split(",").map((item2) => item2.trim())).size !== value.split(",").length)) errors.push(`${key} requires distinct nonempty comma-separated values.`);
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

  // packages/visual-artifacts/src/revision-guard.ts
  var managed = /* @__PURE__ */ new WeakMap();
  var managedIds = /* @__PURE__ */ new Set();
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

  // ../UI Platform Data Services/packages/dataset-operations/dist/declarative-expression.js
  var deny = () => {
    throw new Error("EXPRESSION_INVALID");
  };
  var unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
  var exact = (x, keys) => Object.keys(x).length === keys.length && keys.every((k) => Object.hasOwn(x, k));
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
  function evaluateDeclarative(declaration, values) {
    const types = new Map(expressionDependencies(declaration).map((id) => {
      if (!Object.hasOwn(values, id))
        throw new Error("EXPRESSION_DEPENDENCY_UNAVAILABLE");
      return [id, typeof values[id]];
    }));
    expressionType(declaration, types);
    const evaluate = (node) => {
      if (node.kind === "literal")
        return node.value;
      if (node.kind === "field") {
        const v = values[node.fieldId];
        if (typeof v === "number" && !Number.isFinite(v))
          return deny();
        return v;
      }
      if (node.operator === "if")
        return evaluate(node.args[0]) ? evaluate(node.args[1]) : evaluate(node.args[2]);
      const [a, b] = node.args.map(evaluate);
      if (node.operator === "not")
        return !a;
      if (node.operator === "and")
        return Boolean(a && b);
      if (node.operator === "or")
        return Boolean(a || b);
      if (node.operator === "eq")
        return a === b;
      if (node.operator === "concat")
        return a + b;
      if (node.operator === "lt")
        return a < b;
      if (node.operator === "gt")
        return a > b;
      const result = node.operator === "add" ? a + b : node.operator === "subtract" ? a - b : node.operator === "multiply" ? a * b : a / b;
      if (!Number.isFinite(result))
        throw new Error("EXPRESSION_RESULT_INVALID");
      return result;
    };
    return evaluate(declaration.expression);
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
  function calculateFields(calculations, fields, row) {
    const values = /* @__PURE__ */ Object.create(null);
    for (const field of fields)
      if (Object.hasOwn(row, field.key))
        values[field.fieldId] = row[field.key];
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
      if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expression))
        throw new Error(`Expected a named-source path: ${expression}`);
      let value = scope;
      for (const part of expression.split(".")) {
        if (unsafe.has(part))
          throw new Error("Unsafe binding path.");
        value = value != null && Object.hasOwn(Object(value), part) ? value[part] : void 0;
      }
      return value;
    }
    if ("version" in expression)
      return evaluateDeclarative(expression, scope.fields ?? {});
    if ("literal" in expression)
      return structuredClone(expression.literal);
    const args = expression.args.map((arg) => evaluatePresentation(arg, scope));
    if (expression.op === "not")
      return !args[0];
    if (expression.op === "eq")
      return args[0] === args[1];
    if (expression.op === "and")
      return args.every(Boolean);
    if (expression.op === "or")
      return args.some(Boolean);
    return deny();
  }

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

  // packages/visual-artifacts/src/validation.ts
  function validateArtifact(artifact, components = [], packages2 = [], services = []) {
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
        if (packages2.some((pkg) => pkg.id === m.componentId) || components.filter((c) => c.metadata.componentId === m.componentId).length > 1) error(`Duplicate Component identity: ${m.componentId}.`);
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
        const pkg = packages2.filter((p) => p.id === id);
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
          const api2 = nested[0].metadata.public;
          for (const key of Object.keys(settings)) if (!Object.hasOwn(api2.properties, key)) error(`Unknown public property: ${key}.`, node.id);
          for (const [key, contract] of Object.entries(api2.properties)) {
            if (!(m.bindings ?? []).some((b) => b.node === node.id && b.target === `property:${key}`)) for (const message of valueErrors(settings[key] ?? contract.default, contract, key)) error(message, node.id);
          }
          for (const child of node.children) if (!api2.slots.includes(child.attributes.slot ?? "")) error(`Unknown public slot: ${child.attributes.slot}.`, node.id);
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
        const pkg = packages2.find((p) => p.id === node?.attributes["data-uip-component"]);
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
      const action = (item2) => {
        if (item2.kind === "set") {
          if (!Object.hasOwn(m.state ?? {}, item2.state)) error(`Unknown local state: ${item2.state}.`);
          expression(item2.value);
        } else if (item2.kind === "emit") {
          const contract = m.public?.events[item2.event];
          if (!contract) error(`Undeclared public event: ${item2.event}.`);
          else {
            for (const [key, field] of Object.entries(contract.payload)) if (field.required && !Object.hasOwn(item2.payload ?? {}, key)) error(`Public event ${item2.event} requires payload field ${key}.`);
            for (const key of Object.keys(item2.payload ?? {})) if (!Object.hasOwn(contract.payload, key)) error(`Unknown public event payload field: ${key}.`);
          }
          Object.values(item2.payload ?? {}).forEach(expression);
        } else if (item2.kind === "navigate") expression(item2.to);
        else if (item2.kind === "service") {
          if (!services.includes(item2.reference)) warning(`Service reference is supported but has no executable adapter: ${item2.reference}.`);
          if (item2.input) expression(item2.input);
        } else if (item2.kind === "workflow") {
          if (!item2.workflowId || typeof item2.workflowId !== "string") error("Permanent Workflow identity is required.");
          expression(item2.primaryRecordId);
          if (item2.resultState && !Object.hasOwn(m.state ?? {}, item2.resultState)) error("Workflow result state must be declared.");
        } else if (item2.kind === "record-delete") {
          if (item2.version !== 1 || !item2.datasetId || typeof item2.datasetId !== "string" || !item2.primaryFieldId || typeof item2.primaryFieldId !== "string" || Object.keys(item2).some((key) => !["kind", "version", "datasetId", "primaryFieldId", "recordId", "resultState"].includes(key))) error("Invalid versioned single-record delete declaration.");
          expression(item2.recordId);
          if (typeof item2.resultState !== "string" || !item2.resultState || !m.state || typeof m.state !== "object" || Array.isArray(m.state) || !Object.hasOwn(m.state, item2.resultState)) error("Record delete result state must be explicitly declared.");
        } else if (item2.kind !== "function") error("Unknown action kind.");
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
      for (const id of m.dependencies ?? []) if (!components.some((c) => c.metadata.componentId === id) && !packages2.some((p) => p.id === id) && !services.includes(id) && !workflowIds.includes(id)) error(`Unknown dependency: ${id}.`);
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

  // packages/visual-artifacts/src/runtime.ts
  var styles31 = /* @__PURE__ */ new Set(["width", "height", "margin", "padding", "display", "gridTemplateColumns", "gridColumn", "gap", "alignItems", "justifyContent", "flexDirection", "flex"]);
  function layoutCss(layout) {
    const rule = (id, values) => `[data-uip-node="${id}"]{${Object.entries(values ?? {}).map(([key, value]) => {
      if (!styles31.has(key) || /[{};<>]/.test(String(value))) throw new Error("Unsupported declarative layout value. Use local CSS for advanced rules.");
      return `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`;
    }).join(";")}}`;
    return Object.entries(layout ?? {}).map(([id, item2]) => rule(id, item2.base) + `@media(max-width:1023px){${rule(id, item2.tablet)}}@media(max-width:639px){${rule(id, item2.mobile)}}`).join("\n");
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
      if (!link || link.getRootNode() !== root || link.target && link.target !== "_self" || link.hasAttribute("download")) return;
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
      if (!fragmentsEnabled || !href?.startsWith("#")) return;
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
    const pageLinksEnabled = (m.kind === "page" || m.kind === "shell") && options.pageFragmentNavigation === true;
    if (pageLinksEnabled) root.addEventListener("click", fragmentClick);
    if (fragmentsEnabled) {
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
    const actions = async (items2, current, event) => {
      try {
        for (const item2 of items2) {
          if (disposed) return;
          if (item2.kind === "set") {
            if (!Object.hasOwn(state, item2.state)) throw new Error(`Unknown local state: ${item2.state}.`);
            state[item2.state] = evaluatePresentation(item2.value, current);
          } else if (item2.kind === "emit") emit(item2.event, Object.fromEntries(Object.entries(item2.payload ?? {}).map(([key, value]) => [key, evaluatePresentation(value, current)])));
          else if (item2.kind === "navigate") {
            if (!options.navigate) throw new Error("No navigation adapter.");
            options.navigate(String(evaluatePresentation(item2.to, current)));
          } else if (item2.kind === "service") {
            const service = options.services?.[item2.reference];
            if (!service) throw new Error(`Service reference has no executable adapter: ${item2.reference}.`);
            await service(item2.input ? evaluatePresentation(item2.input, current) : void 0);
          } else if (item2.kind === "record-delete") {
            const service = options.services?.["dataset.deleteRecord"];
            if (!service) {
              state[item2.resultState] = { success: false, committed: false, commitOutcome: "not-committed", code: "RECORD_DELETE_UNAVAILABLE" };
              repaint();
              return;
            }
            let recordId;
            try {
              recordId = evaluatePresentation(item2.recordId, current);
            } catch {
              state[item2.resultState] = { success: false, committed: false, commitOutcome: "not-committed", code: "RECORD_TARGET_EVALUATION_FAILED" };
              repaint();
              return;
            }
            try {
              const result = await service({ kind: item2.kind, version: item2.version, datasetId: item2.datasetId, primaryFieldId: item2.primaryFieldId, recordId });
              if (!disposed) state[item2.resultState] = result;
            } catch (cause) {
              const rejected = cause && typeof cause === "object" && "commitOutcome" in cause && cause.commitOutcome === "not-committed";
              if (!disposed) state[item2.resultState] = { success: false, committed: false, commitOutcome: rejected ? "not-committed" : "unknown", message: cause instanceof Error ? cause.message : String(cause) };
            }
          } else if (item2.kind === "workflow") {
            if (item2.resultState && !Object.hasOwn(state, item2.resultState)) throw new Error("Unknown Workflow result state.");
            const service = options.services?.["workflow.run"];
            if (!service) {
              if (item2.resultState) state[item2.resultState] = { success: false, error: "WORKFLOW_UNAVAILABLE", commitOutcome: "not-committed" };
              else throw new Error("Workflow adapter is unavailable.");
            } else {
              let primaryRecordId;
              try {
                primaryRecordId = evaluatePresentation(item2.primaryRecordId, current);
              } catch {
                if (item2.resultState) state[item2.resultState] = { success: false, error: "WORKFLOW_TARGET_INVALID", commitOutcome: "not-committed" };
                repaint();
                return;
              }
              try {
                const result = await service({ workflowId: item2.workflowId, primaryRecordId });
                if (!disposed && item2.resultState) state[item2.resultState] = result;
              } catch (cause) {
                if (!item2.resultState) throw cause;
                if (!disposed) state[item2.resultState] = { success: false, error: cause instanceof Error ? cause.message : "WORKFLOW_OUTCOME_UNKNOWN", commitOutcome: cause instanceof Error && (cause.message === "WORKFLOW_REQUEST_DENIED" || cause.commitOutcome === "not-committed") ? "not-committed" : "unknown" };
              }
            }
          } else if (item2.kind === "function") {
            const fn = artifact.functions?.[item2.name];
            if (!fn) throw new Error(`Unknown custom function: ${item2.name}.`);
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
        if (element.localName === "img" && options.assetUrl) element.addEventListener("error", () => {
          if (!disposed) report(new Error(`Image could not load or decode: ${element.getAttribute("src") ?? "(missing source)"}`));
        }, { once: true });
        const regionId = element.getAttribute("data-uip-region");
        if (regionId && Object.hasOwn(options.regions ?? {}, regionId)) {
          const key = `region/${regionId}`;
          used.add(key);
          let instance = nested.get(key);
          if (!instance) {
            instance = mountVisualArtifact(options.regions[regionId], { ...options, inputs: options.regionInputs, regionInputs: void 0, regions: void 0, sharedScope: options.regionScope, regionScope: void 0 });
            nested.set(key, instance);
          }
          element.replaceChildren(instance.host);
        } else for (const child of [...element.children]) child.replaceWith(...process(child, current, prefix));
        if (element.localName === "uip-slot") {
          const slot = document.createElement("slot");
          slot.name = element.getAttribute("name") ?? "";
          if (element.hasAttribute("slot")) slot.slot = element.getAttribute("slot");
          slot.append(...element.childNodes);
          return [slot];
        }
        const componentId = element.getAttribute("data-uip-component");
        let output = element;
        if (componentId) {
          const component = options.components.find((c) => c.metadata.componentId === componentId);
          if (component) {
            const key = `${prefix}/${id}`;
            used.add(key);
            let instance = nested.get(key);
            if (!instance) {
              instance = mountVisualArtifact(component, { ...options, inputs: publicInputs, slots: [...element.childNodes], sources: void 0, presentationCss: void 0, regions: void 0, sharedScope: void 0, regionScope: void 0 });
              nested.set(key, instance);
            } else {
              instance.update(publicInputs);
              instance.host.replaceChildren(...element.childNodes);
            }
            output = instance.host;
            if (element.hasAttribute("slot")) output.slot = element.getAttribute("slot");
            output.dataset.uipNode = id;
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
              output = renderComponentInstance(pkg.definition, { componentId, settings }, { registry, document, preview: false });
              const ownedAttributes = new Set(Object.values(pkg.definition.builder.settings).filter((s) => s.binding?.kind === "attribute").map((s) => s.binding.name));
              for (const attr of element.attributes) if (!ownedAttributes.has(attr.name) && !["data-uip-settings", "data-uip-component"].includes(attr.name)) output.setAttribute(attr.name, attr.value);
              output.append(...element.childNodes);
            } else {
              for (const [key, value] of Object.entries(settings)) {
                if (typeof value === "boolean") output.toggleAttribute(key, value);
                else if (typeof value === "object") output[key] = value;
                else output.setAttribute(key, String(value));
              }
            }
            for (const binding of bindings.filter((b) => b.target.startsWith("property:"))) output[binding.target.slice(9)] = evaluatePresentation(binding.value, current);
          }
        }
        for (const binding of m.events?.filter((e) => e.node === id) ?? []) {
          const listener = (event) => {
            if (event.defaultPrevented) return;
            if (event.target !== output && componentId) return;
            void actions(binding.actions, { ...current, event: { detail: event.detail } }, event);
          };
          output.addEventListener(binding.event, listener);
          boundEvents.set(output, [...boundEvents.get(output) ?? [], { name: binding.event, listener }]);
        }
        return [output];
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
      for (const [key, instance] of nested) if (!used.has(key)) {
        instance.destroy();
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
      nested.forEach((instance) => instance.destroy());
      nested.clear();
      for (const [element, bindings] of boundEvents) for (const binding of bindings) element.removeEventListener(binding.name, binding.listener);
      boundEvents.clear();
      host.remove();
    } };
  }

  // <stdin>
  var packages = [{ "tagName": "uib-card", "module": "./src/layout/uib-card.js", "importPath": "./card", "presentation": { "settings": { "variant": { "type": "select", "options": ["elevated", "outlined", "flat"], "inheritable": true }, "density": { "type": "select", "options": ["comfortable", "compact"], "inheritable": true } }, "parts": ["base", "media", "header", "body", "footer"], "cssVariables": ["--uib-color-ink", "--uib-font-family-sans", "--uib-color-border", "--uib-radius-lg", "--uib-color-surface", "--uib-color-surface-soft", "--uib-shadow-sm", "--uib-space-3", "--uib-space-4", "--uib-focus-ring", "--uib-color-primary"] }, "schemaVersion": "1.0.0", "identity": { "componentId": "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1", "name": "card", "displayName": "Card", "description": "Repeatable content surface with optional link, action and selection behavior." }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-card", "module": "./src/layout/uib-card.js", "importPath": "@ui-base/ui/card", "exportName": "UibCard", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-card" }, "aliases": [{ "importPath": "@ui-base/ui", "exportName": "UibCard" }, { "importPath": "@ui-base/ui/layout", "exportName": "UibCard" }], "registrationSideEffects": ["uib-stack", "uib-grid", "uib-row", "uib-column", "uib-panel", "uib-card", "uib-dialog", "uib-accordion", "uib-tab", "uib-tab-panel", "uib-tabs", "uib-splitter", "uib-icon"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help-mode": { "type": "string", "default": "tooltip", "observed": true, "serialization": "string" }, "title": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "hidden": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "invalid": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "error": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "css-class": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "aria-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "aria-describedby": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "heading": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "variant": { "type": "string", "default": "elevated", "observed": true, "serialization": "string", "enum": ["elevated", "outlined", "flat"] }, "density": { "type": "string", "default": "comfortable", "observed": true, "serialization": "string", "enum": ["comfortable", "compact"] }, "href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "target": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "rel": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "interactive": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "selectable": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "selected": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": { "name": { "type": "string", "attribute": "name", "writable": true, "default": "" }, "label": { "type": "string", "attribute": "label", "writable": true, "default": "" }, "help": { "type": "string", "attribute": "help", "writable": true, "default": "" }, "helpMode": { "type": "string", "attribute": "help-mode", "writable": true, "default": "tooltip" }, "titleText": { "type": "string", "attribute": "title", "writable": true, "default": "" }, "disabled": { "type": "boolean", "attribute": "disabled", "writable": true, "default": false }, "readonly": { "type": "boolean", "attribute": "readonly", "writable": true, "default": false }, "required": { "type": "boolean", "attribute": "required", "writable": true, "default": false }, "hidden": { "type": "boolean", "attribute": "hidden", "writable": true, "default": false }, "invalid": { "type": "boolean", "attribute": "invalid", "writable": true, "default": false }, "error": { "type": "string", "attribute": "error", "writable": true, "default": "" }, "cssClass": { "type": "string", "attribute": "css-class", "writable": true, "default": "" }, "ariaLabel": { "type": "string", "attribute": "aria-label", "writable": false, "default": "" }, "ariaDescribedBy": { "type": "string", "attribute": "aria-describedby", "writable": false, "default": "" }, "heading": { "type": "string", "attribute": "heading", "writable": false, "default": "", "fallback": "label" }, "variant": { "type": "string", "attribute": "variant", "writable": false, "default": "elevated", "normalization": "lowercase-or-default" }, "density": { "type": "string", "attribute": "density", "writable": false, "default": "comfortable", "normalization": "exact-compact-or-default" }, "href": { "type": "string", "attribute": "href", "writable": false, "default": "" }, "target": { "type": "string", "attribute": "target", "writable": false, "default": "" }, "rel": { "type": "string", "attribute": "rel", "writable": false, "default": "" }, "action": { "type": "string", "attribute": "action", "writable": false, "default": "" }, "actionToken": { "type": "string", "attribute": "action-token", "writable": false, "default": "" }, "interactive": { "type": "boolean", "attribute": "interactive", "writable": false, "default": false, "computedFrom": ["interactive", "href", "action", "action-token", "selectable"] }, "selectable": { "type": "boolean", "attribute": "selectable", "writable": false, "default": false }, "selected": { "type": "boolean", "attribute": "selected", "writable": true, "default": false, "programmaticSetEmits": false }, "componentId": { "type": "string", "writable": false, "role": "runtime-instance-id" } }, "events": { "change": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": false, "selectionAliasOf": "uib-card-select", "order": 1 }, "uib-card-select": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": false, "order": 2 }, "uib-card-action": { "detail": { "name": "string", "action": "string", "actionToken": "string", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": true, "order": 3, "cancellation": "prevent-original-event-default-after-selection" } }, "slots": [{ "name": "default", "content": "text-or-elements" }, { "name": "media", "content": "text-or-elements" }, { "name": "header", "content": "text-or-elements" }, { "name": "footer", "content": "text-or-elements" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "heading": { "label": "Heading", "type": "string", "group": "content", "default": "", "binding": { "kind": "attribute", "name": "heading" } }, "label": { "label": "Fallback label", "type": "string", "group": "content", "default": "", "binding": { "kind": "attribute", "name": "label" } }, "body": { "label": "Body", "type": "string", "group": "content", "default": "Card body", "binding": { "kind": "slot", "name": "default", "content": "text" }, "editor": "textarea" }, "header": { "label": "Header content", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "header", "content": "text" } }, "footer": { "label": "Footer", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "footer", "content": "text" } }, "mediaSrc": { "label": "Image URL", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "media", "content": "image", "altSetting": "mediaAlt" }, "format": "image-url" }, "mediaAlt": { "label": "Image description", "type": "string", "group": "content", "default": "", "binding": { "kind": "slotMetadata", "slot": "media", "name": "alt" } }, "variant": { "label": "Variant", "type": "string", "group": "appearance", "default": "elevated", "binding": { "kind": "attribute", "name": "variant" }, "editor": "select", "enum": ["elevated", "outlined", "flat"] }, "density": { "label": "Density", "type": "string", "group": "appearance", "default": "comfortable", "binding": { "kind": "attribute", "name": "density" }, "editor": "select", "enum": ["comfortable", "compact"] }, "cssClass": { "label": "CSS classes", "type": "string", "group": "appearance", "default": "", "binding": { "kind": "attribute", "name": "css-class" } }, "interactionMode": { "label": "Interaction mode", "type": "string", "group": "interaction", "default": "none", "binding": { "kind": "mode" }, "editor": "select", "enum": ["none", "link", "action", "selectable"] }, "href": { "label": "Link URL", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "href" }, "format": "url", "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "target": { "label": "Link target", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "target" }, "editor": "select", "enum": ["", "_self", "_blank", "_parent", "_top"], "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "rel": { "label": "Link relationship", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "rel" }, "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "action": { "label": "Action", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "action" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "actionToken": { "label": "Action token", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "action-token" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "selected": { "label": "Initially selected", "type": "boolean", "group": "state", "default": false, "binding": { "kind": "attribute", "name": "selected" }, "visibleWhen": { "setting": "interactionMode", "equals": "selectable" } }, "disabled": { "label": "Disabled", "type": "boolean", "group": "state", "default": false, "binding": { "kind": "attribute", "name": "disabled" } }, "name": { "label": "Event name", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "name" } }, "ariaLabel": { "label": "Accessible name", "type": "string", "group": "accessibility", "default": "", "binding": { "kind": "attribute", "name": "aria-label" } }, "ariaDescribedBy": { "label": "Description IDs", "type": "string", "group": "accessibility", "default": "", "binding": { "kind": "attribute", "name": "aria-describedby" } }, "actionHandler": { "label": "Action handler ID", "type": "string", "group": "events", "default": "", "binding": { "kind": "event", "name": "uib-card-action" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "selectionHandler": { "label": "Selection handler ID", "type": "string", "group": "events", "default": "", "binding": { "kind": "event", "name": "uib-card-select" }, "visibleWhen": { "setting": "interactionMode", "equals": "selectable" } } }, "interactionModes": { "none": { "attributes": { "interactive": false, "selectable": false } }, "link": { "attributes": { "interactive": false, "selectable": false } }, "action": { "attributes": { "interactive": true, "selectable": false } }, "selectable": { "attributes": { "interactive": false, "selectable": true } } }, "validation": [{ "kind": "requiredWhen", "setting": "href", "when": { "setting": "interactionMode", "equals": "link" } }, { "kind": "oneOfRequiredWhen", "settings": ["action", "actionToken"], "when": { "setting": "interactionMode", "equals": "action" } }, { "kind": "accessibleNameWhenInteractive", "settings": ["heading", "label", "header", "ariaLabel"] }], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [{ "packageId": "@ui-base/core", "range": "^0.1.0" }, { "packageId": "@ui-base/icons", "range": "^0.1.0" }], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1", "definition": { "tagName": "uib-card", "module": "./src/layout/uib-card.js", "importPath": "./card", "presentation": { "settings": { "variant": { "type": "select", "options": ["elevated", "outlined", "flat"], "inheritable": true }, "density": { "type": "select", "options": ["comfortable", "compact"], "inheritable": true } }, "parts": ["base", "media", "header", "body", "footer"], "cssVariables": ["--uib-color-ink", "--uib-font-family-sans", "--uib-color-border", "--uib-radius-lg", "--uib-color-surface", "--uib-color-surface-soft", "--uib-shadow-sm", "--uib-space-3", "--uib-space-4", "--uib-focus-ring", "--uib-color-primary"] }, "schemaVersion": "1.0.0", "identity": { "componentId": "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1", "name": "card", "displayName": "Card", "description": "Repeatable content surface with optional link, action and selection behavior." }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-card", "module": "./src/layout/uib-card.js", "importPath": "@ui-base/ui/card", "exportName": "UibCard", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-card" }, "aliases": [{ "importPath": "@ui-base/ui", "exportName": "UibCard" }, { "importPath": "@ui-base/ui/layout", "exportName": "UibCard" }], "registrationSideEffects": ["uib-stack", "uib-grid", "uib-row", "uib-column", "uib-panel", "uib-card", "uib-dialog", "uib-accordion", "uib-tab", "uib-tab-panel", "uib-tabs", "uib-splitter", "uib-icon"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help-mode": { "type": "string", "default": "tooltip", "observed": true, "serialization": "string" }, "title": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "hidden": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "invalid": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "error": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "css-class": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "aria-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "aria-describedby": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "heading": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "variant": { "type": "string", "default": "elevated", "observed": true, "serialization": "string", "enum": ["elevated", "outlined", "flat"] }, "density": { "type": "string", "default": "comfortable", "observed": true, "serialization": "string", "enum": ["comfortable", "compact"] }, "href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "target": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "rel": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "interactive": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "selectable": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "selected": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": { "name": { "type": "string", "attribute": "name", "writable": true, "default": "" }, "label": { "type": "string", "attribute": "label", "writable": true, "default": "" }, "help": { "type": "string", "attribute": "help", "writable": true, "default": "" }, "helpMode": { "type": "string", "attribute": "help-mode", "writable": true, "default": "tooltip" }, "titleText": { "type": "string", "attribute": "title", "writable": true, "default": "" }, "disabled": { "type": "boolean", "attribute": "disabled", "writable": true, "default": false }, "readonly": { "type": "boolean", "attribute": "readonly", "writable": true, "default": false }, "required": { "type": "boolean", "attribute": "required", "writable": true, "default": false }, "hidden": { "type": "boolean", "attribute": "hidden", "writable": true, "default": false }, "invalid": { "type": "boolean", "attribute": "invalid", "writable": true, "default": false }, "error": { "type": "string", "attribute": "error", "writable": true, "default": "" }, "cssClass": { "type": "string", "attribute": "css-class", "writable": true, "default": "" }, "ariaLabel": { "type": "string", "attribute": "aria-label", "writable": false, "default": "" }, "ariaDescribedBy": { "type": "string", "attribute": "aria-describedby", "writable": false, "default": "" }, "heading": { "type": "string", "attribute": "heading", "writable": false, "default": "", "fallback": "label" }, "variant": { "type": "string", "attribute": "variant", "writable": false, "default": "elevated", "normalization": "lowercase-or-default" }, "density": { "type": "string", "attribute": "density", "writable": false, "default": "comfortable", "normalization": "exact-compact-or-default" }, "href": { "type": "string", "attribute": "href", "writable": false, "default": "" }, "target": { "type": "string", "attribute": "target", "writable": false, "default": "" }, "rel": { "type": "string", "attribute": "rel", "writable": false, "default": "" }, "action": { "type": "string", "attribute": "action", "writable": false, "default": "" }, "actionToken": { "type": "string", "attribute": "action-token", "writable": false, "default": "" }, "interactive": { "type": "boolean", "attribute": "interactive", "writable": false, "default": false, "computedFrom": ["interactive", "href", "action", "action-token", "selectable"] }, "selectable": { "type": "boolean", "attribute": "selectable", "writable": false, "default": false }, "selected": { "type": "boolean", "attribute": "selected", "writable": true, "default": false, "programmaticSetEmits": false }, "componentId": { "type": "string", "writable": false, "role": "runtime-instance-id" } }, "events": { "change": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": false, "selectionAliasOf": "uib-card-select", "order": 1 }, "uib-card-select": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": false, "order": 2 }, "uib-card-action": { "detail": { "name": "string", "action": "string", "actionToken": "string", "selected": "boolean" }, "bubbles": true, "composed": true, "cancelable": true, "order": 3, "cancellation": "prevent-original-event-default-after-selection" } }, "slots": [{ "name": "default", "content": "text-or-elements" }, { "name": "media", "content": "text-or-elements" }, { "name": "header", "content": "text-or-elements" }, { "name": "footer", "content": "text-or-elements" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "heading": { "label": "Heading", "type": "string", "group": "content", "default": "", "binding": { "kind": "attribute", "name": "heading" } }, "label": { "label": "Fallback label", "type": "string", "group": "content", "default": "", "binding": { "kind": "attribute", "name": "label" } }, "body": { "label": "Body", "type": "string", "group": "content", "default": "Card body", "binding": { "kind": "slot", "name": "default", "content": "text" }, "editor": "textarea" }, "header": { "label": "Header content", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "header", "content": "text" } }, "footer": { "label": "Footer", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "footer", "content": "text" } }, "mediaSrc": { "label": "Image URL", "type": "string", "group": "content", "default": "", "binding": { "kind": "slot", "name": "media", "content": "image", "altSetting": "mediaAlt" }, "format": "image-url" }, "mediaAlt": { "label": "Image description", "type": "string", "group": "content", "default": "", "binding": { "kind": "slotMetadata", "slot": "media", "name": "alt" } }, "variant": { "label": "Variant", "type": "string", "group": "appearance", "default": "elevated", "binding": { "kind": "attribute", "name": "variant" }, "editor": "select", "enum": ["elevated", "outlined", "flat"] }, "density": { "label": "Density", "type": "string", "group": "appearance", "default": "comfortable", "binding": { "kind": "attribute", "name": "density" }, "editor": "select", "enum": ["comfortable", "compact"] }, "cssClass": { "label": "CSS classes", "type": "string", "group": "appearance", "default": "", "binding": { "kind": "attribute", "name": "css-class" } }, "interactionMode": { "label": "Interaction mode", "type": "string", "group": "interaction", "default": "none", "binding": { "kind": "mode" }, "editor": "select", "enum": ["none", "link", "action", "selectable"] }, "href": { "label": "Link URL", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "href" }, "format": "url", "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "target": { "label": "Link target", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "target" }, "editor": "select", "enum": ["", "_self", "_blank", "_parent", "_top"], "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "rel": { "label": "Link relationship", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "rel" }, "visibleWhen": { "setting": "interactionMode", "equals": "link" } }, "action": { "label": "Action", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "action" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "actionToken": { "label": "Action token", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "action-token" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "selected": { "label": "Initially selected", "type": "boolean", "group": "state", "default": false, "binding": { "kind": "attribute", "name": "selected" }, "visibleWhen": { "setting": "interactionMode", "equals": "selectable" } }, "disabled": { "label": "Disabled", "type": "boolean", "group": "state", "default": false, "binding": { "kind": "attribute", "name": "disabled" } }, "name": { "label": "Event name", "type": "string", "group": "interaction", "default": "", "binding": { "kind": "attribute", "name": "name" } }, "ariaLabel": { "label": "Accessible name", "type": "string", "group": "accessibility", "default": "", "binding": { "kind": "attribute", "name": "aria-label" } }, "ariaDescribedBy": { "label": "Description IDs", "type": "string", "group": "accessibility", "default": "", "binding": { "kind": "attribute", "name": "aria-describedby" } }, "actionHandler": { "label": "Action handler ID", "type": "string", "group": "events", "default": "", "binding": { "kind": "event", "name": "uib-card-action" }, "visibleWhen": { "setting": "interactionMode", "equals": "action" } }, "selectionHandler": { "label": "Selection handler ID", "type": "string", "group": "events", "default": "", "binding": { "kind": "event", "name": "uib-card-select" }, "visibleWhen": { "setting": "interactionMode", "equals": "selectable" } } }, "interactionModes": { "none": { "attributes": { "interactive": false, "selectable": false } }, "link": { "attributes": { "interactive": false, "selectable": false } }, "action": { "attributes": { "interactive": true, "selectable": false } }, "selectable": { "attributes": { "interactive": false, "selectable": true } } }, "validation": [{ "kind": "requiredWhen", "setting": "href", "when": { "setting": "interactionMode", "equals": "link" } }, { "kind": "oneOfRequiredWhen", "settings": ["action", "actionToken"], "when": { "setting": "interactionMode", "equals": "action" } }, { "kind": "accessibleNameWhenInteractive", "settings": ["heading", "label", "header", "ariaLabel"] }], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [{ "packageId": "@ui-base/core", "range": "^0.1.0" }, { "packageId": "@ui-base/icons", "range": "^0.1.0" }], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-panel", "module": "./src/layout/uib-panel.js", "importPath": "./panel", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/ui:uib-panel", "name": "uib-panel", "displayName": "uib-panel", "description": "Metadata-admitted uib-panel" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-panel", "module": "./src/layout/uib-panel.js", "importPath": "@ui-base/ui/panel", "exportName": "UibPanel", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-panel" }, "aliases": [], "registrationSideEffects": ["uib-panel"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "heading": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "variant": { "type": "string", "default": "outlined", "observed": true, "serialization": "string" }, "density": { "type": "string", "default": "comfortable", "observed": true, "serialization": "string" }, "collapsible": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "open": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-panel-toggle": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }, { "name": "header" }, { "name": "actions" }, { "name": "footer" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "heading": { "type": "string", "default": "", "label": "heading", "group": "content", "binding": { "kind": "attribute", "name": "heading" } }, "variant": { "type": "string", "default": "outlined", "label": "variant", "group": "content", "binding": { "kind": "attribute", "name": "variant" }, "enum": ["elevated", "outlined", "flat"] }, "density": { "type": "string", "default": "comfortable", "label": "density", "group": "content", "binding": { "kind": "attribute", "name": "density" }, "enum": ["comfortable", "compact"] }, "collapsible": { "type": "boolean", "default": false, "label": "collapsible", "group": "content", "binding": { "kind": "attribute", "name": "collapsible" } }, "open": { "type": "boolean", "default": false, "label": "open", "group": "content", "binding": { "kind": "attribute", "name": "open" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/ui:uib-panel", "definition": { "tagName": "uib-panel", "module": "./src/layout/uib-panel.js", "importPath": "./panel", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/ui:uib-panel", "name": "uib-panel", "displayName": "uib-panel", "description": "Metadata-admitted uib-panel" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-panel", "module": "./src/layout/uib-panel.js", "importPath": "@ui-base/ui/panel", "exportName": "UibPanel", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-panel" }, "aliases": [], "registrationSideEffects": ["uib-panel"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "heading": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "variant": { "type": "string", "default": "outlined", "observed": true, "serialization": "string" }, "density": { "type": "string", "default": "comfortable", "observed": true, "serialization": "string" }, "collapsible": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "open": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-panel-toggle": { "detail": { "name": "string", "oldValue": "boolean", "newValue": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }, { "name": "header" }, { "name": "actions" }, { "name": "footer" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "heading": { "type": "string", "default": "", "label": "heading", "group": "content", "binding": { "kind": "attribute", "name": "heading" } }, "variant": { "type": "string", "default": "outlined", "label": "variant", "group": "content", "binding": { "kind": "attribute", "name": "variant" }, "enum": ["elevated", "outlined", "flat"] }, "density": { "type": "string", "default": "comfortable", "label": "density", "group": "content", "binding": { "kind": "attribute", "name": "density" }, "enum": ["comfortable", "compact"] }, "collapsible": { "type": "boolean", "default": false, "label": "collapsible", "group": "content", "binding": { "kind": "attribute", "name": "collapsible" } }, "open": { "type": "boolean", "default": false, "label": "open", "group": "content", "binding": { "kind": "attribute", "name": "open" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-action-button", "module": "./src/actions/uib-action-button.js", "importPath": "./action-button", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/ui:uib-action-button", "name": "uib-action-button", "displayName": "uib-action-button", "description": "Metadata-admitted uib-action-button" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-action-button", "module": "./src/actions/uib-action-button.js", "importPath": "@ui-base/ui/action-button", "exportName": "UibActionButton", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-action-button" }, "aliases": [], "registrationSideEffects": ["uib-action-button"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "target": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "rel": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "variant": { "type": "string", "default": "secondary", "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-action-button-click": { "detail": { "action": "string", "actionToken": "string", "href": "string", "disabled": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "href": { "type": "string", "default": "", "label": "href", "group": "content", "binding": { "kind": "attribute", "name": "href" } }, "action": { "type": "string", "default": "", "label": "action", "group": "content", "binding": { "kind": "attribute", "name": "action" } }, "action-token": { "type": "string", "default": "", "label": "action-token", "group": "content", "binding": { "kind": "attribute", "name": "action-token" } }, "target": { "type": "string", "default": "", "label": "target", "group": "content", "binding": { "kind": "attribute", "name": "target" }, "enum": ["", "_self", "_blank"] }, "rel": { "type": "string", "default": "", "label": "rel", "group": "content", "binding": { "kind": "attribute", "name": "rel" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "variant": { "type": "string", "default": "secondary", "label": "variant", "group": "content", "binding": { "kind": "attribute", "name": "variant" }, "enum": ["primary", "secondary", "tertiary", "destructive"] } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/ui:uib-action-button", "definition": { "tagName": "uib-action-button", "module": "./src/actions/uib-action-button.js", "importPath": "./action-button", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/ui:uib-action-button", "name": "uib-action-button", "displayName": "uib-action-button", "description": "Metadata-admitted uib-action-button" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/ui", "scope": "platform", "version": "0.5.2" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-action-button", "module": "./src/actions/uib-action-button.js", "importPath": "@ui-base/ui/action-button", "exportName": "UibActionButton", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-action-button" }, "aliases": [], "registrationSideEffects": ["uib-action-button"] }, "version": { "packageVersion": "0.5.2", "runtimeCompatibility": "^0.5.2", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "target": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "rel": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "variant": { "type": "string", "default": "secondary", "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-action-button-click": { "detail": { "action": "string", "actionToken": "string", "href": "string", "disabled": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "href": { "type": "string", "default": "", "label": "href", "group": "content", "binding": { "kind": "attribute", "name": "href" } }, "action": { "type": "string", "default": "", "label": "action", "group": "content", "binding": { "kind": "attribute", "name": "action" } }, "action-token": { "type": "string", "default": "", "label": "action-token", "group": "content", "binding": { "kind": "attribute", "name": "action-token" } }, "target": { "type": "string", "default": "", "label": "target", "group": "content", "binding": { "kind": "attribute", "name": "target" }, "enum": ["", "_self", "_blank"] }, "rel": { "type": "string", "default": "", "label": "rel", "group": "content", "binding": { "kind": "attribute", "name": "rel" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "variant": { "type": "string", "default": "secondary", "label": "variant", "group": "content", "binding": { "kind": "attribute", "name": "variant" }, "enum": ["primary", "secondary", "tertiary", "destructive"] } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-form", "module": "./src/uib-forms-form.js", "importPath": "./form", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-form", "name": "uib-forms-form", "displayName": "uib-forms-form", "description": "Metadata-admitted uib-forms-form" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-form", "module": "./src/uib-forms-form.js", "importPath": "@ui-base/forms/form", "exportName": "UibFormsForm", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-form" }, "aliases": [], "registrationSideEffects": ["uib-forms-form"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "submit-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-forms-form-submit": { "detail": { "name": "string", "valid": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }, { "name": "actions" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "submit-label": { "type": "string", "default": "", "label": "submit-label", "group": "content", "binding": { "kind": "attribute", "name": "submit-label" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-form", "definition": { "tagName": "uib-forms-form", "module": "./src/uib-forms-form.js", "importPath": "./form", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-form", "name": "uib-forms-form", "displayName": "uib-forms-form", "description": "Metadata-admitted uib-forms-form" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-form", "module": "./src/uib-forms-form.js", "importPath": "@ui-base/forms/form", "exportName": "UibFormsForm", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-form" }, "aliases": [], "registrationSideEffects": ["uib-forms-form"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "submit-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-forms-form-submit": { "detail": { "name": "string", "valid": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }, { "name": "actions" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "submit-label": { "type": "string", "default": "", "label": "submit-label", "group": "content", "binding": { "kind": "attribute", "name": "submit-label" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-textbox", "module": "./src/controls/uib-forms-textbox.js", "importPath": "./textbox", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-textbox", "name": "uib-forms-textbox", "displayName": "uib-forms-textbox", "description": "Metadata-admitted uib-forms-textbox" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-textbox", "module": "./src/controls/uib-forms-textbox.js", "importPath": "@ui-base/forms/textbox", "exportName": "UibFormsTextbox", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-textbox" }, "aliases": [], "registrationSideEffects": ["uib-forms-textbox"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "placeholder": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "pattern": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "minlength": { "type": "number", "default": 0, "observed": true, "serialization": "string" }, "maxlength": { "type": "number", "default": 0, "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-textbox-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "placeholder": { "type": "string", "default": "", "label": "placeholder", "group": "content", "binding": { "kind": "attribute", "name": "placeholder" } }, "pattern": { "type": "string", "default": "", "label": "pattern", "group": "content", "binding": { "kind": "attribute", "name": "pattern" } }, "minlength": { "type": "number", "default": 0, "label": "minlength", "group": "content", "binding": { "kind": "attribute", "name": "minlength" }, "omitWhenUnset": true }, "maxlength": { "type": "number", "default": 0, "label": "maxlength", "group": "content", "binding": { "kind": "attribute", "name": "maxlength" }, "omitWhenUnset": true } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-textbox", "definition": { "tagName": "uib-forms-textbox", "module": "./src/controls/uib-forms-textbox.js", "importPath": "./textbox", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-textbox", "name": "uib-forms-textbox", "displayName": "uib-forms-textbox", "description": "Metadata-admitted uib-forms-textbox" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-textbox", "module": "./src/controls/uib-forms-textbox.js", "importPath": "@ui-base/forms/textbox", "exportName": "UibFormsTextbox", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-textbox" }, "aliases": [], "registrationSideEffects": ["uib-forms-textbox"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "placeholder": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "pattern": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "minlength": { "type": "number", "default": 0, "observed": true, "serialization": "string" }, "maxlength": { "type": "number", "default": 0, "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-textbox-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "placeholder": { "type": "string", "default": "", "label": "placeholder", "group": "content", "binding": { "kind": "attribute", "name": "placeholder" } }, "pattern": { "type": "string", "default": "", "label": "pattern", "group": "content", "binding": { "kind": "attribute", "name": "pattern" } }, "minlength": { "type": "number", "default": 0, "label": "minlength", "group": "content", "binding": { "kind": "attribute", "name": "minlength" }, "omitWhenUnset": true }, "maxlength": { "type": "number", "default": 0, "label": "maxlength", "group": "content", "binding": { "kind": "attribute", "name": "maxlength" }, "omitWhenUnset": true } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-number", "module": "./src/controls/uib-forms-number.js", "importPath": "./number", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-number", "name": "uib-forms-number", "displayName": "uib-forms-number", "description": "Metadata-admitted uib-forms-number" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-number", "module": "./src/controls/uib-forms-number.js", "importPath": "@ui-base/forms/number", "exportName": "UibFormsNumber", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-number" }, "aliases": [], "registrationSideEffects": ["uib-forms-number"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "min": { "type": "number", "default": 0, "observed": true, "serialization": "string" }, "max": { "type": "number", "default": 100, "observed": true, "serialization": "string" }, "step": { "type": "number", "default": 1, "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-number-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "min": { "type": "number", "default": 0, "label": "min", "group": "content", "binding": { "kind": "attribute", "name": "min" }, "omitWhenUnset": true }, "max": { "type": "number", "default": 100, "label": "max", "group": "content", "binding": { "kind": "attribute", "name": "max" }, "omitWhenUnset": true }, "step": { "type": "number", "default": 1, "label": "step", "group": "content", "binding": { "kind": "attribute", "name": "step" }, "omitWhenUnset": true } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-number", "definition": { "tagName": "uib-forms-number", "module": "./src/controls/uib-forms-number.js", "importPath": "./number", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-number", "name": "uib-forms-number", "displayName": "uib-forms-number", "description": "Metadata-admitted uib-forms-number" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-number", "module": "./src/controls/uib-forms-number.js", "importPath": "@ui-base/forms/number", "exportName": "UibFormsNumber", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-number" }, "aliases": [], "registrationSideEffects": ["uib-forms-number"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "min": { "type": "number", "default": 0, "observed": true, "serialization": "string" }, "max": { "type": "number", "default": 100, "observed": true, "serialization": "string" }, "step": { "type": "number", "default": 1, "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-number-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "min": { "type": "number", "default": 0, "label": "min", "group": "content", "binding": { "kind": "attribute", "name": "min" }, "omitWhenUnset": true }, "max": { "type": "number", "default": 100, "label": "max", "group": "content", "binding": { "kind": "attribute", "name": "max" }, "omitWhenUnset": true }, "step": { "type": "number", "default": 1, "label": "step", "group": "content", "binding": { "kind": "attribute", "name": "step" }, "omitWhenUnset": true } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-checkbox", "module": "./src/controls/uib-forms-checkbox.js", "importPath": "./checkbox", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-checkbox", "name": "uib-forms-checkbox", "displayName": "uib-forms-checkbox", "description": "Metadata-admitted uib-forms-checkbox" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-checkbox", "module": "./src/controls/uib-forms-checkbox.js", "importPath": "@ui-base/forms/checkbox", "exportName": "UibFormsCheckbox", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-checkbox" }, "aliases": [], "registrationSideEffects": ["uib-forms-checkbox"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "checked": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-forms-checkbox-change": { "detail": { "name": "string", "checked": "boolean", "value": "string", "oldValue": "boolean", "newValue": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "checked": { "type": "boolean", "default": false, "label": "checked", "group": "content", "binding": { "kind": "attribute", "name": "checked" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-checkbox", "definition": { "tagName": "uib-forms-checkbox", "module": "./src/controls/uib-forms-checkbox.js", "importPath": "./checkbox", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-checkbox", "name": "uib-forms-checkbox", "displayName": "uib-forms-checkbox", "description": "Metadata-admitted uib-forms-checkbox" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-checkbox", "module": "./src/controls/uib-forms-checkbox.js", "importPath": "@ui-base/forms/checkbox", "exportName": "UibFormsCheckbox", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-checkbox" }, "aliases": [], "registrationSideEffects": ["uib-forms-checkbox"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "checked": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-forms-checkbox-change": { "detail": { "name": "string", "checked": "boolean", "value": "string", "oldValue": "boolean", "newValue": "boolean" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "checked": { "type": "boolean", "default": false, "label": "checked", "group": "content", "binding": { "kind": "attribute", "name": "checked" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-display-field", "module": "./src/display/uib-forms-display-field.js", "importPath": "./display-field", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-display-field", "name": "uib-forms-display-field", "displayName": "uib-forms-display-field", "description": "Metadata-admitted uib-forms-display-field" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-display-field", "module": "./src/display/uib-forms-display-field.js", "importPath": "@ui-base/forms/display-field", "exportName": "UibFormsDisplayField", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-display-field" }, "aliases": [], "registrationSideEffects": ["uib-forms-display-field"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "display-value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "empty-value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "orientation": { "type": "string", "default": "vertical", "observed": true, "serialization": "string" } }, "properties": {}, "events": {}, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "display-value": { "type": "string", "default": "", "label": "display-value", "group": "content", "binding": { "kind": "attribute", "name": "display-value" } }, "empty-value": { "type": "string", "default": "", "label": "empty-value", "group": "content", "binding": { "kind": "attribute", "name": "empty-value" } }, "orientation": { "type": "string", "default": "vertical", "label": "orientation", "group": "content", "binding": { "kind": "attribute", "name": "orientation" }, "enum": ["vertical", "horizontal", "auto"] } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-display-field", "definition": { "tagName": "uib-forms-display-field", "module": "./src/display/uib-forms-display-field.js", "importPath": "./display-field", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-display-field", "name": "uib-forms-display-field", "displayName": "uib-forms-display-field", "description": "Metadata-admitted uib-forms-display-field" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-display-field", "module": "./src/display/uib-forms-display-field.js", "importPath": "@ui-base/forms/display-field", "exportName": "UibFormsDisplayField", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-display-field" }, "aliases": [], "registrationSideEffects": ["uib-forms-display-field"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "display-value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "empty-value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "orientation": { "type": "string", "default": "vertical", "observed": true, "serialization": "string" } }, "properties": {}, "events": {}, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "display-value": { "type": "string", "default": "", "label": "display-value", "group": "content", "binding": { "kind": "attribute", "name": "display-value" } }, "empty-value": { "type": "string", "default": "", "label": "empty-value", "group": "content", "binding": { "kind": "attribute", "name": "empty-value" } }, "orientation": { "type": "string", "default": "vertical", "label": "orientation", "group": "content", "binding": { "kind": "attribute", "name": "orientation" }, "enum": ["vertical", "horizontal", "auto"] } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-forms-select", "module": "./src/controls/uib-forms-select.js", "importPath": "./select", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-select", "name": "uib-forms-select", "displayName": "uib-forms-select", "description": "Metadata-admitted uib-forms-select" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-select", "module": "./src/controls/uib-forms-select.js", "importPath": "@ui-base/forms/select", "exportName": "UibFormsSelect", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-select" }, "aliases": [], "registrationSideEffects": ["uib-forms-select"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "options": { "type": "string", "default": "", "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-select-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "options": { "type": "string", "default": "", "label": "options", "group": "content", "binding": { "kind": "attribute", "name": "options" }, "format": "comma-options" } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/forms:uib-forms-select", "definition": { "tagName": "uib-forms-select", "module": "./src/controls/uib-forms-select.js", "importPath": "./select", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/forms:uib-forms-select", "name": "uib-forms-select", "displayName": "uib-forms-select", "description": "Metadata-admitted uib-forms-select" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/forms", "scope": "platform", "version": "0.1.1" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-forms-select", "module": "./src/controls/uib-forms-select.js", "importPath": "@ui-base/forms/select", "exportName": "UibFormsSelect", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-forms-select" }, "aliases": [], "registrationSideEffects": ["uib-forms-select"] }, "version": { "packageVersion": "0.1.1", "runtimeCompatibility": "^0.1.1", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "name": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "help": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "value": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "required": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "readonly": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "options": { "type": "string", "default": "", "observed": true, "serialization": "string" } }, "properties": {}, "events": { "uib-forms-select-change": { "detail": { "name": "string", "oldValue": "string", "newValue": "string" }, "bubbles": true, "composed": true, "cancelable": false } }, "slots": [{ "name": "default" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "name": { "type": "string", "default": "", "label": "name", "group": "content", "binding": { "kind": "attribute", "name": "name" } }, "label": { "type": "string", "default": "", "label": "label", "group": "content", "binding": { "kind": "attribute", "name": "label" } }, "help": { "type": "string", "default": "", "label": "help", "group": "content", "binding": { "kind": "attribute", "name": "help" } }, "value": { "type": "string", "default": "", "label": "value", "group": "content", "binding": { "kind": "attribute", "name": "value" } }, "required": { "type": "boolean", "default": false, "label": "required", "group": "content", "binding": { "kind": "attribute", "name": "required" } }, "disabled": { "type": "boolean", "default": false, "label": "disabled", "group": "content", "binding": { "kind": "attribute", "name": "disabled" } }, "readonly": { "type": "boolean", "default": false, "label": "readonly", "group": "content", "binding": { "kind": "attribute", "name": "readonly" } }, "options": { "type": "string", "default": "", "label": "options", "group": "content", "binding": { "kind": "attribute", "name": "options" }, "format": "comma-options" } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }, { "tagName": "uib-hero", "module": "./src/uib-hero.js", "importPath": "./uib-hero", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/hero:uib-hero", "name": "uib-hero", "displayName": "Hero", "description": "Metadata-admitted uib-panel" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/hero", "scope": "platform", "version": "0.2.3" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-hero", "module": "./src/uib-hero.js", "importPath": "@ui-base/hero/uib-hero", "exportName": "UibHero", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-hero" }, "aliases": [], "registrationSideEffects": ["uib-hero"] }, "version": { "packageVersion": "0.2.3", "runtimeCompatibility": "^0.2.3", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "eyebrow": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "headline": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "subheadline": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-type": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-type": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "secondary-cta-disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-hero-cta": { "detail": { "actionToken": "string", "ctaType": "string", "href": "string", "disabled": "boolean" }, "bubbles": true, "composed": true, "cancelable": true } }, "slots": [{ "name": "navigation" }, { "name": "visual" }, { "name": "trust" }, { "name": "after-content" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "eyebrow": { "type": "string", "default": "", "label": "eyebrow", "group": "content", "binding": { "kind": "attribute", "name": "eyebrow" } }, "headline": { "type": "string", "default": "", "label": "headline", "group": "content", "binding": { "kind": "attribute", "name": "headline" } }, "subheadline": { "type": "string", "default": "", "label": "subheadline", "group": "content", "binding": { "kind": "attribute", "name": "subheadline" } }, "primary-cta-label": { "type": "string", "default": "", "label": "primary-cta-label", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-label" } }, "primary-cta-href": { "type": "string", "default": "", "label": "primary-cta-href", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-href" }, "format": "url" }, "primary-cta-action-token": { "type": "string", "default": "", "label": "primary-cta-action-token", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-action-token" } }, "primary-cta-type": { "type": "string", "default": "", "label": "primary-cta-type", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-type" } }, "secondary-cta-label": { "type": "string", "default": "", "label": "secondary-cta-label", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-label" } }, "secondary-cta-href": { "type": "string", "default": "", "label": "secondary-cta-href", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-href" }, "format": "url" }, "secondary-cta-action-token": { "type": "string", "default": "", "label": "secondary-cta-action-token", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-action-token" } }, "secondary-cta-type": { "type": "string", "default": "", "label": "secondary-cta-type", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-type" } }, "primary-cta-disabled": { "type": "boolean", "default": false, "label": "primary-cta-disabled", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-disabled" } }, "secondary-cta-disabled": { "type": "boolean", "default": false, "label": "secondary-cta-disabled", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {}, "id": "@ui-base/hero:uib-hero", "definition": { "tagName": "uib-hero", "module": "./src/uib-hero.js", "importPath": "./uib-hero", "presentation": { "settings": {}, "cssVariables": [] }, "schemaVersion": "1.0.0", "identity": { "componentId": "@ui-base/hero:uib-hero", "name": "uib-hero", "displayName": "Hero", "description": "Metadata-admitted uib-panel" }, "ownership": { "scope": "platform", "package": { "packageId": "@ui-base/hero", "scope": "platform", "version": "0.2.3" }, "provenance": { "origin": "installed-package", "promotedFromComponentId": null, "promotedFromRevisionId": null } }, "implementation": { "type": "code", "tagName": "uib-hero", "module": "./src/uib-hero.js", "importPath": "@ui-base/hero/uib-hero", "exportName": "UibHero", "runtimeBinding": { "kind": "custom-element", "tagName": "uib-hero" }, "aliases": [], "registrationSideEffects": ["uib-hero"] }, "version": { "packageVersion": "0.2.3", "runtimeCompatibility": "^0.2.3", "revisionId": null }, "maturity": "experimental", "category": "content-surfaces", "runtime": { "attributes": { "eyebrow": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "headline": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "subheadline": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-type": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-label": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-href": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-action-token": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "secondary-cta-type": { "type": "string", "default": "", "observed": true, "serialization": "string" }, "primary-cta-disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" }, "secondary-cta-disabled": { "type": "boolean", "default": false, "observed": true, "serialization": "presence" } }, "properties": {}, "events": { "uib-hero-cta": { "detail": { "actionToken": "string", "ctaType": "string", "href": "string", "disabled": "boolean" }, "bubbles": true, "composed": true, "cancelable": true } }, "slots": [{ "name": "navigation" }, { "name": "visual" }, { "name": "trust" }, { "name": "after-content" }] }, "children": { "runtime": "unrestricted-for-compatibility", "builder": { "content": ["text", "image"], "nestedInteractiveInLink": false } }, "builder": { "groups": [{ "id": "content", "label": "Content" }, { "id": "appearance", "label": "Appearance" }, { "id": "interaction", "label": "Interaction" }, { "id": "state", "label": "State" }, { "id": "accessibility", "label": "Accessibility" }, { "id": "events", "label": "Event bindings" }], "definitionSettings": { "displayName": { "label": "Display name", "type": "string", "required": true, "binding": { "kind": "definition", "path": "identity.displayName" } }, "description": { "label": "Description", "type": "string", "editor": "textarea", "binding": { "kind": "definition", "path": "identity.description" } } }, "settings": { "eyebrow": { "type": "string", "default": "", "label": "eyebrow", "group": "content", "binding": { "kind": "attribute", "name": "eyebrow" } }, "headline": { "type": "string", "default": "", "label": "headline", "group": "content", "binding": { "kind": "attribute", "name": "headline" } }, "subheadline": { "type": "string", "default": "", "label": "subheadline", "group": "content", "binding": { "kind": "attribute", "name": "subheadline" } }, "primary-cta-label": { "type": "string", "default": "", "label": "primary-cta-label", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-label" } }, "primary-cta-href": { "type": "string", "default": "", "label": "primary-cta-href", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-href" }, "format": "url" }, "primary-cta-action-token": { "type": "string", "default": "", "label": "primary-cta-action-token", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-action-token" } }, "primary-cta-type": { "type": "string", "default": "", "label": "primary-cta-type", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-type" } }, "secondary-cta-label": { "type": "string", "default": "", "label": "secondary-cta-label", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-label" } }, "secondary-cta-href": { "type": "string", "default": "", "label": "secondary-cta-href", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-href" }, "format": "url" }, "secondary-cta-action-token": { "type": "string", "default": "", "label": "secondary-cta-action-token", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-action-token" } }, "secondary-cta-type": { "type": "string", "default": "", "label": "secondary-cta-type", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-type" } }, "primary-cta-disabled": { "type": "boolean", "default": false, "label": "primary-cta-disabled", "group": "content", "binding": { "kind": "attribute", "name": "primary-cta-disabled" } }, "secondary-cta-disabled": { "type": "boolean", "default": false, "label": "secondary-cta-disabled", "group": "content", "binding": { "kind": "attribute", "name": "secondary-cta-disabled" } } }, "interactionModes": {}, "validation": [], "responsive": { "supported": false }, "preview": { "renderer": "runtimeBinding", "navigation": "prevent", "eventHandlers": "observe-only" }, "eventBindings": { "handlerReference": "registered-handler-id", "cancellation": "synchronous-false-only", "selectionEvent": "uib-card-select" } }, "capabilities": ["surface", "container", "interactive", "selectable", "linkable"], "dependencies": { "packages": [], "services": [] }, "accessibility": { "modes": ["section", "link", "button", "toggle-button"], "keyboard": { "nonLink": ["Enter", "Space"], "link": "native" }, "namePrecedence": ["aria-label", "heading", "label", "header"], "disabled": "aria-disabled; remove-from-tab-order; block-activation" }, "lifecycle": { "state": "installed", "save": "workspace-only", "publication": "unimplemented-stage-gate", "publishedRevisionsImmutable": true, "rollback": "new-revision", "promotion": "new-identity-with-provenance" }, "clone": { "workspace": "new-workspace-and-instance-ids;same-component-identity", "component": "new-component-identity;retain-provenance" }, "deprecation": { "status": "none", "replacementComponentId": null }, "extensions": {} } }];
  window.run = () => {
    const results = [];
    const check = (v, m) => {
      if (!v) throw Error(m);
      results.push(m);
    };
    const metadata = { schemaVersion: 1, artifactId: "art_stage1-fresh", route: "/stage1", kind: "page", name: "stage1", displayName: "Stage1", state: {}, events: [] };
    let source = "";
    for (const p of packages) {
      const attrs = p.tagName === "uib-card" ? ' heading="Card"' : p.tagName === "uib-panel" ? ' heading="Panel" collapsible open' : p.tagName === "uib-forms-select" ? ' label="Category" options="Hardware,Software" value="Hardware"' : p.tagName === "uib-hero" ? ' headline="Hero" primary-cta-label="Run" primary-cta-action-token="approved" primary-cta-type="action"' : "";
      source += "<" + p.tagName + ' data-uip-node="' + p.tagName + '" data-uip-component="' + p.id + '"' + attrs + "></" + p.tagName + ">";
    }
    const instance = mountVisualArtifact({ source, css: "", metadata }, { components: [], packages });
    document.body.append(instance.host);
    for (const p of packages) check(!!instance.root.querySelector(p.tagName)?.shadowRoot, p.tagName + " registered and rendered");
    const panel = instance.root.querySelector("uib-panel");
    let toggles = 0;
    panel.addEventListener("uib-panel-toggle", () => toggles++);
    panel.shadowRoot.querySelector("button").focus();
    panel.shadowRoot.querySelector("button").click();
    check(!panel.open && toggles === 1, "Panel collapse emits once");
    check(panel.shadowRoot.activeElement?.tagName === "BUTTON", "Panel retains keyboard focus");
    check(panel.shadowRoot.querySelector("button").hasAttribute("aria-controls"), "Panel content reference");
    panel.shadowRoot.querySelector("button").click();
    check(panel.open && toggles === 2, "Panel expands once");
    const card = instance.root.querySelector("uib-card");
    card.setAttribute("selectable", "");
    let selections = 0;
    card.addEventListener("uib-card-select", () => selections++);
    card.shadowRoot.querySelector('[part="base"]').click();
    check(card.selected && selections === 1, "Card selection once");
    const select = instance.root.querySelector("uib-forms-select");
    check(select.value === "Hardware", "Select initial scalar value");
    let changes = 0;
    select.addEventListener("uib-forms-select-change", () => changes++);
    const control = select.shadowRoot.querySelector("select");
    control.value = "Software";
    control.dispatchEvent(new Event("change", { bubbles: true }));
    check(select.value === "Software" && changes === 1, "Select canonical change once");
    const button = instance.root.querySelector("uib-action-button");
    button.disabled = true;
    let actions = 0;
    button.addEventListener("uib-action-button-click", () => actions++);
    button.shadowRoot.querySelector("button").click();
    check(actions === 0, "Disabled Action Button refuses execution");
    return results;
  };
})();
