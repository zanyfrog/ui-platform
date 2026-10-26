import { context } from '../saved-card-selection/fixtures.js';
let session={revision:context.sessionRevision,principal:{subjectId:context.subjectId}},epoch=0;
const listeners=new Set<()=>void>();
export const sessionCalls:string[]=[];
export function editorSessionSnapshot(){return structuredClone(session);}
export function subscribeEditorSession(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
export function changeSession(subject=false){session={revision:'changed-session',principal:{subjectId:subject?'changed-subject':context.subjectId}};epoch++;for(const fn of [...listeners])fn();}
export function sessionObserverCount(){return listeners.size;}
export function createEditorSessionBinding(){let revoked=false;const captured=epoch;const assert=()=>{if(revoked||captured!==epoch)throw Error('MEMORY_SESSION_CHANGED');};return{assert,revoke(){revoked=true;},async headers(){assert();sessionCalls.push('headers');return{'x-editor-revision':session.revision,'x-editor-csrf':'authored-not-a-credential'};}};}
