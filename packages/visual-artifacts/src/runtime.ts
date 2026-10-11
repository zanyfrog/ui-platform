import { renderComponentInstance, ComponentRegistry } from '@ui-base/ui/component-reference';
import { evaluate } from './expression.js';
import { readPackageSettings, valueErrors } from './model.js';
import { validateArtifact } from './validation.js';
import type { Action, FunctionContext, LayoutRule, PackageComponent, RuntimeArtifact } from './model.js';

export interface RuntimeOptions {
  components: RuntimeArtifact[]; packages: PackageComponent[];
  inputs?: Record<string, unknown>; sources?: Record<string, unknown>; context?: Record<string, unknown>; route?: Record<string, unknown>;
  slots?: Node[]; navigate?: (to: string) => void;
  services?: Record<string, (input: unknown) => unknown | Promise<unknown>>;
  onError?: (error: unknown) => void;
}
export interface ArtifactInstance { host: HTMLElement; root: ShadowRoot; state: Record<string, unknown>; update: (inputs: Record<string, unknown>) => void; destroy: () => void }

export async function loadRuntimePackages(packages: PackageComponent[]): Promise<void> {
  for (const pkg of packages) if (pkg.moduleUrl) await import(/* @vite-ignore */ pkg.moduleUrl);
}
const styles = new Set(['width', 'height', 'margin', 'padding', 'display', 'gridTemplateColumns', 'gridColumn', 'gap', 'alignItems', 'justifyContent', 'flexDirection', 'flex']);
export function layoutCss(layout: RuntimeArtifact['metadata']['layout']): string {
  const rule = (id: string, values?: LayoutRule) => `[data-uip-node="${id}"]{${Object.entries(values ?? {}).map(([key, value]) => {
    if (!styles.has(key) || /[{};<>]/.test(String(value))) throw new Error('Unsupported declarative layout value. Use local CSS for advanced rules.');
    return `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`;
  }).join(';')}}`;
  return Object.entries(layout ?? {}).map(([id, item]) => rule(id, item.base) + `@media(max-width:1023px){${rule(id, item.tablet)}}@media(max-width:639px){${rule(id, item.mobile)}}`).join('\n');
}

/** Both preview and application pages call this renderer. Shadow roots are artifact/instance CSS boundaries. */
export function mountVisualArtifact(artifact: RuntimeArtifact, options: RuntimeOptions): ArtifactInstance {
  const errors = validateArtifact(artifact, options.components, options.packages, Object.keys(options.services ?? {})).filter(d => d.severity === 'error');
  if (errors.length) throw new Error(errors.map(d => d.message).join('\n'));
  const m = artifact.metadata;
  const host = document.createElement('div'); host.dataset.uipArtifact = m.artifactId;
  const root = host.attachShadow({ mode: 'open' });
  const state = structuredClone(m.state ?? {});
  let inputs: Record<string, unknown> = {}, disposed = false;
  const data: Record<string, unknown> = {};
  const nested = new Map<string, ArtifactInstance>();
  const boundEvents = new Map<HTMLElement, Array<{ name: string; listener: EventListener }>>();
  const report = options.onError ?? (error => console.error(error));
  const registry = new ComponentRegistry();
  for (const pkg of options.packages) if (pkg.definition) registry.registerManifest({ components: [pkg.definition] }, { packageId: (pkg.definition as unknown as { ownership: { package: { packageId: string } } }).ownership.package.packageId });
  const validateInputs = (next: Record<string, unknown>) => {
    const effective: Record<string, unknown> = {};
    for (const key of Object.keys(next)) if (m.kind === 'component' && !Object.hasOwn(m.public!.properties, key)) throw new Error(`Unknown public property: ${key}.`);
    for (const [key, contract] of Object.entries(m.public?.properties ?? {})) {
      effective[key] = next[key] === undefined ? structuredClone(contract.default) : next[key];
      const issues = valueErrors(effective[key], contract, key); if (issues.length) throw new Error(issues.join('\n'));
    }
    return m.kind === 'page' ? next : effective;
  };
  inputs = validateInputs(options.inputs ?? {});
  for (const [name, source] of Object.entries(m.sources ?? {})) data[name] = structuredClone(source.kind === 'fixture' ? source.value : undefined);
  Object.assign(data, structuredClone(options.sources ?? {}));
  const scope = () => ({ ...data, public: inputs, local: state, context: options.context ?? {}, route: options.route ?? {} });
  const emit = (name: string, payload: Record<string, unknown>) => {
    const contract = m.public?.events[name]; if (!contract) throw new Error(`Undeclared event: ${name}.`);
    const issues = Object.entries(contract.payload).flatMap(([key, field]) => valueErrors(payload[key], field, key));
    if (Object.keys(payload).some(key => !Object.hasOwn(contract.payload, key))) issues.push('Event payload has undeclared fields.');
    if (issues.length) throw new Error(issues.join('\n'));
    host.dispatchEvent(new CustomEvent(name, { detail: structuredClone(payload), bubbles: true, composed: true }));
  };
  const setState = (name: string, value: unknown) => { if (!Object.hasOwn(state, name)) throw new Error(`Unknown local state: ${name}.`); state[name] = value; render(); };
  const actions = async (items: Action[], current: Record<string, unknown>, event?: Event) => {
    try {
      for (const item of items) {
        if (disposed) return;
        if (item.kind === 'set') { if (!Object.hasOwn(state, item.state)) throw new Error(`Unknown local state: ${item.state}.`); state[item.state] = evaluate(item.value, current); }
        else if (item.kind === 'emit') emit(item.event, Object.fromEntries(Object.entries(item.payload ?? {}).map(([key, value]) => [key, evaluate(value, current)])));
        else if (item.kind === 'navigate') { if (!options.navigate) throw new Error('No navigation adapter.'); options.navigate(String(evaluate(item.to, current))); }
        else if (item.kind === 'service') { const service = options.services?.[item.reference]; if (!service) throw new Error(`Service reference has no executable adapter: ${item.reference}.`); await service(item.input ? evaluate(item.input, current) : undefined); }
        else if (item.kind === 'function') {
          const fn = artifact.functions?.[item.name]; if (!fn) throw new Error(`Unknown custom function: ${item.name}.`);
          const context: FunctionContext = { public: inputs, local: state, root, event, setState, emit }; fn(context);
        }
      }
      render();
    } catch (error) { report(error); }
  };
  const template = document.createElement('template'); template.innerHTML = artifact.source;
  for (const child of options.slots ?? []) host.append(child);
  const listeners = new Set(['click', 'dblclick', 'input', 'change', 'submit', 'reset', 'keydown', 'keyup', 'keypress', 'focusin', 'focusout', 'pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchend', 'contextmenu', ...(m.events ?? []).map(e => e.event), ...options.packages.flatMap(p => [...Object.keys(p.definition?.runtime.events ?? {}), ...(p.events ?? [])])]);
  // Public emissions originate on the host; internal events end at this artifact boundary.
  for (const name of listeners) root.addEventListener(name, event => event.stopPropagation());
  function render(): void {
    if (disposed) return;
    // Nested hosts survive parent renders; their parent-owned listeners must not accumulate.
    for (const [element, bindings] of boundEvents) for (const binding of bindings) element.removeEventListener(binding.name, binding.listener);
    boundEvents.clear();
    const used = new Set<string>();
    const process = (element: Element, current: Record<string, unknown>, prefix: string, repeating = false): Node[] => {
      const id = element.getAttribute('data-uip-node') ?? '';
      const repeat = !repeating && m.repeaters?.find(r => r.node === id);
      if (repeat) {
        const collection = evaluate(repeat.collection, current) ?? [];
        if (!Array.isArray(collection)) throw new Error(`Repeater ${id} requires an array.`);
        return collection.flatMap((value, index) => process(element.cloneNode(true) as Element, { ...current, [repeat.item]: value, ...(repeat.index ? { [repeat.index]: index } : {}) }, `${prefix}/${id}:${index}`, true));
      }
      if (m.conditions?.some(condition => condition.node === id && !evaluate(condition.when, current))) return [];
      const settings = JSON.parse(element.getAttribute('data-uip-settings') ?? '{}') as Record<string, unknown>;
      const packageDefinition = options.packages.find(pkg => pkg.id === element.getAttribute('data-uip-component'))?.definition;
      if (packageDefinition) Object.assign(settings, readPackageSettings(packageDefinition, Object.fromEntries([...element.attributes].map(attr => [attr.name, attr.value])), settings));
      const bindings = m.bindings?.filter(binding => binding.node === id) ?? [];
      const publicInputs = { ...settings };
      for (const binding of bindings) {
        const value = evaluate(binding.value, current), [kind, name] = binding.target.split(':');
        if (kind === 'setting') settings[name] = value;
        else if (kind === 'property') { publicInputs[name] = value; (element as unknown as Record<string, unknown>)[name] = value; }
        else if (kind === 'text') element.textContent = String(value ?? '');
        else if (kind === 'attribute') { if (typeof value === 'boolean') element.toggleAttribute(name, value); else if (value == null) element.removeAttribute(name); else element.setAttribute(name, String(value)); }
        else if (kind === 'style') (element as HTMLElement).style.setProperty(name, String(value ?? ''));
      }
      for (const child of [...element.children]) child.replaceWith(...process(child, current, prefix));
      if (element.localName === 'uip-slot') { const slot = document.createElement('slot'); slot.name = element.getAttribute('name') ?? ''; if (element.hasAttribute('slot')) slot.slot = element.getAttribute('slot')!; slot.append(...element.childNodes); return [slot]; }
      const componentId = element.getAttribute('data-uip-component');
      let output = element as HTMLElement;
      if (componentId) {
        const component = options.components.find(c => c.metadata.componentId === componentId);
        if (component) {
          const key = `${prefix}/${id}`; used.add(key);
          let instance = nested.get(key);
          if (!instance) { instance = mountVisualArtifact(component, { ...options, inputs: publicInputs, slots: [...element.childNodes], sources: undefined }); nested.set(key, instance); }
          else { instance.update(publicInputs); instance.host.replaceChildren(...element.childNodes); }
          output = instance.host;
          if (element.hasAttribute('slot')) output.slot = element.getAttribute('slot')!;
          output.dataset.uipNode = id;
        } else {
          const pkg = options.packages.find(p => p.id === componentId);
          if (!pkg) throw new Error(`Unresolved component: ${componentId}.`);
          if (!customElements.get(pkg.tagName)) throw new Error(`Package runtime is not registered: ${pkg.tagName}.`);
          if (pkg.definition) {
            output = renderComponentInstance(pkg.definition, { componentId, settings }, { registry, document, preview: false });
            const ownedAttributes = new Set(Object.values(pkg.definition.builder.settings).filter(s => s.binding?.kind === 'attribute').map(s => s.binding!.name));
            for (const attr of element.attributes) if (!ownedAttributes.has(attr.name) && !['data-uip-settings', 'data-uip-component'].includes(attr.name)) output.setAttribute(attr.name, attr.value);
            output.append(...element.childNodes);
          } else {
            for (const [key, value] of Object.entries(settings)) {
              if (typeof value === 'boolean') output.toggleAttribute(key, value); else if (typeof value === 'object') (output as unknown as Record<string, unknown>)[key] = value; else output.setAttribute(key, String(value));
            }
          }
          for (const binding of bindings.filter(b => b.target.startsWith('property:'))) (output as unknown as Record<string, unknown>)[binding.target.slice(9)] = evaluate(binding.value, current);
        }
      }
      for (const binding of m.events?.filter(e => e.node === id) ?? []) {
        const listener: EventListener = event => {
          if (event.target !== output && componentId) return;
          void actions(binding.actions, { ...current, event: { detail: (event as CustomEvent).detail } }, event);
        };
        output.addEventListener(binding.event, listener);
        boundEvents.set(output, [...(boundEvents.get(output) ?? []), { name: binding.event, listener }]);
      }
      return [output];
    };
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    for (const child of [...fragment.children]) child.replaceWith(...process(child, scope(), 'root'));
    const style = document.createElement('style'); style.textContent = `:host{display:block}.uip-layout-item{box-sizing:border-box;min-width:0}\n${artifact.css}\n${layoutCss(m.layout)}`;
    root.replaceChildren(style, fragment);
    for (const [key, instance] of nested) if (!used.has(key)) { instance.destroy(); nested.delete(key); }
  }
  render();
  for (const [name, source] of Object.entries(m.sources ?? {})) if (source.kind === 'service' && !Object.hasOwn(options.sources ?? {}, name)) {
    const service = options.services?.[source.reference ?? ''];
    if (service) void Promise.resolve(service(undefined)).then(value => { if (!disposed) { data[name] = value; render(); } }).catch(report);
  }
  if (m.onLoad?.length) void actions(m.onLoad, scope());
  return { host, root, state, update(next) { inputs = validateInputs(next); render(); }, destroy() { disposed = true; nested.forEach(instance => instance.destroy()); nested.clear(); for (const [element, bindings] of boundEvents) for (const binding of bindings) element.removeEventListener(binding.name, binding.listener); boundEvents.clear(); host.remove(); } };
}

const pageDefinitions = new Map<string, { artifact: RuntimeArtifact; options: RuntimeOptions }>();
/** Fits existing application routers that render Page modules as HTML strings. */
export function createVisualPage(artifact: RuntimeArtifact, options: RuntimeOptions): { render: (context?: { navigate?: (to: string) => void; route?: string; settings?: Record<string, unknown> }) => string } {
  if (artifact.metadata.kind !== 'page') throw new Error('Only Pages register routes.');
  const tag = `uip-page-${artifact.metadata.artifactId.toLowerCase().replaceAll('_', '-')}`;
  pageDefinitions.set(tag, { artifact, options });
  if (!customElements.get(tag)) customElements.define(tag, class extends HTMLElement {
    instance?: ArtifactInstance;
    connectedCallback() { const current = pageDefinitions.get(tag)!; this.instance = mountVisualArtifact(current.artifact, current.options); this.replaceChildren(this.instance.host); }
    disconnectedCallback() { this.instance?.destroy(); }
  });
  return { render(context = {}) { pageDefinitions.set(tag, { artifact, options: { ...options, navigate: context.navigate ?? options.navigate, context: context.settings ?? options.context, route: { path: context.route, ...options.route } } }); return `<${tag}></${tag}>`; } };
}
