import { calculationOrder } from '@ui-platform/dataset-operations/expression';
import type { SecuredDatasetOperationEngine } from '@ui-platform/dataset-operations';
import { formCalculations, formExpressionFields, validateArtifact } from '@ui-platform/visual-artifacts';
import { VisualArtifactService, platformComponentsRoot, toRuntime } from './visual-artifacts.js';
import type { PackageComponent } from '@ui-platform/visual-artifacts';
/** Form constraints are resolved from the same shared definition, never client JSON. Dataset schema remains authoritative. */
export function configureProtectedForms(engine: SecuredDatasetOperationEngine, packages: (applicationId: string) => Promise<PackageComponent[]> = async () => []) {
  engine.configureFormResolver(async (formId, datasetId, trusted) => {
    const service = new VisualArtifactService(platformComponentsRoot, 'component');
    const bundles = await service.list(), matches = bundles.filter(b => b.metadata?.componentId === formId);
    const bundle = matches[0];
    if (matches.length !== 1 || !bundle?.metadata?.form || bundle.metadata.form.datasetId !== datasetId || bundle.diagnostics.some(d => d.severity === 'error')) throw new Error('FORM_CONTRACT_UNAVAILABLE');
    const metadata = bundle.metadata;
    if (validateArtifact(toRuntime(bundle)!, bundles.map(toRuntime).filter((b): b is NonNullable<typeof b> => !!b), await packages(trusted.applicationId)).some(d => d.severity === 'error')) throw new Error('FORM_CONTRACT_INVALID');
    const fields = formExpressionFields(metadata), calculations = formCalculations(metadata);
    calculationOrder(calculations, fields);
    return { fields, calculations, async assertCurrent() { if ((await service.read(bundle.locator)).hash !== bundle.hash) throw new Error('FORM_CONTRACT_STALE'); } };
  });
}
