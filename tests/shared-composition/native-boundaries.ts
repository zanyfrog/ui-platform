import path from 'node:path';
export const platformRoot=process.env.NATIVE_COMPOSITION_TEST_ROOT!;
export const appsDir=path.join(platformRoot,'apps');
export const uiBasePackagesDir=path.join(platformRoot,'unused-ui-base');
export const runtimeDir=path.join(platformRoot,'runtime');
export const templatesDir=path.join(platformRoot,'templates');
export const modularRoot=platformRoot;
export function appPath(key:string){if(key!=='fixture')throw Error('Unadmitted fixture Application');return path.join(appsDir,key);}
export function moveToOsTrash(){throw Error('Unadmitted deletion');}
