## Summary

<!-- Describe the smallest user-visible or maintenance change. -->

## Scope

- [ ] Code/UI
- [ ] Data/overrides
- [ ] Pipeline/audit
- [ ] Documentation
- [ ] CI/GitHub configuration

## Verification

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run validate:data`
- [ ] `npm run build`
- [ ] E2E against the development server
- [ ] E2E against the static export
- [ ] `npm run audit:data` result recorded

## Data and source checklist

- [ ] Generated files were rebuilt through the pipeline, not hand-edited.
- [ ] Every non-OSM value has a source URL and `last_verified` date.
- [ ] Unknown values remain `null`; no real-world fact was guessed.
- [ ] Data changes include the affected city/line and audit impact.

## Notes

<!-- Mention known warnings, unresolved genuine data gaps, screenshots, or follow-up work. -->
