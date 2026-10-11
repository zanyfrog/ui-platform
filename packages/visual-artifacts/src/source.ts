import type { Diagnostic } from './model.js';

export interface SourceNode { id?: string; tag: string; attributes: Record<string, string>; start: number; openEnd: number; end: number; closeStart: number; parent?: SourceNode; children: SourceNode[]; manual: boolean }
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const optionalTags = new Set('p li dt dd rt rp option optgroup thead tbody tfoot tr td th'.split(' '));
const blockTags = new Set('address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul'.split(' '));
export const escapeAttribute = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const decode = (value: string): string => value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

/** Conservative, offset-based HTML reader. Unsupported regions remain untouched, never round-tripped through a DOM serializer. */
export function parseSource(source: string): { nodes: SourceNode[]; diagnostics: Diagnostic[] } {
  const nodes: SourceNode[] = [], stack: SourceNode[] = [], diagnostics: Diagnostic[] = [];
  const implicitClose = (offset: number) => {
    const node = stack.pop()!; node.closeStart = offset; node.end = offset; node.manual = true;
    diagnostics.push({ severity: 'warning', message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
  };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(source))) {
    const raw = match[0];
    if (raw.startsWith('<!')) continue;
    const tag = /^<\/?([\w:-]+)/.exec(raw)![1].toLowerCase();
    if (raw.startsWith('</')) {
      while (stack.length && stack.at(-1)!.tag !== tag && optionalTags.has(stack.at(-1)!.tag)) implicitClose(match.index);
      const node = stack.at(-1);
      if (!node || node.tag !== tag) { diagnostics.push({ severity: 'error', message: `Unmatched closing tag ${tag}. Visual editing requires explicit balanced markup.` }); continue; }
      node.closeStart = match.index; node.end = token.lastIndex; stack.pop(); continue;
    }
    while (stack.length) {
      const top = stack.at(-1)!.tag;
      const closes = (top === 'p' && blockTags.has(tag)) || (['li', 'option', 'optgroup', 'tr', 'thead', 'tbody', 'tfoot'].includes(top) && top === tag) || (['dt', 'dd'].includes(top) && ['dt', 'dd'].includes(tag)) || (['td', 'th'].includes(top) && ['td', 'th'].includes(tag));
      if (!closes) break;
      implicitClose(match.index);
    }
    const attributes: Record<string, string> = {};
    const attrs = raw.slice(tag.length + 1, raw.length - 1);
    for (const attr of attrs.matchAll(/([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attributes[attr[1]] = decode(attr[2] ?? attr[3] ?? attr[4] ?? '');
    const node: SourceNode = { id: attributes['data-uip-node'], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes['data-uip-node'] };
    node.parent?.children.push(node); nodes.push(node);
    if (['script', 'style', 'textarea'].includes(tag)) {
      const close = new RegExp(`</${tag}\\s*>`, 'ig'); close.lastIndex = token.lastIndex;
      const ending = close.exec(source);
      if (ending) { node.closeStart = ending.index; node.end = close.lastIndex; token.lastIndex = close.lastIndex; }
      else diagnostics.push({ severity: 'error', message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags.has(tag) && !raw.endsWith('/>')) stack.push(node);
  }
  while (stack.length && optionalTags.has(stack.at(-1)!.tag)) implicitClose(source.length);
  for (const node of stack) diagnostics.push({ severity: 'error', message: `Unclosed ${node.tag}.` });
  const ids = new Set<string>();
  for (const node of nodes) if (node.id) {
    if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: 'error', message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
    ids.add(node.id);
    if (!isWrapper(node) && !isWrapper(node.parent)) diagnostics.push({ severity: 'warning', message: 'Layout is manual because this node has no Builder wrapper.', node: node.id });
  }
  return { nodes, diagnostics };
}
export function isWrapper(node?: SourceNode): boolean { return Boolean(node?.attributes.class?.split(/\s+/).includes('uip-layout-item')); }
export function serializeSource(source: string): string { return source; }
export function setNodeAttribute(source: string, id: string, name: string, value: string): string {
  if (!/^[\w:-]+$/.test(name)) throw new Error('Invalid attribute name.');
  const parsed = parseSource(source);
  const node = parsed.nodes.find(n => n.id === id);
  if (!node || node.manual || parsed.nodes.filter(n => n.id === id).length !== 1) throw new Error('Select an unambiguous editor-managed node.');
  const opening = source.slice(node.start, node.openEnd);
  const pattern = new RegExp(`\\s${name}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?(?=\\s|/?>)`);
  const attr = ` ${name}="${escapeAttribute(value)}"`;
  const next = pattern.test(opening) ? opening.replace(pattern, () => attr) : opening.replace(/\s*\/?>$/, end => attr + end);
  return source.slice(0, node.start) + next + source.slice(node.openEnd);
}
export function insertNode(source: string, tag: string, componentId?: string, parentId?: string, newId = () => `node_${globalThis.crypto.randomUUID()}`): string {
  if (!/^[a-z][a-z0-9-]*$/.test(tag) || ['script', 'style', 'iframe'].includes(tag)) throw new Error('Unsupported insertion tag.');
  const parsed = parseSource(source);
  if (parsed.diagnostics.some(d => d.severity === 'error')) throw new Error('Repair source structure before inserting.');
  const parent = parentId ? parsed.nodes.find(n => n.id === parentId) : undefined;
  if (parentId && (!parent || parent.attributes['data-uip-component'] || voidTags.has(parent.tag))) throw new Error('Insert into an ordinary HTML container or layout wrapper.');
  const offset = parent?.closeStart ?? source.length;
  const markup = `\n<div class="uip-layout-item" data-uip-node="${newId()}">\n  <${tag} data-uip-node="${newId()}"${componentId ? ` data-uip-component="${escapeAttribute(componentId)}"` : ''}>${voidTags.has(tag) ? '' : `</${tag}>`}\n</div>\n`;
  return source.slice(0, offset) + markup + source.slice(offset);
}

export function moveNode(source: string, id: string, direction: 'up' | 'down'): string {
  const parsed = parseSource(source);
  if (parsed.diagnostics.some(d => d.severity === 'error')) throw new Error('Repair source structure before moving.');
  const selected = parsed.nodes.find(n => n.id === id);
  const node = isWrapper(selected?.parent) ? selected!.parent! : selected;
  if (!node || !node.id) throw new Error('Select a managed layout node.');
  const siblings = parsed.nodes.filter(n => n.parent === node.parent);
  const adjacent = siblings[siblings.indexOf(node) + (direction === 'up' ? -1 : 1)];
  if (!adjacent) return source;
  if (!adjacent.id || adjacent.manual) throw new Error('Move only between managed siblings; edit manual regions in source.');
  const [first, second] = node.start < adjacent.start ? [node, adjacent] : [adjacent, node];
  return source.slice(0, first.start) + source.slice(second.start, second.end) + source.slice(first.end, second.start) + source.slice(first.start, first.end) + source.slice(second.end);
}
