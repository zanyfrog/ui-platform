import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SecurityDefinitionService, SecurityDefinitionStore } from '@ui-platform/i-am/definitions';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { runtimeDir } from '../src/server/paths.js';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';

// Explicit trusted local setup command. This module is never imported by the server.
// Local OS access is the deployment's development setup trust boundary, not a browser identity.
if (process.env.NODE_ENV !== 'development') throw new Error('BOOTSTRAP_DEVELOPMENT_ONLY');
const args = process.argv.slice(2);
const value = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const inputFile = value('--input');
const reviewed = inputFile ? JSON.parse(readFileSync(inputFile, 'utf8')) : undefined;
const userId = reviewed?.administratorUserId ?? value('--user');
const reason = reviewed?.reason ?? value('--reason');
const anchors = reviewed?.applicationAnchors ?? (value('--application-anchors') ? JSON.parse(value('--application-anchors')!) : undefined);
const ceiling = reviewed?.grantablePermissionIds ?? (value('--grantable-permissions') ? JSON.parse(value('--grantable-permissions')!) : undefined);
const capabilities = reviewed?.capabilityDefinitions ?? (value('--capability-definitions') ? JSON.parse(value('--capability-definitions')!) : []);
if (!userId || !reason || !Array.isArray(anchors) || !Array.isArray(ceiling)) throw new Error('An explicit existing administrator User, reason, application anchors, and grant ceiling are required. Use --input with a reviewed local JSON file.');
const file = path.resolve(process.env.UI_PLATFORM_V1_POLICY_STORE ?? path.join(runtimeDir, 'iam-v1-development.sqlite'));
if (!existsSync(file)) throw new Error('Existing authoritative V1 policy store required; start V1 development once first.');
const context = Object.freeze({});
const store = new SecurityDefinitionStore(file);
try {
  const result = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(store), {
    async verify(handle) {
      if (handle !== context) throw new Error('BOOTSTRAP_IDENTITY_DENIED');
      return { operatorId: `local:${os.userInfo().username}`, deploymentId: developmentSecurityConfiguration.deploymentId,
        strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
    },
  }, developmentSecurityScopes, developmentSecurityConfiguration, { context, administratorUserId: userId,
    applicationAnchors: anchors, grantablePermissionIds: ceiling, capabilityDefinitions: capabilities, expectedRevision: store.revision(), reason });
  console.info(JSON.stringify({ policyStore: file, ...result }));
  if (result.status !== 'activated') process.exitCode = 1;
} finally { store.close(); }
