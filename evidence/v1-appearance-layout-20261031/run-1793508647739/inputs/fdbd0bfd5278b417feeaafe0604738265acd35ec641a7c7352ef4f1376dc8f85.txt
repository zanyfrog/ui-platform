import { copySerializable, freezeDefinition, validateDefinition } from './definition.js';

export class ComponentRegistry {
  #definitions = new Map();
  #routes = new Map();
  #handlers = new Map();
  #services = new Map();

  registerManifest(manifest, { packageId, scope = 'platform' } = {}) {
    if (!packageId || !Array.isArray(manifest?.components)) throw new Error('Manifest components and package owner are required.');
    const staged = [];
    const ids = new Set(this.#definitions.keys());
    for (const entry of manifest.components) {
      if (!entry.schemaVersion) continue; // Legacy entries remain legacy; no package-wide migration.
      const definition = copySerializable(entry);
      const errors = validateDefinition(definition);
      if (definition.ownership?.package?.packageId !== packageId || definition.ownership?.scope !== scope) errors.push('Definition does not match its declared owning package/scope.');
      if (ids.has(definition.identity?.componentId)) errors.push('Component identity is already registered.');
      if (errors.length) throw new Error(errors.join('\n'));
      ids.add(definition.identity.componentId);
      staged.push(freezeDefinition(definition));
    }
    for (const definition of staged) {
      const id = definition.identity.componentId;
      this.#definitions.set(id, definition);
      const implementation = definition.implementation;
      const routes = [id, implementation.tagName, definition.identity.name,
        `${scope}:${packageId}:${implementation.tagName}`, implementation.importPath,
        `${implementation.importPath}#${implementation.exportName}`,
        ...(implementation.aliases || []).flatMap(alias => [alias.importPath, `${alias.importPath}#${alias.exportName}`])];
      for (const route of routes) {
        if (!this.#routes.has(route)) this.#routes.set(route, new Set());
        this.#routes.get(route).add(id);
      }
    }
    return staged;
  }

  resolve(reference, { packageId, scope } = {}) {
    const candidates = [...(this.#routes.get(reference) || [])].map(id => this.#definitions.get(id))
      .filter(definition => (!packageId || definition.ownership.package.packageId === packageId)
        && (!scope || definition.ownership.scope === scope));
    if (candidates.length !== 1) throw new Error(candidates.length ? `Ambiguous component route: ${reference}. Specify owner/scope.` : `Unknown component: ${reference}.`);
    return candidates[0];
  }

  discover({ scope, capability } = {}) {
    return [...this.#definitions.values()].filter(definition => (!scope || definition.ownership.scope === scope)
      && (!capability || definition.capabilities.includes(capability)));
  }

  registerHandler(id, handler) {
    if (!id || typeof handler !== 'function' || this.#handlers.has(id)) throw new Error('A unique handler ID and function are required.');
    this.#handlers.set(id, handler);
  }
  hasHandler(id) { return this.#handlers.has(id); }
  handler(id) {
    if (!this.#handlers.has(id)) throw new Error(`Handler is not registered: ${id}.`);
    return this.#handlers.get(id);
  }
  registerService(id, service) {
    if (!id || service == null || this.#services.has(id)) throw new Error('A unique service ID and runtime service are required.');
    this.#services.set(id, service);
  }
  service(id) {
    if (!this.#services.has(id)) throw new Error(`Service is not registered: ${id}.`);
    return this.#services.get(id);
  }
}

export async function loadCardRegistry({ fetchImpl = globalThis.fetch, manifestUrl = new URL('../../ui.component.json', import.meta.url) } = {}) {
  const response = await fetchImpl(manifestUrl);
  if (!response.ok) throw new Error(`Unable to load Component manifest (${response.status}).`);
  const registry = new ComponentRegistry();
  registry.registerManifest(await response.json(), { packageId: '@ui-base/ui' });
  return registry;
}
