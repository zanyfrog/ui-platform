# Proposed coordinator edits — design text only

Applies to a **new copy** of the coordinator whose reviewed original hash is b562bba4af945dcc389f3fc97cf2b8026eea3df8817062ca700b6403e9e8a746. Do not patch the retained historical file. This document is the proposed edit specification, not an executable patch: new helper names below refer to the explicit contracts in the architecture review and need separate implementation authorization and source review. It intentionally contains no implemented Win32 helper or live launcher. No product, runtime, Foundation or test diff is proposed.

## Exact edit map

| Existing anchor | Proposed replacement |
|---|---|
| `$observed = @{}; $owned = @{}` | Per-run identity registry keyed by OS PID + creation FILETIME, separate candidate/verified/owned sets and retained handles, sequence/stop state; no PID-only state across launches |
| ChildSnapshot.Read return int[][] | Structured snapshot result containing sequence/time, enumeration completion/error and observed PID/PPID; throw/report explicit native enumeration failure; creation/image/token queried from stable handles |
| Six-pass descendant expansion | Identity/lifetime-verified creator-chain traversal until no new verified edges, visited identity set; unprovable linkage/coverage stops; no arbitrary depth acceptance |
| `if (-not $p) {continue}` and catch/continue | Durable exited-before-verification/inspection-failed event with missing fields/reason; stop new approvals |
| Node path shortcut | Reconcile discovered OS identity to independent token/image/hash/creator check and matching nonce context; no execution-class-only bypass |
| Two-path `$allowed` check | Explicit reviewed image manifest for Node, PowerShell, esbuild and native System32 conhost; compare actual hash/file identity, process linkage and token per CH1–CH6; no wildcard |
| `$observed[$childPid]=$p` | Register stable handle/OS creation key and evidence; ownership assigned separately only with proven launch association; console host has no direct termination authority |
| Run-Native catch tree kill | Set stopped first; capture primary error/rejection; finalize known owned handles without broad tree traversal |
| Normal-only completion statements | Unconditional finally: capture exact/unavailable native exit and termination results, drain streams, persist completion, preserve secondary failures |
| Top-level direct host launch | New ordinary-user supervisor redirects full coordinator stdout/stderr before coordinator entry and writes native coordinator completion in its own finally; no elevation or shell detachment |

## Control-flow design diff

```diff
@@ Observe-Children / classification (replacement of PID-only traversal and allowlist)
- $owned[$rootPid]=$true
- # six passes expanding persistent PID map
- if (-not $p) {continue}
- try {$exe=$p.Path; $started=$p.StartTime.ToUniversalTime().ToString('o')} catch {continue}
- if ($exe -eq $node) {continue}
- if ($exe -notin $allowed) {throw ('Unexpected descendant executable: '+$exe)}
- $observed[$childPid]=$p
+ # Design contracts, not implemented functions:
+ $snapshot = Read-CompleteSnapshotOrStop $run
+ $candidate = Capture-CandidateObservation $snapshot $launch
+ $identity = Query-StableHandleIdentity $candidate
+ $decision = Classify-ExactImageCreatorToken $identity $manifest $run
+ Write-DurableDecision $candidate $identity $decision
+ if (-not $decision.FullyVerified) {
+   Set-RunStopped $run $decision.Reason
+   throw (New-IdentityRejection $candidate $identity $decision)
+ }
+ Register-VerifiedIdentity $run $identity $decision
+ # Separate ownership contract: expected conhost never gains direct kill authority.
+ Register-ProvenOwnedHandleIfEligible $run $identity $decision
@@ Run-Native
- try { while (-not $process.HasExited) { Inspect-Pending; Observe-Children $process.Id; Start-Sleep -Milliseconds 20; $process.Refresh() }; $process.WaitForExit() }
- catch { if (-not $process.HasExited) { $process.Kill($true); $process.WaitForExit() }; throw }
- $code=$process.ExitCode
- # normal-only descendant completion and native exit JSON
- return $code
+ Assert-RunMayLaunch $run
+ $primary=$null; $secondary=@(); $completion=$null
+ try {
+   # Retain root handle and exact OS creation identity immediately after launch.
+   Register-DirectLaunch $run $process $launch
+   while (-not $process.HasExited) {
+     Inspect-PendingWithIndependentIdentity $run
+     Observe-ChildrenWithClassification $run $launch
+     Start-Sleep -Milliseconds 20
+     $process.Refresh()
+   }
+ } catch {
+   Set-RunStopped $run 'operation-or-identity-failure'
+   $primary=$_
+   # Evidence-write errors become secondary; cannot replace the saved primary.
+   Save-PrimaryOrFallbackStderr $primary $secondary
+ } finally {
+   if ($run.Stopped) {
+     Stop-OnlyProvenOwnedHandles $run $secondary
+   }
+   $completion=Collect-BoundedNativeCompletion $run $launch $secondary
+   Drain-AndRecordStreamsOrPartial $run $launch $secondary
+   Save-CompletionAndIntegrityOrFallback $completion $primary $secondary
+ }
+ if ($primary -or $secondary.Count) {
+   Set-RunStopped $run 'failure-or-incomplete-evidence'
+   Throw-PreservingPrimaryAndSecondary $primary $secondary
+ }
+ return $completion.MeasuredRootExitCode
@@ top-level phase transitions
+ # Any stopped state is terminal even if the native child returned zero.
+ # No new approvals when a rejection, missing identity, evidence gap or residual
+ # unresolved process exists. No automatic rerun after failure.
```

Required helper semantics are CH1–CH6, stable-handle ownership, explicit missing fields, error precedence and finalization rules in the architecture review. Registration failure after process creation must still enter finalization with the retained direct-launch handle; the outer supervisor must cover coordinator startup/termination failure before internal try/finally starts. No helper may silently swallow errors or infer missing exits. Publication of approval remains after independent verification; it must also check the irreversible run stop state immediately before writing approval. Files must be create-new, not overwritten.

No implementation of this design diff has been created. Future implementation must include the full concrete helper/supervisor diff for review **before** any active validation, capability check or tests. The validation matrix and separate authorization-ready 55-case plan are in `console-host-coordinator-review-20261021.md`. Retain all historical assertions/results and stop at the architecture review gate.
