import path from 'node:path';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, realpath } from 'node:fs/promises';
import { bootstrapDevelopmentDataset, prepareDevelopmentDataset, inspectDevelopmentDataset, datasetSchemaCapabilities } from '@ui-platform/dataset-operations';
import { appPath, readApplicationOwnerId } from './applications.js';
import { createBuilderDevelopmentHost, type BuilderDevelopmentHostConfig } from './builder-development-host.js';
import { withApplicationMutation } from './composition-lock.js';
import { EditorRequestError, type ArtifactEditorWorkspace } from './artifact-editor.js';
import type { ArtifactEditorSecurity } from './editor-security.js';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import type { DevelopmentApplicationRuntime } from './development-application-runtime.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
import { platformRoot } from './paths.js';
import type { AuthoringDatasetSchema, DatasetDevelopmentStatus } from '../shared/dataset-authoring.js';
import type { AssignmentReferences } from './assignment-reference.js';

type Deployment = { sourceChecksum: string; config: BuilderDevelopmentHostConfig };
function reject(code: string, status = 409): never { throw new EditorRequestError(status, code, code.replaceAll('_', ' ')); }
const identifier = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,100}$/.test(value);
async function optionalJson<T>(file: string): Promise<T | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')) as T; } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
async function atomicJson(file: string, value: unknown) {
  const temporary = `${file}.${randomUUID()}.tmp`; await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 }); await rename(temporary, file);
}

/** Durable connection selection, including the accepted legacy single-Dataset shape. */
export function connectionDatasetIds(persisted: unknown): string[] {
  if (persisted === undefined) return [];
  if (!persisted || typeof persisted !== 'object' || Array.isArray(persisted)) reject('DATASET_CONNECTION_METADATA_INVALID');
  const value = persisted as Record<string, unknown>;
  const ids = value.version === 1 && Array.isArray(value.datasetIds) && Object.keys(value).every(k => ['version', 'datasetIds'].includes(k)) ? value.datasetIds :
    typeof value.datasetId === 'string' && Object.keys(value).length === 1 ? [value.datasetId] : undefined;
  if (!ids || ids.some(id => typeof id !== 'string' || !identifier(id)) || new Set(ids).size !== ids.length) reject('DATASET_CONNECTION_METADATA_INVALID');
  return [...ids];
}

/** Development-only orchestration. Schema/activation/owner truth stays in Data Services. */
export class DatasetDevelopment {
  private readonly hosts = new Map<string, { applicationId: string; datasetId: string; server: Server; host: ReturnType<typeof createBuilderDevelopmentHost> }>();
  private readonly validated = new Map<string, string>();
  constructor(private readonly options: { root: string; policyStore: string; registryFile: string; applicationsRoot: string;
    identity: V1DevelopmentIdentity; security: ArtifactEditorSecurity; registry: DevelopmentApplicationRegistry;
    runtime: DevelopmentApplicationRuntime; workspace(key: string): ArtifactEditorWorkspace }) {}
  async close() {
    for (const entry of this.hosts.values()) {
      this.options.runtime.disconnectManaged(entry.applicationId, entry.datasetId);
      await new Promise<void>(resolve => entry.server.close(() => resolve())); entry.host.close();
    }
    this.hosts.clear();
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = /^\/api\/apps\/([^/]+)\/datasets(?:\/(capabilities|create|status|validate|apply|connect|discovery|assignment))?$/.exec(url.pathname);
    if (!match) return false;
    const send = (status: number, value: unknown) => res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(value));
    try {
      if (process.env.NODE_ENV !== 'development' || !import.meta.url.endsWith('.ts')) reject('DATASET_DEVELOPMENT_ONLY', 403);
      const mutation = req.method === 'POST'; this.options.security.workspacePrincipal(req, mutation);
      const key = decodeURIComponent(match[1]), appId = this.options.registry.byKey(key)?.applicationId;
      if (!appId || await readApplicationOwnerId(key) !== appId) reject('DATASET_OWNER_DENIED', 403);
      const action = match[2] ?? 'discovery';
      const workspace = this.options.workspace(key);
      let input: Record<string, unknown> = {};
      if (mutation) { let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 65536) reject('DATASET_REQUEST_TOO_LARGE', 413); } input = JSON.parse(text || '{}'); }
      const allowedKeys = action === 'create' ? ['name'] : ['locator', 'expectedChecksum', 'confirmed', ...(action === 'assignment' ? ['ownerDatasetId', 'targetDatasetId', 'targetActiveField'] : [])];
      if (Object.keys(input).some(k => !allowedKeys.includes(k)) || !['GET', 'POST'].includes(req.method ?? '')) reject('DATASET_REQUEST_INVALID', 400);
      const resource = { authorityId: V1_AUTHORITY_ID, applicationId: appId, kind: 'artifact' as const, id: 'datasets', parentId: appId };
      const permission = mutation ? ['apply', 'connect', 'assignment'].includes(action) ? 'ui.artifact.admin' : 'ui.artifact.edit' : 'ui.artifact.view';
      const authority = this.options.identity.captureAdmission(req, permission, resource);
      const admit = async () => {
        this.options.security.workspacePrincipal(req, mutation); await authority();
        if (this.options.registry.byKey(key)?.applicationId !== appId || await readApplicationOwnerId(key) !== appId) reject('DATASET_OWNER_CHANGED', 403);
      };
      await admit();
      if (action === 'capabilities' && !mutation) { send(200, datasetSchemaCapabilities); return true; }
      if (action === 'discovery' && !mutation) {
        const artifacts = await this.options.security.workspaceArtifacts(req, key), result = [];
        for (const item of artifacts.filter(a => a.artifactType === 'dataset')) {
          const artifact = await this.options.security.workspaceArtifact(req, key, item.locator);
          const deployment = identifier(item.artifactId ?? '') ? await optionalJson<Deployment>(path.join(this.options.root, appId, item.artifactId!, 'host.json')) : undefined;
          const applied = deployment ? await inspectDevelopmentDataset(deployment.config).catch(() => undefined) : undefined;
          result.push({ ...item, assignment: !!deployment?.config.assignment, schema: artifact.validation.valid ? JSON.parse(artifact.files.find(f => f.role === 'definition')!.content) : undefined,
            ...(applied?.resource.applicationId === appId && applied.resource.id === item.artifactId ? { appliedSchema: applied.schema, publication: deployment!.config.pin.publication } : {}) });
        }
        await admit(); send(200, result); return true;
      }
      return await withApplicationMutation(appPath(key), async () => {
        await admit();
        if (action === 'create' && mutation) {
          const name = String(input.name ?? '').trim(); if (!name || name.length > 100) reject('DATASET_NAME_REQUIRED', 422);
          const id = randomUUID(), datasetKey = `records_${id.replaceAll('-', '')}`;
          const schema: AuthoringDatasetSchema = { definitionType: 'dataset-schema', definitionFormatVersion: 1,
            dataset: { id, key: datasetKey, name, pluralName: `${name}s` }, fields: [{ id: randomUUID(), key: 'id', type: 'id', required: true }] };
          const parent = path.join(appPath(key), 'datasets'); await mkdir(parent, { recursive: true });
          if (await realpath(parent) !== path.resolve(parent)) reject('DATASET_PATH_REDIRECTED', 403);
          const stagingRoot = path.join(appPath(key), '.uib', 'dataset-creation'); await mkdir(stagingRoot, { recursive: true });
          if (await realpath(stagingRoot) !== path.resolve(stagingRoot)) reject('DATASET_PATH_REDIRECTED', 403);
          const staging = path.join(stagingRoot, id), destination = path.join(parent, id);
          await mkdir(staging);
          await writeFile(path.join(staging, 'dataset.json'), JSON.stringify(schema, null, 2));
          await writeFile(path.join(staging, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1, artifactId: id, artifactType: 'dataset', name, files: { definition: 'dataset.json' } }, null, 2));
          await admit(); await rename(staging, destination);
          const artifact = await workspace.load(workspace.locator(destination));
          workspace.changed({ kind: 'changed', bundlePath: destination });
          await admit();
          send(201, artifact); return true;
        }
        const locator = String(input.locator ?? url.searchParams.get('locator') ?? '');
        const artifact = await this.options.security.workspaceArtifact(req, key, locator);
        if (artifact.manifest?.artifactType !== 'dataset') reject('DATASET_UNKNOWN', 404);
        const id = artifact.manifest.artifactId;
        if ((await workspace.discover()).filter(a => a.artifactId === id).length !== 1) reject('DATASET_DUPLICATE_ID', 422);
        if (!identifier(id) || !identifier(appId)) reject('DATASET_ID_UNSUPPORTED', 422);
        const ownerResource = { ...resource, id };
        if (!await this.options.identity.authorize(req, permission, ownerResource)) reject('DATASET_AUTHORITY_DENIED', 403);
        const selectedAuthority = this.options.identity.captureAdmission(req, permission, ownerResource);
        const assertSource = async () => {
          await admit(); await selectedAuthority();
          const current = await workspace.load(locator);
          if (current.checksum !== artifact.checksum) reject('DATASET_SOURCE_STALE');
        };
        if (mutation && input.expectedChecksum !== artifact.checksum) reject('DATASET_SOURCE_STALE');
        const directory = path.join(this.options.root, appId, id), deploymentFile = path.join(directory, 'host.json');
        let deployment = await optionalJson<Deployment>(deploymentFile);
        const status = async (): Promise<DatasetDevelopmentStatus> => {
          const connectedDatasetId = this.options.runtime.connectedDataset(appId, id);
          const readiness = connectedDatasetId === id ? await this.options.runtime.readiness(appId, req, id) : { ready: false };
          let applied = false, appliedSchema: AuthoringDatasetSchema | undefined, diagnostic = readiness.diagnostic;
          if (deployment) {
            if (deployment.config.pin.appId !== appId || deployment.config.pin.datasetId !== id) reject('DATASET_DEPLOYMENT_OWNER_INVALID');
            try { appliedSchema = (await inspectDevelopmentDataset(deployment.config)).schema; applied = true; } catch { diagnostic = 'DATASET_APPLIED_VERIFICATION_FAILED'; }
            if (deployment.sourceChecksum !== artifact.checksum) diagnostic = 'DATASET_SOURCE_DIFFERS_FROM_APPLIED_MIGRATION_UNSUPPORTED';
          } else if (await optionalJson(path.join(directory, 'attempt.json'))) diagnostic = 'DATASET_ACTIVATION_INCOMPLETE';
          return { sourceChecksum: artifact.checksum, sourceValid: artifact.validation.valid,
            validated: this.validated.get(`${appId}:${id}`) === artifact.checksum,
            ...(deployment ? { publication: deployment.config.pin.publication } : {}),
            applied, appliedSchema, connectedDatasetId, connectedDatasetIds: this.options.runtime.connectedDatasets(appId),
            connection: readiness.ready ? 'ready' : connectedDatasetId === id ? 'failed' : 'disconnected',
            ...(diagnostic ? { diagnostic } : {}), capabilities: datasetSchemaCapabilities };
        };
        if (action === 'status' && !mutation) { const value = await status(); await assertSource(); send(200, value); return true; }
        if (!mutation || !['validate', 'apply', 'connect', 'assignment'].includes(action)) reject('DATASET_REQUEST_INVALID', 400);
        if (!artifact.validation.valid) reject('DATASET_SOURCE_INVALID', 422);
        const schema = JSON.parse(artifact.files.find(f => f.role === 'definition')!.content) as AuthoringDatasetSchema;
        if (schema.dataset.id !== id) reject('DATASET_ID_MISMATCH', 422);
        const assignmentFile = path.join(directory, 'assignment.json');
        if (action === 'assignment') {
          if (deployment || await optionalJson(path.join(directory, 'attempt.json'))) reject('ASSIGNMENT_CONFIGURATION_ALREADY_APPLIED');
          if (schema.fields.length !== 3 || !schema.fields.some(f => f.key === 'id' && f.type === 'id' && f.required) ||
              !schema.fields.some(f => f.key === 'revision' && f.type === 'string' && f.required && f.default === undefined) ||
              !schema.fields.some(f => f.key === 'patrolId' && f.type === 'string' && !f.required && f.default === undefined)) reject('ASSIGNMENT_SCHEMA_INVALID');
          const ownerDatasetId = String(input.ownerDatasetId ?? ''), targetDatasetId = String(input.targetDatasetId ?? ''), targetActiveField = String(input.targetActiveField ?? '');
          if (!identifier(ownerDatasetId) || !identifier(targetDatasetId) || ownerDatasetId === targetDatasetId || [ownerDatasetId, targetDatasetId].includes(id) || !/^[A-Za-z][\w]*$/.test(targetActiveField)) reject('ASSIGNMENT_REFERENCES_INVALID');
          for (const targetId of [ownerDatasetId, targetDatasetId]) {
            const target: Deployment | undefined = await optionalJson<Deployment>(path.join(this.options.root, appId, targetId, 'host.json'));
            if (!target || target.config.pin.appId !== appId || target.config.pin.datasetId !== targetId) reject('ASSIGNMENT_REFERENCE_NOT_APPLIED');
            const applied = await inspectDevelopmentDataset(target.config);
            if (!applied.schema.fields.some(f => f.key === 'id' && f.type === 'id') || targetId === targetDatasetId && !applied.schema.fields.some(f => f.key === targetActiveField && f.type === 'boolean')) reject('ASSIGNMENT_REFERENCES_INVALID');
          }
          await admit(); await assertSource(); await mkdir(directory, { recursive: true });
          await atomicJson(assignmentFile, { sourceChecksum: artifact.checksum, references: { ownerDatasetId, targetDatasetId, targetActiveField } });
          send(200, await status()); return true;
        }
        const assignment = await optionalJson<{ sourceChecksum: string; references: AssignmentReferences }>(assignmentFile);
        if (assignment && assignment.sourceChecksum !== artifact.checksum || deployment && JSON.stringify(deployment.config.assignment) !== JSON.stringify(assignment?.references)) reject('ASSIGNMENT_CONFIGURATION_CHANGED');
        const registration = await prepareDevelopmentDataset(appId, schema);
        await assertSource(); this.validated.set(`${appId}:${id}`, artifact.checksum);
        if (action === 'validate') { const value = await status(); await assertSource(); send(200, value); return true; }
        if (input.confirmed !== true) reject('DATASET_EXPLICIT_CONFIRMATION_REQUIRED', 400);
        if (deployment && deployment.sourceChecksum !== artifact.checksum) reject('DATASET_MIGRATION_UNSUPPORTED');
        const connectionFile = path.join(this.options.root, appId, 'connection.json');
        const persisted = await optionalJson<unknown>(connectionFile);
        // Legacy selection is connection metadata only; never republish or move its Dataset domain.
        const datasetIds = connectionDatasetIds(persisted);
        const hostKey = JSON.stringify([appId, id]);
        if (action === 'apply' && !deployment) {
          await mkdir(directory, { recursive: true });
          // Exclusive durable intent survives interrupted application. Never reseed an incomplete domain.
          await writeFile(path.join(directory, 'attempt.json'), JSON.stringify({ datasetId: id, applicationId: appId, sourceChecksum: artifact.checksum, phase: 'applying' }), { flag: 'wx' });
          const applied = await bootstrapDevelopmentDataset({ owner: { applicationIdForKey: k => this.options.registry.byKey(k)?.applicationId,
            isCurrentOwner: a => !!this.options.registry.provisioning.resolve(a) }, authorityId: V1_AUTHORITY_ID, systemResourceId: 'platform', applicationKey: key,
            root: path.join(directory, 'domain'), schema, registration, assertAuthority: assertSource });
          deployment = { sourceChecksum: artifact.checksum, config: { pin: applied.pin, paths: { ...applied.paths, policyStore: this.options.policyStore }, serving: applied.serving,
            registration: applied.registration, ...(assignment ? { assignment: assignment.references } : {}), port: 0, identity: { enabled: true, token: randomBytes(32).toString('hex'), allowLegacyToken: false,
              trustedUiServerKey: randomBytes(32).toString('hex'), applicationId: appId, authorityId: V1_AUTHORITY_ID, userId: this.options.identity.currentUser(req)! },
            permissions: { operation: { read: 'dataset.read', create: 'dataset.create', update: 'dataset.update', delete: 'dataset.delete' }, field: { read: 'dataset.read', write: 'dataset.write', filter: 'dataset.read', sort: 'dataset.read' } },
            automation: { services: ['reference.notification'], workflowsRoot: path.join(platformRoot, 'workflows'), triggersRoot: path.join(platformRoot, 'triggers') }, management: { registryFile: this.options.registryFile, applicationsRoot: this.options.applicationsRoot } } };
          await assertSource(); await atomicJson(deploymentFile, deployment);
          // Apply and Connect are deliberately distinct operations.
          const value = await status(); await assertSource(); send(200, { ...value, activation: applied.activation }); return true;
        }
        if (action === 'apply') { const value = await status(); await assertSource(); send(200, value); return true; }
        if (!deployment) reject('DATASET_APPLY_REQUIRED');
        if (!this.hosts.has(hostKey)) {
          const restored = await bootstrapDevelopmentDataset({ owner: { applicationIdForKey: k => this.options.registry.byKey(k)?.applicationId,
            isCurrentOwner: a => !!this.options.registry.provisioning.resolve(a) }, authorityId: V1_AUTHORITY_ID, systemResourceId: 'platform', applicationKey: key,
            root: path.join(directory, 'domain'), schema, registration: deployment.config.registration, restartPin: deployment.config.pin, assertAuthority: assertSource });
          deployment.config.serving = restored.serving; await atomicJson(deploymentFile, deployment);
          await assertSource();
          const host = createBuilderDevelopmentHost(deployment.config, (appId, query, trusted) => this.options.runtime.assignmentReferenceRead(appId, query, trusted)), server = createServer(host.handler);
          try {
            await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
            await assertSource();
            const hostUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
            this.options.runtime.connectManaged({ applicationId: appId, key, hostUrl, policyStore: this.options.policyStore,
              datasetId: id, trustedUiServerKey: deployment.config.identity.trustedUiServerKey!, workflowIds: deployment.config.workflows?.ids ?? [] });
            const ready = await this.options.runtime.readiness(appId, req, id);
            if (!ready.ready) reject(ready.diagnostic ?? 'DATASET_CONNECTION_FAILED');
            this.hosts.set(hostKey, { applicationId: appId, datasetId: id, host, server });
            await assertSource();
            await atomicJson(connectionFile, { version: 1, datasetIds: [...new Set([...datasetIds, id])] });
          } catch (error) {
            this.options.runtime.disconnectManaged(appId, id); this.hosts.delete(hostKey); server.close(); host.close(); throw error;
          }
        }
        const value = await status(); await assertSource(); send(200, value); return true;
      });
    } catch (error) {
      const failure = error as { status?: number; code?: string; message?: string };
      send(failure.status ?? (failure.message?.startsWith('V1_') ? 403 : 409), { code: failure.code ?? failure.message ?? 'DATASET_OPERATION_FAILED', error: failure.message,
        recovery: 'Source and permanent identities are retained. Incomplete activation requires the existing Data Services recovery procedure; no automatic retry or rollback is claimed.' });
      return true;
    }
  }
}
