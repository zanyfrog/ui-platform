import assert from 'node:assert/strict';import path from 'node:path';import type {ArtifactBundle,PackageComponent} from '../../packages/visual-artifacts/src/model.js';
let root='UNCONFIGURED';export let platformComponentsRoot='UNCONFIGURED';export const calls:any[]=[];let state:{pages:ArtifactBundle[];shells:ArtifactBundle[];components:ArtifactBundle[];packages:PackageComponent[]};
export function configureFixture(nextRoot:string,next:typeof state){root=nextRoot;platformComponentsRoot=path.join(root,'components');state=next;calls.length=0;}
export function appPath(key:string){assert.equal(key,'fixture');return path.join(root,'application');}
function readOptions(options:any){assert.equal(options?.recovery,'refuse','Fixture reads must explicitly refuse recovery');calls.push({read:true,recovery:options.recovery});}
export class VisualArtifactService{constructor(readonly root:string,readonly kind:string){}async list(options:any){readOptions(options);return structuredClone(this.kind==='page'?state.pages:this.kind==='shell'?state.shells:state.components);}async read(locator:string,options:any){return(await this.list(options)).find(b=>b.locator===locator)!;}}
export const toRuntime=(b:ArtifactBundle)=>b.metadata?{metadata:b.metadata,source:b.files.source,css:b.files.css}:undefined;
export async function visualWorkspace(_key:string,_packages:any,options:any={recovery:'refuse'}){readOptions(options);return structuredClone(state);}
export async function discoverComponents(){return structuredClone(state.packages);}
export async function withRuntimeGraphRead(_root:string,work:()=>Promise<unknown>,options:any){readOptions(options);return work();}
export function assertIsolatedPreviewFunctions(code:string){assert.equal(code.trim(),'export {};');}
export function compileVisualFunctions(code:string){assertIsolatedPreviewFunctions(code);return code;}
export async function validateRuntimeFunctionSource(code:string){assertIsolatedPreviewFunctions(code);}
export async function withApplicationMutation(){throw Error('UNADMITTED_MUTATION');}
export async function knownVisualArtifacts(){throw Error('UNADMITTED_GLOBAL_DISCOVERY');}
