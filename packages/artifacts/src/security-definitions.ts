import { parseSecurityDocument } from '@ui-platform/i-am/definitions/validation';
import type { ArtifactDefinition, ArtifactValidationContext, ValidationDiagnostic } from './types.js';

/** Artifact source validation delegates to the I-AM parser; policy activation stays in I-AM. */
const kinds = [
  'user', 'service', 'person-link', 'permission', 'permission-set', 'role', 'group',
  'service-requirement', 'application-security', 'grant-boundary', 'service-use-approval',
  'role-assignment', 'group-membership', 'service-assignment',
] as const;

function validate(kind: typeof kinds[number], context: ArtifactValidationContext): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];
  const add = (code: string, message: string, file = 'artifact.json', field?: string) => diagnostics.push({ severity: 'error', code, message, file, ...(field ? { field } : {}) });
  const roles = Object.keys(context.manifest.files);
  if (roles.length !== 1 || roles[0] !== 'definition' || context.manifest.files.definition !== 'definition.json') add('security.file-layout', 'Security artifact requires only definition.json as its definition role.', 'artifact.json', 'files');
  const source = context.files.find(file => file.role === 'definition');
  if (!source) return diagnostics;
  const result = parseSecurityDocument(source.content);
  for (const issue of result.diagnostics) add(`security.${issue.code}`, issue.message, source.path, issue.path);
  if (result.document) {
    if (result.document.definition.kind !== kind) add('security.kind-mismatch', 'Artifact type and definition kind differ.', source.path, 'definition.kind');
    if (result.document.definition.id !== context.manifest.artifactId) add('security.id-mismatch', 'Artifact ID and definition ID differ.', source.path, 'definition.id');
  }
  return diagnostics;
}

export const securityArtifactDefinitions: ArtifactDefinition[] = kinds.map(kind => ({
  artifactType: `security.${kind}`,
  currentDefinitionVersion: 1,
  fileRoles: { definition: { required: true, extensions: ['.json'] } },
  capabilities: { edit: true, format: true },
  validators: [context => validate(kind, context)],
  formatter: file => {
    const checked = parseSecurityDocument(file.content);
    return checked.document ? `${JSON.stringify(checked.document, null, 2)}\n` : file.content;
  },
}));
