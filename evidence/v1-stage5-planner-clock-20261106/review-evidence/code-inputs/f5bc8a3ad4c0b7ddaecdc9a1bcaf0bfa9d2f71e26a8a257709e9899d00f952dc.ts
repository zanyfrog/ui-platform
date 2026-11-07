import {expect} from 'vitest';
/** Observe the same permanent field through each supported edit; never retry an edit. */
export async function addDatasetField(editor:any,key:string,type:string){
 const names=editor.getByLabel('Field name',{exact:true}),before=await names.count();
 await editor.getByRole('button',{name:'Add field',exact:true}).click();
 await expect.poll(()=>names.count()).toBe(before+1);
 const focusKey=await names.nth(before).getAttribute('data-editor-focus');
 expect(focusKey).toMatch(/^dataset\/[0-9a-f-]+\/key$/);
 const input=editor.locator(`[data-editor-focus="${focusKey}"]`),id=focusKey.split('/')[1];
 await input.fill(key);await expect.poll(()=>input.inputValue()).toBe(key);
 const row=input.locator('..').locator('..');
 await row.getByLabel('Data type',{exact:true}).selectOption(type);
 await expect.poll(()=>row.getByLabel('Data type',{exact:true}).inputValue()).toBe(type);
 await row.getByLabel('Required',{exact:true}).check();
 expect(await row.getByLabel('Required',{exact:true}).isChecked()).toBe(true);
 await expect.poll(()=>input.inputValue()).toBe(key);
 expect(await input.getAttribute('data-editor-focus')).toBe(focusKey);
 return {id,key,type,required:true};
}
export async function assertDatasetFieldControls(editor:any,fields:any[]){
 for(const field of fields){const input=editor.locator(`[data-editor-focus="dataset/${field.id}/key"]`);await expect.poll(()=>input.inputValue()).toBe(field.key);}
}
