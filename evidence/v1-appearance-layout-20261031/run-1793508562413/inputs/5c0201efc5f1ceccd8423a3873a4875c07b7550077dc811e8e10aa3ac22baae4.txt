import '../layout/uib-card.js';
import { copySerializable, defaultSettings, isSettingVisible, validateSettings } from './definition.js';

// Preview and production construct the same registered code component. Only
// navigation and handler execution policies differ at the adapter boundary.
export function renderComponentInstance(definition, instance, { registry, document: ownerDocument = document, preview = false, onEvent = () => {} } = {}) {
  if (definition.implementation.type !== 'code') throw new Error('Composite rendering is outside this reference stage.');
  if (definition.implementation.runtimeBinding.kind !== 'custom-element') throw new Error('Unsupported runtime binding.');
  const errors = validateSettings(definition, instance.settings, { registry, resolveHandlers: !preview });
  if (instance.componentId !== definition.identity.componentId) errors.push('Instance Component identity does not match its Definition.');
  const serviceRefs = copySerializable(instance.serviceRefs || {});
  const declaredServices = definition.dependencies.services || [];
  for (const name of Object.keys(serviceRefs)) if (!declaredServices.some(service => service.name === name)) errors.push(`Unknown service reference: ${name}.`);
  for (const service of declaredServices) if (service.required && !serviceRefs[service.name]) errors.push(`Service reference is required: ${service.name}.`);
  if (errors.length) throw new Error(errors.join('\n'));
  const tag = definition.implementation.runtimeBinding.tagName;
  if (!ownerDocument.defaultView.customElements.get(tag)) throw new Error(`Runtime implementation is not registered: ${tag}.`);
  const element = ownerDocument.createElement(tag);
  const values = { ...defaultSettings(definition), ...instance.settings };
  for (const [name, setting] of Object.entries(definition.builder.settings)) {
    if (!isSettingVisible(setting, values)) continue;
    const value = values[name]; const binding = setting.binding;
    if (binding.kind === 'attribute') {
      if (setting.type === 'boolean') element.toggleAttribute(binding.name, value);
      else if (value !== '') element.setAttribute(binding.name, String(value));
    } else if (binding.kind === 'property') element[binding.name] = value;
    else if (binding.kind === 'cssProperty') element.style.setProperty(binding.name, value);
    else if (binding.kind === 'slot' && value !== '') {
      const child = ownerDocument.createElement(binding.content === 'image' ? 'img' : 'span');
      if (binding.name !== 'default') child.slot = binding.name;
      if (binding.content === 'image') { child.src = value; child.alt = values[binding.altSetting] || ''; }
      else child.textContent = value;
      element.append(child);
    }
  }
  for (const [name, value] of Object.entries(definition.builder.interactionModes?.[values.interactionMode]?.attributes || {})) {
    if (typeof value === 'boolean') element.toggleAttribute(name, value);
    else element.setAttribute(name, String(value));
  }
  for (const service of declaredServices) if (serviceRefs[service.name]) element[service.property] = registry.service(serviceRefs[service.name]);
  for (const [name, contract] of Object.entries(definition.runtime.events)) {
    element.addEventListener(name, event => {
      if (event.target !== element) return;
      const detail = Object.fromEntries(Object.keys(contract.detail).filter(key => event.detail?.[key] !== undefined).map(key => [key, event.detail[key]]));
      const payload = copySerializable(detail);
      onEvent({ type: name, detail: payload });
      if (preview) { if (event.cancelable) event.preventDefault(); return; }
      const setting = Object.entries(definition.builder.settings).find(([, item]) => item.binding.kind === 'event' && item.binding.name === name);
      const handlerId = setting && values[setting[0]];
      if (handlerId && registry.handler(handlerId)(payload, { element, event }) === false && event.cancelable) event.preventDefault();
    });
  }
  if (preview) element.addEventListener('click', event => {
    if (event.composedPath().some(node => node?.localName === 'a')) event.preventDefault();
  }, { capture: true });
  return element;
}
