import type { ArtifactMetadata, RuntimeArtifact } from './model.js';
import { parseSource } from './source.js';
import { isPlainPageRoute } from './page-links.js';

/** Membership is explicit metadata, never inferred from HTML or location. */
export function pageAdmissionKind(metadata: ArtifactMetadata): 'plain' | 'composed' {
  return metadata.shellId !== undefined || metadata.routeId !== undefined ? 'composed' : 'plain';
}
export function validatePageMembership(page: RuntimeArtifact): void {
  const composed = pageAdmissionKind(page.metadata) === 'composed';
  if (composed && (!page.metadata.shellId || !page.metadata.routeId)) throw new Error(`Composed Page requires permanent Route and Shell identities: ${page.metadata.name}.`);
  if (!composed && !isPlainPageRoute(page.metadata.route)) throw new Error(`Plain Page requires a canonical public path: ${page.metadata.name}.`);
  if (!composed && page.metadata.menuOverrides && Object.keys(page.metadata.menuOverrides).length) throw new Error('Plain Page cannot consume Shell Menu overrides.');
  for (const node of parseSource(page.source).nodes) {
    if (!composed && Object.hasOwn(node.attributes, 'data-uip-region')) throw new Error(`Plain Page cannot declare Shell Region membership: ${page.metadata.name}.`);
    if (composed) {
      let parent: typeof node | undefined = node;
      while (parent && !Object.hasOwn(parent.attributes, 'data-uip-region')) parent = parent.parent;
      if (!parent) throw new Error(`Page content must belong to a Shell Region: ${page.metadata.displayName}.`);
    }
  }
}
/** All Pages remain visible; plain Pages have no invented Route identity. */
export function capturePageRoutes(pages: RuntimeArtifact[]) {
  return pages.map(page => ({ pageId: page.metadata.artifactId, routeId: page.metadata.routeId, path: page.metadata.route! }));
}
