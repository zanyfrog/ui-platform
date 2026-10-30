import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const file='evidence/v1-shared-composition-20261029/composed-preview-lifecycle.json';
await fs.copyFile(file,'evidence/v1-shared-composition-20261029/native-composed-preview-lifecycle.json');
await fs.writeFile(file,execFileSync('git',['show','HEAD:'+file]));
const script=await fs.readFile('scripts/verify-composed-preview.mjs','utf8');
await fs.writeFile('scripts/verify-composed-preview-final.mjs',script.replaceAll('composed-preview-lifecycle.json','native-composed-preview-lifecycle.json'));
