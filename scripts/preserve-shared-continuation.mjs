import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const ev='evidence/v1-shared-composition-20261029';
// Keep continuation output separate from the already submitted blocker evidence.
await fs.copyFile(ev+'/deployment.json',ev+'/native-deployment.json');
const deploy=(await fs.readFile(ev+'/deploy.mjs','utf8')).replaceAll("'deployment.json'","'native-deployment.json'");
await fs.writeFile(ev+'/deploy-native.mjs',deploy);
for(const name of ['deployment.json','deploy.mjs','dependency-contract-sources.json'])await fs.writeFile(ev+'/'+name,execFileSync('git',['show','HEAD:'+ev+'/'+name]));
console.log('Original blocker evidence restored; continuation outputs retained separately.');
