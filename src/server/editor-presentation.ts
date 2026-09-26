import type { EditableArtifact } from '@ui-platform/artifacts';
import { EditorDescriptorRegistry, type EditorFieldDescriptor, type EditorSectionDescriptor } from '../shared/editor-presentation.js';

/** Transitional display registrations only; ArtifactDefinition remains the validity authority. */
export const editorDescriptors = new EditorDescriptorRegistry();
const field = (id: string, label: string, path: string[], control = 'text'): EditorFieldDescriptor => ({ id, label, path, control });
const common: EditorSectionDescriptor = { id: 'identity', label: 'Artifact properties', target: 'manifest', fields: [
  { ...field('artifact-id', 'Artifact ID', ['artifactId']), readOnly: true },
  field('name', 'Name', ['name']), field('label', 'Label', ['label']), field('description', 'Description', ['description'], 'long-text'),
] };
for (const artifactType of ['route', 'routeGroup', 'form', 'trigger']) {
  const fields: EditorFieldDescriptor[] = artifactType === 'route' || artifactType === 'routeGroup'
    ? [field('route-path', 'Route path', ['config', 'path']), ...(artifactType === 'route' ? [field('page', 'Page reference', ['config', 'page'])] : [])]
    : [field('dataset', 'Dataset reference', ['config', 'dataset']), ...(artifactType === 'trigger' ? [field('priority', 'Priority', ['config', 'priority'], 'number'), field('active', 'Active', ['config', 'active'], 'boolean')] : [])];
  const sections: EditorSectionDescriptor[] = [common, { id: 'configuration', label: 'Configuration', target: 'manifest', fields }];
  if (artifactType === 'form') sections.push({ id: 'form-fields', label: 'Form fields', target: 'file', role: 'definition', fields: [{
    id: 'fields', label: 'Fields', path: ['fields'], control: 'collection', itemKeys: ['id', 'field'], fields: [
      { ...field('field-id', 'Permanent field ID', ['id']), readOnly: true },
      field('field-name', 'Field name', ['field']), field('field-type', 'Field type', ['type']), field('field-label', 'Field label', ['label']),
      { id: 'validators', label: 'Validator configuration', path: ['validators'], control: 'collection', itemKeys: ['validator'], fields: [
        { ...field('validator-name', 'Validator', ['validator'], 'select'), options: [{ value: 'required', label: 'Required' }, { value: 'max-length', label: 'Maximum length' }] },
        field('validator-max', 'Maximum length', ['max'], 'number'), field('validator-message', 'Validation message', ['message']),
      ] },
    ],
  }] });
  editorDescriptors.register({ id: `${artifactType}-v1`, artifactType, definitionVersion: 1, sections });
}

export function presentationForArtifact(artifact: EditableArtifact) {
  const manifest = artifact.manifest, definition = artifact.definition;
  if (!manifest || !definition || definition.artifactType !== manifest.artifactType || manifest.definitionVersion !== definition.currentDefinitionVersion) return undefined;
  const descriptor = editorDescriptors.resolve(manifest.artifactType, manifest.definitionVersion);
  if (descriptor?.sections.some(section => section.target === 'file' && !Object.hasOwn(definition.fileRoles, section.role!))) return undefined;
  return descriptor;
}
