(() => {
  // src/client/visual-artifacts/image-selection.ts
  var isApplicationImage = (path) => /^assets\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(svg|png|jpg|jpeg|webp|ico)$/.test(path);
  var defaultAssetPath = (name) => "assets/images/" + name.toLowerCase().replace(/[^a-z0-9.\-]/g, "-");
  async function uploadApplicationAsset(endpoint, request, file, path, current = () => true, replace = confirm) {
    if (!current()) throw new Error("Image selection changed. Reopen the chooser.");
    const info = await request(`${endpoint}?info=1&path=${encodeURIComponent(path)}`);
    if (!current()) throw new Error("Image selection changed. Reopen the chooser.");
    if (info.hash && !replace(`Replace the existing Application asset at ${path}?`)) return false;
    if (!current()) throw new Error("Image selection changed. Reopen the chooser.");
    const data = new FormData();
    data.set("asset", file);
    data.set("path", path);
    data.set("expectedHash", info.hash ?? "");
    await request(endpoint, { method: "POST", body: data });
    return true;
  }
  function chooseApplicationImage(base, request, current) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.setAttribute("aria-label", "Choose Application image");
      dialog.innerHTML = '<h3>Choose Application image</h3><p role="status" aria-live="polite"></p><label>Application images<select aria-label="Application images" size="6"></select></label><button data-use>Use selected image</button><button data-refresh>Refresh images</button><details><summary>Upload Application image</summary><p>Requires Application presentation edit permission.</p><label>Application image file<input type="file" accept=".svg,.png,.jpg,.jpeg,.webp,.ico"></label><label>Asset source path<input data-path value="assets/images/image.png"></label><button data-upload>Upload Application asset</button></details><button data-cancel>Cancel</button>';
      const status = dialog.querySelector("[role=status]"), choices = dialog.querySelector("select");
      const use = dialog.querySelector("[data-use]"), upload = dialog.querySelector("[data-upload]");
      const refresh = dialog.querySelector("[data-refresh]");
      const file = dialog.querySelector("[type=file]"), path = dialog.querySelector("[data-path]");
      const endpoint = `${base}/composition-asset`;
      let closed = false, busy = false, result, listed = [];
      const valid = () => !closed && dialog.isConnected && current();
      const assert = () => {
        if (!valid()) throw new Error("Image, Application or editor session changed. Cancel and reopen the chooser.");
      };
      const failure = (error) => {
        const denied = [401, 403].includes(error.status ?? 0);
        status.textContent = `${denied ? "Access denied" : "Image operation failed"}: ${error instanceof Error ? error.message : String(error)} Refresh images or cancel and reopen.`;
      };
      const run = (operation) => async () => {
        if (busy || closed) return;
        busy = true;
        use.disabled = upload.disabled = refresh.disabled = true;
        try {
          assert();
          await operation();
        } catch (error) {
          if (!closed) failure(error);
        } finally {
          busy = false;
          use.disabled = !listed.length;
          upload.disabled = refresh.disabled = false;
        }
      };
      const list = async () => {
        listed = [];
        choices.replaceChildren();
        status.textContent = "Loading Application images\u2026";
        const value = await request(`${endpoint}?list=1`);
        assert();
        const counts = /* @__PURE__ */ new Map();
        for (const p of value.assets) counts.set(p, (counts.get(p) ?? 0) + 1);
        listed = value.assets.filter((p) => isApplicationImage(p) && counts.get(p) === 1);
        for (const p of listed) {
          const option = document.createElement("option");
          option.value = p;
          option.textContent = `${p.split("/").pop()} \u2014 ${p}`;
          choices.append(option);
        }
        choices.selectedIndex = listed.length ? 0 : -1;
        status.textContent = listed.length ? "Choose an image. Saved Preview reports images that cannot load or decode." : "No eligible Application images. Upload an image if authorized, or refresh.";
      };
      refresh.onclick = run(list);
      use.onclick = run(async () => {
        const selected = choices.value;
        if (!isApplicationImage(selected) || !listed.includes(selected)) throw new Error("Choose an eligible, unambiguous Application image.");
        const info = await request(`${endpoint}?info=1&path=${encodeURIComponent(selected)}`);
        assert();
        if (info.path !== selected || !info.hash) throw new Error("The selected image is missing or unavailable. Refresh images.");
        result = selected;
        dialog.close();
      });
      file.onchange = () => {
        if (file.files?.[0]) path.value = defaultAssetPath(file.files[0].name);
      };
      upload.onclick = run(async () => {
        if (!file.files?.[0] || !isApplicationImage(path.value)) throw new Error("Choose a supported image file and valid Application image path.");
        if (await uploadApplicationAsset(endpoint, request, file.files[0], path.value, valid)) {
          assert();
          await list();
        }
      });
      dialog.querySelector("[data-cancel]").onclick = () => dialog.close();
      dialog.onclose = () => {
        closed = true;
        dialog.remove();
        resolve(result);
      };
      document.body.append(dialog);
      dialog.showModal();
      void run(list)();
    });
  }

  // tests/image-selection/browser.ts
  window.images = { chooseApplicationImage, isApplicationImage, uploadApplicationAsset, defaultAssetPath };
})();
