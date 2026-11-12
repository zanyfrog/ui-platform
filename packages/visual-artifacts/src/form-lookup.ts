export interface FormLookup { datasetId: string; labelField: string; activeField?: string; emptyLabel?: string; inactiveLabel?: string }
export interface LookupOption { value: string; label: string; disabled?: boolean }
export async function formLookupOptions(config: FormLookup, selected: unknown, read: (query: unknown) => Promise<unknown>): Promise<LookupOption[]> {
  const select = [...new Set(['id', config.labelField, ...(config.activeField ? [config.activeField] : [])])];
  const rows = await read({ datasetId: config.datasetId, select, ...(config.activeField ? { where: { field: config.activeField, op: 'eq', value: true } } : {}), limit: 1000 });
  if (!Array.isArray(rows) || rows.length === 1000) throw new Error('Lookup choices are unavailable or exceed the supported limit.');
  const options: LookupOption[] = [{ value: '', label: config.emptyLabel ?? 'Unassigned' }];
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || typeof row[config.labelField] !== 'string' || config.activeField && row[config.activeField] !== true) throw new Error('Lookup choices require readable identities, labels and active status.');
    options.push({ value: row.id, label: row[config.labelField] });
  }
  if (typeof selected === 'string' && selected && !options.some(o => o.value === selected)) {
    const current = await read({ datasetId: config.datasetId, select, where: { field: 'id', op: 'eq', value: selected }, limit: 2 });
    if (!Array.isArray(current) || current.length > 1) throw new Error('Current lookup selection is unavailable.');
    const row = current[0];
    options.push({ value: selected, label: row?.id === selected && typeof row[config.labelField] === 'string' && config.activeField && row[config.activeField] === false ? `${config.inactiveLabel ?? 'Inactive selection'} — ${row[config.labelField]}` : 'Unavailable selection', disabled: true });
  }
  if (new Set(options.map(o => o.value)).size !== options.length) throw new Error('Lookup choices contain duplicate identities.');
  return options;
}
