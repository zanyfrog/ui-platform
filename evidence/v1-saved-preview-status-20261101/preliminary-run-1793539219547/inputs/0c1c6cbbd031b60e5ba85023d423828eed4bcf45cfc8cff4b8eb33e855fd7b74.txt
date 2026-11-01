/** Unused effectful branches are explicit tripwires in the admitted static fixture. */
function denied(..._args:unknown[]):never{throw Error('UNADMITTED_BRANCH');}
export const mountComposedPage=denied;
export const attachFormRuntime=denied;
export const moveToOsTrash=denied;
export const appPath=denied;
export const platformRoot='UNUSABLE_REAL_ROOT';export const appsDir='UNUSABLE_APPS_ROOT';
export const visualDatasetServices={};
export class ApplicationDataClient{constructor(..._args:unknown[]){denied();}}
export const createSessionApplicationDataTransport=denied;
export const createApplicationDataServices=denied;
