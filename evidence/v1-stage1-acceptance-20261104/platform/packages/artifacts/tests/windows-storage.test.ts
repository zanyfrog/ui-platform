import { afterEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { atomicWriteText } from "../src/file-operations.js";
import { FileSystemArtifactService } from "../src/artifact-service.js";
import { capture } from "../src/bundle.js";
import { storageKey } from "../src/storage.js";

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, rename: vi.fn(original.rename) };
});
const actual =
  await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
const roots: string[] = [];
const denied = () =>
  Object.assign(new Error("Injected Windows sharing violation"), {
    code: "EPERM",
  });
afterEach(async () => {
  vi.mocked(fs.rename).mockImplementation(actual.rename);
  await Promise.all(
    roots
      .splice(0)
      .map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "uib-storage-"));
  roots.push(root);
  const bundle = path.join(root, "form");
  await fs.mkdir(bundle);
  await fs.writeFile(
    path.join(bundle, "artifact.json"),
    JSON.stringify({
      schemaVersion: 1,
      artifactId: "form",
      artifactType: "form",
      name: "form",
      definitionVersion: 1,
      files: { definition: "form.json" },
    }),
  );
  await fs.writeFile(path.join(bundle, "form.json"), '{"fields":[]}');
  return { root, bundle, service: new FileSystemArtifactService({ root }) };
}
describe("atomic replacement and transactional recovery", () => {
  it.runIf(process.platform === "win32")(
    "survives a real Windows handle that temporarily denies replacement",
    async () => {
      const f = await fixture();
      const file = path.join(f.bundle, "form.json");
      const holder = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "$handle = [IO.File]::Open($env:UIB_LOCK_TEST_PATH, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read); try { [Console]::Out.WriteLine('READY'); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null } finally { $handle.Dispose() }",
        ],
        {
          windowsHide: true,
          env: { ...process.env, UIB_LOCK_TEST_PATH: file },
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Lock holder did not start.")),
            5000,
          );
          holder.once("error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
          holder.once("exit", (code) => {
            clearTimeout(timeout);
            if (code !== 0) reject(new Error("Lock holder failed."));
          });
          holder.stdout.on("data", (chunk) => {
            if (String(chunk).includes("READY")) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
        const writing = atomicWriteText(file, "replacement");
        await delay(100);
        expect(await fs.readFile(file, "utf8")).toBe('{"fields":[]}');
        holder.stdin.end("\n");
        await writing;
        expect(await fs.readFile(file, "utf8")).toBe("replacement");
        expect(
          vi
            .mocked(fs.rename)
            .mock.calls.filter(([, target]) => target === file).length,
        ).toBeGreaterThan(1);
      } finally {
        holder.stdin.end();
        holder.kill();
      }
    },
    10000,
  );
  it.runIf(process.platform === "win32")(
    "retries transient sharing errors without deleting the destination",
    async () => {
      const f = await fixture();
      const file = path.join(f.bundle, "form.json");
      let attempts = 0;
      vi.mocked(fs.rename).mockImplementation(async (from, to) => {
        if (to === file && ++attempts <= 2) {
          expect(await fs.readFile(file, "utf8")).toBe('{"fields":[]}');
          throw denied();
        }
        return actual.rename(from, to);
      });
      await atomicWriteText(file, "replacement");
      expect(attempts).toBe(3);
      expect(await fs.readFile(file, "utf8")).toBe("replacement");
      expect(
        (await fs.readdir(f.bundle)).filter((file) => file.endsWith(".tmp")),
      ).toEqual([]);
    },
  );
  it("preserves the destination and cleans temporary files when replacement fails permanently", async () => {
    const f = await fixture();
    const file = path.join(f.bundle, "form.json");
    let attempts = 0;
    vi.mocked(fs.rename).mockImplementation(async () => {
      attempts++;
      throw denied();
    });
    await expect(atomicWriteText(file, "replacement")).rejects.toMatchObject({
      code: "EPERM",
    });
    expect(attempts).toBe(process.platform === "win32" ? 6 : 1);
    expect(await fs.readFile(file, "utf8")).toBe('{"fields":[]}');
    expect(
      (await fs.readdir(f.bundle)).filter((file) => file.endsWith(".tmp")),
    ).toEqual([]);
  });
  it("rolls back a partial multi-file save after the replacement retry budget is exhausted", async () => {
    const f = await fixture();
    const before = await capture(f.bundle);
    let failures = 0;
    vi.mocked(fs.rename).mockImplementation(async (from, to) => {
      if (
        to === path.join(f.bundle, "form.json") &&
        failures++ < (process.platform === "win32" ? 6 : 1)
      )
        throw denied();
      return actual.rename(from, to);
    });
    await expect(
      f.service.save("form", {
        manifest: {
          ...JSON.parse(before["artifact.json"]!),
          files: { definition: "form.json", style: "a.css" },
        },
        files: { "a.css": "a{}", "form.json": '{"fields":[null]}' },
      }),
    ).rejects.toMatchObject({ code: "EPERM" });
    expect(await capture(f.bundle)).toEqual(before);
    expect(await fs.readdir(f.bundle)).not.toContain("a.css");
    expect((await f.service.load("form")).validation.valid).toBe(true);
  });
  it("retains the journal when rollback is also locked and recovers through a fresh service", async () => {
    const f = await fixture();
    const before = await capture(f.bundle);
    vi.mocked(fs.rename).mockImplementation(async (from, to) => {
      if (to === path.join(f.bundle, "form.json")) throw denied();
      return actual.rename(from, to);
    });
    await expect(
      f.service.save("form", { files: { "form.json": '{"fields":[null]}' } }),
    ).rejects.toThrow("recovery journal retained");
    const journal = path.join(
      f.root,
      ".uib",
      "transactions",
      storageKey(f.bundle),
      "pending.json",
    );
    expect(JSON.parse(await fs.readFile(journal, "utf8")).original).toEqual(
      before,
    );
    vi.mocked(fs.rename).mockImplementation(actual.rename);
    const recovered = await new FileSystemArtifactService({
      root: f.root,
    }).load("form");
    expect(recovered.validation.valid).toBe(true);
    expect(await capture(f.bundle)).toEqual(before);
    await expect(fs.stat(journal)).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("does not retry unrelated filesystem errors", async () => {
    const f = await fixture();
    let attempts = 0;
    vi.mocked(fs.rename).mockImplementation(async () => {
      attempts++;
      throw Object.assign(new Error("missing path"), { code: "ENOENT" });
    });
    await expect(
      atomicWriteText(path.join(f.bundle, "form.json"), "replacement"),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(attempts).toBe(1);
  });
});
