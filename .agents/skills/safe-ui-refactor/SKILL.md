---
name: safe-ui-refactor
description: Protects Vitest unit tests, Playwright E2E selectors, Zustand store contracts, and URL synchronization hooks during React/Tailwind UI redesigns. Use on all frontend refactoring tasks.
---

# Safe UI Refactor

1. **Selector Lock**:
   - Preserve all `data-testid`, `aria-label`, `role`, `placeholder`, and button text queries asserted in `__tests__/` and `e2e/`.
2. **Collapsed Element Accessibility**:
   - Ensure items placed behind a `[+N more]` toggle or collapsible timeline bar remain accessible to existing Vitest and Playwright test flows.
3. **State & URL Sync Integrity**:
   - Do not break exported action signatures in `store/use-metro-store.ts` or query serialization in `hooks/use-url-sync.ts`.
4. **Mandatory Verification**:
   - Run targeted Vitest suites and `npx tsc --noEmit` after every phase.
