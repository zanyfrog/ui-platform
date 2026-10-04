import { ApplicationDataClient, createHttpApplicationDataTransport } from '@uib/platform-core/application-data';
import { bindDatasetForm } from '@uib/platform-core/dataset-form';

const client = new ApplicationDataClient(createHttpApplicationDataTransport({ credential: () => undefined }));
const pageRead: Promise<unknown> = client.read('dataset-id', { select: ['name'] });
const form = new EventTarget();
const unbind: () => void = bindDatasetForm(form, client, { datasetId: 'dataset-id', operation: 'insert' });
void [pageRead, unbind];
