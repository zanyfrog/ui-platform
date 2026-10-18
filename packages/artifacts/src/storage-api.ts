export { atomicWriteText, retryWindowsFileOperation } from './file-operations.js';
export { readRoleBundle, saveRoleBundle, recoverRoleBundleRoot, withRoleBundleGraph, RoleBundleRecoveryRequiredError } from './role-bundle.js';
export type { RoleBundleLocation, RoleBundleSave, RoleBundleSnapshot } from './role-bundle.js';
export { withArtifactLock } from './storage.js';
