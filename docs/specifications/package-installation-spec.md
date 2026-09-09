# UIB Package Installation Specification

**Status:** Normative v1 specification
**Version:** 1.0.0

## Purpose

This specification defines the first managed package acquisition and installation workflow. It keeps package acquisition, installation, discovery, application enablement, and runtime activation as separate operations.

## Unified Acquisition Surface

The Package Manager MUST present one acquisition surface for package archives and URLs. A user MAY upload a `.zip`, `.tgz`, or `.tar.gz` UIB package archive, or enter a GitHub or npm URL/specifier. The platform MUST identify the source type before acquisition and show the inferred path in the UI.

GitHub repository URLs select the Foundation Source workflow. npm URLs and npm specifiers select the npm package workflow. Uploaded archives select the manual UIB extension-package workflow. An unrecognized URL MUST fail with a clear correction message rather than guessing silently.

## First Supported Source

The first managed source is a local package folder or ZIP archive. The source MUST contain a package.json file and a valid UIB package manifest named according to the package manifest specification.

## Installation Scopes

A package MAY be installed at either scope:

- **Platform:** installed under the platform package workspace and available to applications.
- **Application:** installed under the application packages folder and portable with that application.

Platform installation MUST NOT enable the package for any application. Application installation MUST NOT automatically change the app manifest. Enablement remains an explicit app manifest operation.

## Validation and Staging

The installer MUST:

1. Validate that the source exists.
2. Extract ZIP archives into a temporary staging directory.
3. Reject archive paths that are absolute or escape the staging directory.
4. Validate package.json and the UIB package manifest.
5. Require package names and versions to match between the two files.
6. Copy only after validation succeeds.
7. Refuse to overwrite an existing package at the same scope.
8. Remove temporary staging files after success or failure.

## Current API

- POST /api/packages/acquire accepts a multipart upload (`packageFile`) or a URL (`sourceUrl`) for platform acquisition.
- POST /api/apps/:key/packages/acquire accepts the same inputs for app-scoped extension packages.

- POST /api/packages/install installs a local folder or ZIP at platform scope.
- POST /api/apps/:key/packages installs a local folder or ZIP at application scope.

Both endpoints accept JSON with a sourcePath field. Installation returns the package name, version, scope, installed root, manifest path, and source type.

## Separate Foundation Sources

Shared runtime workspaces such as UI-Base are not UIB extension packages. They use their native package namespace and package metadata, and are managed through the Foundation Source Specification. A foundation source MUST NOT be treated as a UIB extension merely because it provides packages to an application.

## npm Extension Source

npm sources are acquired with `npm pack --ignore-scripts` into a temporary directory, then run through the same archive validation and staging process as a manual upload. The acquired package MUST still satisfy the official `@uib/*` name and package-manifest requirements.

## Later Extension Sources

A UIB package catalog is a future source adapter. It SHOULD reuse the same validation, staging, installation, history, and activation pipeline.

## Provenance

Platform installations are recorded in data/package-history.jsonl. Application installations are recorded in the application history file. Source provenance MUST NOT be stored as application configuration or credentials in app.manifest.json.
