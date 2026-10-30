import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
const host='C:/Projects/Modular/v1-normal-smoke-20261026-01/ui-platform/references/visual-artifacts-host-20261028',native=path.resolve(host,'../../node_modules/@ui-base/ui'),input=path.join(host,'.inputs/ui-base');
const ev=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1')),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.copyFile(path.join(input,'ui.component.json'),path.join(ev,'native-host-manifest-before-canonical-fix.json'));
await fs.copyFile(path.join(host,'.inputs/composition-pins.json'),path.join(ev,'native-host-pins-before-canonical-fix.json'));
const manifest=JSON.parse(await fs.readFile(path.join(native,'ui.component.json'),'utf8'));
await fs.cp(path.join(native,'src'),path.join(input,'src'),{recursive:true,errorOnExist:true,force:false});
await fs.writeFile(path.join(input,'ui.component.json'),JSON.stringify({components:manifest.components.filter(c=>['uib-card','uib-panel'].includes(c.tagName))},null,2));
const pins=JSON.parse(await fs.readFile(path.join(host,'.inputs/composition-pins.json'),'utf8')).filter(p=>!p.file.startsWith(input));
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Native snapshot symlink refused');if(e.isDirectory())await walk(file);else pins.push({file,sha256:sha(await fs.readFile(file))});}}
await walk(input);await fs.writeFile(path.join(host,'.inputs/composition-pins.json'),JSON.stringify(pins,null,2));
await fs.writeFile(path.join(ev,'native-host-canonical-inputs.json'),JSON.stringify({copiedFrom:native,copiedTo:input,descriptorsUnchanged:true,pins:pins.filter(p=>p.file.startsWith(input))},null,2));
