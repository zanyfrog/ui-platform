import path from 'node:path';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';
import { AutomationStore } from './automation-store.js';
import { AutomationRuntime, AutomationAuditLog } from './automation-runtime.js';
import { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY } from './v1-development-policy.js';
import { referenceNotification, approvedNotification, notificationCatalog } from './automation-services.js';
import { notificationServiceId, notificationPermission } from '../shared/automation-service-contract.js';
import { readFileSync } from 'node:fs';
import { configureProtectedForms } from './form-contract.js';
import { discoverComponents } from './component-registry.js';

export interface BuilderDevelopmentHostConfig extends SecuredDevelopmentHostConfig {
  automation: { workflowsRoot: string; triggersRoot: string; services?: string[] };
  management: { registryFile: string; applicationsRoot: string };
}
/** Approved local host assembly. Workflow code and service implementations remain
 * host-owned; this V1 catalog supports inherited protected Dataset actions and the approved fixed reference effect. */
export function createBuilderDevelopmentHost(config: BuilderDevelopmentHostConfig) {
  config = structuredClone(config);
  if (process.env.NODE_ENV !== 'development' || config.workflows && (!config.workflows.ids.length || !config.workflows.permissionId) ||
      !config.identity.trustedUiServerKey || config.identity.allowLegacyToken !== false ||
      !path.isAbsolute(config.automation.workflowsRoot) || !path.isAbsolute(config.automation.triggersRoot)) throw new Error('BUILDER_HOST_CONFIG_INVALID');
  if (config.automation.services?.some(id => id !== notificationServiceId) || new Set(config.automation.services).size !== (config.automation.services?.length ?? 0)) throw new Error('SERVICE_REGISTRATION_INVALID');
  const notifications: unknown[] = [];
  const services = new Map(config.automation.services?.map(id => [id, referenceNotification(notifications)] as const));
  const runtime = new AutomationRuntime(new AutomationStore(config.automation.triggersRoot, 'trigger'),
    new AutomationStore(config.automation.workflowsRoot, 'workflow'), services, new AutomationAuditLog(), true);
  const registry = new DevelopmentApplicationRegistry(config.management.registryFile, config.management.applicationsRoot);
  const fixtureValid = () => {
    try { return JSON.parse(readFileSync(path.join(config.management.applicationsRoot, V1_FIXTURE_APPLICATION_KEY, 'app.manifest.json'), 'utf8')).appId === V1_FIXTURE_APPLICATION_ID; } catch { return false; }
  };
  const assertReady = async () => {
    const bundles = await runtime.workflows.list();
    for (const id of config.workflows?.ids ?? []) {
      const matches = bundles.filter(b => b.definition?.id === id);
      const definition = matches[0]?.definition;
      if (matches.length !== 1 || matches[0]!.diagnostics.length || !definition?.enabled || definition.appId !== config.pin.appId || definition.datasetId !== config.pin.datasetId ||
          definition.primaryKey !== config.registration.primaryKey || definition.actions.some(a => a.type === 'crud' ? a.datasetId !== config.pin.datasetId : a.type !== 'service' || a.service !== notificationServiceId || !approvedNotification(services.get(a.service)))) throw new Error('APPROVED_WORKFLOW_UNAVAILABLE');
    }
  };
  const host = createSecuredDevelopmentHost({ ...config, systemResourceId: 'platform' }, 'development', ({ engine, triggers, resolveDataset, resolveFields, invokeAuthorized }) => {
    const resource = { authorityId: config.identity.authorityId, applicationId: config.pin.appId, kind: 'artifact' as const, id: notificationServiceId, parentId: config.pin.appId };
    engine.configureServiceInvocation((id, trusted, effect) => {
      const service = services.get(id);
      if (id !== notificationServiceId || !approvedNotification(service)) throw new Error('SERVICE_NOT_REGISTERED');
      return invokeAuthorized(resource, notificationPermission, trusted, () => {
        if (services.get(id) !== service || !approvedNotification(service)) throw new Error('SERVICE_CONTRACT_STALE'); return effect();
      });
    });
    configureProtectedForms(engine, async applicationId => { const key = registry.byApplicationId(applicationId)?.key ?? (applicationId === V1_FIXTURE_APPLICATION_ID && fixtureValid() ? V1_FIXTURE_APPLICATION_KEY : undefined); if (!key) throw new Error('FORM_OWNER_UNAVAILABLE'); return discoverComponents(key); });
    runtime.connect(triggers, resolveDataset, { appId: config.pin.appId, datasetId: config.pin.datasetId, primaryKey: config.registration.primaryKey });
    return { assertReady, catalog: async trusted => {
      const approved = [];
      if (approvedNotification(services.get(notificationServiceId))) {
        try { approved.push(await invokeAuthorized(resource, notificationPermission, trusted, notificationCatalog)); } catch { /* Absence of a grant is not service approval. */ }
      }
      const binding = config.registration; const fields = await resolveFields(config.pin.appId, config.pin.datasetId);
      const datasets = [];
      try { datasets.push(await invokeAuthorized({ ...resource, id: 'datasets' }, 'ui.artifact.view', trusted, () => ({ id: config.pin.datasetId, name: binding.reference.dataset, physical: binding.reference.dataset, primaryKey: binding.primaryKey,
        fields: binding.fields.map(field => ({ id: fields.find(f => f.key === field.name)!.fieldId, key: field.name, type: field.type })) }))); } catch { /* Applied authoring metadata retains the existing Dataset artifact-view permission. */ }
      const workflows = [];
      for (const bundle of await runtime.workflows.list()) {
        const d = bundle.definition;
        if (!d || d.appId !== config.pin.appId || bundle.diagnostics.length || !d.enabled || !config.workflows?.ids.includes(d.id)) continue;
        try { workflows.push(await invokeAuthorized({ ...resource, kind: 'workflow', id: d.id }, config.workflows.permissionId, trusted, () => ({ id: d.id, displayName: d.displayName, datasetId: d.datasetId }))); } catch { /* Workflow authority is separate from service invocation authority. */ }
      }
      return { appId: config.pin.appId, datasets, services: approved,
        workflows };
    }, workflow: async (input, trusted) => {
      if (!config.workflows?.ids.includes(input.workflowId)) throw new Error('APPROVED_WORKFLOW_UNAVAILABLE');
      await assertReady(); return runtime.workflow(input.workflowId, input.primaryRecordId, trusted, engine);
    } };
  }, { revision: async () => `${registry.revision()}:${fixtureValid()}`, resolve: async ref => {
    if (ref.authorityId !== V1_AUTHORITY_ID) return undefined;
    const root = { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' };
    if (ref.kind === 'system' && ref.id === root.id && ref.applicationId === null) return { ref: root, status: 'active' };
    const applicationId = ref.applicationId;
    if (!applicationId || !(registry.provisioning.resolve(applicationId) || applicationId === V1_FIXTURE_APPLICATION_ID && fixtureValid())) return undefined;
    const app = { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId };
    if (ref.kind === 'application' && ref.id === applicationId) return { ref, parent: root, status: 'active' };
    if (ref.kind === 'artifact' && ref.id === notificationServiceId && !approvedNotification(services.get(notificationServiceId))) return undefined;
    if (['page', 'form', 'workflow', 'artifact', 'security-definition'].includes(ref.kind) && ref.parentId === applicationId) return { ref, parent: app, status: 'active' };
    return undefined;
  } });
  return { ...host, close() { host.close(); registry.close(); notifications.length = 0; }, runtime, notifications };
}
