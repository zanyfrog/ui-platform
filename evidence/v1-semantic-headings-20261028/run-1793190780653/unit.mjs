// tests/semantic-headings/source.test.ts
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
function setHeadingLevel(source, id, level) {
  if (!/^h[1-6]$/.test(level)) throw new Error("Choose a heading level from H1 to H6.");
  const parsed = parseSource(source), node = parsed.nodes.find((n) => n.id === id);
  if (parsed.diagnostics.some((d) => d.severity === "error") || !node || node.manual || !/^h[1-6]$/.test(node.tag) || node.attributes["data-uip-component"]) throw new Error("Select an unambiguous managed HTML heading.");
  const opening = source.slice(node.start, node.openEnd), closing = source.slice(node.closeStart, node.end);
  if (!/^<h[1-6](?=\s|>)/i.test(opening) || !/^<\/h[1-6]\s*>$/i.test(closing)) throw new Error("Heading requires explicit paired tags.");
  if (node.tag === level) return source;
  return source.slice(0, node.start) + opening.replace(/^<h[1-6]/i, "<" + level) + source.slice(node.openEnd, node.closeStart) + closing.replace(/^<\/h[1-6]/i, "</" + level) + source.slice(node.end);
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

// tests/semantic-headings/source.test.ts
test("insertion retains managed contracts for all six headings", () => {
  for (let level = 1; level <= 6; level++) {
    let n = 0;
    const source = insertNode("", "h" + level, void 0, void 0, () => `node_${++n}`);
    const nodes = parseSource(source).nodes;
    assert.equal(nodes[1].tag, "h" + level);
    assert.equal(nodes[1].id, "node_2");
    assert.equal(nodes[1].parent, nodes[0]);
    assert.ok(source.includes(`</h${level}>`));
  }
});
test("conversion changes only paired tag names and preserves attributes, mixed content and position", () => {
  const source = '<section data-uip-node="container"><p data-uip-node="before">Before</p><H2 class="title" data-uip-node="heading" aria-label="Title">Text &amp; <span>detail</span></H2 ><p data-uip-node="after">After</p></section>';
  const expected = source.replace("<H2 ", "<h3 ").replace("</H2 >", "</h3 >");
  const changed = setHeadingLevel(source, "heading", "h3");
  assert.equal(changed, expected);
  const node = parseSource(changed).nodes.find((n) => n.id === "heading");
  assert.equal(node.parent?.id, "container");
  assert.equal(node.children[0].tag, "span");
  assert.deepEqual(parseSource(changed).nodes.filter((n) => n.id).map((n) => n.id), ["container", "before", "heading", "after"]);
});
test("same level is byte-identical and repeated conversion never duplicates identity/content", () => {
  let source = '<h1 data-uip-node="title">A &lt;literal&gt;</h1>';
  assert.equal(setHeadingLevel(source, "title", "h1"), source);
  for (let n = 2; n <= 6; n++) {
    source = setHeadingLevel(source, "title", "h" + n);
    assert.equal(parseSource(source).nodes.length, 1);
    assert.equal((source.match(/data-uip-node=/g) || []).length, 1);
    assert.ok(source.includes("A &lt;literal&gt;"));
  }
});
test("malformed, duplicate, manual, nonheading and Component markup is refused", () => {
  for (const source of ["<h2>Manual</h2>", '<h2 data-uip-node="title">Unclosed', '<h2 data-uip-node="title">Mismatch</h3>', '<h2 data-uip-node="title">One</h2><h2 data-uip-node="title">Two</h2>', '<h2 data-uip-node="title" DATA-UIP-NODE="other">Duplicate</h2>', '<h2 data-uip-node="title"/>', '<p data-uip-node="title">Paragraph</p>', '<h2 data-uip-node="title" data-uip-component="cmp_platform_test">Component</h2>']) assert.throws(() => setHeadingLevel(source, "title", "h3"), void 0, source);
  for (const level of ["h0", "h7", "H2", "div", "h2 onclick=bad"]) assert.throws(() => setHeadingLevel('<h2 data-uip-node="title">Title</h2>', "title", level));
});
