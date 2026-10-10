# City Onboarding Runbook

Use for every Tier 1 city (M10) and every Tier 2 city (M15). One city per PR. Do not batch cities into one PR.

Before starting: M8 is complete and `docs/DATA-STANDARDS.md` and `docs/DATA_AUDIT.md` have been read.

## Step 0: Scope check
Confirm from official sources that the city has a metro that is operational, under construction, or an officially sanctioned project. Confirm which systems are in scope under `docs/DATA-STANDARDS.md` section 1. List the operators involved.

## Step 1: Reference file (before any build)
Create `data/reference/<city>.json` in the format from `DATA_AUDIT.md`: lines, official names, operators, terminals, operational station counts, phase opening dates, and under-construction or planned stretches with expected dates. Every value gets a source URL.

**STOP.** Show the reference file to the owner. Do not proceed until approved.

## Step 2: Overrides file
Create `data/overrides/<city>.json`:
- `city`: id, name, bbox (tight enough not to pull in neighbouring cities' lines), primary operator, `phases` as bare labels.
- `lines`: id, name, colour, **operator per line**, source.
- `segments`: one per contiguous stretch with its own status and phase. Map each to its OSM relation or way (`osmId`) where one exists; for stretches not in OSM, give `coordinates` plus `last_verified`. Include `references`.
- `stationAliases`, `interchangeStationNames`, `dedupeRadiusM`, `stationOverrides` where needed.

Watch-outs to check for every city (do not assume, verify):
- Naming scheme of lines (by colour, number, corridor, or a mix) and how the operator's map names them.
- Official station names that differ from OSM names (long, honorific or transliterated names) need aliases.
- Interchanges where two stations are far apart or named differently.
- More than one operator on one network.
- Stretches that are open in part, so a line needs several segments.
- Lines that exist in OSM as both directions or as multiple relations (avoid double counting).

## Step 3: Build
```
npm run pipeline:fetch -- --city=<id> --force
npm run pipeline:build -- --city=<id>
```
(Agent: confirm the exact script names from `package.json` and the CLI in `scripts/pipeline/`.)

Review the dedupe report. Every merged pair must be plausible. A merge of two stations with different base names is never acceptable.

## Step 4: Validate and audit
```
npm run validate:data
npm run audit:data
```
Zero errors. Each warning fixed or baselined with a reason. Counts compared against the reference file.

## Step 5: Visual QA
Check at zoom levels covering the whole city, a district, and station level:
- Every line is drawn with the right colour, and solid/dashed/dotted matches status.
- No stray segments in other cities, no missing stretches, no gaps at junctions.
- Station dots sit on their line and interchanges look right.
- City filter, status filter, phase filter and search all work for this city.
- Panels show the right operator, dates, phase and references.
- Compare against the operator's official map and note any difference.

## Step 6: PR checklist
- [ ] Reference file with sources, approved by owner
- [ ] Overrides file with references on every non-OSM value
- [ ] `lint`, `typecheck`, `test`, `validate:data`, `audit:data` all pass
- [ ] Dedupe report reviewed, results summarised in the PR
- [ ] Audit baseline changes listed with reasons
- [ ] Spot check of 10 random stations against the official map
- [ ] Screenshots at three zoom levels
- [ ] No mock records in the dataset

**STOP.** Owner reviews before merge.

## Order
Tier 1: any city found mock or incomplete by M8, then Chennai, Hyderabad, Kolkata.
Tier 2: batches of 3 to 4 (see M15).