import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignmentReferenceValidator } from '../src/server/assignment-reference.js';
import { formLookupOptions } from '../packages/visual-artifacts/src/form-lookup.js';
// @ts-ignore JavaScript control parser has no declaration file.
import { selectOptions } from '../../ui-base/packages/ui-base-forms/src/select-options.js';
const config = { ownerDatasetId: 'scouts', targetDatasetId: 'patrols', targetActiveField: 'active' };
const trusted: any = { applicationId: 'app', actor: { type: 'user', userId: 'editor' } };
test('reference validation checks owner, permanent target and active state; clear/delete do not require an active old target', async () => {
  const queries: any[] = []; let ownerVisible = true, active = true, targetVisible = true;
  const validate = assignmentReferenceValidator(config, async (app, query, actor) => {
    assert.equal(app, 'app'); assert.equal(actor, trusted); queries.push(query);
    return query.datasetId === 'scouts' ? ownerVisible ? [{ id: 'scout-id' }] : [] : targetVisible ? [{ id: 'patrol-id', active }] : [];
  });
  await validate({ id: 'scout-id', patrolId: 'patrol-id' }, 'insert', trusted);
  assert.deepEqual(queries.map(q => q.where.value), ['scout-id', 'patrol-id']);
  active = false; await assert.rejects(validate({ id: 'scout-id', patrolId: 'patrol-id' }, 'update', trusted), /INACTIVE/);
  await validate({ id: 'scout-id', patrolId: '' }, 'update', trusted);
  await validate({ id: 'scout-id', patrolId: 'patrol-id' }, 'delete', trusted);
  targetVisible = false; await assert.rejects(validate({ id: 'scout-id', patrolId: 'forged' }, 'update', trusted), /MISSING_OR_DENIED/);
  ownerVisible = false; await assert.rejects(validate({ id: 'forged', patrolId: '' }, 'insert', trusted), /OWNER_MISSING_OR_DENIED/);
});
test('disconnected reference read fails closed instead of allowing a write', async () => {
  const validate = assignmentReferenceValidator(config, async () => { throw Error('ASSIGNMENT_REFERENCE_DISCONNECTED'); });
  await assert.rejects(validate({ id: 'scout-id', patrolId: '' }, 'update', trusted), /DISCONNECTED/);
});
test('lookup separates names and permanent IDs, filters active choices and retains an inactive current assignment', async () => {
  const choices = await formLookupOptions({ datasetId: 'patrols', labelField: 'name', activeField: 'active', inactiveLabel: 'Inactive Patrol' }, 'old-id', async (q: any) => {
    assert.equal(q.datasetId, 'patrols');
    if (q.where.field === 'active') return [{ id: 'active-id', name: 'Eagle, Patrol', active: true }];
    return [{ id: 'old-id', name: 'Fox', active: false }];
  });
  assert.deepEqual(choices, [{ value: '', label: 'Unassigned' }, { value: 'active-id', label: 'Eagle, Patrol' }, { value: 'old-id', label: 'Inactive Patrol — Fox', disabled: true }]);
  assert.deepEqual(selectOptions('', JSON.stringify(choices)), choices);
});
test('static Select options remain compatible; malformed structured choices fail closed', () => {
  assert.deepEqual(selectOptions(' Alpha, Beta ', null), [{ value: 'Alpha', label: 'Alpha' }, { value: 'Beta', label: 'Beta' }]);
  assert.deepEqual(selectOptions('fallback', '[{"value":"x","label":"A"},{"value":"x","label":"B"}]'), []);
  assert.deepEqual(selectOptions('fallback', 'invalid'), []);
});
test('lookup cannot silently accept inaccessible labels or a failed query', async () => {
  await assert.rejects(formLookupOptions({ datasetId: 'patrols', labelField: 'name' }, '', async () => [{ id: 'hidden' }]), /readable/);
  await assert.rejects(formLookupOptions({ datasetId: 'patrols', labelField: 'name' }, '', async () => { throw Error('denied'); }), /denied/);
});
