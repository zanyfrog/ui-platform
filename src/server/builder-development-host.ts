import path from 'node:path';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';
import { AutomationStore } from './automation-store.js';
import { AutomationRuntime } from './automation-runtime.js';
import { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY } from './v1-development-policy.js';
import { readFileSync } from 'node:fs';
import { configureProtectedForms } from './form-contract.js';
import { discoverComponents } from './component-registry.js';

export interface BuilderDevelopmentHostConfig extends SecuredDevelopmentHostConfig {
  automation: { workflowsRoot: string; triggersRoot: string };
  management: { registryFile: string; applicationsRoot: string };
}
/** Approved local host assembly. Workflow code and service implementations remain
 * host-owned; this V1 catalog supports inherited protected Dataset actions only. */
export function createBuilderDevelopmentHost(config: BuilderDevelopmentHostConfig) {
  if (process.env.NODE_ENV !== 'development' || config.workflows && (!config.workflows.ids.length || !config.workflows.permissionId) ||
      !config.identity.trustedUiServerKey || config.identity.allowLegacyToken !== false ||
      !path.isAbsolute(config.automation.workflowsRoot) || !path.isAbsolute(config.automation.triggersRoot)) throw new Error('BUILDER_HOST_CONFIG_INVALID');
  const runtime = new AutomationRuntime(new AutomationStore(config.automation.triggersRoot, 'trigger'),
    new AutomationStore(config.automation.workflowsRoot, 'workflow'), new Map());
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
          definition.actions.some(a => a.type !== 'crud' || a.datasetId !== config.pin.datasetId)) throw new Error('APPROVED_WORKFLOW_UNAVAILABLE');
    }
  };
  const host = createSecuredDevelopmentHost({ ...config, systemResourceId: 'platform' }, 'development', ({ engine, triggers, resolveDataset }) => {
    configureProtectedForms(engine, async applicationId => { const key = registry.byApplicationId(applicationId)?.key ?? (applicationId === V1_FIXTURE_APPLICATION_ID && fixtureValid() ? V1_FIXTURE_APPLICATION_KEY : undefined); if (!key) throw new Error('FORM_OWNER_UNAVAILABLE'); return discoverComponents(key); });
    runtime.connect(triggers, resolveDataset, { appId: config.pin.appId, datasetId: config.pin.datasetId });
    return { assertReady, workflow: async (input, trusted) => {
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
    if (['page', 'form', 'workflow', 'artifact', 'security-definition'].includes(ref.kind) && ref.parentId === applicationId) return { ref, parent: app, status: 'active' };
    return undefined;
  } });
  return { ...host, close() { host.close(); registry.close(); }, runtime };
}
