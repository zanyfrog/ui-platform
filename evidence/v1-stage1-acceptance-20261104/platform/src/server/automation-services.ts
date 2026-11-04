import { createHash } from 'node:crypto';
import { notificationContract, notificationServiceId, type ApprovedServiceCatalogEntry } from '../shared/automation-service-contract.js';
import type { RegisteredAutomationService } from './automation-runtime.js';

export const notificationDigest = createHash('sha256').update(JSON.stringify(notificationContract)).digest('hex');
/** The existing reference implementation, with a sink owned by one host only. */
export function referenceNotification(sink: unknown[]): RegisteredAutomationService {
  return Object.freeze({ transactional: false, contract: Object.freeze({ ...notificationContract, digest: notificationDigest }),
    async invoke(input: unknown) { sink.push(structuredClone(input)); return { delivered: true }; } });
}
export function approvedNotification(service: RegisteredAutomationService | undefined): boolean {
  return !!service && service.transactional === false && service.contract?.id === notificationServiceId && service.contract.version === 1 &&
    service.contract.digest === notificationDigest && JSON.stringify(service.contract) === JSON.stringify({ ...notificationContract, digest: notificationDigest });
}
export function notificationCatalog(): ApprovedServiceCatalogEntry {
  return structuredClone({ id: notificationServiceId, version: 1, digest: notificationDigest, permissionId: notificationContract.permissionId,
    transactional: false, selection: 'approved', input: notificationContract.input });
}
