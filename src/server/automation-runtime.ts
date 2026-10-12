import { randomUUID } from 'node:crypto';
import type { ProtectedRead, ProtectedWrite, SecuredDatasetOperationEngine, TriggerContext, TriggerRegistry, TrustedDatasetExecution } from '@ui-platform/dataset-operations';
import { automationDependencies, type AutomationAction, type AutomationDefinition, type AutomationValue, type Row } from '../shared/automation.js';
import type { AutomationStore } from './automation-store.js';
export interface AutomationAudit {
  executionId: string; artifactId: string; kind: 'trigger' | 'workflow'; timestamp: string;
  datasetId: string; recordIds: unknown[]; actor: string; phase?: string; operation?: string;
  actionId?: string; scope?: 'each' | 'batch'; priority?: number; success: boolean;
  completedSteps?: number; failedStep?: number; error?: string; diagnostic?: string; chain?: readonly string[];
}
export class AutomationAuditLog {
  private entries: AutomationAudit[] = [];
  constructor(readonly capacity = 500, private readonly sink?: (entry: AutomationAudit) => void) {}
  record(entry: AutomationAudit) { this.entries.push(structuredClone(entry)); this.entries = this.entries.slice(-this.capacity); this.sink?.(structuredClone(entry)); }
  list() { return structuredClone(this.entries); }
}
export interface AutomationPort { read(request: ProtectedRead): Promise<unknown>; write(request: ProtectedWrite): Promise<{ success: boolean; committed: boolean; errors?: { code: string }[] }> }
export interface RegisteredAutomationService {
  /** External side effects are only permitted after commit or as Workflow steps. */
  transactional: boolean;
  invoke(input: unknown, context: Readonly<Row>, port: AutomationPort): Promise<unknown>;
}
export interface WorkflowResult { success: boolean; workflowId: string; primaryRecordId: string | number; executionId: string; completedSteps: number; failedStep?: number; error?: string; committedSteps: number; postCommitFailed?: boolean; repeatWriteMayDuplicate?: boolean }
function diagnostic(cause: unknown) { return cause instanceof Error && /^[A-Z][A-Z0-9_]{0,100}$/.test(cause.message) ? cause.message : 'AUTOMATION_ACTION_FAILED'; }
function resolve(binding: AutomationValue, context: Row): unknown {
  if ('literal' in binding) return structuredClone(binding.literal);
  if ('fields' in binding) return Object.fromEntries(Object.entries(binding.fields).map(([key, value]) => [key, resolve(value, context)]));
  let current: unknown = context[binding.from];
  for (const key of binding.path) {
    if (!current || typeof current !== 'object' || !Object.hasOwn(current, key)) return undefined;
    current = (current as Row)[key];
  }
  return structuredClone(current);
}
function records(value: unknown): Row[] {
  const array = Array.isArray(value) ? value : [value];
  if (!array.length || array.some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error('CRUD_RECORDS_INVALID');
  return array as Row[];
}
/** Definition adapter only: registry dispatch, protected DOE writes and transaction ownership remain in Data Services. */
export class AutomationRuntime {
  constructor(readonly triggers: AutomationStore, readonly workflows: AutomationStore,
    readonly services: ReadonlyMap<string, RegisteredAutomationService>, readonly audit = new AutomationAuditLog()) {}
  private async definitions(store: AutomationStore) {
    const bundles = await store.list();
    if (bundles.some(b => b.diagnostics.length && b.definition?.enabled !== false)) throw new Error('AUTOMATION_SOURCE_INVALID');
    return bundles.filter(b => !b.diagnostics.length).map(b => b.definition!);
  }
  connect(registry: TriggerRegistry, resolveDataset: (appId: string, datasetId: string) => Promise<string>) {
    registry.registerSourceProvider(async () => {
      const definitions = await this.definitions(this.triggers);
      const rows = [];
      for (const definition of definitions) {
        if (!definition.enabled) continue;
        if (await resolveDataset(definition.appId, definition.datasetId) !== definition.dataset) throw new Error('TRIGGER_DATASET_BINDING_INVALID');
        const handlerId = `platform-source:${definition.id}`;
        registry.registerHandler(handlerId, context => this.trigger(definition, context));
        rows.push({ id: definition.id, appId: definition.appId, dataset: definition.dataset!, phase: definition.phase!,
          enabled: definition.enabled, priority: definition.priority, name: definition.name, handlerId,
          executionIdentity: { mode: 'inherit' as const }, createdAt: '', updatedAt: '' });
      }
      return rows;
    });
  }
  private async action(action: AutomationAction, values: Row, port: AutomationPort, phase?: string): Promise<unknown> {
    if (action.type === 'reject') throw new Error('TRIGGER_REJECTED');
    if (action.type === 'set') return resolve(action.value, values);
    if (action.type === 'crud') {
      if (action.operation === 'read') {
        const query = resolve(action.query, values);
        if (!query || typeof query !== 'object' || Array.isArray(query) || Object.keys(query).some(key => !['select', 'where', 'orderBy', 'offset', 'limit'].includes(key))) throw new Error('QUERY_INVALID');
        return port.read({ ...(query as Omit<ProtectedRead, 'datasetId'>), datasetId: action.datasetId });
      }
      const result = await port.write({ datasetId: action.datasetId, operation: action.operation, records: records(resolve(action.records, values)) });
      if (!result.success) throw new Error(result.committed ? 'CRUD_COMMITTED_POST_COMMIT_FAILED' : result.errors?.[0]?.code ?? 'CRUD_FAILED');
      return result;
    }
    const service = this.services.get(action.service);
    if (!service) throw new Error('SERVICE_NOT_REGISTERED');
    if (phase && phase !== 'afterCommit' && !service.transactional) throw new Error('EXTERNAL_SERVICE_REQUIRES_AFTER_COMMIT');
    return service.invoke(resolve(action.input, values), Object.freeze(structuredClone(values)), port);
  }
  private async trigger(definition: AutomationDefinition, context: TriggerContext) {
    const count = Math.max(context.newRecords.length, context.oldRecords?.length ?? 0);
    const ids = context.recordIds ?? Array.from({ length: count }, (_, i) => (context.newRecords[i] ?? context.oldRecords?.[i])?.[definition.primaryKey]);
    const base: AutomationAudit = { executionId: context.operationId, artifactId: definition.id, kind: 'trigger', timestamp: new Date().toISOString(),
      datasetId: definition.datasetId, recordIds: ids, actor: JSON.stringify(context.actor), phase: context.phase, operation: context.operation,
      priority: definition.priority ?? 0, success: true, chain: context.executionChain };
    const port: AutomationPort = {
      read: request => { if (!context.datasets.read) throw new Error('TRIGGER_QUERY_UNAVAILABLE'); return context.datasets.read(request); },
      write: request => context.datasets.execute({ appId: context.appId, dataset: request.datasetId, operation: request.operation, records: request.records }),
    };
    for (const action of definition.actions) {
      const scope = action.scope ?? 'each';
      const executions = scope === 'batch' ? 1 : count;
      for (let index = 0; index < executions; index++) {
        const newRecord = context.newRecords[index], oldRecord = context.oldRecords?.[index];
        const values: Row = { record: scope === 'each' ? newRecord ?? oldRecord : undefined, newRecord: scope === 'each' ? newRecord : undefined, oldRecord: scope === 'each' ? oldRecord : undefined,
          context: { operationId: context.operationId, rootOperationId: context.rootOperationId, phase: context.phase,
            operation: context.operation, datasetId: definition.datasetId, recordIds: ids,
            recordExecutionId: `${context.operationId}:${index}`,
            newRecords: context.newRecords, oldRecords: context.oldRecords ?? [], changedFields: scope === 'each' ? context.changedFields?.[index] ?? [] : context.changedFields ?? [], actor: context.actor } };
        try {
          const result = await this.action(action, values, port, context.phase);
          if (action.type === 'set') {
            if (scope === 'batch') throw new Error('SET_REQUIRES_EACH');
            if (!newRecord) throw new Error('NO_PENDING_RECORD');
            if (!action.ifMissing || newRecord[action.field] === undefined || newRecord[action.field] === null || newRecord[action.field] === '') newRecord[action.field] = result;
          }
          // Approved service patches can only modify pending records before persistence.
          if (action.type === 'service' && result && typeof result === 'object' && 'patches' in result) {
            if (!context.phase.startsWith('before') || context.phase === 'beforeDelete') throw new Error('PATCH_OUTSIDE_BEFORE');
            const patches = records((result as Row).patches);
            if (patches.length !== (scope === 'each' ? 1 : context.newRecords.length)) throw new Error('PATCH_COUNT_INVALID');
            patches.forEach((patch, i) => { for (const [key, value] of Object.entries(patch)) {
              if (['__proto__', 'constructor', 'prototype', definition.primaryKey].includes(key)) throw new Error('PATCH_FIELD_INVALID');
              (scope === 'each' ? newRecord! : context.newRecords[i]!)[key] = value;
            } });
          }
          this.audit.record({ ...base, timestamp: new Date().toISOString(), actionId: action.id, scope, recordIds: scope === 'each' ? [ids[index]] : ids });
        } catch (cause) {
          this.audit.record({ ...base, timestamp: new Date().toISOString(), actionId: action.id, scope, recordIds: scope === 'each' ? [ids[index]] : ids, success: false, error: diagnostic(cause), ...(action.type === 'reject' ? { diagnostic: action.message } : {}) });
          throw cause;
        }
      }
    }
    if (!definition.actions.length) this.audit.record(base);
  }
  async workflow(workflowId: string, primaryRecordId: string | number, trusted: TrustedDatasetExecution, engine: SecuredDatasetOperationEngine): Promise<WorkflowResult> {
    const executionId = randomUUID(); let completedSteps = 0, committedSteps = 0, failedStep: number | undefined;
    let definition: AutomationDefinition | undefined;
    const result = (success: boolean, error?: string): WorkflowResult => ({ success, workflowId, primaryRecordId, executionId, completedSteps, committedSteps,
      ...(failedStep ? { failedStep } : {}), ...(error ? { error } : {}), ...(error === 'CRUD_COMMITTED_POST_COMMIT_FAILED' ? { postCommitFailed: true, repeatWriteMayDuplicate: true } : {}) });
    try {
      if (!['string', 'number'].includes(typeof primaryRecordId) || primaryRecordId === '' || typeof primaryRecordId === 'number' && !Number.isFinite(primaryRecordId)) throw new Error('PRIMARY_RECORD_ID_REQUIRED');
      definition = (await this.definitions(this.workflows)).find(d => d.id === workflowId);
      if (!definition || !definition.enabled) throw new Error('WORKFLOW_UNAVAILABLE');
      if (definition.appId !== trusted.applicationId) throw new Error('AUTHORIZATION_DENIED');
      const rows = await engine.read({ datasetId: definition.datasetId, where: { field: definition.primaryKey, op: 'eq', value: primaryRecordId }, limit: 2 }, trusted);
      if (!Array.isArray(rows) || rows.length !== 1) throw new Error('PRIMARY_RECORD_NOT_ACCESSIBLE');
      const port: AutomationPort = { read: request => engine.read(request, trusted), write: async request => {
        const written = await engine.write(request, trusted); if (written.committed) committedSteps++; return written;
      } };
      for (let index = 0; index < definition.actions.length; index++) {
        failedStep = index + 1;
        const current = index === 0 ? rows : await engine.read({ datasetId: definition.datasetId, where: { field: definition.primaryKey, op: 'eq', value: primaryRecordId }, limit: 2 }, trusted);
        if (!Array.isArray(current) || current.length !== 1) throw new Error('PRIMARY_RECORD_NOT_ACCESSIBLE');
        await this.action(definition.actions[index]!, { record: current[0], newRecord: current[0], oldRecord: undefined,
          context: { executionId, workflowId, primaryRecordId, actor: trusted.actor } }, port);
        completedSteps++;
        this.audit.record({ executionId, artifactId: workflowId, kind: 'workflow', timestamp: new Date().toISOString(), datasetId: definition.datasetId,
          recordIds: [primaryRecordId], actor: JSON.stringify(trusted.actor), actionId: definition.actions[index]!.id, completedSteps, success: true });
      }
      failedStep = undefined;
      this.audit.record({ executionId, artifactId: workflowId, kind: 'workflow', timestamp: new Date().toISOString(), datasetId: definition.datasetId,
        recordIds: [primaryRecordId], actor: JSON.stringify(trusted.actor), completedSteps, success: true });
      return result(true);
    } catch (cause) {
      const error = diagnostic(cause);
      this.audit.record({ executionId, artifactId: workflowId, kind: 'workflow', timestamp: new Date().toISOString(), datasetId: definition?.datasetId ?? '',
        recordIds: typeof primaryRecordId === 'string' || typeof primaryRecordId === 'number' && Number.isFinite(primaryRecordId) ? [primaryRecordId] : [], actor: JSON.stringify(trusted.actor), completedSteps, failedStep, actionId: failedStep ? definition?.actions[failedStep - 1]?.id : undefined, success: false, error });
      return result(false, error);
    }
  }
  async dependencies() { return [...await this.definitions(this.triggers), ...await this.definitions(this.workflows)].map(d => ({ id: d.id, references: automationDependencies(d) })); }
}
