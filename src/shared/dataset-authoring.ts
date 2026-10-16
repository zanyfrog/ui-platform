/** The existing Dataset artifact contract, shared by source controls and service adapters. */
export type { DatasetSchema as AuthoringDatasetSchema } from '@ui-platform/artifacts';
export interface DatasetDevelopmentStatus {
  sourceChecksum: string; sourceValid: boolean; validated: boolean;
  publication?: { version: number; checksum: string };
  applied: boolean; connectedDatasetId?: string;
  appliedSchema?: import('@ui-platform/artifacts').DatasetSchema;
  connection: 'disconnected' | 'connecting' | 'ready' | 'unsupported' | 'failed';
  diagnostic?: string;
  capabilities: { fieldTypes: readonly string[]; relationships: boolean; labels: boolean; validationRules: readonly string[] };
}
