import { useState, useRef, useCallback, useEffect } from 'react';
import type { MindMapNode, MindMapData } from '../types';
import { getMindMap, saveMindMap } from '../store';
import { useSettings } from '../settings';

// Downscale oversized images client-side so they don't balloon localStorage.
// Max dimension 600px, output JPEG ~0.82 quality.
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const MAX = 600;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.82);
}

export function MindMapPage() {
  const [settings] = useSettings();
  const [data, setData] = useState<MindMapData>(() => getMindMap());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const panStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = data.nodes.find(n => n.id === selectedId) || null;

  const persist = useCallback((d: MindMapData) => {
    setData(d);
    saveMindMap(d);
  }, []);

  const updateNode = useCallback((id: string, updates: Partial<MindMapNode>) => {
    setData(prev => {
      const next = {
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, ...updates } : n),
      };
      saveMindMap(next);
      return next;
    });
  }, []);

  const addChild = () => {
    if (!selectedId) return;
    const parent = data.nodes.find(n => n.id === selectedId);
    if (!parent) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = 200;
    const newNode: MindMapNode = {
      id: crypto.randomUUID(),
      text: 'New thought',
      x: parent.x + Math.cos(angle) * dist,
      y: parent.y + Math.sin(angle) * dist,
      width: 120,
      height: 120,
      fontSize: 16,
      color: '#2d3436',
      textColor: '#e8e8f0',
      parentId: selectedId,
    };
    persist({ ...data, nodes: [...data.nodes, newNode] });
    setSelectedId(newNode.id);
    setEditingId(newNode.id);
  };

  const deleteNode = useCallback(() => {
    if (!selectedId || selectedId === 'root') return;
    const toDelete = new Set<string>();
    const collect = (id: string) => {
      toDelete.add(id);
      data.nodes.filter(n => n.parentId === id).forEach(n => collect(n.id));
    };
    collect(selectedId);
    persist({ ...data, nodes: data.nodes.filter(n => !toDelete.has(n.id)) });
    setSelectedId(null);
  }, [selectedId, data, persist]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedId && selectedId !== 'root' && !editingId) {
        deleteNode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId, deleteNode]);

  const handleAddImage = () => {
    if (!selectedId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await resizeImage(file);
        updateNode(selectedId, { imageUrl: dataUrl });
      } catch {
        alert('Could not process that image.');
      }
    };
    input.click();
  };

  const autoArrange = () => {
    const root = data.nodes.find(n => n.id === 'root');
    if (!root) return;

    const nodeMap = new Map(data.nodes.map(n => [n.id, n]));
    const positioned = new Map<string, { x: number; y: number }>();
    positioned.set('root', { x: 0, y: 0 });

    // Count all descendants (including self) to weight spacing
    const subtreeSize = (id: string): number => {
      const children = data.nodes.filter(n => n.parentId === id);
      if (children.length === 0) return 1;
      return children.reduce((sum, c) => sum + subtreeSize(c.id), 0);
    };

    const arrangeChildren = (parentId: string, cx: number, cy: number, startAngle: number, sweep: number, depth: number) => {
      const children = data.nodes.filter(n => n.parentId === parentId);
      if (children.length === 0) return;

      const parent = nodeMap.get(parentId)!;

      // Calculate radius: enough to clear parent + largest child with generous padding
      const maxChildRadius = Math.max(...children.map(c => c.width / 2));
      const parentRadius = parent.width / 2;
      const padding = 60 + depth * 20;
      const minRadius = parentRadius + maxChildRadius + padding;

      // Also ensure siblings don't overlap each other.
      // For N children spread over `sweep` radians, the chord between adjacent
      // children at distance R is ~R * (sweep/N). That must exceed the sum of
      // adjacent radii plus padding.
      const maxPairWidth = children.length > 1
        ? Math.max(...children.map(c => c.width)) + 40
        : 0;
      const spacingRadius = children.length > 1
        ? (maxPairWidth * children.length) / (sweep * 0.9)
        : 0;

      const radius = Math.max(minRadius, spacingRadius);

      // Distribute angles weighted by subtree size so larger branches get more room
      const weights = children.map(c => subtreeSize(c.id));
      const totalWeight = weights.reduce((a, b) => a + b, 0);

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

    const nodes = data.nodes.map(n => {
      const pos = positioned.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });

    persist({ ...data, nodes });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === wrapRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setPanning(true);
      panStart.current = { x: e.clientX - data.viewX, y: e.clientY - data.viewY };
      setSelectedId(null);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panning) {
      const vx = e.clientX - panStart.current.x;
      const vy = e.clientY - panStart.current.y;
      setData(prev => ({ ...prev, viewX: vx, viewY: vy }));
    }
    if (dragging) {
      setData(prev => {
        const next = {
          ...prev,
          nodes: prev.nodes.map(n =>
            n.id === dragging
              ? {
                  ...n,
                  x: (e.clientX - dragOffset.current.x - prev.viewX) / prev.zoom - (wrapRef.current?.getBoundingClientRect().width || 0) / 2 / prev.zoom,
                  y: (e.clientY - dragOffset.current.y - prev.viewY) / prev.zoom - (wrapRef.current?.getBoundingClientRect().height || 0) / 2 / prev.zoom,
                }
              : n
          ),
        };
        return next;
      });
    }
  }, [panning, dragging]);

  const handleMouseUp = useCallback(() => {
    if (panning) {
      setPanning(false);
      saveMindMap(data);
    }
    if (dragging) {
      setDragging(null);
      saveMindMap(data);
    }
  }, [panning, dragging, data]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setData(prev => {
      const next = { ...prev, zoom: Math.max(0.2, Math.min(3, prev.zoom * delta)) };
      saveMindMap(next);
      return next;
    });
  };

  const handleNodeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const node = data.nodes.find(n => n.id === id)!;
    const rect = wrapRef.current!.getBoundingClientRect();
    const screenX = (node.x + rect.width / 2 / data.zoom) * data.zoom + data.viewX;
    const screenY = (node.y + rect.height / 2 / data.zoom) * data.zoom + data.viewY;
    dragOffset.current = { x: e.clientX - screenX, y: e.clientY - screenY };
    setDragging(id);
  };

  const handleNodeDoubleClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
  };

  const wrapW = wrapRef.current?.getBoundingClientRect().width || window.innerWidth;
  const wrapH = wrapRef.current?.getBoundingClientRect().height || window.innerHeight - 100;
  const centerX = wrapW / 2;
  const centerY = wrapH / 2;

  return (
    <div className="mindmap-page">
      <div className="mindmap-toolbar">
        <button className="btn btn-primary" onClick={addChild} disabled={!selectedId}>
          + Add Child
        </button>
        <button className="btn btn-danger" onClick={deleteNode} disabled={!selectedId || selectedId === 'root'}>
          Delete
        </button>
        <button className="btn btn-secondary" onClick={autoArrange}>
          Auto Arrange
        </button>
        <button className="btn btn-secondary" onClick={handleAddImage} disabled={!selectedId}>
          Add Image
        </button>
        <div className="separator" />

        {selected && (
          <>
            <label>Color</label>
            <input
              type="color"
              value={selected.color}
              onChange={e => updateNode(selected.id, { color: e.target.value })}
            />
            <label>Text</label>
            <input
              type="color"
              value={selected.textColor}
              onChange={e => updateNode(selected.id, { textColor: e.target.value })}
            />
            <label>Size</label>
            <input
              type="range"
              min={60}
              max={300}
              value={selected.width}
              onChange={e => {
                const v = parseInt(e.target.value);
                updateNode(selected.id, { width: v, height: v });
              }}
            />
            <label>Font Size</label>
            <input
              type="range"
              min={10}
              max={40}
              value={selected.fontSize}
              onChange={e => updateNode(selected.id, { fontSize: parseInt(e.target.value) })}
            />
          </>
        )}
      </div>

      <div
        className="mindmap-canvas-wrap"
        ref={wrapRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
      >
        {/* SVG lines */}
        <svg className="mindmap-canvas" style={{ pointerEvents: 'none' }}>
          {data.nodes.filter(n => n.parentId).map(node => {
            const parent = data.nodes.find(p => p.id === node.parentId);
            if (!parent) return null;
            const x1 = (parent.x) * data.zoom + data.viewX + centerX;
            const y1 = (parent.y) * data.zoom + data.viewY + centerY;
            const x2 = (node.x) * data.zoom + data.viewX + centerX;
            const y2 = (node.y) * data.zoom + data.viewY + centerY;
            return (
              <line
                key={`line-${node.id}`}
                className="mindmap-line"
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {data.nodes.map(node => {
          const screenX = (node.x) * data.zoom + data.viewX + centerX - (node.width * data.zoom) / 2;
          const screenY = (node.y) * data.zoom + data.viewY + centerY - (node.height * data.zoom) / 2;

          return (
            <div
              key={node.id}
              className={`mindmap-node ${node.id === selectedId ? 'selected' : ''}`}
              style={{
                left: screenX,
                top: screenY,
                width: node.width * data.zoom,
                height: node.height * data.zoom,
                backgroundColor: node.color,
                color: node.textColor,
                fontSize: node.fontSize * data.zoom,
              }}
              onMouseDown={e => handleNodeMouseDown(node.id, e)}
              onDoubleClick={e => handleNodeDoubleClick(node.id, e)}
            >
              {node.imageUrl && (
                <img
                  src={node.imageUrl}
                  alt=""
                  className="mindmap-node-bg-img"
                  style={{ objectFit: node.imageFit || 'cover' }}
                />
              )}
              <div className="mindmap-node-text">
                {editingId === node.id ? (
                  <textarea
                    className="mindmap-text-edit"
                    value={node.text}
                    onChange={e => updateNode(node.id, { text: e.target.value })}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    autoFocus
                    rows={3}
                    style={{ fontSize: node.fontSize * data.zoom }}
                  />
                ) : (
                  node.text
                )}
              </div>
            </div>
          );
        })}
      </div>

      {settings.showHints && (
        <div className="hint-row mindmap-hint">
          Click a node to select · Double-click to edit · Drag to move · Scroll to zoom · Delete key removes selected
        </div>
      )}
    </div>
  );
}
