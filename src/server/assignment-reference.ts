import type { ProtectedRead, TrustedDatasetExecution } from '@ui-platform/dataset-operations';
export interface AssignmentReferences { ownerDatasetId: string; targetDatasetId: string; targetActiveField: string }
export type AssignmentReferenceRead = (applicationId: string, query: ProtectedRead, trusted: TrustedDatasetExecution) => Promise<Record<string, unknown>[]>;
/** Mandatory host-owned checks. Names are display data; references remain record IDs. */
export function assignmentReferenceValidator(config: AssignmentReferences, read: AssignmentReferenceRead) {
  return async (row: Record<string, unknown>, _operation: string, trusted: TrustedDatasetExecution) => {
    const owner = await read(trusted.applicationId, { datasetId: config.ownerDatasetId, select: ['id'], where: { field: 'id', op: 'eq', value: row.id }, limit: 2 }, trusted);
    if (owner.length !== 1 || owner[0].id !== row.id) throw new Error('ASSIGNMENT_OWNER_MISSING_OR_DENIED');
    if (_operation === 'delete' || row.patrolId === undefined || row.patrolId === null || row.patrolId === '') return;
    if (typeof row.patrolId !== 'string') throw new Error('ASSIGNMENT_TARGET_INVALID');
    const targets = await read(trusted.applicationId, { datasetId: config.targetDatasetId, select: ['id', config.targetActiveField], where: { field: 'id', op: 'eq', value: row.patrolId }, limit: 2 }, trusted);
    if (targets.length !== 1 || targets[0].id !== row.patrolId) throw new Error('ASSIGNMENT_TARGET_MISSING_OR_DENIED');
    if (targets[0][config.targetActiveField] !== true) throw new Error('ASSIGNMENT_TARGET_INACTIVE_OR_DENIED');
  };
}
