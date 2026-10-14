import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { appsDir, runtimeDir } from '../src/server/paths.js';
import { DevelopmentApplicationRegistry } from '../src/server/development-application-registry.js';
import { bootstrapDevelopmentDataset } from '@ui-platform/dataset-operations';
import { V1_AUTHORITY_ID } from '../src/server/v1-development-policy.js';

// Explicit local owner setup; no HTTP entry or security-store writes.
if (process.env.NODE_ENV !== 'development') throw new Error('DATASET_BOOTSTRAP_DEVELOPMENT_ONLY');
const [file, outputFile] = process.argv.slice(2);
if (!file || !outputFile) throw new Error('Provide a reviewed local Dataset bootstrap input and output file.');
const registry = new DevelopmentApplicationRegistry(path.join(runtimeDir, 'development-applications.sqlite'), appsDir);
try {
  const input = JSON.parse(readFileSync(file, 'utf8'));
  const result = await bootstrapDevelopmentDataset({ ...input, authorityId: V1_AUTHORITY_ID, systemResourceId: 'platform', owner: { applicationIdForKey: key => registry.byKey(key)?.applicationId, isCurrentOwner: id => !!registry.provisioning.resolve(id) } });
  writeFileSync(outputFile, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.info(JSON.stringify({ status: 'applied', applicationId: result.pin.appId, datasetId: result.pin.datasetId, outputFile }));
} finally { registry.close(); }
