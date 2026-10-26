// Source authoring from accepted owner protocol; no package module execution.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
let text=fs.readFileSync(path.join(root,'src/server/package-publications.ts'),'utf8').replaceAll('\r\n','\n');
text=text.replace('/** Existing package-owner extension. Internal only: no route, discovery or permission grant. */','/** Existing presentation-owner extension. No route, legacy acquisition or automatic sealing. */');
text=text.replace("import { nativeCardPublicationProfile, nativeCardPublicationRevision } from './package-publication-profile.js';\n",'');
const start=text.indexOf('export type PackagePublicationRefusal'),end=text.indexOf('const validId =');
text=text.slice(0,start)+"import { PresentationPublicationError, fail, hash, canonical, freeze, snapshotIndex, verifyIndexShape, type PresentationOwnerBinding, type CompletedPresentationSnapshot, type PresentationPublicationIndex as PresentationIndex } from './presentation-publication-contract.js';\nexport { PresentationPublicationError };\nexport type { CompletedPresentationSnapshot, PresentationOwnerBinding } from './presentation-publication-contract.js';\n"+text.slice(end);
text=text.replace(/const validId = .*\n/,"const validId = (id: unknown): id is string => typeof id === 'string' && /^pres_([1-9]\\d{0,15})_[a-f0-9]{64}$/.test(id) && Number.isSafeInteger(Number(id.split('_')[1]));\n");
text=text.replace(/export interface PublicationOwnerBinding \{[^\n]+\}\n/,'');
text=text.replace(text.slice(text.indexOf('export interface NativeCardBuildSnapshot'),text.indexOf('export interface PackagePublicationSelection')),'');
text=text.replace(text.slice(text.indexOf('function indexFor('),text.indexOf('export interface PackagePublicationLease')),'export type PresentationPublicationIndex = Readonly<PresentationIndex>;\n');
text=text.replaceAll('PackagePublication','PresentationPublication').replaceAll('PublicationOwnerBinding','PresentationOwnerBinding').replaceAll('NativeCardBuildSnapshot','CompletedPresentationSnapshot').replaceAll('package-publication','presentation-publication').replaceAll('package owner','presentation owner').replaceAll('package-owner','presentation-owner');
text=text.replace("    if (hash(canonical(profile)) !== profileRevision) fail('UNSUPPORTED_PRODUCER');\n",'');
const old=text.slice(text.indexOf("      if (input?.producer"),text.indexOf('      return this.graph(options, async () => {',text.indexOf('  async publish(')));
text=text.replace(old,"      const staged = snapshotIndex(this.owner, input), bytes = staged.bytes;\n      const index = canonical(staged.index), publicationId = 'pres_' + staged.index.version + '_' + hash(index);\n");
text=text.replace('const final = path.join(sealed, publicationId);','const final = path.join(sealed, \'v\' + staged.index.version);');
text=text.replace("fail('PUBLICATION_EXISTS')","fail('VERSION_EXISTS')");
text=text.replace('for (const resource of profile.resources)', 'for (const resource of staged.index.resources)');
const oldLoad=text.slice(text.indexOf('  private async loadDirectory('),text.indexOf('  private lease('));
const load=`  private async loadDirectory(directory: string, publicationId: string, signal?: AbortSignal) {
    if (canonical((await readdir(directory)).sort()) !== canonical(['bytes','index.json'])) fail('MEMBERSHIP_INVALID');
    const file = path.join(directory,'index.json'), stat = await lstat(file);
    if (stat.size > 32768) fail('LIMIT_EXCEEDED');
    const text = await exactFile(file,stat.size,signal); let index: any;
    try { index=JSON.parse(Buffer.from(text).toString('utf8')); } catch { fail('CONTENT_CHANGED'); }
    verifyIndexShape(index,this.owner);
    if (Buffer.from(text).toString('utf8')!==canonical(index) || publicationId!=='pres_'+index.version+'_'+hash(text)) fail('CONTENT_CHANGED');
    const blobs = await child(directory,'bytes'), bytes = new Map<string,Uint8Array>();
    if(canonical((await readdir(blobs)).sort())!==canonical([...new Set(index.resources.map(r=>r.sha256))].sort()))fail('MEMBERSHIP_INVALID');
    for(const resource of index.resources){const content=await exactFile(path.join(blobs,resource.sha256),resource.byteLength,signal);if(hash(content)!==resource.sha256)fail('CONTENT_CHANGED');bytes.set(resource.id,content);}
    const expected=snapshotIndex(this.owner,{producer:'owner-completed-presentation-v1',version:index.version,files:bytes});
    if(canonical(expected.index)!==canonical(index))fail('CONTENT_CHANGED');
    return {index:freeze(index) as PresentationPublicationIndex,bytes};
  }
  private async load(publicationId: string, signal?: AbortSignal) {
    if(!validId(publicationId))fail('INVALID_INPUT');
    const space=await this.namespace(),sealed=await child(space,'sealed'),directory=await child(sealed,'v'+publicationId.split('_')[1]);
    return this.loadDirectory(directory,publicationId,signal);
  }
`;
text=text.replace(oldLoad,load);
text=text.replace('private lease(publicationId: string, bytes: Map<string, Uint8Array>,','private lease(publicationId: string, index: PresentationPublicationIndex, bytes: Map<string, Uint8Array>,');
text=text.replace('    const index = freeze(JSON.parse(canonical(indexFor(this.owner)))) as PresentationPublicationIndex;\n','');
text=text.replace('this.lease(publicationId, bytes, leaseMs, options.signal)','this.lease(publicationId, bytes.index, bytes.bytes, leaseMs, options.signal)');
text=text.replace('this.lease(previous.publicationId, bytes, leaseMs, options.signal)','this.lease(previous.publicationId, bytes.index, bytes.bytes, leaseMs, options.signal)');
assert.ok(!text.includes('profile.')&&!text.includes('indexFor(')&&!text.includes("'pub_'"));
fs.writeFileSync(path.join(root,'src/server/presentation-publications.ts'),text,{flag:'wx'});
