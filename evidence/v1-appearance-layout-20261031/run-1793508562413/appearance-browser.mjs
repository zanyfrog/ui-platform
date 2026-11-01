(() => {
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

  // src/client/visual-artifacts/appearance-css.ts
  var appearanceFields = {
    "background-color": { label: "Background color", presets: ["#ffffff", "#172033", "#e8f1ff", "#f5f7fb", "transparent"] },
    color: { label: "Text color", presets: ["#172033", "#ffffff", "#2456a6", "#526078"] },
    "font-size": { label: "Font size", presets: ["16px", "20px", "24px", "32px", "48px"] },
    "font-weight": { label: "Font weight", presets: ["400", "500", "600", "700", "800"] },
    "text-align": { label: "Text alignment", presets: ["start", "center", "end", "justify"] }
  };
  var begin = "/* uip-appearance:start */";
  var end = "/* uip-appearance:end */";
  var refusal = () => new Error("Appearance is ambiguous or manually styled. Use the advanced CSS source; unrelated CSS has been preserved.");
  function validAppearance(property, value) {
    if (!value) return true;
    if (property === "color" || property === "background-color") return /^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value) || value === "transparent";
    if (property === "font-size") return /^(?:[1-9]\d{0,2}(?:\.\d{1,3})?px|(?:[1-9]\d?(?:\.\d{1,3})?|0?\.[1-9]\d{0,2})(?:rem|em))$/.test(value);
    if (property === "font-weight") return /^(?:[1-9]00|normal|bold)$/.test(value);
    return ["start", "center", "end", "left", "right", "justify"].includes(value);
  }
  function appearanceTarget(source, id, composed) {
    const parsed = parseSource(source), matches = parsed.nodes.filter((node2) => node2.id === id);
    if (parsed.diagnostics.some((d) => d.severity === "error") || matches.length !== 1 || matches[0].manual || !/^[\w-]+$/.test(id)) throw new Error("Select one unambiguous managed HTML element.");
    const node = matches[0];
    let region = false;
    for (let parent = node; parent; parent = parent.parent) {
      if (parent.manual || parent.attributes["data-uip-component"] || parent.tag.includes("-")) throw new Error("Appearance applies to ordinary Page HTML, outside Component internals.");
      if (parent.attributes["data-uip-region"]) region = true;
    }
    if (composed && !region) throw new Error("Select HTML inside a Page-owned Region.");
    if (node.attributes.style) throw new Error("This element has manual inline styling. Use advanced source; no attributes were changed.");
    return node;
  }
  function owned(css) {
    const a = css.indexOf(begin), b = css.indexOf(end);
    if (a < 0 && b < 0) return { start: css.length, finish: css.length, rules: [], manual: [css], exists: false };
    if (a < 0 || b < a || css.indexOf(begin, a + 1) >= 0 || css.indexOf(end, b + 1) >= 0) throw refusal();
    const start = a + begin.length, finish = b, text = css.slice(start, finish), rules = [], ids = /* @__PURE__ */ new Set();
    const pattern = /\s*\[data-uip-node="([\w-]+)"\]\s*\{([^{}]*)\}/gy;
    let offset = 0;
    while (text.slice(offset).trim()) {
      pattern.lastIndex = offset;
      const match = pattern.exec(text);
      if (!match || ids.has(match[1])) throw refusal();
      ids.add(match[1]);
      const bodyStart = start + match.index + match[0].indexOf("{") + 1, body = match[2];
      const declarations = [], seen = /* @__PURE__ */ new Set();
      const declaration = /\s*([a-z-]+)\s*:\s*([^;]*?)(\s*);/gy;
      let cursor = 0;
      while (body.slice(cursor).trim()) {
        declaration.lastIndex = cursor;
        const item = declaration.exec(body);
        if (!item) throw refusal();
        const property = item[1], value = item[2];
        if (!Object.hasOwn(appearanceFields, property) || seen.has(property) || !value || !validAppearance(property, value)) throw refusal();
        seen.add(property);
        const valueStart = bodyStart + item.index + item[0].indexOf(":") + 1 + item[0].slice(item[0].indexOf(":") + 1).search(/\S/);
        declarations.push({ property, value, start: bodyStart + item.index, end: bodyStart + declaration.lastIndex, valueStart, valueEnd: valueStart + value.length });
        cursor = declaration.lastIndex;
      }
      rules.push({ id: match[1], start: start + match.index, end: start + pattern.lastIndex, bodyStart, bodyEnd: bodyStart + body.length, declarations });
      offset = pattern.lastIndex;
    }
    return { start, finish, rules, manual: [css.slice(0, a), css.slice(b + end.length)], exists: true };
  }
  function manualConflict(css, node, property) {
    const plain = css.replace(/\/\*[\s\S]*?\*\//g, " ");
    if (/\/\*|\*\/|[@\\]/.test(plain)) throw refusal();
    const rule = /\s*([^{}]+)\{([^{}]*)\}/gy;
    let cursor = 0;
    while (plain.slice(cursor).trim()) {
      rule.lastIndex = cursor;
      const match = rule.exec(plain);
      if (!match) throw refusal();
      cursor = rule.lastIndex;
      let applies = false;
      for (const entry of match[1].split(",")) {
        const selector = entry.trim();
        const identity = /^\[data-uip-node="([\w-]+)"\]$/.exec(selector);
        if (identity) applies ||= identity[1] === node.id;
        else if ([":host", ":root"].includes(selector)) {
        } else if (selector === "*") applies = true;
        else {
          if (!/^(?:[a-z][\w-]*)?(?:[.#][\w-]+)*$/i.test(selector) || !selector) throw refusal();
          const tag = /^[a-z][\w-]*/i.exec(selector)?.[0], classes = node.attributes.class?.split(/\s+/) ?? [];
          applies ||= (!tag || tag.toLowerCase() === node.tag) && [...selector.matchAll(/([.#])([\w-]+)/g)].every((m) => m[1] === "#" ? node.attributes.id === m[2] : classes.includes(m[2]));
        }
      }
      for (const declaration of match[2].split(";")) {
        if (!declaration.trim()) continue;
        const item = /^\s*([a-z-]+)\s*:\s*[^{}]+$/i.exec(declaration);
        if (!item) throw refusal();
        const name = item[1].toLowerCase();
        if (applies && (name === property || name === "all" || name === "font" && property.startsWith("font-") || name === "background" && property === "background-color" || name === "animation" || name === "animation-name" || name.startsWith("transition"))) throw refusal();
      }
    }
  }
  function readAppearance(css, id) {
    const rule = owned(css).rules.find((rule2) => rule2.id === id);
    return Object.fromEntries(rule?.declarations.map((d) => [d.property, d.value]) ?? []);
  }
  function changeAppearance(css, source, id, composed, property, value, sharedCss = "") {
    if (!Object.hasOwn(appearanceFields, property) || !validAppearance(property, value)) throw new Error("Choose a supported color, size, weight or alignment value.");
    const node = appearanceTarget(source, id, composed), area = owned(css);
    for (const manual of area.manual) manualConflict(manual, node, property);
    if (sharedCss) manualConflict(sharedCss, node, property);
    const rule = area.rules.find((rule2) => rule2.id === id), declaration = rule?.declarations.find((d) => d.property === property);
    if (declaration) {
      if (!value) return rule.declarations.length === 1 ? css.slice(0, rule.start) + css.slice(rule.end) : css.slice(0, declaration.start) + css.slice(declaration.end);
      return css.slice(0, declaration.valueStart) + value + css.slice(declaration.valueEnd);
    }
    if (!value) return css;
    if (rule) return css.slice(0, rule.bodyEnd) + `  ${property}: ${value};
` + css.slice(rule.bodyEnd);
    const next = `
[data-uip-node="${id}"] {
  ${property}: ${value};
}
`;
    return area.exists ? css.slice(0, area.finish) + next + css.slice(area.finish) : css + `
${begin}${next}${end}
`;
  }

  // src/client/visual-artifacts/style-controls.ts
  function field(parent, name, input) {
    const label = document.createElement("label");
    label.append(name, input);
    parent.append(label);
  }
  function choice(name, values, value) {
    const select = document.createElement("select");
    select.setAttribute("aria-label", name);
    for (const [label, value2] of values) select.add(new Option(label, value2));
    select.value = value;
    return select;
  }
  var fields = [
    ["padding", "Padding", ["0px", "0.5rem", "1rem", "2rem", "32px"]],
    ["margin", "Margin", ["0px", "0.5rem", "1rem", "2rem", "auto"]],
    ["gap", "Gap", ["0px", "0.5rem", "1rem", "2rem"]],
    ["width", "Width", ["100%", "75%", "50%", "320px", "auto"]],
    ["height", "Height", ["auto", "100%", "240px", "20rem"]],
    ["display", "Display (advanced)", ["block", "flex", "grid", "none"]],
    ["gridTemplateColumns", "Grid columns", ["1fr", "1fr 1fr", "1fr 1fr 1fr"]],
    ["gridColumn", "Grid span", ["auto", "span 2", "1 / -1"]],
    ["flexDirection", "Flex direction", ["row", "column"]],
    ["alignItems", "Item alignment (advanced)", ["start", "center", "end", "stretch"]],
    ["justifyContent", "Content alignment (advanced)", ["start", "center", "end", "space-between", "space-around"]]
  ];
  function layoutControls(parent, wrapper, selected, metadata, change, viewport = "base", remember = () => {
  }) {
    const group = document.createElement("fieldset"), legend = document.createElement("legend");
    legend.textContent = "Space and layout";
    group.append(legend);
    const note = document.createElement("p");
    note.textContent = `Layout wrapper: ${wrapper} (${wrapper === selected ? "selected wrapper" : "immediate parent wrapper"}). Appearance targets the selected element separately.`;
    group.append(note);
    const breakpoint = choice("Breakpoint", [["Desktop (base)", "base"], ["Tablet (up to 1023px)", "tablet"], ["Mobile (up to 639px)", "mobile"]], viewport);
    breakpoint.dataset.breakpoint = "";
    field(group, "Viewport override", breakpoint);
    const host = document.createElement("div");
    host.dataset.layout = "";
    group.append(host);
    parent.append(group);
    const render = () => {
      host.replaceChildren();
      const bp = breakpoint.value, layout = metadata().layout?.[wrapper] ?? {}, values = layout[bp] ?? {};
      const effective = { ...layout.base, ...bp !== "base" ? layout.tablet : {}, ...bp === "mobile" ? layout.mobile : {} };
      const arrangement = choice("Layout arrangement", [["Inherit / reset arrangement", ""], ["Block", "block"], ["Row", "row"], ["Column", "column"], ["Grid", "grid"]], values.display === "flex" ? values.flexDirection ?? "row" : values.display ?? "");
      arrangement.onchange = () => {
        const v = arrangement.value;
        change(bp, { display: v === "row" || v === "column" ? "flex" : v, flexDirection: v === "row" || v === "column" ? v : void 0 });
      };
      field(host, "Arrange content", arrangement);
      const column = effective.display === "flex" && effective.flexDirection === "column";
      for (const [label, key] of [["Horizontal alignment", column ? "alignItems" : "justifyContent"], ["Vertical alignment", column ? "justifyContent" : "alignItems"]]) {
        const options = [["Inherit", ""], ["Start", "start"], ["Center", "center"], ["End", "end"], ...key === "alignItems" ? [["Stretch", "stretch"]] : [["Space between", "space-between"]]];
        const control = choice(label, options, values[key] ?? "");
        control.onchange = () => change(bp, { [key]: control.value || void 0 });
        field(host, label, control);
      }
      const help = document.createElement("p");
      help.textContent = "Empty/reset removes this viewport override. Tablet also applies on Mobile unless overridden. px, rem and % presets are available; advanced fields retain existing CSS entry.";
      host.append(help);
      for (const [key, label, presets] of fields) {
        const input = document.createElement("input");
        input.value = values[key] ?? "";
        input.placeholder = "Inherit";
        input.setAttribute("aria-label", `Layout ${bp} ${key}`);
        input.onchange = () => change(bp, { [key]: input.value || void 0 });
        field(host, label, input);
        const preset = choice(`${label} preset`, [["Inherit", ""], ...presets.map((value) => [value, value])], values[key] ?? "");
        preset.onchange = () => change(bp, { [key]: preset.value || void 0 });
        host.append(preset);
        const reset = document.createElement("button");
        reset.textContent = `Reset ${label}`;
        reset.onclick = () => change(bp, { [key]: void 0 });
        host.append(reset);
      }
    };
    breakpoint.onchange = () => {
      remember(breakpoint.value);
      render();
    };
    render();
  }

  // tests/appearance-layout/browser.ts
  window.appearance = { changeAppearance, readAppearance, layoutControls };
})();
