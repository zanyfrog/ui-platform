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

// src/shared/builder-workspace.ts
function workspaceIdentityKey(identity) {
  if (!identity || !identity.owner || !["application", "platform", "package"].includes(identity.owner.kind) || !identity.owner.id || !["visual", "generic", "composition", "automation", "package", "legacy"].includes(identity.format) || !!identity.id === !!identity.repairLocator) throw new Error("WORKSPACE_IDENTITY_INVALID");
  return JSON.stringify([
    identity.owner.kind,
    identity.owner.id,
    identity.owner.revision ?? null,
    identity.format,
    identity.id ? ["permanent", identity.id] : ["repair-only", identity.repairLocator]
  ]);
}
var init_builder_workspace = __esm({
  "src/shared/builder-workspace.ts"() {
    "use strict";
  }
});

// src/client/fixture-preview/lifecycle.ts
var identityKey, PreviewLifecycle;
var init_lifecycle = __esm({
  "src/client/fixture-preview/lifecycle.ts"() {
    "use strict";
    identityKey = (value) => JSON.stringify([value.subjectId, value.sessionId, value.applicationId, value.artifactKey]);
    PreviewLifecycle = class {
      value;
      sequence = 0;
      constructor(identity) {
        if (Object.values(identity).some((value) => typeof value !== "string" || !value || value.length > 4096) || Object.keys(identity).length !== 4) throw new Error("PREVIEW_IDENTITY_INVALID");
        this.value = { state: "empty", identity: structuredClone(identity) };
      }
      get snapshot() {
        return structuredClone(this.value);
      }
      refresh() {
        if (this.value.state === "disposed" || this.value.state === "revoked") throw new Error("PREVIEW_SESSION_CLOSED");
        const sequence = ++this.sequence;
        const pending = { identity: structuredClone(this.value.identity), sequence, requestId: `request-${sequence}` };
        this.value = { ...this.value, state: "capturing", pending, reason: void 0 };
        return structuredClone(pending);
      }
      matches(request) {
        return this.value.state === "capturing" && this.value.pending?.sequence === request.sequence && this.value.pending.requestId === request.requestId && identityKey(request.identity) === identityKey(this.value.identity);
      }
      succeed(request, capture) {
        if (!this.matches(request) || identityKey(capture.identity) !== identityKey(this.value.identity) || !capture.captureId) return false;
        if (this.value.last?.captureId === capture.captureId && JSON.stringify(this.value.last.provenance) !== JSON.stringify(capture.provenance)) return false;
        this.value = { state: "ready", identity: this.value.identity, last: structuredClone(capture) };
        return true;
      }
      fail(request, reason) {
        if (!this.matches(request)) return false;
        this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
        return true;
      }
      invalidate(reason) {
        if (this.value.state === "disposed" || this.value.state === "revoked") return;
        this.sequence++;
        this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
      }
      revoke(reason) {
        if (this.value.state === "disposed") return;
        this.sequence++;
        this.value = { state: "revoked", identity: this.value.identity, reason };
      }
      dispose() {
        this.sequence++;
        this.value = { state: "disposed", identity: this.value.identity };
      }
    };
  }
});

// src/client/fixture-preview/bootstrap.txt
var bootstrap_default;
var init_bootstrap = __esm({
  "src/client/fixture-preview/bootstrap.txt"() {
    bootstrap_default = '"use strict";\n(() => {\n  // ../ui-base/packages/ui-base-core/src/utils.js\n  var idCounter = 0;\n  function createId(prefix = "mt") {\n    idCounter += 1;\n    return `${prefix}-${idCounter}`;\n  }\n  function escapeHtml(value) {\n    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll(\'"\', "&quot;").replaceAll("\'", "&#39;");\n  }\n  function defineUiBaseElement(tagName, elementClass) {\n    installCssClassProperty(elementClass);\n    if (!customElements.get(tagName)) customElements.define(tagName, elementClass);\n    return elementClass;\n  }\n  function cssClassTokens(element) {\n    return String(element?.getAttribute?.("css-class") ?? element?.cssClass ?? "").split(/\\s+/).map((value) => value.trim()).filter(Boolean);\n  }\n  function applyCssClassToShadowRoot(element) {\n    if (!element) return;\n    const root = element.shadowRoot || element;\n    const target = root.querySelector("[data-uib-css-class-root]") || Array.from(root.children).find((child) => child instanceof HTMLElement && child.localName !== "style");\n    if (!target) return;\n    const previous = element.__uibCssClassTokens || [];\n    target.classList.remove(...previous);\n    const next = cssClassTokens(element);\n    if (next.length) target.classList.add(...next);\n    element.__uibCssClassTokens = next;\n  }\n  function installCssClassProperty(elementClass) {\n    const prototype = elementClass?.prototype;\n    if (!prototype) return elementClass;\n    if (!Object.getOwnPropertyDescriptor(prototype, "cssClass")) {\n      Object.defineProperty(prototype, "cssClass", {\n        configurable: true,\n        enumerable: true,\n        get() {\n          return this.getAttribute("css-class") || "";\n        },\n        set(value) {\n          setOrRemoveAttribute(this, "css-class", value);\n        }\n      });\n    }\n    const observed = Array.isArray(elementClass.observedAttributes) ? elementClass.observedAttributes : [];\n    if (!observed.includes("css-class")) {\n      Object.defineProperty(elementClass, "observedAttributes", {\n        configurable: true,\n        value: [...observed, "css-class"]\n      });\n    }\n    if (typeof prototype.render === "function" && !prototype.__uibCssClassRenderWrapped) {\n      const render = prototype.render;\n      prototype.render = function renderWithCssClass(...args) {\n        const result = render.apply(this, args);\n        applyCssClassToShadowRoot(this);\n        return result;\n      };\n      prototype.__uibCssClassRenderWrapped = true;\n    }\n    return elementClass;\n  }\n  function setOrRemoveAttribute(element, name, value) {\n    if (value === null || value === void 0 || value === false) {\n      element.removeAttribute(name);\n      return;\n    }\n    if (value === true) {\n      element.setAttribute(name, "");\n      return;\n    }\n    element.setAttribute(name, String(value));\n  }\n  function mergeIds(...ids) {\n    return ids.flatMap((value) => String(value ?? "").split(/\\s+/)).map((value) => value.trim()).filter(Boolean).filter((value, index, array) => array.indexOf(value) === index).join(" ");\n  }\n\n  // ../ui-base/packages/ui-base-core/src/validation.js\n  var VALIDATION_STATES = Object.freeze({\n    VALID: "valid",\n    INVALID: "invalid",\n    WARNING: "warning",\n    INFO: "info"\n  });\n\n  // ../ui-base/packages/ui-base-core/src/metadata.js\n  var MATURITY_LEVELS = Object.freeze({\n    EXPERIMENTAL: "experimental",\n    PREVIEW: "preview",\n    STABLE: "stable",\n    DEPRECATED: "deprecated",\n    RETIRED: "retired"\n  });\n\n  // ../ui-base/packages/ui-base-core/src/base-element.js\n  var UibBaseElement = class extends HTMLElement {\n    static commonAttributes = [\n      "name",\n      "label",\n      "help",\n      "help-mode",\n      "title",\n      "disabled",\n      "readonly",\n      "required",\n      "hidden",\n      "invalid",\n      "error",\n      "css-class",\n      "aria-label",\n      "aria-describedby"\n    ];\n    constructor() {\n      super();\n      this._uibId = createId(this.localName || "uib-component");\n    }\n    get componentId() {\n      return this.id || this._uibId;\n    }\n    get name() {\n      return this.getAttribute("name") || "";\n    }\n    set name(value) {\n      setOrRemoveAttribute(this, "name", value);\n    }\n    get label() {\n      return this.getAttribute("label") || "";\n    }\n    set label(value) {\n      setOrRemoveAttribute(this, "label", value);\n    }\n    get help() {\n      return this.getAttribute("help") || "";\n    }\n    set help(value) {\n      setOrRemoveAttribute(this, "help", value);\n    }\n    get helpMode() {\n      const mode = (this.getAttribute("help-mode") || "").toLowerCase();\n      return mode === "inline" ? "inline" : "tooltip";\n    }\n    set helpMode(value) {\n      setOrRemoveAttribute(this, "help-mode", value);\n    }\n    get titleText() {\n      return this.getAttribute("title") || "";\n    }\n    set titleText(value) {\n      setOrRemoveAttribute(this, "title", value);\n    }\n    get disabled() {\n      return this.hasAttribute("disabled");\n    }\n    set disabled(value) {\n      this.toggleAttribute("disabled", Boolean(value));\n    }\n    get readonly() {\n      return this.hasAttribute("readonly");\n    }\n    set readonly(value) {\n      this.toggleAttribute("readonly", Boolean(value));\n    }\n    get required() {\n      return this.hasAttribute("required");\n    }\n    set required(value) {\n      this.toggleAttribute("required", Boolean(value));\n    }\n    get invalid() {\n      return this.hasAttribute("invalid");\n    }\n    set invalid(value) {\n      this.toggleAttribute("invalid", Boolean(value));\n    }\n    get error() {\n      return this.getAttribute("error") || "";\n    }\n    set error(value) {\n      setOrRemoveAttribute(this, "error", value);\n    }\n    get ariaLabel() {\n      return this.getAttribute("aria-label") || "";\n    }\n    get ariaDescribedBy() {\n      return this.getAttribute("aria-describedby") || "";\n    }\n    get cssClass() {\n      return this.getAttribute("css-class") || "";\n    }\n    set cssClass(value) {\n      setOrRemoveAttribute(this, "css-class", value);\n    }\n    describedBy(...internalIds) {\n      return mergeIds(this.ariaDescribedBy, ...internalIds);\n    }\n    emitMtEvent(type, detail = {}, options = {}) {\n      this.dispatchEvent(new CustomEvent(type, {\n        bubbles: options.bubbles ?? true,\n        composed: options.composed ?? true,\n        cancelable: options.cancelable ?? false,\n        detail\n      }));\n    }\n    emitValueChange(componentEventName, oldValue, newValue, extra = {}) {\n      const detail = {\n        name: this.name,\n        oldValue,\n        newValue,\n        ...extra\n      };\n      this.emitMtEvent("change", detail);\n      if (componentEventName) this.emitMtEvent(componentEventName, detail);\n    }\n    attributeChangedCallback() {\n      if (this.isConnected && typeof this.render === "function") this.render();\n    }\n  };\n\n  // ../ui-base/packages/ui-base-icons/src/icon-registry.js\n  var icons = /* @__PURE__ */ new Map();\n  function registerMtIcon(name, svg) {\n    const normalized = String(name || "").trim().toLowerCase();\n    if (!normalized) throw new Error("Icon name is required.");\n    icons.set(normalized, String(svg || ""));\n  }\n  function getMtIcon(name) {\n    return icons.get(String(name || "").trim().toLowerCase()) || "";\n  }\n  registerMtIcon("help", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 17a1.15 1.15 0 1 1 0-2.3 1.15 1.15 0 0 1 0 2.3Zm1.1-5.1v.6h-2.1v-.8c0-1.4.8-2.1 1.6-2.7.7-.5 1.2-.9 1.2-1.7 0-.9-.7-1.5-1.8-1.5-1 0-1.7.5-2.3 1.3L8.2 7.9A4.4 4.4 0 0 1 12.1 6c2.4 0 4 1.4 4 3.3 0 1.8-1.1 2.6-2 3.2-.6.5-1 .8-1 1.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("info", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 10h2v8h-2v-8Zm0-4h2v2h-2V6Zm1-4a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" fill="currentColor"/></svg>\');\n  registerMtIcon("menu", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v2H4v-2Zm0 4.5h16v2H4v-2Zm0 4.5h16v2H4v-2Z" fill="currentColor"/></svg>\');\n  registerMtIcon("close", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("chevron-down", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7.4 8.6 4.6 4.6 4.6-4.6L18 10l-6 6-6-6 1.4-1.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("check", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.4 1.4 5.5 5.5L20.3 8.3l-1.4-1.4-9.7 9.7Z" fill="currentColor"/></svg>\');\n  registerMtIcon("x", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.4 5 12.6 12.6-1.4 1.4L5 6.4 6.4 5Zm12.6 1.4L6.4 19 5 17.6 17.6 5 19 6.4Z" fill="currentColor"/></svg>\');\n  registerMtIcon("calendar", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v3h6V2h2v3h3v17H4V5h3V2Zm13 8H6v10h14V10ZM6 8h14V7H6v1Z" fill="currentColor"/></svg>\');\n  registerMtIcon("warning", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 1.8 21h20.4L12 3Zm1 15h-2v-2h2v2Zm0-4h-2V9h2v5Z" fill="currentColor"/></svg>\');\n  registerMtIcon("external-link", \'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H7v10h10v-4h2v6H5V5Z" fill="currentColor"/></svg>\');\n\n  // ../ui-base/packages/ui-base-icons/src/uib-icon.js\n  var styles = `\n:host{display:inline-flex;width:var(--uib-icon-size,1em);height:var(--uib-icon-size,1em);line-height:1;flex:0 0 auto}*,*::before,*::after{box-sizing:border-box}.uib-icon{display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center}.uib-icon svg,.uib-icon img{width:100%;height:100%;display:block}.uib-icon img{object-fit:contain}\n`;\n  var UibIcon = class extends UibBaseElement {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "name", "src", "url", "size", "decorative"];\n    }\n    constructor() {\n      super();\n      this.attachShadow({ mode: "open" });\n    }\n    connectedCallback() {\n      this.render();\n    }\n    get name() {\n      return this.getAttribute("name") || "";\n    }\n    set name(value) {\n      if (value === null || value === void 0) this.removeAttribute("name");\n      else this.setAttribute("name", String(value));\n    }\n    get src() {\n      return this.getAttribute("src") || this.getAttribute("url") || "";\n    }\n    set src(value) {\n      if (value === null || value === void 0) this.removeAttribute("src");\n      else this.setAttribute("src", String(value));\n    }\n    get decorative() {\n      return this.hasAttribute("decorative") || !this.label && !this.ariaLabel && !this.titleText;\n    }\n    set decorative(value) {\n      this.toggleAttribute("decorative", Boolean(value));\n    }\n    render() {\n      const label = this.ariaLabel || this.label || this.titleText || this.name || "Icon";\n      const aria = this.decorative ? \'aria-hidden="true"\' : `role="img" aria-label="${escapeHtml(label)}"`;\n      const size = this.getAttribute("size");\n      const sizeStyle = size ? `:host{--uib-icon-size:${escapeHtml(size)}}` : "";\n      const src = this.src;\n      const body = src ? `<img src="` + escapeHtml(src) + `" alt="` + (this.decorative ? "" : escapeHtml(label)) + `">` : getMtIcon(this.name) || getMtIcon("info");\n      this.shadowRoot.innerHTML = `<style> ` + styles + ` ` + sizeStyle + ` </style><span class="uib-icon" part="icon" ` + aria + `> ` + body + ` </span>`;\n    }\n  };\n  defineUiBaseElement("uib-icon", UibIcon);\n\n  // ../ui-base/packages/ui-base-ui/src/layout/index.js\n  var baseStyles = `\n:host{display:block;color:var(--uib-color-ink,#13294b);font-family:var(--uib-font-family-sans,Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}*,*::before,*::after{box-sizing:border-box}.placeholder{padding:.75rem;border:1px dashed var(--uib-color-border-strong,#aab8cc);border-radius:var(--uib-radius-md,.75rem);background:var(--uib-color-surface-soft,#f8fbff);color:var(--uib-color-muted,#53657f);font-size:var(--uib-font-size-sm,.875rem)}\n`;\n  var UibLayoutBase = class extends UibBaseElement {\n    connectedCallback() {\n      this.render();\n    }\n  };\n  var UibStack = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "direction", "align", "justify"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const direction = this.getAttribute("direction") || "column";\n      const align = this.getAttribute("align") || "stretch";\n      const justify = this.getAttribute("justify") || "start";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-stack{display:flex;flex-direction:` + escapeHtml(direction) + `;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `}@media(max-width:520px){.uib-stack{flex-wrap:wrap}} </style><div class="uib-stack" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibGrid = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "columns", "min", "gap"];\n    }\n    render() {\n      const columns = this.getAttribute("columns");\n      const min = this.getAttribute("min") || "14rem";\n      const gap = this.getAttribute("gap") || "var(--uib-space-4,1rem)";\n      const template = columns ? `repeat(${Number(columns) || 1}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(${min}, 1fr))`;\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-grid{display:grid;grid-template-columns:` + template + `;gap:` + escapeHtml(gap) + `}@media(max-width:520px){.uib-grid{grid-template-columns:1fr}} </style><div class="uib-grid" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibRow = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "align", "justify", "wrap"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const align = this.getAttribute("align") || "center";\n      const justify = this.getAttribute("justify") || "start";\n      const wrap = this.hasAttribute("wrap") ? "wrap" : "nowrap";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-row{display:flex;flex-direction:row;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `;flex-wrap:` + wrap + `}@media(max-width:420px){.uib-row{flex-wrap:wrap}} </style><div class="uib-row" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibColumn = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "gap", "align", "justify"];\n    }\n    render() {\n      const gap = this.getAttribute("gap") || "var(--uib-space-3,.75rem)";\n      const align = this.getAttribute("align") || "stretch";\n      const justify = this.getAttribute("justify") || "start";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-column{display:flex;flex-direction:column;gap:` + escapeHtml(gap) + `;align-items:` + escapeHtml(align) + `;justify-content:` + escapeHtml(justify) + `} </style><div class="uib-column" part="base"><slot></slot></div>`;\n    }\n  };\n  var UibSurfaceBase = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "heading", "variant", "density"];\n    }\n    surfaceName = "surface";\n    defaultVariant = "outlined";\n    connectedCallback() {\n      this.render();\n    }\n    get heading() {\n      return this.getAttribute("heading") || this.label || "";\n    }\n    get variant() {\n      const value = (this.getAttribute("variant") || this.defaultVariant).toLowerCase();\n      return ["outlined", "elevated", "flat"].includes(value) ? value : this.defaultVariant;\n    }\n    get density() {\n      return this.getAttribute("density") === "compact" ? "compact" : "comfortable";\n    }\n    hasNamedSlot(name) {\n      return Array.from(this.children).some((child) => child.getAttribute?.("slot") === name);\n    }\n    surfaceStyles(extra = "") {\n      return `<style> ` + baseStyles + `.uib-surface{display:block;overflow:hidden;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);text-align:start;text-decoration:none}.uib-surface--elevated{box-shadow:var(--uib-shadow-sm,0 6px 18px rgba(10,31,68,.08))}.uib-surface--outlined{box-shadow:none}.uib-surface--flat{border-color:transparent;box-shadow:none}.uib-surface--disabled{cursor:not-allowed;opacity:.58}.uib-surface__header,.uib-surface__body,.uib-surface__footer,.uib-surface__actions{padding:var(--uib-space-4,1rem)}.uib-surface--compact .uib-surface__header,.uib-surface--compact .uib-surface__body,.uib-surface--compact .uib-surface__footer,.uib-surface--compact .uib-surface__actions{padding:var(--uib-space-3,.75rem)}.uib-surface__header{display:flex;gap:.75rem;align-items:center;justify-content:space-between;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-surface__header[hidden],.uib-surface__footer[hidden],.uib-surface__actions[hidden],.uib-surface__media[hidden],.uib-surface__collapsible[hidden]{display:none!important}.uib-surface__footer{border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}.uib-surface__actions{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;justify-content:flex-end;padding-bottom:0}.uib-surface:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))} ` + extra + ` </style>`;\n    }\n    headerMarkup(headingId, visible = true, after = "") {\n      const heading = this.heading;\n      return `<div class="uib-surface__header" part="header" ` + (headingId ? `id="${headingId}"` : "") + (visible ? "" : " hidden") + `><slot name="header">` + escapeHtml(heading) + `</slot>` + after + `</div>`;\n    }\n    bodyMarkup(hidden = false) {\n      return `<div class="uib-surface__body" part="body"` + (hidden ? " hidden" : "") + `><slot></slot></div>`;\n    }\n    footerMarkup(visible = true) {\n      return `<div class="uib-surface__footer" part="footer"` + (visible ? "" : " hidden") + `><slot name="footer"></slot></div>`;\n    }\n    surfaceClasses(...names) {\n      return [\n        "uib-surface",\n        `uib-${this.surfaceName}`,\n        `uib-surface--${this.variant}`,\n        `uib-surface--${this.density}`,\n        this.disabled ? "uib-surface--disabled" : "",\n        ...names\n      ].filter(Boolean).join(" ");\n    }\n  };\n  var UibPanel = class extends UibSurfaceBase {\n    static get observedAttributes() {\n      return [...super.observedAttributes, "collapsible", "open"];\n    }\n    surfaceName = "panel";\n    defaultVariant = "outlined";\n    get collapsible() {\n      return this.hasAttribute("collapsible");\n    }\n    get open() {\n      return !this.collapsible || this.hasAttribute("open");\n    }\n    set open(value) {\n      this.toggleAttribute("open", Boolean(value));\n    }\n    toggle() {\n      if (!this.collapsible || this.disabled) return;\n      const oldValue = this.open;\n      this.open = !oldValue;\n      this.emitValueChange("uib-panel-toggle", oldValue, this.open);\n    }\n    render() {\n      const headingId = this.heading ? `${this.componentId}-heading` : "";\n      const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header") || this.hasNamedSlot("actions") || this.collapsible;\n      const hasActions = this.hasNamedSlot("actions");\n      const hasFooter = this.hasNamedSlot("footer");\n      const open = this.open;\n      const toggleButton = this.collapsible ? `<button class="uib-panel__toggle" part="toggle" type="button" aria-expanded="${open ? "true" : "false"}" ${this.disabled ? "disabled" : ""}><span class="uib-panel__toggle-icon" aria-hidden="true">` + (open ? "-" : "+") + `</span></button>` : "";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-panel .uib-surface__actions{margin-inline-start:auto;padding:0}.uib-panel__toggle{display:inline-grid;width:2rem;height:2rem;place-items:center;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);cursor:pointer}.uib-panel__toggle:disabled{cursor:not-allowed}.uib-panel__toggle:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-panel__toggle-icon{font-size:1rem;font-weight:900;line-height:1}`) + `<section class="${this.surfaceClasses()}" part="base" ` + (headingId ? `aria-labelledby="${headingId}"` : "") + (this.disabled ? \' aria-disabled="true"\' : "") + `>` + (hasHeader ? this.headerMarkup(headingId, true, `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>${toggleButton}`) : this.headerMarkup("", false)) + `<div class="uib-surface__collapsible" part="content"` + (open ? "" : " hidden") + `>` + (hasActions && !hasHeader ? `<div class="uib-surface__actions" part="actions"><slot name="actions"></slot></div>` : "") + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</div></section>`;\n      this.shadowRoot.querySelector(".uib-panel__toggle")?.addEventListener("click", () => this.toggle());\n    }\n  };\n  var UibCard = class extends UibSurfaceBase {\n    static get observedAttributes() {\n      return [...super.observedAttributes, "href", "target", "rel", "action", "action-token", "interactive", "selectable", "selected"];\n    }\n    surfaceName = "card";\n    defaultVariant = "elevated";\n    connectedCallback() {\n      super.connectedCallback();\n      this._cardSlotObserver ||= new MutationObserver((records) => {\n        if (records.some((record) => record.target === this || record.type === "attributes" && record.target.parentElement === this)) this._updateCardSlots();\n      });\n      this._cardSlotObserver.observe(this, { childList: true, attributes: true, attributeFilter: ["slot"], subtree: true });\n    }\n    disconnectedCallback() {\n      this._cardSlotObserver?.disconnect();\n    }\n    attributeChangedCallback(name, oldValue, newValue) {\n      if (oldValue === newValue) return;\n      if (name === "selected" && this.shadowRoot?.querySelector(".uib-card")) {\n        const surface = this.shadowRoot.querySelector(".uib-card");\n        surface.classList.toggle("uib-card--selected", this.selected);\n        if (this.selectable) surface.setAttribute("aria-pressed", String(this.selected));\n        return;\n      }\n      super.attributeChangedCallback(name, oldValue, newValue);\n    }\n    _updateCardSlots() {\n      if (!this.shadowRoot) return;\n      for (const name of ["media", "header", "footer"]) {\n        const wrapper = this.shadowRoot.querySelector(`[part="${name}"]`);\n        if (wrapper) wrapper.hidden = name === "header" ? !this.heading && !this.hasNamedSlot(name) : !this.hasNamedSlot(name);\n      }\n    }\n    get href() {\n      return this.getAttribute("href") || "";\n    }\n    get target() {\n      return this.getAttribute("target") || "";\n    }\n    get rel() {\n      return this.getAttribute("rel") || "";\n    }\n    get action() {\n      return this.getAttribute("action") || "";\n    }\n    get actionToken() {\n      return this.getAttribute("action-token") || "";\n    }\n    get interactive() {\n      return this.hasAttribute("interactive") || Boolean(this.href || this.action || this.actionToken || this.selectable);\n    }\n    get selectable() {\n      return this.hasAttribute("selectable");\n    }\n    get selected() {\n      return this.hasAttribute("selected");\n    }\n    set selected(value) {\n      this.toggleAttribute("selected", Boolean(value));\n    }\n    shouldIgnoreActivation(event, surface) {\n      const interactiveSelector = \'a,button,input,select,textarea,summary,[role="button"],[role="link"],[contenteditable="true"]\';\n      for (const item of event?.composedPath?.() || []) {\n        if (item === surface) return false;\n        if (item instanceof HTMLElement && item.matches(interactiveSelector)) return true;\n      }\n      return false;\n    }\n    activate(event) {\n      if (this.disabled) {\n        event?.preventDefault?.();\n        return;\n      }\n      const surface = this.shadowRoot?.querySelector(".uib-card");\n      if (surface && this.shouldIgnoreActivation(event, surface)) return;\n      const oldSelected = this.selected;\n      if (this.selectable) {\n        this.selected = !oldSelected;\n        this.emitValueChange("uib-card-select", oldSelected, this.selected, { selected: this.selected });\n      }\n      if (this.action || this.actionToken) {\n        const allowed = this.dispatchEvent(new CustomEvent("uib-card-action", {\n          bubbles: true,\n          composed: true,\n          cancelable: true,\n          detail: {\n            name: this.name,\n            action: this.action,\n            actionToken: this.actionToken,\n            selected: this.selected\n          }\n        }));\n        if (!allowed) event?.preventDefault?.();\n      }\n    }\n    handleKeydown(event) {\n      if (!this.interactive || this.href) return;\n      if (event.key !== "Enter" && event.key !== " ") return;\n      const surface = this.shadowRoot?.querySelector(".uib-card");\n      if (surface && this.shouldIgnoreActivation(event, surface)) return;\n      event.preventDefault();\n      this.activate(event);\n    }\n    render() {\n      const hadSurfaceFocus = Boolean(this.shadowRoot?.activeElement) && this.shadowRoot.activeElement === this.shadowRoot.querySelector(".uib-card");\n      const headingId = this.heading ? `${this.componentId}-heading` : "";\n      const hasHeader = Boolean(this.heading) || this.hasNamedSlot("header");\n      const hasMedia = this.hasNamedSlot("media");\n      const hasFooter = this.hasNamedSlot("footer");\n      const tag = this.href ? "a" : "section";\n      const href = tag === "a" ? ` href="${escapeHtml(this.href)}"` : "";\n      const target = tag === "a" && this.target ? ` target="${escapeHtml(this.target)}"` : "";\n      const rel = tag === "a" && this.rel ? ` rel="${escapeHtml(this.rel)}"` : "";\n      const role = tag === "section" && this.interactive ? \' role="button"\' : "";\n      const tabIndex = this.interactive ? ` tabindex="${this.disabled ? "-1" : "0"}"` : "";\n      const ariaPressed = this.selectable ? ` aria-pressed="${this.selected ? "true" : "false"}"` : "";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = this.surfaceStyles(`.uib-card{width:100%;font:inherit}.uib-card--interactive{cursor:pointer}.uib-card--selected{border-color:var(--uib-color-primary,#174a8b);box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.18))}.uib-card__media{display:block;overflow:hidden;background:var(--uib-color-surface-soft,#f8fbff)}.uib-card__media::slotted(img),.uib-card__media::slotted(video),.uib-card__media::slotted(uib-media){display:block;width:100%}`) + `<${tag} class="${this.surfaceClasses(this.interactive ? "uib-card--interactive" : "", this.selected ? "uib-card--selected" : "")}" part="base" ` + (this.ariaLabel ? `aria-label="${escapeHtml(this.ariaLabel)}"` : headingId ? `aria-labelledby="${headingId}"` : "") + (this.ariaDescribedBy ? ` aria-describedby="${escapeHtml(this.ariaDescribedBy)}"` : "") + (this.disabled ? \' aria-disabled="true"\' : "") + ariaPressed + role + href + target + rel + tabIndex + `><div class="uib-card__media" part="media"` + (hasMedia ? "" : " hidden") + `><slot name="media"></slot></div>` + this.headerMarkup(headingId, hasHeader) + this.bodyMarkup() + this.footerMarkup(hasFooter) + `</${tag}>`;\n      const surface = this.shadowRoot.querySelector(".uib-card");\n      surface?.addEventListener("click", (event) => this.activate(event));\n      surface?.addEventListener("keydown", (event) => this.handleKeydown(event));\n      if (hadSurfaceFocus && this.interactive && !this.disabled) surface?.focus({ preventScroll: true });\n    }\n  };\n  var UibDialog = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "open", "heading"];\n    }\n    get open() {\n      return this.hasAttribute("open");\n    }\n    set open(value) {\n      this.toggleAttribute("open", Boolean(value));\n    }\n    show() {\n      this.open = true;\n    }\n    close() {\n      const oldValue = true;\n      this.open = false;\n      this.emitValueChange("uib-dialog-close", oldValue, false);\n    }\n    render() {\n      const heading = this.label || this.getAttribute("heading") || "Dialog";\n      const headingId = `${this.componentId}-heading`;\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:` + (this.open ? "block" : "none") + `}.uib-dialog{position:fixed;inset:0;z-index:var(--uib-z-index-modal,1100);display:grid;place-items:center;padding:1rem;background:rgba(6,21,40,.48)}.uib-dialog__panel{width:min(42rem,100%);max-height:calc(100vh - 2rem);overflow:auto;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);box-shadow:var(--uib-shadow-lg,0 24px 70px rgba(10,31,68,.14))}.uib-dialog__header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem;border-bottom:1px solid var(--uib-color-border,#d9e2f0);font-weight:850}.uib-dialog__body{padding:1rem}.uib-dialog__footer{padding:1rem;border-top:1px solid var(--uib-color-border,#d9e2f0);background:var(--uib-color-surface-soft,#f8fbff)}button{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);padding:.45rem .65rem;cursor:pointer} </style><div class="uib-dialog" part="backdrop"><section class="uib-dialog__panel" part="panel" role="dialog" aria-modal="true" aria-labelledby="` + headingId + `"><div class="uib-dialog__header" part="header"><span id="` + headingId + `"><slot name="header">` + escapeHtml(heading) + `</slot></span><button type="button" part="close-button" aria-label="Close"><uib-icon name="close" decorative></uib-icon></button></div><div class="uib-dialog__body" part="body"><slot></slot></div><div class="uib-dialog__footer" part="footer"><slot name="footer"></slot></div></section></div>`;\n      this.shadowRoot.querySelector("button")?.addEventListener("click", () => this.close());\n      this.shadowRoot.querySelector(".uib-dialog")?.addEventListener("click", (event) => {\n        if (event.target === event.currentTarget) this.close();\n      });\n    }\n  };\n  var UibAccordion = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "open", "heading"];\n    }\n    render() {\n      const heading = this.label || this.getAttribute("heading") || "Accordion";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `details{border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);overflow:hidden}summary{cursor:pointer;padding:1rem;font-weight:850}summary:focus-visible{outline:none;box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}.uib-accordion__body{padding:0 1rem 1rem} </style><details part="base" ` + (this.hasAttribute("open") ? "open" : "") + `><summary part="summary"><slot name="summary">` + escapeHtml(heading) + `</slot></summary><div class="uib-accordion__body" part="body"><slot></slot></div></details>`;\n      this.shadowRoot.querySelector("details")?.addEventListener("toggle", (event) => {\n        const open = event.currentTarget.open;\n        this.toggleAttribute("open", open);\n        this.emitMtEvent("uib-accordion-toggle", { name: this.name, oldValue: !open, newValue: open });\n      });\n    }\n  };\n  var UibTab = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected", "aria-selected", "aria-disabled"];\n    }\n    get disabled() {\n      return this.hasAttribute("disabled") || this.getAttribute("aria-disabled") === "true";\n    }\n    set disabled(value) {\n      this.toggleAttribute("disabled", Boolean(value));\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:inline-flex;align-items:center;justify-content:center;min-height:2.3rem;min-width:2.75rem;padding:.55rem .78rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-pill,999px);background:var(--uib-color-surface,#fff);color:var(--uib-color-ink,#13294b);font:inherit;font-weight:850;line-height:1.2;cursor:pointer;user-select:none;outline:none}:host(:focus-visible){box-shadow:var(--uib-focus-ring,0 0 0 4px rgba(23,74,139,.25))}:host([selected]),:host([aria-selected="true"]){border-color:var(--uib-color-primary,#174a8b);background:var(--uib-color-primary,#174a8b);color:var(--uib-color-primary-contrast,#fff)}:host([disabled]),:host([aria-disabled="true"]){cursor:not-allowed;opacity:.58}::slotted(*){pointer-events:none} </style><slot></slot>`;\n    }\n  };\n  var UibTabPanel = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected"];\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block;padding:1rem;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff)}:host([hidden]){display:none!important} </style><slot></slot>`;\n    }\n  };\n  var UibTabs = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "selected", "orientation"];\n    }\n    constructor() {\n      super();\n      this._reflectingSelected = false;\n      this._pendingSelected = null;\n      this._syncing = false;\n      this._observer = null;\n      this._boundClick = (event) => this._handleClick(event);\n      this._boundKeydown = (event) => this._handleKeydown(event);\n    }\n    get selected() {\n      return this.getAttribute("selected") || "";\n    }\n    set selected(value) {\n      if (value === null || value === void 0 || value === "") this.removeAttribute("selected");\n      else this.setAttribute("selected", String(value));\n    }\n    get orientation() {\n      return this.getAttribute("orientation") === "vertical" ? "vertical" : "horizontal";\n    }\n    set orientation(value) {\n      if (value === "vertical") this.setAttribute("orientation", "vertical");\n      else this.setAttribute("orientation", "horizontal");\n    }\n    connectedCallback() {\n      this.render();\n      this._connectObserver();\n      this._syncTabs({ emit: false });\n    }\n    disconnectedCallback() {\n      this._observer?.disconnect();\n      this._observer = null;\n      this.removeEventListener("click", this._boundClick);\n      this.removeEventListener("keydown", this._boundKeydown);\n    }\n    attributeChangedCallback(name, oldValue, newValue) {\n      if (oldValue === newValue) return;\n      if (name === "selected" && !this._reflectingSelected) this._pendingSelected = newValue;\n      if (this.isConnected) {\n        this.render();\n        this._syncTabs({ emit: false });\n      }\n    }\n    render() {\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `:host{display:block}.uib-tabs{display:grid;gap:.75rem}.uib-tabs--vertical{grid-template-columns:max-content minmax(0,1fr);align-items:start}.uib-tabs__list{display:flex;gap:.35rem;flex-wrap:wrap}.uib-tabs--vertical .uib-tabs__list{flex-direction:column;align-items:stretch}.uib-tabs__panels{min-width:0}@media(max-width:640px){.uib-tabs--vertical{grid-template-columns:1fr}.uib-tabs--vertical .uib-tabs__list{flex-direction:row;align-items:center}} </style><div class="uib-tabs uib-tabs--` + escapeHtml(this.orientation) + `" part="base"><div class="uib-tabs__list" part="tablist" role="tablist" aria-orientation="` + escapeHtml(this.orientation) + `"><slot name="tab"></slot></div><div class="uib-tabs__panels" part="panels"><slot name="panel"></slot></div></div>`;\n      this.removeEventListener("click", this._boundClick);\n      this.removeEventListener("keydown", this._boundKeydown);\n      this.addEventListener("click", this._boundClick);\n      this.addEventListener("keydown", this._boundKeydown);\n    }\n    _connectObserver() {\n      this._observer?.disconnect();\n      this._observer = new MutationObserver(() => this._syncTabs({ emit: false }));\n      this._observer.observe(this, {\n        childList: true,\n        attributes: true,\n        subtree: true,\n        attributeFilter: ["disabled", "aria-disabled"]\n      });\n    }\n    _tabs() {\n      return Array.from(this.children).filter((child) => child.localName === "uib-tab");\n    }\n    _panels() {\n      return Array.from(this.children).filter((child) => child.localName === "uib-tab-panel");\n    }\n    _isDisabled(tab) {\n      return tab.hasAttribute("disabled") || tab.getAttribute("aria-disabled") === "true";\n    }\n    _setManagedAttribute(element, name, value) {\n      if (element.getAttribute(name) !== value) element.setAttribute(name, value);\n    }\n    _parseSelected() {\n      const value = this._pendingSelected ?? this.getAttribute("selected");\n      if (value === null || value === void 0 || value === "") return null;\n      const parsed = Number(value);\n      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;\n    }\n    _firstEnabledIndex(tabs) {\n      return tabs.findIndex((tab) => !this._isDisabled(tab));\n    }\n    _lastEnabledIndex(tabs) {\n      for (let index = tabs.length - 1; index >= 0; index -= 1) {\n        if (!this._isDisabled(tabs[index])) return index;\n      }\n      return -1;\n    }\n    _normalizeSelected(tabs) {\n      const requested = this._parseSelected();\n      if (requested !== null && tabs[requested] && !this._isDisabled(tabs[requested])) return requested;\n      return this._firstEnabledIndex(tabs);\n    }\n    _reflectSelected(index) {\n      this._reflectingSelected = true;\n      if (index >= 0) this.setAttribute("selected", String(index));\n      else this.removeAttribute("selected");\n      this._reflectingSelected = false;\n      this._pendingSelected = null;\n    }\n    _syncTabs({ emit = false, oldValue = null } = {}) {\n      if (this._syncing) return;\n      this._syncing = true;\n      const tabs = this._tabs();\n      const panels = this._panels();\n      const selectedIndex = this._normalizeSelected(tabs);\n      tabs.forEach((tab, index) => {\n        const selected = index === selectedIndex;\n        const disabled = this._isDisabled(tab);\n        const panel = panels[index];\n        const tabId = tab.id || `${this.componentId}-tab-${index}`;\n        const panelId = panel?.id || `${this.componentId}-panel-${index}`;\n        if (!tab.id) tab.id = tabId;\n        tab.slot = "tab";\n        this._setManagedAttribute(tab, "role", "tab");\n        this._setManagedAttribute(tab, "aria-selected", selected ? "true" : "false");\n        this._setManagedAttribute(tab, "aria-disabled", disabled ? "true" : "false");\n        if (panel) this._setManagedAttribute(tab, "aria-controls", panelId);\n        else tab.removeAttribute("aria-controls");\n        tab.toggleAttribute("selected", selected);\n        tab.tabIndex = selected || selectedIndex < 0 && index === 0 ? 0 : -1;\n      });\n      panels.forEach((panel, index) => {\n        const selected = index === selectedIndex;\n        const tab = tabs[index];\n        const tabId = tab?.id || `${this.componentId}-tab-${index}`;\n        const panelId = panel.id || `${this.componentId}-panel-${index}`;\n        if (!panel.id) panel.id = panelId;\n        panel.slot = "panel";\n        this._setManagedAttribute(panel, "role", "tabpanel");\n        if (tab) this._setManagedAttribute(panel, "aria-labelledby", tabId);\n        else panel.removeAttribute("aria-labelledby");\n        panel.toggleAttribute("hidden", !selected);\n        panel.toggleAttribute("selected", selected);\n        panel.tabIndex = selected ? 0 : -1;\n      });\n      this._reflectSelected(selectedIndex);\n      this._syncing = false;\n      const newValue = selectedIndex >= 0 ? selectedIndex : null;\n      if (emit && oldValue !== newValue) this.emitValueChange("uib-tabs-change", oldValue, newValue);\n    }\n    _selectIndex(index, { emit = true, focus = true } = {}) {\n      const tabs = this._tabs();\n      if (!tabs[index] || this._isDisabled(tabs[index])) {\n        if (focus && tabs[index]) tabs[index].focus();\n        return;\n      }\n      const oldValue = this._normalizeSelected(tabs);\n      this._pendingSelected = String(index);\n      this._syncTabs({ emit, oldValue: oldValue >= 0 ? oldValue : null });\n      if (focus) tabs[index]?.focus();\n    }\n    _handleClick(event) {\n      const tab = event.target.closest?.("uib-tab");\n      if (!tab || tab.parentElement !== this) return;\n      const index = this._tabs().indexOf(tab);\n      this._selectIndex(index, { emit: true, focus: true });\n    }\n    _handleKeydown(event) {\n      const currentTab = event.target.closest?.("uib-tab");\n      if (!currentTab || currentTab.parentElement !== this) return;\n      const tabs = this._tabs();\n      const currentIndex = tabs.indexOf(currentTab);\n      if (currentIndex < 0) return;\n      const nextKey = this.orientation === "vertical" ? "ArrowDown" : "ArrowRight";\n      const previousKey = this.orientation === "vertical" ? "ArrowUp" : "ArrowLeft";\n      if (event.key === nextKey || event.key === previousKey) {\n        event.preventDefault();\n        const direction = event.key === nextKey ? 1 : -1;\n        const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;\n        tabs[nextIndex]?.focus();\n        if (!this._isDisabled(tabs[nextIndex])) this._selectIndex(nextIndex, { emit: true, focus: false });\n      } else if (event.key === "Home") {\n        event.preventDefault();\n        this._selectIndex(this._firstEnabledIndex(tabs), { emit: true, focus: true });\n      } else if (event.key === "End") {\n        event.preventDefault();\n        this._selectIndex(this._lastEnabledIndex(tabs), { emit: true, focus: true });\n      } else if (event.key === "Enter" || event.key === " ") {\n        event.preventDefault();\n        this._selectIndex(currentIndex, { emit: true, focus: true });\n      }\n    }\n  };\n  var UibSplitter = class extends UibLayoutBase {\n    static get observedAttributes() {\n      return [...UibBaseElement.commonAttributes, "position"];\n    }\n    render() {\n      const position = this.getAttribute("position") || "1fr 1fr";\n      if (!this.shadowRoot) this.attachShadow({ mode: "open" });\n      this.shadowRoot.innerHTML = `<style> ` + baseStyles + `.uib-splitter{display:grid;grid-template-columns:` + escapeHtml(position) + `;gap:var(--uib-space-4,1rem)}.uib-splitter__pane{min-width:0;border:1px solid var(--uib-color-border,#d9e2f0);border-radius:var(--uib-radius-lg,1rem);background:var(--uib-color-surface,#fff);padding:1rem}@media(max-width:700px){.uib-splitter{grid-template-columns:1fr}} </style><div class="uib-splitter" part="base"><section class="uib-splitter__pane" part="pane-start"><slot name="start"></slot></section><section class="uib-splitter__pane" part="pane-end"><slot name="end"></slot><slot></slot></section></div>`;\n    }\n  };\n  defineUiBaseElement("uib-stack", UibStack);\n  defineUiBaseElement("uib-grid", UibGrid);\n  defineUiBaseElement("uib-row", UibRow);\n  defineUiBaseElement("uib-column", UibColumn);\n  defineUiBaseElement("uib-panel", UibPanel);\n  defineUiBaseElement("uib-card", UibCard);\n  defineUiBaseElement("uib-dialog", UibDialog);\n  defineUiBaseElement("uib-accordion", UibAccordion);\n  defineUiBaseElement("uib-tab", UibTab);\n  defineUiBaseElement("uib-tab-panel", UibTabPanel);\n  defineUiBaseElement("uib-tabs", UibTabs);\n  defineUiBaseElement("uib-splitter", UibSplitter);\n\n  // ../ui-base/packages/ui-base-ui/src/platform/definition.js\n  function copySerializable(value) {\n    const seen = /* @__PURE__ */ new Set();\n    const visit = (item, path = "$") => {\n      if (item === null || typeof item === "string" || typeof item === "boolean") return;\n      if (typeof item === "number" && Number.isFinite(item)) return;\n      if (!item || typeof item !== "object") throw new TypeError(`${path} must contain JSON values only.`);\n      if (seen.has(item)) throw new TypeError(`${path} contains a cycle.`);\n      if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) throw new TypeError(`${path} contains a runtime object.`);\n      seen.add(item);\n      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {\n        if (Array.isArray(item) && key === "length") continue;\n        if (["__proto__", "constructor", "prototype"].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} is not a data field.`);\n        visit(descriptor.value, `${path}.${key}`);\n      }\n      seen.delete(item);\n    };\n    visit(value);\n    return JSON.parse(JSON.stringify(value));\n  }\n  function freezeDefinition(value) {\n    for (const child of Object.values(value)) if (child && typeof child === "object") freezeDefinition(child);\n    return Object.freeze(value);\n  }\n  var isSettingVisible = (setting, values) => !setting.visibleWhen || values[setting.visibleWhen.setting] === setting.visibleWhen.equals;\n  function defaultSettings(definition) {\n    return Object.fromEntries(Object.entries(definition.builder.settings).map(([name, setting]) => [name, setting.default]));\n  }\n  function safeAuthoringUrl(value, image = false) {\n    if (!value) return true;\n    if (typeof value !== "string" || /[\\u0000-\\u0020\\u007f]/.test(value.trim())) return false;\n    const input = value.trim();\n    if (input.startsWith("//") || input.includes("\\\\")) return false;\n    if (!/^[a-z][a-z\\d+.-]*:/i.test(input)) return true;\n    return image ? /^https?:/i.test(input) : /^(https?|mailto|tel):/i.test(input);\n  }\n  function validateDefinition(input) {\n    const errors = [];\n    let definition;\n    try {\n      definition = copySerializable(input);\n    } catch (error) {\n      return [error.message];\n    }\n    const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);\n    if (!object(definition)) return ["Component Definition must be an object."];\n    if (definition.schemaVersion !== "1.0.0") errors.push("Unsupported Component Definition schema version.");\n    for (const field of ["componentId", "name", "displayName", "description"]) if (typeof definition.identity?.[field] !== "string" || field !== "description" && !definition.identity[field].trim()) errors.push(`identity.${field} is required.`);\n    if (!["platform", "application"].includes(definition.ownership?.scope)) errors.push("Scope must be platform or application.");\n    if (!definition.ownership?.package?.packageId || !definition.version?.packageVersion) errors.push("Owning package and package version are required.");\n    if (!["code", "composite"].includes(definition.implementation?.type)) errors.push("Implementation type must be code or composite.");\n    if (definition.implementation?.type === "composite") errors.push("Composite graph validation is outside this reference stage.");\n    if (typeof definition.implementation?.tagName !== "string" || !definition.implementation.tagName.includes("-")) errors.push("A custom-element tag is required.");\n    if (definition.implementation?.runtimeBinding?.kind !== "custom-element" || definition.implementation.runtimeBinding.tagName !== definition.implementation.tagName) errors.push("Runtime binding must identify the declared custom element.");\n    if (typeof definition.implementation?.importPath !== "string" || typeof definition.implementation?.exportName !== "string") errors.push("Code import path and export name are required.");\n    if (!Array.isArray(definition.implementation?.aliases) || definition.implementation.aliases.some((alias) => !object(alias) || typeof alias.importPath !== "string" || typeof alias.exportName !== "string")) errors.push("Compatibility aliases must declare import paths and export names.");\n    if (definition.tagName !== definition.implementation?.tagName || definition.module !== definition.implementation?.module) errors.push("Legacy manifest projections must match the canonical implementation.");\n    if (!object(definition.runtime?.attributes) || !object(definition.runtime?.properties) || !object(definition.runtime?.events) || !Array.isArray(definition.runtime?.slots) || definition.runtime.slots.some((slot) => !object(slot) || typeof slot.name !== "string")) errors.push("Runtime API sections are required.");\n    if (!object(definition.builder?.settings) || Object.values(definition.builder.settings).some((setting) => !object(setting)) || !Array.isArray(definition.builder?.groups) || definition.builder.groups.some((group) => !object(group) || typeof group.id !== "string")) errors.push("Builder settings/groups are required.");\n    if (!Array.isArray(definition.capabilities) || definition.capabilities.some((capability) => typeof capability !== "string")) errors.push("Capabilities must be named strings.");\n    if (!object(definition.presentation) || !Array.isArray(definition.presentation.cssVariables)) errors.push("Presentation styling hooks are required.");\n    if (!object(definition.dependencies) || !Array.isArray(definition.dependencies.packages) || !Array.isArray(definition.dependencies.services)) errors.push("Package and service dependencies are required.");\n    if (!object(definition.lifecycle) || !["installed", "workspace", "published"].includes(definition.lifecycle.state)) errors.push("An explicit lifecycle state is required.");\n    if (errors.length) return errors;\n    const groups = new Set(definition.builder.groups.map((group) => group.id));\n    const slots = new Set(definition.runtime.slots.map((slot) => slot.name));\n    for (const [name, projection] of Object.entries(definition.presentation.settings || {})) {\n      const setting = definition.builder.settings[name];\n      if (!setting || projection.type !== "select" || JSON.stringify(projection.options) !== JSON.stringify(setting.enum)) errors.push(`${name} legacy presentation projection must match its Builder setting.`);\n    }\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      if (!groups.has(setting.group)) errors.push(`${name} references an unknown editor group.`);\n      if (!["string", "boolean", "number"].includes(setting.type) || typeof setting.default !== setting.type) errors.push(`${name} has an invalid type/default.`);\n      if (setting.enum && !setting.enum.includes(setting.default)) errors.push(`${name} default is outside its allowed values.`);\n      const binding = setting.binding || {};\n      if (binding.kind === "attribute" && !definition.runtime.attributes[binding.name]) errors.push(`${name} binds an unknown attribute.`);\n      else if (binding.kind === "property" && !definition.runtime.properties[binding.name]?.writable) errors.push(`${name} binds a read-only or unknown property.`);\n      else if (binding.kind === "slot" && (!slots.has(binding.name) || !["text", "image"].includes(binding.content))) errors.push(`${name} binds an invalid slot.`);\n      else if (binding.kind === "event" && !definition.runtime.events[binding.name]) errors.push(`${name} binds an unknown event.`);\n      else if (binding.kind === "cssProperty" && !definition.presentation.cssVariables?.includes(binding.name)) errors.push(`${name} binds an unknown styling hook.`);\n      else if (!["attribute", "property", "slot", "slotMetadata", "event", "mode", "cssProperty"].includes(binding.kind)) errors.push(`${name} has an unsupported binding.`);\n      if (setting.visibleWhen && !definition.builder.settings[setting.visibleWhen.setting]) errors.push(`${name} has an unknown visibility condition.`);\n    }\n    for (const [name, setting] of Object.entries(definition.builder.definitionSettings || {})) {\n      if (!["identity.displayName", "identity.description"].includes(setting.binding?.path)) errors.push(`${name} cannot edit this definition field in V1.`);\n    }\n    return errors;\n  }\n  function validateSettings(definition, input, { registry, resolveHandlers = false } = {}) {\n    const errors = [];\n    let values;\n    try {\n      values = copySerializable(input);\n    } catch (error) {\n      return [error.message];\n    }\n    if (!values || Array.isArray(values) || typeof values !== "object") return ["Settings must be an object."];\n    for (const name of Object.keys(values)) if (!definition.builder.settings[name]) errors.push(`Unknown setting: ${name}.`);\n    const effective = { ...defaultSettings(definition), ...values };\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      const value = effective[name];\n      if (typeof value !== setting.type || setting.type === "number" && !Number.isFinite(value)) {\n        errors.push(`${setting.label} must be ${setting.type}.`);\n        continue;\n      }\n      if (setting.enum && !setting.enum.includes(value)) errors.push(`${setting.label} has an unsupported value.`);\n      if (!isSettingVisible(setting, effective) && value !== setting.default) errors.push(`${setting.label} is not allowed in this interaction mode.`);\n      if ((setting.format === "url" || setting.format === "image-url") && !safeAuthoringUrl(value, setting.format === "image-url")) errors.push(`${setting.label} uses an unsupported URL.`);\n      if (resolveHandlers && setting.binding.kind === "event" && value && !registry?.hasHandler(value)) errors.push(`Handler is not registered: ${value}.`);\n    }\n    for (const rule of definition.builder.validation || []) {\n      const applies = !rule.when || effective[rule.when.setting] === rule.when.equals;\n      if (!applies) continue;\n      if (rule.kind === "requiredWhen" && !String(effective[rule.setting] || "").trim()) errors.push(`${definition.builder.settings[rule.setting].label} is required.`);\n      if (rule.kind === "oneOfRequiredWhen" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("An action or action token is required.");\n      if (rule.kind === "accessibleNameWhenInteractive" && effective.interactionMode !== "none" && !rule.settings.some((name) => String(effective[name] || "").trim())) errors.push("Interactive cards need an accessible name.");\n    }\n    return errors;\n  }\n\n  // ../ui-base/packages/ui-base-ui/src/platform/renderer.js\n  function renderComponentInstance(definition, instance, { registry, document: ownerDocument = document, preview = false, onEvent = () => {\n  } } = {}) {\n    if (definition.implementation.type !== "code") throw new Error("Composite rendering is outside this reference stage.");\n    if (definition.implementation.runtimeBinding.kind !== "custom-element") throw new Error("Unsupported runtime binding.");\n    const errors = validateSettings(definition, instance.settings, { registry, resolveHandlers: !preview });\n    if (instance.componentId !== definition.identity.componentId) errors.push("Instance Component identity does not match its Definition.");\n    const serviceRefs = copySerializable(instance.serviceRefs || {});\n    const declaredServices = definition.dependencies.services || [];\n    for (const name of Object.keys(serviceRefs)) if (!declaredServices.some((service) => service.name === name)) errors.push(`Unknown service reference: ${name}.`);\n    for (const service of declaredServices) if (service.required && !serviceRefs[service.name]) errors.push(`Service reference is required: ${service.name}.`);\n    if (errors.length) throw new Error(errors.join("\\n"));\n    const tag = definition.implementation.runtimeBinding.tagName;\n    if (!ownerDocument.defaultView.customElements.get(tag)) throw new Error(`Runtime implementation is not registered: ${tag}.`);\n    const element = ownerDocument.createElement(tag);\n    const values = { ...defaultSettings(definition), ...instance.settings };\n    for (const [name, setting] of Object.entries(definition.builder.settings)) {\n      if (!isSettingVisible(setting, values)) continue;\n      const value = values[name];\n      const binding = setting.binding;\n      if (binding.kind === "attribute") {\n        if (setting.type === "boolean") element.toggleAttribute(binding.name, value);\n        else if (value !== "") element.setAttribute(binding.name, String(value));\n      } else if (binding.kind === "property") element[binding.name] = value;\n      else if (binding.kind === "cssProperty") element.style.setProperty(binding.name, value);\n      else if (binding.kind === "slot" && value !== "") {\n        const child = ownerDocument.createElement(binding.content === "image" ? "img" : "span");\n        if (binding.name !== "default") child.slot = binding.name;\n        if (binding.content === "image") {\n          child.src = value;\n          child.alt = values[binding.altSetting] || "";\n        } else child.textContent = value;\n        element.append(child);\n      }\n    }\n    for (const [name, value] of Object.entries(definition.builder.interactionModes?.[values.interactionMode]?.attributes || {})) {\n      if (typeof value === "boolean") element.toggleAttribute(name, value);\n      else element.setAttribute(name, String(value));\n    }\n    for (const service of declaredServices) if (serviceRefs[service.name]) element[service.property] = registry.service(serviceRefs[service.name]);\n    for (const [name, contract] of Object.entries(definition.runtime.events)) {\n      element.addEventListener(name, (event) => {\n        if (event.target !== element) return;\n        const detail = Object.fromEntries(Object.keys(contract.detail).filter((key) => event.detail?.[key] !== void 0).map((key) => [key, event.detail[key]]));\n        const payload = copySerializable(detail);\n        onEvent({ type: name, detail: payload });\n        if (preview) {\n          if (event.cancelable) event.preventDefault();\n          return;\n        }\n        const setting = Object.entries(definition.builder.settings).find(([, item]) => item.binding.kind === "event" && item.binding.name === name);\n        const handlerId = setting && values[setting[0]];\n        if (handlerId && registry.handler(handlerId)(payload, { element, event }) === false && event.cancelable) event.preventDefault();\n      });\n    }\n    if (preview) element.addEventListener("click", (event) => {\n      if (event.composedPath().some((node) => node?.localName === "a")) event.preventDefault();\n    }, { capture: true });\n    return element;\n  }\n\n  // ../ui-base/packages/ui-base-ui/src/platform/registry.js\n  var ComponentRegistry = class {\n    #definitions = /* @__PURE__ */ new Map();\n    #routes = /* @__PURE__ */ new Map();\n    #handlers = /* @__PURE__ */ new Map();\n    #services = /* @__PURE__ */ new Map();\n    registerManifest(manifest, { packageId, scope = "platform" } = {}) {\n      if (!packageId || !Array.isArray(manifest?.components)) throw new Error("Manifest components and package owner are required.");\n      const staged = [];\n      const ids = new Set(this.#definitions.keys());\n      for (const entry of manifest.components) {\n        if (!entry.schemaVersion) continue;\n        const definition = copySerializable(entry);\n        const errors = validateDefinition(definition);\n        if (definition.ownership?.package?.packageId !== packageId || definition.ownership?.scope !== scope) errors.push("Definition does not match its declared owning package/scope.");\n        if (ids.has(definition.identity?.componentId)) errors.push("Component identity is already registered.");\n        if (errors.length) throw new Error(errors.join("\\n"));\n        ids.add(definition.identity.componentId);\n        staged.push(freezeDefinition(definition));\n      }\n      for (const definition of staged) {\n        const id = definition.identity.componentId;\n        this.#definitions.set(id, definition);\n        const implementation = definition.implementation;\n        const routes = [\n          id,\n          implementation.tagName,\n          definition.identity.name,\n          `${scope}:${packageId}:${implementation.tagName}`,\n          implementation.importPath,\n          `${implementation.importPath}#${implementation.exportName}`,\n          ...(implementation.aliases || []).flatMap((alias) => [alias.importPath, `${alias.importPath}#${alias.exportName}`])\n        ];\n        for (const route of routes) {\n          if (!this.#routes.has(route)) this.#routes.set(route, /* @__PURE__ */ new Set());\n          this.#routes.get(route).add(id);\n        }\n      }\n      return staged;\n    }\n    resolve(reference, { packageId, scope } = {}) {\n      const candidates = [...this.#routes.get(reference) || []].map((id) => this.#definitions.get(id)).filter((definition) => (!packageId || definition.ownership.package.packageId === packageId) && (!scope || definition.ownership.scope === scope));\n      if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous component route: ${reference}. Specify owner/scope.` : `Unknown component: ${reference}.`);\n      return candidates[0];\n    }\n    discover({ scope, capability } = {}) {\n      return [...this.#definitions.values()].filter((definition) => (!scope || definition.ownership.scope === scope) && (!capability || definition.capabilities.includes(capability)));\n    }\n    registerHandler(id, handler) {\n      if (!id || typeof handler !== "function" || this.#handlers.has(id)) throw new Error("A unique handler ID and function are required.");\n      this.#handlers.set(id, handler);\n    }\n    hasHandler(id) {\n      return this.#handlers.has(id);\n    }\n    handler(id) {\n      if (!this.#handlers.has(id)) throw new Error(`Handler is not registered: ${id}.`);\n      return this.#handlers.get(id);\n    }\n    registerService(id, service) {\n      if (!id || service == null || this.#services.has(id)) throw new Error("A unique service ID and runtime service are required.");\n      this.#services.set(id, service);\n    }\n    service(id) {\n      if (!this.#services.has(id)) throw new Error(`Service is not registered: ${id}.`);\n      return this.#services.get(id);\n    }\n  };\n\n  // ../ui-base/packages/ui-base-ui/ui.component.json\n  var ui_component_default = {\n    components: [\n      {\n        tagName: "uib-heading",\n        module: "./src/content/uib-heading.js",\n        importPath: "./heading",\n        presentation: {\n          settings: {\n            size: {\n              type: "select",\n              options: [\n                "compact",\n                "default",\n                "large"\n              ],\n              inheritable: true\n            },\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-heading-block",\n        module: "./src/content/uib-heading-block.js",\n        importPath: "./heading-block",\n        presentation: {\n          settings: {\n            size: {\n              type: "select",\n              options: [\n                "compact",\n                "default",\n                "large"\n              ],\n              inheritable: true\n            },\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-card",\n        module: "./src/layout/uib-card.js",\n        importPath: "./card",\n        presentation: {\n          settings: {\n            variant: {\n              type: "select",\n              options: [\n                "elevated",\n                "outlined",\n                "flat"\n              ],\n              inheritable: true\n            },\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          },\n          parts: [\n            "base",\n            "media",\n            "header",\n            "body",\n            "footer"\n          ],\n          cssVariables: [\n            "--uib-color-ink",\n            "--uib-font-family-sans",\n            "--uib-color-border",\n            "--uib-radius-lg",\n            "--uib-color-surface",\n            "--uib-color-surface-soft",\n            "--uib-shadow-sm",\n            "--uib-space-3",\n            "--uib-space-4",\n            "--uib-focus-ring",\n            "--uib-color-primary"\n          ]\n        },\n        schemaVersion: "1.0.0",\n        identity: {\n          componentId: "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1",\n          name: "card",\n          displayName: "Card",\n          description: "Repeatable content surface with optional link, action and selection behavior."\n        },\n        ownership: {\n          scope: "platform",\n          package: {\n            packageId: "@ui-base/ui",\n            scope: "platform",\n            version: "0.5.1"\n          },\n          provenance: {\n            origin: "installed-package",\n            promotedFromComponentId: null,\n            promotedFromRevisionId: null\n          }\n        },\n        implementation: {\n          type: "code",\n          tagName: "uib-card",\n          module: "./src/layout/uib-card.js",\n          importPath: "@ui-base/ui/card",\n          exportName: "UibCard",\n          runtimeBinding: {\n            kind: "custom-element",\n            tagName: "uib-card"\n          },\n          aliases: [\n            {\n              importPath: "@ui-base/ui",\n              exportName: "UibCard"\n            },\n            {\n              importPath: "@ui-base/ui/layout",\n              exportName: "UibCard"\n            }\n          ],\n          registrationSideEffects: [\n            "uib-stack",\n            "uib-grid",\n            "uib-row",\n            "uib-column",\n            "uib-panel",\n            "uib-card",\n            "uib-dialog",\n            "uib-accordion",\n            "uib-tab",\n            "uib-tab-panel",\n            "uib-tabs",\n            "uib-splitter",\n            "uib-icon"\n          ]\n        },\n        version: {\n          packageVersion: "0.5.1",\n          runtimeCompatibility: "^0.5.1",\n          revisionId: null\n        },\n        maturity: "experimental",\n        category: "content-surfaces",\n        runtime: {\n          attributes: {\n            name: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            label: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            help: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "help-mode": {\n              type: "string",\n              default: "tooltip",\n              observed: true,\n              serialization: "string"\n            },\n            title: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            disabled: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            readonly: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            required: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            hidden: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            invalid: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            error: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "css-class": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "aria-label": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "aria-describedby": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            heading: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            variant: {\n              type: "string",\n              default: "elevated",\n              observed: true,\n              serialization: "string",\n              enum: [\n                "elevated",\n                "outlined",\n                "flat"\n              ]\n            },\n            density: {\n              type: "string",\n              default: "comfortable",\n              observed: true,\n              serialization: "string",\n              enum: [\n                "comfortable",\n                "compact"\n              ]\n            },\n            href: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            target: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            rel: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            action: {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            "action-token": {\n              type: "string",\n              default: "",\n              observed: true,\n              serialization: "string"\n            },\n            interactive: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            selectable: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            },\n            selected: {\n              type: "boolean",\n              default: false,\n              observed: true,\n              serialization: "presence"\n            }\n          },\n          properties: {\n            name: {\n              type: "string",\n              attribute: "name",\n              writable: true,\n              default: ""\n            },\n            label: {\n              type: "string",\n              attribute: "label",\n              writable: true,\n              default: ""\n            },\n            help: {\n              type: "string",\n              attribute: "help",\n              writable: true,\n              default: ""\n            },\n            helpMode: {\n              type: "string",\n              attribute: "help-mode",\n              writable: true,\n              default: "tooltip"\n            },\n            titleText: {\n              type: "string",\n              attribute: "title",\n              writable: true,\n              default: ""\n            },\n            disabled: {\n              type: "boolean",\n              attribute: "disabled",\n              writable: true,\n              default: false\n            },\n            readonly: {\n              type: "boolean",\n              attribute: "readonly",\n              writable: true,\n              default: false\n            },\n            required: {\n              type: "boolean",\n              attribute: "required",\n              writable: true,\n              default: false\n            },\n            hidden: {\n              type: "boolean",\n              attribute: "hidden",\n              writable: true,\n              default: false\n            },\n            invalid: {\n              type: "boolean",\n              attribute: "invalid",\n              writable: true,\n              default: false\n            },\n            error: {\n              type: "string",\n              attribute: "error",\n              writable: true,\n              default: ""\n            },\n            cssClass: {\n              type: "string",\n              attribute: "css-class",\n              writable: true,\n              default: ""\n            },\n            ariaLabel: {\n              type: "string",\n              attribute: "aria-label",\n              writable: false,\n              default: ""\n            },\n            ariaDescribedBy: {\n              type: "string",\n              attribute: "aria-describedby",\n              writable: false,\n              default: ""\n            },\n            heading: {\n              type: "string",\n              attribute: "heading",\n              writable: false,\n              default: "",\n              fallback: "label"\n            },\n            variant: {\n              type: "string",\n              attribute: "variant",\n              writable: false,\n              default: "elevated",\n              normalization: "lowercase-or-default"\n            },\n            density: {\n              type: "string",\n              attribute: "density",\n              writable: false,\n              default: "comfortable",\n              normalization: "exact-compact-or-default"\n            },\n            href: {\n              type: "string",\n              attribute: "href",\n              writable: false,\n              default: ""\n            },\n            target: {\n              type: "string",\n              attribute: "target",\n              writable: false,\n              default: ""\n            },\n            rel: {\n              type: "string",\n              attribute: "rel",\n              writable: false,\n              default: ""\n            },\n            action: {\n              type: "string",\n              attribute: "action",\n              writable: false,\n              default: ""\n            },\n            actionToken: {\n              type: "string",\n              attribute: "action-token",\n              writable: false,\n              default: ""\n            },\n            interactive: {\n              type: "boolean",\n              attribute: "interactive",\n              writable: false,\n              default: false,\n              computedFrom: [\n                "interactive",\n                "href",\n                "action",\n                "action-token",\n                "selectable"\n              ]\n            },\n            selectable: {\n              type: "boolean",\n              attribute: "selectable",\n              writable: false,\n              default: false\n            },\n            selected: {\n              type: "boolean",\n              attribute: "selected",\n              writable: true,\n              default: false,\n              programmaticSetEmits: false\n            },\n            componentId: {\n              type: "string",\n              writable: false,\n              role: "runtime-instance-id"\n            }\n          },\n          events: {\n            change: {\n              detail: {\n                name: "string",\n                oldValue: "boolean",\n                newValue: "boolean",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: false,\n              selectionAliasOf: "uib-card-select",\n              order: 1\n            },\n            "uib-card-select": {\n              detail: {\n                name: "string",\n                oldValue: "boolean",\n                newValue: "boolean",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: false,\n              order: 2\n            },\n            "uib-card-action": {\n              detail: {\n                name: "string",\n                action: "string",\n                actionToken: "string",\n                selected: "boolean"\n              },\n              bubbles: true,\n              composed: true,\n              cancelable: true,\n              order: 3,\n              cancellation: "prevent-original-event-default-after-selection"\n            }\n          },\n          slots: [\n            {\n              name: "default",\n              content: "text-or-elements"\n            },\n            {\n              name: "media",\n              content: "text-or-elements"\n            },\n            {\n              name: "header",\n              content: "text-or-elements"\n            },\n            {\n              name: "footer",\n              content: "text-or-elements"\n            }\n          ]\n        },\n        children: {\n          runtime: "unrestricted-for-compatibility",\n          builder: {\n            content: [\n              "text",\n              "image"\n            ],\n            nestedInteractiveInLink: false\n          }\n        },\n        builder: {\n          groups: [\n            {\n              id: "content",\n              label: "Content"\n            },\n            {\n              id: "appearance",\n              label: "Appearance"\n            },\n            {\n              id: "interaction",\n              label: "Interaction"\n            },\n            {\n              id: "state",\n              label: "State"\n            },\n            {\n              id: "accessibility",\n              label: "Accessibility"\n            },\n            {\n              id: "events",\n              label: "Event bindings"\n            }\n          ],\n          definitionSettings: {\n            displayName: {\n              label: "Display name",\n              type: "string",\n              required: true,\n              binding: {\n                kind: "definition",\n                path: "identity.displayName"\n              }\n            },\n            description: {\n              label: "Description",\n              type: "string",\n              editor: "textarea",\n              binding: {\n                kind: "definition",\n                path: "identity.description"\n              }\n            }\n          },\n          settings: {\n            heading: {\n              label: "Heading",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "heading"\n              }\n            },\n            label: {\n              label: "Fallback label",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "label"\n              }\n            },\n            body: {\n              label: "Body",\n              type: "string",\n              group: "content",\n              default: "Card body",\n              binding: {\n                kind: "slot",\n                name: "default",\n                content: "text"\n              },\n              editor: "textarea"\n            },\n            header: {\n              label: "Header content",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "header",\n                content: "text"\n              }\n            },\n            footer: {\n              label: "Footer",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "footer",\n                content: "text"\n              }\n            },\n            mediaSrc: {\n              label: "Image URL",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slot",\n                name: "media",\n                content: "image",\n                altSetting: "mediaAlt"\n              },\n              format: "image-url"\n            },\n            mediaAlt: {\n              label: "Image description",\n              type: "string",\n              group: "content",\n              default: "",\n              binding: {\n                kind: "slotMetadata",\n                slot: "media",\n                name: "alt"\n              }\n            },\n            variant: {\n              label: "Variant",\n              type: "string",\n              group: "appearance",\n              default: "elevated",\n              binding: {\n                kind: "attribute",\n                name: "variant"\n              },\n              editor: "select",\n              enum: [\n                "elevated",\n                "outlined",\n                "flat"\n              ]\n            },\n            density: {\n              label: "Density",\n              type: "string",\n              group: "appearance",\n              default: "comfortable",\n              binding: {\n                kind: "attribute",\n                name: "density"\n              },\n              editor: "select",\n              enum: [\n                "comfortable",\n                "compact"\n              ]\n            },\n            cssClass: {\n              label: "CSS classes",\n              type: "string",\n              group: "appearance",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "css-class"\n              }\n            },\n            interactionMode: {\n              label: "Interaction mode",\n              type: "string",\n              group: "interaction",\n              default: "none",\n              binding: {\n                kind: "mode"\n              },\n              editor: "select",\n              enum: [\n                "none",\n                "link",\n                "action",\n                "selectable"\n              ]\n            },\n            href: {\n              label: "Link URL",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "href"\n              },\n              format: "url",\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            target: {\n              label: "Link target",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "target"\n              },\n              editor: "select",\n              enum: [\n                "",\n                "_self",\n                "_blank",\n                "_parent",\n                "_top"\n              ],\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            rel: {\n              label: "Link relationship",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "rel"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            action: {\n              label: "Action",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "action"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            actionToken: {\n              label: "Action token",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "action-token"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            selected: {\n              label: "Initially selected",\n              type: "boolean",\n              group: "state",\n              default: false,\n              binding: {\n                kind: "attribute",\n                name: "selected"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "selectable"\n              }\n            },\n            disabled: {\n              label: "Disabled",\n              type: "boolean",\n              group: "state",\n              default: false,\n              binding: {\n                kind: "attribute",\n                name: "disabled"\n              }\n            },\n            name: {\n              label: "Event name",\n              type: "string",\n              group: "interaction",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "name"\n              }\n            },\n            ariaLabel: {\n              label: "Accessible name",\n              type: "string",\n              group: "accessibility",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "aria-label"\n              }\n            },\n            ariaDescribedBy: {\n              label: "Description IDs",\n              type: "string",\n              group: "accessibility",\n              default: "",\n              binding: {\n                kind: "attribute",\n                name: "aria-describedby"\n              }\n            },\n            actionHandler: {\n              label: "Action handler ID",\n              type: "string",\n              group: "events",\n              default: "",\n              binding: {\n                kind: "event",\n                name: "uib-card-action"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            selectionHandler: {\n              label: "Selection handler ID",\n              type: "string",\n              group: "events",\n              default: "",\n              binding: {\n                kind: "event",\n                name: "uib-card-select"\n              },\n              visibleWhen: {\n                setting: "interactionMode",\n                equals: "selectable"\n              }\n            }\n          },\n          interactionModes: {\n            none: {\n              attributes: {\n                interactive: false,\n                selectable: false\n              }\n            },\n            link: {\n              attributes: {\n                interactive: false,\n                selectable: false\n              }\n            },\n            action: {\n              attributes: {\n                interactive: true,\n                selectable: false\n              }\n            },\n            selectable: {\n              attributes: {\n                interactive: false,\n                selectable: true\n              }\n            }\n          },\n          validation: [\n            {\n              kind: "requiredWhen",\n              setting: "href",\n              when: {\n                setting: "interactionMode",\n                equals: "link"\n              }\n            },\n            {\n              kind: "oneOfRequiredWhen",\n              settings: [\n                "action",\n                "actionToken"\n              ],\n              when: {\n                setting: "interactionMode",\n                equals: "action"\n              }\n            },\n            {\n              kind: "accessibleNameWhenInteractive",\n              settings: [\n                "heading",\n                "label",\n                "header",\n                "ariaLabel"\n              ]\n            }\n          ],\n          responsive: {\n            supported: false\n          },\n          preview: {\n            renderer: "runtimeBinding",\n            navigation: "prevent",\n            eventHandlers: "observe-only"\n          },\n          eventBindings: {\n            handlerReference: "registered-handler-id",\n            cancellation: "synchronous-false-only",\n            selectionEvent: "uib-card-select"\n          }\n        },\n        capabilities: [\n          "surface",\n          "container",\n          "interactive",\n          "selectable",\n          "linkable"\n        ],\n        dependencies: {\n          packages: [\n            {\n              packageId: "@ui-base/core",\n              range: "^0.1.0"\n            },\n            {\n              packageId: "@ui-base/icons",\n              range: "^0.1.0"\n            }\n          ],\n          services: []\n        },\n        accessibility: {\n          modes: [\n            "section",\n            "link",\n            "button",\n            "toggle-button"\n          ],\n          keyboard: {\n            nonLink: [\n              "Enter",\n              "Space"\n            ],\n            link: "native"\n          },\n          namePrecedence: [\n            "aria-label",\n            "heading",\n            "label",\n            "header"\n          ],\n          disabled: "aria-disabled; remove-from-tab-order; block-activation"\n        },\n        lifecycle: {\n          state: "installed",\n          save: "workspace-only",\n          publication: "unimplemented-stage-gate",\n          publishedRevisionsImmutable: true,\n          rollback: "new-revision",\n          promotion: "new-identity-with-provenance"\n        },\n        clone: {\n          workspace: "new-workspace-and-instance-ids;same-component-identity",\n          component: "new-component-identity;retain-provenance"\n        },\n        deprecation: {\n          status: "none",\n          replacementComponentId: null\n        },\n        extensions: {}\n      },\n      {\n        tagName: "uib-panel",\n        module: "./src/layout/uib-panel.js",\n        importPath: "./panel",\n        presentation: {\n          settings: {\n            variant: {\n              type: "select",\n              options: [\n                "elevated",\n                "outlined",\n                "flat"\n              ],\n              inheritable: true\n            },\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-instruction",\n        module: "./src/content/uib-instruction.js",\n        importPath: "./instruction",\n        presentation: {\n          settings: {\n            density: {\n              type: "select",\n              options: [\n                "comfortable",\n                "compact"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      },\n      {\n        tagName: "uib-action-group",\n        module: "./src/actions/uib-action-group.js",\n        importPath: "./action-group",\n        presentation: {\n          settings: {\n            align: {\n              type: "select",\n              options: [\n                "start",\n                "center",\n                "end"\n              ],\n              inheritable: true\n            }\n          }\n        }\n      }\n    ]\n  };\n\n  // packages/visual-artifacts/src/source.ts\n  var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));\n  var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));\n  var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));\n\n  // packages/visual-artifacts/src/composition.ts\n  function routePath(route, params = {}) {\n    return route.path.replace(/:([A-Za-z][\\w]*)|\\[([A-Za-z][\\w]*)\\]/g, (_, colon, bracket) => {\n      const value = params[colon ?? bracket];\n      if (value === void 0) throw new Error(`Route parameter is required: ${colon ?? bracket}.`);\n      return encodeURIComponent(value);\n    });\n  }\n  function matchCompositionRoute(routes, pathname) {\n    for (const route of [...routes].sort((a, b) => Number(/:|\\[/.test(a.path)) - Number(/:|\\[/.test(b.path)))) {\n      const keys = [];\n      const pattern = route.path.split("/").map((part) => {\n        const parameter = /^(?::([A-Za-z][\\w]*)|\\[([A-Za-z][\\w]*)\\])$/.exec(part);\n        if (parameter) {\n          keys.push(parameter[1] ?? parameter[2]);\n          return "([^/]+)";\n        }\n        return part.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");\n      }).join("/");\n      const match = new RegExp(`^${pattern}/?$`).exec(pathname);\n      if (match) return { route, params: Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])) };\n    }\n    return void 0;\n  }\n\n  // src/client/fixture-preview/samples.ts\n  var FixtureDenied = class extends Error {\n    constructor(code) {\n      super(code);\n      this.code = code;\n    }\n    code;\n  };\n  function data(input) {\n    if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");\n    const descriptors = Object.getOwnPropertyDescriptors(input);\n    if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ["__proto__", "constructor", "prototype"].includes(key) || value.get || value.set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");\n    return input;\n  }\n  function fields(input, required, optional = []) {\n    if (required.some((key) => !Object.hasOwn(input, key)) || Object.getOwnPropertyNames(input).some((key) => ![...required, ...optional].includes(key))) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");\n  }\n  function text(value, key, limit = 512) {\n    if (typeof value !== "string" || value.length > limit || /[\\u0000-\\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);\n    return value;\n  }\n  function boolean(value) {\n    if (typeof value !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");\n    return value;\n  }\n  var surfaceKeys = ["fixture", "heading", "body", "footer", "variant", "density"];\n  var templates = Object.freeze({\n    person: Object.freeze({ routeId: "synthetic-person-route", pageId: "synthetic-person-page", path: "/people/:personId" }),\n    "project-item": Object.freeze({ routeId: "synthetic-project-route", pageId: "synthetic-project-page", path: "/projects/[projectId]/items/:itemId" })\n  });\n  function inspectRoute(sample) {\n    const route = templates[sample.template], path = routePath(route, sample.params);\n    const matched = matchCompositionRoute([route], path);\n    return { template: route.path, path, matched: matched?.params ?? null };\n  }\n  function validateSample(input) {\n    const value = data(input);\n    if (value.fixture === "route-inspector-v1") {\n      fields(value, ["fixture", "template", "params"]);\n      if (value.template !== "person" && value.template !== "project-item") throw new FixtureDenied("ROUTE_TEMPLATE_UNSUPPORTED");\n      const params = data(value.params), names = value.template === "person" ? ["personId"] : ["projectId", "itemId"];\n      fields(params, names);\n      const result = { fixture: value.fixture, template: value.template, params: Object.fromEntries(names.map((key) => {\n        const item = text(params[key], key, 128);\n        if (!item.trim()) throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);\n        try {\n          encodeURIComponent(item);\n        } catch {\n          throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);\n        }\n        return [key, item];\n      })) };\n      inspectRoute(result);\n      return result;\n    }\n    if (value.fixture !== "native-card-v1" && value.fixture !== "native-panel-v1") throw new FixtureDenied("FIXTURE_RENDERER_NOT_ADMITTED");\n    fields(value, [...surfaceKeys, ...value.fixture === "native-card-v1" ? ["selectable"] : ["collapsible", "open"]], value.fixture === "native-card-v1" ? ["header", "disabled", "selected"] : []);\n    const heading = text(value.heading, "heading"), body = text(value.body, "body"), footer = text(value.footer, "footer");\n    if (typeof value.variant !== "string" || !["outlined", "elevated", "flat"].includes(value.variant) || typeof value.density !== "string" || !["comfortable", "compact"].includes(value.density)) throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");\n    const surface = { heading, body, footer, variant: value.variant, density: value.density };\n    if (value.fixture === "native-panel-v1") return { fixture: value.fixture, ...surface, collapsible: boolean(value.collapsible), open: boolean(value.open) };\n    const selectable = boolean(value.selectable), selected = boolean(Object.hasOwn(value, "selected") ? value.selected : false);\n    if (selected && !selectable) throw new FixtureDenied("CARD_SELECTED_REQUIRES_SELECTABLE");\n    return { fixture: value.fixture, ...surface, header: text(Object.hasOwn(value, "header") ? value.header : "", "header"), selectable, disabled: boolean(Object.hasOwn(value, "disabled") ? value.disabled : false), selected };\n  }\n  var unsupportedFixtures = Object.freeze({\n    component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open",\n    package: "PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted",\n    regions: "REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted",\n    route: "ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus",\n    form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",\n    source: "EXECUTABLE_SOURCE_DENIED: no source functions or imports",\n    resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability",\n    saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"\n  });\n\n  // src/client/fixture-preview/protocol.ts\n  function validChannel(value, expected) {\n    if (!value || typeof value !== "object") return false;\n    const v = value;\n    const fields2 = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];\n    return Object.keys(v).length === fields2.length && Object.keys(v).every((key) => fields2.includes(key)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session && v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);\n  }\n\n  // src/client/fixture-preview/frame.ts\n  var channel = JSON.parse(document.documentElement.dataset.channel);\n  var parentOrigin = document.documentElement.dataset.parentOrigin;\n  var rendered = false;\n  document.addEventListener("submit", (event) => event.preventDefault(), true);\n  document.addEventListener("click", (event) => {\n    if (event.composedPath().some((item) => item instanceof Element && item.matches("a, input[type=file], [download]"))) event.preventDefault();\n  }, true);\n  document.addEventListener("dragover", (event) => event.preventDefault(), true);\n  document.addEventListener("drop", (event) => event.preventDefault(), true);\n  window.addEventListener("message", (event) => {\n    if (event.source !== parent || event.origin !== parentOrigin || !validChannel(event.data, channel) || event.data.type !== "render" || rendered) return;\n    rendered = true;\n    try {\n      const sample = validateSample(event.data.sample);\n      let element;\n      if (sample.fixture === "native-card-v1") {\n        const definition = ui_component_default.components.find((entry) => entry.schemaVersion && entry.tagName === "uib-card");\n        const registry = new ComponentRegistry();\n        registry.registerManifest({ components: [definition] }, { packageId: "@ui-base/ui" });\n        element = renderComponentInstance(definition, {\n          componentId: definition.identity.componentId,\n          settings: { heading: sample.heading, header: sample.header, body: sample.body, footer: sample.footer, variant: sample.variant, density: sample.density, interactionMode: sample.selectable ? "selectable" : "none", disabled: sample.disabled, selected: sample.selected, ariaLabel: sample.heading || "Synthetic Card" }\n        }, { registry, preview: true });\n      } else if (sample.fixture === "native-panel-v1") {\n        element = document.createElement("uib-panel");\n        if (!(element instanceof UibPanel)) throw new Error("PANEL_NATIVE_CLASS_UNAVAILABLE");\n        for (const key of ["heading", "variant", "density"]) element.setAttribute(key, sample[key]);\n        element.toggleAttribute("collapsible", sample.collapsible);\n        element.toggleAttribute("open", sample.open);\n        for (const [slot, text2] of [["", sample.body], ["footer", sample.footer]]) {\n          const child = document.createElement("span");\n          if (slot) child.slot = slot;\n          child.textContent = text2;\n          element.append(child);\n        }\n      } else {\n        element = document.createElement("pre");\n        element.inert = true;\n        element.textContent = JSON.stringify(inspectRoute(sample), null, 2);\n      }\n      const label = document.createElement("strong");\n      label.textContent = `SAMPLE DATA \\xB7 ${sample.fixture === "native-panel-v1" ? "Native Panel layout fixture \\xB7 not canonical Component parity" : sample.fixture === "route-inspector-v1" ? "Synthetic route-parameter inspector \\xB7 no Page rendering or navigation" : "Card fixture demonstration"}`;\n      document.body.replaceChildren(label, element);\n      parent.postMessage({ ...channel, type: "ready" }, parentOrigin);\n    } catch {\n      document.body.textContent = "Fixture unavailable";\n      parent.postMessage({ ...channel, type: "unavailable", reason: "NATIVE_RENDERER_REJECTED_FIXTURE" }, parentOrigin);\n    }\n  });\n})();\n';
  }
});

// packages/visual-artifacts/src/source.ts
var voidTags, optionalTags, blockTags;
var init_source = __esm({
  "packages/visual-artifacts/src/source.ts"() {
    "use strict";
    voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
    optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
    blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
  }
});

// packages/visual-artifacts/src/composition.ts
function routePath(route, params = {}) {
  return route.path.replace(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g, (_, colon, bracket) => {
    const value = params[colon ?? bracket];
    if (value === void 0) throw new Error(`Route parameter is required: ${colon ?? bracket}.`);
    return encodeURIComponent(value);
  });
}
function matchCompositionRoute(routes, pathname) {
  for (const route of [...routes].sort((a, b) => Number(/:|\[/.test(a.path)) - Number(/:|\[/.test(b.path)))) {
    const keys = [];
    const pattern = route.path.split("/").map((part) => {
      const parameter = /^(?::([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\])$/.exec(part);
      if (parameter) {
        keys.push(parameter[1] ?? parameter[2]);
        return "([^/]+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("/");
    const match = new RegExp(`^${pattern}/?$`).exec(pathname);
    if (match) return { route, params: Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])) };
  }
  return void 0;
}
var init_composition = __esm({
  "packages/visual-artifacts/src/composition.ts"() {
    "use strict";
    init_source();
  }
});

// src/client/fixture-preview/samples.ts
function data(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ["__proto__", "constructor", "prototype"].includes(key) || value.get || value.set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
  return input;
}
function fields(input, required, optional = []) {
  if (required.some((key) => !Object.hasOwn(input, key)) || Object.getOwnPropertyNames(input).some((key) => ![...required, ...optional].includes(key))) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
}
function text(value, key, limit = 512) {
  if (typeof value !== "string" || value.length > limit || /[\u0000-\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);
  return value;
}
function boolean(value) {
  if (typeof value !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
  return value;
}
function inspectRoute(sample) {
  const route = templates[sample.template], path = routePath(route, sample.params);
  const matched = matchCompositionRoute([route], path);
  return { template: route.path, path, matched: matched?.params ?? null };
}
function validateSample(input) {
  const value = data(input);
  if (value.fixture === "route-inspector-v1") {
    fields(value, ["fixture", "template", "params"]);
    if (value.template !== "person" && value.template !== "project-item") throw new FixtureDenied("ROUTE_TEMPLATE_UNSUPPORTED");
    const params = data(value.params), names = value.template === "person" ? ["personId"] : ["projectId", "itemId"];
    fields(params, names);
    const result = { fixture: value.fixture, template: value.template, params: Object.fromEntries(names.map((key) => {
      const item = text(params[key], key, 128);
      if (!item.trim()) throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);
      try {
        encodeURIComponent(item);
      } catch {
        throw new FixtureDenied(`ROUTE_PARAMETER_INVALID:${key}`);
      }
      return [key, item];
    })) };
    inspectRoute(result);
    return result;
  }
  if (value.fixture !== "native-card-v1" && value.fixture !== "native-panel-v1") throw new FixtureDenied("FIXTURE_RENDERER_NOT_ADMITTED");
  fields(value, [...surfaceKeys, ...value.fixture === "native-card-v1" ? ["selectable"] : ["collapsible", "open"]], value.fixture === "native-card-v1" ? ["header", "disabled", "selected"] : []);
  const heading = text(value.heading, "heading"), body = text(value.body, "body"), footer = text(value.footer, "footer");
  if (typeof value.variant !== "string" || !["outlined", "elevated", "flat"].includes(value.variant) || typeof value.density !== "string" || !["comfortable", "compact"].includes(value.density)) throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
  const surface = { heading, body, footer, variant: value.variant, density: value.density };
  if (value.fixture === "native-panel-v1") return { fixture: value.fixture, ...surface, collapsible: boolean(value.collapsible), open: boolean(value.open) };
  const selectable = boolean(value.selectable), selected = boolean(Object.hasOwn(value, "selected") ? value.selected : false);
  if (selected && !selectable) throw new FixtureDenied("CARD_SELECTED_REQUIRES_SELECTABLE");
  return { fixture: value.fixture, ...surface, header: text(Object.hasOwn(value, "header") ? value.header : "", "header"), selectable, disabled: boolean(Object.hasOwn(value, "disabled") ? value.disabled : false), selected };
}
function sampleSummary(sample) {
  if (sample.fixture === "route-inspector-v1") return JSON.stringify(inspectRoute(sample), null, 2);
  return [sample.heading, sample.fixture === "native-card-v1" ? sample.header : "", sample.body, sample.footer].filter(Boolean).join("\n");
}
var FixtureDenied, defaultSample, defaultPanelSample, defaultRouteSample, surfaceKeys, templates, unsupportedFixtures;
var init_samples = __esm({
  "src/client/fixture-preview/samples.ts"() {
    "use strict";
    init_composition();
    FixtureDenied = class extends Error {
      constructor(code) {
        super(code);
        this.code = code;
      }
      code;
    };
    defaultSample = () => ({ fixture: "native-card-v1", heading: "Synthetic Card", header: "", body: "Authored synthetic slot text", footer: "Synthetic footer", variant: "outlined", density: "comfortable", selectable: true, disabled: false, selected: false });
    defaultPanelSample = () => ({ fixture: "native-panel-v1", heading: "Synthetic Panel", body: "Synthetic Panel body", footer: "Synthetic Panel footer", variant: "outlined", density: "comfortable", collapsible: true, open: true });
    defaultRouteSample = () => ({ fixture: "route-inspector-v1", template: "person", params: { personId: "synthetic person" } });
    surfaceKeys = ["fixture", "heading", "body", "footer", "variant", "density"];
    templates = Object.freeze({
      person: Object.freeze({ routeId: "synthetic-person-route", pageId: "synthetic-person-page", path: "/people/:personId" }),
      "project-item": Object.freeze({ routeId: "synthetic-project-route", pageId: "synthetic-project-page", path: "/projects/[projectId]/items/:itemId" })
    });
    unsupportedFixtures = Object.freeze({
      component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open",
      package: "PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted",
      regions: "REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted",
      route: "ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus",
      form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",
      source: "EXECUTABLE_SOURCE_DENIED: no source functions or imports",
      resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability",
      saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"
    });
  }
});

// src/client/fixture-preview/protocol.ts
function validChannel(value, expected) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  const fields2 = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];
  return Object.keys(v).length === fields2.length && Object.keys(v).every((key) => fields2.includes(key)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session && v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);
}
var init_protocol = __esm({
  "src/client/fixture-preview/protocol.ts"() {
    "use strict";
  }
});

// src/client/fixture-preview/host.ts
async function digest(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}
async function fixtureCaptureId(sample) {
  return `fixture-sha256:${await digest(JSON.stringify({ policy: "fixture-sample-policy-v2", renderer: await digest(bootstrap_default), sample }))}`;
}
async function fixtureDocument(channel, parentOrigin) {
  const script = bootstrap_default.replace(/<\/script/gi, "<\\/script");
  const hash = await digest(script);
  const csp = `default-src 'none'; script-src 'sha256-${hash}'; script-src-attr 'none'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'`;
  return `<!doctype html><html data-channel="${attribute(JSON.stringify(channel))}" data-parent-origin="${attribute(parentOrigin)}"><head><meta http-equiv="Content-Security-Policy" content="${attribute(csp)}"><meta name="referrer" content="no-referrer"><title>Restricted fixture</title></head><body><script>${script}</script></body></html>`;
}
var attribute, FixtureHost;
var init_host = __esm({
  "src/client/fixture-preview/host.ts"() {
    "use strict";
    init_bootstrap();
    init_lifecycle();
    init_samples();
    init_protocol();
    attribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
    FixtureHost = class {
      constructor(container) {
        this.container = container;
      }
      container;
      frame;
      cancel;
      clear() {
        this.cancel?.();
        this.cancel = void 0;
        this.frame?.remove();
        this.frame = void 0;
        this.container.replaceChildren();
      }
      async render(identity, sequence, input) {
        this.clear();
        const sample = validateSample(input);
        const frame = document.createElement("iframe");
        this.frame = frame;
        frame.title = "Restricted fixture Preview";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.referrerPolicy = "no-referrer";
        frame.setAttribute("credentialless", "");
        frame.style.cssText = "width:100%;height:260px;border:1px solid #aaa";
        const channel = { nonce: crypto.randomUUID(), session: crypto.randomUUID(), identity: identityKey(identity), sequence };
        const source = await fixtureDocument(channel, location.origin);
        if (this.frame !== frame) throw new Error("FIXTURE_RENDER_CANCELED");
        return new Promise((resolve, reject) => {
          const finish = (error) => {
            clearTimeout(timer);
            window.removeEventListener("message", receive);
            frame.onload = null;
            if (this.frame === frame) this.cancel = void 0;
            if (error) {
              frame.remove();
              reject(new Error(error));
            } else resolve();
          };
          const receive = (event) => {
            if (this.frame !== frame || event.source !== frame.contentWindow || event.origin !== "null" || !validChannel(event.data, channel) || event.data.type === "render") return;
            finish(event.data.type === "ready" ? void 0 : event.data.reason ?? "FIXTURE_UNAVAILABLE");
          };
          const timer = setTimeout(() => finish("FIXTURE_BOOTSTRAP_UNAVAILABLE"), 5e3);
          this.cancel = () => finish("FIXTURE_RENDER_CANCELED");
          window.addEventListener("message", receive);
          frame.onload = () => frame.contentWindow?.postMessage({ ...channel, type: "render", sample }, "*");
          frame.srcdoc = source;
          this.container.replaceChildren(frame);
        });
      }
    };
  }
});

// src/client/fixture-preview/panel.ts
var FixturePreviewPanel;
var init_panel = __esm({
  "src/client/fixture-preview/panel.ts"() {
    "use strict";
    init_lifecycle();
    init_host();
    init_samples();
    FixturePreviewPanel = class {
      element = document.createElement("section");
      lifecycle;
      host;
      dirty = false;
      status;
      identity;
      capture;
      view;
      sample;
      kind;
      constructor() {
        this.element.setAttribute("aria-label", "Fixture Preview");
        this.element.style.cssText = "padding:16px;border:1px solid #aab8cc;border-radius:8px;margin-top:16px;overflow-wrap:anywhere";
        this.element.innerHTML = `<h3>Preview \xB7 Fixture demonstration</h3><p>Fixture mode \xB7 SAMPLE DATA \xB7 Saved-artifact Preview unavailable</p><p data-identity></p><p data-capture></p><p data-state role="status"></p><label>Sample type<select data-fixture><option value="card">Native Card</option><option value="panel">Native Panel layout fixture</option><option value="route">Synthetic route-parameter inspector</option></select></label><label>Synthetic sample (JSON)<textarea data-sample rows="8"></textarea></label><button type="button" data-refresh>Refresh fixture</button><button type="button" data-saved>Preview saved artifact</button><details><summary>Unsupported fixture contracts</summary><ul></ul></details><div data-view></div>`;
        const get = (selector) => this.element.querySelector(selector);
        this.status = get("[data-state]");
        this.identity = get("[data-identity]");
        this.capture = get("[data-capture]");
        this.view = get("[data-view]");
        this.host = new FixtureHost(this.view);
        this.sample = get("[data-sample]");
        this.kind = get("[data-fixture]");
        this.kind.onchange = () => {
          this.invalidate("FIXTURE_KIND_CHANGED: explicit Refresh required");
          this.sample.value = JSON.stringify(this.defaults(), null, 2);
        };
        this.sample.style.cssText = "display:block;width:min(100%,640px);box-sizing:border-box;font-family:monospace";
        this.sample.value = JSON.stringify(defaultSample(), null, 2);
        this.sample.addEventListener("input", () => {
          this.invalidate("SAMPLE_CHANGED: explicit Refresh required");
        });
        get("[data-refresh]").onclick = () => {
          void this.refresh();
        };
        get("[data-saved]").onclick = () => {
          this.invalidate(unsupportedFixtures.saved);
        };
        for (const reason of Object.values(unsupportedFixtures)) {
          const item = document.createElement("li");
          item.textContent = reason;
          get("ul").append(item);
        }
        this.present();
      }
      defaults() {
        return this.kind.value === "panel" ? defaultPanelSample() : this.kind.value === "route" ? defaultRouteSample() : defaultSample();
      }
      select(identity, dirty = false) {
        const previous = this.lifecycle?.snapshot;
        if (!identity || !previous || identityKey(previous.identity) !== identityKey(identity)) {
          this.host.clear();
          this.lifecycle?.dispose();
          this.lifecycle = identity ? new PreviewLifecycle(identity) : void 0;
          this.sample.value = identity ? JSON.stringify(this.defaults(), null, 2) : "";
        }
        this.dirty = dirty;
        this.present();
      }
      present() {
        const state = this.lifecycle?.snapshot;
        this.sample.disabled = !state || state.state === "revoked" || state.state === "disposed";
        this.kind.disabled = this.sample.disabled;
        this.element.dataset.state = state?.state ?? "empty";
        this.identity.textContent = state ? `Original selection \xB7 ${identityKey(state.identity)}` : "Select an authorized artifact to identify this fixture session.";
        this.capture.textContent = state?.last ? `${state.last.provenance.kind === "fixture" ? "Fixture demonstration" : `Saved revision ${state.last.provenance.revision}`} \xB7 Capture ${state.last.captureId}${state.pending ? ` \xB7 Pending ${state.pending.requestId}` : ""}` : state?.pending ? `Pending ${state.pending.requestId} \xB7 No successful capture` : "No successful capture";
        this.status.textContent = `${state?.state ?? "empty"}${state?.reason ? ` \xB7 ${state.reason}` : ""}${this.dirty ? " \xB7 Unsaved changes excluded; editor autosave remains independently governed." : ""}`;
      }
      retainedSummary() {
        const last = this.lifecycle?.snapshot.last;
        this.host.clear();
        if (last) {
          const summary = document.createElement("pre");
          summary.textContent = `STALE PREVIEW \xB7 SAMPLE DATA \xB7 Static sample summary (rendering destroyed)
${sampleSummary(last.content)}`;
          summary.style.whiteSpace = "pre-wrap";
          summary.inert = true;
          this.view.append(summary);
        }
      }
      invalidate(reason) {
        this.lifecycle?.invalidate(reason);
        this.retainedSummary();
        this.present();
      }
      revoke(reason = "SIMULATED_REVOCATION") {
        this.lifecycle?.revoke(reason);
        this.host.clear();
        this.sample.value = "";
        this.present();
      }
      dispose() {
        this.lifecycle?.dispose();
        this.host.clear();
        this.sample.value = "";
        this.present();
      }
      async refresh() {
        const lifecycle = this.lifecycle;
        if (!lifecycle || ["disposed", "revoked"].includes(lifecycle.snapshot.state)) return;
        this.retainedSummary();
        const request = lifecycle.refresh();
        this.present();
        try {
          if (this.sample.value.length > 4096) throw new Error("SAMPLE_INPUT_LIMIT_EXCEEDED");
          const sample = validateSample(JSON.parse(this.sample.value));
          const captureId = await fixtureCaptureId(sample);
          if (this.lifecycle !== lifecycle || lifecycle.snapshot.pending?.sequence !== request.sequence) return;
          await this.host.render(request.identity, request.sequence, sample);
          if (this.lifecycle !== lifecycle) return;
          if (lifecycle.succeed(request, { identity: request.identity, captureId, provenance: { kind: "fixture", fixtureId: sample.fixture }, content: sample })) this.present();
        } catch (error) {
          if (this.lifecycle === lifecycle && lifecycle.fail(request, error instanceof Error ? error.message : "FIXTURE_UNAVAILABLE")) {
            this.retainedSummary();
            this.present();
          }
        }
      }
    };
  }
});

// src/client/builder-workspace/fixture-preview-binding.ts
function selectFixturePreview(panel, hints) {
  panel.select(hints ? { subjectId: hints.subjectId, sessionId: hints.sessionId, applicationId: hints.artifact.applicationId, artifactKey: workspaceIdentityKey(hints.artifact.identity) } : void 0, hints?.dirty ?? false);
}
var init_fixture_preview_binding = __esm({
  "src/client/builder-workspace/fixture-preview-binding.ts"() {
    "use strict";
    init_builder_workspace();
  }
});

// src/client/builder-workspace/shell-view.ts
var shell_view_exports = {};
__export(shell_view_exports, {
  createBuilderShellView: () => createBuilderShellView,
  shellTabLabel: () => shellTabLabel
});
function createBuilderShellView(actions) {
  const element = document.createElement("section");
  element.className = "builder-workspace";
  element.setAttribute("aria-label", "Application Builder workspace");
  element.innerHTML = `<header><button data-collapse aria-expanded="true">Application navigation</button><strong data-title></strong><button data-refresh>Refresh artifacts</button><button data-create-dataset>Create Dataset</button><button data-create-form>Create Form</button><button data-return-link hidden>Return and link Dataset to Form</button><button data-cancel-link hidden>Cancel Dataset link</button></header>
    <p data-status role="status"></p><div class="workspace-layout"><nav aria-label="Application artifacts"></nav><section class="workspace-main"><div role="tablist" aria-label="Open artifacts"></div><div data-stage></div></section></div>`;
  const find = (selector) => element.querySelector(selector);
  const preview = new FixturePreviewPanel();
  element.append(preview.element);
  let mounted = false, disposed = false;
  let state = { active: false, applicationKey: "", tabs: [] };
  let navigation = /* @__PURE__ */ new Map();
  function click(event) {
    if (!mounted || disposed || !(event.target instanceof Element)) return;
    const button = event.target.closest("button[data-view-action]");
    if (!button || !element.contains(button)) return;
    const key = button.dataset.viewKey;
    if (button.dataset.viewAction === "collapse") {
      const nav = find("nav");
      nav.hidden = !nav.hidden;
      button.setAttribute("aria-expanded", String(!nav.hidden));
      element.classList.toggle("navigation-collapsed", nav.hidden);
    } else if (button.dataset.viewAction === "artifact") {
      const artifact2 = navigation.get(key);
      if (artifact2) actions.navigate({ identity: artifact2.identity });
    } else if (button.dataset.viewAction === "tab") {
      const tab = state.tabs.find((tab2) => tab2.key === key);
      if (tab) actions.navigate({ identity: tab.artifact.identity }, tab.artifact.identity.owner.kind === "application" ? tab.artifact.applicationKey : state.applicationKey);
    } else if (button.dataset.viewAction === "close" && state.tabs.some((tab) => tab.key === key)) actions.close(key);
  }
  find("[data-collapse]").dataset.viewAction = "collapse";
  function render(next) {
    if (disposed) return;
    state = next;
    const tabs = find("[role=tablist]");
    tabs.replaceChildren();
    for (const tab of next.tabs) {
      const row = document.createElement("span"), button = document.createElement("button"), close = document.createElement("button");
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(next.focused === tab.key));
      button.textContent = shellTabLabel(tab);
      button.dataset.viewAction = "tab";
      button.dataset.viewKey = tab.key;
      close.textContent = "\xD7";
      close.setAttribute("aria-label", `Close ${tab.suspended ? "suspended artifact" : tab.artifact.name}`);
      close.dataset.viewAction = "close";
      close.dataset.viewKey = tab.key;
      row.append(button, close);
      tabs.append(row);
    }
    const stage = find("[data-stage]"), focused = next.tabs.find((tab) => tab.key === next.focused);
    if (mounted && next.active && focused && !focused.suspended) {
      if (stage.firstElementChild !== focused.element) stage.replaceChildren(focused.element);
    } else stage.replaceChildren();
    selectFixturePreview(preview, mounted && next.active && focused && !focused.suspended && next.session?.principal ? {
      subjectId: next.session.principal.subjectId,
      sessionId: next.session.revision,
      artifact: focused.artifact,
      dirty: focused.state.dirty
    } : void 0);
  }
  return {
    element,
    preview,
    status(message) {
      if (!disposed) find("[data-status]").textContent = message;
    },
    title(message) {
      if (!disposed) find("[data-title]").textContent = message;
    },
    artifacts(entries) {
      if (disposed) return;
      navigation = new Map(entries.map((artifact2) => [workspaceIdentityKey(artifact2.identity), artifact2]));
      const nav = find("nav");
      nav.replaceChildren();
      for (const group of groups) {
        const matching = entries.filter((item) => item.group === group);
        if (!matching.length) continue;
        const details = document.createElement("details");
        details.open = true;
        const heading = document.createElement("summary");
        heading.textContent = group;
        details.append(heading);
        for (const artifact2 of matching) {
          const button = document.createElement("button");
          button.textContent = `${artifact2.name}${artifact2.identity.repairLocator ? " (repair-only locator)" : ""}${!artifact2.editable ? " (read-only)" : ""}`;
          button.dataset.artifactKey = workspaceIdentityKey(artifact2.identity);
          button.dataset.viewAction = "artifact";
          button.dataset.viewKey = button.dataset.artifactKey;
          details.append(button);
        }
        nav.append(details);
      }
    },
    render,
    mount(target, title) {
      if (disposed) throw new Error("SHELL_VIEW_DISPOSED");
      if (!mounted) {
        mounted = true;
        element.addEventListener("click", click);
      }
      find("[data-title]").textContent = title;
      target.replaceChildren(element);
    },
    park() {
      if (disposed) return;
      mounted = false;
      element.removeEventListener("click", click);
      preview.select();
      find("[data-stage]").replaceChildren();
      element.remove();
    },
    dispose() {
      if (disposed) return;
      mounted = false;
      disposed = true;
      element.removeEventListener("click", click);
      preview.dispose();
      navigation.clear();
      state = { active: false, applicationKey: "", tabs: [] };
      find("[data-stage]").replaceChildren();
      element.remove();
    }
  };
}
var shellTabLabel, groups;
var init_shell_view = __esm({
  "src/client/builder-workspace/shell-view.ts"() {
    "use strict";
    init_builder_workspace();
    init_panel();
    init_fixture_preview_binding();
    shellTabLabel = (tab) => tab.suspended ? "Suspended artifact" : `${tab.artifact.name}${tab.state.dirty ? " \u2022" : ""}${tab.state.pending ? " (pending)" : ""}${tab.state.conflict ? " (conflict)" : ""}`;
    groups = ["Pages", "Shells", "Components and Forms", "Datasets", "Workflows", "Triggers", "Menus", "Application presentation/settings", "Other artifacts"];
  }
});

// tests/fixture-preview/shell-view.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

// src/client/builder-workspace/coordinator.ts
init_builder_workspace();
var BuilderWorkspaceCoordinator = class {
  constructor(authorize, mount, subject) {
    this.authorize = authorize;
    this.mount = mount;
    this.subject = subject;
  }
  authorize;
  mount;
  subject;
  tabs = /* @__PURE__ */ new Map();
  focused;
  sequence = 0;
  disposed = false;
  requested;
  listeners = /* @__PURE__ */ new Set();
  opening = /* @__PURE__ */ new Map();
  captureLinkOrigin() {
    const tab = this.focused && this.tabs.get(this.focused), subject = this.subject();
    if (!tab || !subject || tab.suspended || tab.ownerSubject !== subject || !tab.artifact.editable) throw new Error("LINK_ORIGIN_UNAVAILABLE");
    return { key: tab.key, subject, applicationId: tab.artifact.applicationId, applicationKey: tab.artifact.applicationKey, editor: tab.editor };
  }
  assertLinkOrigin(origin) {
    const tab = this.tabs.get(origin.key);
    if (this.disposed || this.subject() !== origin.subject || !tab || tab.suspended || tab.ownerSubject !== origin.subject || tab.editor !== origin.editor || tab.artifact.applicationId !== origin.applicationId || tab.artifact.applicationKey !== origin.applicationKey) throw new Error("LINK_ORIGIN_STALE");
    return tab;
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
  deactivate() {
    if (this.focused) this.tabs.get(this.focused)?.editor.deactivate();
    this.focused = void 0;
  }
  async open(applicationKey, target) {
    if (this.disposed) return false;
    const sequence = ++this.sequence, subject = this.subject();
    this.deactivate();
    this.emit();
    let key;
    try {
      if (!subject) throw new Error("WORKSPACE_IDENTITY_REQUIRED");
      this.requested = workspaceIdentityKey(target.identity);
      const authorized = await this.authorize(applicationKey, target);
      key = workspaceIdentityKey(authorized.identity);
      if (key !== workspaceIdentityKey(target.identity)) throw new Error("WORKSPACE_IDENTITY_CHANGED");
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
      let tab = this.tabs.get(key);
      if (tab && tab.ownerSubject !== subject) throw new Error("Return to the original identity to recover this retained tab, or discard it.");
      if (!tab) {
        let pending = this.opening.get(key);
        if (!pending) {
          pending = { consumers: /* @__PURE__ */ new Set(), promise: this.mount(authorized).then((editor2) => ({ key, artifact: authorized, editor: editor2, suspended: false, ownerSubject: subject })) };
          this.opening.set(key, pending);
        }
        pending.consumers.add(sequence);
        try {
          tab = await pending.promise;
          if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
          this.tabs.set(key, tab);
        } finally {
          pending.consumers.delete(sequence);
          if (!pending.consumers.size) {
            this.opening.delete(key);
            if (!this.tabs.has(key)) {
              const orphan = await pending.promise.catch(() => void 0);
              await orphan?.editor.dispose();
            }
          }
        }
      }
      await tab.editor.focus(authorized, target);
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) {
        if (this.focused !== key) tab.editor.deactivate();
        return false;
      }
      tab.artifact = authorized;
      tab.suspended = false;
      this.focused = key;
      this.emit();
      return true;
    } catch (error) {
      if (key && sequence === this.sequence) {
        const tab = this.tabs.get(key);
        if (tab) {
          tab.suspended = true;
          tab.editor.suspend();
        }
      }
      if (sequence === this.sequence) this.emit();
      throw error;
    }
  }
  park() {
    this.sequence++;
    this.deactivate();
    this.emit();
  }
  suspend() {
    this.sequence++;
    this.deactivate();
    for (const tab of this.tabs.values()) {
      tab.suspended = true;
      tab.editor.suspend();
    }
    this.emit();
  }
  async close(key, discard = false) {
    const tab = this.tabs.get(key);
    if (!tab) return true;
    if (!discard && !await tab.editor.guardClose()) return false;
    if (this.focused === key || this.requested === key) {
      this.sequence++;
      this.deactivate();
    }
    this.tabs.delete(key);
    try {
      await tab.editor.dispose();
    } finally {
      this.emit();
    }
    return true;
  }
  async dispose() {
    this.disposed = true;
    this.suspend();
    await Promise.allSettled([...this.tabs.keys()].map((key) => this.close(key, true)));
    this.listeners.clear();
  }
};

// tests/fixture-preview/shell-view.test.ts
init_builder_workspace();
test("shared view module import creates no DOM, request, scheduler or session subscription", async () => {
  const calls = [], keys = ["document", "window", "fetch", "setTimeout", "setInterval"];
  const previous = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() {
      calls.push(key);
      throw new Error(`IMPORT_EFFECT:${key}`);
    } });
    const module = await Promise.resolve().then(() => (init_shell_view(), shell_view_exports));
    assert.equal(typeof module.createBuilderShellView, "function");
    assert.deepEqual(calls, []);
  } finally {
    for (const key of keys) {
      const descriptor = previous.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
test("production tab formatter preserves dirty/pending/conflict and suspension labels", async () => {
  const { shellTabLabel: shellTabLabel2 } = await Promise.resolve().then(() => (init_shell_view(), shell_view_exports));
  const tab = { artifact: { name: "Synthetic" }, suspended: false, state: { dirty: true, pending: true, conflict: true } };
  assert.equal(shellTabLabel2(tab), "Synthetic \u2022 (pending) (conflict)");
  assert.equal(shellTabLabel2({ ...tab, suspended: true }), "Suspended artifact");
  assert.equal(shellTabLabel2({ ...tab, state: { dirty: false, pending: false } }), "Synthetic");
});
var artifact = (id) => ({ identity: { owner: { kind: "application", id: "synthetic-owner" }, format: "generic", id }, applicationId: "synthetic-owner", applicationKey: "synthetic-key", locator: id, name: id, group: "Other artifacts", kind: "fixture", editable: true });
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function editor(overrides = {}) {
  return { element: {}, state: () => ({ dirty: true, pending: false }), focus: async () => {
  }, deactivate() {
  }, suspend() {
  }, guardClose: async () => false, dispose: async () => {
  }, ...overrides };
}
test("actual coordinator rejects late synthetic authorization without retargeting the newest selection", async () => {
  const slow = deferred();
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => target.identity.id === "one" ? slow.promise : artifact("two"), async () => editor(), () => "synthetic-subject");
  const first = coordinator.open("synthetic-key", { identity: artifact("one").identity });
  assert(await coordinator.open("synthetic-key", { identity: artifact("two").identity }));
  slow.resolve(artifact("one"));
  assert.equal(await first, false);
  assert.equal(coordinator.focused, workspaceIdentityKey(artifact("two").identity));
  await coordinator.dispose();
});
test("actual coordinator rejects superseded focus completion and deactivates the outgoing adapter", async () => {
  const slow = deferred(), entered = deferred();
  let deactivated = 0;
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => artifact(target.identity.id), async (value) => value.identity.id === "one" ? editor({ focus: async () => {
    entered.resolve();
    await slow.promise;
  }, deactivate() {
    deactivated++;
  } }) : editor(), () => "synthetic-subject");
  const first = coordinator.open("synthetic-key", { identity: artifact("one").identity });
  await entered.promise;
  assert(await coordinator.open("synthetic-key", { identity: artifact("two").identity }));
  slow.resolve();
  assert.equal(await first, false);
  assert.equal(deactivated, 1);
  assert.equal(coordinator.focused, workspaceIdentityKey(artifact("two").identity));
  await coordinator.dispose();
});
test("park and local subject suspension cancel pending focus without discarding retained tabs", async () => {
  const slow = deferred();
  let subject = "synthetic-subject", suspended = 0, disposed = 0;
  const coordinator = new BuilderWorkspaceCoordinator(async (_key, target) => target.identity.id === "late" ? slow.promise : artifact("one"), async () => editor({ suspend() {
    suspended++;
  }, dispose: async () => {
    disposed++;
  } }), () => subject);
  await coordinator.open("synthetic-key", { identity: artifact("one").identity });
  const pending = coordinator.open("synthetic-key", { identity: artifact("late").identity });
  coordinator.park();
  slow.resolve(artifact("late"));
  assert.equal(await pending, false);
  assert.equal(coordinator.tabs.size, 1);
  assert.equal(disposed, 0);
  subject = "replacement";
  coordinator.suspend();
  assert.equal(suspended, 1);
  assert.equal(coordinator.focused, void 0);
  assert(coordinator.tabs.values().next().value.suspended);
  await coordinator.dispose();
  assert.equal(disposed, 1);
});
