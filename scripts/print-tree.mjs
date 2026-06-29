#!/usr/bin/env node
/**
 * Print a tree of the Agent OS monorepo for quick visual checks.
 * Run via: `node scripts/print-tree.mjs`.
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SKIP = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage', '.husky', '.git']);

function walk(dir, prefix) {
  const entries = readdirSync(dir).sort();
  entries.forEach((entry, idx) => {
    if (SKIP.has(entry)) return;
    const full = join(dir, entry);
    const stat = statSync(full);
    const last = idx === entries.length - 1;
    console.log(
      prefix +
        (last ? '\u2514\u2500\u2500 ' : '\u251c\u2500\u2500 ') +
        entry +
        (stat.isDirectory() ? '/' : ''),
    );
    if (stat.isDirectory()) walk(full, prefix + (last ? '    ' : '\u2502   '));
  });
}

console.log(ROOT.split(/[\\/]/).pop() + '/');
walk(ROOT, '');
