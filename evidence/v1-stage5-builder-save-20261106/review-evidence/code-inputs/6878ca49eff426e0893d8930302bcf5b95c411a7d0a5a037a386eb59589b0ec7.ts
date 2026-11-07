import { afterEach, expect, it } from 'vitest';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { nativeUiBaseEntry, nativeFormsName, assertNativeUiBaseModule, NativeUiBasePathError } from '../src/server/native-ui-base.js';
import { readNodeSettings, setNodeSetting } from '../packages/visual-artifacts/src/source.js';
import { packageSettingErrors, readPackageSettings } from '../packages/visual-artifacts/src/model.js';
const roots: string[] = [];
afterEach(async () => { for(const root of roots.splice(0)) await rm(root,{recursive:true,force:true}); });
const owner = path.resolve('../ui-base/packages');
it('retains physical 0.5.1 Card/Panel compatibility and refuses the preexisting Forms junction without creating a junction', async context=>{
 const fixture=await mkdtemp(path.join(tmpdir(),'stage1-legacy-'));roots.push(fixture);
 const installed=path.join(fixture,'node_modules/@ui-base/ui');await mkdir(installed,{recursive:true});
 await promisify(execFile)('tar',['-xzf',path.resolve('vendor/native/ui-base-ui-0.5.1.tgz'),'-C',installed,'--strip-components','1']);
 const legacy=await nativeUiBaseEntry(fixture,{enabled:true,version:'^0.5.1',resolution:'platform-only'});
 expect(legacy?.version).toBe('0.5.1'); expect(legacy?.components).toHaveLength(2);
 if (!(await lstat('node_modules/@ui-base/forms')).isSymbolicLink()) { context.skip(); return; }
 await expect(nativeUiBaseEntry(path.resolve('.'),{enabled:true,version:'^0.1.1',resolution:'platform-only'},nativeFormsName)).rejects.toBeInstanceOf(NativeUiBasePathError);
});
it('admits exact physical UI and Forms packages and rejects missing, duplicated, or substituted modules', async () => {
 const root=await mkdtemp(path.join(tmpdir(),'stage1-native-'));roots.push(root);
 for(const [folder,name,count] of [['ui-base-ui','@ui-base/ui',3],['ui-base-forms',nativeFormsName,6]] as const){
  const installed=path.join(root,'node_modules',name);await mkdir(path.dirname(installed),{recursive:true});await cp(path.join(owner,folder),installed,{recursive:true});
  const entry=await nativeUiBaseEntry(root,{enabled:true,version:folder==='ui-base-ui'?'^0.5.2':'^0.1.1',resolution:'platform-only'},name);
  expect(entry?.components).toHaveLength(count);expect(entry?.resolved).toBe(true);
  const file=path.join(installed,'ui.component.json');const manifest=JSON.parse(await readFile(file,'utf8'));manifest.components.push(manifest.components.find((c:any)=>c.tagName===(folder==='ui-base-ui'?'uib-card':'uib-forms-form')));await writeFile(file,JSON.stringify(manifest));
  await expect(nativeUiBaseEntry(root,undefined,name)).rejects.toThrow('ambiguous');
  manifest.components.pop();
  const contract = manifest.components.find((entry:any)=>entry.tagName === (folder === 'ui-base-ui' ? 'uib-card' : 'uib-forms-form')), originalModule = contract.module;
  contract.module = './src/index.js'; await writeFile(file, JSON.stringify(manifest));
  await expect(nativeUiBaseEntry(root,undefined,name)).rejects.toThrow('differs');
  contract.module = originalModule; await writeFile(file, JSON.stringify(manifest));
  const moduleFile = path.resolve(installed, originalModule), bytes = await readFile(moduleFile);
  await rm(moduleFile);
  await expect(nativeUiBaseEntry(root,undefined,name)).rejects.toThrow();
  await writeFile(moduleFile, bytes);
  expect((await nativeUiBaseEntry(root,{enabled:true,version:'^99.0.0',resolution:'platform-only'},name))?.resolved).toBe(false);
 }
 expect(()=>assertNativeUiBaseModule('./src/index.js',nativeFormsName)).toThrow();
});
it('preserves accepted Card identity and old literal instances while enforcing new interactive contracts', async()=>{
 const old=JSON.parse(await readFile('node_modules/@ui-base/ui/ui.component.json','utf8')).components.find((c:any)=>c.tagName==='uib-card');
 const current=JSON.parse(await readFile(path.join(owner,'ui-base-ui/ui.component.json'),'utf8')).components.find((c:any)=>c.tagName==='uib-card');
 expect(current.identity.componentId).toBe(old.identity.componentId);
 const source=`<uib-card data-uip-node="old" data-uip-component="${old.identity.componentId}" heading="Old heading" variant="outlined"><p>Accepted content</p></uib-card>`;
 expect(packageSettingErrors(current,readNodeSettings(source,'old',current))).toEqual([]);
 const changed = setNodeSetting(source,'old','heading','Updated heading',current);
 expect(changed).toContain('heading="Updated heading"'); expect(changed).toContain('<p>Accepted content</p>');
 expect(changed).toContain(`data-uip-component="${old.identity.componentId}"`); expect(changed).toContain('data-uip-node="old"');
 expect(packageSettingErrors(current,readPackageSettings(current,{selectable:''},{}))).toContain('Interactive components need an accessible name.');
 expect(packageSettingErrors(current,{interactionMode:'bogus'}).length).toBeGreaterThan(0);
 expect(packageSettingErrors(current,{unknownSetting:'x'}).length).toBeGreaterThan(0);
});
it('round trips every mapped scalar in HTML and rejects unsupported Select options and Boolean strings',async()=>{
 const manifest=JSON.parse(await readFile(path.join(owner,'ui-base-forms/ui.component.json'),'utf8'));
 for(const d of manifest.components){let source=`<${d.tagName} data-uip-node="field" data-uip-component="${d.identity.componentId}"></${d.tagName}>`;
  for(const [key,c] of Object.entries(d.builder.settings) as [string,any][]){const value=c.type==='boolean'?true:c.type==='number'?2:c.enum?.[0]??'Example';source=setNodeSetting(source,'field',key,value,d);expect(readNodeSettings(source,'field',d)[key]).toEqual(value);}
  expect(source).not.toContain('data-uip-settings');
 }
 const select=manifest.components.find((d:any)=>d.tagName==='uib-forms-select');expect(packageSettingErrors(select,{options:'A,,B'})).not.toEqual([]);expect(packageSettingErrors(select,{options:'A,B',disabled:'false'})).not.toEqual([]);expect(packageSettingErrors(select,{options:'A,B',disabled:false})).toEqual([]);
});
