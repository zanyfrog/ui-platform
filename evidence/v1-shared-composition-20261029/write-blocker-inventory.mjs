import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
const root=path.resolve('.'),ev=path.join(root,'evidence/v1-shared-composition-20261029');
const output=path.join(root,'docs/architecture/v1-shared-website-composition-dependency-blocker-files-20261029.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function record(file){const bytes=await fs.readFile(file);return{path:path.resolve(file),sha256:hash(bytes),bytes:bytes.length};}
const modified=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const primary=[];for(const p of modified){const r=await record(p);r.beforeGitObjectSha256=hash(execFileSync('git',['show','HEAD:'+p]));r.beforeNote='Git object bytes; working-tree newline conversion may differ';primary.push(r);}
const added=execFileSync('git',['ls-files','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const additions=[];for(const p of added)if(path.resolve(p)!==output)additions.push(await record(p));
const operations=JSON.parse(await fs.readFile(path.join(ev,'deployment.json'),'utf8'));
const latest=new Map();for(const r of operations){const before=latest.get(r.target)?.before??r.before;latest.set(r.target,{...r,before});}
const deployed=[];for(const r of latest.values())deployed.push({...await record(r.target),beforeSha256:r.before,recordedLastDeployedHash:r.after});
const app='C:/Projects/Modular/v1-normal-smoke-20261026-01/apps/v1-identity-fixture';
const live=[await record(path.join(app,'app.settings.json'))];
for(const name of await fs.readdir(path.join(app,'shells/shared-website')))if(!name.startsWith('.'))live.push(await record(path.join(app,'shells/shared-website',name)));
const host='C:/Projects/Modular/v1-normal-smoke-20261026-01/ui-platform/references/visual-artifacts-host-20261028';
const staged=[];for(const name of ['vite.composition-staged.txt','main.composition-staged.txt','.inputs/composition-pins.json','.inputs/ui-base/package.json','.inputs/ui-base/ui.component.json'])staged.push(await record(path.join(host,name)));
const emissions=[];for(const name of ['revision-composition-vite','runtime'])for(const ext of ['.js','.d.ts'])emissions.push(await record(path.join(root,'packages/visual-artifacts/dist',name+ext)));
const result={status:'Stopped at native dependency admission blocker; not the Acceptance Review Gate',date:'2026-10-29',modifiedPrimarySources:primary,untrackedPrimaryFiles:additions,disposableDeploymentTargets:deployed,authorizedLiveSettingsAndNewShell:live,stagedHostInputsNotActivated:staged,relevantPrimaryPackageEmissions:emissions,inventorySelfHash:'omitted to avoid recursion',notes:['No existing Page changed; see preservation-at-blocker.json.','The untracked listing includes closure and historical blocker documents from earlier turns, retained with their current hashes.','Each disposable deployment prior byte snapshot is retained in before/<sha256>; deployment.json preserves intermediate copies.','The old host vite.config.ts and src/main.ts remain active and unchanged; staged text files have not launched the composition plugin.','Private runtime locks/caches, node_modules files not changed by the recorded deployment, and other pre-existing ignored build outputs are not represented as new source changes.','No commits or pushes.']};
await fs.writeFile(output,JSON.stringify(result,null,2));console.log(JSON.stringify({inventory:output,modifiedPrimary:primary.length,untrackedFiles:additions.length,disposableTargets:deployed.length,liveFiles:live.length,stagedFiles:staged.length}));
