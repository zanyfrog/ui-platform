import { parseSource, parseMetadata, validateArtifact, readPackageSettings } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, PackageComponent } from '@ui-platform/visual-artifacts';

/** Previously authorized, retained-version metadata only; never permission or Preview. */
export interface SavedCardContext {
  applicationId: string;
  page: { owner: { kind: 'application'; id: string; revision?: string }; format: 'visual'; id: string; repairLocator?: never };
  subjectId: string;
  sessionRevision: string;
}
export type SavedCardRefusal = 'NO_CONTEXT'|'CONTEXT_CHANGED'|'NO_SELECTION'|'NOT_ACTIVE'|'DIRTY_DRAFT'|'SOURCE_UNCERTAIN'|'SOURCE_CHANGED'|'SELECTION_CHANGED'|'SAVE_PENDING'|'SAVE_FAILED'|'INVALID_SOURCE'|'MISSING_NODE'|'UNSUPPORTED_NODE'|'AMBIGUOUS_DEFINITION'|'MISSING_DEFINITION'|'INVALID_DEFINITION'|'UNSUPPORTED_SEMANTICS'|'SUSPENDED'|'DISPOSED';
export interface SavedCardGenerations { readonly selection: number; readonly source: number }
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
declare const sourceOwnerSnapshotBrand: unique symbol;
export type SavedCardTargetSnapshot = DeepReadonly<{
  state: 'unavailable'; reason: SavedCardRefusal; generation: SavedCardGenerations; target: null;
} | {
  readonly [sourceOwnerSnapshotBrand]: true;
  state: 'identified'; reason: 'RETAINED_SAVED_VERSION_ONLY'; generation: SavedCardGenerations;
  target: Readonly<{
    source: Readonly<{ applicationId: string; page: SavedCardContext['page']; committedHash: string; nodeId: string }>;
    implementation: Readonly<{ componentId: string; packageId: string; packageVersion: string; importPath: string; exportName: string; definitionRevision: string|null }>;
    context: Readonly<{ subjectId: string; sessionRevision: string }>;
  }>;
}>;
export interface SavedCardTargetReader {
  readonly snapshot: SavedCardTargetSnapshot;
  subscribe(listener: (snapshot: SavedCardTargetSnapshot) => void): () => void;
}
export const CARD_DEFINITION_ID = 'cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1';
export function immutableSavedCard<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) immutableSavedCard(child); Object.freeze(value); }
  return value;
}
export function savedCardContextKey(context: SavedCardContext | undefined): string | undefined {
  const text = (value:unknown):value is string => typeof value==='string' && value.length>0;
  if (!text(context?.applicationId) || !text(context?.subjectId) || !text(context?.sessionRevision) || context?.page?.format !== 'visual' ||
      context.page.owner?.kind !== 'application' || context.page.owner.id !== context.applicationId ||
      !text(context.page.id) || !/^art_[\w-]+$/.test(context.page.id) || context.page.repairLocator !== undefined ||
      context.page.owner.revision!==undefined && !text(context.page.owner.revision)) return;
  return JSON.stringify([context.applicationId,context.page.owner.kind,context.page.owner.id,context.page.owner.revision??null,context.page.id,context.subjectId,context.sessionRevision]);
}
export interface RetainedCardInput {
  context: SavedCardContext; bundle: ArtifactBundle; baseline: ArtifactFiles; candidate: string;
  packages: Array<PackageComponent & { packageName: string; packageVersion: string }>;
  componentIds: Array<string|undefined>; generation: SavedCardGenerations;
}
/** Source-owner implementation only. Consumers receive only the reader, never this input. */
export async function identifyRetainedSavedCard(input: RetainedCardInput): Promise<SavedCardTargetSnapshot> {
  const generation = { ...input.generation };
  const refuse = (reason:SavedCardRefusal):SavedCardTargetSnapshot => immutableSavedCard({ state:'unavailable',reason,generation,target:null });
  try {
    const {context,bundle,baseline,candidate,packages,componentIds}=input;
    if (!savedCardContextKey(context)) return refuse('NO_CONTEXT');
    if (!candidate) return refuse('NO_SELECTION');
    if (typeof bundle.hash!=='string' || !/^[a-f0-9]{64}$/.test(bundle.hash) ||
        ['source','css','metadata','fixtures','code'].some(role=>typeof baseline[role as keyof ArtifactFiles]!=='string') ||
        JSON.stringify(bundle.files)!==JSON.stringify(baseline)) return refuse('SOURCE_UNCERTAIN');
    const parsedMetadata=parseMetadata(baseline.metadata), metadata=parsedMetadata.metadata;
    if (!metadata || parsedMetadata.diagnostics.some(d=>d.severity==='error') || metadata.kind!=='page' || metadata.artifactId!==context.page.id ||
        !bundle.metadata || JSON.stringify(metadata)!==JSON.stringify(bundle.metadata) || bundle.diagnostics.some(d=>d.severity==='error')) return refuse('INVALID_SOURCE');
    const parsed=parseSource(baseline.source);
    if (parsed.diagnostics.some(d=>d.severity==='error')) return refuse('INVALID_SOURCE');
    const nodes=parsed.nodes.filter(node=>node.id===candidate);
    if (nodes.length!==1) return refuse('MISSING_NODE');
    const node=nodes[0];
    if (node.manual || node.tag!=='uib-card' || node.attributes['data-uip-component']!==CARD_DEFINITION_ID ||
        !node.parent?.id || node.parent.manual || !node.parent.attributes.class?.split(/\s+/).includes('uip-layout-item')) return refuse('UNSUPPORTED_NODE');
    const matches=packages.filter(pkg=>pkg.id===CARD_DEFINITION_ID);
    if (matches.length>1 || componentIds.includes(CARD_DEFINITION_ID)) return refuse('AMBIGUOUS_DEFINITION');
    if (!matches.length) return refuse('MISSING_DEFINITION');
    const pkg=matches[0];
    // The retained explicit declaration is richer than PackageDefinition's legacy
    // type. Guard every required canonical field; never infer an export/version.
    const d=pkg.definition as unknown as { schemaVersion?:string; identity?:{componentId?:string}; ownership?:{scope?:string;package?:{packageId?:string;version?:string;scope?:string}};
      implementation?:{type?:string;tagName?:string;importPath?:string;exportName?:string;runtimeBinding?:{kind?:string;tagName?:string}};
      version?:{packageVersion?:string;revisionId?:string|null} } | undefined;
    if (!d || d.schemaVersion!=='1.0.0' || d.identity?.componentId!==CARD_DEFINITION_ID || pkg.tagName!=='uib-card' ||
        pkg.packageName!=='@ui-base/ui' || d.ownership?.scope!=='platform' || d.ownership.package?.scope!=='platform' || d.ownership.package.packageId!==pkg.packageName || typeof pkg.packageVersion!=='string' || !pkg.packageVersion ||
        d.ownership.package.version!==pkg.packageVersion || d.version?.packageVersion!==pkg.packageVersion ||
        !Object.hasOwn(d.version,'revisionId') || !(d.version.revisionId===null || typeof d.version.revisionId==='string' && d.version.revisionId.length>0) ||
        d.implementation?.type!=='code' || d.implementation.tagName!=='uib-card' || typeof d.implementation.importPath!=='string' || !d.implementation.importPath.startsWith('@ui-base/ui/') || typeof d.implementation.exportName!=='string' || !/^[A-Za-z_$][\w$]*$/.test(d.implementation.exportName) ||
        d.implementation.runtimeBinding?.kind!=='custom-element' || d.implementation.runtimeBinding.tagName!=='uib-card') return refuse('INVALID_DEFINITION');
    const unsupported=['shellId','modes','form','bindings','conditions','repeaters','events','onLoad','sources','state','dependencies'];
    if (unsupported.some(key=>(metadata as unknown as Record<string,unknown>)[key]!==undefined) ||
        !['','export {};'].includes(baseline.code.trim()) || parsed.nodes.some(n=>
          ['script','iframe','object','embed','template','base','link'].includes(n.tag) ||
          Object.keys(n.attributes).some(name=>/^on/i.test(name) || name.startsWith('data-uip-') && !['data-uip-node','data-uip-component','data-uip-settings'].includes(name)) ||
          n.attributes['data-uip-component'] && n.attributes['data-uip-component']!==CARD_DEFINITION_ID)) return refuse('UNSUPPORTED_SEMANTICS');
    if (validateArtifact({metadata,source:baseline.source,css:baseline.css},[],packages).some(d=>d.severity==='error')) return refuse('INVALID_SOURCE');
    const stored=JSON.parse(node.attributes['data-uip-settings']??'{}');
    const settings=readPackageSettings(pkg.definition!,node.attributes,stored);
    if ((settings.interactionMode ?? pkg.definition!.builder.settings.interactionMode?.default)!=='none') return refuse('UNSUPPORTED_SEMANTICS');
    const allowed=new Set(['class','data-uip-node','data-uip-component','data-uip-settings',...Object.values(pkg.definition!.builder.settings).flatMap(c=>c.binding?.kind==='attribute'&&c.binding.name?[c.binding.name]:[])]);
    if (Object.keys(node.attributes).some(name=>!allowed.has(name))) return refuse('UNSUPPORTED_SEMANTICS');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(baseline)))),byte=>byte.toString(16).padStart(2,'0')).join('');
    if (hash!==bundle.hash) return refuse('SOURCE_UNCERTAIN');
    return immutableSavedCard({state:'identified',reason:'RETAINED_SAVED_VERSION_ONLY',generation,target:{
      source:{applicationId:context.applicationId,page:{owner:{kind:'application',id:context.page.owner.id,...(context.page.owner.revision===undefined?{}:{revision:context.page.owner.revision})},format:'visual',id:context.page.id},committedHash:bundle.hash,nodeId:candidate},
      implementation:{componentId:CARD_DEFINITION_ID,packageId:pkg.packageName,packageVersion:pkg.packageVersion,importPath:d.implementation.importPath,exportName:d.implementation.exportName,definitionRevision:d.version.revisionId!},
      context:{subjectId:context.subjectId,sessionRevision:context.sessionRevision},
    }}) as SavedCardTargetSnapshot;
  } catch { return refuse('SOURCE_UNCERTAIN'); }
}
