# graphify

This directory is reserved for graph-rendering utilities that visualize the
Agent OS dependency graph.

Phase 1.1 places nothing concrete here. The interface contract lives in
`scripts/check-cycles.ts` and the visual map lives in
`docs/diagrams/dependency-graph.mmd`.

Future work:

- Export `:tree` from the package dependency graph to Graphviz / D3.
- Cross-link with `obsidian/` for browsing the graph as a vault of notes.
