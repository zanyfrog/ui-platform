import type { FunctionContext } from '@ui-platform/visual-artifacts';
import { createApplicationDataServices } from '@uib/platform-core/application-data';

const services = createApplicationDataServices();
export async function activate(context: FunctionContext) {
  const { local, setState } = context;
  if (local.busy || !local.primaryId) return;
  const id = local.primaryId;
  const person = local.person as Record<string, unknown>;
  const name = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim();
  setState('busy', true);
  setState('result', {});
  setState('message', `Activating ${name}…`);
  setState('completedAt', '');
  try {
    const result = await services['workflow.run']({ workflowId: 'wfl_person_activation_v1', primaryRecordId: id }) as Record<string, unknown>;
    setState('result', result);
    setState('message', 'Refreshing saved person…');
    const rows = await services['dataset.read']({ datasetId: 'dataset-person-form-reference', where: { field: 'id', op: 'eq', value: id } });
    if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Could not refresh the saved person.');
    setState('person', rows[0]);
    setState('savedJson', JSON.stringify(rows[0], null, 2));
    setState('message', result.success === true ? `Activation completed for ${name}.` : `Activation failed: ${result.error ?? 'Unknown error'}. Check the current status before retrying.`);
    setState('completedAt', new Date().toLocaleString());
  } catch (error) {
    setState('message', `Activation could not be confirmed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setState('busy', false);
  }
}

export function showSavedPerson({ local, setState }: FunctionContext) {
  setState('savedJson', JSON.stringify(local.person, null, 2));
}
