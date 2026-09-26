import { assertFieldPath, assertJsonSafe, type EditorFieldDescriptor, type EditorSectionDescriptor } from '../../shared/editor-presentation.js';
import type { EditorRuntimeContext } from './context.js';

export class PropertyCompatibilityError extends Error {
  constructor(readonly kind: 'invalid' | 'unsupported' | 'unavailable', message: string) { super(message); }
}
export type PropertyPath = (string | { key: string; value: string })[];
interface JsonNode { start: number; end: number; value: unknown; properties?: Map<string, JsonNode>; items?: JsonNode[] }
/** Span parser for targeted edits, not artifact validation. Untouched source bytes stay untouched. */
function parse(source: string): JsonNode {
  try { JSON.parse(source); } catch { throw new PropertyCompatibilityError('invalid', 'Source is not valid JSON. Structured editing is paused; source is preserved.'); }
  let position = 0;
  const whitespace = () => { while (/\s/.test(source[position] ?? '') && position < source.length) position++; };
  const quoted = () => {
    const start = position++;
    while (position < source.length) { if (source[position++] === '"') break; if (source[position - 1] === '\\') position++; }
    return JSON.parse(source.slice(start, position)) as string;
  };
  function node(): JsonNode {
    whitespace(); const start = position;
    if (source[position] === '{') {
      position++; whitespace(); const properties = new Map<string, JsonNode>();
      while (source[position] !== '}') {
        const key = quoted(); whitespace(); position++; const child = node();
        if (properties.has(key)) throw new PropertyCompatibilityError('unsupported', 'Duplicate JSON keys cannot be safely edited visually. Source is preserved.');
        properties.set(key, child); whitespace(); if (source[position] !== ',') break; position++; whitespace();
      }
      position++;
      return { start, end: position, value: JSON.parse(source.slice(start, position)), properties };
    }
    if (source[position] === '[') {
      position++; whitespace(); const items: JsonNode[] = [];
      while (source[position] !== ']') { items.push(node()); whitespace(); if (source[position] !== ',') break; position++; whitespace(); }
      position++; return { start, end: position, value: items.map(item => item.value), items };
    }
    if (source[position] === '"') quoted();
    else while (position < source.length && !/[\s,}\]]/.test(source[position])) position++;
    return { start, end: position, value: JSON.parse(source.slice(start, position)) };
  }
  return node();
}
function sourceFor(context: EditorRuntimeContext, section: EditorSectionDescriptor) {
  const artifact = context.snapshot?.artifact;
  if (!artifact) throw new PropertyCompatibilityError('unavailable', 'Artifact access is suspended or closed.');
  if (section.target === 'manifest') return { source: artifact.manifestContent, path: 'artifact.json' };
  const path = artifact.manifest?.files?.[section.role!];
  const files = artifact.files.filter(file => file.role === section.role && file.path === path);
  if (!path || files.length !== 1) throw new PropertyCompatibilityError('unavailable', `Declared file role ${section.role} is missing or ambiguous. Source is preserved.`);
  return { source: files[0].content, path };
}
function child(node: JsonNode, part: PropertyPath[number]): JsonNode | undefined {
  if (typeof part === 'string') {
    assertFieldPath([part]);
    if (!node.properties) throw new PropertyCompatibilityError('unsupported', 'Expected an object at this property path. Existing source is preserved.');
    return node.properties.get(part);
  }
  assertFieldPath([part.key]);
  const matches = node.items?.filter(item => item.properties?.get(part.key)?.value === part.value);
  if (matches?.length !== 1) throw new PropertyCompatibilityError('unsupported', 'The collection item changed or has an ambiguous identity. Refresh the field before editing.');
  return matches[0];
}
export function readProperty(context: EditorRuntimeContext, section: EditorSectionDescriptor, path: PropertyPath) {
  const source = sourceFor(context, section); let current: JsonNode | undefined = parse(source.source);
  for (const part of path) { if (!current) break; current = child(current, part); }
  return { value: current?.value, file: source.path };
}
export function writeProperty(context: EditorRuntimeContext, section: EditorSectionDescriptor, field: EditorFieldDescriptor, path: PropertyPath, value: unknown) {
  if (!path.length) throw new Error('A property path is required.');
  assertJsonSafe(value);
  if (!context.canEdit || field.readOnly) throw new Error('This property is read-only.');
  if (section.target === 'manifest' && typeof path[0] === 'string' && ['artifactId', 'artifactType', 'definitionVersion', 'schemaVersion', 'files'].includes(path[0])) throw new Error('Artifact identity and file mappings are read-only.');
  // Always re-read the latest shared snapshot, even when an event came from an older panel render.
  const source = sourceFor(context, section); const root = parse(source.source);
  let current = root;
  const serialized = JSON.stringify(value);
  if (serialized === undefined || (typeof value === 'number' && !Number.isFinite(value))) throw new Error('A JSON value is required.');
  const replace = (start: number, end: number, text: string) => {
    const next = source.source.slice(0, start) + text + source.source.slice(end);
    if (section.target === 'manifest') context.setManifest(next); else context.setFile(source.path, next);
  };
  for (let index = 0; index < path.length; index++) {
    const part = path[index], next = child(current, part);
    if (!next) {
      if (typeof part !== 'string' || !current.properties) throw new PropertyCompatibilityError('unsupported', 'Cannot create this binding.');
      let inserted = value;
      for (let remaining = path.length - 1; remaining > index; remaining--) {
        const key = path[remaining]; if (typeof key !== 'string') throw new PropertyCompatibilityError('unsupported', 'Cannot create a missing collection item.');
        assertFieldPath([key]); inserted = { [key]: inserted };
      }
      replace(current.end - 1, current.end - 1, `${current.properties.size ? ',' : ''}${JSON.stringify(part)}:${JSON.stringify(inserted)}`); return;
    }
    current = next;
  }
  if (['text', 'long-text', 'select', 'number', 'boolean'].includes(field.control)) {
    const allowed = field.control === 'boolean' ? ['boolean'] : field.control === 'number' ? ['string', 'number'] : ['string'];
    if (!allowed.includes(typeof current.value)) throw new PropertyCompatibilityError('unsupported', 'The latest source value has an unsupported structure. Refresh the field before editing.');
    if (!allowed.includes(typeof value)) throw new PropertyCompatibilityError('unsupported', 'The field cannot represent this value.');
  }
  replace(current.start, current.end, serialized);
}
export function collectionItems(value: unknown, keys: string[] = []) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new PropertyCompatibilityError('unsupported', 'Expected an object collection. Existing value is preserved.');
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new PropertyCompatibilityError('unsupported', 'This collection contains an unsupported item. Source is preserved.');
    const key = keys.find(key => typeof item[key] === 'string' && item[key] && value.filter(other => other?.[key] === item[key]).length === 1);
    if (!key) throw new PropertyCompatibilityError('unsupported', 'Collection items need unique permanent IDs or the declared fallback key. Source is preserved.');
    return { key, value: item[key] as string };
  });
}
