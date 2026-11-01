export const MATURITY_LEVELS = Object.freeze({
  EXPERIMENTAL: 'experimental',
  PREVIEW: 'preview',
  STABLE: 'stable',
  DEPRECATED: 'deprecated',
  RETIRED: 'retired'
});

export function createComponentMetadata(metadata) {
  const shaped = {
    maturity: MATURITY_LEVELS.EXPERIMENTAL,
    attributes: [],
    properties: [],
    events: [],
    slots: [],
    cssParts: [],
    cssVariables: [],
    examples: [],
    ...metadata
  };
  return {
    ...shaped,
    attributes: [...new Set([...(shaped.attributes || []), 'css-class'])],
    properties: [...new Set([...(shaped.properties || []), 'cssClass'])]
  };
}
