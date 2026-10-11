# V1 verification report

This report covers the implementation in `visual-artifact-platform-component-v1.md`.

**VISUAL ARTIFACT + PLATFORM COMPONENT V1 READY FOR REVIEW**

## Automated evidence

- `npm run build`: passed; builds shared libraries, Platform browser entries and API.
- `npm run typecheck`: passed.
- `npx tsc --noEmit -p references/visual-artifacts/tsconfig.json`: passed.
- `npx vitest run tests/visual-artifacts.test.ts tests/visual-artifacts-server.test.ts`:
  23 tests passed, including real filesystem operations and real API/package bundling.
- `npm run test:visual-browser`: nine real browser checks passed against Microsoft Edge,
  including the live editor preview API and a separately built `/customers` application.
- `npm run check:editor-contracts`: all 106 checks passed across 13 test files.
- `node scripts/check-editor-production.mjs`: passed; production output contains no
  fixture selector, session client or editor transport.
- Final `npm test -- --maxWorkers=1`: all 243 tests passed across 40 files.
- `git diff --check`: passed. The adjacent changed-file inventory lists all 61
  added or modified source, configuration, reference, test and documentation files.

Browser checks cover real Card/Heading rendering, property binding, nested Components,
repeaters, condition/state behavior, repeated event forwarding, public payloads,
private event suppression, actual slot projection, selector/instance CSS isolation,
the existing Dataset client adapter, optional named functions, source insertion/save,
automatic clean reload, dirty conflict retention and disabled stale saves. The built
application also verifies desktop/mobile column changes and actual routed rendering.

Service/model checks cover parsing, exact unrelated-source preservation, serialization,
stable IDs/wrappers/reordering, shared Page/Component creation and reopen, atomic text
saves, concurrent stale writes, malformed metadata repair, identity mutation rejection,
manual discovery, duplicate identities, missing files, known-reference deletion blocks,
path/role restrictions, installed Card identity/current settings, Page nesting and
route restrictions, dependency cycles, private properties, slots, simple constraints,
named paths/conditions and missing service-adapter diagnostics.

## Environment observations

The restricted Windows process environment initially prevented four existing server
tests from starting: `tsx` failed in `os.userInfo()` with `uv_os_get_passwd ENOMEM`.
The same two server-test files passed all six tests outside that restriction.
An existing watcher rename test also encountered a transient Windows `EPERM` during
the restricted contract run. No product workaround was added for either condition.

The Vite production build emits a size advisory for the existing large main UI chunk.
It does not block the build. Preview package bundles are compiled on request in V1;
incremental caching and broader performance work remain deferred.

The Dataset browser example proves the real client/transport adapter using deterministic
HTTP responses. It does not claim a live production Dataset connection. Existing
protected DOE/ORM integration tests cover the downstream authority path.

## Review scope and deviations

- HTML plus declarative companion files is the new managed source convention;
  existing arbitrary TS/TSX Pages remain untouched and source-editable.
- Native shadow roots enforce instance and nested selector isolation; inherited web
  theme properties retain normal semantics.
- A small named-path/boolean evaluator is shared by preview/application runtime;
  the existing server foundation compiler is not imported into browser execution.
- Legacy Package entries keep their existing registry identities until their packages
  supply canonical definitions. Card consumes its complete canonical definition.
- Applications opt into the source-discovery Vite plugin; no existing build configs
  are rewritten. The reference application demonstrates that normal build path.
- Multi-file UI saves commit/check one file at a time and retain any remaining dirty
  work on failure. Arbitrary external writes during the atomic rename remain a normal
  optimistic-concurrency limitation.
- Preview supports small named TypeScript functions; arbitrary imported function
  dependencies require the application's normal bundler.

No publication/versioning, Form integration, Workflow/Trigger editor integration,
application scope, promotion or broad UI Base migration was undertaken.
