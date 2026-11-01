(() => {
  // src/client/visual-artifacts/creation.ts
  function chooseVisualCreation(kind, shells) {
    const title = kind === "page" ? "Create Page" : kind === "shell" ? "Create Shell" : "Create Platform Component";
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", title);
    const heading = document.createElement("h2");
    heading.textContent = title;
    const name = document.createElement("input");
    name.setAttribute("aria-label", kind === "page" ? "Page name" : "Artifact name");
    name.pattern = "[a-z][a-z0-9-]*";
    name.required = true;
    const route = document.createElement("input");
    route.setAttribute("aria-label", "Page route");
    route.value = "/";
    route.hidden = kind !== "page";
    const shell = document.createElement("select");
    shell.setAttribute("aria-label", "Page Shell");
    shell.add(new Option("Application default Shell", ""));
    shell.add(new Option("Plain Page (no shared Shell)", "plain"));
    shells.forEach((item) => shell.add(new Option(item.name, item.id)));
    shell.hidden = kind !== "page";
    const create = document.createElement("button");
    create.textContent = "Create";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    const field = (text, control) => {
      const label = document.createElement("label");
      label.append(text, control);
      return label;
    };
    const nameLabel = field(kind === "page" ? "Page name" : "Artifact name", name);
    const help = document.createElement("p");
    help.textContent = "Use lowercase letters, numbers and hyphens, starting with a letter.";
    const routeLabel = field("Page route", route);
    routeLabel.hidden = kind !== "page";
    const shellLabel = field("Page Shell", shell);
    shellLabel.hidden = kind !== "page";
    dialog.append(heading, nameLabel, help, routeLabel, shellLabel, create, cancel);
    document.body.append(dialog);
    dialog.showModal();
    name.focus();
    return new Promise((resolve) => {
      const close = (value) => {
        dialog.close();
        dialog.remove();
        resolve(value);
      };
      cancel.onclick = () => close();
      dialog.oncancel = (event) => {
        event.preventDefault();
        close();
      };
      create.onclick = () => {
        if (name.reportValidity()) close({ name: name.value, ...kind === "page" ? { route: route.value, ...shell.value === "plain" ? { pageMode: "plain" } : { shellId: shell.value } } : {} });
      };
    });
  }

  // tests/explicit-plain/browser.ts
  window.creation = { chooseVisualCreation };
})();
