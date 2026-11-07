import {mkdir,writeFile} from 'node:fs/promises';
export async function observeBuilderSave(page:any,cleanup:any[]){
 const events:any[]=[];let sequence=0;
 const record=(event:any)=>events.push({sequence:sequence++,hostWall:Date.now(),...event});
 await page.exposeFunction('stage5Observe',(event:any)=>record(event));
 await page.evaluate(()=>{for(const type of ['focusin','beforeinput','input','change','focusout'])document.addEventListener(type,e=>{const t=e.target as HTMLInputElement;if(!t.closest('[aria-label="Generic Artifact Editor"]')||!['Field name','Data type','Required'].includes(t.getAttribute('aria-label')??''))return;(window as any).stage5Observe({stage:'dom',type,label:t.getAttribute('aria-label'),value:t.type==='checkbox'?t.checked:t.value,focusKey:t.dataset.editorFocus,connected:t.isConnected,active:document.activeElement===t,status:t.closest('[aria-label="Generic Artifact Editor"]')?.querySelector('[role="status"]')?.textContent});},true);});
 const fields=(value:any):any=>{if(!value||typeof value!=='object')return undefined;if(Array.isArray(value.fields)&&value.dataset)return value.fields.map((f:any)=>({id:f.id,key:f.key,type:f.type,required:f.required}));if(value.files){const files=Array.isArray(value.files)?value.files.map((f:any)=>f.content):Object.values(value.files);for(const content of files)if(typeof content==='string'){try{const found=fields(JSON.parse(content));if(found)return found;}catch{}}}for(const key of ['artifact','schema','definition']){const found=fields(value[key]);if(found)return found;}return undefined;};
 page.on('request',(req:any)=>{if(req.method()!=='POST'||!req.url().includes('/api/'))return;try{const f=fields(JSON.parse(req.postData()??'{}'));if(f)record({stage:'save-request',fields:f});}catch{}});
 page.on('response',async(res:any)=>{if(!res.url().includes('/api/'))return;try{const f=fields(await res.json());if(f)record({stage:'response-definition',status:res.status(),fields:f});}catch{}});
 cleanup.push(async()=>{await mkdir('diagnostics',{recursive:true});await writeFile('diagnostics/builder-save-observations.json',JSON.stringify({events},null,2));});
 return async(stage:string)=>{record({stage,controls:await page.getByLabel('Field name',{exact:true}).evaluateAll((nodes:any[])=>nodes.map(n=>({value:n.value,focusKey:n.dataset.editorFocus,connected:n.isConnected}))) });};
}
