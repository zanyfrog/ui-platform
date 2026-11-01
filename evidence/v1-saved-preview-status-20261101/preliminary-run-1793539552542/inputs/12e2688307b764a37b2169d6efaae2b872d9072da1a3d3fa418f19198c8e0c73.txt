import { parseSource } from '@ui-platform/visual-artifacts';

export const appearanceFields = {
  'background-color': { label: 'Background color', presets: ['#ffffff', '#172033', '#e8f1ff', '#f5f7fb', 'transparent'] },
  color: { label: 'Text color', presets: ['#172033', '#ffffff', '#2456a6', '#526078'] },
  'font-size': { label: 'Font size', presets: ['16px', '20px', '24px', '32px', '48px'] },
  'font-weight': { label: 'Font weight', presets: ['400', '500', '600', '700', '800'] },
  'text-align': { label: 'Text alignment', presets: ['start', 'center', 'end', 'justify'] },
} as const;
export type AppearanceProperty = keyof typeof appearanceFields;
const begin = '/* uip-appearance:start */', end = '/* uip-appearance:end */';
const refusal = () => new Error('Appearance is ambiguous or manually styled. Use the advanced CSS source; unrelated CSS has been preserved.');
export function validAppearance(property: AppearanceProperty, value: string): boolean {
  if (!value) return true;
  if (property === 'color' || property === 'background-color') return /^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value) || value === 'transparent';
  if (property === 'font-size') return /^(?:[1-9]\d{0,2}(?:\.\d{1,3})?px|(?:[1-9]\d?(?:\.\d{1,3})?|0?\.[1-9]\d{0,2})(?:rem|em))$/.test(value);
  if (property === 'font-weight') return /^(?:[1-9]00|normal|bold)$/.test(value);
  return ['start', 'center', 'end', 'left', 'right', 'justify'].includes(value);
}
export function appearanceTarget(source: string, id: string, composed: boolean) {
  const parsed = parseSource(source), matches = parsed.nodes.filter(node => node.id === id);
  if (parsed.diagnostics.some(d => d.severity === 'error') || matches.length !== 1 || matches[0].manual || !/^[\w-]+$/.test(id)) throw new Error('Select one unambiguous managed HTML element.');
  const node = matches[0]; let region = false;
  // The HTML source reader intentionally preserves ordinary attribute spelling.
  // Browser selector/inline-style semantics are ASCII-case insensitive instead.
  const opening = source.slice(node.start, node.openEnd);
  for (const name of ['class', 'id', 'style']) if ([...opening.matchAll(new RegExp(`\\s${name}(?=\\s|=|/?>)`, 'gi'))].length > 1) throw new Error('Duplicate ordinary attributes make this styling target ambiguous. Use advanced HTML source.');
  for (let parent: typeof node | undefined = node; parent; parent = parent.parent) {
    if (parent.manual || parent.attributes['data-uip-component'] || parent.tag.includes('-')) throw new Error('Appearance applies to ordinary Page HTML, outside Component internals.');
    if (parent.attributes['data-uip-region']) region = true;
  }
  if (composed && !region) throw new Error('Select HTML inside a Page-owned Region.');
  if (Object.entries(node.attributes).some(([key, value]) => key.toLowerCase() === 'style' && value)) throw new Error('This element has manual inline styling. Use advanced source; no attributes were changed.');
  return node;
}
type Rule = { id: string; start: number; end: number; bodyStart: number; bodyEnd: number; declarations: Array<{ property: AppearanceProperty; value: string; start: number; end: number; valueStart: number; valueEnd: number }> };
function owned(css: string) {
  const a = css.indexOf(begin), b = css.indexOf(end);
  if (a < 0 && b < 0) return { start: css.length, finish: css.length, rules: [] as Rule[], manual: [css], exists: false };
  if (a < 0 || b < a || css.indexOf(begin, a + 1) >= 0 || css.indexOf(end, b + 1) >= 0) throw refusal();
  const start = a + begin.length, finish = b, text = css.slice(start, finish), rules: Rule[] = [], ids = new Set<string>();
  const pattern = /\s*\[data-uip-node="([\w-]+)"\]\s*\{([^{}]*)\}/gy;
  let offset = 0;
  while (text.slice(offset).trim()) {
    pattern.lastIndex = offset; const match = pattern.exec(text); if (!match || ids.has(match[1])) throw refusal(); ids.add(match[1]);
    const bodyStart = start + match.index + match[0].indexOf('{') + 1, body = match[2];
    const declarations: Rule['declarations'] = [], seen = new Set<string>(); const declaration = /\s*([a-z-]+)\s*:\s*([^;]*?)(\s*);/gy;
    let cursor = 0;
    while (body.slice(cursor).trim()) {
      declaration.lastIndex = cursor; const item = declaration.exec(body); if (!item) throw refusal();
      const property = item[1] as AppearanceProperty, value = item[2];
      if (!Object.hasOwn(appearanceFields, property) || seen.has(property) || !value || !validAppearance(property, value)) throw refusal(); seen.add(property);
      const valueStart = bodyStart + item.index + item[0].indexOf(':') + 1 + item[0].slice(item[0].indexOf(':') + 1).search(/\S/);
      declarations.push({ property, value, start: bodyStart + item.index, end: bodyStart + declaration.lastIndex, valueStart, valueEnd: valueStart + value.length }); cursor = declaration.lastIndex;
    }
    rules.push({ id: match[1], start: start + match.index, end: start + pattern.lastIndex, bodyStart, bodyEnd: bodyStart + body.length, declarations }); offset = pattern.lastIndex;
  }
  return { start, finish, rules, manual: [css.slice(0, a), css.slice(b + end.length)], exists: true };
}
/** Bounded admission of flat CSS only, never a general parser or rewriter.
 * Unknown selectors, at-rules, escapes, nesting and malformed declarations refuse.
 * All admitted manual bytes remain untouched, including comments and !important.
 */
function manualConflict(css: string, node: ReturnType<typeof appearanceTarget>, property: AppearanceProperty) {
  let plain = '';
  for (let index = 0; index < css.length;) {
    if (css.startsWith('/*', index)) {
      const finish = css.indexOf('*/', index + 2); if (finish < 0) throw refusal();
      plain += ' '; index = finish + 2; continue;
    }
    const identity = /^\[data-uip-node="[\w-]+"\]/.exec(css.slice(index));
    if (identity) { plain += identity[0]; index += identity[0].length; continue; }
    // Quoted values/imports require a general CSS lexer; leave them advanced.
    if (css[index] === '"' || css[index] === "'") throw refusal();
    plain += css[index++];
  }
  if (/\/\*|\*\/|[@\\]/.test(plain)) throw refusal();
  const rule = /\s*([^{}]+)\{([^{}]*)\}/gy; let cursor = 0;
  while (plain.slice(cursor).trim()) {
    rule.lastIndex = cursor; const match = rule.exec(plain); if (!match) throw refusal(); cursor = rule.lastIndex;
    let applies = false;
    for (const entry of match[1].split(',')) {
      const selector = entry.trim();
      const identity = /^\[data-uip-node="([\w-]+)"\]$/.exec(selector);
      if (identity) applies ||= identity[1] === node.id;
      else if ([':host', ':root'].includes(selector)) { /* Artifact host is an inheritance source, not this node. */ }
      else if (selector === '*') applies = true;
      else {
        if (!/^(?:[a-z][\w-]*)?(?:[.#][\w-]+)*$/i.test(selector) || !selector) throw refusal();
        const attribute = (name: string) => Object.entries(node.attributes).find(([key]) => key.toLowerCase() === name)?.[1];
        const tag = /^[a-z][\w-]*/i.exec(selector)?.[0], classes = attribute('class')?.split(/\s+/) ?? [];
        applies ||= (!tag || tag.toLowerCase() === node.tag) && [...selector.matchAll(/([.#])([\w-]+)/g)].every(m => m[1] === '#' ? attribute('id') === m[2] : classes.includes(m[2]));
      }
    }
    for (const declaration of match[2].split(';')) {
      if (!declaration.trim()) continue;
      const item = /^\s*([a-z-]+)\s*:\s*[^{}]+$/i.exec(declaration); if (!item) throw refusal();
      const name = item[1].toLowerCase();
      if (applies && (name === property || name === 'all' || name === 'font' && property.startsWith('font-') || name === 'background' && property === 'background-color' || name === 'animation' || name === 'animation-name' || name.startsWith('transition'))) throw refusal();
    }
  }
}
export function readAppearance(css: string, id: string): Partial<Record<AppearanceProperty, string>> {
  const rule = owned(css).rules.find(rule => rule.id === id);
  return Object.fromEntries(rule?.declarations.map(d => [d.property, d.value]) ?? []);
}
export function changeAppearance(css: string, source: string, id: string, composed: boolean, property: AppearanceProperty, value: string, sharedCss = ''): string {
  if (!Object.hasOwn(appearanceFields, property) || !validAppearance(property, value)) throw new Error('Choose a supported color, size, weight or alignment value.');
  const node = appearanceTarget(source, id, composed), area = owned(css);
  for (const manual of area.manual) manualConflict(manual, node, property);
  if (sharedCss) manualConflict(sharedCss, node, property);
  const rule = area.rules.find(rule => rule.id === id), declaration = rule?.declarations.find(d => d.property === property);
  if (declaration) {
    if (!value) return rule!.declarations.length === 1 ? css.slice(0, rule!.start) + css.slice(rule!.end) : css.slice(0, declaration.start) + css.slice(declaration.end);
    return css.slice(0, declaration.valueStart) + value + css.slice(declaration.valueEnd);
  }
  if (!value) return css;
  if (rule) return css.slice(0, rule.bodyEnd) + `  ${property}: ${value};\n` + css.slice(rule.bodyEnd);
  const next = `\n[data-uip-node="${id}"] {\n  ${property}: ${value};\n}\n`;
  return area.exists ? css.slice(0, area.finish) + next + css.slice(area.finish) : css + `\n${begin}${next}${end}\n`;
}
