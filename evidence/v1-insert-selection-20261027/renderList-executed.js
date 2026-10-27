"use strict";
function renderList() {
    const insert = find('[data-insert]');
    const insertion = insert.value;
    find('[data-create="shell"]').hidden = !workspace.shells?.length;
    const select = find('[data-artifacts]');
    select.innerHTML = '<option value="">Select an artifact</option>' + [['Pages', workspace.pages], ['Shells', workspace.shells ?? []], ['Platform Components', workspace.components]].map(([label, items]) => `<optgroup label="${label}">${items.map(b => `<option value="${label === 'Pages' ? 'page' : label === 'Shells' ? 'shell' : 'component'}:${esc(b.locator)}">${esc(b.metadata?.displayName ?? b.locator)}${b.diagnostics.some(d => d.severity === 'error') ? ' (needs repair)' : ''}</option>`).join('')}</optgroup>`).join('');
    if (selected)
        select.value = `${selectedKind}:${selected.locator}`;
    find('[data-insert]').innerHTML = '<optgroup label="HTML">' + ['section', 'div', 'article', 'p', 'h2', 'a', 'button', 'img', 'ul', 'li', 'span', 'uip-slot'].map(tag => `<option value="html:${tag}">${tag}</option>`).join('') + '</optgroup><optgroup label="Package Components">' + workspace.packages.filter(p => !p.activationIssues?.length).map(p => `<option value="package:${esc(p.id)}">${esc(p.name ?? p.tagName)}</option>`).join('') + '</optgroup><optgroup label="Platform Components">' + workspace.components.filter(b => b.metadata && !b.diagnostics.some(d => d.severity === 'error')).map(b => `<option value="component:${esc(b.metadata.componentId)}">${esc(b.metadata.displayName)}</option>`).join('') + '</optgroup>';
    if (Array.from(insert.options).some(option => option.value === insertion))
        insert.value = insertion;
}
