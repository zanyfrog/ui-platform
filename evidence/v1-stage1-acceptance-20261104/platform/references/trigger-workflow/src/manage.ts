if (import.meta.env.DEV) {
  const { mountDevelopmentIdentity } = await import('../../../src/client/artifact-editor/identity-selector');
  await mountDevelopmentIdentity(document.querySelector<HTMLElement>('#identity')!);
  document.querySelector<HTMLButtonElement>('#open')!.onclick = async () => {
    const target = document.querySelector<HTMLElement>('#editor')!;
    try { const { mountAutomationEditor } = await import('../../../src/client/automation/editor'); await mountAutomationEditor(target); }
    catch (error) { target.textContent = String(error); }
  };
}
export {};
