# Development scripts

Stand-alone utilities, all runnable from the repo root:

- `print-tree.mjs` — pretty-print the repository tree skipping build outputs.
- `check-cycles.ts` — confirm the `@agent-os/*` dependency graph is acyclic.
- `check-paths.ts` — confirm every path alias declared in `tsconfig.base.json`
  resolves to a real file.

## Running

```bash
node scripts/print-tree.mjs
```

The TS scripts require `tsx` (`pnpm dlx tsx <script>`) and are wired into the
CI `Lint` job in later phases.
