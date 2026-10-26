export type ValueType = 'string' | 'number' | 'boolean' | 'object' | 'array';
export interface PropertyContract {
  type: ValueType; required?: boolean; default?: unknown; enum?: unknown[];
  minimum?: number; maximum?: number; minLength?: number; maxLength?: number;
}
export interface PublicInterface {
  properties: Record<string, PropertyContract>;
  events: Record<string, { payload: Record<string, PropertyContract> }>;
  slots: string[];
}
export type Expression = import('@ui-platform/dataset-operations/expression').PresentationExpression;
export interface Binding { node: string; target: string; value: Expression }
export type Action =
  | { kind: 'set'; state: string; value: Expression }
  | { kind: 'emit'; event: string; payload?: Record<string, Expression> }
  | { kind: 'navigate'; to: Expression }
  | { kind: 'service'; reference: string; input?: Expression }
  | { kind: 'workflow'; workflowId: string; primaryRecordId: Expression; resultState?: string }
  | { kind: 'record-delete'; version: 1; datasetId: string; primaryFieldId: string; recordId: Expression; resultState: string }
  | { kind: 'function'; name: string };
export interface LayoutRule {
  width?: string; height?: string; margin?: string; padding?: string; display?: 'grid' | 'flex' | 'block' | 'none';
  gridTemplateColumns?: string; gridColumn?: string; gap?: string; alignItems?: string; justifyContent?: string;
  flexDirection?: 'row' | 'column'; flex?: string;
}
export interface ArtifactMetadata {
  schemaVersion: 1; artifactId: string; kind: 'page' | 'component' | 'shell'; name: string; displayName: string; description?: string;
  shellId?: string;
  routeId?: string;
  menuOverrides?: import('./composition.js').MenuOverrides;
  componentId?: string; route?: string; developmentOnly?: boolean;
  public?: PublicInterface;
  state?: Record<string, unknown>;
  sources?: Record<string, { kind: 'fixture' | 'service'; value?: unknown; reference?: string }>;
  bindings?: Binding[];
  conditions?: Array<{ node: string; when: Expression }>;
  repeaters?: Array<{ node: string; collection: Expression; item: string; index?: string }>;
  events?: Array<{ node: string; event: string; actions: Action[] }>;
  onLoad?: Action[];
  layout?: Record<string, { base?: LayoutRule; tablet?: LayoutRule; mobile?: LayoutRule }>;
  dependencies?: string[];
  capabilities?: Array<'visual' | 'form'>;
  modes?: { default: string; overrides: Record<string, Record<string, NodeOverride>> };
  form?: FormDefinition;
}
export interface NodeOverride { visible?: boolean; editable?: boolean; required?: boolean; label?: string; help?: string; default?: unknown }
export interface FormField extends NodeOverride { id: string; node: string; key: string; datasetFieldId: string; type: ValueType; datasetRequired?: boolean; operations?: Array<'create' | 'edit'>; calculation?: { expression: import('@ui-platform/dataset-operations/expression').DeclarativeExpression; persist: boolean }; codec?: 'date' | 'json' }
export interface FormDefinition {
  contractVersion?: 1;
  node: string; datasetId: string; primaryKey: string; fields: FormField[];
  submit: { service: string; readService: string };
}
export interface DatasetDefinition { dataset: { id: string; key: string; name: string }; fields: Array<{ id: string; key: string; type: string; required?: boolean; default?: unknown }> }
export interface ArtifactFiles { source: string; css: string; metadata: string; fixtures: string; code: string }
export interface ArtifactBundle { locator: string; files: ArtifactFiles; hash: string; diagnostics: Diagnostic[]; metadata?: ArtifactMetadata }
export interface Diagnostic { severity: 'error' | 'warning'; message: string; node?: string }
export interface SettingContract extends PropertyContract {
  label?: string; binding?: { kind: string; name?: string; content?: string; altSetting?: string };
  visibleWhen?: { setting: string; equals: unknown }; format?: string;
}
export interface PackageDefinition {
  identity: { componentId: string; displayName?: string };
  builder: { settings: Record<string, SettingContract>; interactionModes?: Record<string, { attributes: Record<string, unknown> }>; validation?: Array<{ kind: string; setting?: string; settings?: string[]; when?: { setting: string; equals: unknown } }> };
  runtime: { events: Record<string, unknown>; slots: Array<{ name: string }> };
}
export interface PackageComponent {
  id: string; tagName: string; name?: string; moduleUrl?: string; definition?: PackageDefinition;
  properties?: string[]; attributes?: string[]; events?: string[]; slots?: string[]; activationIssues?: string[];
  presentation?: { settings: Record<string, { type: 'string' | 'number' | 'boolean' | 'select'; options?: Array<string | number>; default?: string | number | boolean }> };
}
/** Adapt existing legacy presentation declarations into the native value validator. */
export function legacyPackageSettingContracts(pkg: PackageComponent): Record<string, PropertyContract> {
  return Object.fromEntries(Object.entries(pkg.presentation?.settings ?? {}).flatMap(([key, value]) => {
    // Presentation record keys do not establish aliases for instance attributes.
    if (!/^[a-z][a-z0-9-]*$/.test(key)) return [];
    if (value.type === 'select') return value.options?.length ? [[key, { type: typeof value.options[0] === 'number' ? 'number' : 'string', enum: value.options, default: value.default }]] : [];
    return ['string', 'number', 'boolean'].includes(value.type) ? [[key, { type: value.type, default: value.default }]] : [];
  })) as Record<string, PropertyContract>;
}
export interface RuntimeArtifact { metadata: ArtifactMetadata; source: string; css: string; functions?: Record<string, (context: FunctionContext) => void> }
export interface FunctionContext { public: Record<string, unknown>; local: Record<string, unknown>; root: ShadowRoot; event?: Event; setState: (name: string, value: unknown) => void; emit: (name: string, payload: Record<string, unknown>) => void }

export function valueErrors(value: unknown, contract: PropertyContract, label: string): string[] {
  if (value === undefined || value === null) return contract.required ? [`${label} is required.`] : [];
  const type = Array.isArray(value) ? 'array' : typeof value;
  const errors: string[] = [];
  if (type !== contract.type || (type === 'number' && !Number.isFinite(value))) return [`${label} must be ${contract.type}.`];
  if (contract.enum && !contract.enum.some(item => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${label} is outside its allowed values.`);
  if (typeof value === 'number' && ((contract.minimum !== undefined && value < contract.minimum) || (contract.maximum !== undefined && value > contract.maximum))) errors.push(`${label} is outside its numeric bounds.`);
  if (typeof value === 'string' && ((contract.minLength !== undefined && value.length < contract.minLength) || (contract.maxLength !== undefined && value.length > contract.maxLength))) errors.push(`${label} is outside its length bounds.`);
  return errors;
}

export function packageSettingErrors(definition: PackageDefinition, settings: Record<string, unknown>): string[] {
  const contracts = definition.builder.settings, values: Record<string, unknown> = {};
  for (const [key, contract] of Object.entries(contracts)) values[key] = settings[key] ?? contract.default;
  const errors: string[] = [];
  for (const [key, value] of Object.entries(settings)) if (!contracts[key]) errors.push(`Unknown installed Package setting: ${key}.`);
  for (const [key, contract] of Object.entries(contracts)) {
    errors.push(...valueErrors(values[key], contract, key));
    if (contract.visibleWhen && values[contract.visibleWhen.setting] !== contract.visibleWhen.equals && values[key] !== contract.default) errors.push(`${key} is not allowed in this interaction mode.`);
  }
  for (const rule of definition.builder.validation ?? []) {
    if (rule.when && values[rule.when.setting] !== rule.when.equals) continue;
    if (rule.kind === 'requiredWhen' && !String(values[rule.setting!] ?? '').trim()) errors.push(`${rule.setting} is required.`);
    if (rule.kind === 'oneOfRequiredWhen' && !rule.settings?.some(key => String(values[key] ?? '').trim())) errors.push(`One of ${rule.settings?.join(', ')} is required.`);
    if (rule.kind === 'accessibleNameWhenInteractive' && values.interactionMode !== 'none' && !rule.settings?.some(key => String(values[key] ?? '').trim())) errors.push('Interactive components need an accessible name.');
  }
  return errors;
}

/** Explicit settings override ordinary source attributes; both are authoritative source declarations. */
export function readPackageSettings(definition: PackageDefinition, attributes: Record<string, string>, stored: Record<string, unknown>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, contract] of Object.entries(definition.builder.settings)) {
    const binding = contract.binding;
    if (binding?.kind === 'attribute' && binding.name && Object.hasOwn(attributes, binding.name)) {
      const value = attributes[binding.name];
      values[key] = contract.type === 'boolean' ? value !== 'false' : contract.type === 'number' ? Number(value) : value;
    }
  }
  return { ...values, ...stored };
}
