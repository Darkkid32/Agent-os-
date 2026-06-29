# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

Please report security issues **privately** by emailing `security@agent-os.dev`.

Do **not** file public GitHub issues for security-sensitive bugs.

We aim to acknowledge reports within 72 hours and provide a remediation plan within 14 days.

## Disclosure Process

1. Reporter emails security@agent-os.dev with a clear description and reproduction steps.
2. Maintainers triage and assign severity (CVSS v3.1).
3. A fix is prepared in a private branch.
4. Coordinated disclosure after a release is published, or after 90 days, whichever comes first.

## Scope

- All code under `apps/`, `packages/`, and `scripts/` within this monorepo.
- CI workflows under `.github/`.
- Docker images declared in `docker/`.

Thank you for helping keep Agent OS and its users safe.
