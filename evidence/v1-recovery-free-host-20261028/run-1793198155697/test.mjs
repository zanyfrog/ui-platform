// tests/runtime-host/host-read.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import fs2 from "node:fs/promises";
import path9 from "node:path";

// packages/visual-artifacts/src/runtime-revision.ts
import path7 from "node:path";

// tests/d6-r1/fs-guard.ts
import * as fs from "node:fs/promises";
import path from "node:path";
var events = [];
var root = "";
var fault;
function configure(directory, inject) {
  root = path.resolve(directory);
  fault = inject;
  events.length = 0;
}
function check(op, file) {
  const target = path.resolve(String(file));
  const inside = target === root || target.startsWith(root + path.sep);
  const ancestor = op === "lstat" && (root === target || root.startsWith(target.endsWith(path.sep) ? target : target + path.sep));
  if (!root || !inside && !ancestor) throw new Error("OUTSIDE_DISPOSABLE_FIXTURE: " + op);
  events.push({ op, file: target });
  fault?.(op, target);
}
var lstat2 = async (file) => {
  check("lstat", file);
  return fs.lstat(file);
};
var realpath2 = async (file) => {
  check("realpath", file);
  return fs.realpath(file);
};
var readFile2 = async (file, ...args) => {
  check("readFile", file);
  return fs.readFile(file, ...args);
};
var readdir2 = async (file, ...args) => {
  check("readdir", file);
  return fs.readdir(file, ...args);
};
var mkdir2 = async (file, ...args) => {
  check("mkdir", file);
  return fs.mkdir(file, ...args);
};
var rm2 = async (file, ...args) => {
  check("rm", file);
  return fs.rm(file, ...args);
};
var rename2 = async (from, to) => {
  check("rename", from);
  check("rename", to);
  return fs.rename(from, to);
};
var open2 = async (file, ...args) => {
  check("open:" + args[0], file);
  const handle = await fs.open(file, ...args);
  return {
    writeFile: async (...values) => {
      check("handle.writeFile", file);
      return handle.writeFile(...values);
    },
    sync: async () => {
      check("handle.sync", file);
      return handle.sync();
    },
    close: async () => {
      check("handle.close", file);
      await handle.close();
      check("handle.closed", file);
    }
  };
};

// packages/visual-artifacts/src/runtime-revision.ts
import { createHash as createHash3 } from "node:crypto";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";

// packages/visual-artifacts/src/helper-boundary.ts
import path2 from "node:path";
import ts from "file:///C:/Projects/Modular/ui-platform/packages/visual-artifacts/node_modules/typescript/lib/typescript.js";
var key = (id) => id.split("?")[0].replaceAll("\\", "/");
var visualVirtual = (id) => id.includes("virtual:uip-visual-") || id.includes("virtual:uip-application-composition");
var VisualHelperBoundary = class {
  constructor(resolve, cached) {
    this.resolve = resolve;
    this.cached = cached;
  }
  resolve;
  cached;
  helpers = /* @__PURE__ */ new Set();
  isHelper(id) {
    return this.helpers.has(key(id));
  }
  guard(request, importer) {
    if (importer && this.helpers.has(key(importer)) && visualVirtual(request)) throw new Error("Shared helpers cannot cache a managed Visual revision. Import the pinned graph from the Application entry instead.");
  }
  check(code, id) {
    const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true), imports = [];
    const moduleState = /* @__PURE__ */ new Set(), writes = /* @__PURE__ */ new Set(), exported = /* @__PURE__ */ new Set();
    let domAccess = false;
    for (const statement of source.statements) {
      if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier && statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const entry of statement.exportClause.elements) exported.add((entry.propertyName ?? entry.name).text);
      if (ts.isExportAssignment(statement) && ts.isIdentifier(statement.expression)) exported.add(statement.expression.text);
    }
    for (const statement of source.statements) if (ts.isVariableStatement(statement) && !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) {
        const value = declaration.initializer;
        if (!exported.has(declaration.name.text) && (!value || !ts.isArrowFunction(value) && !ts.isFunctionExpression(value))) moduleState.add(declaration.name.text);
      }
    }
    const origin = (node) => ts.isIdentifier(node) ? node.text : ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) ? origin(node.expression) : void 0;
    const visit = (node) => {
      if (ts.isIdentifier(node) && ["document", "window"].includes(node.text)) domAccess = true;
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        const target = origin(node.left);
        const scalar = ts.isIdentifier(node.left) && (ts.isStringLiteral(node.right) || ts.isNumericLiteral(node.right) || [ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(node.right.kind));
        if (target && !scalar) writes.add(target);
      }
      if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
        const target = origin(node.expression.expression);
        if (target) writes.add(target);
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) && !(ts.isExportDeclaration(node) && node.isTypeOnly)) imports.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error(`Shared helper ${path2.basename(id)} uses a computed import that could retain a Visual revision. Use explicit non-Visual imports.`);
          imports.push(node.arguments[0].text);
        }
        if (ts.isIdentifier(node.expression) && ["require", "eval", "Function"].includes(node.expression.text) || ts.isPropertyAccessExpression(node.expression) && ["glob", "globEager"].includes(node.expression.name.text)) throw new Error(`Shared helper ${path2.basename(id)} uses unsupported opaque module loading. Use explicit non-Visual imports.`);
      }
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Function") throw new Error(`Shared helper ${path2.basename(id)} uses unsupported generated module code.`);
      ts.forEachChild(node, visit);
    };
    visit(source);
    if ([...moduleState].some((name) => writes.has(name))) throw new Error(`Shared helper ${path2.basename(id)} has opaque private mutable state that could retain a Visual revision. Keep this cache in the Visual function, or expose inspectable ordinary state.`);
    if (domAccess && source.statements.some((statement) => ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => !declaration.initializer || !ts.isArrowFunction(declaration.initializer) && !ts.isFunctionExpression(declaration.initializer)))) throw new Error(`Shared helper ${path2.basename(id)} combines module state with global DOM access. Keep rendered-node state in the Visual function instance.`);
    return imports;
  }
  async inspect(id, seen = /* @__PURE__ */ new Set()) {
    if (visualVirtual(id) || id.startsWith("\0")) throw new Error("A shared helper cannot load a managed Visual graph or an opaque virtual module.");
    await assertNotVisualRole(id);
    const clean = key(id);
    if (seen.has(clean)) return;
    seen.add(clean);
    if (seen.size > 1e3) throw new Error("Shared helper dependency audit exceeds its bounded graph limit.");
    if (!path2.isAbsolute(clean) || !/\.[cm]?[jt]sx?$/.test(clean)) return;
    if (this.helpers.size >= 1e3 && !this.helpers.has(clean)) throw new Error("Shared helper audit registry exceeds its bounded module limit. Restart the development server.");
    this.helpers.add(clean);
    const code = await readFile2(clean, "utf8");
    if (code.length * 2 > 8 * 1024 * 1024) throw new Error("Shared helper exceeds its source audit limit.");
    const requests = this.check(code, clean);
    const cached = this.cached?.(id);
    if (cached?.code) this.check(cached.code, clean);
    for (const child of cached?.imports ?? []) await this.inspect(child, seen);
    for (const request of requests) await this.inspect(await this.resolve(request, id), seen);
  }
  async resolveFunction(request, importer) {
    const id = await this.resolve(request, importer);
    await this.inspect(id);
    return id;
  }
};
function instrumentVisualFunctions(code, id) {
  const source = ts.createSourceFile(id, code || "export {};", ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = ["registerSharedHelperModule", "registerSharedHelperImport", "callVisualHelper", "callVisualHelperMethod", "constructVisualHelper", "assignVisualHelper", "readVisualHelper", "visualHelperTag", "visualHelperMethodTag", "destructureVisualHelper", "updateVisualHelper", "compoundVisualHelper"];
  const bindings = new Map(names.map((name) => [name, ts.factory.createUniqueName("__uip_" + name)]));
  const call = (name, args) => ts.factory.createCallExpression(bindings.get(name), void 0, args);
  const list = (args) => ts.factory.createArrowFunction(void 0, void 0, [], void 0, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), ts.factory.createArrayLiteralExpression(args));
  const property = (node) => ts.isPropertyAccessExpression(node) ? ts.factory.createStringLiteral(node.name.text) : node.argumentExpression;
  const ordinaryProperty = (node) => ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node) && !ts.isPrivateIdentifier(node.name) && node.expression.kind !== ts.SyntaxKind.SuperKeyword;
  const registrations = [], namespaceImports = [];
  for (const node of source.statements) if (ts.isImportDeclaration(node) && node.importClause && !node.importClause.isTypeOnly || ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
    const namespace = ts.factory.createUniqueName("__uip_sharedModule");
    namespaceImports.push(ts.factory.createImportDeclaration(void 0, ts.factory.createImportClause(false, void 0, ts.factory.createNamespaceImport(namespace)), node.moduleSpecifier));
    registrations.push(ts.factory.createExpressionStatement(call("registerSharedHelperModule", [namespace])));
  }
  const result = ts.transform(source, [(context) => (root2) => {
    const visit = (node) => {
      const expression = (item) => ts.visitNode(item, visit);
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) throw new Error("Computed Visual function imports are unsupported. Use explicit non-Visual helper imports.");
          return call("registerSharedHelperImport", [node]);
        }
        if (ts.isIdentifier(node.expression) && ["require", "eval", "Function"].includes(node.expression.text)) throw new Error("Opaque Visual function module loading is unsupported. Use explicit non-Visual imports.");
        if (node.expression.kind === ts.SyntaxKind.SuperKeyword) throw new Error("Visual functions cannot forward revision context through opaque superclass construction. Keep context in the Visual function.");
        const args = list(node.arguments.map((argument) => ts.isSpreadElement(argument) ? ts.factory.updateSpreadElement(argument, expression(argument.expression)) : expression(argument)));
        if (ordinaryProperty(node.expression)) return call("callVisualHelperMethod", [expression(node.expression.expression), expression(property(node.expression)), args]);
        if (ts.isPropertyAccessExpression(node.expression) && (ts.isPrivateIdentifier(node.expression.name) || node.expression.expression.kind === ts.SyntaxKind.SuperKeyword)) return call("callVisualHelper", [node.expression, ts.factory.createThis(), args]);
        return call("callVisualHelper", [expression(node.expression), ts.factory.createVoidZero(), args]);
      }
      if (ts.isNewExpression(node)) return call("constructVisualHelper", [expression(node.expression), list((node.arguments ?? []).map((argument) => expression(argument)))]);
      if (ts.isTaggedTemplateExpression(node)) {
        const tag = ordinaryProperty(node.tag) ? call("visualHelperMethodTag", [expression(node.tag.expression), expression(property(node.tag))]) : call("visualHelperTag", [expression(node.tag), ts.factory.createVoidZero()]);
        return ts.factory.updateTaggedTemplateExpression(node, tag, node.typeArguments, ts.visitNode(node.template, visit));
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
        if (ordinaryProperty(node.left) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) return call("assignVisualHelper", [expression(node.left.expression), expression(property(node.left)), expression(node.right)]);
        if (ordinaryProperty(node.left)) return call("compoundVisualHelper", [expression(node.left.expression), expression(property(node.left)), ts.factory.createArrowFunction(void 0, void 0, [], void 0, ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken), expression(node.right)), ts.factory.createStringLiteral(node.operatorToken.getText(source))]);
        return ts.factory.updateBinaryExpression(node, node.left, node.operatorToken, expression(node.right));
      }
      if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && ordinaryProperty(node.operand) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator)) return call("updateVisualHelper", [expression(node.operand.expression), expression(property(node.operand)), node.operator === ts.SyntaxKind.PlusPlusToken ? ts.factory.createTrue() : ts.factory.createFalse(), ts.isPostfixUnaryExpression(node) ? ts.factory.createTrue() : ts.factory.createFalse()]);
      if (ts.isVariableDeclaration(node) && node.initializer && !ts.isIdentifier(node.name)) return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type, call("destructureVisualHelper", [expression(node.initializer)]));
      if (ordinaryProperty(node)) return call("readVisualHelper", [expression(node.expression), expression(property(node))]);
      return ts.visitEachChild(node, visit, context);
    };
    return ts.visitNode(root2, visit);
  }]);
  const output = ts.factory.updateSourceFile(result.transformed[0], [
    ts.factory.createImportDeclaration(void 0, ts.factory.createImportClause(false, void 0, ts.factory.createNamedImports([...bindings].map(([name, alias]) => ts.factory.createImportSpecifier(false, ts.factory.createIdentifier(name), alias)))), ts.factory.createStringLiteral("@ui-platform/visual-artifacts/revision-guard")),
    ...namespaceImports,
    ...registrations,
    ...result.transformed[0].statements
  ]);
  const printed = ts.createPrinter().printFile(output);
  result.dispose();
  return printed;
}

// packages/artifacts/src/file-operations.ts
import path3 from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
async function retryWindowsFileOperation(operation) {
  const waits = [25, 50, 100, 200, 400];
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(
        error.code ?? ""
      ) || attempt >= waits.length)
        throw error;
      await delay(waits[attempt]);
    }
  }
}
async function atomicWriteText(file, content) {
  await mkdir2(path3.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open2(temporary, "wx");
  try {
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retryWindowsFileOperation(() => rename2(temporary, file));
  } finally {
    await retryWindowsFileOperation(() => rm2(temporary, { force: true }));
  }
}

// packages/artifacts/src/role-bundle.ts
import path6 from "node:path";
import { appendFileSync } from "node:fs";

// packages/artifacts/src/bundle.ts
import path4 from "node:path";
import { createHash } from "node:crypto";
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function validRelativePath(name) {
  return !!name && !name.includes("\\") && !name.includes(":") && !path4.posix.isAbsolute(name) && name.split("/").every(
    (part) => !!part && part !== "." && part !== ".." && !part.endsWith(".") && !part.endsWith(" ") && !/[<>"|?*\x00-\x1f]/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
  ) && !name.split("/").some((part) => [".uib", ".git"].includes(part.toLowerCase()));
}
async function safeFile(bundle, name) {
  if (!validRelativePath(name))
    throw new Error(`Unsafe artifact path: ${name}`);
  const root2 = await realpath2(bundle);
  const parts = name.split("/");
  let current = root2;
  for (const part of parts) {
    current = path4.join(current, part);
    try {
      if ((await lstat2(current)).isSymbolicLink())
        throw new Error(`Symbolic links are not supported: ${name}`);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (current !== path4.join(root2, ...parts) && await readOptional(path4.join(current, "artifact.json")) !== null)
      throw new Error(`File belongs to a nested artifact bundle: ${name}`);
  }
  return current;
}
async function readOptional(file) {
  try {
    return await readFile2(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function declaredPaths(content) {
  try {
    const value = JSON.parse(content ?? "null");
    return isObject(value) && isObject(value.files) ? Object.values(value.files).filter(
      (v) => typeof v === "string" && validRelativePath(v) && v.toLowerCase() !== "artifact.json"
    ) : [];
  } catch {
    return [];
  }
}
async function capture(bundle, extra = [], options = {}) {
  const manifest = options.includeManifest === false ? null : await readOptional(await safeFile(bundle, "artifact.json"));
  const snapshot = /* @__PURE__ */ Object.create(null);
  if (options.includeManifest !== false) snapshot["artifact.json"] = manifest;
  for (const name of /* @__PURE__ */ new Set([...declaredPaths(manifest), ...extra]))
    snapshot[name] = await readOptional(await safeFile(bundle, name));
  return snapshot;
}
function checksum(snapshot) {
  return createHash("sha256").update(
    JSON.stringify(
      Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b))
    )
  ).digest("hex");
}

// packages/artifacts/src/storage.ts
import path5 from "node:path";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay2 } from "node:timers/promises";
var storageKey = (id) => createHash2("sha256").update(id).digest("hex");
async function storageDirectory(root2, ...segments) {
  let dir = root2;
  for (const segment of [".uib", ...segments]) {
    dir = path5.join(dir, segment);
    await mkdir2(dir, { recursive: true });
    if ((await lstat2(dir)).isSymbolicLink())
      throw new Error(`Storage may not contain symbolic links: ${dir}`);
  }
  return dir;
}
async function writeSnapshot(bundle, snapshot, beforeWrite) {
  const entries = Object.entries(snapshot).sort(
    ([a], [b]) => a === "artifact.json" ? 1 : b === "artifact.json" ? -1 : a.localeCompare(b)
  );
  for (let index = 0; index < entries.length; index++) {
    const [name, content] = entries[index];
    await beforeWrite?.(name, index);
    const file = await safeFile(bundle, name);
    if (content === null)
      await retryWindowsFileOperation(() => rm2(file, { force: true }));
    else await atomicWriteText(file, content);
  }
}
var localLocks = /* @__PURE__ */ new Map();
var heldLocks = new AsyncLocalStorage();
var ArtifactBusyError = class extends Error {
  code = "source.busy";
  status = 503;
  constructor() {
    super("Artifact is locked by another writer.");
  }
};
var ArtifactOwnerUnresolvedError = class extends ArtifactBusyError {
  code = "source.owner-unresolved";
  constructor() {
    super();
    this.name = "ArtifactOwnerUnresolvedError";
    this.message = "Artifact lock ownership is unresolved; exclusive admission was not obtained.";
  }
};
var ArtifactAdmissionUnsafeError = class extends Error {
  code = "source.admission-unsafe";
  status = 503;
  constructor() {
    super("Safe artifact admission could not be established.");
  }
};
var LockCleanupFailure = class {
  constructor(outcome) {
    this.outcome = outcome;
  }
  outcome;
};
async function withArtifactLock(root2, bundle, run, identity = bundle, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  const key2 = path5.join(root2, storageKey(identity));
  const held = (heldLocks.getStore() ?? []).filter((lock) => lock.active);
  if (held.some((lock) => lock.key === key2) || identity === "visual-runtime-graph-v1" && held.length)
    throw new Error("Artifact lock order violation: nested or role-to-graph acquisition.");
  const started = performance.now();
  const budget = options.timeoutMs ?? 0;
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Invalid artifact acquisition budget.");
  const remaining = () => Math.max(0, budget - (performance.now() - started));
  let acquiredAt;
  const check2 = () => options.signal?.throwIfAborted();
  check2();
  const predecessor = localLocks.get(key2);
  const previous = predecessor ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  localLocks.set(key2, current);
  let queued = true;
  try {
    const cancellation = new AbortController();
    const abort = () => cancellation.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = budget > 0 ? setTimeout(() => cancellation.abort(new ArtifactBusyError()), remaining()) : void 0;
    try {
      await Promise.race([previous, new Promise((_, reject) => {
        cancellation.signal.addEventListener("abort", () => reject(cancellation.signal.reason), { once: true });
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
    queued = false;
    if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
    if (predecessor && identity === "visual-runtime-graph-v1") {
      await delay2(Math.min(50, remaining()), void 0, { signal: options.signal });
    }
    let contention = new ArtifactBusyError();
    for (; ; ) {
      check2();
      if (budget > 0 && remaining() <= 0) throw contention;
      let entered = false;
      try {
        return await acquireArtifactLock(root2, bundle, async () => {
          check2();
          if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
          entered = true;
          acquiredAt = performance.now();
          const scope = { key: key2, active: true, graph: identity === "visual-runtime-graph-v1" };
          try {
            return await heldLocks.run([...held, scope], run);
          } finally {
            scope.active = false;
          }
        }, identity, options.recovery);
      } catch (error) {
        if (error instanceof LockCleanupFailure) throw error.outcome;
        if (entered) throw error;
        check2();
        if (!(error instanceof ArtifactBusyError) || remaining() <= 0) throw error;
        contention = error;
        try {
          await delay2(Math.min(25, remaining()), void 0, { signal: options.signal });
        } catch (waitingError) {
          check2();
          throw waitingError;
        }
      }
    }
  } finally {
    if (queued) void previous.then(release);
    else release();
    void current.then(() => {
      if (localLocks.get(key2) === current) localLocks.delete(key2);
    });
    try {
      options.observe?.({
        waitMs: (acquiredAt ?? performance.now()) - started,
        holdMs: acquiredAt === void 0 ? 0 : performance.now() - acquiredAt,
        acquired: acquiredAt !== void 0
      });
    } catch {
    }
  }
}
async function acquireArtifactLock(root2, bundle, run, identity, recoveryMode) {
  const directory = await storageDirectory(root2, "locks");
  const file = path5.join(directory, `${storageKey(identity)}.lock`);
  if (recoveryMode === "refuse") {
    for (const candidate of [file, file + ".recovery"]) {
      const stat = await lstat2(candidate).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat && (candidate !== file || stat.isSymbolicLink() || !stat.isFile())) throw new ArtifactAdmissionUnsafeError();
    }
  }
  let handle;
  let hasPrimary = false;
  let primary;
  let result;
  const cleanupFailures = [];
  const cleanup = async (owned, pathname, phase) => {
    try {
      await owned.close();
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".close", error });
      return;
    }
    try {
      await rm2(pathname, { force: true });
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".unlink", error });
    }
  };
  try {
    try {
      handle = await open2(file, "wx");
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const ownerText = async () => {
        try {
          return await readFile2(file, "utf8");
        } catch (error) {
          if (error.code === "ENOENT") throw new ArtifactBusyError();
          throw error;
        }
      };
      const parseOwner = (text) => {
        const owner2 = Number(text);
        if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(owner2)) throw new ArtifactOwnerUnresolvedError();
        return owner2;
      };
      const owner = parseOwner(await ownerText());
      if (recoveryMode === "refuse") throw new ArtifactBusyError();
      try {
        process.kill(owner, 0);
      } catch (probe) {
        if (probe.code !== "ESRCH")
          throw new ArtifactBusyError();
        let recovery;
        try {
          recovery = await open2(file + ".recovery", "wx").catch((error) => {
            if (error.code === "EEXIST") throw new ArtifactBusyError();
            throw error;
          });
          if (parseOwner(await ownerText()) !== owner) throw new ArtifactBusyError();
          try {
            await rm2(file);
            handle = await open2(file, "wx");
          } catch (error) {
            if (["ENOENT", "EEXIST"].includes(error.code ?? "")) throw new ArtifactBusyError();
            throw error;
          }
        } finally {
          if (recovery) await cleanup(recovery, file + ".recovery", "guard");
        }
      }
      if (!handle) throw new ArtifactBusyError();
    }
    if (cleanupFailures.length === 0) {
      await handle.writeFile(String(process.pid));
      await handle.sync();
      result = await run();
    }
  } catch (error) {
    hasPrimary = true;
    primary = error;
  } finally {
    if (handle) await cleanup(handle, file, "main");
  }
  if (cleanupFailures.length) {
    const errors = [...hasPrimary ? [primary] : [], ...cleanupFailures.map((f) => f.error)];
    const outcome = errors.length === 1 ? errors[0] : new AggregateError(
      errors,
      (hasPrimary ? "Artifact operation failed; ownership cleanup failed: " : "Artifact ownership cleanup failed: ") + cleanupFailures.map((f) => f.phase).join(", ") + ".",
      { cause: hasPrimary ? primary : cleanupFailures[0].error }
    );
    throw new LockCleanupFailure(outcome);
  }
  if (hasPrimary) throw primary;
  return result;
}
async function recoverTransaction(root2, bundle, options = {}) {
  const directory = await storageDirectory(
    root2,
    "transactions",
    storageKey(options.identity ?? bundle)
  );
  const journal = path5.join(directory, "pending.json");
  let pending2;
  try {
    pending2 = JSON.parse(await readFile2(journal, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
  if (pending2.bundle !== void 0 && pending2.bundle !== bundle || pending2.identity !== void 0 && pending2.identity !== options.identity)
    throw new Error("Source journal location does not match its recovery lock.");
  options.validate?.(pending2.original);
  await writeSnapshot(bundle, pending2.original, options.beforeWrite);
  await rm2(journal);
  return true;
}

// packages/artifacts/src/role-bundle.ts
var RoleBundleRecoveryRequiredError = class extends Error {
  code = "source.recovery-required";
  constructor(cause) {
    super("Source recovery is required. Reads and writes are blocked until recovery succeeds.", { cause });
  }
};
async function canonical(location) {
  const directory = path6.resolve(location.directory), root2 = path6.resolve(location.root);
  const ancestors = /* @__PURE__ */ new Set();
  for (const target of [root2, directory]) for (let ancestor = target; ; ancestor = path6.dirname(ancestor)) {
    ancestors.add(ancestor);
    if (path6.dirname(ancestor) === ancestor) break;
  }
  await Promise.all([...ancestors].map(async (ancestor) => {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source bundle roots cannot contain symlinks.");
  }));
  const [resolvedRoot, resolvedDirectory] = await Promise.all([realpath2(root2), realpath2(directory)]);
  const relative = path6.relative(resolvedRoot, resolvedDirectory);
  if (relative === ".." || relative.startsWith(".." + path6.sep) || path6.isAbsolute(relative)) throw new Error("Source bundle is outside its owner root.");
  const paths = [...location.paths];
  if (!paths.length || new Set(paths.map((name) => process.platform === "win32" ? name.toLowerCase() : name)).size !== paths.length || paths.some((name) => !validRelativePath(name)) || !paths.includes(location.anchor)) throw new Error("Unique safe role paths including the anchor are required.");
  await Promise.all(paths.map(async (name) => {
    const target = await safeFile(resolvedDirectory, name);
    const physical = await realpath2(target).catch((error) => {
      if (error.code === "ENOENT") return void 0;
      throw error;
    });
    if (physical && path6.relative(resolvedDirectory, physical).replaceAll(path6.sep, "/") !== name) throw new Error("Role paths must preserve the existing physical filename and casing.");
  }));
  const anchor = await safeFile(resolvedDirectory, location.anchor);
  const identity = await realpath2(anchor).catch((error) => {
    if (error.code === "ENOENT") return anchor;
    throw error;
  });
  return { root: resolvedRoot, directory: resolvedDirectory, paths, identity };
}
function validateSnapshot(snapshot, paths) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || Object.keys(snapshot).length !== paths.length || paths.some((name) => !Object.hasOwn(snapshot, name) || snapshot[name] !== null && typeof snapshot[name] !== "string")) throw new Error("The source journal/candidate does not match the declared role bundle.");
}
var project = (files) => ({ files: structuredClone(files), checksum: checksum(files) });
async function locked(location, work, options = {}) {
  const resolved = await canonical(location);
  return withArtifactLock(resolved.root, resolved.directory, async () => {
    try {
      if (options.recovery === "refuse") await recoverRoleBundleRoot(resolved.root, options);
      else await recoverTransaction(resolved.root, resolved.directory, { identity: resolved.identity, validate: (files2) => validateSnapshot(files2, resolved.paths) });
    } catch (error) {
      options.signal?.throwIfAborted();
      if (error instanceof RoleBundleRecoveryRequiredError) throw error;
      throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
    }
    options.signal?.throwIfAborted();
    const files = await capture(resolved.directory, resolved.paths, { includeManifest: false });
    return work(resolved, files);
  }, resolved.identity, { timeoutMs: 5e3, ...options });
}
function readRoleBundle(location, options = {}) {
  return locked(location, async (_, files) => project(files), { ...options });
}
async function recoverRoleBundleRoot(ownerRoot, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  options.signal?.throwIfAborted();
  const root2 = await realpath2(ownerRoot).catch((error) => {
    if (error.code === "ENOENT") return void 0;
    throw error;
  });
  if (!root2) return;
  const transactions = path6.join(root2, ".uib", "transactions");
  try {
    for (let ancestor = path6.resolve(ownerRoot); ; ancestor = path6.dirname(ancestor)) {
      if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source recovery roots cannot contain symlinks.");
      if (path6.dirname(ancestor) === ancestor) break;
    }
    for (const directory of [path6.join(root2, ".uib"), transactions]) {
      const stat = await lstat2(directory).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error("Unsafe source transaction storage.");
    }
    for (const name of await readdir2(transactions).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      options.signal?.throwIfAborted();
      if (options.recovery === "refuse" && !/^[a-f0-9]{64}$/.test(name)) throw new RoleBundleRecoveryRequiredError(void 0);
      const directory = path6.join(transactions, name);
      if ((await lstat2(directory)).isSymbolicLink() || !(await lstat2(directory)).isDirectory()) throw new Error("Unsafe source transaction storage.");
      const journalFile = path6.join(directory, "pending.json");
      const journalStat = await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (options.recovery === "refuse") {
        if (journalStat) throw new RoleBundleRecoveryRequiredError(void 0);
        continue;
      }
      if (journalStat?.isSymbolicLink()) throw new Error("Unsafe source transaction journal.");
      const text = await readFile2(journalFile, "utf8").catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (text === void 0) continue;
      const journal = JSON.parse(text);
      if (typeof journal.bundle !== "string" || typeof journal.identity !== "string" || name !== storageKey(journal.identity) || path6.dirname(journal.identity) !== journal.bundle || !journal.identity.endsWith(".visual.json")) throw new Error("A source journal requires explicit location recovery.");
      const anchor = path6.basename(journal.identity), stem = anchor.slice(0, -".visual.json".length);
      const paths = [".html", ".css", ".visual.json", ".fixtures.json", ".functions.ts"].map((extension) => stem + extension);
      validateSnapshot(journal.original, paths);
      await readRoleBundle({ root: root2, directory: journal.bundle, anchor, paths });
      if (await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      })) throw new Error("The original journal identity was not recovered. Explicit location recovery is required.");
    }
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof RoleBundleRecoveryRequiredError) throw error;
    throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
  }
}
async function withRoleBundleGraph(ownerRoot, work, options = {}) {
  options = { ...options };
  const root2 = await realpath2(ownerRoot);
  for (let ancestor = path6.resolve(ownerRoot); ; ancestor = path6.dirname(ancestor)) {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source graph roots cannot contain symlinks.");
    if (path6.dirname(ancestor) === ancestor) break;
  }
  return withArtifactLock(root2, root2, async () => {
    if (options.recovery === "refuse") await recoverRoleBundleRoot(root2, options);
    options.signal?.throwIfAborted();
    return work();
  }, "visual-runtime-graph-v1", {
    // Measured WP4/WP5-B holds reached 1.66s. A 5s acquisition budget
    // accommodates brief serial work; it never extends or retries admitted work.
    timeoutMs: 5e3,
    ...options,
    observe: (measurement) => {
      if (process.env.UI_GRAPH_LOCK_TRACE === "1") {
        const record = JSON.stringify({ pid: process.pid, ...measurement });
        console.error("GRAPH_LOCK " + record);
        if (process.env.UI_GRAPH_LOCK_METRICS) appendFileSync(process.env.UI_GRAPH_LOCK_METRICS, record + "\n");
      }
      options.observe?.(measurement);
    }
  });
}

// packages/visual-artifacts/src/runtime-revision.ts
var visualExtensions = [".html", ".css", ".visual.json", ".fixtures.json", ".functions.ts"];
var RuntimeRevision = class {
  constructor(watch) {
    this.watch = watch;
  }
  watch;
  checks = [];
  inputs = [];
  bytes = 0;
  bound(values) {
    this.bytes += values.reduce((total, value) => total + (value?.length ?? 0) * 2, 0);
    if (this.bytes > 32 * 1024 * 1024 || this.checks.length >= 1e3) throw new Error("Visual runtime graph exceeds the transient compilation limit.");
  }
  async text(file) {
    if ((await lstat2(file)).isSymbolicLink()) throw new Error("Runtime source cannot use symbolic links.");
    const value = await readFile2(file, "utf8");
    this.bound([value]);
    this.watch(file);
    this.inputs.push(file, value);
    this.checks.push(async () => {
      if (await readFile2(file, "utf8") !== value) throw new Error("Runtime source changed during revision compilation. Retry after the source is stable.");
    });
    return value;
  }
  async directory(directory) {
    const read = async () => (await readdir2(directory, { withFileTypes: true }).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })).filter((entry) => !entry.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name));
    const entries = await read(), signature = entries.map((entry) => [entry.name, entry.isDirectory(), entry.isSymbolicLink()]);
    this.bound([JSON.stringify(signature)]);
    this.checks.push(async () => {
      if (JSON.stringify((await read()).map((entry) => [entry.name, entry.isDirectory(), entry.isSymbolicLink()])) !== JSON.stringify(signature)) throw new Error("Visual source inventory changed during revision compilation. Retry after source is stable.");
    });
    return entries;
  }
  async visual(file, ownerRoot, immutable = false) {
    const stem = file.slice(0, -".visual.json".length), basename = path7.basename(stem);
    const location = { root: ownerRoot, directory: path7.dirname(file), anchor: path7.basename(file), paths: visualExtensions.map((extension) => basename + extension) };
    if (immutable) {
      const values = {};
      for (const extension of visualExtensions) values[extension] = await this.text(stem + extension).catch((error) => {
        if (error.code === "ENOENT" && extension !== ".visual.json" && extension !== ".html") return "";
        throw error;
      });
      JSON.parse(values[".fixtures.json"] || "{}");
      return { file, metadata: JSON.parse(values[".visual.json"]), source: values[".html"], css: values[".css"], code: values[".functions.ts"], fixtures: values[".fixtures.json"] };
    }
    const snapshot = await readRoleBundle(location, { recovery: "refuse" });
    this.bound(Object.values(snapshot.files));
    for (const name of location.paths) this.watch(path7.join(location.directory, name));
    this.inputs.push(file, snapshot.checksum);
    this.checks.push(async () => {
      if ((await readRoleBundle(location, { recovery: "refuse" })).checksum !== snapshot.checksum) throw new Error("Visual dependency changed during revision compilation. Retry after the source is stable.");
    });
    const get = (extension) => snapshot.files[basename + extension] ?? "";
    if (!get(".visual.json") || snapshot.files[basename + ".html"] === null) throw new Error("Visual runtime requires complete metadata and HTML.");
    JSON.parse(get(".fixtures.json") || "{}");
    return { file, metadata: JSON.parse(get(".visual.json")), source: get(".html"), css: get(".css"), code: get(".functions.ts"), fixtures: get(".fixtures.json") };
  }
  async finish(module, artifacts, helpers2) {
    for (const artifact of artifacts) await validateRuntimeCss(artifact.css);
    const guardModule = fileURLToPath(new URL("./revision-guard.js", import.meta.url)).replaceAll("\\", "/");
    module = `import { guardVisualFunctionExports, registerManagedVisualGraph } from ${JSON.stringify(guardModule)};
` + module;
    const sources = new Map(artifacts.map((artifact, index) => [`uip-captured-function:${index}`, artifact]));
    const result = await build({ stdin: { contents: module, loader: "ts", resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "browser", logLevel: "silent", plugins: [{ name: "captured-visual-functions", setup(builder) {
      builder.onResolve({ filter: /.*/ }, async (args) => {
        if (sources.has(args.path)) return { path: args.path, namespace: "captured-visual" };
        if (args.path === guardModule) return { path: guardModule, external: true };
        const artifact = sources.get(args.importer);
        if (!artifact) return { path: args.path, external: true };
        return { path: await helpers2.resolveFunction(args.path, artifact.file.replace(/\.visual\.json$/, ".functions.ts")), external: true };
      });
      builder.onLoad({ filter: /.*/, namespace: "captured-visual" }, async (args) => {
        const artifact = sources.get(args.path);
        const lowered = await transform(artifact.code || "export {};", { loader: "ts", target: "es2022", supported: { "optional-chain": false, "logical-assignment": false } });
        return { contents: instrumentVisualFunctions(lowered.code, artifact.file).replaceAll('"@ui-platform/visual-artifacts/revision-guard"', JSON.stringify(guardModule)), loader: "ts" };
      });
    } }] });
    for (const check2 of this.checks) await check2();
    const revision = createHash3("sha256").update(JSON.stringify(this.inputs)).digest("hex");
    const output = `import { registerVisualRevision } from ${JSON.stringify(guardModule)};
registerVisualRevision(${JSON.stringify(revision)},${JSON.stringify(artifacts.flatMap((artifact) => [artifact.source, artifact.css, artifact.code, artifact.fixtures, JSON.stringify(artifact.metadata)]))});
export const runtimeRevision=${JSON.stringify(revision)};
${result.outputFiles[0].text}`;
    if (output.length * 2 > 64 * 1024 * 1024) throw new Error("Compiled Visual runtime graph exceeds the transient output limit.");
    return output;
  }
};
async function validateRuntimeCss(source) {
  const result = await transform(source, { loader: "css", logLevel: "silent" });
  if (result.warnings.length) throw new Error("CSS source is incomplete or invalid: " + result.warnings.map((item) => item.text).join(" "));
}
function runtimeReaderServer(server, root2, managedRoots = []) {
  server.middlewares.use(async (request, response, next) => {
    try {
      const url = decodeURIComponent((request.url ?? "").split("?")[0]);
      if (url.startsWith("/@id/__x00__virtual:uip-visual-") || url.startsWith("/@id/__x00__virtual:uip-application-composition")) {
        for (const module of server.moduleGraph.idToModuleMap.values()) if (module.id?.startsWith("\0virtual:uip-visual-") || module.id === "\0virtual:uip-application-composition") server.moduleGraph.invalidateModule(module);
      } else if (!url.startsWith("/@id/")) await assertNotVisualRole(url.startsWith("/@fs/") ? url.slice(5) : path7.join(root2, url), managedRoots);
      next();
    } catch (error) {
      response.statusCode = 409;
      response.end(String(error));
    }
  });
}
var runtimeRefreshClient = `
const session = import.meta.hot ? (import.meta.hot.data.visualRefresh ??= { active: new Map(), pending: undefined }) : { active: new Map(), pending: undefined };
const active = session.active;
function differs(id, digest) { const pending = session.pending; return pending && Object.hasOwn(pending.modules, id) && (pending.force || pending.modules[id] !== digest); }
export function register(id, digest) {
  if (active.size >= 1000 && !active.has(id)) { location.reload(); return; }
  active.set(id, digest);
  if (differs(id, digest)) location.reload();
}
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.on('uip:validated-visual-refresh', data => {
    // A helper/asset hint during bootstrap must not be erased by a later
    // same-generation source hint before the first module registers.
    session.pending = !active.size && session.pending?.force ? { ...data, force: true } : data;
    if ([...active].some(([id, digest]) => differs(id, digest))) location.reload();
  });
}
`;
function runtimeRefreshModule(watchId, id, code) {
  const digest = createHash3("sha256").update(code).digest("hex");
  return { code: `import { register as __uipRegisterRefresh } from ${JSON.stringify(watchId)};
__uipRegisterRefresh(${JSON.stringify(id)},${JSON.stringify(digest)});
${code}`, meta: { uipVisualRefreshDigest: digest } };
}
function runtimeRevisionRefresh(server, relevant, captured = () => false) {
  let timer, generation = 0, closed = false, force = false;
  const refresh = (file) => {
    if (closed || !relevant(file) || /(?:^|\/)\.uib(?:\/|$)/i.test(file.replaceAll("\\", "/"))) return;
    const source = file.replace(/\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/i, "");
    if (source !== file && captured(source)) return;
    const current = ++generation;
    clearTimeout(timer);
    force ||= !captured(file);
    const trace = (event, detail = {}) => {
      if (process.env.UI_RUNTIME_REFRESH_TRACE === "1") console.info("RUNTIME_REFRESH " + JSON.stringify({ event, file, generation: current, ...detail }));
    };
    trace("source-event");
    const validate = async (attempt = 0) => {
      try {
        const modules = [...server.moduleGraph.idToModuleMap.values()].filter((module) => module.id !== "\0virtual:uip-visual-watch" && (module.id?.startsWith("\0virtual:uip-visual-") || module.id === "\0virtual:uip-application-composition"));
        const digests = {};
        let unknown = false;
        for (const module of modules) {
          const loaded = await server.pluginContainer.load(module.id);
          const digest = loaded && typeof loaded !== "string" ? loaded.meta?.uipVisualRefreshDigest : void 0;
          if (typeof digest === "string") digests[module.id] = digest;
          else unknown = true;
          trace("validated", { id: module.id, digest });
        }
        if (closed || current !== generation) return;
        for (const module of modules) server.moduleGraph.invalidateModule(module);
        if (modules.length) {
          if (unknown) {
            trace("full-reload");
            server.ws.send({ type: "full-reload" });
          } else {
            trace("validated-refresh", { force, modules: digests });
            server.ws.send({ type: "custom", event: "uip:validated-visual-refresh", data: { modules: digests, force } });
          }
        }
        force = false;
      } catch (error) {
        if (closed || current !== generation) return;
        if (attempt < 20 && /locked by another writer|lock changed/i.test(String(error))) {
          timer = setTimeout(() => {
            void validate(attempt + 1);
          }, 200);
          return;
        }
        server.ws.send({ type: "error", err: { message: `Visual refresh blocked: ${String(error)}`, stack: "" } });
      }
    };
    timer = setTimeout(() => {
      void validate();
    }, 200);
  };
  server.watcher.on("add", refresh).on("unlink", refresh).on("change", refresh);
  const close = () => {
    closed = true;
    clearTimeout(timer);
    server.watcher.off("add", refresh).off("unlink", refresh).off("change", refresh);
  };
  server.httpServer?.once("close", close);
  return { refresh, close, relevant };
}
function runtimeLiteral(artifact, index) {
  return `{metadata:${JSON.stringify(artifact.metadata)},source:${JSON.stringify(artifact.source)},css:${JSON.stringify(artifact.css)},functions:guardVisualFunctionExports(f${index})}`;
}
async function assertNotVisualRole(file, managedRoots = []) {
  const clean = file.split("?")[0];
  if (/(?:^|[\\/])\.uib[\\/](?:transactions|locks)(?:[\\/]|$)/i.test(clean)) throw new Error("Private source transaction storage cannot be loaded by the runtime.");
  const extension = visualExtensions.find((extension2) => clean.toLowerCase().endsWith(extension2));
  if (!extension) return;
  const metadata = clean.slice(0, -extension.length) + ".visual.json";
  const exists = (target) => lstat2(target).then(() => true, (error) => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  const managed = managedRoots.some((root2) => {
    const relative = path7.relative(root2, clean);
    return relative !== ".." && !relative.startsWith(".." + path7.sep) && !path7.isAbsolute(relative);
  });
  const stem = clean.slice(0, -extension.length);
  const orphan = managed && (/^(?:page|shell|component)$/i.test(path7.basename(stem)) || await exists(stem + ".html") && (await exists(stem + ".functions.ts") || await exists(stem + ".fixtures.json")));
  if (extension === ".visual.json" || orphan || await exists(metadata)) throw new Error("Direct Visual role imports are blocked. Use the revision-pinned Visual virtual module.", { cause: clean });
}

// packages/visual-artifacts/src/revision-vite.ts
import path8 from "node:path";
import { createRequire } from "node:module";

// packages/visual-artifacts/src/page-entry.ts
import ts2 from "file:///C:/Projects/Modular/ui-platform/packages/visual-artifacts/node_modules/typescript/lib/typescript.js";
function revisionPageEntry(code, id) {
  if (!/\/(?:index|main)\.[cm]?[jt]s$/.test(id.replaceAll("\\", "/").split("?")[0]) || !code.includes("createVisualPage")) return;
  const source = ts2.createSourceFile(id, code, ts2.ScriptTarget.Latest, true, ts2.ScriptKind.TS);
  const roles = /* @__PURE__ */ new Map([["./page.html?raw", "source"], ["./page.css?raw", "css"], ["./page.visual.json", "metadata"], ["./page.functions", "functions"], ["./page.functions.ts", "functions"]]);
  const declarations = source.statements.filter(ts2.isImportDeclaration);
  const selected = declarations.filter((node) => ts2.isStringLiteral(node.moduleSpecifier) && roles.has(node.moduleSpecifier.text));
  const present = new Set(selected.map((node) => roles.get(node.moduleSpecifier.text)));
  if (!["source", "css", "metadata"].every((role) => present.has(role)) || !declarations.some((node) => ts2.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@ui-platform/visual-artifacts/runtime")) return;
  const page = ts2.factory.createUniqueName("__uip_page");
  const statements = [ts2.factory.createImportDeclaration(void 0, ts2.factory.createImportClause(false, void 0, ts2.factory.createNamedImports([ts2.factory.createImportSpecifier(false, ts2.factory.createIdentifier("page"), page)])), ts2.factory.createStringLiteral("virtual:uip-visual-page"))];
  for (const node of source.statements) {
    if (ts2.isImportDeclaration(node) && ts2.isStringLiteral(node.moduleSpecifier)) {
      const role = roles.get(node.moduleSpecifier.text);
      if (role) {
        const binding = node.importClause?.name ?? (node.importClause?.namedBindings && ts2.isNamespaceImport(node.importClause.namedBindings) ? node.importClause.namedBindings.name : void 0);
        if (!binding) throw new Error("The Page entry uses an unsupported role import. Import its complete revision from virtual:uip-visual-page.");
        statements.push(ts2.factory.createVariableStatement(void 0, ts2.factory.createVariableDeclarationList([ts2.factory.createVariableDeclaration(binding, void 0, void 0, ts2.factory.createPropertyAccessExpression(page, role))], ts2.NodeFlags.Const)));
        continue;
      }
      if (node.moduleSpecifier.text === "virtual:uip-visual-artifacts") {
        statements.push(ts2.factory.updateImportDeclaration(node, node.modifiers, node.importClause, ts2.factory.createStringLiteral("virtual:uip-visual-page"), node.attributes));
        continue;
      }
    }
    statements.push(node);
  }
  const roleBindings = new Map(selected.map((node) => [roles.get(node.moduleSpecifier.text), node.importClause?.name?.text ?? (node.importClause?.namedBindings && ts2.isNamespaceImport(node.importClause.namedBindings) ? node.importClause.namedBindings.name.text : "")]));
  const identifier = (node) => ts2.isIdentifier(node) ? node.text : ts2.isAsExpression(node) || ts2.isTypeAssertionExpression(node) || ts2.isParenthesizedExpression(node) ? identifier(node.expression) : void 0;
  const result = ts2.transform(ts2.factory.updateSourceFile(source, statements), [(context) => (root2) => {
    const visit = (node) => {
      if (ts2.isCallExpression(node) && ts2.isIdentifier(node.expression) && node.expression.text === "createVisualPage" && node.arguments[0] && ts2.isObjectLiteralExpression(node.arguments[0])) {
        const properties = node.arguments[0].properties;
        const conventional = properties.length === roleBindings.size && properties.every((property) => ts2.isShorthandPropertyAssignment(property) ? roleBindings.get(property.name.text) === property.name.text : ts2.isPropertyAssignment(property) && ts2.isIdentifier(property.name) && identifier(property.initializer) === roleBindings.get(property.name.text));
        if (conventional) return ts2.factory.updateCallExpression(node, node.expression, node.typeArguments, [page, ...node.arguments.slice(1)]);
      }
      return ts2.visitEachChild(node, visit, context);
    };
    return ts2.visitNode(root2, visit);
  }]);
  const output = ts2.createPrinter().printFile(result.transformed[0]);
  result.dispose();
  return output;
}

// packages/visual-artifacts/src/model.ts
function legacyPackageSettingContracts(pkg) {
  return Object.fromEntries(Object.entries(pkg.presentation?.settings ?? {}).flatMap(([key2, value]) => {
    if (!/^[a-z][a-z0-9-]*$/.test(key2)) return [];
    if (value.type === "select") return value.options?.length ? [[key2, { type: typeof value.options[0] === "number" ? "number" : "string", enum: value.options, default: value.default }]] : [];
    return ["string", "number", "boolean"].includes(value.type) ? [[key2, { type: value.type, default: value.default }]] : [];
  }));
}
function valueErrors(value, contract, label) {
  if (value === void 0 || value === null) return contract.required ? [`${label} is required.`] : [];
  const type = Array.isArray(value) ? "array" : typeof value;
  const errors = [];
  if (type !== contract.type || type === "number" && !Number.isFinite(value)) return [`${label} must be ${contract.type}.`];
  if (contract.enum && !contract.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${label} is outside its allowed values.`);
  if (typeof value === "number" && (contract.minimum !== void 0 && value < contract.minimum || contract.maximum !== void 0 && value > contract.maximum)) errors.push(`${label} is outside its numeric bounds.`);
  if (typeof value === "string" && (contract.minLength !== void 0 && value.length < contract.minLength || contract.maxLength !== void 0 && value.length > contract.maxLength)) errors.push(`${label} is outside its length bounds.`);
  return errors;
}
function packageSettingErrors(definition, settings) {
  const contracts = definition.builder.settings, values = {};
  for (const [key2, contract] of Object.entries(contracts)) values[key2] = settings[key2] ?? contract.default;
  const errors = [];
  for (const [key2, value] of Object.entries(settings)) if (!contracts[key2]) errors.push(`Unknown installed Package setting: ${key2}.`);
  for (const [key2, contract] of Object.entries(contracts)) {
    errors.push(...valueErrors(values[key2], contract, key2));
    if (contract.visibleWhen && values[contract.visibleWhen.setting] !== contract.visibleWhen.equals && values[key2] !== contract.default) errors.push(`${key2} is not allowed in this interaction mode.`);
  }
  for (const rule of definition.builder.validation ?? []) {
    if (rule.when && values[rule.when.setting] !== rule.when.equals) continue;
    if (rule.kind === "requiredWhen" && !String(values[rule.setting] ?? "").trim()) errors.push(`${rule.setting} is required.`);
    if (rule.kind === "oneOfRequiredWhen" && !rule.settings?.some((key2) => String(values[key2] ?? "").trim())) errors.push(`One of ${rule.settings?.join(", ")} is required.`);
    if (rule.kind === "accessibleNameWhenInteractive" && values.interactionMode !== "none" && !rule.settings?.some((key2) => String(values[key2] ?? "").trim())) errors.push("Interactive components need an accessible name.");
  }
  return errors;
}
function readPackageSettings(definition, attributes, stored) {
  const values = {};
  for (const [key2, contract] of Object.entries(definition.builder.settings)) {
    const binding = contract.binding;
    if (binding?.kind === "attribute" && binding.name && Object.hasOwn(attributes, binding.name)) {
      const value = attributes[binding.name];
      values[key2] = contract.type === "boolean" ? value !== "false" : contract.type === "number" ? Number(value) : value;
    }
  }
  return { ...values, ...stored };
}
function readLegacyPackageSettings(pkg, attributes, stored) {
  const values = {};
  for (const [key2, contract] of Object.entries(legacyPackageSettingContracts(pkg))) if (Object.hasOwn(attributes, key2)) values[key2] = contract.type === "boolean" ? attributes[key2] !== "false" : contract.type === "number" ? Number(attributes[key2]) : attributes[key2];
  return { ...values, ...stored };
}

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
function validateManagedUrlAttribute(tag, name, value) {
  if (!(tag === "a" && name === "href" || tag === "img" && name === "src")) return;
  if (!value) return;
  const invalid = () => {
    throw new Error(`Unsupported or malformed ${tag} ${name} URL. Use an allowed scheme or a relative path without whitespace or backslashes.`);
  };
  if (/[\s\u0000-\u001f\u007f\\<>"`]/u.test(value) || /^\/\//.test(value) || /&(?:#|[a-z]+;)/i.test(value) || /%(?![0-9a-f]{2})/i.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) invalid();
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1].toLowerCase();
  if (scheme && !(tag === "a" ? ["http", "https", "mailto", "tel"] : ["http", "https"]).includes(scheme)) invalid();
  if (scheme === "http" || scheme === "https") {
    if (!/^https?:\/\/[^/]/i.test(value)) invalid();
  } else if (scheme) {
    if (!value.slice(scheme.length + 1) || value.slice(scheme.length + 1).startsWith("//")) invalid();
  } else {
    if (value.split(/[/?#]/, 1)[0].includes(":") || tag === "img" && /^[?#]/.test(value)) invalid();
  }
  try {
    const parsed = new URL(value, "https://managed.invalid/");
    if (!scheme && parsed.origin !== "https://managed.invalid") invalid();
    if (scheme && parsed.protocol !== scheme + ":") invalid();
  } catch {
    invalid();
  }
}
var decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
function parseSource(source) {
  const nodes = [], stack = [], diagnostics = [];
  const implicitClose = (offset) => {
    const node = stack.pop();
    node.closeStart = offset;
    node.end = offset;
    node.manual = true;
    diagnostics.push({ severity: "warning", message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
  };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>|(<\/?[A-Za-z][\w:-]*[^<>]*(?:>|(?=<)|$)|<(?:\s+\/?[A-Za-z]|\/\s+[A-Za-z]|[0-9])[^<>]*\bdata-uip-(?:node|component)\b[^<>]*(?:>|(?=<)|$)|<!--[\s\S]*$|<![^>]*$|<\?[^>]*(?:>|$))/gi;
  let match;
  while (match = token.exec(source)) {
    const raw = match[0];
    if (match[1]) {
      diagnostics.push({ severity: "error", message: `Malformed opening tag at offset ${match.index}.` });
      continue;
    }
    if (raw.startsWith("<!")) continue;
    const tag = /^<\/?([\w:-]+)/.exec(raw)[1].toLowerCase();
    if (raw.startsWith("</")) {
      if (!/^<\/[\w:-]+\s*>$/.test(raw)) diagnostics.push({ severity: "error", message: `Malformed closing tag at offset ${match.index}.` });
      while (stack.length && stack.at(-1).tag !== tag && optionalTags.has(stack.at(-1).tag)) implicitClose(match.index);
      const node2 = stack.at(-1);
      if (!node2 || node2.tag !== tag) {
        diagnostics.push({ severity: "error", message: `Unmatched closing tag ${tag}. Visual editing requires explicit balanced markup.` });
        continue;
      }
      node2.closeStart = match.index;
      node2.end = token.lastIndex;
      stack.pop();
      continue;
    }
    while (stack.length) {
      const top = stack.at(-1).tag;
      const closes = top === "p" && blockTags.has(tag) || ["li", "option", "optgroup", "tr", "thead", "tbody", "tfoot"].includes(top) && top === tag || ["dt", "dd"].includes(top) && ["dt", "dd"].includes(tag) || ["td", "th"].includes(top) && ["td", "th"].includes(tag);
      if (!closes) break;
      implicitClose(match.index);
    }
    const attributes = {};
    const selfClosing = raw.endsWith("/>");
    const attrs = raw.slice(tag.length + 1, selfClosing ? -2 : -1);
    const attribute = /\s+([^\s=/'"><`&]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/y;
    const identities = /* @__PURE__ */ new Set();
    let cursor = 0;
    while (cursor < attrs.length && !/^\s*$/.test(attrs.slice(cursor))) {
      attribute.lastIndex = cursor;
      const attr = attribute.exec(attrs);
      if (!attr) {
        diagnostics.push({ severity: "error", message: `Malformed or unsupported attributes at offset ${match.index + tag.length + 1 + cursor}.` });
        break;
      }
      cursor = attribute.lastIndex;
      const folded = attr[1].replace(/[A-Z]/g, (letter) => letter.toLowerCase());
      const identity = folded === "data-uip-node" || folded === "data-uip-component";
      const name = identity ? folded : attr[1];
      const value = attr[2] ?? attr[3] ?? attr[4];
      if (identity) {
        if (identities.has(name)) {
          diagnostics.push({ severity: "error", message: `Duplicate identity attribute ${name} at offset ${match.index}.` });
          continue;
        }
        identities.add(name);
        if (!value || /&(?!(?:quot|lt|gt|amp);)/.test(value) || selfClosing && attr[4] !== void 0 && cursor === attrs.length) {
          diagnostics.push({ severity: "error", message: `Malformed or unsupported identity value for ${name} at offset ${match.index}.` });
          continue;
        }
      }
      const ordinarySlash = !identity && selfClosing && attr[4] !== void 0 && cursor === attrs.length ? "/" : "";
      Object.defineProperty(attributes, name, { value: decode(value ?? "") + ordinarySlash, writable: true, enumerable: true, configurable: true });
    }
    const node = { id: attributes["data-uip-node"], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes["data-uip-node"] };
    node.parent?.children.push(node);
    nodes.push(node);
    if (["script", "style", "textarea"].includes(tag)) {
      if (identities.size) diagnostics.push({ severity: "error", message: `Managed identity is unsupported on raw-text ${tag} at offset ${match.index}.` });
      const close = new RegExp(`</${tag}\\s*>`, "ig");
      close.lastIndex = token.lastIndex;
      const ending = close.exec(source);
      if (ending) {
        node.closeStart = ending.index;
        node.end = close.lastIndex;
        token.lastIndex = close.lastIndex;
      } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags.has(tag) && !raw.endsWith("/>")) stack.push(node);
  }
  while (stack.length && optionalTags.has(stack.at(-1).tag)) implicitClose(source.length);
  for (const node of stack) diagnostics.push({ severity: "error", message: `Unclosed ${node.tag}.` });
  const ids = /* @__PURE__ */ new Set();
  for (const node of nodes) if (node.id) {
    if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: "error", message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
    ids.add(node.id);
    if (!isWrapper(node) && !isWrapper(node.parent)) diagnostics.push({ severity: "warning", message: "Layout is manual because this node has no Builder wrapper.", node: node.id });
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) for (const node of nodes) {
    delete node.id;
    delete node.attributes["data-uip-node"];
    delete node.attributes["data-uip-component"];
    node.manual = true;
  }
  return { nodes, diagnostics };
}
function isWrapper(node) {
  return Boolean(node?.attributes.class?.split(/\s+/).includes("uip-layout-item"));
}

// ../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts
var deny = () => {
  throw new Error("EXPRESSION_INVALID");
};
var unsafe = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
var exact = (x, keys) => Object.keys(x).length === keys.length && keys.every((k) => Object.hasOwn(x, k));
function expressionDependencies(declaration) {
  const ids = /* @__PURE__ */ new Set();
  let count = 0;
  if (!declaration || !exact(declaration, ["version", "expression"]) || declaration.version !== 1) deny();
  const visit = (node, depth) => {
    if (!node || typeof node !== "object" || depth > 24 || ++count > 256) deny();
    if (node.kind === "literal") {
      if (!exact(node, ["kind", "value"]) || !["string", "number", "boolean"].includes(typeof node.value) || typeof node.value === "number" && !Number.isFinite(node.value)) deny();
    } else if (node.kind === "field") {
      if (!exact(node, ["kind", "fieldId"]) || typeof node.fieldId !== "string" || !node.fieldId || unsafe.has(node.fieldId)) deny();
      ids.add(node.fieldId);
    } else if (node.kind === "operator") {
      if (!exact(node, ["kind", "operator", "args"]) || !["add", "subtract", "multiply", "divide", "concat", "eq", "lt", "gt", "and", "or", "not", "if"].includes(node.operator) || !Array.isArray(node.args) || node.args.length !== (node.operator === "not" ? 1 : node.operator === "if" ? 3 : 2)) deny();
      node.args.forEach((arg) => visit(arg, depth + 1));
    } else deny();
  };
  visit(declaration.expression, 0);
  return [...ids];
}
function expressionType(declaration, fields) {
  expressionDependencies(declaration);
  const infer = (node) => {
    if (node.kind === "literal") return typeof node.value;
    if (node.kind === "field") {
      const type = fields.get(node.fieldId);
      if (!type || !["string", "number", "boolean"].includes(type)) return deny();
      return type;
    }
    const types = node.args.map(infer), op = node.operator;
    if (op === "if") {
      if (types[0] !== "boolean" || types[1] !== types[2]) deny();
      return types[1];
    }
    if (op === "not" || op === "and" || op === "or") {
      if (types.some((t) => t !== "boolean")) deny();
      return "boolean";
    }
    if (op === "eq") {
      if (types[0] !== types[1]) deny();
      return "boolean";
    }
    if (op === "concat") {
      if (types.some((t) => t !== "string")) deny();
      return "string";
    }
    if (types.some((t) => t !== "number")) deny();
    return op === "lt" || op === "gt" ? "boolean" : "number";
  };
  return infer(declaration.expression);
}
function calculationOrder(calculations, fields) {
  const known = new Map(fields.map((f) => [f.fieldId, f.type])), byId = new Map(calculations.map((c) => [c.fieldId, c]));
  if (known.size !== fields.length || byId.size !== calculations.length) deny();
  const ordered = [], active = /* @__PURE__ */ new Set(), done = /* @__PURE__ */ new Set();
  const visit = (c) => {
    if (done.has(c.fieldId)) return;
    if (active.has(c.fieldId)) throw new Error("EXPRESSION_CYCLE");
    active.add(c.fieldId);
    if (typeof c.persist !== "boolean" || known.get(c.fieldId) !== c.type || expressionType(c.expression, known) !== c.type) deny();
    for (const id of expressionDependencies(c.expression)) {
      const next = byId.get(id);
      if (next) {
        if (c.persist && !next.persist) deny();
        visit(next);
      }
    }
    active.delete(c.fieldId);
    done.add(c.fieldId);
    ordered.push(c);
  };
  calculations.forEach(visit);
  return ordered;
}

// packages/visual-artifacts/src/form.ts
function formCalculations(metadata) {
  return (metadata.form?.fields ?? []).flatMap((f) => f.calculation ? [{ fieldId: f.datasetFieldId, type: f.type, ...f.calculation }] : []);
}
function formExpressionFields(metadata) {
  return (metadata.form?.fields ?? []).map((f) => ({ fieldId: f.datasetFieldId, key: f.key, type: f.type, required: !!f.datasetRequired }));
}

// packages/visual-artifacts/src/validation.ts
function validateArtifact(artifact, components = [], packages = [], services = []) {
  const diagnostics = [];
  const error = (message, node) => diagnostics.push({ severity: "error", message, node });
  const warning = (message, node) => diagnostics.push({ severity: "warning", message, node });
  const m = artifact.metadata;
  try {
    if (m.schemaVersion !== 1 || !["page", "component", "shell"].includes(m.kind)) error("Expected Visual Artifact schemaVersion 1 and page/component/shell kind.");
    if (!/^art_[\w-]+$/.test(m.artifactId ?? "")) error("A permanent art_ artifact identity is required.");
    if (!/^[a-z][a-z0-9-]*$/.test(m.name ?? "") || !m.displayName) error("Name and display name are required.");
    if (m.kind === "component") {
      if (!/^cmp_platform_[\w-]+$/.test(m.componentId ?? "")) error("A permanent cmp_platform_ Component identity is required.");
      if (m.route !== void 0) error("Only Pages may declare routes.");
      if (!m.public) error("A Component must declare its public interface.");
      if (packages.some((pkg) => pkg.id === m.componentId) || components.filter((c) => c.metadata.componentId === m.componentId).length > 1) error(`Duplicate Component identity: ${m.componentId}.`);
    } else if (m.kind === "shell") {
      if (m.route !== void 0 || m.componentId !== void 0) error("Shells cannot declare routes or Component identities.");
    } else if (!m.route?.startsWith("/") || m.componentId !== void 0 || m.public !== void 0) error("A Page needs a route and cannot declare a Component identity/public interface.");
    const checkContract = (contract, name) => {
      if (!contract || !["string", "number", "boolean", "object", "array"].includes(contract.type)) {
        error(`Invalid property type: ${name}.`);
        return;
      }
      if (contract.default !== void 0) {
        for (const message of valueErrors(contract.default, contract, name)) error(message);
      }
    };
    for (const [name, contract] of Object.entries(m.public?.properties ?? {})) {
      if (!/^[A-Za-z][\w]*$/.test(name)) error(`Invalid public property name: ${name}.`);
      checkContract(contract, name);
    }
    for (const [name, event] of Object.entries(m.public?.events ?? {})) for (const [key2, contract] of Object.entries(event.payload)) checkContract(contract, `${name}.${key2}`);
    if (new Set(m.public?.slots).size !== (m.public?.slots.length ?? 0)) error("Duplicate public slot names.");
    const parsed = parseSource(artifact.source);
    diagnostics.push(...parsed.diagnostics);
    if (parsed.diagnostics.some((diagnostic) => diagnostic.severity === "error")) return diagnostics;
    const nodes = new Map(parsed.nodes.filter((n) => n.id).map((n) => [n.id, n]));
    if (m.modes) {
      if (!Object.hasOwn(m.modes.overrides, m.modes.default)) error("Default mode must exist.");
      for (const overrides of Object.values(m.modes.overrides)) for (const [node, override] of Object.entries(overrides)) {
        if (!nodes.has(node)) error(`Unknown mode node: ${node}.`);
        if (Object.keys(override).some((key2) => !["visible", "editable", "required", "label", "help", "default"].includes(key2))) error("Unsupported mode override.");
        for (const key2 of ["visible", "editable", "required"]) if (override[key2] !== void 0 && typeof override[key2] !== "boolean") error(`Mode ${key2} must be boolean.`);
      }
    }
    if (Boolean(m.capabilities?.includes("form")) !== Boolean(m.form)) error("Form capability and Form definition must be declared together.");
    if (m.form) {
      if (m.kind !== "component") error("A Form must be a Platform Component.");
      if (!m.form.datasetId) warning("Configure a Dataset target before submission.");
      if (!nodes.has(m.form.node)) error("Unknown Form root node.");
      if (!/^[A-Za-z][\w]*$/.test(m.form.primaryKey)) error("Invalid Form primary key.");
      if (!m.modes) error("A Form must declare a restrictive default mode.");
      if (!m.form.submit.service || !m.form.submit.readService) error("Form write/read adapters must be explicit.");
      const keys = /* @__PURE__ */ new Set(), identities = /* @__PURE__ */ new Set(), fieldNodes = /* @__PURE__ */ new Set();
      for (const field of m.form.fields) {
        if (!/^[A-Za-z][\w-]*$/.test(field.id) || identities.has(field.id) || fieldNodes.has(field.node) || keys.has(field.key)) error("Form field identity, node and mapping must be unique.");
        identities.add(field.id);
        fieldNodes.add(field.node);
        keys.add(field.key);
        if (!nodes.has(field.node) || !/^[A-Za-z][\w]*$/.test(field.key) || !field.datasetFieldId) error("Form fields require an explicit node and stable Dataset mapping.");
        if (!["string", "number", "boolean", "object", "array"].includes(field.type)) error("Invalid Form field value type.");
        let parent2 = nodes.get(field.node)?.parent;
        while (parent2 && parent2.id !== m.form.node) parent2 = parent2.parent;
        if (!parent2) error("Mapped Form controls must belong to the Form root.");
        if (field.datasetRequired && field.required === false) error("Dataset-required validation cannot be weakened.");
        for (const overrides of Object.values(m.modes?.overrides ?? {})) if (field.datasetRequired && overrides[field.node]?.required === false) error("A mode cannot weaken Dataset-required validation.");
      }
      calculationOrder(formCalculations(m), formExpressionFields(m));
    }
    const sourceNames = /* @__PURE__ */ new Set(["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {}), ...(m.repeaters ?? []).flatMap((r) => [r.item, ...r.index ? [r.index] : []])]);
    const expression = (expr) => {
      if (typeof expr === "string") {
        if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\.[0-9]+)*$/.test(expr) || expr.split(".").some((p) => ["constructor", "prototype", "__proto__"].includes(p))) error(`Invalid named-source path: ${expr}.`);
        else if (!sourceNames.has(expr.split(".")[0])) error(`Unknown named source: ${expr}.`);
        else if (expr.startsWith("public.") && !Object.hasOwn(m.public?.properties ?? {}, expr.split(".")[1])) error(`Undeclared public input: ${expr}.`);
      } else if (expr && "version" in expr) {
        expressionType(expr, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type])));
      } else if (expr && "literal" in expr) return;
      else if (expr && ["not", "eq", "and", "or"].includes(expr.op) && Array.isArray(expr.args)) expr.args.forEach(expression);
      else error("Invalid declarative expression.");
    };
    const requireNode = (id) => {
      if (!nodes.has(id)) error(`Unknown managed node: ${id}.`, id);
      return nodes.get(id);
    };
    for (const node of parsed.nodes) {
      if (node.id && !node.manual) for (const [name, value] of Object.entries(node.attributes)) {
        try {
          validateManagedUrlAttribute(node.tag, name.toLowerCase(), value);
        } catch (cause) {
          error(cause instanceof Error ? cause.message : String(cause), node.id);
        }
      }
      const id = node.attributes["data-uip-component"];
      if (node.tag === "uip-page" || node.attributes["data-uip-page"]) error("Pages cannot be nested.", node.id);
      if (node.tag === "uip-slot" && !m.public?.slots.includes(node.attributes.name ?? "")) error(`Undeclared public slot: ${node.attributes.name}.`, node.id);
      if (!id) {
        if (node.tag.startsWith("uib-")) warning(`Manual package element ${node.tag} has no permanent Component reference.`, node.id);
        continue;
      }
      const nested = components.filter((c) => c.metadata.componentId === id);
      const pkg = packages.filter((p) => p.id === id);
      if (nested.length + pkg.length !== 1) {
        error(`Unknown or ambiguous Component dependency: ${id}.`, node.id);
        continue;
      }
      if (nested[0] && node.tag !== "uip-component") error("Platform Component instances use uip-component.", node.id);
      if (node.children.length && node.children.some((child) => !child.attributes.slot)) warning("Component children should use declared named slots.", node.id);
      let settings = {};
      try {
        settings = JSON.parse(node.attributes["data-uip-settings"] ?? "{}");
        if (!settings || Array.isArray(settings) || typeof settings !== "object") throw new Error();
      } catch {
        error("Component settings must be a JSON object.", node.id);
        continue;
      }
      if (nested[0]) {
        const api = nested[0].metadata.public;
        for (const key2 of Object.keys(settings)) if (!Object.hasOwn(api.properties, key2)) error(`Unknown public property: ${key2}.`, node.id);
        for (const [key2, contract] of Object.entries(api.properties)) {
          if (!(m.bindings ?? []).some((b) => b.node === node.id && b.target === `property:${key2}`)) for (const message of valueErrors(settings[key2] ?? contract.default, contract, key2)) error(message, node.id);
        }
        for (const child of node.children) if (!api.slots.includes(child.attributes.slot ?? "")) error(`Unknown public slot: ${child.attributes.slot}.`, node.id);
      } else {
        if (pkg[0].tagName !== node.tag) error("Component tag does not match its installed identity.", node.id);
        pkg[0].activationIssues?.forEach((issue) => error(issue, node.id));
        const definitions = pkg[0].definition?.builder.settings;
        if (pkg[0].definition) {
          for (const child of node.children) if (!pkg[0].definition.runtime.slots.some((slot) => slot.name === (child.attributes.slot || "default"))) error(`Unknown installed Package slot: ${child.attributes.slot}.`, node.id);
        }
        if (pkg[0].definition) settings = readPackageSettings(pkg[0].definition, node.attributes, settings);
        else settings = readLegacyPackageSettings(pkg[0], node.attributes, settings);
        if (pkg[0].definition && !(m.bindings ?? []).some((binding) => binding.node === node.id && binding.target.startsWith("setting:"))) packageSettingErrors(pkg[0].definition, settings).forEach((message) => error(message, node.id));
        for (const [key2, value] of Object.entries(settings)) {
          const contract = definitions?.[key2];
          if (definitions && !contract) error(`Unknown installed Package setting: ${key2}.`, node.id);
          else if (contract) valueErrors(value, contract, key2).forEach((message) => error(message, node.id));
          else if (legacyPackageSettingContracts(pkg[0])[key2]) valueErrors(value, legacyPackageSettingContracts(pkg[0])[key2], key2).forEach((message) => error(message, node.id));
          else if (![...pkg[0].properties ?? [], ...pkg[0].attributes ?? []].includes(key2)) error(`Package setting is not declared: ${key2}.`, node.id);
        }
      }
    }
    for (const binding of m.bindings ?? []) {
      const node = requireNode(binding.node);
      expression(binding.value);
      if (!/^(text|attribute:[\w:-]+|property:[\w]+|setting:[\w]+|style:--[\w-]+)$/.test(binding.target)) error(`Unsupported binding target: ${binding.target}.`, binding.node);
      const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
      if (nested && (!binding.target.startsWith("property:") || !Object.hasOwn(nested.metadata.public?.properties ?? {}, binding.target.slice(9)))) error("Nested Components expose only declared public properties.", binding.node);
      const pkg = packages.find((p) => p.id === node?.attributes["data-uip-component"]);
      if (pkg && binding.target.startsWith("setting:") && !pkg.definition?.builder.settings[binding.target.slice(8)]) error("Unknown installed Package setting binding.", binding.node);
    }
    for (const condition of m.conditions ?? []) {
      requireNode(condition.node);
      expression(condition.when);
      if (typeof condition.when !== "string" && "version" in condition.when && expressionType(condition.when, new Map(formExpressionFields(m).map((f) => [f.fieldId, f.type]))) !== "boolean") error("Versioned conditions must return Boolean values.", condition.node);
    }
    for (const repeater of m.repeaters ?? []) {
      requireNode(repeater.node);
      expression(repeater.collection);
      if (!/^[A-Za-z]\w*$/.test(repeater.item) || ["public", "local", "route", "context", "event", ...Object.keys(m.sources ?? {})].includes(repeater.item)) error("Repeater alias conflicts with a named source.");
    }
    const action = (item) => {
      if (item.kind === "set") {
        if (!Object.hasOwn(m.state ?? {}, item.state)) error(`Unknown local state: ${item.state}.`);
        expression(item.value);
      } else if (item.kind === "emit") {
        const contract = m.public?.events[item.event];
        if (!contract) error(`Undeclared public event: ${item.event}.`);
        else {
          for (const [key2, field] of Object.entries(contract.payload)) if (field.required && !Object.hasOwn(item.payload ?? {}, key2)) error(`Public event ${item.event} requires payload field ${key2}.`);
          for (const key2 of Object.keys(item.payload ?? {})) if (!Object.hasOwn(contract.payload, key2)) error(`Unknown public event payload field: ${key2}.`);
        }
        Object.values(item.payload ?? {}).forEach(expression);
      } else if (item.kind === "navigate") expression(item.to);
      else if (item.kind === "service") {
        if (!services.includes(item.reference)) warning(`Service reference is supported but has no executable adapter: ${item.reference}.`);
        if (item.input) expression(item.input);
      } else if (item.kind === "workflow") {
        if (!item.workflowId || typeof item.workflowId !== "string") error("Permanent Workflow identity is required.");
        expression(item.primaryRecordId);
        if (item.resultState && !Object.hasOwn(m.state ?? {}, item.resultState)) error("Workflow result state must be declared.");
      } else if (item.kind === "record-delete") {
        if (item.version !== 1 || !item.datasetId || typeof item.datasetId !== "string" || !item.primaryFieldId || typeof item.primaryFieldId !== "string" || Object.keys(item).some((key2) => !["kind", "version", "datasetId", "primaryFieldId", "recordId", "resultState"].includes(key2))) error("Invalid versioned single-record delete declaration.");
        expression(item.recordId);
        if (typeof item.resultState !== "string" || !item.resultState || !m.state || typeof m.state !== "object" || Array.isArray(m.state) || !Object.hasOwn(m.state, item.resultState)) error("Record delete result state must be explicitly declared.");
      } else if (item.kind !== "function") error("Unknown action kind.");
    };
    for (const event of m.events ?? []) {
      const node = requireNode(event.node);
      const nested = components.find((c) => c.metadata.componentId === node?.attributes["data-uip-component"]);
      if (nested && !nested.metadata.public?.events[event.event]) error(`Undeclared nested public event: ${event.event}.`, event.node);
      event.actions.forEach(action);
    }
    m.onLoad?.forEach(action);
    for (const [name, source] of Object.entries(m.sources ?? {})) if (source.kind === "service" && !services.includes(source.reference ?? "")) warning(`Named source ${name} is supported but has no executable adapter: ${source.reference}.`);
    for (const id of Object.keys(m.layout ?? {})) if (!isWrapper(requireNode(id))) error("Declarative layout requires a Builder wrapper.", id);
    const workflowIds = [...m.onLoad ?? [], ...(m.events ?? []).flatMap((event) => event.actions)].flatMap((action2) => action2.kind === "workflow" ? [action2.workflowId] : []);
    for (const id of m.dependencies ?? []) if (!components.some((c) => c.metadata.componentId === id) && !packages.some((p) => p.id === id) && !services.includes(id) && !workflowIds.includes(id)) error(`Unknown dependency: ${id}.`);
    const visit = (current, path10) => {
      const id = current.metadata.componentId ?? current.metadata.artifactId;
      if (path10.includes(id)) {
        error(`Component dependency cycle: ${[...path10, id].join(" \u2192 ")}.`);
        return;
      }
      for (const ref of /* @__PURE__ */ new Set([...componentReferences(current.source), ...current.metadata.dependencies ?? []])) {
        const next = components.find((c) => c.metadata.componentId === ref);
        if (next) visit(next, [...path10, id]);
      }
    };
    visit(artifact, []);
  } catch (cause) {
    error(`Invalid artifact structure: ${cause instanceof Error ? cause.message : String(cause)}`);
  }
  return diagnostics;
}
function componentReferences(source) {
  return [...new Set(parseSource(source).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
}

// packages/visual-artifacts/src/runtime-read-admission.ts
async function withRuntimeGraphRead(ownerRoot, capture2, options = {}) {
  return withRoleBundleGraph(ownerRoot, capture2, { ...options, recovery: "refuse" });
}

// packages/visual-artifacts/src/revision-vite.ts
function revisionVisualArtifacts(options) {
  const virtualId = "virtual:uip-visual-artifacts";
  const pageId = "virtual:uip-visual-page";
  const watchId = "virtual:uip-visual-watch";
  let projectRoot = options.applicationRoot ?? process.cwd();
  let boundary, viteServer;
  let compositionAvailable = false;
  let refresh;
  const pageOwner = () => path8.join(options.applicationRoot ?? projectRoot, options.applicationRoot ? "src/pages" : "src");
  const managedRoots = () => [pageOwner(), path8.join(options.applicationRoot ?? projectRoot, "shells"), options.componentsRoot].filter((root2) => !!root2);
  return {
    name: "ui-platform-visual-artifacts",
    enforce: "pre",
    configResolved(config) {
      projectRoot = config.root;
      compositionAvailable = config.plugins.some((plugin2) => plugin2.name === "ui-platform-application-composition");
    },
    async resolveId(id, importer, resolveOptions) {
      boundary?.guard(id, importer);
      if (id === watchId) return "\0" + watchId;
      if (resolveOptions.scan && /(?:\.visual\.json|\.html|\.css|\.functions(?:\.ts)?)(?:\?|$)/.test(id)) return { id, external: true };
      if (id === virtualId) return `\0${virtualId}`;
      if (id === pageId) {
        if (!importer || importer.startsWith("\0")) throw new Error("A Visual Page entry location is required.");
        return `\0${pageId}:${encodeURIComponent(path8.join(path8.dirname(importer.split("?")[0]), "page.visual.json"))}.js`;
      }
      if (!id.startsWith("\0") && !id.startsWith("virtual:")) {
        const resolved = await this.resolve(id, importer, { skipSelf: true });
        if (resolved && !importer?.startsWith("\0virtual:uip-")) await assertNotVisualRole(resolved.id, managedRoots());
      }
    },
    async load(id) {
      if (id === "\0" + watchId) return runtimeRefreshClient;
      const pageFile = id.startsWith(`\0${pageId}:`) ? decodeURIComponent(id.slice(`\0${pageId}:`.length, -3)) : void 0;
      if (pageFile) {
        const relative = path8.relative(pageOwner(), pageFile);
        if (relative === ".." || relative.startsWith(".." + path8.sep) || path8.isAbsolute(relative)) throw new Error("The Page entry is outside its authoritative source collection.");
      }
      if (id !== `\0${virtualId}` && !pageFile) {
        if (!id.startsWith("\0")) await assertNotVisualRole(id, managedRoots());
        return;
      }
      if (!pageFile && compositionAvailable && options.applicationRoot && !options.componentsRoot) {
        const code = "export { packages } from 'virtual:uip-application-composition'; export const components=[];";
        return viteServer ? runtimeRefreshModule(watchId, id, code) : code;
      }
      return withRuntimeGraphRead(options.componentsRoot ?? options.applicationRoot ?? projectRoot, async () => {
        if (options.componentsRoot) await recoverRoleBundleRoot(options.componentsRoot, { recovery: "refuse" });
        if (pageFile) await recoverRoleBundleRoot(pageOwner(), { recovery: "refuse" });
        const helpers2 = boundary ??= new VisualHelperBoundary(async (request, importer) => {
          if (/^(?:https?:|data:|blob:)/.test(request)) throw new Error("Visual functions cannot load unverified remote helper modules.");
          const resolved = await this.resolve(request, importer, { skipSelf: true });
          if (!resolved) throw new Error(`Non-Visual helper could not be resolved: ${request}`);
          await assertNotVisualRole(resolved.id, managedRoots());
          return resolved.id;
        }, (id2) => {
          const node = viteServer?.moduleGraph.getModuleById(id2);
          return node ? { code: node.transformResult?.code, imports: [...node.importedModules].map((child) => child.id).filter((id3) => !!id3) } : void 0;
        });
        const watch = (file) => {
          if (viteServer) viteServer.watcher.add(file);
          else this.addWatchFile(file);
        };
        const revision = new RuntimeRevision(watch);
        const imports = [], components = [], packages = [];
        const sourceComponents = [], sourcePackages = [];
        const captured = [];
        const walk = async (dir) => {
          for (const item of await revision.directory(dir)) {
            if (item.name.startsWith(".") || item.isSymbolicLink()) continue;
            const file = path8.join(dir, item.name);
            if (item.isDirectory()) await walk(file);
            else if (item.name.endsWith(".visual.json")) {
              const artifact = await revision.visual(file, options.componentsRoot);
              const metadata = artifact.metadata;
              if (metadata.kind !== "component") throw new Error(`Only Components belong in ${options.componentsRoot}.`);
              watch(file);
              const index = captured.length;
              captured.push(artifact);
              imports.push(`import * as f${index} from 'uip-captured-function:${index}';`);
              sourceComponents.push(artifact);
              components.push(runtimeLiteral(artifact, index));
            }
          }
        };
        if (options.componentsRoot) await walk(options.componentsRoot);
        const manifests = [...options.packageManifests ?? []];
        if (options.applicationRoot) {
          const file = path8.join(options.applicationRoot, "package.json");
          watch(file);
          const pkg = JSON.parse(await revision.text(file));
          const manifestFile = path8.join(options.applicationRoot, "app.manifest.json");
          watch(manifestFile);
          const app = JSON.parse(await revision.text(manifestFile).catch((error) => {
            if (error.code === "ENOENT") return "{}";
            throw error;
          }));
          for (const name of Object.keys(pkg.dependencies ?? {})) {
            if (app.packages?.[name]?.enabled === false) continue;
            const candidate = path8.join(options.applicationRoot, "node_modules", name, "ui.component.json");
            try {
              await readFile2(candidate);
              manifests.push(candidate);
            } catch (error) {
              if (error.code !== "ENOENT") throw error;
            }
          }
        }
        for (const file of manifests) {
          watch(file);
          const manifest = JSON.parse(await revision.text(file));
          const packageJson = JSON.parse(await revision.text(path8.join(path8.dirname(file), "package.json")));
          const require2 = createRequire(path8.join(path8.dirname(file), "package.json"));
          for (const entry of manifest.components ?? []) {
            if (!entry.module) continue;
            const module = path8.resolve(path8.dirname(file), entry.module).replaceAll("\\", "/");
            require2.resolve(module);
            imports.push(`import ${JSON.stringify(module)};`);
            const pkg = { ...entry, id: entry.identity?.componentId ?? entry.id ?? `${packageJson.name}:${entry.tagName}`, definition: entry.identity && entry.builder && entry.runtime ? entry : void 0 };
            packages.push(JSON.stringify(pkg));
            sourcePackages.push(pkg);
          }
        }
        const seen = /* @__PURE__ */ new Set();
        for (const component of sourceComponents) {
          const id2 = component.metadata.componentId;
          if (seen.has(id2)) throw new Error(`Duplicate Component identity: ${id2}.`);
          seen.add(id2);
          const errors = validateArtifact(component, sourceComponents, sourcePackages).filter((d) => d.severity === "error");
          if (errors.length) throw new Error(`${component.metadata.name}: ${errors.map((d) => d.message).join("\n")}`);
        }
        let pageExport = "";
        if (pageFile) {
          const artifact = await revision.visual(pageFile, pageOwner());
          if (artifact.metadata.kind !== "page") throw new Error("Expected a Page entry.");
          if (artifact.metadata.shellId) {
            if (!compositionAvailable) throw new Error("A composed Page requires the revision-aware applicationComposition plugin.");
            const code2 = `import { definition, platformComponents, packages, assetUrls, runtimeRevision } from 'virtual:uip-application-composition';
export const page=definition.pages.find(page=>page.metadata.artifactId===${JSON.stringify(artifact.metadata.artifactId)});
if(!page)throw new Error('The Page changed while its composed revision was loading. Reload the graph.');
export const components=platformComponents; export { definition as composition, packages, assetUrls, runtimeRevision };`;
            return viteServer ? runtimeRefreshModule(watchId, id, code2) : code2;
          }
          const errors = validateArtifact(artifact, sourceComponents, sourcePackages).filter((d) => d.severity === "error");
          if (errors.length) throw new Error(errors.map((d) => d.message).join("\n"));
          const index = captured.length;
          captured.push(artifact);
          imports.push(`import * as f${index} from 'uip-captured-function:${index}';`);
          pageExport = `export const page=${runtimeLiteral(artifact, index)};`;
        }
        const code = await revision.finish(`${imports.join("\n")}
export const components=[${components.join(",")}];
export const packages=[${packages.join(",")}];
export const composition=undefined; export const assetUrls={};
${pageExport}
registerManagedVisualGraph(runtimeRevision,[...components${pageFile ? ",page" : ""}]);`, captured, helpers2);
        return viteServer ? runtimeRefreshModule(watchId, id, code) : code;
      }, { recovery: "refuse" });
    },
    transform(code, id) {
      if (boundary?.isHelper(id)) {
        boundary.check(code, id);
        return;
      }
      const entry = revisionPageEntry(code, id);
      if (entry) return { code: entry, map: null };
    },
    configureServer(server) {
      viteServer = server;
      runtimeReaderServer(server, projectRoot, managedRoots());
      if (options.componentsRoot) server.watcher.add(options.componentsRoot);
      refresh = runtimeRevisionRefresh(server, (file) => managedRoots().some((root2) => file.replaceAll("\\", "/").startsWith(root2.replaceAll("\\", "/") + "/")) || !!boundary?.isHelper(file) || !!options.packageManifests?.some((name) => name.replaceAll("\\", "/") === file.replaceAll("\\", "/")) || ["package.json", "app.manifest.json"].some((name) => file.replaceAll("\\", "/") === path8.join(options.applicationRoot ?? projectRoot, name).replaceAll("\\", "/")), (file) => !boundary?.isHelper(file) && managedRoots().some((root2) => file.replaceAll("\\", "/").startsWith(root2.replaceAll("\\", "/") + "/")) && visualExtensions.some((extension) => file.endsWith(extension)));
    },
    hotUpdate(context) {
      if (/(?:^|\/)\.uib(?:\/|$)/i.test(context.file.replaceAll("\\", "/"))) return [];
      if (refresh?.relevant(context.file)) {
        refresh.refresh(context.file);
        const sentinel = this.environment.moduleGraph.getModuleById("\0" + watchId);
        return sentinel ? [sentinel] : [];
      }
    },
    closeBundle() {
      refresh?.close();
    }
  };
}

// tests/runtime-host/host-read.test.ts
var parent = path9.resolve("evidence/v1-recovery-free-host-20261028/disposable-fixtures");
var traces = [];
var originalKill = process.kill;
process.kill = (() => {
  throw Error("PID_PROBE_FORBIDDEN");
});
test.after(async () => {
  process.kill = originalKill;
  await fs2.writeFile(process.env.HOST_TRACE_FILE, JSON.stringify(traces, null, 2));
});
async function fixture(run) {
  await fs2.mkdir(parent, { recursive: true });
  const root2 = await fs2.mkdtemp(path9.join(parent, "host-read-"));
  const app = path9.join(root2, "app"), components = path9.join(root2, "components"), directory = path9.join(app, "src/pages/one"), host = path9.join(root2, "host");
  for (const d of [components, directory, host]) await fs2.mkdir(d, { recursive: true });
  const files = { "page.html": '<section data-uip-node="content"><h1 data-uip-node="heading">Disposable website</h1></section>', "page.css": "", "page.visual.json": JSON.stringify({ schemaVersion: 1, artifactId: "art_website", kind: "page", name: "one", displayName: "One", route: "/one" }), "page.functions.ts": "export {};", "page.fixtures.json": "{}" };
  for (const [n, v] of Object.entries(files)) await fs2.writeFile(path9.join(directory, n), v);
  await fs2.writeFile(path9.join(app, "package.json"), "{}");
  await fs2.writeFile(path9.join(app, "app.manifest.json"), '{"appId":"disposable-owner","packages":{}}');
  configure(root2);
  const file = path9.join(directory, "page.visual.json"), pageRoot = path9.join(app, "src/pages");
  const f = { root: root2, app, components, directory, host, file, pageRoot, files };
  try {
    await run(f);
    for (const [n, v] of Object.entries(files)) assert.equal(await fs2.readFile(path9.join(directory, n), "utf8"), v);
  } finally {
    traces.push({ root: root2, events: [...events] });
    assert.ok(root2.startsWith(parent + path9.sep + "host-read-"));
    await fs2.rm(root2, { recursive: true, force: true });
  }
}
async function pending(root2) {
  const file = path9.join(root2, ".uib/transactions", storageKey("test-owned-journal"), "pending.json");
  await fs2.mkdir(path9.dirname(file), { recursive: true });
  await fs2.writeFile(file, "TEST-OWNED-NOT-A-RECOVERABLE-JOURNAL");
  return file;
}
function noJournalRead(file) {
  assert.ok(!events.some((e) => e.op === "readFile" && e.file === file));
  assert.ok(!events.some((e) => ["rename", "link", "chmod"].includes(e.op)));
  assert.ok(events.filter((e) => e.op === "rm").every((e) => e.file.endsWith(".lock")));
}
function plugin(f) {
  const p = revisionVisualArtifacts({ applicationRoot: f.app, componentsRoot: f.components, packageManifests: [] });
  p.configResolved({ root: f.host, plugins: [] });
  return p;
}
var helpers = () => new VisualHelperBoundary(async () => {
  throw Error("UNEXPECTED_HELPER");
});
test("actual loader captures one Page with explicit refusal and no operational dependencies", () => fixture(async (f) => {
  const p = plugin(f);
  const code = await p.load.call({ addWatchFile() {
  } }, "\0virtual:uip-visual-page:" + encodeURIComponent(f.file) + ".js");
  assert.ok(code.includes("Disposable website"));
  assert.ok(code.includes("runtimeRevision"));
  assert.ok(!code.includes("TEST-OWNED"));
}));
test("actual Component and Page root admission refuses pending state without journal reads", () => fixture(async (f) => {
  for (const root2 of [f.components, f.pageRoot]) {
    const journal = await pending(root2);
    events.length = 0;
    await assert.rejects(() => plugin(f).load.call({ addWatchFile() {
    } }, "\0virtual:uip-visual-page:" + encodeURIComponent(f.file) + ".js"), (e) => e.code === "source.recovery-required");
    assert.equal(await fs2.readFile(journal, "utf8"), "TEST-OWNED-NOT-A-RECOVERABLE-JOURNAL");
    noJournalRead(journal);
    await fs2.rm(path9.join(root2, ".uib/transactions"), { recursive: true });
  }
}));
test("RuntimeRevision initial role read refuses recovery, and finish recheck also refuses", () => fixture(async (f) => {
  let journal = await pending(f.pageRoot);
  events.length = 0;
  await assert.rejects(() => new RuntimeRevision(() => {
  }).visual(f.file, f.pageRoot), (e) => e.code === "source.recovery-required");
  noJournalRead(journal);
  await fs2.rm(path9.join(f.pageRoot, ".uib/transactions"), { recursive: true });
  const revision = new RuntimeRevision(() => {
  });
  await revision.visual(f.file, f.pageRoot);
  journal = await pending(f.pageRoot);
  events.length = 0;
  await assert.rejects(() => revision.finish("", [], helpers()), (e) => e.code === "source.recovery-required");
  noJournalRead(journal);
}));
test("foreign graph lock stays busy without callback, PID probe or cleanup; cancellation preserved", () => fixture(async (f) => {
  const lock = path9.join(f.components, ".uib/locks", storageKey("visual-runtime-graph-v1") + ".lock");
  await fs2.mkdir(path9.dirname(lock), { recursive: true });
  await fs2.writeFile(lock, "7654321");
  events.length = 0;
  let calls = 0;
  await assert.rejects(() => withRuntimeGraphRead(f.components, async () => {
    calls++;
  }, { timeoutMs: 40 }), (e) => e.code === "source.busy");
  assert.equal(calls, 0);
  assert.equal(await fs2.readFile(lock, "utf8"), "7654321");
  assert.ok(!events.some((e) => e.op === "rm" || e.op === "readFile" && e.file.endsWith(".recovery")));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => withRuntimeGraphRead(f.components, async () => {
    calls++;
  }, { signal: controller.signal }));
  assert.equal(calls, 0);
}));
test("actual Page entry outside Application is refused before any graph acquisition", () => fixture(async (f) => {
  events.length = 0;
  await assert.rejects(() => plugin(f).load.call({}, "\0virtual:uip-visual-page:" + encodeURIComponent(path9.join(f.host, "outside.visual.json")) + ".js"), /outside its authoritative/);
  assert.equal(events.length, 0);
}));
