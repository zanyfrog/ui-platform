import manifest from '../../../ui-base/packages/ui-base-ui/ui.component.json';
import { CARD_DEFINITION_ID } from '../../src/client/visual-artifacts/saved-card-target.js';
import type { SavedCardContext, RetainedCardInput } from '../../src/client/visual-artifacts/saved-card-target.js';
export const context: SavedCardContext = { applicationId:'original-permanent-app',page:{owner:{kind:'application',id:'original-permanent-app',revision:'owner-1'},format:'visual',id:'art_original_page'},subjectId:'original-subject',sessionRevision:'original-session' };
export const source = `<div class="uip-layout-item" data-uip-node="wrapper"><uib-card data-uip-node="saved" data-uip-component="${CARD_DEFINITION_ID}"></uib-card></div>`;
export const digest = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
export async function fixture(markup=source,metadataExtra:Record<string,unknown>={}):Promise<RetainedCardInput> {
  const metadata={schemaVersion:1 as const,artifactId:context.page.id,kind:'page' as const,name:'saved-memory',displayName:'Saved memory',route:'/',...metadataExtra};
  const files={source:markup,css:'uib-card { display: block; }',metadata:JSON.stringify(metadata),fixtures:'{}',code:'export {};'};
  const definition=structuredClone(manifest.components.find(c=>c.identity?.componentId===CARD_DEFINITION_ID)!);
  return {context:structuredClone(context),bundle:{locator:'memory/page.visual.json',files,hash:await digest(JSON.stringify(files)),metadata,diagnostics:[]},baseline:structuredClone(files),candidate:'saved',packages:[{id:CARD_DEFINITION_ID,tagName:'uib-card',packageName:'@ui-base/ui',packageVersion:'0.5.1',definition:definition as any}],componentIds:[],generation:{selection:3,source:5}};
}
