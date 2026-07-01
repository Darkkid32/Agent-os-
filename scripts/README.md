# Development scripts

Stand-alone utilities, all runnable from the repo root:

- `print-tree.mjs` — pretty-print the repository tree skipping build outputs.
- `check-cycles.ts` — confirm the `@agent-os/*` dependency graph is acyclic and layer-respecting.
- `check-paths.ts` — confirm every path alias declared in `tsconfig.base.json` resolves to a real file.
- `validate-packages.ts` — validate package.json structure, exports, and build outputs across all workspace packages.
- `version-manager.ts` — manage version consistency: info, validate, sync, and bump across all workspace packages.

## Running

```bash
node scripts/print-tree.mjs
pnpm tsx scripts/check-cycles.ts
pnpm tsx scripts/check-paths.ts
pnpm tsx scripts/validate-packages.ts
pnpm tsx scripts/version-manager.ts info
```

The TS scripts require `tsx` and are wired into the CI pipeline.
