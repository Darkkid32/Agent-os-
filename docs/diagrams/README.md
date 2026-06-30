# Diagrams

| File                            | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `dependency-graph.mmd`          | Layered workspace dependency graph (and the rules it encodes).   |
| `request-flow.mmd`              | Sequence diagram: dashboard to API to runtime to LLM/memory.     |
| `deployment.mmd`                | External view: containers, databases, telemetry, LLM provider.   |
| `hermes-lifecycle.mmd`          | Hermes lifecycle state machine diagram.                          |
| `hermes-kernel-evolution.mmd`   | Hermes kernel evolution diagram.                                 |
| `hermes-components.mmd`         | Hermes component diagram.                                        |

Render with any Mermaid-compatible viewer. GitHub renders these natively in
markdown. To export:

```bash
npx @mermaid-js/mermaid-cli -i docs/diagrams/deployment.mmd -o docs/diagrams/deployment.svg
```

Add a new diagram:

1. Pick a slang-snake filename (`<topic>.mmd`).
2. Use the existing files' style as a starting point.
3. Reference it in the appropriate docs page (Mermaid renders inline when
   embedded with ```` ```mermaid ```` fences).
