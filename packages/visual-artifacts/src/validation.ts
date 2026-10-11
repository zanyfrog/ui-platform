import { parseSource, isWrapper } from './source.js';
import { packageSettingErrors, readPackageSettings } from './model.js';
import type { ArtifactMetadata, Diagnostic, Expression, PackageComponent, PropertyContract, RuntimeArtifact } from './model.js';

export function parseMetadata(text: string): { metadata?: ArtifactMetadata; diagnostics: Diagnostic[] } {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Metadata must be an object.');
    return { metadata: value as ArtifactMetadata, diagnostics: [] };
  } catch (error) { return { diagnostics: [{ severity: 'error', message: `Metadata: ${String(error)}` }] }; }
}
export function validateArtifact(artifact: RuntimeArtifact, components: RuntimeArtifact[] = [], packages: PackageComponent[] = [], services: string[] = []): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const error = (message: string, node?: string) => diagnostics.push({ severity: 'error', message, node });
  const warning = (message: string, node?: string) => diagnostics.push({ severity: 'warning', message, node });
  const m = artifact.metadata;
  try {
    if (m.schemaVersion !== 1 || !['page', 'component'].includes(m.kind)) error('Expected Visual Artifact schemaVersion 1 and page/component kind.');
    if (!/^art_[\w-]+$/.test(m.artifactId ?? '')) error('A permanent art_ artifact identity is required.');
    if (!/^[a-z][a-z0-9-]*$/.test(m.name ?? '') || !m.displayName) error('Name and display name are required.');
    if (m.kind === 'component') {
      if (!/^cmp_platform_[\w-]+$/.test(m.componentId ?? '')) error('A permanent cmp_platform_ Component identity is required.');
      if (m.route !== undefined) error('Only Pages may declare routes.');
      if (!m.public) error('A Component must declare its public interface.');
      if (packages.some(pkg => pkg.id === m.componentId) || components.filter(c => c.metadata.componentId === m.componentId).length > 1) error(`Duplicate Component identity: ${m.componentId}.`);
    } else if (!m.route?.startsWith('/') || m.componentId !== undefined || m.public !== undefined) error('A Page needs a route and cannot declare a Component identity/public interface.');
    const checkContract = (contract: PropertyContract, name: string) => {
      if (!contract || !['string', 'number', 'boolean', 'object', 'array'].includes(contract.type)) { error(`Invalid property type: ${name}.`); return; }
      if (contract.default !== undefined) {
        // Defaults use exactly the same constraints as runtime inputs.
        for (const message of valueErrors(contract.default, contract, name)) error(message);
      }
    };
    for (const [name, contract] of Object.entries(m.public?.properties ?? {})) { if (!/^[A-Za-z][\w]*$/.test(name)) error(`Invalid public property name: ${name}.`); checkContract(contract, name); }
    for (const [name, event] of Object.entries(m.public?.events ?? {})) for (const [key, contract] of Object.entries(event.payload)) checkContract(contract, `${name}.${key}`);
    if (new Set(m.public?.slots).size !== (m.public?.slots.length ?? 0)) error('Duplicate public slot names.');
    const parsed = parseSource(artifact.source); diagnostics.push(...parsed.diagnostics);
    const nodes = new Map(parsed.nodes.filter(n => n.id).map(n => [n.id!, n]));
    const sourceNames = new Set(['public', 'local', 'route', 'context', 'event', ...Object.keys(m.sources ?? {}), ...(m.repeaters ?? []).flatMap(r => [r.item, ...(r.index ? [r.index] : [])])]);
    const expression = (expr: Expression) => {
      if (typeof expr === 'string') {
        if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expr) || expr.split('.').some(p => ['constructor', 'prototype', '__proto__'].includes(p))) error(`Invalid named-source path: ${expr}.`);
        else if (!sourceNames.has(expr.split('.')[0])) error(`Unknown named source: ${expr}.`);
        else if (expr.startsWith('public.') && !Object.hasOwn(m.public?.properties ?? {}, expr.split('.')[1])) error(`Undeclared public input: ${expr}.`);
      } else if (expr && 'literal' in expr) return;
      else if (expr && ['not', 'eq', 'and', 'or'].includes(expr.op) && Array.isArray(expr.args)) expr.args.forEach(expression);
      else error('Invalid declarative expression.');
    };
    const requireNode = (id: string) => { if (!nodes.has(id)) error(`Unknown managed node: ${id}.`, id); return nodes.get(id); };
    for (const node of parsed.nodes) {
      const id = node.attributes['data-uip-component'];
      if (node.tag === 'uip-page' || node.attributes['data-uip-page']) error('Pages cannot be nested.', node.id);
      if (node.tag === 'uip-slot' && !m.public?.slots.includes(node.attributes.name ?? '')) error(`Undeclared public slot: ${node.attributes.name}.`, node.id);
      if (!id) { if (node.tag.startsWith('uib-')) warning(`Manual package element ${node.tag} has no permanent Component reference.`, node.id); continue; }
      const nested = components.filter(c => c.metadata.componentId === id);
      const pkg = packages.filter(p => p.id === id);
      if (nested.length + pkg.length !== 1) { error(`Unknown or ambiguous Component dependency: ${id}.`, node.id); continue; }
      if (nested[0] && node.tag !== 'uip-component') error('Platform Component instances use uip-component.', node.id);
      if (node.children.length && node.children.some(child => !child.attributes.slot)) warning('Component children should use declared named slots.', node.id);
      let settings: Record<string, unknown> = {};
      try { settings = JSON.parse(node.attributes['data-uip-settings'] ?? '{}'); if (!settings || Array.isArray(settings) || typeof settings !== 'object') throw new Error(); }
      catch { error('Component settings must be a JSON object.', node.id); continue; }
      if (nested[0]) {
        const api = nested[0].metadata.public!;
        for (const key of Object.keys(settings)) if (!Object.hasOwn(api.properties, key)) error(`Unknown public property: ${key}.`, node.id);
        for (const [key, contract] of Object.entries(api.properties)) {
          if (!(m.bindings ?? []).some(b => b.node === node.id && b.target === `property:${key}`)) for (const message of valueErrors(settings[key] ?? contract.default, contract, key)) error(message, node.id);
        }
        for (const child of node.children) if (!api.slots.includes(child.attributes.slot ?? '')) error(`Unknown public slot: ${child.attributes.slot}.`, node.id);
      } else {
        if (pkg[0].tagName !== node.tag) error('Component tag does not match its installed identity.', node.id);
        pkg[0].activationIssues?.forEach(issue => error(issue, node.id));
        const definitions = pkg[0].definition?.builder.settings;
        if (pkg[0].definition) settings = readPackageSettings(pkg[0].definition, node.attributes, settings);
        if (pkg[0].definition && !(m.bindings ?? []).some(binding => binding.node === node.id && binding.target.startsWith('setting:'))) packageSettingErrors(pkg[0].definition, settings).forEach(message => error(message, node.id));
        for (const [key, value] of Object.entries(settings)) {
          const contract = definitions?.[key];
          if (definitions && !contract) error(`Unknown installed Package setting: ${key}.`, node.id);
          else if (contract) valueErrors(value, contract, key).forEach(message => error(message, node.id));
          else if (![...(pkg[0].properties ?? []), ...(pkg[0].attributes ?? [])].includes(key)) error(`Package setting is not declared: ${key}.`, node.id);
        }
      }
    }
    for (const binding of m.bindings ?? []) {
      const node = requireNode(binding.node); expression(binding.value);
      if (!/^(text|attribute:[\w:-]+|property:[\w]+|setting:[\w]+|style:--[\w-]+)$/.test(binding.target)) error(`Unsupported binding target: ${binding.target}.`, binding.node);
      const nested = components.find(c => c.metadata.componentId === node?.attributes['data-uip-component']);
      if (nested && (!binding.target.startsWith('property:') || !Object.hasOwn(nested.metadata.public?.properties ?? {}, binding.target.slice(9)))) error('Nested Components expose only declared public properties.', binding.node);
      const pkg = packages.find(p => p.id === node?.attributes['data-uip-component']);
      if (pkg && binding.target.startsWith('setting:') && !pkg.definition?.builder.settings[binding.target.slice(8)]) error('Unknown installed Package setting binding.', binding.node);
    }
    for (const condition of m.conditions ?? []) { requireNode(condition.node); expression(condition.when); }
    for (const repeater of m.repeaters ?? []) { requireNode(repeater.node); expression(repeater.collection); if (!/^[A-Za-z]\w*$/.test(repeater.item) || ['public', 'local', 'route', 'context', 'event', ...Object.keys(m.sources ?? {})].includes(repeater.item)) error('Repeater alias conflicts with a named source.'); }
    const action = (item: import('./model.js').Action) => {
      if (item.kind === 'set') { if (!Object.hasOwn(m.state ?? {}, item.state)) error(`Unknown local state: ${item.state}.`); expression(item.value); }
      else if (item.kind === 'emit') {
        const contract = m.public?.events[item.event];
        if (!contract) error(`Undeclared public event: ${item.event}.`);
        else {
          for (const [key, field] of Object.entries(contract.payload)) if (field.required && !Object.hasOwn(item.payload ?? {}, key)) error(`Public event ${item.event} requires payload field ${key}.`);
          for (const key of Object.keys(item.payload ?? {})) if (!Object.hasOwn(contract.payload, key)) error(`Unknown public event payload field: ${key}.`);
        }
        Object.values(item.payload ?? {}).forEach(expression);
      }
      else if (item.kind === 'navigate') expression(item.to);
      else if (item.kind === 'service') { if (!services.includes(item.reference)) warning(`Service reference is supported but has no executable adapter: ${item.reference}.`); if (item.input) expression(item.input); }
      else if (item.kind !== 'function') error('Unknown action kind.');
    };
    for (const event of m.events ?? []) {
      const node = requireNode(event.node);
      const nested = components.find(c => c.metadata.componentId === node?.attributes['data-uip-component']);
      if (nested && !nested.metadata.public?.events[event.event]) error(`Undeclared nested public event: ${event.event}.`, event.node);
      event.actions.forEach(action);
    }
    m.onLoad?.forEach(action);
    for (const [name, source] of Object.entries(m.sources ?? {})) if (source.kind === 'service' && !services.includes(source.reference ?? '')) warning(`Named source ${name} is supported but has no executable adapter: ${source.reference}.`);
    for (const id of Object.keys(m.layout ?? {})) if (!isWrapper(requireNode(id))) error('Declarative layout requires a Builder wrapper.', id);
    for (const id of m.dependencies ?? []) if (!components.some(c => c.metadata.componentId === id) && !packages.some(p => p.id === id) && !services.includes(id)) error(`Unknown dependency: ${id}.`);
    const visit = (current: RuntimeArtifact, path: string[]) => {
      const id = current.metadata.componentId ?? current.metadata.artifactId;
      if (path.includes(id)) { error(`Component dependency cycle: ${[...path, id].join(' → ')}.`); return; }
      for (const ref of new Set([...componentReferences(current.source), ...(current.metadata.dependencies ?? [])])) { const next = components.find(c => c.metadata.componentId === ref); if (next) visit(next, [...path, id]); }
    };
    visit(artifact, []);
  } catch (cause) { error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`); }
  return diagnostics;
}
import { valueErrors } from './model.js';
export function componentReferences(source: string): string[] { return [...new Set(parseSource(source).nodes.map(n => n.attributes['data-uip-component']).filter(Boolean))]; }
