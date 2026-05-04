import type { MindMapNode } from '../../types';

// Radial layout: place root at the origin and arrange descendants on circles
// around their parent. Each child gets an angular slice of its parent's sweep
// weighted by subtree size, so a branch with many descendants gets more room
// than a leaf sibling. Pure: same input always produces the same output.
export function autoArrangeNodes(nodes: MindMapNode[]): MindMapNode[] {
  const root = nodes.find(n => n.id === 'root');
  if (!root) return nodes;

  const positioned = new Map<string, { x: number; y: number }>();
  positioned.set('root', { x: 0, y: 0 });

  // Number of leaves under `id` (counting `id` itself if it has none). Used as
  // the angular weight so a deep branch doesn't get squeezed by a flat one.
  const subtreeSize = (id: string): number => {
    const children = nodes.filter(n => n.parentId === id);
    if (children.length === 0) return 1;
    return children.reduce((sum, c) => sum + subtreeSize(c.id), 0);
  };

  const arrangeChildren = (
    parentId: string,
    cx: number,
    cy: number,
    startAngle: number,
    sweep: number,
    depth: number,
  ) => {
    const children = nodes.filter(n => n.parentId === parentId);
    if (children.length === 0) return;

    const parent = nodes.find(n => n.id === parentId)!;

    // Radius needs to clear parent + largest child plus a depth-scaled padding.
    const maxChildRadius = Math.max(...children.map(c => c.width / 2));
    const parentRadius = parent.width / 2;
    const padding = 60 + depth * 20;
    const minRadius = parentRadius + maxChildRadius + padding;

    const weights = children.map(c => subtreeSize(c.id));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    // Each adjacent pair gets its own required radius. Slices are weighted by
    // subtree size, not width, so a wide leaf can land in a tiny slice; the
    // chord between two centers separated by Δθ at radius R is 2R·sin(Δθ/2),
    // which must exceed each pair's actual half-widths plus padding.
    const pairPadding = 40;
    const childSweeps = weights.map(w => (w / totalWeight) * sweep);
    const fullCircle = sweep >= Math.PI * 2 - 1e-9;
    let spacingRadius = 0;
    const requiredRadius = (i: number, j: number) => {
      const gap = (childSweeps[i] + childSweeps[j]) / 2;
      const chord = (children[i].width + children[j].width) / 2 + pairPadding;
      const sinHalf = Math.sin(gap / 2);
      return sinHalf > 0 ? chord / (2 * sinHalf) : Infinity;
    };
    for (let i = 0; i < children.length - 1; i++) {
      spacingRadius = Math.max(spacingRadius, requiredRadius(i, i + 1));
    }
    if (fullCircle && children.length > 1) {
      spacingRadius = Math.max(spacingRadius, requiredRadius(children.length - 1, 0));
    }

    const radius = Math.max(minRadius, spacingRadius);

    let currentAngle = startAngle;
    children.forEach((child, i) => {
      const childSweep = (weights[i] / totalWeight) * sweep;
      const angle = currentAngle + childSweep / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      positioned.set(child.id, { x, y });
      arrangeChildren(child.id, x, y, currentAngle, childSweep, depth + 1);
      currentAngle += childSweep;
    });
  };

  arrangeChildren('root', 0, 0, 0, Math.PI * 2, 0);

  return nodes.map(n => {
    const pos = positioned.get(n.id);
    return pos ? { ...n, x: pos.x, y: pos.y } : n;
  });
}
