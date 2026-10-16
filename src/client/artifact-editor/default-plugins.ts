import { EditorPluginRegistry } from './plugins.js';
import { currentPresentation, renderProperties } from './properties.js';
import { renderFormProofEditor, renderRouteProofEditor } from './proof-editors.js';
import { renderDatasetFields, renderDatasetDevelopment, renderDatasetRecords, renderDatasetRelationships, renderDatasetValidation, renderDatasetPermissions } from './dataset-editor.js';
import { registerFormEditor } from './form-editor.js';
import { renderFormPreview } from './form-preview.js';

/** Generic descriptor-section contributions. Specialized proof designers remain WP5. */
export function createDefaultEditorPlugins() {
  const plugins = new EditorPluginRegistry();
  registerFormEditor(plugins, renderFormPreview);
  plugins.register({ id: 'dataset', artifactTypes: ['dataset'], definitionVersions: [1], contributes: [
    { id: 'fields', label: 'Fields', slot: 'tab', order: -3 },
    { id: 'relationships', label: 'Relationships', slot: 'tab' },
    { id: 'validation', label: 'Validation', slot: 'tab' },
    { id: 'permissions', label: 'Permissions', slot: 'tab' },
    { id: 'development', label: 'Development Apply/Connect', slot: 'tab', order: -2 },
    { id: 'records', label: 'Records', slot: 'tab', order: -1 },
  ] }, { fields: renderDatasetFields, development: renderDatasetDevelopment, records: renderDatasetRecords, relationships: renderDatasetRelationships, validation: renderDatasetValidation, permissions: renderDatasetPermissions });
  for (const [id, label, section, artifactTypes] of [
    ['configuration', 'Configuration', 'configuration', ['form', 'route', 'routeGroup', 'trigger']],
    ['form-fields', 'Form fields', 'form-fields', ['form']],
  ] as const) plugins.register({ id, artifactTypes: [...artifactTypes], definitionVersions: [1], contributes: [{ id: 'properties', label, slot: 'tab' }] }, {
    properties: (container, context, scope) => {
      const descriptor = currentPresentation(context);
      renderProperties(container, context, scope.openSource, descriptor?.sections.filter(value => value.id === section));
    },
  });
  plugins.register({ id: 'form-proof', artifactTypes: ['form'], definitionVersions: [1], contributes: [{ id: 'designer', label: 'Form designer', slot: 'tab', requiresEdit: true }] }, {
    designer: renderFormProofEditor,
  });
  plugins.register({ id: 'route-proof', artifactTypes: ['route', 'routeGroup'], definitionVersions: [1], contributes: [{ id: 'designer', label: 'Route designer', slot: 'tab' }] }, {
    designer: renderRouteProofEditor,
  });
  return plugins;
}
