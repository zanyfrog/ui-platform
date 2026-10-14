import type { ProtectedRead, ProtectedWrite } from '@ui-platform/dataset-operations';

export type ApplicationDataPath = 'queries' | 'operations';
export interface ApplicationDataTransport {
  send(path: ApplicationDataPath, intent: ProtectedRead | ProtectedWrite): Promise<unknown>;
}
export interface ApplicationDataHttpOptions {
  endpoint?: string;
  credential: () => string | undefined | Promise<string | undefined>;
  fetch?: typeof globalThis.fetch;
}

/** Transport only. The protected host establishes identity and DOE enforces Dataset access. */
export function createHttpApplicationDataTransport(options: ApplicationDataHttpOptions): ApplicationDataTransport {
  const endpoint = (options.endpoint ?? '/api/application-data').replace(/\/$/, '');
  const request = options.fetch ?? globalThis.fetch;
  return {
    async send(path, intent) {
      const credential = await options.credential();
      const response = await request(`${endpoint}/${path}`, { method: 'POST',
        headers: { 'content-type': 'application/json', ...(credential ? { authorization: `Bearer ${credential}` } : {}) },
        body: JSON.stringify(intent) });
      if (response.status === 401) throw new Error('Sign in before submitting. Your session may have expired.');
      if (response.status >= 500) throw new Error('The data service is unavailable or took too long to respond. The save outcome is unknown; check the saved records before submitting again.');
      if (!response.ok) throw new Error('APPLICATION_DATA_REQUEST_DENIED');
      const value: unknown = await response.json();
      return value;
    },
  };
}

/** V1 browser-session transport. The trusted UI server supplies the DOE actor; browser code sends no bearer. */
export function createSessionApplicationDataTransport(options: Omit<ApplicationDataHttpOptions, 'credential'> = {}): ApplicationDataTransport {
  return createHttpApplicationDataTransport({ ...options, credential: () => undefined });
}

/** Shared Page/Form/Component Dataset operation path; no Form-specific persistence semantics. */
export class ApplicationDataClient {
  constructor(private readonly transport: ApplicationDataTransport) {}
  query(intent: ProtectedRead): Promise<unknown> { return this.transport.send('queries', intent); }
  execute(intent: ProtectedWrite): Promise<unknown> { return this.transport.send('operations', intent); }
  read(datasetId: string, options: Omit<ProtectedRead, 'datasetId' | 'mode'> = {}) { return this.query({ datasetId, ...options, mode: 'read' }); }
  count(datasetId: string, where?: ProtectedRead['where']) { return this.query({ datasetId, ...(where ? { where } : {}), mode: 'count' }); }
  exists(datasetId: string, where?: ProtectedRead['where']) { return this.query({ datasetId, ...(where ? { where } : {}), mode: 'exists' }); }
  create(datasetId: string, records: ProtectedWrite['records']) { return this.execute({ datasetId, operation: 'insert', records }); }
  update(datasetId: string, records: ProtectedWrite['records']) { return this.execute({ datasetId, operation: 'update', records }); }
  delete(datasetId: string, records: ProtectedWrite['records']) { return this.execute({ datasetId, operation: 'delete', records }); }
}

/** Named Visual Artifact adapters reuse the existing Page/Form session transport. */
export function createApplicationDataServices(client = new ApplicationDataClient(createSessionApplicationDataTransport()), options: { endpoint?: string } = {}): Record<string, (input: unknown) => Promise<unknown>> {
  return {
    'dataset.write': input => client.execute(input as ProtectedWrite),
    'dataset.read': input => client.query({ ...(input as ProtectedRead), mode: 'read' }),
    'workflow.run': async input => {
      const response = await fetch(`${(options.endpoint ?? '/api/application-data').replace(/\/$/, '')}/workflows`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      if (response.status === 401) throw new Error('Sign in before running the Workflow. Your session may have expired.');
      if (response.status >= 500) throw new Error('The activation service is unavailable or took too long to respond. Check the person’s status before running activation again.');
      if (!response.ok) throw new Error('WORKFLOW_REQUEST_DENIED');
      const result: unknown = await response.json();
      return result;
    },
  };
}
