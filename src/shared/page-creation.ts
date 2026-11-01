/** Creation intent only; permanent Page/Route identities remain service-owned. */
export function pageCreationShell(input: { pageMode?: unknown; shellId?: unknown }, defaultShellId?: string): string | undefined {
  const refuse = (message: string): never => { throw Object.assign(new Error(message), { status: 422 }); };
  if (input.pageMode !== undefined && input.pageMode !== 'plain') refuse('Unsupported Page creation mode.');
  if (input.pageMode === 'plain') {
    if (input.shellId !== undefined) refuse('Plain Page creation cannot include a Shell selection.');
    return undefined;
  }
  if (input.shellId !== undefined && typeof input.shellId !== 'string') refuse('Shell selection must be a string.');
  const selected = input.shellId as string | undefined;
  if (selected && !defaultShellId) refuse('Shared Shell creation requires Application composition.');
  return selected || defaultShellId;
}
