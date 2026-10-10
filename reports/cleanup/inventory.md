# Codebase and GitHub cleanup inventory

**Inventory date:** 2026-10-10  
**Scope:** read-only Task 0 inventory. No files were deleted, untracked, rewritten, or otherwise cleaned up for this report.

## Executive summary

- The worktree is intentionally dirty from the preceding map/data work: 77 status entries (including generated data, tests, UI changes, and new reports). These changes are not cleanup work and must not be reverted.
- The repository has 192 tracked files and approximately 10.57 MB of tracked content.
- `data/` is 46 tracked files and approximately 8.00 MB. `reports/` is 18 tracked files and approximately 1.64 MB; additional untracked reports make the working-tree reports directory approximately 2.60 MB.
- The repository has both generated/raw data and historical QA/debug artifacts committed. Removing or untracking any of them requires explicit approval.
- The current audit is not clean: the latest known run has one error (Noida Aqua reference count 20 versus reference 21) and approximately 291 un-baselined warnings. No threshold or baseline change is proposed here.
- `gh` is installed and authenticated. The default branch is `master`; there is one merged pull request and no listed issues or open pull requests.
- The requested `docs/DATA_STANDARDS.md` path does not exist. The repository uses [`docs/DATA-STANDARDS.md`](../DATA-STANDARDS.md); several rules and milestone documents still reference the underscore spelling.

## 1. Repository state and sizes

### Git state

- Repository: `AnayYadav009/indian-metro-tracker`
- Current branch: `master`
- HEAD: `3117dcd docs(audit): add milestone verification report for M8 through M12`
- Default branch: `master`
- Tracked files: 192
- Tracked bytes: approximately 10,572,755
- Worktree status entries: 77
- No cleanup changes were mixed into the existing worktree changes.

### Tracked files by top-level directory

| Directory | Files | Bytes |
|---|---:|---:|
| `data/` | 46 | 7,998,941 |
| `reports/` | 18 | 1,641,472 |
| `scripts/` | 20 | 189,220 |
| `__tests__/` | 30 | 167,161 |
| repository root | 15 | 365,466 |
| `e2e/` | 11 | 25,547 |
| `components/` | 22 | 72,633 |
| `docs/` | 7 | 38,727 |
| `lib/` | 10 | 42,424 |
| `types/` | 4 | 10,229 |
| `.agents/` | 1 | 2,786 |
| `.github/` | 2 | 3,117 |
| `app/` | 3 | 4,797 |
| `hooks/` | 1 | 5,568 |
| `store/` | 2 | 4,667 |

The tracked total is approximately 10.57 MB. The working tree, excluding `.git` and `node_modules`, is approximately 265 MB because it contains ignored build output and local artifacts. `node_modules` is approximately 576 MB and is ignored.

### 30 largest tracked files

| File | Bytes |
|---|---:|
| `data/raw/delhi.json` | 1,585,877 |
| `data/raw/bengaluru.json` | 1,069,659 |
| `data/segments.geojson` | 919,865 |
| `data/raw/chennai.json` | 818,086 |
| `data/raw/mumbai.json` | 803,376 |
| `data/stations.geojson` | 547,044 |
| `data/raw/hyderabad.json` | 398,050 |
| `data/raw/kolkata.json` | 380,462 |
| `package-lock.json` | 350,437 |
| `data/raw/pune.json` | 297,588 |
| `reports/data-audit/kolkata-qa-screenshot.png` | 261,556 |
| `reports/data-audit/chennai-qa-screenshot.png` | 260,978 |
| `data/raw/ahmedabad.json` | 240,990 |
| `data/raw/noida.json` | 236,506 |
| `data/raw/gurugram.json` | 173,564 |
| `reports/data-audit/2026-10-08.json` | 133,579 |
| `data/audit-baseline.json` | 129,009 |
| `reports/data-audit/mumbai_bkc_line3_panel.png` | 124,622 |
| `reports/data-audit/delhi_rajiv_chowk_station.png` | 122,700 |
| `reports/data-audit/gurugram_cyber_city_panel.png` | 117,090 |
| `reports/data-audit/navi_mumbai_cbd_belapur_panel.png` | 115,774 |
| `reports/data-audit/noida_pari_chowk_panel.png` | 115,682 |
| `reports/data-audit/kolkata_howrah_panel.png` | 101,525 |
| `data/raw/navi-mumbai.json` | 67,638 |
| `reports/data-audit/2026-10-07.json` | 63,226 |
| `scripts/audit/audit-engine.ts` | 59,625 |
| `reports/data-audit/triage-2026-10-07.json` | 56,631 |
| `reports/data-audit/reclassified-far-stations.json` | 48,124 |
| `data/overrides/pune.json` | 40,948 |
| `reports/data-audit/2026-10-08.md` | 40,698 |

### Data size budget

The M9 documentation requires measuring data and initial JavaScript gzip size, but no numeric budget or automated size-check script was found in the current repository. Current tracked `data/` size is approximately 8.00 MB; a decision is needed on whether the budget is raw bytes, compressed bytes, or both before adding a gate.

## 2. Generated, temporary, personal, and noisy files

### Tracked candidates

- Generated/raw pipeline inputs: `data/raw/*.json` (approximately 10 city caches), `data/cities.json`, `data/lines.json`, `data/segments.geojson`, and `data/stations.geojson`.
- Generated/mock fixtures: `data/mock/lines.json`, `data/mock/segments.geojson`, and `data/mock/stations.geojson`.
- Audit baseline: `data/audit-baseline.json`; this is policy data, not disposable output.
- Historical audit output: multiple JSON/Markdown reports under `reports/data-audit/`.
- QA/debug screenshots and GeoJSON under `reports/data-audit/`.
- `data/raw-audit/delhi-ways.txt`.
- No tracked `.env`, `.DS_Store`, `.log`, `.bak`, `.orig`, `.next`, `out`, or Playwright report files were found.

The repository currently contains an untracked debug GeoJSON file:
`reports/data-audit/2026-10-10-map-issues-debug.geojson` (approximately 502 KB), plus several untracked current audit reports. These are not deleted or ignored by this task.

### Existing ignore rules and gaps

`.gitignore` already covers `node_modules`, coverage/test output, Playwright output/cache, `.next`, `out`, build output, `.DS_Store`, scratch files, MapLibre worker copies, npm/yarn logs, `.env*.local`, and TypeScript build info.

Likely gaps, subject to approval:

- generic `.env` (only `.env*.local` is ignored);
- Overpass fallback/cache files if a cache is ever placed outside `data/raw`;
- generated audit screenshots, debug GeoJSON, and ephemeral reports;
- other ad-hoc debug artifacts under `reports/`.

The raw OSM caches are currently deliberately tracked as reproducibility inputs; moving or untracking them is a review item, not a safe automatic cleanup.

## 3. Code inventory

### Unused symbols and files

`tsc --noEmit --noUnusedLocals --noUnusedParameters` reports candidates in:

- `__tests__/geo.test.ts`
- `__tests__/pipeline-merge-validation.test.ts`
- `__tests__/url-sync-hardening.test.ts`
- `components/map/map-canvas.tsx`
- `hooks/use-url-sync.ts`
- `scripts/audit/audit-engine.ts`
- `scripts/audit/audit-formatters.ts`
- `scripts/migrate-schema-v2.ts`
- `scripts/pipeline/merge-overrides.ts`
- `scripts/pipeline/normalize.ts`
- `types/schema.ts`
- two scratch scripts under `scratch/`

These are **needs human check**, not confirmed unused: some are test-only, migration-only, CLI-only, or intentionally retained for type/schema completeness. No file is classified as safe to delete from this inventory.

### Dependencies and scripts

The package manifest has 9 runtime dependencies and 18 development dependencies. A simple package-name reference scan did not identify a clearly removable dependency. It is not a substitute for a module graph, so all dependency candidates are **needs human check**; no upgrade or removal is proposed.

Scripts present in [`package.json`](../../package.json):

`dev`, `build`, `start`, `lint`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `validate:data`, `pipeline:fetch`, `pipeline:build`, `pipeline:all`, `audit:dedupe`, `audit:links`, and `audit:data`.

All have names and commands. `start` serves the static export rather than starting a conventional Next production server, and lifecycle scripts (`predev`, `prebuild`, `postinstall`) are not separately described in the README. `audit:links` and the distinction between `pipeline:build` and `pipeline:all` need documentation confirmation, not deletion.

### Duplication and code-smell counts

Searches excluding dependencies/build output found:

- TODO/FIXME/HACK: 0
- `debugger`: 0
- `@ts-ignore`: 0
- `eslint-disable`: 0
- `console.log`: 80 matches, primarily pipeline/CLI diagnostics; app-facing logging should be reviewed before removal
- `any`: 72 matches, concentrated in pipeline/audit/test boundaries and schema parsing; each requires type-aware review

Known duplicated or compatibility-sensitive areas:

- map/station visibility and marker style were recently centralized in `lib/filter-utils.ts` and `lib/station-style.ts`; further consolidation must preserve current tests;
- generated versus override data is intentionally duplicated across source and compiled forms;
- `del-silver`/Silver Line URL and search aliases are intentional backward compatibility;
- schema migration code in `scripts/migrate-schema-v2.ts` may still be needed for historical data and must not be removed without approval.

### Mock data

`data/mock/` remains tracked, and tests/e2e include mock-banner terminology. The current production-generated datasets are sourced from real pipeline data, but the exact reachability of mock records through every production loading path was not proven by this read-only scan. Keep mock fixtures until that path is verified; classify removal or relocation as **needs review**.

## 4. Test health and reproducibility

- Previously recorded full unit result: 221 tests across 29 files passed.
- One skipped test exists at `e2e/interchange.spec.ts:67`; no `.only` markers were found.
- The Overpass resilience test writes `data/raw/test-resilience-city.json`, so a leftover cache can affect the “no cache” case. This is the identified cause of the flaky test and is a Task 1 cache-isolation fix.
- The test does not currently use an isolated temporary cache directory.
- CI runs static-export Playwright tests, but the workflow does not run `validate:data` as an explicit step and does not run a separate dev-server e2e job. Browser caching is not configured explicitly.
- Network dependence exists in the Overpass fetch CLI; unit tests mock `fetch`, while committed raw caches make pipeline rebuilds reproducible.

## 5. Documentation and configuration

### Accuracy findings

- [`README.md`](../../README.md) covers the app, scripts, static export, and OSM attribution, but needs updates for the current timeline/station visibility features, schematic geometry, current audit behavior, and all lifecycle/audit scripts.
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) references the non-existent `lib/metro-styles.ts` and an outdated test count. It does not describe `STATION_STYLE`, the shared visibility helper, or the current geometry-quality values.
- [`docs/DATA-STANDARDS.md`](../DATA-STANDARDS.md) exists; requested underscore spelling is stale in [`docs/MILESTONES-v2.md`](../MILESTONES-v2.md), [`docs/CITY_ONBOARDING.md`](../CITY_ONBOARDING.md), and [`.agents/rules/project.md`](../../.agents/rules/project.md).
- The standards document currently lists `exact`/`surveyed` and `schematic`, but the newer `approximate` value requested for planned geometry is not reflected there.
- Milestone text still describes some work as future even though M8-M13-related implementation exists; it should be marked only after owner review.

### Missing or incomplete policy files

Missing from the repository root:

- `LICENSE` (license choice must come from the owner);
- `SECURITY.md`;
- `CODE_OF_CONDUCT.md`;
- likely `.github/CODEOWNERS`.

Existing:

- `.github/ISSUE_TEMPLATE/data-correction.yml`;
- `.github/workflows/deploy.yml`;
- `.github/renovate.json` was observed in the repository metadata during the initial inventory, but its exact contents require a separate read if it is to be changed.

## 6. GitHub inventory

- Default branch: `master`.
- Branches observed: `master`, `main`, `m8-m9-completion`, `maintenance/phase-3`; none are marked protected by the branch listing.
- Pull requests: one merged PR, #1 (`Maintenance/phase 3`), merged into `master` on 2026-10-06; no open PRs.
- Issues: none returned by the all-state listing.
- Labels: existing standard labels include `bug`, `documentation`, `enhancement`, `good first issue`, `help wanted`, `duplicate`, `invalid`, `question`, `wontfix`, `accessibility`, and milestone labels.
- Tags/releases: tags `pre-city-id-migration` and `pre-lines-source`; no releases returned.
- Branch protection endpoint returned 404; protection could not be verified from the available permissions/API response. Do not infer that no protection exists.
- GitHub Pages endpoint returned 404; Pages status/configuration could not be verified. The workflow is configured to deploy Pages.
- Dependabot alerts are disabled (GitHub returned HTTP 403 with the explicit “alerts are disabled” message).
- No CODEOWNERS errors endpoint was available with the current token; no CODEOWNERS file was found in the repository listing.

### Workflow review

There is one workflow, [`deploy.yml`](../../.github/workflows/deploy.yml). It triggers on pushes to both `main` and `master`, and manual dispatch. It runs typecheck, lint, unit tests, static build, and static-export Playwright smoke tests, then deploys Pages.

- Actions are pinned to major versions (`checkout@v4`, `setup-node@v4`, `upload-pages-artifact@v3`, `deploy-pages@v4`), not immutable SHAs.
- Permissions are limited to `contents: read`, `pages: write`, and `id-token: write`.
- npm caching is enabled through `setup-node`; Playwright browser caching is not explicit.
- `validate:data` runs indirectly through `prebuild`, but is not a named CI step.
- `audit:data` is not run in CI.
- No CI duration history was available from the read-only commands run here.

## 7. Secrets hygiene

Current-tree and git-history scans searched for common AWS access-key, GitHub token, private-key, credential-in-URL, password, and secret assignment patterns. No matching secret value was printed or identified by those scans. This is pattern-based, not proof of absence; encrypted values, unusual formats, and secrets in ignored files require separate tooling or manual review.

## 8. Report history

Tracked report changes occurred on 2026-10-07, 2026-10-08, and 2026-10-10. The current worktree also has untracked reports dated 2026-10-09 and 2026-10-10. Reports are therefore actively changing and are not a static archive. Historical report retention needs an explicit decision.

## 9. Ranked cleanup proposal

| Rank | Group | Proposed action | Risk | Approval |
|---:|---|---|---|---|
| 1 | Safe | Isolate Overpass tests in a temporary cache directory; keep production cache behavior explicit and preserve fallback semantics. | Low | Required before Task 1 |
| 2 | Safe | Correct documentation paths and stale references; document every current npm script and current test/data rules. | Low | Required before Task 3 |
| 3 | Safe | Add narrowly scoped ignore rules for approved local `.env`/debug artifacts, without untracking or deleting existing files. | Low | Required before Task 1 |
| 4 | Needs review | Decide whether committed raw Overpass caches remain reproducibility inputs or move to an ignored/external cache. | Medium | Owner decision |
| 5 | Needs review | Decide retention policy for historical reports, screenshots, and debug GeoJSON; do not delete any without a file list approval. | Medium | Owner decision |
| 6 | Needs review | Verify mock-data reachability, then relocate/remove mock fixtures only from approved production paths. | Medium | Owner decision |
| 7 | Needs review | Remove only individually confirmed unused symbols/dependencies, with before/after tests and bundle measurements. | Medium | Owner decision |
| 8 | Needs review | Update CI to add explicit validation/audit policy, Playwright caching, and separate dev/static e2e coverage. | Medium | Owner decision |
| 9 | Do not touch yet | Audit baseline, thresholds, generated data, reference/override files, migration code, branches, tags, releases, issues, and the merged PR. | High | Explicit item-by-item approval |
| 10 | Do not touch yet | Add `LICENSE`; license selection must be supplied by the owner. | High | Owner choice required |

## STOP — Task 0

This report is the complete read-only inventory deliverable. No cleanup action has been taken. The next step requires approval of a specific cleanup group and, for deletion/untracking or GitHub changes, an explicit file/item list.
