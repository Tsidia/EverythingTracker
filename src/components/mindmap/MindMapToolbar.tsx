import type { MindMapNode } from '../../types';

interface Props {
  selected: MindMapNode | null;
  onAddChild: () => void;
  onDelete: () => void;
  onAutoArrange: () => void;
  onAddImage: () => void;
  onUpdateNode: (updates: Partial<MindMapNode>) => void;
}

export function MindMapToolbar({
  selected,
  onAddChild,
  onDelete,
  onAutoArrange,
  onAddImage,
  onUpdateNode,
}: Props) {
  return (
    <div className="mindmap-toolbar">
      <button className="btn btn-primary" onClick={onAddChild} disabled={!selected}>
        + Add Child
      </button>
      <button
        className="btn btn-danger"
        onClick={onDelete}
        disabled={!selected || selected.id === 'root'}
      >
        Delete
      </button>
      <button className="btn btn-secondary" onClick={onAutoArrange}>
        Auto Arrange
      </button>
      <button className="btn btn-secondary" onClick={onAddImage} disabled={!selected}>
        Add Image
      </button>
      <div className="separator" />

      {selected && (
        <>
          <label>Color</label>
          <input
            type="color"
            value={selected.color}
            onChange={e => onUpdateNode({ color: e.target.value })}
          />
          <label>Text</label>
          <input
            type="color"
            value={selected.textColor}
            onChange={e => onUpdateNode({ textColor: e.target.value })}
          />
          <label>Size</label>
          <input
            type="range"
            min={60}
            max={300}
            value={selected.width}
            onChange={e => {
              const v = parseInt(e.target.value);
              onUpdateNode({ width: v, height: v });
            }}
          />
          <label>Font Size</label>
          <input
            type="range"
            min={10}
            max={40}
            value={selected.fontSize}
            onChange={e => onUpdateNode({ fontSize: parseInt(e.target.value) })}
          />
        </>
      )}
    </div>
  );
}
