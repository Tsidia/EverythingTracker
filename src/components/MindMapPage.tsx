import { useState, useRef, useCallback, useEffect } from 'react';
import type { MindMapNode, MindMapData } from '../types';
import { getMindMap, saveMindMap } from '../store';
import { useSettings } from '../settings';
import { autoArrangeNodes } from './mindmap/autoArrange';
import { MindMapToolbar } from './mindmap/MindMapToolbar';
import { MindMapNodeView } from './mindmap/MindMapNodeView';

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
    persist({ ...data, nodes: autoArrangeNodes(data.nodes) });
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

  const wrapW = wrapRef.current?.getBoundingClientRect().width || window.innerWidth;
  const wrapH = wrapRef.current?.getBoundingClientRect().height || window.innerHeight - 100;
  const centerX = wrapW / 2;
  const centerY = wrapH / 2;

  return (
    <div className="mindmap-page">
      <MindMapToolbar
        selected={selected}
        onAddChild={addChild}
        onDelete={deleteNode}
        onAutoArrange={autoArrange}
        onAddImage={handleAddImage}
        onUpdateNode={updates => selected && updateNode(selected.id, updates)}
      />

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
            <MindMapNodeView
              key={node.id}
              node={node}
              isSelected={node.id === selectedId}
              isEditing={editingId === node.id}
              zoom={data.zoom}
              screenX={screenX}
              screenY={screenY}
              onMouseDown={e => handleNodeMouseDown(node.id, e)}
              onDoubleClick={e => { e.stopPropagation(); setEditingId(node.id); }}
              onTextChange={text => updateNode(node.id, { text })}
              onEditEnd={() => setEditingId(null)}
            />
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
