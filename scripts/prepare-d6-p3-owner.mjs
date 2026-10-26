// Source authoring only: preserve exact existing pure function bodies. No product import.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),ev=path.join(root,'evidence/d6-p3-presentation-seals-20261026');
const file=path.join(root,'src/server/application-presentation.ts'),original=fs.readFileSync(file,'utf8'),text=original.replaceAll('\r\n','\n');
const first=text.slice(text.indexOf('export function defaultPresentation()'),text.indexOf('async function readManifest('));
const css=text.slice(text.indexOf('export function renderPresentationCss('),text.indexOf('export async function getActivePresentationCss('));
assert.ok(first.includes('function normalizeShell(')&&css.includes('presentation.css.trim()'));
const header="import path from 'node:path';\nimport type { ApplicationPresentation, PresentationAsset, PresentationHero } from '../shared/presentation.js';\nimport { APPLICATION_PRESENTATION_VERSION } from '../shared/presentation.js';\n\n";
fs.writeFileSync(path.join(root,'src/server/presentation-format.ts'),header+first+css,{flag:'wx'});
const wiring="import { defaultPresentation, validatePresentation, renderPresentationCss } from './presentation-format.js';\nexport { defaultPresentation, validatePresentation, renderPresentationCss };\nexport { createPresentationPublicationOwner, PresentationPublicationError } from './presentation-publications.js';\n";
fs.writeFileSync(file,text.replace(first,'').replace(css,'').replace("import crypto from 'node:crypto';\n","import crypto from 'node:crypto';\n"+wiring));
const hash=s=>createHash('sha256').update(s).digest('hex');
fs.writeFileSync(path.join(ev,'pure-extraction.json'),JSON.stringify({source:'src/server/application-presentation.ts',newPureOwnerModule:'src/server/presentation-format.ts',before:hash(original),functionBodyHashes:{format:first&&hash(first),css:hash(css)},method:'Exact source slices; function bodies unchanged; normal owner uses the same functions through compatible imports/reexports; no module execution'},null,2));
