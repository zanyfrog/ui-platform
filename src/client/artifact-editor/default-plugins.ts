import { EditorPluginRegistry } from './plugins.js';
import { currentPresentation, renderProperties } from './properties.js';

/** Generic descriptor-section contributions. Specialized proof designers remain WP5. */
export function createDefaultEditorPlugins() {
  const plugins = new EditorPluginRegistry();
  for (const [id, label, section, artifactTypes] of [
    ['configuration', 'Configuration', 'configuration', ['form', 'route', 'routeGroup', 'trigger']],
    ['form-fields', 'Form fields', 'form-fields', ['form']],
  ] as const) plugins.register({ id, artifactTypes: [...artifactTypes], definitionVersions: [1], contributes: [{ id: 'properties', label, slot: 'tab' }] }, {
    properties: (container, context, scope) => {
      const descriptor = currentPresentation(context);
      renderProperties(container, context, scope.openSource, descriptor?.sections.filter(value => value.id === section));
    },
  });
  return plugins;
}
