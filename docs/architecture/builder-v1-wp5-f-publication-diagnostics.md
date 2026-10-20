# WP5-F — separate WP4 / WP5-B diagnostic classification

2026-10-19. Workstream B is diagnostic only. No existing browser test, accepted Form behavior, save implementation, autosave setting, graph-lock budget or assertion is changed.

## Method and outcome

The original WP4 and WP5-B tests ran once, serially, with a new diagnostic-only Vitest setup. Both passed (**2/2**, 307.08 seconds). Browser listeners recorded selected tabs, visible workspace/editor messages, Save Now disabled state, link-button state, relevant request outcomes, expected source hashes and returned source hashes. A listener timestamped API stderr delivery, including existing graph measurements. No routes, requests, application state, authorization decisions, retry behavior or browser timeouts were altered by these listeners. The browser observer was not loaded in the separate complete-suite verification.

Evidence: `evidence/builder-v1-wp5-f-publication-correction/diagnostic-results.json`, `diagnostic-summary.json`, and `diagnostic/observer-*.jsonl`. The new diagnostics improve observation of this run; they do not reconstruct missing state from the preserved elevated **493/496** run.

## WP4: stale-origin refusal

The historical failure at `tests/builder-v1-wp4.test.ts:155` was a 15-second wait for the exact message “Origin changed. No link was made.” It occurred before the runtime persistence section. Historical evidence contains neither the relevant DOM/navigation state nor a request-correlated outcome for that click, so its specific cause remains **unestablished**.

The new capture, `diagnostic/observer-30256.jsonl`, records **sequence 134**, browser timestamp **1792437254468**: the exact refusal is visible, the originating Form's Modes tab is selected, the Form tab is dirty/pending, the editor says Saving, and Return and link remains available. Authorization/navigation requests and subsequent save outcomes are retained around this event. The test then completes Dataset apply/connect, normal Form submission, exact entered-value persistence and reload verification. It also receives the expected native **422 DATASET_NAME_REQUIRED** response rather than a hidden or substituted success.

The originating Form save at request **43** carries expected hash `13ae7da3d3e126e52b309cff0466bd2086c0db51619915aa5031085a849e4748`; its 200 response returns `9be89789e6d158d0684f2a2c6a59c50f28841bdbefa3242c6b23f4abcf481ddb`. This brackets the refusal while the edit/save is active; the observed guard does not silently link a changed origin.

The handler in `src/client/builder-workspace/shell.ts` performs multiple authorization, navigation and Dataset consistency checks before reaching that specific generation/identity refusal. A prior failure or sufficient latency in those steps, or replacement of the displayed notification, could prevent the exact message from being observed. Those are hypotheses, not established explanations of the old run. The native observer cannot read the coordinator's internal captured generation, and the historical run lacks the required UI/request timeline.

**Classification:** no demonstrated recurrence of runtime value loss or a proven stale-origin implementation defect. A separate implementation authorization would be required before changing WP4 behavior. If this message failure recurs, capture the internal origin/current generation and identity together with the particular authorization/navigation result and notification sequence; do not weaken the guard or simply extend its wait.

## WP5-B: save completion and contention

The historical failure at `saveVisual` line 164, caller line 212, was the final poll for Save Now becoming disabled. Its saved API log contains a non-acquired graph measurement near the five-second budget, but lacks request identity and the browser save/source-revision timeline. That measurement alone cannot prove which operation prevented the UI condition. The helper can skip a manual PUT when its initial enabled check is false, so the historical failure is not proof that a particular manual save PUT was rejected.

The new `diagnostic/observer-28068.jsonl` records **11 Visual PUT responses, all 200**, with expected and returned hashes and visible save-state transitions. The original save assertion passes. For example request **34** saves the shared Component with expected hash `19d624a95f7372b82156706e3bb9a9fee46b5ee2edcaa9d4e06ae18712552ab6` and returns `c8f94c246b58f6b7a0e77a29bfa0baeff223eeb8e2099181d88a045bd926c2cc`, with no diagnostics. The complete journey also proves three overlapping Builder/runtime rounds while Builder remains open; see `diagnostic/wp5b/browser-acceptance.json`.

There are 132 graph observations in the WP5-B capture: maximum wait **4711.0249 ms**, maximum hold **2155.3257 ms**. One non-acquired observation waits **3028.3671 ms** near the end of the run. It is below the five-second acquisition budget and must not automatically be labeled a budget timeout. The measurement does not record its cancellation reason or request ID. The wrapper is request-abort-aware; an abort is compatible with this observation, but not directly proven by it.

The code preserves local queue predecessor order, including canceled entries. This does not establish global cross-process starvation freedom. The measured successful waits in this run demonstrate bounded acquisition for the observed workload; they do not prove the historical near-five-second case was harmless. The old result remains a failed run. Neither starvation, an incorrect helper assumption nor a particular admission bug has been causally established. No global fairness or performance claim is made.

**Classification:** historical save/admission failure remains unassigned; new run does not reproduce it. No evidence supports a new save or lock correction under Workstream B. Any such implementation requires separate authorization and request-correlated admission/source-generation evidence. Do not increase the five-second budget or change autosave to obtain a pass.

## Limits and review boundary

The subsequent complete UI run is **499/501 — NOT PASSED**. WP5-B again passes the original save journey and three overlap rounds. WP4 advances beyond the stale-origin check and native 422 validation, but later exceeds its unchanged ten-minute test limit across recorded Modern Standby transitions. Its diagnostic runtime-persistence pass remains separate evidence; the complete WP4 case is not claimed as passed. A new WP5-C Save Now poll failure occurs after the final recorded resume. That failure remains unexplained and is not silently absorbed into the watcher correction or attributed to standby. Any proposed WP5-C implementation correction requires a separate justified authorization; no save/assertion change is made here.

Response observation timestamps include asynchronous JSON decoding; they are not exact server spans. Stderr timestamps measure chunk arrival, and graph measurements have no request ID. DOM snapshots capture visible state, not every internal state transition. Successful diagnostic reruns cannot prove tracing caused either old failure, nor prove that the watcher exclusion fixed them.

The watcher correction and complete verification are reported separately in `builder-v1-wp5-f-publication-correction.md`. Original 495/496 and elevated 493/496 evidence remain unchanged. No Workstream B production correction is implemented. **Stopped at D6 correction and diagnostic review; no acceptance or closure.**
