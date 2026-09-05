# UIB Service Contract Specification

**Status:** Normative v1 specification
**Version:** 1.0.0
**Applies to:** UIB platform services resolved through the Service Registry

---

## 1. Purpose

This specification defines how UIB services are identified, registered, versioned, and resolved.

Packages MUST consume platform capabilities through service contracts rather than importing another package's private implementation.

## 2. Service Keys

Services MUST be identified by stable string keys.

Examples:

```text
settings
packages
components
templates
events
data
logging
routing
jobs
files
```

Service keys SHOULD use lowercase kebab-case or simple lowercase words.

## 3. Contract Versions

Every service registration MUST declare a contract version. The initial baseline version is:

```text
1.0.0
```

Service requirement ranges MUST use semver-compatible syntax. The initial required range form is:

```text
^1.0.0
```

The platform MAY support additional semver range syntax later.

## 4. Service Registration

A service registration MUST include:

- `key`: the service key.
- `version`: the implemented contract version.
- `service`: the runtime service implementation.

A service registration MAY include:

- `description`;
- `capabilities`;
- `ownerPackage`;
- `metadata`.

## 5. Service Resolution

Consumers MUST resolve services through the Service Registry by key and optional version range.

Conceptually:

```ts
const settings = services.get("settings", "^1.0.0");
```

The registry MUST reject missing services.

The registry MUST reject services whose registered version is not compatible with the requested range.

## 6. Replacement Policy

The registry MUST reject duplicate service keys by default.

Controlled replacement MAY be allowed by an explicit registration option. Replacement MUST preserve the same validation rules as initial registration.

## 7. Runtime Stack

The initial Service Registry implementation is TypeScript for the current UI Platform runtime stack.

It MUST avoid dependencies on browser-only APIs so it can be used by server, CLI, build-time discovery, and tests.

## 8. Error Model

The platform SHOULD expose typed errors for:

- invalid service keys;
- invalid contract versions;
- duplicate service registration;
- missing service;
- incompatible service version.

## 9. Proof Of Use

The first implementation MUST include a proof-of-use test that:

- registers an in-memory fake service;
- resolves it by string key;
- validates a compatible `^1.0.0` request;
- rejects an incompatible request;
- validates a fixture package manifest requiring the service.
