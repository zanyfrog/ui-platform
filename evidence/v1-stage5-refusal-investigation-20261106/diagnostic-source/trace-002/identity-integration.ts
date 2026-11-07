import {trace,step,traced,errorCode,traceId} from './refusal-trace.js';
import type { SecurityDefinitionStore } from '@ui-platform/i-am/definitions';
import { PermanentIdentityDirectory, type IdentityDirectory, type Enrollment } from './enrollment.js';
import type { SecureSessions } from './sessions.js';
import type { InternalActor } from './internal-trust.js';
import { exact } from './boundary.js';
import type { ServiceRpcClient } from './service-rpc.js';

export function iamIdentityDirectory(file: string, policy: SecurityDefinitionStore, operator: (context: unknown) => Promise<string>) {
  return new PermanentIdentityDirectory(file, async userId => {
    const users = policy.snapshot().documents.filter(d => d.definition.kind === 'user' && d.definition.id === userId);
    return users.length === 1 && users[0]!.definition.kind === 'user' && users[0]!.definition.status === 'active';
  }, operator);
}
export function identityOperations(directory: IdentityDirectory) {
  return {
    '/identity/resolve': async (value: unknown) => { exact(value, ['issuer', 'subject', 'applicationId']); return directory.resolve(value.issuer, value.subject, value.applicationId); },
    '/identity/current': async (value: unknown) => { exact(value, ['enrollment']); return { current: await directory.current(value.enrollment) }; },
  };
}
export class RemoteIdentityDirectory implements IdentityDirectory {
  constructor(private readonly rpc: ServiceRpcClient) {}
  async resolve(issuer: string, subject: string, applicationId: string): Promise<Enrollment> { const value = await this.rpc.call('/identity/resolve', { issuer, subject, applicationId }); exact(value, ['issuer', 'subject', 'applicationId', 'userId', 'revision']); if (value.issuer !== issuer || value.subject !== subject || value.applicationId !== applicationId) throw new Error('IDENTITY_AMBIGUOUS'); return value as Enrollment; }
  async current(enrollment: Enrollment) { try { const result = await this.rpc.call('/identity/current', { enrollment }); trace('remote-directory','result',{current:result.current===true});return result.current === true; } catch(error) { trace('identity-rpc','catch',{code:errorCode(error)});return false; } }
}
export function sessionOperations(sessions: SecureSessions) {
  return {
    '/sessions/status': async (value: unknown) => { exact(value, ['actor']); return { active: await sessions.activeInternal(value.actor) }; },
    '/sessions/revoke': async (value: unknown) => { exact(value, ['userId']); sessions.revoke(value.userId); return { revoked: true }; },
  };
}
export function remoteSessionStatus(clients: Map<string, ServiceRpcClient>) {
  return async (actor: InternalActor) => { try { const client = clients.get(actor.enrollment.applicationId); if (!client) return false; const result = await client.call('/sessions/status', { actor }); trace('remote-session','result',{active:result.active===true});return result.active === true; } catch(error) { trace('identity-rpc','catch',{code:errorCode(error)});return false; } };
}
