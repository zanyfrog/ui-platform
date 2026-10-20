# WP5-F — supplemental diagnostic evidence and raw-byte governance addendum

2026-10-20. Supplemental observations only. The original Windows EPERM inventory and all historical evidence remain unchanged. No Git configuration, commit, index, history or remote was changed. This addendum does not retroactively establish missing original-generation provenance or authorize any recovery.

## Eleven previously unlisted outputs

Checkpoint: `c86ecb3708fd619791b7f667b02b0c4c673bd686`. All paths in this table share prefix `docs/architecture/evidence/builder-v1-wp5-f-windows-eperm/wp5-e-produced/builder-v1-wp5-e/browser-1792414064709/`.

| Output | Current raw SHA-256 | Git blob ID |
| --- | --- | --- |
| administrator-disabled.png | `801548EE211A0E53C696FBB7405399E94BB703D81F90F15049C2B1A36F47B868` | `307891ed11b0752487c88e0325dc3897b7e5dd88` |
| dependency-refresh-after-save.png | `02D663B31947E240FFB2BBAFFA8AFDC3AE9636164D418F2F70508ABEF22B1E16` | `3132227c4f73f448efdb981c789870dd119879c5` |
| final-or-failure.png | `75A0A5023808AB60ABC224444D2B4FAC4258E724A9ED749C65FF9A786629D337` | `bdfe38b40358506428d8acebef0b0c01563c25b0` |
| final-or-failure.txt | `DC6345E6806C39A3A238CED91DBD5595AA8E64682259F54787681BD76D202157` | `862b4598910e7f063f6bf8d2aa53d666f9860825` |
| initial-problems.json | `09A9DE6078029C3B7BAED687E4C264C52F4B3F5550E3FB24D358FFF157190AEC` | `e2088cf1546c9ac21c98a41421370858fc305b58` |
| multiple-dirty-tabs.png | `F75E0DF228CADEF584D11ECA81214FD21263006B6A6B8CCDD4E943028B1E354C` | `194ae593299dceb793e08d2fd2d98e0bb21eac35` |
| multiple-independent-problems.png | `948DD926B9182201801702F371437759401ED8441B8992D1D4F2F32C305C2480` | `7617f53e8f53f61866321f66a3caa74719b10540` |
| nonadministrator-readonly.png | `059DEF8803187A20570028028E9C52571BB110FA379DE83D124AB12E62B9666A` | `3099a6d790b6057c8ec02e6a0a62907ca5771e81` |
| problem-exact-node-navigation.png | `D0D41A097A440F925EB31DAC9C931F3EE722036ECACD7FCDF202E6473FC12758` | `c4dee0e50befdc91b67d9042d8c402555797181f` |
| restart-persisted-disabled.png | `977867DE65D94E231033EBE00746840B46FB41661689437271F09A3D25E2FD02` | `18bc66588f730500b0a33a8eef646042a50612b5` |
| verification.json | `39BFC0B0B97740181640824E4E29189953099BCC30AF7D992B1469F7505A580A` | `f8b5badd90670c9e8a0e1daa204f70e315956b2f` |

The current bytes match both the prior supplemental observation and the checkpoint blob for each output. Their locations and contents are consistent with the previously documented authorized WP5-E diagnostic journey. They were omitted from its original inventory, so neither this later hash nor commit membership proves when/how the bytes were originally generated or independently proves original authorization. Original raw results and assertions are not relabeled or rewritten. These records supplement the provenance chain; they do not erase the gap.

## Seventeen line-ending cases

Each case below has different raw working-copy and committed SHA-256, but exact equality after CRLF-to-LF conversion. Complete raw/committed hashes and blob IDs are in the separate new `supplemental-evidence-addendum.json`. No normalization was applied to files on disk.

- `docs/architecture/builder-v1-wp5-f-d6-files.json`
- `docs/architecture/builder-v1-wp5-f-elevated-eperm-files.json`
- `docs/architecture/builder-v1-wp5-f-eperm-root-cause-files.json`
- `docs/architecture/builder-v1-wp5-f-form-refresh-files.json`
- `docs/architecture/builder-v1-wp5-f-foundation-lock-diagnostic-files.json`
- `docs/architecture/builder-v1-wp5-f-foundation-remediation-files.json`
- `docs/architecture/builder-v1-wp5-f-publication-correction-files.json`
- `docs/architecture/builder-v1-wp5-f-publication-final-ui-files.json`
- `docs/architecture/builder-v1-wp5-f-publication-final-ui.md`
- `docs/architecture/builder-v1-wp5-f-representative-ui-files.json`
- `docs/architecture/builder-v1-wp5-f-windows-eperm-files.json`
- `docs/architecture/builder-v1-wp5-f-wp5c-initial-insert-diagnostic-files.json`
- `src/server/watcher.ts`
- `tests/builder-v1-wp4.test.ts`
- `tests/builder-v1-wp5-b.test.ts`
- `tests/builder-v1-wp5-d-browser.test.ts`
- `tests/builder-v1-wp5-e-browser.test.ts`

The earlier reconciliation read local `core.autocrlf=true`; this phase does not change it. A checkout/commit representation cannot be assumed to preserve raw evidence bytes. No non-line-ending content difference was found in these cases. A normalized hash may help compare logical text, but must never replace the original raw-byte hash in an evidence record.

## Future archive recommendation — not a historical rewrite

For future evidence captures, create a frozen, separately approved archive of the raw captured bytes before any text-filtering path, with explicit encoding/line-ending policy. Record raw SHA-256, size, capture time, producer/tool versions and archive SHA-256. Verify extracted bytes against the raw manifest. Keep original/raw and normalized analysis derivatives distinct and hash both when needed. Bind Git commit/blob identities as supplementary references rather than claiming that Git guarantees original byte identity. Record any omitted/unhashed self-entries explicitly.

Store the archive/manifest in an append-only or otherwise reviewed operator-controlled evidence location; no archive was created from or substituted for historical evidence in this phase. An ordinary ZIP can preserve payload bytes but is not by itself a complete Windows security/ADS/timestamp backup; capture that metadata and streams separately with the required privileges and a tested restore policy. Any future Git attributes/settings policy requires its own governance approval. Do not amend old manifests, normalize old files, refresh old hashes, rewrite commits or synchronize GitHub to make this addendum appear historical.

This governance work is independent of maintenance preparation and does not authorize lock removal, booting or recovery. All 40 umbrella requirements remain unchecked. D6/WP5-F/WP5-I remain unaccepted and open.
