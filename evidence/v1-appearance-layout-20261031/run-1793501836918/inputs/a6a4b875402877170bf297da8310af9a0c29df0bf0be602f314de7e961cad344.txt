/** Presentation only. No validator functions, persistence, or authorization policy. */
export interface EditorFieldDescriptor {
  id: string;
  label: string;
  control: string;
  path: string[];
  readOnly?: boolean;
  help?: string;
  visibleWhen?: { path: string[]; equals: string | number | boolean | null };
  options?: { value: string; label: string }[];
  /** Collections address existing objects by permanent ID, with a declared fallback. */
  itemKeys?: string[];
  fields?: EditorFieldDescriptor[];
}
export interface EditorSectionDescriptor {
  id: string;
  label: string;
  target: 'manifest' | 'file';
  role?: string;
  fields: EditorFieldDescriptor[];
}
export interface EditorPresentationDescriptor {
  id: string;
  artifactType: string;
  definitionVersion: number;
  sections: EditorSectionDescriptor[];
  preferredEditorIds?: string[];
}
export function assertJsonSafe(value: unknown, ancestors = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return;
  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('Presentation metadata must be finite, acyclic JSON data.');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Presentation metadata must contain plain objects.');
  ancestors.add(value);
  if (Array.isArray(value)) for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index)) throw new Error('Presentation arrays cannot be sparse.');
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length' && Array.isArray(value)) continue;
    const property = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== 'string' || !property.enumerable || !('value' in property)) throw new Error('Presentation metadata cannot contain symbols or accessors.');
    assertJsonSafe(property.value, ancestors);
  }
  ancestors.delete(value);
}
const unsafe = new Set(['__proto__', 'prototype', 'constructor']);
export function assertFieldPath(path: string[]) {
  if (!Array.isArray(path) || !path.length || path.some(key => typeof key !== 'string' || !key || unsafe.has(key))) throw new Error('Invalid property binding path.');
}
export class EditorDescriptorRegistry {
  private entries = new Map<string, EditorPresentationDescriptor>();
  register(descriptor: EditorPresentationDescriptor) {
    assertJsonSafe(descriptor);
    if (typeof descriptor.id !== 'string' || !descriptor.id || typeof descriptor.artifactType !== 'string' || !descriptor.artifactType || !Number.isInteger(descriptor.definitionVersion) || descriptor.definitionVersion < 1 || !Array.isArray(descriptor.sections)) throw new Error('Descriptor requires an ID, artifact type and exact positive definition version.');
    const ids = new Set<string>();
    const unique = (id: string) => { if (typeof id !== 'string' || !id || ids.has(id)) throw new Error('Duplicate or missing descriptor field/section ID.'); ids.add(id); };
    const fields = (values: EditorFieldDescriptor[]) => {
      if (!Array.isArray(values)) throw new Error('Section fields must be an array.');
      for (const field of values) {
        unique(field.id); assertFieldPath(field.path);
        if (typeof field.label !== 'string' || !field.label || typeof field.control !== 'string' || !field.control || (field.readOnly !== undefined && typeof field.readOnly !== 'boolean')) throw new Error('Field label and component are required.');
        if (field.options && (!Array.isArray(field.options) || field.options.some(option => typeof option.value !== 'string' || typeof option.label !== 'string') || new Set(field.options.map(option => option.value)).size !== field.options.length)) throw new Error('Invalid field selection options.');
        if (field.visibleWhen) { assertFieldPath(field.visibleWhen.path); if (field.visibleWhen.equals !== null && !['string', 'number', 'boolean'].includes(typeof field.visibleWhen.equals)) throw new Error('Field visibility requires a scalar comparison.'); }
        if (field.fields) fields(field.fields);
        if (field.itemKeys) field.itemKeys.forEach(key => assertFieldPath([key]));
      }
    };
    if (descriptor.preferredEditorIds && (!Array.isArray(descriptor.preferredEditorIds) || descriptor.preferredEditorIds.some(id => typeof id !== 'string' || !id))) throw new Error('Invalid preferred plugin IDs.');
    for (const section of descriptor.sections) {
      unique(section.id);
      if (!section.label || !['manifest', 'file'].includes(section.target) || (section.target === 'file' && !section.role)) throw new Error('Invalid section source binding.');
      fields(section.fields);
      if (section.target === 'manifest' && section.fields.some(field => ['artifactId', 'artifactType', 'definitionVersion', 'schemaVersion', 'files'].includes(field.path[0]) && !field.readOnly)) throw new Error('Identity, version and file mappings are read-only presentation fields.');
    }
    const key = `${descriptor.artifactType}:${descriptor.definitionVersion}`;
    if (this.entries.has(key) || [...this.entries.values()].some(value => value.id === descriptor.id)) throw new Error('Descriptor ID or type/version already registered.');
    this.entries.set(key, structuredClone(descriptor));
  }
  resolve(artifactType: string, definitionVersion: number) {
    const descriptor = this.entries.get(`${artifactType}:${definitionVersion}`);
    return descriptor ? structuredClone(descriptor) : undefined;
  }
}
