var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// tests/preview-contract-model/native-card-admission.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// ../ui-base/packages/ui-base-ui/src/platform/definition.js
function copySerializable(value) {
  const seen = /* @__PURE__ */ new Set();
  const visit = /* @__PURE__ */ __name((item, path = "$") => {
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
  }, "visit");
  visit(value);
  return JSON.parse(JSON.stringify(value));
}
__name(copySerializable, "copySerializable");
var isSettingVisible = /* @__PURE__ */ __name((setting, values) => !setting.visibleWhen || values[setting.visibleWhen.setting] === setting.visibleWhen.equals, "isSettingVisible");
function defaultSettings(definition) {
  return Object.fromEntries(Object.entries(definition.builder.settings).map(([name, setting]) => [name, setting.default]));
}
__name(defaultSettings, "defaultSettings");
function safeAuthoringUrl(value, image = false) {
  if (!value) return true;
  if (typeof value !== "string" || /[\u0000-\u0020\u007f]/.test(value.trim())) return false;
  const input = value.trim();
  if (input.startsWith("//") || input.includes("\\")) return false;
  if (!/^[a-z][a-z\d+.-]*:/i.test(input)) return true;
  return image ? /^https?:/i.test(input) : /^(https?|mailto|tel):/i.test(input);
}
__name(safeAuthoringUrl, "safeAuthoringUrl");
function validateDefinition(input) {
  const errors = [];
  let definition;
  try {
    definition = copySerializable(input);
  } catch (error) {
    return [error.message];
  }
  const object = /* @__PURE__ */ __name((value) => value !== null && typeof value === "object" && !Array.isArray(value), "object");
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
__name(validateDefinition, "validateDefinition");
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
__name(validateSettings, "validateSettings");

// src/client/native-card-preview/admission.ts
var CARD_ID = "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1";
var CardDenied = class extends Error {
  static {
    __name(this, "CardDenied");
  }
  code;
  constructor(code) {
    super(code);
    this.code = code;
  }
};
var deny = /* @__PURE__ */ __name((code) => {
  throw new CardDenied(code);
}, "deny");
var need = /* @__PURE__ */ __name((v, code) => {
  if (!v) deny(code);
}, "need");
function canonical(value) {
  const seen = /* @__PURE__ */ new Set();
  const visit = /* @__PURE__ */ __name((v) => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number") {
      need(Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)), "DATA_INVALID");
      return JSON.stringify(v);
    }
    if (typeof v !== "object") return deny("DATA_INVALID");
    need(!seen.has(v), "DATA_INVALID");
    seen.add(v);
    need(Reflect.ownKeys(v).every((k) => typeof k === "string"), "DATA_INVALID");
    const d = Object.getOwnPropertyDescriptors(v);
    let text;
    if (Array.isArray(v)) {
      need(Object.keys(d).length === v.length + 1, "DATA_INVALID");
      text = "[" + Array.from({ length: v.length }, (_, i) => {
        const p = d[String(i)];
        need(p && "value" in p && p.enumerable, "DATA_INVALID");
        return visit(p.value);
      }).join(",") + "]";
    } else {
      need([Object.prototype, null].includes(Object.getPrototypeOf(v)), "DATA_INVALID");
      text = "{" + Object.keys(d).sort().map((k) => {
        const p = d[k];
        need("value" in p && p.enumerable && !["__proto__", "constructor", "prototype"].includes(k), "DATA_INVALID");
        return JSON.stringify(k) + ":" + visit(p.value);
      }).join(",") + "}";
    }
    seen.delete(v);
    return text;
  }, "visit");
  return visit(value);
}
__name(canonical, "canonical");
var clone = /* @__PURE__ */ __name((v) => JSON.parse(canonical(v)), "clone");
async function hashText(text) {
  return "sha256:" + Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (n) => n.toString(16).padStart(2, "0")).join("");
}
__name(hashText, "hashText");
var exact = /* @__PURE__ */ __name((v, fields) => {
  need(v && typeof v === "object" && !Array.isArray(v), "FIELDS_INVALID");
  need(Object.keys(v).sort().join("|") === fields.sort().join("|"), "FIELDS_INVALID");
}, "exact");
function contentOf(c) {
  return { schema: c.schema, componentId: c.componentId, packageName: c.packageName, packageVersion: c.packageVersion, schemaVersion: c.schemaVersion, definitionDigest: c.definitionDigest, closureDigest: c.closureDigest, bundleDigest: c.bundleDigest, activation: c.activation, settings: c.settings };
}
__name(contentOf, "contentOf");
async function seal(c) {
  const copy = clone(c);
  copy.contentDigest = await hashText(canonical(contentOf(copy)));
  return copy;
}
__name(seal, "seal");
async function admit(input, profile, now, authority) {
  try {
    return await admitData(input, profile, now, authority);
  } catch (error) {
    if (error instanceof CardDenied) throw error;
    throw new CardDenied("INPUT_INVALID");
  }
}
__name(admit, "admit");
async function admitData(input, profile, now, authority) {
  const serialized = canonical(input);
  const p = clone(profile), a = clone(authority);
  need(Number.isSafeInteger(now) && now >= 0, "CLOCK_INVALID");
  exact(p.limits, ["maxText", "maxInputBytes"]);
  need(Object.values(p.limits).every((n) => Number.isSafeInteger(n) && n > 0), "LIMIT_INVALID");
  need(new TextEncoder().encode(serialized).length <= p.limits.maxInputBytes, "INPUT_LIMIT");
  const c = JSON.parse(serialized);
  exact(c, ["schema", "componentId", "packageName", "packageVersion", "schemaVersion", "definitionDigest", "closureDigest", "bundleDigest", "activation", "settings", "binding", "epoch", "expires", "contentDigest"]);
  need(c.schema === "canonical-card-capture-v1" && c.componentId === CARD_ID && c.packageName === "@ui-base/ui" && c.packageVersion === "0.5.1" && c.schemaVersion === "1.0.0", "IDENTITY_UNSUPPORTED");
  need(validateDefinition(p.definition).length === 0 && p.definition.identity.componentId === CARD_ID && p.definition.ownership.package.packageId === "@ui-base/ui" && p.definition.version.packageVersion === "0.5.1", "DEFINITION_INVALID");
  need(await hashText(canonical(p.definition)) === p.definitionDigest && c.definitionDigest === p.definitionDigest, "DEFINITION_CHANGED");
  need(c.closureDigest === p.closureDigest && c.bundleDigest === p.bundleDigest && /^sha256:[a-f0-9]{64}$/.test(c.closureDigest) && /^sha256:[a-f0-9]{64}$/.test(c.bundleDigest), "EXECUTABLE_CHANGED");
  need(c.activation === p.activation && typeof c.activation === "string" && c.activation.length > 0, "ACTIVATION_CHANGED");
  exact(c.binding, ["authorityId", "subjectId", "sessionHandle", "sessionRevision", "applicationId", "owner", "selectedIdentity"]);
  exact(c.binding.owner, ["kind", "id"]);
  need(Object.entries(c.binding).filter(([k]) => k !== "owner").every(([, v]) => typeof v === "string" && v.length > 0) && c.binding.owner.kind === "package" && c.binding.owner.id === "@ui-base/ui" && c.binding.selectedIdentity === CARD_ID, "BINDING_INVALID");
  exact(c.epoch, ["policy", "sessionRevision", "ownerRevision", "scopeDigest", "validUntil"]);
  exact(c.epoch.policy, ["authorityId", "lineage", "revision"]);
  need(c.epoch.policy.authorityId === c.binding.authorityId && c.epoch.sessionRevision === c.binding.sessionRevision && !!c.epoch.ownerRevision && !!c.epoch.policy.lineage && /^(0|[1-9][0-9]*)$/.test(c.epoch.policy.revision) && /^sha256:[a-f0-9]{64}$/.test(c.epoch.scopeDigest), "EPOCH_INVALID");
  need(a.allowed === true && canonical(c.binding) === canonical(p.binding) && canonical(c.binding) === canonical(a.binding) && canonical(c.epoch) === canonical(p.epoch) && canonical(c.epoch) === canonical(a.epoch), "AUTHORITY_CHANGED");
  need(Number.isSafeInteger(c.expires) && Number.isSafeInteger(c.epoch.validUntil) && c.expires > now && c.expires <= c.epoch.validUntil, "EXPIRED");
  exact(c.settings, Object.keys(c.settings));
  const allowed = ["body", "header", "footer", "heading", "label", "name", "ariaLabel", "ariaDescribedBy", "variant", "density", "interactionMode", "selected", "disabled"];
  need(Object.keys(c.settings).every((k) => allowed.includes(k)), "CAPABILITY_DENIED");
  for (const [key, value] of Object.entries(c.settings)) if (typeof value === "string") {
    need(value.length <= p.limits.maxText && !/[<>\u0000-\u001f]/.test(value), "TEXT_INVALID");
    if (key === "interactionMode") need(["none", "selectable"].includes(value), "MODE_DENIED");
  }
  need(validateSettings(p.definition, c.settings).length === 0, "SETTINGS_INVALID");
  const effective = { ...defaultSettings(p.definition), ...c.settings };
  need(["none", "selectable"].includes(effective.interactionMode), "MODE_DENIED");
  need(await hashText(canonical(contentOf(c))) === c.contentDigest, "CONTENT_CHANGED");
  return copySerializable(c);
}
__name(admitData, "admitData");

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

// tests/fixture-preview/native-card-inputs.ts
async function authoredProfile(bundleDigest, closureDigest) {
  const definition = JSON.parse(JSON.stringify(ui_component_default.components.find((c) => c.schemaVersion === "1.0.0" && c.identity?.componentId === CARD_ID)));
  return {
    definition,
    definitionDigest: await hashText(canonical(definition)),
    closureDigest,
    bundleDigest,
    activation: "authored-active-1",
    binding: { authorityId: "authored-authority", subjectId: "authored-alice", sessionHandle: "authored-session", sessionRevision: "s1", applicationId: "authored-app-permanent", owner: { kind: "package", id: "@ui-base/ui" }, selectedIdentity: CARD_ID },
    epoch: { policy: { authorityId: "authored-authority", lineage: "authored-lineage", revision: "1" }, sessionRevision: "s1", ownerRevision: "owner-1", scopeDigest: await hashText("authored-visible-scope"), validUntil: 1e4 },
    limits: { maxText: 512, maxInputBytes: 8192 }
  };
}
__name(authoredProfile, "authoredProfile");
async function authoredCapture(p, settings = {}) {
  return seal({ schema: "canonical-card-capture-v1", componentId: CARD_ID, packageName: "@ui-base/ui", packageVersion: "0.5.1", schemaVersion: "1.0.0", definitionDigest: p.definitionDigest, closureDigest: p.closureDigest, bundleDigest: p.bundleDigest, activation: p.activation, settings, binding: p.binding, epoch: p.epoch, expires: 9e3 });
}
__name(authoredCapture, "authoredCapture");

// src/client/native-card-preview/message.ts
function validMessage(value, c) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  const keys = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];
  return Object.keys(v).length === keys.length && Object.keys(v).every((k) => keys.includes(k)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === c.nonce && v.session === c.session && v.identity === c.identity && v.sequence === c.sequence && Number.isSafeInteger(v.sequence) && Number(v.sequence) > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);
}
__name(validMessage, "validMessage");

// tests/preview-contract-model/native-card-admission.test.ts
async function fixture() {
  const p = await authoredProfile(await hashText("authored fixed unit bundle"), "sha256:c5b2fe68d5ddeec6d2a5a4a9bdcbe78b1312dd1ddac4d8d716a103381a417227");
  return { p, c: await authoredCapture(p), a: { allowed: true, binding: p.binding, epoch: p.epoch } };
}
__name(fixture, "fixture");
var denied = /* @__PURE__ */ __name(async (fn, code) => assert.rejects(fn, (e) => e instanceof CardDenied && e.code === code), "denied");
test("real Definition identity/schema and native defaults admitted without loading renderer or constructing DOM", async () => {
  const { p, c, a } = await fixture();
  const result = await admit(c, p, 100, a);
  assert.equal(p.definition.identity.name, "card");
  assert.equal(p.definition.schemaVersion, "1.0.0");
  assert.equal(p.definition.builder.settings.body.default, "Card body");
  assert.deepEqual(result, c);
});
test("canonical byte vector and caller-copy independence", async () => {
  assert.equal(canonical({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(await hashText("a"), "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb");
  const { p, c, a } = await fixture(), result = await admit(c, p, 100, a);
  result.binding.subjectId = "changed";
  assert.equal(c.binding.subjectId, "authored-alice");
});
for (const key of ["mediaSrc", "href", "target", "rel", "action", "actionToken", "actionHandler", "selectionHandler", "cssClass", "serviceRefs", "children", "style", "properties", "unknown"]) test("reject setting capability " + key, async () => {
  const { p, a } = await fixture(), c = await authoredCapture(p, { [key]: "unsafe" });
  await denied(() => admit(c, p, 100, a), "CAPABILITY_DENIED");
});
for (const mode of ["link", "action"]) test("reject mode " + mode + " without substitution", async () => {
  const { p, a } = await fixture();
  await denied(async () => admit(await authoredCapture(p, { interactionMode: mode }), p, 100, a), "MODE_DENIED");
});
for (const [key, value] of [["variant", "unknown"], ["density", "dense"], ["selected", true], ["disabled", "false"], ["body", {}], ["interactionMode", false]]) test("reject conflicting or invalid setting " + key, async () => {
  const { p, a } = await fixture();
  await denied(async () => admit(await authoredCapture(p, { [key]: value }), p, 100, a), "SETTINGS_INVALID");
});
for (const variant of ["elevated", "outlined", "flat"]) for (const density of ["comfortable", "compact"]) test("native finite settings " + variant + "/" + density, async () => {
  const { p, a } = await fixture(), c = await authoredCapture(p, { variant, density, interactionMode: "selectable", selected: true, disabled: false, body: "Authored body", header: "Header", footer: "Footer", heading: "Heading", label: "Label", ariaLabel: "Accessible Card", ariaDescribedBy: "local-description", name: "authored" });
  assert.deepEqual(await admit(c, p, 100, a), c);
});
for (const [key, value, code] of [
  ["componentId", "foreign", "IDENTITY_UNSUPPORTED"],
  ["packageName", "foreign", "IDENTITY_UNSUPPORTED"],
  ["packageVersion", "0.5.2", "IDENTITY_UNSUPPORTED"],
  ["schemaVersion", "2", "IDENTITY_UNSUPPORTED"],
  ["definitionDigest", "sha256:" + "0".repeat(64), "DEFINITION_CHANGED"],
  ["closureDigest", "sha256:" + "0".repeat(64), "EXECUTABLE_CHANGED"],
  ["bundleDigest", "sha256:" + "0".repeat(64), "EXECUTABLE_CHANGED"],
  ["activation", "other", "ACTIVATION_CHANGED"],
  ["contentDigest", "sha256:" + "0".repeat(64), "CONTENT_CHANGED"],
  ["expires", 100, "EXPIRED"]
]) test("reject inconsistent capture " + key, async () => {
  const { p, c, a } = await fixture();
  Object.assign(c, { [key]: value });
  await denied(() => admit(c, p, 100, a), code);
});
test("Definition bytes changed even under same version refused", async () => {
  const { p, c, a } = await fixture();
  p.definition.identity.description = "changed";
  await denied(() => admit(c, p, 100, a), "DEFINITION_CHANGED");
});
test("foreign subject, changed epoch, denied answer and expired rights refused", async () => {
  for (const type of ["subject", "epoch", "denied"]) {
    const { p: p2, c: c2, a: a2 } = await fixture();
    if (type === "subject") c2.binding.subjectId = "other";
    if (type === "epoch") c2.epoch.policy.revision = "2";
    if (type === "denied") a2.allowed = false;
    await denied(() => admit(c2, p2, 100, a2), "AUTHORITY_CHANGED");
  }
  const { p, c, a } = await fixture();
  await denied(() => admit(c, p, 1e4, a), "EXPIRED");
});
test("top-level children and service authority cannot be smuggled as unknown properties", async () => {
  const { p, c, a } = await fixture();
  Object.assign(c, { children: [] });
  await denied(() => admit(c, p, 100, a), "FIELDS_INVALID");
});
test("text, serialized input and required limit boundaries are explicit authored values", async () => {
  const { p, a } = await fixture();
  await denied(async () => admit(await authoredCapture(p, { body: "x".repeat(513) }), p, 100, a), "TEXT_INVALID");
  await denied(async () => admit(await authoredCapture(p, { body: "<script>" }), p, 100, a), "TEXT_INVALID");
  const c = await authoredCapture(p);
  p.limits.maxInputBytes = 1;
  await denied(() => admit(c, p, 100, a), "INPUT_LIMIT");
  p.limits.maxText = 0;
  await denied(() => admit(c, p, 100, a), "LIMIT_INVALID");
});
test("accessor input rejected before getter invocation", async () => {
  const { p, a } = await fixture();
  let ran = false;
  const c = { get settings() {
    ran = true;
    return {};
  } };
  await denied(() => admit(c, p, 100, a), "DATA_INVALID");
  assert.equal(ran, false);
});
test("exact frame channel rejects forged commands, nonce, identity and sequence", () => {
  const c = { nonce: "nonce", session: "session", identity: "identity", sequence: 1 };
  assert(validMessage({ ...c, type: "ready" }, c));
  for (const message of [{ ...c, type: "Save" }, { ...c, type: "Publish" }, { ...c, type: "ready", extra: true }, { ...c, type: "ready", nonce: "other" }, { ...c, type: "ready", sequence: 2 }, { ...c, type: "ready", identity: "other" }]) assert.equal(validMessage(message, c), false);
});
