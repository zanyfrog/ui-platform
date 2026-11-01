export const triggerPhases = ['beforeInsert', 'afterInsert', 'beforeUpdate', 'afterUpdate', 'beforeDelete', 'afterDelete', 'afterCommit'] as const;
export type Row = Record<string, unknown>;
/** Explicit paths only: no evaluation, operators, interpolation, or executable source. */
export type AutomationValue = { literal: unknown } | { from: 'record' | 'oldRecord' | 'newRecord' | 'context'; path: string[] } | { fields: Record<string, AutomationValue> };
export type AutomationAction = { id: string; scope?: 'each' | 'batch' } & (
  | { type: 'set'; field: string; value: AutomationValue; ifMissing?: boolean }
  | { type: 'reject'; message: string }
  | { type: 'crud'; datasetId: string; operation: 'insert' | 'update' | 'delete'; records: AutomationValue }
  | { type: 'crud'; datasetId: string; operation: 'read'; query: AutomationValue }
  | { type: 'service'; service: string; input: AutomationValue });
export interface AutomationDefinition {
  schemaVersion: 1; kind: 'trigger' | 'workflow'; id: string; name: string; displayName: string;
  description?: string; enabled: boolean; appId: string; datasetId: string;
  /** Trigger physical Dataset key is resolved/verified by the trusted host. */
  dataset?: string; primaryKey: string; phase?: typeof triggerPhases[number]; priority?: number;
  actions: AutomationAction[]; dependencies?: string[];
}
export interface AutomationBundle { locator: string; source: string; hash: string; definition?: AutomationDefinition; diagnostics: string[] }
export function automationDiagnostics(value: unknown): string[] {
  const errors: string[] = [];
  const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
  const identifier = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
  if (!object(value)) return ['Definition must be an object.'];
  const allowed = ['schemaVersion', 'kind', 'id', 'name', 'displayName', 'description', 'enabled', 'appId', 'datasetId', 'dataset', 'primaryKey', 'phase', 'priority', 'actions', 'dependencies'];
  if (Object.keys(value).some(key => !allowed.includes(key))) errors.push('Unsupported definition property. Credentials and execution authority are not definition settings.');
  if (value.schemaVersion !== 1 || !['trigger', 'workflow'].includes(String(value.kind))) errors.push('Unsupported schema or kind.');
  for (const key of ['id', 'name', 'appId', 'datasetId', 'primaryKey']) if (!identifier(value[key])) errors.push(`${key} must be a stable identifier.`);
  if (typeof value.displayName !== 'string' || !value.displayName.trim() || typeof value.enabled !== 'boolean') errors.push('Display name and enabled state are required.');
  if (value.kind === 'trigger' && (!identifier(value.dataset) || !triggerPhases.includes(value.phase as never))) errors.push('Trigger Dataset key and supported phase are required.');
  if (value.priority !== undefined && (typeof value.priority !== 'number' || !Number.isFinite(value.priority))) errors.push('Priority must be a finite number.');
  if (value.kind === 'workflow' && (value.phase !== undefined || value.priority !== undefined || value.dataset !== undefined)) errors.push('Workflow has no Trigger phase, priority, or physical Dataset setting.');
  if (value.dependencies !== undefined && (!Array.isArray(value.dependencies) || !value.dependencies.every(identifier))) errors.push('Dependencies must be permanent IDs.');
  function binding(v: unknown, depth = 0): boolean {
    if (!object(v) || depth > 3) return false;
    if (Object.keys(v).join() === 'literal') return JSON.stringify(v.literal)?.length <= 16000;
    if (Object.keys(v).join() === 'fields') return object(v.fields) && Object.keys(v.fields).length <= 50 && Object.entries(v.fields).every(([key, value]) => identifier(key) && !['__proto__', 'constructor', 'prototype'].includes(key) && binding(value, depth + 1));
    return Object.keys(v).sort().join() === 'from,path' && ['record', 'oldRecord', 'newRecord', 'context'].includes(String(v.from)) && Array.isArray(v.path) && v.path.length <= 12 && v.path.every(p => typeof p === 'string' && /^[A-Za-z0-9_-]+$/.test(p) && !['__proto__', 'constructor', 'prototype'].includes(p));
  }
  if (!Array.isArray(value.actions) || value.actions.length > 100) return [...errors, 'Actions must be an ordered array of at most 100 entries.'];
  const ids = new Set<unknown>();
  for (const action of value.actions) {
    if (!object(action)) { errors.push('Action must be an object.'); continue; }
    if (!identifier(action.id) || ids.has(action.id)) errors.push('Action IDs must be unique.'); ids.add(action.id);
    const keys: Record<string, string[]> = { set: ['field', 'value', 'ifMissing'], reject: ['message'], crud: ['datasetId', 'operation', 'records', 'query'], service: ['service', 'input'] };
    if (!keys[String(action.type)] || Object.keys(action).some(key => !['id', 'type', 'scope', ...keys[String(action.type)] ?? []].includes(key))) errors.push('Unsupported action or action property.');
    if (action.scope !== undefined && !['each', 'batch'].includes(String(action.scope))) errors.push('Unsupported action scope.');
    if (value.kind === 'workflow' && (action.scope !== undefined || !['crud', 'service'].includes(String(action.type)))) errors.push('Workflow supports only single-record CRUD and service actions.');
    if (action.type === 'set' && (!String(value.phase).startsWith('before') || value.phase === 'beforeDelete' || action.scope === 'batch' || !identifier(action.field) || ['__proto__', 'constructor', 'prototype', value.primaryKey].includes(String(action.field)) || !binding(action.value) || action.ifMissing !== undefined && typeof action.ifMissing !== 'boolean')) errors.push('Set needs an each-scoped pending insert/update field and a value binding.');
    if (action.type === 'reject' && (typeof action.message !== 'string' || action.message.length > 200)) errors.push('Reject needs a concise diagnostic.');
    if (action.type === 'crud' && (!identifier(action.datasetId) || !['insert', 'update', 'delete', 'read'].includes(String(action.operation)) || !(action.operation === 'read' ? binding(action.query) && action.records === undefined : binding(action.records) && action.query === undefined))) errors.push('CRUD needs a Dataset ID, operation, and records/query binding.');
    if (action.type === 'service' && (!identifier(action.service) || !binding(action.input))) errors.push('Service needs a registered identity and input binding.');
  }
  return errors;
}
export function automationDependencies(definition: AutomationDefinition): string[] {
  return [...new Set([definition.datasetId, ...(definition.dependencies ?? []), ...definition.actions.flatMap(a => a.type === 'crud' ? [a.datasetId] : a.type === 'service' ? [a.service] : [])])];
}
