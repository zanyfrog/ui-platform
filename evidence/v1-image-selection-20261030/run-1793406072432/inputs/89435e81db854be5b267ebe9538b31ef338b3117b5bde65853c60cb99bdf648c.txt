import { parseSource, regions } from '@ui-platform/visual-artifacts';

/** Use existing Region identities and semantic main containers; never guess by label. */
export function mainContentRegion(source: string) {
  const nodes = parseSource(source).nodes;
  const candidates = regions(source).filter(region => {
    const node = nodes.find(node => node.start === region.start)!;
    return region.regionId === 'region-main' || node.tag === 'main' || node.attributes.role === 'main';
  });
  if (candidates.length !== 1) throw new Error(candidates.length ? 'The shared Shell has more than one main content area. Choose a Region through advanced controls.' : 'The shared Shell has no eligible main content area. Ask the Shell author to identify one.');
  return candidates[0];
}
