/**
 * Two checks in one:
 *   1. No circular dependencies between workspace packages.
 *   2. All workspace edges obey the layered graph matrix from ADR-003.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PackageJson {
  readonly name: string;
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly 'agent-os'?: {
    readonly layer?: number;
    readonly audience?: 'internal' | 'public';
    readonly kind?: 'app' | 'library';
  };
}

const REPO_ROOT = process.cwd();
const PACKAGES_ROOT = join(REPO_ROOT, 'packages');
const APPS_ROOT = join(REPO_ROOT, 'apps');

const PACKAGE_SLUGS = [
  'core',
  'shared',
  'runtime',
  'workflow',
  'memory',
  'event-bus',
  'observability',
  'agents',
  'ui',
  'hermes',
  'adapters-cli',
  'adapters-discord',
  'adapters-telegram',
  'adapters-webhook',
  'adapters-mcp',
  'adapters-whatsapp',
  'adapters-email',
] as const;

const APP_SLUGS = ['api', 'dashboard'] as const;

type Slug = string;

interface Node {
  readonly slug: Slug;
  readonly kind: 'app' | 'library';
  readonly layer: number;
}

const readPackage = (kindDir: 'apps' | 'packages', slug: Slug): PackageJson => {
  const root = kindDir === 'apps' ? APPS_ROOT : PACKAGES_ROOT;
  const path = join(root, slug, 'package.json');
  const json = JSON.parse(readFileSync(path, 'utf8')) as PackageJson;
  return json;
};

const readNode = (kind: 'app' | 'library', slug: Slug): Node => {
  const json = readPackage(kind === 'app' ? 'apps' : 'packages', slug);
  const layer = json['agent-os']?.layer ?? 0;
  if (layer === 0) {
    throw new Error(`Missing "agent-os.layer" in ${kind}/${slug}/package.json`);
  }
  return { slug, kind, layer };
};

const allNodes = (): readonly Node[] => {
  const libraries = PACKAGE_SLUGS.map((slug) => readNode('library', slug));
  const apps = APP_SLUGS.map((slug) => readNode('app', slug));
  return [...libraries, ...apps];
};

const dependenciesOf = (node: Node): readonly Slug[] => {
  const json = readPackage(node.kind === 'app' ? 'apps' : 'packages', node.slug);
  const deps = json.dependencies ?? {};
  return Object.keys(deps).filter((d) => d.startsWith('@agent-os/'));
};

interface MatrixEntry {
  readonly from: number;
  readonly to: number;
}

const LAYER_EDGES: readonly MatrixEntry[] = [
  { from: 2, to: 1 },
  { from: 3, to: 1 },
  { from: 3, to: 2 },
  { from: 4, to: 1 },
  { from: 4, to: 2 },
  { from: 4, to: 3 },
];

const allowedByLayer = (): ReadonlyMap<number, ReadonlySet<number>> => {
  const map = new Map<number, Set<number>>();
  for (const edge of LAYER_EDGES) {
    if (!map.has(edge.from)) map.set(edge.from, new Set<number>());
    map.get(edge.from)?.add(edge.to);
  }
  return map;
};

const slugFromImport = (imp: string): Slug => imp.replace('@agent-os/', '');

const checkCycles = (nodes: readonly Node[]): readonly string[] => {
  const visited = new Set<Slug>();
  const stack: Slug[] = [];
  const cycles: string[] = [];
  const lookup = new Map<Slug, Node>(nodes.map((n) => [n.slug, n]));

  const visit = (slug: Slug): void => {
    if (stack.includes(slug)) {
      const idx = stack.indexOf(slug);
      cycles.push([...stack.slice(idx), slug].join(' -> '));
      return;
    }
    if (visited.has(slug)) return;
    visited.add(slug);
    stack.push(slug);
    const node = lookup.get(slug);
    if (node) {
      for (const dep of dependenciesOf(node)) visit(slugFromImport(dep));
    }
    stack.pop();
  };

  for (const node of nodes) visit(node.slug);
  return cycles;
};

const checkLayerMatrix = (
  nodes: readonly Node[],
  matrix: ReadonlyMap<number, ReadonlySet<number>>,
): readonly string[] => {
  const errors: string[] = [];
  const lookup = new Map<Slug, Node>(nodes.map((n) => [n.slug, n]));
  for (const node of nodes) {
    const allowed = matrix.get(node.layer);
    for (const imp of dependenciesOf(node)) {
      const dep = lookup.get(slugFromImport(imp));
      if (!dep) {
        errors.push(`Unknown workspace dependency: ${node.slug} -> ${imp}`);
        continue;
      }
      if (node.layer === dep.layer) continue;
      if (!allowed || !allowed.has(dep.layer)) {
        errors.push(
          `Illegal layer edge: ${node.slug} (layer ${node.layer}) -> ${dep.slug} (layer ${dep.layer})`,
        );
      }
    }
  }
  return errors;
};

const main = (): void => {
  const nodes = allNodes();
  const matrix = allowedByLayer();

  const cycles = checkCycles(nodes);
  if (cycles.length > 0) {
    console.error('Circular dependencies detected:');
    for (const cycle of cycles) console.error('  ' + cycle);
    process.exit(1);
  }

  const layerErrors = checkLayerMatrix(nodes, matrix);
  if (layerErrors.length > 0) {
    console.error('Layer matrix violations:');
    for (const err of layerErrors) console.error('  ' + err);
    console.error('See docs/architecture/dependency-rules.md and ADR-003.');
    process.exit(1);
  }

  console.log('Dependency graph OK: no cycles, layer matrix respected.');
};

main();
