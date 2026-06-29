/**
 * Verify path aliases declared in tsconfig.base.json actually resolve to a file.
 * Fails the build if any alias is dangling.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

interface TsConfig {
  readonly compilerOptions?: Readonly<{
    readonly paths?: Readonly<Record<string, readonly string[]>>;
  }>;
}

const loadConfig = (): TsConfig => {
  const text = readFileSync(join(process.cwd(), 'tsconfig.base.json'), 'utf8');
  return JSON.parse(text) as TsConfig;
};

const isDanglingAlias = (_alias: string, candidates: readonly string[]): boolean => {
  for (const candidate of candidates) {
    if (candidate.includes('*')) continue;
    const filePath = join(process.cwd(), candidate);
    if (!existsSync(filePath)) return true;
  }
  return false;
};

const main = (): void => {
  const config = loadConfig();
  const paths = config.compilerOptions?.paths ?? {};
  let failures = 0;

  for (const [alias, candidates] of Object.entries(paths)) {
    if (isDanglingAlias(alias, candidates)) {
      console.error(`MISSING alias ${alias}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} path alias(es) are dangling.`);
    process.exit(1);
  }
  console.log('All path aliases resolve.');
};

main();
