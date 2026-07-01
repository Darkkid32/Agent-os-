import type { GraphifyNode, GraphifyEdge, GraphLayoutType } from './types';

interface LayoutResult {
  readonly nodes: GraphifyNode[];
  readonly edges: readonly GraphifyEdge[];
}

function getChildren(
  nodeId: string,
  edges: readonly GraphifyEdge[],
  visited: Set<string>,
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const children: string[] = [];
  for (const edge of edges) {
    if (edge.sourceId === nodeId && !visited.has(edge.targetId)) {
      children.push(edge.targetId);
    }
  }
  return children;
}

function assignLevelPositions(
  nodes: GraphifyNode[],
  edges: readonly GraphifyEdge[],
  rootId: string | undefined,
  spacing: number,
  getChildrenOf: (nodeId: string) => string[],
): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const roots = rootId
    ? [rootId]
    : nodes.filter((n) => !edges.some((e) => e.targetId === n.id)).map((n) => n.id);

  if (roots.length === 0 && nodes.length > 0) {
    const firstNode: GraphifyNode | undefined = nodes[0];
    if (firstNode) roots.push(firstNode.id);
  }

  const levels: string[][] = [];
  const queued = new Set<string>();
  const queue: Array<{ id: string; level: number }> = roots.map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { id, level } = item;
    if (queued.has(id)) continue;
    queued.add(id);

    if (!levels[level]) levels[level] = [];
    const currentLevel = levels[level];
    if (currentLevel) currentLevel.push(id);

    const children = getChildrenOf(id);
    for (const childId of children) {
      if (!queued.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    }
  }

  for (const node of nodes) {
    if (!queued.has(node.id)) {
      const level = levels.length;
      if (!levels[level]) levels[level] = [];
      const currentLevel = levels[level];
      if (currentLevel) currentLevel.push(node.id);
    }
  }

  for (let level = 0; level < levels.length; level++) {
    const levelNodes: string[] | undefined = levels[level];
    if (!levelNodes) continue;
    const totalWidth = (levelNodes.length - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < levelNodes.length; i++) {
      const nodeId: string | undefined = levelNodes[i];
      if (!nodeId) continue;
      const node = nodeMap.get(nodeId);
      if (node) {
        node.x = startX + i * spacing;
        node.y = level * spacing;
      }
    }
  }
}

function assignTreePositions(
  nodes: GraphifyNode[],
  edges: readonly GraphifyEdge[],
  rootId: string | undefined,
): void {
  const visited = new Set<string>();
  const childMap = new Map<string, string[]>();

  for (const node of nodes) {
    childMap.set(node.id, getChildren(node.id, edges, visited));
  }

  assignLevelPositions(nodes, edges, rootId, 60, (id) => childMap.get(id) ?? []);
}

function assignRadialPositions(
  nodes: GraphifyNode[],
  edges: readonly GraphifyEdge[],
  rootId: string | undefined,
): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const childrenOf = (nodeId: string): string[] => {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);
    return edges
      .filter((e) => e.sourceId === nodeId && !visited.has(e.targetId))
      .map((e) => e.targetId);
  };

  const roots = rootId
    ? [rootId]
    : nodes.filter((n) => !edges.some((e) => e.targetId === n.id)).map((n) => n.id);

  if (roots.length === 0 && nodes.length > 0) {
    const firstNode: GraphifyNode | undefined = nodes[0];
    if (firstNode) roots.push(firstNode.id);
  }

  const levels: string[][] = [];
  const queued = new Set<string>();
  const queue: Array<{ id: string; level: number }> = roots.map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { id, level } = item;
    if (queued.has(id)) continue;
    queued.add(id);

    if (!levels[level]) levels[level] = [];
    const currentLevel = levels[level];
    if (currentLevel) currentLevel.push(id);

    for (const childId of childrenOf(id)) {
      if (!queued.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    }
  }

  for (const node of nodes) {
    if (!queued.has(node.id)) {
      const level = levels.length;
      if (!levels[level]) levels[level] = [];
      const currentLevel = levels[level];
      if (currentLevel) currentLevel.push(node.id);
    }
  }

  const radiusStep = 80;
  for (let level = 0; level < levels.length; level++) {
    const levelNodes: string[] | undefined = levels[level];
    if (!levelNodes) continue;
    const radius = level === 0 ? 0 : level * radiusStep;
    const count = levelNodes.length;
    const angleStep = level === 0 ? 0 : (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const nodeId: string | undefined = levelNodes[i];
      if (!nodeId) continue;
      const node = nodeMap.get(nodeId);
      if (node) {
        if (level === 0) {
          node.x = 0;
          node.y = 0;
        } else {
          node.x = Math.cos(angleStep * i - Math.PI / 2) * radius;
          node.y = Math.sin(angleStep * i - Math.PI / 2) * radius;
        }
      }
    }
  }
}

function hasCycle(edges: readonly GraphifyEdge[]): boolean {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const edge of edges) {
    adj.set(edge.sourceId, [...(adj.get(edge.sourceId) ?? []), edge.targetId]);
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
    if (!inDegree.has(edge.sourceId)) inDegree.set(edge.sourceId, 0);
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  let count = 0;
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    count++;
    for (const neighbor of adj.get(node) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return count < inDegree.size;
}

function topologicalSort(nodes: GraphifyNode[], edges: readonly GraphifyEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    adj.get(edge.sourceId)?.push(edge.targetId);
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;
    sorted.push(node);
    for (const neighbor of adj.get(node) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return sorted;
}

function assignDAGPositions(nodes: GraphifyNode[], edges: readonly GraphifyEdge[]): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (hasCycle(edges)) {
    assignHierarchicalPositions(nodes, edges);
    return;
  }

  const sorted = topologicalSort(nodes, edges);
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
  }

  for (const nodeId of sorted) {
    const deg = inDegree.get(nodeId) ?? 0;
    layers.set(nodeId, deg);
  }

  const levelNodesMap = new Map<number, string[]>();
  for (const [nodeId, level] of layers) {
    if (!levelNodesMap.has(level)) levelNodesMap.set(level, []);
    const levelNodes = levelNodesMap.get(level);
    if (levelNodes) levelNodes.push(nodeId);
  }

  const spacing = 60;
  for (const [level, nodeIds] of levelNodesMap) {
    const totalWidth = (nodeIds.length - 1) * spacing;
    const startX = -totalWidth / 2;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeId: string | undefined = nodeIds[i];
      if (!nodeId) continue;
      const node = nodeMap.get(nodeId);
      if (node) {
        node.x = startX + i * spacing;
        node.y = level * spacing;
      }
    }
  }
}

function assignHierarchicalPositions(nodes: GraphifyNode[], edges: readonly GraphifyEdge[]): void {
  const childMap = new Map<string, string[]>();
  const visited = new Set<string>();

  for (const node of nodes) {
    const children = edges
      .filter((e) => e.sourceId === node.id && !visited.has(e.targetId))
      .map((e) => e.targetId);
    visited.add(node.id);
    childMap.set(node.id, children);
  }

  assignLevelPositions(nodes, edges, undefined, 60, (id) => childMap.get(id) ?? []);
}

function assignForcePositions(nodes: GraphifyNode[], _edges: readonly GraphifyEdge[]): void {
  for (const node of nodes) {
    if (node.x === undefined) node.x = (Math.random() - 0.5) * 400;
    if (node.y === undefined) node.y = (Math.random() - 0.5) * 400;
    if (node.vx === undefined) node.vx = 0;
    if (node.vy === undefined) node.vy = 0;
  }

  const iterations = 300;
  const repulsionStrength = 5000;
  const dampingFactor = 0.9;

  for (let iter = 0; iter < iterations; iter++) {
    for (const node of nodes) {
      let fx = 0;
      let fy = 0;

      for (const other of nodes) {
        if (other.id === node.id) continue;
        const dx = (node.x ?? 0) - (other.x ?? 0);
        const dy = (node.y ?? 0) - (other.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = repulsionStrength / (dist * dist);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      node.vx = fx;
      node.vy = fy;
    }

    for (const node of nodes) {
      node.vx = (node.vx ?? 0) * dampingFactor;
      node.vy = (node.vy ?? 0) * dampingFactor;
      node.x = (node.x ?? 0) + (node.vx ?? 0);
      node.y = (node.y ?? 0) + (node.vy ?? 0);
    }
  }
}

export function computeLayout(
  nodes: readonly GraphifyNode[],
  edges: readonly GraphifyEdge[],
  layout: GraphLayoutType,
): LayoutResult {
  const layoutNodes = nodes.map((n) => ({ ...n }));

  switch (layout) {
    case 'force':
      assignForcePositions(layoutNodes, edges);
      break;
    case 'hierarchical':
      assignHierarchicalPositions(layoutNodes, edges);
      break;
    case 'radial':
      assignRadialPositions(layoutNodes, edges, undefined);
      break;
    case 'tree':
      assignTreePositions(layoutNodes, edges, undefined);
      break;
    case 'dag':
      assignDAGPositions(layoutNodes, edges);
      break;
  }

  return { nodes: layoutNodes, edges };
}
