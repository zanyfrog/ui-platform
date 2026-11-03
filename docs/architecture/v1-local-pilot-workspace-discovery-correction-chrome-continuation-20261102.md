# Workspace Discovery Correction Acceptance Review Gate — Chrome continuation

2026-11-02. **Normal Chrome confirms the corrected native-installation refusal on the exact live pilot Pages request. Authoring remains blocked. Stop for installation review; no acceptance or closure declared.** Original diagnosis/correction report and pending-state evidence are preserved.

The operator established Application Admin normally and indicated readiness. The agent refreshed Verify development session in the same Demo tab 1964522886 at localhost:5274. It confirmed canonical principal usr_f01e0c1c58424bed9ac4e8601ff9890a, builder-demo, ui-platform-development, registeredApplications true; live Platform creation true, Platform security admin false. No automatic sign-in or principal switch occurred.

Ordinary navigation to the existing pilot tile opened Overview with key codex-test-v1-local-pilot-20261102 and permanent ID de8d1851-3e36-435f-b093-95ce94d940e7. Clicking Pages now displays exactly:

> Error: Workspace discovery is blocked: the installed native UI Base package must use physical installed paths. Installation review is required; additional permissions will not resolve this failure.

This text is emitted exclusively by the corrected NativeUiBasePathError branch of the live Builder workspace handler (HTTP 503, WORKSPACE_NATIVE_INSTALLATION_INVALID), replacing the former generic authorization-denial text. The browser observation is DOM evidence of that response, not a separately captured network trace. No cookies, headers or CSRF material were captured.

Combined with the recorded native diagnosis stack, this establishes the actual failing live boundary: principal/registered-owner checks and the existing authorization evaluation proceed to native component discovery, which rejects the installed symbolic-link package input. The subordinate editor session is not the initial refusal in this observed request. Root cause of the current discovery failure is the native installation's mismatch with the retained physical-path admission contract; the masking implementation defect was the old 403 classification and is corrected. No specific missing grant is demonstrated, and no additional permission is required to correct that installation condition.

The workspace/artifact list still does not populate, so no existing Page/editor, Presentation/Shell/Menu, assets, Save/Reload or Saved Design Preview correspondence was reached. The agent stopped on this exact blocker without opening Presentation or attempting repairs. The installed link, native validation, package trust and approved seven-permission policy remain unchanged. A supported physical-install remediation plan and its native requalification require separate review; this continuation does not authorize or perform one.

Preservation snapshot browser-after.json and browser-comparison.json confirm unchanged security-table digests and registered identities against the preceding after snapshot, maintaining policy revision 9. All 1707 inventoried Application regular files are unchanged during this browser continuation. No product/test source or Application content changed. Prior 27 passing tests and server typecheck remain the verification results; no repeat build/tests were needed for observation only.

New files: this report; evidence/v1-workspace-discovery-correction-20261102/browser-after.json; browser-comparison.json; browser-files.json (exact hashes for this report and the two evidence payloads). Earlier files.json and reports remain unchanged. The operator tab is left at the reproduced error with Application Admin signed in.

**Stop: V1 Local Audience Pilot — Workspace Discovery Correction Acceptance Review Gate.** No dependency installation/copy, grant change, provisioning, Application recreation, identity switching, content edit, Publish, export, build, host/process startup, commit or push occurred. Successful normal authoring remains unqualified pending installation review.
