import {step} from './refusal-trace.js';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import type { ArtifactMetadata, Action } from '@ui-platform/visual-artifacts';
import { formCalculations, formExpressionFields, formValueErrors } from '@ui-platform/visual-artifacts';
import { calculateFields, calculationOrder } from '@ui-platform/dataset-operations/expression';
import { SecuredDatasetOperationEngine, type ProtectedFormContract, type TrustedDatasetExecution, type DatasetSecurityPlanner } from '@ui-platform/dataset-operations';
import { deny, digest, exact } from './boundary.js';

export interface ReleaseAdmission {
  applicationId: string; releaseId: string; compositionRoot: string; schemaIdentity: string;
  files: Record<string, string>;
}
export interface ReleaseSelection { read(): Promise<ReleaseAdmission> }
/** Capture only an existing published version. Called by trusted admission, never a browser route. */
export async function inspectPublishedComposition(compositionRoot: string, applicationId: string, releaseId: string, schemaIdentity: string): Promise<ReleaseAdmission> {
  const root = await realpath(compositionRoot);
  if (!/[/\\]presentation[/\\]versions[/\\]v[1-9]\d*[/\\]composition$/.test(root) || !applicationId || !releaseId || !schemaIdentity) deny();
  const files: Record<string, string> = {};
  const walk = async (relative = '') => {
    const file = path.join(root, relative), info = await lstat(file);
    if (info.isSymbolicLink()) deny();
    if (info.isDirectory()) for (const child of (await readdir(file)).sort()) await walk(path.posix.join(relative, child));
    else { if (!info.isFile() || info.nlink !== 1 || info.size > 20_000_000 || /(^|\/)(private|secrets|\.env|\.uib)(\/|$)/i.test(relative)) deny(); files[relative] = digest(await readFile(file)); }
  };
  await walk();
  return { applicationId, releaseId, compositionRoot: root, schemaIdentity, files };
}
export class ReleasedContracts {
  private readonly leases = new WeakMap<object, { assertCurrent(): Promise<void>; forms: Map<string, ArtifactMetadata> }>();
  private readonly engines = new WeakSet<SecuredDatasetOperationEngine>();
  constructor(private readonly selection: ReleaseSelection, private readonly currentSchema: (applicationId: string, schemaIdentity: string) => Promise<boolean>) {}
  createEngine(orm: ConstructorParameters<typeof SecuredDatasetOperationEngine>[0], resources: ConstructorParameters<typeof SecuredDatasetOperationEngine>[1],
    planner: DatasetSecurityPlanner, triggers: ConstructorParameters<typeof SecuredDatasetOperationEngine>[3]) {
    const engine = new SecuredDatasetOperationEngine(orm, resources, this.guardPlanner(planner), triggers);
    this.configureForms(engine); this.engines.add(engine); return engine;
  }
  /** Wrap the existing I-AM planner so every final read/write check also checks release selection. */
  guardPlanner(planner: DatasetSecurityPlanner): DatasetSecurityPlanner {
    return { plan: async request => { await this.assertContext(request.context); return planner.plan(request); },
      assertCurrent: async (plan, request) => { await this.assertContext(request.context); await planner.assertCurrent(plan, request); await this.assertContext(request.context); } };
  }
  private async assertContext(context: unknown) { const lease = context && typeof context === 'object' ? this.leases.get(context) : undefined; if (!lease) deny(); await lease.assertCurrent(); }
  configureForms(engine: SecuredDatasetOperationEngine) {
    engine.configureFormResolver(async (formId, datasetId, trusted): Promise<ProtectedFormContract> => {
      const lease = this.leases.get(trusted.context as object), metadata = lease?.forms.get(formId);
      if (!lease || !metadata?.form || metadata.form.datasetId !== datasetId) deny();
      await lease!.assertCurrent();
      const fields = formExpressionFields(metadata!), calculations = formCalculations(metadata!); calculationOrder(calculations, fields);
      return { fields, calculations, assertCurrent: lease!.assertCurrent };
    });
  }
  async lease(applicationId: string, releaseId: string) {
    const admission = structuredClone(await this.selection.read());
    if (admission.applicationId !== applicationId || admission.releaseId !== releaseId || !await this.currentSchema(applicationId, admission.schemaIdentity)) deny();
    const artifacts = new Map<string, ArtifactMetadata>(), forms = new Map<string, ArtifactMetadata>();
    if (!path.isAbsolute(admission.compositionRoot) || !/[/\\]presentation[/\\]versions[/\\]v[1-9]\d*[/\\]composition$/.test(admission.compositionRoot)) deny();
    const root = await realpath(admission.compositionRoot);
    const read = async (relative: string) => {
      if (!Object.hasOwn(admission.files, relative) || relative.includes('\\') || relative.split('/').some(s => !s || s === '.' || s === '..')) deny();
      let file = root;
      for (const segment of relative.split('/')) { file = path.join(file, segment); if ((await lstat(file)).isSymbolicLink()) deny(); }
      const bytes = await readFile(file); if (digest(bytes) !== admission.files[relative]) deny(); return bytes;
    };
    const assertCurrent = async () => step('release','assert-current',async () => {
      const current = await this.selection.read();
      if (JSON.stringify(current) !== JSON.stringify(admission) || !await this.currentSchema(applicationId, admission.schemaIdentity)) deny();
      // Preserve the complete byte/link check while avoiding serial filesystem
      // round trips consuming the planner's short evidence lifetime on real releases.
      const names=Object.keys(admission.files);
      await step('release','hash-all',async()=>{for(let offset=0;offset<names.length;offset+=32)await Promise.all(names.slice(offset,offset+32).map(read));});
    });
    await assertCurrent();
    for (const file of Object.keys(admission.files).filter(p => p.endsWith('.visual.json'))) {
      const metadata = JSON.parse((await read(file)).toString('utf8')) as ArtifactMetadata;
      if (metadata.schemaVersion !== 1 || metadata.developmentOnly || !metadata.artifactId || artifacts.has(metadata.artifactId) || !['page', 'shell', 'component'].includes(metadata.kind)) deny();
      artifacts.set(metadata.artifactId, metadata);
      if (metadata.form) {
        if (!metadata.componentId || forms.has(metadata.componentId) || metadata.form.contractVersion !== undefined && metadata.form.contractVersion !== 1 ||
            Object.values(metadata.modes?.overrides ?? {}).some(overrides => Object.keys(overrides).length > 0)) deny();
        forms.set(metadata.componentId!, metadata); calculationOrder(formCalculations(metadata), formExpressionFields(metadata));
      }
    }
    return { admission, artifacts, forms, read, assertCurrent };
  }
  async execute(engine: SecuredDatasetOperationEngine, trusted: TrustedDatasetExecution, input: unknown,
    authorizeArtifact: (metadata: ArtifactMetadata) => Promise<() => Promise<void>>) {
    exact(input, ['releaseId', 'artifactId', 'contract', 'values']);
    if (!this.engines.has(engine)) deny();
    const lease = await this.lease(trusted.applicationId, input.releaseId);
    const metadata = lease.artifacts.get(input.artifactId); if (!metadata) deny();
    const check = await authorizeArtifact(metadata!); await check();
    const context = trusted.context as object; if (this.leases.has(context)) deny();
    this.leases.set(context, lease);
    try {
      let result: unknown;
      if (input.contract === 'form-read') {
        const f = metadata!.form; if (!f) deny(); exact(input.values, ['recordId']);
        if (!['string', 'number'].includes(typeof input.values.recordId)) deny();
        await lease.assertCurrent(); await check();
        result = await engine.read({ datasetId: f!.datasetId, select: [...new Set([f!.primaryKey, ...f!.fields.map(field => field.key)])],
          where: { field: f!.primaryKey, op: 'eq', value: input.values.recordId }, limit: 1, mode: 'read' }, trusted);
      } else if (input.contract === 'form') {
        const f = metadata!.form; if (!f || !metadata!.componentId) deny();
        exact(input.values, ['operation', 'record']);
        if (!['create', 'edit'].includes(input.values.operation)) deny();
        const record = input.values.record;
        if (!record || typeof record !== 'object' || Array.isArray(record) || Object.keys(record).some(k => !f!.fields.some(v => v.key === k) && k !== f!.primaryKey) ||
            input.values.operation === 'edit' && !['string', 'number'].includes(typeof record[f!.primaryKey])) deny();
        const writable = f!.fields.filter(field => field.editable !== false && field.visible !== false && (!field.operations || field.operations.includes(input.values.operation)));
        if (Object.keys(record).some(k => k !== f!.primaryKey && !writable.some(field => field.key === k) && !f!.fields.some(field => field.key === k && field.calculation?.persist))) deny();
        const calculated = calculateFields(formCalculations(metadata!).filter(c => c.persist), formExpressionFields(metadata!), record);
        const fields = input.values.operation === 'create' ? writable : writable.filter(field => Object.hasOwn(calculated, field.key));
        if (Object.keys(formValueErrors(calculated, fields)).length) deny();
        await lease.assertCurrent(); await check();
        result = await engine.write({ datasetId: f!.datasetId, formId: metadata!.componentId, operation: input.values.operation === 'create' ? 'insert' : 'update', records: [calculated] }, trusted);
      } else {
        const action = this.action(metadata!, input.contract);
        if (action.kind === 'service' && action.reference === 'dataset.read') {
          // Stage 2 stores the bounded Dataset query in the action's literal input.
          if (!action.input || typeof action.input !== 'object' || !('literal' in action.input)) deny();
          const query = structuredClone((action.input as { literal: any }).literal);
          exact(query, ['datasetId'], ['select', 'where', 'orderBy', 'offset', 'limit', 'mode']);
          if (action.filter) { exact(input.values, ['filter']); if (!['string', 'number', 'boolean'].includes(typeof input.values.filter)) deny(); query.where = { field: action.filter.field, op: 'eq', value: input.values.filter }; }
          else exact(input.values, []);
          await lease.assertCurrent(); await check(); result = await engine.read(query as any, trusted);
        } else if (action.kind === 'record-delete' && action.version === 1) {
          exact(input.values, ['recordId']); if (!['string', 'number'].includes(typeof input.values.recordId)) deny();
          await lease.assertCurrent(); await check();
          result = await engine.deleteRecordTarget({ kind: action.kind, version: action.version, datasetId: action.datasetId, primaryFieldId: action.primaryFieldId, recordId: input.values.recordId }, trusted);
        } else deny(); // No function code, arbitrary service, Workflow or caller definition fallback.
      }
      return result;
    } finally { this.leases.delete(context); }
  }
  private action(metadata: ArtifactMetadata, contract: unknown): Action {
    if (typeof contract !== 'string') return deny();
    const load = /^onLoad:(\d+)$/.exec(contract), event = /^event:(\d+):(\d+)$/.exec(contract);
    const action = load ? metadata.onLoad?.[Number(load[1])] : event ? metadata.events?.[Number(event[1])]?.actions[Number(event[2])] : undefined;
    if (!action) return deny(); return action;
  }
}
