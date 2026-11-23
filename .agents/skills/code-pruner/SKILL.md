---
name: code-pruner
description: Audits codebases for errors, dead or redundant code, and unnecessary boilerplate. Removes bloat while ensuring tests pass. Use when asked to clean, prune, deduplicate, or remove dead code.
---

# Code Pruner

Analyze the codebase, remove dead/redundant abstractions, and fix latent errors without breaking existing functionality.

## Core Directives

1. **Safety First**: Before touching code, run existing linters, type checkers, and test suites to establish a clean baseline.
2. **Identify Redundancies**:
   - Unused imports, orphaned variables, and unreachable logic branches.
   - Over-engineered wrapper functions that only forward arguments without transformation.
   - Duplicated logic across multiple files that can be consolidated into a single standard function or native language feature.
   - Verbose manual iterations where idiomatic standard library methods apply.
3. **Execution Plan**:
   - List targeted files and lines to prune.
   - Delete dead and redundant code directly.
   - Refactor repetitive logic into concise, native idioms.
4. **Verification**:
   - Re-run test suites and type checkers.
   - If tests fail, diagnose and fix the regression or revert the modification.
   - Provide a clean diff summary highlighting net lines removed.