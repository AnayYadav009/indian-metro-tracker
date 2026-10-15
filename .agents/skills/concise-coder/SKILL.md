---
name: concise-coder
description: Enforces lean, idiomatic, high-density code generation. Prevents AI verbosity, boilerplate, unnecessary abstractions, and redundant comments. Use when generating, refactoring, or optimizing code to be shorter and cleaner.
---

# Concise Coder

Generates clean, idiomatic code with minimal lines and zero unnecessary architectural ceremony.

## Generation Rules

1. **No Defensive Over-Engineering**:
   - Do not create premature interfaces, abstract factories, or wrapper classes for one-off operations.
   - Do not wrap standard library functions in custom one-liner helper utilities.
2. **Idiomatic Language Features**:
   - Use language-native constructs (pattern matching, list/dict comprehensions, modern standard library utilities, ternary operators, destructuring) over multi-step manual loops.
   - Keep functions flat; prefer early returns over deep nested `if-else` blocks.
3. **Comment & Doc Hygiene**:
   - Do not write self-evident comments (e.g., `// loop through items`, `// initialize variable`).
   - Restrict comments strictly to non-obvious business logic or algorithmic edge cases.
4. **Scope Control**:
   - Touch and output only the code necessary to solve the prompt.
   - Never regenerate an entire 300-line file when a 10-line modification solves the issue.