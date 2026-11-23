# Visual QA checklist

Used for every city PR (M10, M10.2, M15) and before closing M10.1. It exists because a passing audit missed defects that are obvious on screen (see `docs/FINDINGS-2026-10-12.md`). The audit checks data; this checklist checks what a person sees.

## Setup

1. Build the static export and serve `out/` (`npm run build`, `npm start`).
2. Check at a desktop viewport (about 1440 px wide) and a mobile viewport (about 390 px wide).
3. Select the city, turn stations on, set the year to the current year with "Include Future" on.
4. Keep the city's `data/reference/<city>.json` and the operator's official map open beside the app.

## Checklist (per city)

**Lines**
- [ ] Every line in the reference file is drawn, with the right colour and status pattern (solid, dashed, dotted).
- [ ] Every line reaches every terminal in the reference, including each branch terminal. Zoom to each line end.
- [ ] Every construction or planned stretch in the reference is drawn.
- [ ] Each line is one clean trace. No parallel twin traces, no spikes or hooks that double back, no straight chords cutting across curves. If a curve looks odd, compare with the operator map before changing it.
- [ ] Dashed and dotted lines look continuous (no zig-zag from overlapping dashes).

**Stations**
- [ ] Every line has stations along its whole length. Count a few lines against the reference.
- [ ] No hollow (construction or planned) stations floating without a line.
- [ ] Future segments either show stations or the panel says stations are not yet published.
- [ ] Interchange markers appear exactly where the reference says, including cross-network interchanges.

**Panels**
- [ ] Open three segments and three stations. Station count, length, status, phase, operator, dates and references look right.
- [ ] No "N/A" or blank dates on operational stations without a reason recorded.
- [ ] "Verified" appears only where an official source is referenced.
- [ ] Interchange chips show connected lines and, for lines not yet open, their status.

**Totals and filters**
- [ ] The header totals for the city match the reference (operational, construction, planned) within the audit tolerance.
- [ ] City, status and phase filters change the map instantly and the empty state looks right.
- [ ] Timeline: scrub to a few past years; lines and stations appear in a believable order; undated count is shown.

**Mobile**
- [ ] The filter and metadata panels do not hide the selected feature; attribution stays visible.

## Evidence for the PR

- Screenshots at three zoom levels (whole city, a dense core, a line end) on desktop, and one on mobile.
- This checklist pasted with each box ticked or a note explaining why not.
- A list of any lines or stations deliberately left out, each with a reason and reference.

A screen recording is welcome as a bonus but is not accepted as the only evidence.