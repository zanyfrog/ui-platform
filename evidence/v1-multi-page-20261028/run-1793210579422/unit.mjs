// tests/multi-page/source.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
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

// packages/visual-artifacts/src/page-links.ts
function isPlainPageRoute(route) {
  return typeof route === "string" && /^(?:\/|\/[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*)$/.test(route);
}
function pageLinks(source) {
  return parseSource(source).nodes.filter((node) => node.tag === "a" && node.attributes.href?.startsWith("/") && !node.attributes.href.startsWith("//")).map((node) => ({ node: node.id ?? `offset ${node.start}`, href: node.attributes.href }));
}
function assertPlainPageRoute(route, pages2, locator) {
  if (!isPlainPageRoute(route)) throw new Error("Use a canonical Page path such as /home, without parameters, query or fragment.");
  if (pages2.some((page2) => page2.locator !== locator && page2.metadata?.route === route)) throw new Error(`A saved Page already owns route ${route}.`);
}
function assertPageUnused(route, pages2, locator) {
  const incoming = pages2.filter((page2) => page2.locator !== locator).flatMap((page2) => pageLinks(page2.files.source).filter((link2) => link2.href === route).map((link2) => `${page2.locator} (${link2.node})`));
  if (incoming.length) throw new Error(`Page ${route} is referenced by: ${incoming.join(", ")}. Repair these links first.`);
}
function validatePageLinks(previous, candidate, pages2) {
  const old = new Map(pageLinks(previous).map((link2) => [link2.node, link2.href]));
  for (const link2 of pageLinks(candidate)) {
    if (old.get(link2.node) === link2.href) continue;
    const targets = pages2.filter((page2) => page2.metadata?.route === link2.href);
    if (!isPlainPageRoute(link2.href) || targets.length !== 1 || targets[0].metadata?.shellId || targets[0].diagnostics.some((d) => d.severity === "error")) throw new Error(`Link ${link2.node}: saved Page destination ${link2.href} is missing, ambiguous or unsupported.`);
  }
}

// tests/multi-page/source.test.ts
var page = (route, locator = route.slice(1)) => ({ locator, metadata: { route }, files: { source: "" }, diagnostics: [] });
var pages = [page("/home"), page("/about"), page("/contact")];
var link = (href) => `<section data-uip-node="s"><a data-uip-node="link" href="${href}">Go</a></section>`;
test("canonical plain routes and uniqueness", () => {
  for (const route of ["/home", "/about", "/contact", "/", "/a/b"]) assert.equal(isPlainPageRoute(route), true);
  for (const route of ["//x", "/x/", "/x?y", "/x#y", "/:id", "/a/../b", "/A", "/%61"]) assert.equal(isPlainPageRoute(route), false);
  assert.throws(() => assertPlainPageRoute("/home", pages));
  assert.doesNotThrow(() => assertPlainPageRoute("/home", pages, "home"));
});
test("new managed links resolve exactly one saved plain Page", () => {
  assert.doesNotThrow(() => validatePageLinks("", link("/about"), pages));
  for (const value of ["/missing", "/about#x", "/about?x", "/:id"]) assert.throws(() => validatePageLinks("", link(value), pages));
  assert.throws(() => validatePageLinks("", link("/about"), [...pages, page("/about", "duplicate")]));
});
test("external and unchanged legacy links retain existing policy", () => {
  assert.doesNotThrow(() => validatePageLinks("", link("https://external.invalid/path"), pages));
  assert.doesNotThrow(() => validatePageLinks(link("/legacy"), link("/legacy"), pages));
  assert.throws(() => validatePageLinks(link("/legacy"), link("/missing"), pages));
});
test("incoming reference reports Page and managed link; self references do not prevent deleting self", () => {
  const incoming = page("/home");
  incoming.files.source = link("/about");
  assert.throws(() => assertPageUnused("/about", [incoming, ...pages.slice(1)], "about"), /home \(link\)/);
  assert.doesNotThrow(() => assertPageUnused("/about", [incoming, ...pages.slice(1)], "home"));
});
test("unsupported and invalid saved targets refuse", () => {
  const shell = page("/about");
  shell.metadata.shellId = "shell";
  assert.throws(() => validatePageLinks("", link("/about"), [shell]));
  const invalid = page("/about");
  invalid.diagnostics.push({ severity: "error", message: "invalid" });
  assert.throws(() => validatePageLinks("", link("/about"), [invalid]));
});
