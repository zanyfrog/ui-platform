import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { themeCss } from '../../packages/visual-artifacts/dist/composition.js';
const baseline = JSON.parse(await fs.readFile(new URL('./baseline.json', import.meta.url),'utf8'));
const checks=[];
for (const record of baseline.records) {
  const hash=crypto.createHash('sha256').update(await fs.readFile(record.file)).digest('hex');
  if(hash!==record.hash) throw Error('Captured source changed: '+record.file);
}
let omission;
try { themeCss({}); } catch(error) { omission=String(error); }
if(!omission) throw Error('Expected missing-theme contract refusal');
const result={
  date:'2026-10-29',
  settings:baseline.records.find(r=>r.file.endsWith('app.settings.json')),
  capturedFilesUnchanged:baseline.records.length,
  omittedTheme:{error:omission},
  emptyTheme:{css:themeCss({theme:{}})},
  note:'Pure exported themeCss contract probe only. No settings candidate was persisted, no Shell identity fabricated, no graph/host/browser verification claimed.'
};
await fs.writeFile(new URL('./settings-contract-result.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
