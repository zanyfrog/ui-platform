import * as fs from 'node:fs/promises';import path from 'node:path';
import {VisualArtifactService} from '../../src/server/visual-artifacts.js';
import {validateArtifact} from '../../packages/visual-artifacts/src/validation.js';
import {withRoleBundleGraph} from '../../packages/artifacts/src/role-bundle.js';
import {configure,events,inject} from '../d6-r1/fs-guard.js';
export async function fixture(){
 const parent=path.resolve(process.cwd(),'evidence/v1-html-first-20261026/disposable');await fs.mkdir(parent,{recursive:true});const root=await fs.mkdtemp(path.join(parent,'page-'));configure(root);
 const manifest=JSON.parse(await fs.readFile(path.resolve(process.cwd(),'tests/d6-p2/bytes/40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469.txt'),'utf8'));
 const card=manifest.components.find((c:any)=>c.identity?.name==='card');
 const panel=manifest.components.find((c:any)=>c.tagName==='uib-panel');
 const packages=[{id:card.identity.componentId,tagName:'uib-card',name:'Card',definition:card,packageName:'@ui-base/ui',packageVersion:'0.5.1'}, {...panel,id:'@ui-base/ui:uib-panel',name:'Panel',packageName:'@ui-base/ui',packageVersion:'0.5.1'}];
 const directory=path.join(root,'page');await fs.mkdir(directory);
 const files={source:'<!-- authored fixture Page -->\n',css:'',metadata:JSON.stringify({schemaVersion:1,artifactId:'art_html_first',kind:'page',name:'fixture',displayName:'Fixture',route:'/fixture'}),fixtures:'{}',code:'export {};\n'};
 const roles={source:'.html',css:'.css',metadata:'.visual.json',fixtures:'.fixtures.json',code:'.functions.ts'};
 for(const[k,extension]of Object.entries(roles))await fs.writeFile(path.join(directory,'page'+extension),files[k as keyof typeof files]);
 const service=new VisualArtifactService(root,'page'),locator='page/page.visual.json',calls:any[]=[];
 const read=()=>service.read(locator,{recovery:'refuse'});
 const workspace=async()=>({pages:[await read()],components:[],shells:[],packages});
 const bridge=async(url:string,encoded?:string)=>{
  const init=encoded?JSON.parse(encoded):undefined;calls.push({url,method:init?.method??'GET'});
  if(!url.startsWith('/api/apps/fixture-app/visual-'))throw Error('UNEXPECTED_BACKEND');
  if(init?.method==='PUT'){
   const body=JSON.parse(init.body);
   return JSON.stringify(await withRoleBundleGraph(root,()=>service.saveCandidate(locator,body.files,body.expectedHash,{validate:async bundle=>{const errors=validateArtifact({metadata:bundle.metadata!,source:bundle.files.source,css:bundle.files.css},[],packages).filter(e=>e.severity==='error');if(errors.length)throw Error(errors.map(e=>e.message).join('\n'));},admit:async()=>{calls.push({method:'NONPRODUCTION_OWNER_ADMISSION'});}}),{recovery:'refuse'}));
  }
  if(init?.method)throw Error('UNEXPECTED_MUTATION');
  if(url.endsWith('/visual-artifacts'))return JSON.stringify(await workspace());
  const bundle=await read();
  if(url.includes('preview=1')){
   if(new URL(url,'http://fixture.invalid').searchParams.get('hash')!==bundle.hash)throw Error('SAVED_HASH_CHANGED');
   return JSON.stringify({bundle,components:[],packages,composition:null,shells:[],code:{[bundle.hash]:'export {};'}});
  }
  return JSON.stringify(bundle);
 };
 return{root,service,locator,packages,calls,read,workspace,bridge,async close(){inject();if(!path.resolve(root).startsWith(parent+path.sep+'page-'))throw Error('UNSAFE_TEST_CLEANUP');const trace=[...events];await fs.rm(root,{recursive:true,force:true});return trace;}};
}
