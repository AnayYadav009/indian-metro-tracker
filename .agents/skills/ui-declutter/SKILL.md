---
name: ui-declutter
description: Redesigns cluttered dashboards and geospatial UIs using progressive disclosure, single-slot contextual drawers, and unified controls. Use when decluttering, redesigning, or compacting frontend components.
---

# UI Declutter & Progressive Disclosure

1. **Zero Overlapping Drawers**:
   - Never stack detail cards on top of active tool drawers (e.g., Nearest, Route).
   - Use a single right-hand inspector slot with a `← Back` breadcrumb header to switch between tool results and segment/station details.
2. **Eliminate Duplicate Metrics**:
   - Merge top-bar kilometer KPIs directly into the left sidebar Status & Line Style filter rows so status is rendered only once.
3. **Compact City & Phase Controls**:
   - Strip verbose operator acronyms from city pill labels into `title` tooltips. Show top cities + active city with a `[+N more]` toggle.
4. **Canvas-First Viewport Budget**:
   - Keep >80% of the map unobstructed. Default the bottom timeline to a compact single-row pill and move Data/OSM attribution to the bottom-right corner.
