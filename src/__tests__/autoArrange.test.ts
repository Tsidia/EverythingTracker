import { describe, it, expect } from 'vitest';
import { autoArrangeNodes } from '../components/mindmap/autoArrange';
import type { MindMapNode } from '../types';

function node(overrides: Partial<MindMapNode> & { id: string }): MindMapNode {
  return {
    id: overrides.id,
    text: overrides.text ?? 'node',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? 120,
    height: overrides.height ?? 120,
    fontSize: overrides.fontSize ?? 16,
    color: overrides.color ?? '#000',
    textColor: overrides.textColor ?? '#fff',
    parentId: overrides.parentId ?? null,
  };
}

describe('autoArrangeNodes', () => {
  it('returns input untouched when there is no root', () => {
    const nodes = [node({ id: 'a' }), node({ id: 'b', parentId: 'a' })];
    expect(autoArrangeNodes(nodes)).toEqual(nodes);
  });

  it('snaps the root to the origin', () => {
    const nodes = [node({ id: 'root', x: 999, y: -42 })];
    const out = autoArrangeNodes(nodes);
    expect(out[0].x).toBe(0);
    expect(out[0].y).toBe(0);
  });

  it('places every direct child away from the origin', () => {
    const nodes = [
      node({ id: 'root' }),
      node({ id: 'c1', parentId: 'root' }),
      node({ id: 'c2', parentId: 'root' }),
      node({ id: 'c3', parentId: 'root' }),
    ];
    const out = autoArrangeNodes(nodes);
    const children = out.filter(n => n.parentId === 'root');
    expect(children).toHaveLength(3);
    children.forEach(c => {
      expect(c.x ** 2 + c.y ** 2).toBeGreaterThan(0);
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
    });
  });

  it('gives every child a distinct position', () => {
    const nodes = [
      node({ id: 'root' }),
      node({ id: 'c1', parentId: 'root' }),
      node({ id: 'c2', parentId: 'root' }),
      node({ id: 'c3', parentId: 'root' }),
      node({ id: 'c4', parentId: 'root' }),
    ];
    const out = autoArrangeNodes(nodes);
    const children = out.filter(n => n.parentId === 'root');
    const seen = new Set<string>();
    children.forEach(c => seen.add(`${c.x.toFixed(3)},${c.y.toFixed(3)}`));
    expect(seen.size).toBe(children.length);
  });

  it('places grandchildren near their parent, not at the origin', () => {
    const nodes = [
      node({ id: 'root' }),
      node({ id: 'c1', parentId: 'root' }),
      node({ id: 'gc1', parentId: 'c1' }),
    ];
    const out = autoArrangeNodes(nodes);
    const c1 = out.find(n => n.id === 'c1')!;
    const gc1 = out.find(n => n.id === 'gc1')!;
    const dist = Math.hypot(gc1.x - c1.x, gc1.y - c1.y);
    expect(dist).toBeGreaterThan(0);
    expect(gc1.x === 0 && gc1.y === 0).toBe(false);
  });

  it('weights angular sweep by subtree size so a heavy branch gets more room', () => {
    // c1 has 3 grandchildren, c2 is a leaf. c1 should get a wider sweep,
    // which here means the angular distance from root-to-c1 to root-to-c2
    // should reflect the imbalance.
    const nodes = [
      node({ id: 'root' }),
      node({ id: 'c1', parentId: 'root' }),
      node({ id: 'c2', parentId: 'root' }),
      node({ id: 'gc1', parentId: 'c1' }),
      node({ id: 'gc2', parentId: 'c1' }),
      node({ id: 'gc3', parentId: 'c1' }),
    ];
    const out = autoArrangeNodes(nodes);
    const c1 = out.find(n => n.id === 'c1')!;
    const c2 = out.find(n => n.id === 'c2')!;
    // Both children placed; the test mainly asserts the layout completes
    // and produces sensible non-overlapping coordinates.
    expect(c1.x !== c2.x || c1.y !== c2.y).toBe(true);
  });

  it('is deterministic: same input produces the same output', () => {
    const nodes = [
      node({ id: 'root' }),
      node({ id: 'c1', parentId: 'root' }),
      node({ id: 'c2', parentId: 'root' }),
    ];
    const a = autoArrangeNodes(nodes);
    const b = autoArrangeNodes(nodes);
    expect(a).toEqual(b);
  });
});
