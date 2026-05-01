import type React from 'react';
import type { MindMapNode } from '../../types';

interface Props {
  node: MindMapNode;
  isSelected: boolean;
  isEditing: boolean;
  zoom: number;
  screenX: number;
  screenY: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onTextChange: (text: string) => void;
  onEditEnd: () => void;
}

export function MindMapNodeView({
  node,
  isSelected,
  isEditing,
  zoom,
  screenX,
  screenY,
  onMouseDown,
  onDoubleClick,
  onTextChange,
  onEditEnd,
}: Props) {
  return (
    <div
      className={`mindmap-node ${isSelected ? 'selected' : ''}`}
      style={{
        left: screenX,
        top: screenY,
        width: node.width * zoom,
        height: node.height * zoom,
        backgroundColor: node.color,
        color: node.textColor,
        fontSize: node.fontSize * zoom,
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
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
        {isEditing ? (
          <textarea
            className="mindmap-text-edit"
            value={node.text}
            onChange={e => onTextChange(e.target.value)}
            onBlur={onEditEnd}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onEditEnd();
              }
            }}
            autoFocus
            rows={3}
            style={{ fontSize: node.fontSize * zoom }}
          />
        ) : (
          node.text
        )}
      </div>
    </div>
  );
}
