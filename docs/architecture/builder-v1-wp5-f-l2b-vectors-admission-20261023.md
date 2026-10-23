# L2-B canonicalization vectors and pre-execution admission

Recorded before model/test execution. Scope: authored data and memory bytes only. Model path `src/preview-contract-model/model.ts`; tests `tests/preview-contract-model/model.test.ts`; runner `scripts/verify-preview-contract-model.mjs`. No production import or caller is added. Typed source runs using Node's built-in type stripping, not workspace build configuration.

Canonical data rules v1: plain JSON objects (Object.prototype or null), own enumerable string data properties only; reject accessors, symbols, nonenumerable keys, cycles, sparse arrays, unsupported values/prototypes, nonfinite numbers and unsafe integer numbers. Object keys sort by JavaScript UTF-16 code-unit order. Strings use JSON.stringify escaping, preserving Unicode without normalization; numbers use JSON.stringify (negative zero becomes zero). Array order is preserved. No undefined or duplicate identities. Structured manifest set fields sort by canonical identity; semantic order is explicit via route/region ordinal and remains in bytes. No implicit locale sorting. Digests are SHA-256 of exact UTF-8 canonical text, lowercase hex with `sha256:` prefix.

Authored canonicalization vectors (literal expected results, fixed before hashing):

| Input | Exact canonical UTF-8 text | Known SHA-256 where supplied |
| --- | --- | --- |
| empty object | `{}` | `44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` |
| null | `null` | `74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b` |
| object inserted b=2, a=1 | `{"a":1,"b":2}` | `43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777` |
| nested keys z=[true,null,"x"], a={y:0} | `{"a":{"y":0},"z":[true,null,"x"]}` | Exact text assertion; hash equality separately checked with independent builtin SHA-256 |
| reordered object keys | Same canonical bytes as preceding equivalent vector | Same digest |
| ordered array [2,1] | `[2,1]` | Must differ from [1,2] |

Manifest vectors use authored two-role/dependency/membership/package/route/theme metadata and exact memory resources. Tests assert permutation-invariance for set fields, order sensitivity via route ordinals, digest change for package byte changes under identical version, rejection of missing/duplicate/foreign membership and unsupported fields. Binding/epoch never enter content hash; each capture envelope separately pins them and deep-copies bytes.

Exact execution admission: one test entry named above, imports only the model and builtins `node:test`, `node:assert/strict`, `node:crypto`. Model imports only `node:crypto`; no transitive product packages, setup hooks, network, storage, browser, authority providers or schedulers. Runner imports only Node fs/path/crypto/child_process, reads these exact files, records hashes, and invokes `node --experimental-strip-types --test --test-concurrency=1 tests/preview-contract-model/model.test.ts` with zero retries and NODE_OPTIONS/NODE_PATH removed. It does not invoke npm scripts, test discovery, tsconfig/Vite/Vitest, prebuild hooks or normal launchers. Inspect final actual imports and runner text before execution; preserve source admission in evidence. Runner filesystem writes are limited to new increment evidence; child executes only the single test file.

All clock/health/retention/byte/resource/concurrency values in tests are explicitly authored test inputs, not production defaults. Missing or invalid limits reject. The model creates no intervals or delayed callbacks. Real durability, writer completeness, policy evaluation, remote revocation timing, browser visibility, protected source coherence and check-to-send race elimination remain unsupported.
