/** Shared helpers may retain business state, but never a Visual revision's
 * context, rendered nodes, artifact objects or callbacks into that revision.
 * Argument instrumentation preserves the helper module and function identities.
 */
const shared = new WeakSet<object>();
const owners = new WeakMap<object, Set<object>>();
interface ManagedRuntime { metadata: object; source: string; css: string; functions?: unknown }
const managed = new WeakMap<object, { revision: string; artifact: ManagedRuntime; composition?: unknown; assets?: Record<string, string> }>();
const managedIds = new Set<string>();
function freezeData(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeData(child);
  Object.freeze(value);
}
export function registerManagedVisualGraph(revision: string, artifacts: ManagedRuntime[], composition?: unknown, assets?: Record<string, string>): void {
  for (const artifact of artifacts) {
    const id = (artifact.metadata as { artifactId?: string }).artifactId;
    if (id) { if (managedIds.size >= 10000 && !managedIds.has(id)) throw new Error('Managed Visual identity registry is full. Reload the preview.'); managedIds.add(id); }
    freezeData(artifact.metadata); Object.freeze(artifact);
    managed.set(artifact.metadata, { revision, artifact, composition, assets });
  }
  // Function namespaces keep their original ESM identity; freeze only source data.
  if (composition) for (const [key, value] of Object.entries(composition)) if (!['pages', 'shells'].includes(key)) freezeData(value);
  if (composition) { const graph = composition as { pages?: unknown; shells?: unknown }; Object.freeze(graph.pages); Object.freeze(graph.shells); Object.freeze(composition); }
  freezeData(assets);
}
/** Only the renderer derives Region/Menu projections from validated source. */
export function bindManagedVisualProjection(original: ManagedRuntime, projected: ManagedRuntime): ManagedRuntime {
  const graph = managed.get(original.metadata);
  if (graph) { freezeData(projected.metadata); Object.freeze(projected); managed.set(projected.metadata, { ...graph, artifact: projected }); }
  return projected;
}
export function managedVisualComposition(artifact: ManagedRuntime): { definition: unknown; assetUrl: (relative: string) => string } | undefined {
  const graph = managed.get(artifact.metadata);
  return graph?.composition ? { definition: graph.composition, assetUrl: relative => graph.assets?.[relative] ?? relative } : undefined;
}
export function assertManagedVisualRevision(artifact: ManagedRuntime, dependencies: ManagedRuntime[] = [], composition?: unknown): void {
  const graph = managed.get(artifact.metadata);
  if (!graph) { if (managedIds.has((artifact.metadata as { artifactId: string }).artifactId)) throw new Error('Cloned managed Visual metadata must be loaded through its pinned graph.'); return; }
  if (composition && graph.composition !== composition) throw new Error('Managed Visual composition came from a different runtime graph.');
  if (graph.artifact.source !== artifact.source || graph.artifact.css !== artifact.css || graph.artifact.functions !== artifact.functions) throw new Error('Managed Visual roles came from different runtime revisions. Reload a complete pinned graph.');
  for (const dependency of dependencies) {
    const other = managed.get(dependency.metadata);
    if (!other && managedIds.has((dependency.metadata as { artifactId: string }).artifactId)) throw new Error('Cloned managed Visual dependencies must be loaded through their pinned graph.');
    if (other) assertManagedVisualRevision(dependency);
    if (other && other.revision !== graph.revision) throw new Error('Managed Visual dependencies came from different runtime revisions. Reload a complete pinned graph.');
  }
}
const roleValues = new Set<string>();
let roleBytes = 0;
export function registerVisualRevision(revision: string, roles: string[]): void {
  for (const value of [revision, ...roles]) if (value && !roleValues.has(value)) {
    if (roleValues.size >= 10000 || roleBytes + value.length * 2 > 32 * 1024 * 1024) throw new Error('Active Visual revision data exceeds the bounded reader limit. Reload the preview to release its prior modules.');
    roleValues.add(value); roleBytes += value.length * 2;
  }
}
function visualState(item: unknown): boolean {
  if (typeof item === 'string') return roleValues.has(item);
  if (!item || typeof item !== 'object') return false;
  return typeof Node !== 'undefined' && item instanceof Node ||
    'root' in item && 'setState' in item && 'local' in item ||
    'metadata' in item && 'source' in item && typeof (item as { metadata?: { artifactId?: unknown } }).metadata?.artifactId === 'string' ||
    'artifactId' in item && 'schemaVersion' in item && ['page', 'shell', 'component'].includes(String((item as { kind?: unknown }).kind));
}
function inspectState(value: unknown, allowSharedFunctions: boolean, moduleRoot = false): void {
  const seen = new Set<object>();
  const visit = (item: unknown, depth: number, root = false): void => {
    if (visualState(item)) throw new Error('A shared helper cannot retain Visual revision state. Pass ordinary data, or keep this state inside the Visual function instance.');
    if (typeof item === 'function' && !allowSharedFunctions && !shared.has(item)) throw new Error('A shared helper cannot retain a Visual callback. Keep the callback in the Visual function and use the helper result instead.');
    if (!item || typeof item !== 'object' && typeof item !== 'function' || seen.has(item as object)) return;
    if (depth > 32 || seen.size >= 10000) throw new Error('Shared helper state exceeds its safe inspection limit.');
    seen.add(item as object);
    if (item instanceof WeakMap || item instanceof WeakSet || item instanceof Promise) throw new Error('Opaque cached state cannot be shared with a Visual revision. Keep this cache inside the Visual function.');
    const prototype = Object.getPrototypeOf(item);
    if (!root && typeof item !== 'function' && prototype !== Object.prototype && prototype !== null && !Array.isArray(item) && !(item instanceof Map) && !(item instanceof Set) && !(item instanceof Date) && !(item instanceof URL)) throw new Error('Opaque instances cannot cross the shared Visual helper boundary. Pass ordinary data.');
    if (item instanceof Map) for (const [key, entry] of item) { visit(key, depth + 1); visit(entry, depth + 1); }
    if (item instanceof Set) for (const entry of item) visit(entry, depth + 1);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    for (const name of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[name as keyof typeof descriptors];
      if (typeof item === 'function' && typeof name === 'string' && ['arguments', 'caller'].includes(name)) continue;
      if (descriptor.get || descriptor.set) {
        if (!root) throw new Error('Accessor state cannot be retained in a shared Visual helper. Pass ordinary data.');
        visit(Reflect.get(item as object, name), depth + 1);
      } else visit(descriptor.value, depth + 1);
    }
  }; visit(value, 0, moduleRoot);
}
function healthy(item: unknown): void {
  if (!item || typeof item !== 'object' && typeof item !== 'function') return;
  for (const root of owners.get(item as object) ?? []) inspectState(root, true, true);
}
export function registerSharedHelperValue<T>(value: T): T {
  const seen = new Set<object>();
  const visit = (item: unknown) => {
    if (!item || typeof item !== 'object' && typeof item !== 'function' || seen.has(item as object)) return;
    if (seen.size >= 10000) throw new Error('Shared helper exports exceed the bounded revision-state registry traversal.');
    seen.add(item as object); shared.add(item as object);
    const roots = owners.get(item as object) ?? new Set<object>(); roots.add(value as object); owners.set(item as object, roots);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    for (const name of Reflect.ownKeys(descriptors)) {
      const descriptor = descriptors[name as keyof typeof descriptors];
      if ('value' in descriptor) visit(descriptor.value);
      else if (item === value && (typeof name !== 'string' || !['caller', 'arguments'].includes(name))) visit(Reflect.get(item as object, name));
    }
  }; visit(value); return value;
}
export function registerSharedHelperModule<T>(value: T): T { inspectState(value, true, true); return registerSharedHelperValue(value); }
export const registerSharedHelperImport = async <T>(module: Promise<T>) => registerSharedHelperModule(await module);
export function guardVisualHelperValue<T>(value: T): T {
  inspectState(value, false); return value;
}
const isShared = (item: unknown) => !!item && (typeof item === 'object' || typeof item === 'function') && shared.has(item as object);
export function callVisualHelper(fn: (...args: any[]) => any, receiver: unknown, arguments_: () => unknown[]): any {
  const args = arguments_();
  healthy(fn); healthy(receiver);
  const mutator = [Object.assign, Object.defineProperty, Object.defineProperties, Object.setPrototypeOf, Reflect.set, Reflect.defineProperty].includes(fn as any);
  const forwarded = [Function.prototype.call, Function.prototype.apply, Function.prototype.bind].includes(fn) && isShared(args[0]);
  const crosses = isShared(fn) || isShared(receiver) || mutator && isShared(args[0]) || forwarded;
  if (crosses) args.forEach(guardVisualHelperValue);
  const result = Reflect.apply(fn, receiver, args);
  if (crosses && result instanceof Promise) return result.then(value => {
    guardVisualHelperValue(value);
    return registerSharedHelperValue(value);
  });
  if (crosses && visualState(result)) throw new Error('A shared helper returned retained Visual revision state. Keep this state in the Visual function instance.');
  return crosses && !(result instanceof Promise) && !(typeof Node !== 'undefined' && result instanceof Node) ? registerSharedHelperValue(result) : result;
}
export function callVisualHelperMethod(receiver: any, property: PropertyKey, arguments_: () => unknown[]): any {
  return callVisualHelper(receiver[property], receiver, arguments_);
}
export function constructVisualHelper(ctor: new (...args: any[]) => any, arguments_: () => unknown[]): any {
  const args = arguments_(); if (isShared(ctor)) args.forEach(guardVisualHelperValue);
  const result = Reflect.construct(ctor, args); return isShared(ctor) ? registerSharedHelperValue(result) : result;
}
export function assignVisualHelper(receiver: any, property: PropertyKey, value: unknown): any {
  healthy(receiver); if (isShared(receiver)) guardVisualHelperValue(value);
  return receiver[property] = value;
}
export function readVisualHelper(receiver: any, property: PropertyKey): any {
  healthy(receiver); const value = receiver[property]; return isShared(receiver) ? registerSharedHelperValue(value) : value;
}
export function destructureVisualHelper<T>(value: T): T {
  if (!isShared(value)) return value;
  return new Proxy(value as object, { get(target, property) { return readVisualHelper(target, property); } }) as T;
}
export function updateVisualHelper(receiver: any, property: PropertyKey, increment: boolean, postfix: boolean): any {
  healthy(receiver);
  if (increment) return postfix ? receiver[property]++ : ++receiver[property];
  return postfix ? receiver[property]-- : --receiver[property];
}
export function compoundVisualHelper(receiver: any, property: PropertyKey, right: () => any, operator: string): any {
  healthy(receiver); const left = receiver[property], value = right(); if (isShared(receiver)) guardVisualHelperValue(value);
  let result: any;
  switch (operator) {
    case '+=': result = left + value; break; case '-=': result = left - value; break;
    case '*=': result = left * value; break; case '/=': result = left / value; break;
    case '%=': result = left % value; break; case '**=': result = left ** value; break;
    case '<<=': result = left << value; break; case '>>=': result = left >> value; break;
    case '>>>=': result = left >>> value; break; case '&=': result = left & value; break;
    case '|=': result = left | value; break; case '^=': result = left ^ value; break;
    default: throw new Error('Unsupported shared helper assignment. Use an explicit value assignment.');
  }
  return receiver[property] = result;
}
export function visualHelperTag(fn: (...args: any[]) => any, receiver: unknown) {
  return (...args: unknown[]) => callVisualHelper(fn, receiver, () => args);
}
export function visualHelperMethodTag(receiver: any, property: PropertyKey) { return visualHelperTag(receiver[property], receiver); }
export function guardVisualFunctionExports<T extends Record<string, unknown>>(functions: T): T {
  for (const property of Reflect.ownKeys(functions)) {
    const value = Reflect.get(functions, property);
    if (typeof value === 'function' && isShared(value)) throw new Error('Visual actions cannot directly re-export shared helper functions. Use a Visual wrapper that passes ordinary data.');
  }
  return new Proxy(functions, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    if (typeof value === 'function' && isShared(value)) throw new Error('Visual actions cannot directly delegate their context to a shared helper export. Use a Visual wrapper that passes ordinary data.');
    return value;
  } });
}
