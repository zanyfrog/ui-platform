// tests/fixture-preview/sample-coverage.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));

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

// src/client/fixture-preview/samples.ts
var FixtureDenied = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
  code;
};
var defaultSample = () => ({ fixture: "native-card-v1", heading: "Synthetic Card", header: "", body: "Authored synthetic slot text", footer: "Synthetic footer", variant: "outlined", density: "comfortable", selectable: true, disabled: false, selected: false });
var defaultPanelSample = () => ({ fixture: "native-panel-v1", heading: "Synthetic Panel", body: "Synthetic Panel body", footer: "Synthetic Panel footer", variant: "outlined", density: "comfortable", collapsible: true, open: true });
var defaultRouteSample = () => ({ fixture: "route-inspector-v1", template: "person", params: { personId: "synthetic person" } });
function data(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== Object.keys(descriptors).length || Object.entries(descriptors).some(([key, value]) => ["__proto__", "constructor", "prototype"].includes(key) || value.get || value.set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
  return input;
}
function fields(input, required, optional = []) {
  if (required.some((key) => !Object.hasOwn(input, key)) || Object.keys(input).some((key) => ![...required, ...optional].includes(key))) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
}
function text(value, key, limit = 512) {
  if (typeof value !== "string" || value.length > limit || /[\u0000-\u001f<>]/.test(value)) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);
  return value;
}
function boolean(value) {
  if (typeof value !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
  return value;
}
var surfaceKeys = ["fixture", "heading", "body", "footer", "variant", "density"];
var templates = Object.freeze({
  person: Object.freeze({ routeId: "synthetic-person-route", pageId: "synthetic-person-page", path: "/people/:personId" }),
  "project-item": Object.freeze({ routeId: "synthetic-project-route", pageId: "synthetic-project-page", path: "/projects/[projectId]/items/:itemId" })
});
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
var unsupportedFixtures = Object.freeze({
  component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: protected capture prerequisites remain open",
  package: "PACKAGE_NOT_ADMITTED: only Card and the native Panel layout fixture are admitted",
  regions: "REGION_SCHEMA_UNSUPPORTED: composition rendering is not admitted",
  route: "ROUTE_RENDERING_UNAVAILABLE: the pure inspector does not render Pages or Menus",
  form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",
  source: "EXECUTABLE_SOURCE_DENIED: no source functions or imports",
  resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability",
  saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"
});

// tests/fixture-preview/sample-coverage.test.ts
test("Card added fields retain v1 defaults and exact supported optional fields", () => {
  const sample = defaultSample();
  const { header, disabled, selected, ...legacy } = sample;
  assert.deepEqual(validateSample(legacy), sample);
  for (const field of ["header", "disabled", "selected"]) assert.throws(() => validateSample({ ...sample, [field]: null }));
  for (const change of [{ header: "<b>bad</b>" }, { header: "x".repeat(513) }, { selected: "true" }, { disabled: 1 }, { selectable: false, selected: true }, { handler: "x" }, { style: "" }, { services: {} }, { css: "" }, { mediaSrc: "https://example.invalid" }]) assert.throws(() => validateSample({ ...sample, ...change }));
  const value = validateSample({ ...sample, header: "Synthetic header", selected: true, disabled: true });
  assert.equal(value.fixture, "native-card-v1");
  assert.match(sampleSummary(value), /Synthetic header/);
});
test("Panel exact text, appearance and local open/collapsible contracts", () => {
  const sample = defaultPanelSample();
  assert.deepEqual(validateSample(sample), sample);
  for (const variant of ["outlined", "elevated", "flat"]) for (const density of ["comfortable", "compact"]) for (const collapsible of [true, false]) for (const open of [true, false]) {
    const value = validateSample({ ...sample, variant, density, collapsible, open });
    assert.equal(value.fixture, "native-panel-v1");
  }
  for (const change of [{ open: 0 }, { collapsible: null }, { heading: "<img>" }, { footer: "x".repeat(513) }, { actions: [] }, { disabled: true }, { css: "" }, { functions: {} }, { service: "" }]) assert.throws(() => validateSample({ ...sample, ...change }));
  const missing = { ...sample };
  delete missing.open;
  assert.throws(() => validateSample(missing));
});
test("two fixed route templates use real pure helpers for encoding and match inspection", () => {
  for (const sample of [defaultRouteSample(), { fixture: "route-inspector-v1", template: "project-item", params: { projectId: "A/B & C", itemId: "item?#\u96EA" } }]) {
    const value = validateSample(sample);
    assert.equal(value.fixture, "route-inspector-v1");
    if (value.fixture !== "route-inspector-v1") throw new Error("Wrong fixture");
    assert.deepEqual(inspectRoute(value).matched, value.params);
    assert(!inspectRoute(value).path.includes("?"));
    assert(!inspectRoute(value).path.includes("#"));
    assert.match(sampleSummary(value), /matched/);
  }
});
test("route inspector rejects arbitrary templates, extras, missing, invalid and over-limit values", () => {
  const sample = defaultRouteSample();
  for (const change of [{ template: "/anything/:id" }, { params: {} }, { params: { personId: "ok", extra: "bad" } }, { params: { personId: "" } }, { params: { personId: "x".repeat(129) } }, { params: { personId: "\uD800" } }, { params: { personId: "<a>" } }, { params: { personId: 1 } }, { navigate: true }, { pathname: "/live" }]) assert.throws(() => validateSample({ ...sample, ...change }));
  let invoked = false;
  const params = {};
  Object.defineProperty(params, "personId", { get() {
    invoked = true;
    return "bad";
  }, enumerable: true });
  assert.throws(() => validateSample({ ...sample, params }));
  assert.equal(invoked, false);
  assert.throws(() => validateSample({ ...sample, params: JSON.parse('{"personId":"ok","__proto__":{}}') }));
});
