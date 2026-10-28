/** Approved fixed callback contract. This is not a user-authored schema language. */
export const notificationServiceId = 'reference.notification';
export const notificationPermission = 'automation.reference.notification.invoke';
export interface NotificationInput { message: string }
const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v));
export function notificationInput(v: unknown): v is NotificationInput {
  return plain(v) && Object.keys(v).join() === 'message' && typeof v.message === 'string' && v.message.length >= 1 && v.message.length <= 2000;
}
export function notificationOutput(v: unknown): v is { delivered: true } { return plain(v) && Object.keys(v).join() === 'delivered' && v.delivered === true; }
export const notificationContract = Object.freeze({ id: notificationServiceId, version: 1 as const, permissionId: notificationPermission,
  transactional: false as const, phases: Object.freeze(['afterCommit', 'workflow'] as const),
  input: Object.freeze({ message: Object.freeze({ type: 'string', minLength: 1, maxLength: 2000 }) }), output: Object.freeze({ delivered: true }), implementation: 'reference.notification.memory.v1' });
export interface ApprovedServiceCatalogEntry { id: string; version: 1; digest: string; permissionId: string; transactional: false; selection: 'approved'; input: typeof notificationContract.input }
export interface AutomationAuthoringCatalog {
  appId: string; datasets: Array<{ id: string; name: string; primaryKey: string; physical: string; fields: Array<{ id: string; key: string; type: string }> }>;
  services: ApprovedServiceCatalogEntry[];
  workflows: Array<{ id: string; displayName: string; datasetId: string }>;
}
