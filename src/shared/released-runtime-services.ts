import type { ArtifactMetadata, Action } from '@ui-platform/visual-artifacts';

/** Browser transport over existing Form/service signatures. Server resolves every locator from the admitted release. */
export function releasedRuntimeServices(options: { releaseId: string; metadata: ArtifactMetadata; request?: typeof fetch }) {
  const request = options.request ?? fetch, m = options.metadata;
  const actions: Array<{ locator: string; action: Action }> = [
    ...(m.onLoad ?? []).map((action, i) => ({ locator: `onLoad:${i}`, action })),
    ...(m.events ?? []).flatMap((event, e) => event.actions.map((action, i) => ({ locator: `event:${e}:${i}`, action }))),
  ];
  const denied = (): never => { throw Object.assign(new Error('APPLICATION_DATA_REQUEST_DENIED'), { code: 'APPLICATION_DATA_REQUEST_DENIED', commitOutcome: 'not-committed' }); };
  async function send(contract: string, values: unknown) {
    const session = await request('/auth/session', { credentials: 'same-origin', cache: 'no-store' }); if (!session.ok) return denied();
    const { csrf } = await session.json();
    // Never automatically repeat a write after a timeout, logout, or session change.
    const response = await request('/runtime/execute', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', 'x-uib-csrf': csrf },
      body: JSON.stringify({ releaseId: options.releaseId, artifactId: m.artifactId, contract, values }) });
    if (!response.ok) { if (response.status >= 500) throw new Error('The operation outcome is unknown. Read the saved records before retrying.'); return denied(); }
    return response.json();
  }
  return {
    'dataset.write': async (input: any) => {
      if (!m.form || input?.datasetId !== m.form.datasetId || !['insert', 'update'].includes(input.operation) || !Array.isArray(input.records) || input.records.length !== 1) return denied();
      return send('form', { operation: input.operation === 'insert' ? 'create' : 'edit', record: input.records[0] });
    },
    'dataset.read': async (input: any) => {
      if (m.form && input?.datasetId === m.form.datasetId && input.where?.field === m.form.primaryKey && input.where.op === 'eq') return send('form-read', { recordId: input.where.value });
      const matches = actions.filter(({ action }) => {
        if (action.kind !== 'service' || action.reference !== 'dataset.read' || !action.input || typeof action.input !== 'object' || !('literal' in action.input)) return false;
        const query = structuredClone(action.input.literal) as Record<string, unknown>;
        if (action.filter) { if (input?.where?.field !== action.filter.field || input.where.op !== 'eq') return false; query.where = input.where; }
        return JSON.stringify(query) === JSON.stringify(input);
      });
      if (!matches.length) return denied(); const match = matches[0]!, action = match.action;
      return send(match.locator, action.kind === 'service' && action.filter ? { filter: input.where.value } : {});
    },
    'dataset.deleteRecord': async (input: any) => {
      const match = actions.find(({ action }) => action.kind === 'record-delete' && action.version === input?.version && action.datasetId === input.datasetId && action.primaryFieldId === input.primaryFieldId);
      if (!match) return denied(); return send(match.locator, { recordId: input.recordId });
    },
  };
}
