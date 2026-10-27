// JSON is the persistence boundary. Runtime handlers/services live in the registry.
export function copySerializable(value) {
  const seen = new Set();
  const visit = (item, path = '$') => {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return;
    if (typeof item === 'number' && Number.isFinite(item)) return;
    if (!item || typeof item !== 'object') throw new TypeError(`${path} must contain JSON values only.`);
    if (seen.has(item)) throw new TypeError(`${path} contains a cycle.`);
    if (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype
      && Object.getPrototypeOf(item) !== null) throw new TypeError(`${path} contains a runtime object.`);
    seen.add(item);
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(item))) {
      if (Array.isArray(item) && key === 'length') continue;
      if (['__proto__', 'constructor', 'prototype'].includes(key) || descriptor.get || descriptor.set) throw new TypeError(`${path}.${key} is not a data field.`);
      visit(descriptor.value, `${path}.${key}`);
    }
    seen.delete(item);
  };
  visit(value);
  return JSON.parse(JSON.stringify(value));
}

export function freezeDefinition(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freezeDefinition(child);
  return Object.freeze(value);
}

export const isSettingVisible = (setting, values) => !setting.visibleWhen
  || values[setting.visibleWhen.setting] === setting.visibleWhen.equals;

export function defaultSettings(definition) {
  return Object.fromEntries(Object.entries(definition.builder.settings).map(([name, setting]) => [name, setting.default]));
}

export function safeAuthoringUrl(value, image = false) {
  if (!value) return true;
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value.trim())) return false;
  const input = value.trim();
  if (input.startsWith('//') || input.includes('\\')) return false;
  if (!/^[a-z][a-z\d+.-]*:/i.test(input)) return true;
  return image ? /^https?:/i.test(input) : /^(https?|mailto|tel):/i.test(input);
}

export function validateDefinition(input) {
  const errors = [];
  let definition;
  try { definition = copySerializable(input); } catch (error) { return [error.message]; }
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(definition)) return ['Component Definition must be an object.'];
  if (definition.schemaVersion !== '1.0.0') errors.push('Unsupported Component Definition schema version.');
  for (const field of ['componentId', 'name', 'displayName', 'description']) if (typeof definition.identity?.[field] !== 'string'
    || (field !== 'description' && !definition.identity[field].trim())) errors.push(`identity.${field} is required.`);
  if (!['platform', 'application'].includes(definition.ownership?.scope)) errors.push('Scope must be platform or application.');
  if (!definition.ownership?.package?.packageId || !definition.version?.packageVersion) errors.push('Owning package and package version are required.');
  if (!['code', 'composite'].includes(definition.implementation?.type)) errors.push('Implementation type must be code or composite.');
  if (definition.implementation?.type === 'composite') errors.push('Composite graph validation is outside this reference stage.');
  if (typeof definition.implementation?.tagName !== 'string' || !definition.implementation.tagName.includes('-')) errors.push('A custom-element tag is required.');
  if (definition.implementation?.runtimeBinding?.kind !== 'custom-element'
    || definition.implementation.runtimeBinding.tagName !== definition.implementation.tagName) errors.push('Runtime binding must identify the declared custom element.');
  if (typeof definition.implementation?.importPath !== 'string' || typeof definition.implementation?.exportName !== 'string') errors.push('Code import path and export name are required.');
  if (!Array.isArray(definition.implementation?.aliases) || definition.implementation.aliases.some(alias => !object(alias) || typeof alias.importPath !== 'string' || typeof alias.exportName !== 'string')) errors.push('Compatibility aliases must declare import paths and export names.');
  if (definition.tagName !== definition.implementation?.tagName || definition.module !== definition.implementation?.module) errors.push('Legacy manifest projections must match the canonical implementation.');
  if (!object(definition.runtime?.attributes) || !object(definition.runtime?.properties) || !object(definition.runtime?.events)
    || !Array.isArray(definition.runtime?.slots) || definition.runtime.slots.some(slot => !object(slot) || typeof slot.name !== 'string')) errors.push('Runtime API sections are required.');
  if (!object(definition.builder?.settings) || Object.values(definition.builder.settings).some(setting => !object(setting))
    || !Array.isArray(definition.builder?.groups) || definition.builder.groups.some(group => !object(group) || typeof group.id !== 'string')) errors.push('Builder settings/groups are required.');
  if (!Array.isArray(definition.capabilities) || definition.capabilities.some(capability => typeof capability !== 'string')) errors.push('Capabilities must be named strings.');
  if (!object(definition.presentation) || !Array.isArray(definition.presentation.cssVariables)) errors.push('Presentation styling hooks are required.');
  if (!object(definition.dependencies) || !Array.isArray(definition.dependencies.packages) || !Array.isArray(definition.dependencies.services)) errors.push('Package and service dependencies are required.');
  if (!object(definition.lifecycle) || !['installed', 'workspace', 'published'].includes(definition.lifecycle.state)) errors.push('An explicit lifecycle state is required.');
  if (errors.length) return errors;
  const groups = new Set(definition.builder.groups.map(group => group.id));
  const slots = new Set(definition.runtime.slots.map(slot => slot.name));
  for (const [name, projection] of Object.entries(definition.presentation.settings || {})) {
    const setting = definition.builder.settings[name];
    if (!setting || projection.type !== 'select' || JSON.stringify(projection.options) !== JSON.stringify(setting.enum)) errors.push(`${name} legacy presentation projection must match its Builder setting.`);
  }
  for (const [name, setting] of Object.entries(definition.builder.settings)) {
    if (!groups.has(setting.group)) errors.push(`${name} references an unknown editor group.`);
    if (!['string', 'boolean', 'number'].includes(setting.type) || typeof setting.default !== setting.type) errors.push(`${name} has an invalid type/default.`);
    if (setting.enum && !setting.enum.includes(setting.default)) errors.push(`${name} default is outside its allowed values.`);
    const binding = setting.binding || {};
    if (binding.kind === 'attribute' && !definition.runtime.attributes[binding.name]) errors.push(`${name} binds an unknown attribute.`);
    else if (binding.kind === 'property' && !definition.runtime.properties[binding.name]?.writable) errors.push(`${name} binds a read-only or unknown property.`);
    else if (binding.kind === 'slot' && (!slots.has(binding.name) || !['text', 'image'].includes(binding.content))) errors.push(`${name} binds an invalid slot.`);
    else if (binding.kind === 'event' && !definition.runtime.events[binding.name]) errors.push(`${name} binds an unknown event.`);
    else if (binding.kind === 'cssProperty' && !definition.presentation.cssVariables?.includes(binding.name)) errors.push(`${name} binds an unknown styling hook.`);
    else if (!['attribute', 'property', 'slot', 'slotMetadata', 'event', 'mode', 'cssProperty'].includes(binding.kind)) errors.push(`${name} has an unsupported binding.`);
    if (setting.visibleWhen && !definition.builder.settings[setting.visibleWhen.setting]) errors.push(`${name} has an unknown visibility condition.`);
  }
  for (const [name, setting] of Object.entries(definition.builder.definitionSettings || {})) {
    if (!['identity.displayName', 'identity.description'].includes(setting.binding?.path)) errors.push(`${name} cannot edit this definition field in V1.`);
  }
  return errors;
}

export function validateSettings(definition, input, { registry, resolveHandlers = false } = {}) {
  const errors = [];
  let values;
  try { values = copySerializable(input); } catch (error) { return [error.message]; }
  if (!values || Array.isArray(values) || typeof values !== 'object') return ['Settings must be an object.'];
  for (const name of Object.keys(values)) if (!definition.builder.settings[name]) errors.push(`Unknown setting: ${name}.`);
  const effective = { ...defaultSettings(definition), ...values };
  for (const [name, setting] of Object.entries(definition.builder.settings)) {
    const value = effective[name];
    if (typeof value !== setting.type || (setting.type === 'number' && !Number.isFinite(value))) { errors.push(`${setting.label} must be ${setting.type}.`); continue; }
    if (setting.enum && !setting.enum.includes(value)) errors.push(`${setting.label} has an unsupported value.`);
    if (!isSettingVisible(setting, effective) && value !== setting.default) errors.push(`${setting.label} is not allowed in this interaction mode.`);
    if ((setting.format === 'url' || setting.format === 'image-url') && !safeAuthoringUrl(value, setting.format === 'image-url')) errors.push(`${setting.label} uses an unsupported URL.`);
    if (resolveHandlers && setting.binding.kind === 'event' && value && !registry?.hasHandler(value)) errors.push(`Handler is not registered: ${value}.`);
  }
  for (const rule of definition.builder.validation || []) {
    const applies = !rule.when || effective[rule.when.setting] === rule.when.equals;
    if (!applies) continue;
    if (rule.kind === 'requiredWhen' && !String(effective[rule.setting] || '').trim()) errors.push(`${definition.builder.settings[rule.setting].label} is required.`);
    if (rule.kind === 'oneOfRequiredWhen' && !rule.settings.some(name => String(effective[name] || '').trim())) errors.push('An action or action token is required.');
    if (rule.kind === 'accessibleNameWhenInteractive' && effective.interactionMode !== 'none'
      && !rule.settings.some(name => String(effective[name] || '').trim())) errors.push('Interactive cards need an accessible name.');
  }
  return errors;
}

export function changeSetting(definition, values, name, value) {
  if (!definition.builder.settings[name]) throw new Error(`Unknown setting: ${name}.`);
  const next = { ...copySerializable(values), [name]: value };
  // Mode changes reset incompatible settings rather than persisting a mixed mode.
  for (const [key, setting] of Object.entries(definition.builder.settings)) if (!isSettingVisible(setting, next)) next[key] = setting.default;
  return next;
}
