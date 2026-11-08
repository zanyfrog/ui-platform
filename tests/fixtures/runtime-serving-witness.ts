import { get } from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { digest } from '../../src/server/production/boundary.js';

export function readRuntimeWitness(input: {
  endpoint: string; ca: string; pin: string; signal: AbortSignal;
  releaseId: string; manifest: string; bundleHash: string; bundleLength: number;
}) {
  return new Promise<{ releaseId: string; manifest: string }>((resolve, reject) => {
    const request = get(new URL('/application.js', input.endpoint), {
      ca: input.ca, signal: input.signal, agent: false,
      checkServerIdentity(host, certificate) {
        const hostnameError = checkServerIdentity(host, certificate);
        if (hostnameError) return hostnameError;
        if (certificate.fingerprint256 !== input.pin) return Error('RUNTIME_PEER_MISMATCH');
      },
    }, response => {
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('error', reject);
      response.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > input.bundleLength) response.destroy(Error('RUNTIME_BUNDLE_LENGTH_MISMATCH'));
        else chunks.push(chunk);
      });
      response.on('end', () => {
        const releaseId = response.headers['x-ui-release'], manifest = response.headers['x-ui-manifest-fingerprint'];
        if (response.statusCode !== 200 || releaseId !== input.releaseId || manifest !== input.manifest ||
            length !== input.bundleLength || digest(Buffer.concat(chunks)) !== input.bundleHash) reject(Error('RUNTIME_RELEASE_OBSERVATION_MISMATCH'));
        else resolve({ releaseId, manifest });
      });
    });
    request.on('error', reject);
  });
}
