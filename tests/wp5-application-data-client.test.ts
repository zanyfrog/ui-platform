import { describe, expect, it, vi } from 'vitest';
import { ApplicationDataClient, createHttpApplicationDataTransport } from '@uib/platform-core/application-data';
import { bindDatasetForm } from '@uib/platform-core/dataset-form';

describe('shared application Dataset client', () => {
  it('uses one transport for Page reads and all explicit Dataset writes', async () => {
    const send = vi.fn(async () => ({ success: true }));
    const client = new ApplicationDataClient({ send });
    await client.read('dataset-a', { select: ['name'] });
    await client.count('dataset-a');
    await client.exists('dataset-a');
    await client.create('dataset-a', [{ id: 'a' }]);
    await client.update('dataset-a', [{ id: 'a', name: 'B' }]);
    await client.delete('dataset-a', [{ id: 'a' }]);
    expect(send.mock.calls.map(call => call[0])).toEqual(['queries', 'queries', 'queries', 'operations', 'operations', 'operations']);
    expect(send.mock.calls.map(call => call[1])).toEqual([
      { datasetId: 'dataset-a', select: ['name'], mode: 'read' },
      { datasetId: 'dataset-a', mode: 'count' }, { datasetId: 'dataset-a', mode: 'exists' },
      { datasetId: 'dataset-a', operation: 'insert', records: [{ id: 'a' }] },
      { datasetId: 'dataset-a', operation: 'update', records: [{ id: 'a', name: 'B' }] },
      { datasetId: 'dataset-a', operation: 'delete', records: [{ id: 'a' }] },
    ]);
  });

  it('preserves hidden submitted values and treats Form validation separately', async () => {
    const send = vi.fn(async () => ({ success: false, committed: false }));
    const form = new EventTarget();
    const client = new ApplicationDataClient({ send });
    const result = new Promise<unknown>(resolve => bindDatasetForm(form, client, { datasetId: 'dataset-a', operation: 'update', onResult: resolve }));
    const values = { id: 'a', secret: 'hidden-but-submitted' };
    form.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true, values } }));
    expect(await result).toEqual({ success: false, committed: false });
    expect(send).toHaveBeenCalledWith('operations', { datasetId: 'dataset-a', operation: 'update', records: [values] });
    values.secret = 'changed-after-dispatch';
    expect(send.mock.calls[0][1]).toMatchObject({ records: [{ secret: 'hidden-but-submitted' }] });
    form.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: false, values } }));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('sends only Dataset intent and a supplied credential over HTTP', async () => {
    const fetcher = vi.fn(async (_url: unknown, _init: unknown) => new Response(JSON.stringify([{ name: 'A' }]), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new ApplicationDataClient(createHttpApplicationDataTransport({ endpoint: 'http://localhost:4090/api/application-data', credential: () => 'development-token', fetch: fetcher as typeof fetch }));
    expect(await client.read('dataset-a', { select: ['name'] })).toEqual([{ name: 'A' }]);
    expect(fetcher.mock.calls[0][0]).toBe('http://localhost:4090/api/application-data/queries');
    const request = fetcher.mock.calls[0][1] as RequestInit;
    expect(request.headers).toMatchObject({ authorization: 'Bearer development-token' });
    expect(JSON.parse(String(request.body))).toEqual({ datasetId: 'dataset-a', select: ['name'], mode: 'read' });
  });
});
