/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    // 'subject-case' is targeted: keep the preset's default
    // (severity 2, mode 'never') but narrow the disallow list to
    // the two unambiguously bad styles:
    //   - 'upper-case' (full ALL-CAPS subject)
    //   - 'pascal-case' (every-word-capitalised, e.g. "FixWebhookParser")
    // This permits lowercase, sentence-case ("Phase 4.3"),
    // start-case ("Fix webhook parser"), kebab-case, etc. — i.e.
    // technical subjects that contain proper-noun capitalisation
    // (TypeScript, HermesPort, ESLint, Phase 4.3) are accepted.
    // Every other rule below remains at severity 2 (error).
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-max-length': [2, 'always', 100],
  },
  prompt: {
    settings: {
      scopeEnum: [
        'api',
        'dashboard',
        'core',
        'shared',
        'runtime',
        'workflow',
        'agents',
        'memory',
        'event-bus',
        'adapters',
        'adapters-sdk',
        'observability',
        'ui',
        'hermes',
        'ci',
        'deploy',
        'deps',
        'release',
      ],
    },
  },
};
