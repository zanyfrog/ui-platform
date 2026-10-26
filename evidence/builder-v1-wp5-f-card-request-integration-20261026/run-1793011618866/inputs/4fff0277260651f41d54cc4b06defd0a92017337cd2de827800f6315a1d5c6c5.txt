export const unexpected:string[]=[];
const forbidden=(name:string):never=>{unexpected.push(name);throw Error('UNADMITTED_BRANCH '+name);};
export class EditorRuntimeContext {constructor(..._args:unknown[]){forbidden('EditorRuntimeContext');}}
export const mountEditorShell=(..._args:unknown[])=>forbidden('mountEditorShell');
export const mountCompositionManager=(..._args:unknown[])=>forbidden('mountCompositionManager');
export const mountAutomationEditor=(..._args:unknown[])=>forbidden('mountAutomationEditor');
export const createVisualFormTransport=(..._args:unknown[])=>forbidden('createVisualFormTransport');
export const bindFormEditor=(..._args:unknown[])=>forbidden('bindFormEditor');
let allowed:unknown;
export const boundaryCalls:unknown[]=[];
export function permitWorkspace(value:unknown){allowed=structuredClone(value);}
export async function authorizeWorkspace(key:string,target:unknown){if(!allowed)return forbidden('default authorizeWorkspace');boundaryCalls.push({key,target});const result=allowed;allowed=undefined;return structuredClone(result);}
