/** Test-only tripwires. No application/session/backend/native initialization. */
const denied = (..._args: unknown[]): never => { throw new Error('UNADMITTED_SERVER_OPERATION'); };
export const appPath = denied;
export const moveToOsTrash = denied;
export const platformRoot = 'D6_R1_UNUSABLE_PLATFORM_ROOT';
export const appsDir = 'D6_R1_UNUSABLE_APPS_ROOT';
