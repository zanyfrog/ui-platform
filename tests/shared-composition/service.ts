import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { VisualArtifactService } from '../../src/server/visual-artifacts.js';
import { enableApplicationComposition, readCompositionSource, changePageShell, compositionWorkspace } from '../../src/server/application-composition.js';
import { appPath, platformRoot } from './boundaries.js';
export async function verify() {
  const app=appPath('fixture');
  for(const dir of ['components','apps/fixture/src/pages','apps/fixture/shells']) await fs.mkdir(path.join(platformRoot,dir),{recursive:true});
  const original='{\n  "application": {"name":"Fixture","status":"active"},\n  "retained": {"value":42}\n}\n';
  await fs.writeFile(path.join(app,'app.settings.json'),original);
  const shells=new VisualArtifactService(path.join(app,'shells'),'shell');
  const pages=new VisualArtifactService(path.join(app,'src/pages'),'page');
  let admissions=0; const admit=async()=>{admissions++;};
  const shell=await shells.create('shared',undefined,undefined,undefined,'region-main',admit);
  const originals=[];
  for(const name of ['home','about','contact','unrelated']) originals.push(await pages.create(name,'/'+name,undefined,undefined,'region-main',admit));
  const before=await readCompositionSource('fixture','app.settings.json');
  await assert.rejects(enableApplicationComposition('fixture','art_missing',before.hash,admit),/valid saved Shell/);
  await assert.rejects(enableApplicationComposition('fixture',shell.metadata!.artifactId,'stale',admit),/changed/);
  await assert.rejects(enableApplicationComposition('fixture',shell.metadata!.artifactId,before.hash,async()=>{throw Error('AUTHORITY_DENIED');}),/AUTHORITY_DENIED/);
  assert.equal(await fs.readFile(path.join(app,'app.settings.json'),'utf8'),original);
  await enableApplicationComposition('fixture',shell.metadata!.artifactId,before.hash,admit);
  const after=JSON.parse(await fs.readFile(path.join(app,'app.settings.json'),'utf8'));
  assert.deepEqual(after.application,JSON.parse(original).application); assert.deepEqual(after.retained,{value:42});
  assert.deepEqual(Object.keys(after.presentation).sort(),['model','branding','assetsRoot','siteStyles','defaultShellId','theme'].sort());
  assert.equal(after.presentation.defaultShellId,shell.metadata!.artifactId);
  await assert.rejects(enableApplicationComposition('fixture',shell.metadata!.artifactId,before.hash,admit),/changed/);
  for(const page of originals.slice(0,3)) {
    await assert.rejects(changePageShell('fixture',page.locator,shell.metadata!.artifactId,{},'stale',admit),/changed/);
    await assert.rejects(changePageShell('fixture',page.locator,shell.metadata!.artifactId,{},page.hash,async()=>{throw Error('AUTHORITY_DENIED');}),/AUTHORITY_DENIED/);
    assert.equal((await pages.read(page.locator)).hash,page.hash);
    const next=await changePageShell('fixture',page.locator,shell.metadata!.artifactId,{},page.hash,admit);
    assert.equal(next.metadata!.artifactId,page.metadata!.artifactId);
    assert.match(next.metadata!.routeId!,/^route_/);
    assert.ok(next.files.source.includes(page.files.source),'original HTML bytes retained');
    const metadata=structuredClone(next.metadata!); delete metadata.routeId; delete metadata.shellId;
    assert.deepEqual(metadata,page.metadata);
    for(const role of ['css','fixtures','code'] as const) assert.equal(next.files[role],page.files[role]);
    const again=await changePageShell('fixture',page.locator,shell.metadata!.artifactId,{},next.hash,admit);
    assert.equal(again.metadata!.routeId,next.metadata!.routeId);
  }
  assert.equal((await pages.read(originals[3].locator)).hash,originals[3].hash);
  const graph=await compositionWorkspace('fixture',[],undefined,{recovery:'refuse'});
  assert.equal(graph!.pages.length,4); assert.equal(graph!.pages.filter(p=>p.metadata.shellId).length,3);
  return {passed:true,realRoleService:true,realApplicationMutation:true,authorityRefusal:true,staleRefusal:true,unrelatedPageUnchanged:true,admissions};
}
