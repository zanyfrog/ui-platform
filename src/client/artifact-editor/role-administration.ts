type Request = (url: string, body?: unknown) => Promise<any>;

/** Controls for the existing WP3 staged administration contract. */
export function mountRoleAdministration(container: HTMLElement, request: Request) {
  const section = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Role administration'; section.append(summary);
  const field = (name: string) => { const label = document.createElement('label'); label.append(name); const input = document.createElement('input'); input.setAttribute('aria-label', name); label.append(input); section.append(label); return input; };
  const app = field('Administration application key'), reason = field('Administration reason');
  const select = (name: string) => { const label = document.createElement('label'); label.append(name); const value = document.createElement('select'); value.setAttribute('aria-label', name); label.append(value); section.append(label); return value; };
  const user = select('Role user'), role = select('Application role'), scope = select('Assignment scope'), assignment = select('Current assignment');
  const description = document.createElement('p'); description.textContent = 'Roles carry explicit grants. A role title gives no inherited authority. Provisioning creates the security administrator anchor; functional roles and delegation ceilings remain separate.'; section.append(description);
  const plan = document.createElement('pre'), feedback = document.createElement('p'); feedback.setAttribute('role', 'status'); section.append(plan, feedback);
  let state: any, candidate: any, generation = 0, busy = false;
  const buttons: HTMLButtonElement[] = [];
  const invalidate = () => { generation++; state = candidate = undefined; plan.textContent = ''; for (const s of [user, role, scope, assignment]) s.replaceChildren(); };
  const endpoint = () => `/api/apps/${encodeURIComponent(app.value.trim())}`;
  const mutate = (suffix: string, body: object) => {
    if (!state) throw new Error('Refresh administration state first');
    return request(endpoint() + suffix, { ...body, expectedApplicationId: state.applicationId });
  };
  const run = async (work: () => Promise<void>) => { if (busy) return; busy = true; const stamp = generation; for (const b of buttons) b.disabled = true;
    const fields = [app, reason, user, role, scope, assignment]; fields.forEach(f => f.disabled = true);
    try { if (!app.value.trim()) throw new Error('Choose an Application key.'); await work(); }
    catch (error) { if (stamp === generation) { candidate = undefined; feedback.textContent = `Refused/unavailable: ${error instanceof Error ? error.message : String(error)}. Refresh before trying again.`; } }
    finally { busy = false; for (const b of buttons) b.disabled = false; fields.forEach(f => f.disabled = false); }
  };
  const refresh = async () => { candidate = undefined; plan.textContent = ''; const stamp = generation, key = app.value;
    const next = await request(endpoint() + '/security/roles'); if (stamp !== generation || key !== app.value) throw new Error('Administration context changed'); state = next;
    for (const [element, values] of [[user, next.users.map((u: any) => [u.name, u.id])], [role, next.roles.map((r: any) => [r.name + (r.withinGrantCeiling ? '' : ' (outside grant ceiling)'), r.id])],
      [scope, next.scopes.map((s: any, i: number) => [`${s.resource.kind}: ${s.resource.id}${s.descendants ? ' and descendants' : ''}`, String(i)])],
      [assignment, next.assignments.filter((a: any) => a.status === 'active').map((a: any) => [`${next.users.find((u: any) => u.id === a.userId)?.name ?? a.userId} — ${next.roles.find((r: any) => r.id === a.roleId)?.name ?? a.roleId} — ${a.scope.resource.id}`, a.id])]] as Array<[HTMLSelectElement, string[][]]>) {
      element.replaceChildren(); for (const [label, value] of values) element.add(new Option(label, value));
    }
    feedback.textContent = `Assignments loaded. Policy revision ${next.revision}.`;
  };
  const stage = async (action: 'assign' | 'revoke') => {
    candidate = undefined; if (!state || !reason.value.trim()) throw new Error('Refresh state and provide a reason');
    const value = await mutate('/security/' + action, { expectedRevision: state.revision, reason: reason.value.trim(),
      ...(action === 'assign' ? { roleId: role.value, userId: user.value, scope: state.scopes[Number(scope.value)] } : { assignmentId: assignment.value }) });
    if (!value.activatable) throw new Error((value.diagnostics ?? []).map((d: any) => d.code).join(', ') || 'Invalid candidate');
    candidate = { ...value, reason: reason.value.trim() }; plan.textContent = JSON.stringify({ applicationId: state.applicationId, operation: action,
      ...(action === 'assign' ? { user: state.users.find((u: any) => u.id === user.value), role: state.roles.find((r: any) => r.id === role.value), scope: state.scopes[Number(scope.value)] }
        : { assignment: state.assignments.find((a: any) => a.id === assignment.value) }),
      reason: candidate.reason, candidateId: value.id, checksum: value.checksum }, null, 2);
    feedback.textContent = 'Candidate staged. Review the selected user, role, scope and operation, then activate. No permissions changed yet.';
  };
  const button = (text: string, work: () => Promise<void>) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = () => void run(work); buttons.push(b); section.append(b); };
  button('Refresh role assignments', refresh);
  button('Provision Application administrator', async () => { if (!reason.value.trim() || !user.value) throw new Error('Choose an initial administrator and provide a reason'); const result = await mutate('/onboarding', { administratorUserId: user.value, reason: reason.value.trim() }); if (result.status !== 'activated') throw new Error('Provisioning refused'); await refresh(); feedback.textContent = 'Initial administrator provisioned. Functional grants are separate.'; });
  button('Stage role assignment', () => stage('assign')); button('Stage role revocation', () => stage('revoke'));
  button('Activate role change', async () => { if (!candidate || candidate.reason !== reason.value.trim()) throw new Error('Stage and review the unchanged operation first'); const chosen = candidate; candidate = undefined;
    const result = await mutate('/security/activate', { candidateId: chosen.id, checksum: chosen.checksum, expectedRevision: chosen.baseRevision, reason: chosen.reason });
    if (result.status !== 'activated') throw new Error((result.diagnostics ?? []).map((d: any) => d.code).join(', ') || 'Activation refused');
    await refresh(); feedback.textContent = 'Role change activated. Assignments refreshed from protected state.';
  });
  app.oninput = () => { invalidate(); feedback.textContent = 'Application changed. Refresh role assignments.'; }; reason.oninput = () => { candidate = undefined; plan.textContent = ''; };
  for (const s of [user, role, scope, assignment]) s.onchange = () => { candidate = undefined; plan.textContent = ''; };
  container.append(section); return () => { invalidate(); feedback.textContent = ''; section.open = false; };
}
