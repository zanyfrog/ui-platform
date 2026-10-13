declare module 'virtual:uip-visual-artifacts' {
  export const components: import('@ui-platform/visual-artifacts').RuntimeArtifact[];
  export const packages: import('@ui-platform/visual-artifacts').PackageComponent[];
}
declare module 'virtual:uip-application-composition' {
  export const definition: import('@ui-platform/visual-artifacts').CompositionDefinition;
  export const platformComponents: import('@ui-platform/visual-artifacts').RuntimeArtifact[];
  export const assetUrls: Record<string, string>;
}
