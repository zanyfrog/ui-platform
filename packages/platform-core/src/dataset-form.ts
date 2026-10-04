import { ApplicationDataClient } from './application-data.js';
import type { ProtectedWrite } from '@ui-platform/dataset-operations';

export interface DatasetFormBinding {
  datasetId: string;
  operation: ProtectedWrite['operation'];
  onResult?: (result: unknown) => void;
  onError?: (error: unknown) => void;
}

/** Binds the existing uib-forms-form-submit event to the shared application Dataset client. */
export function bindDatasetForm(form: EventTarget, client: ApplicationDataClient, binding: DatasetFormBinding): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ valid: boolean; values: Record<string, unknown> }>).detail;
    if (!detail || detail.valid !== true || !detail.values || typeof detail.values !== 'object' || Array.isArray(detail.values)) return;
    // Preserve every submitted value, including values of controls that have become hidden.
    const records = [structuredClone(detail.values)];
    void client.execute({ datasetId: binding.datasetId, operation: binding.operation, records })
      .then(result => binding.onResult?.(result), error => binding.onError?.(error));
  };
  form.addEventListener('uib-forms-form-submit', listener);
  return () => form.removeEventListener('uib-forms-form-submit', listener);
}
