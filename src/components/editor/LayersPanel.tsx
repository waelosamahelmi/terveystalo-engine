import React from 'react';
import { EditorElement } from '../../types/editor';
import {
  RxText,
  RxImage,
  RxSquare,
  RxCircle,
  RxEyeOpen,
  RxEyeClosed,
  RxCross1,
  RxCheck,
} from 'react-icons/rx';

interface LayersPanelProps {
  elements: EditorElement[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  elements,
  selectedIds,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onReorder,
}) => {
  // Sort elements by z-index (reverse for display - top layer first)
  const sortedElements = [...elements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

  return (
    <div className="layers-panel">
      <div className="layers-header">
        <h3>Layers</h3>
        <span className="layers-count">{elements.length}</span>
      </div>

      <div className="layers-list">
        {sortedElements.map((element, index) => (
          <LayerItem
            key={element.id}
            element={element}
            isSelected={selectedIds.includes(element.id)}
            isTopLayer={index === 0}
            isBottomLayer={index === sortedElements.length - 1}
            onSelect={() => onSelect([element.id])}
            onToggleVisibility={() => onToggleVisibility(element.id)}
            onToggleLock={() => onToggleLock(element.id)}
            onDelete={() => onDelete(element.id)}
            onMoveUp={() => onReorder(element.id, 'up')}
            onMoveDown={() => onReorder(element.id, 'down')}
          />
        ))}

        {elements.length === 0 && (
          <div className="layers-empty">
            <p>No elements yet</p>
            <p className="hint">Add elements from the toolbar</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface LayerItemProps {
  element: EditorElement;
  isSelected: boolean;
  isTopLayer: boolean;
  isBottomLayer: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  element,
  isSelected,
  isTopLayer,
  isBottomLayer,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className={`layer-item ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="layer-item-main">
        <button
          className="layer-visibility-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          title={element.visible ? 'Hide' : 'Show'}
        >
          {element.visible ? <RxEyeOpen size={16} /> : <RxEyeClosed size={16} />}
        </button>

        <button
          className="layer-lock-btn"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          title={element.locked ? 'Unlock' : 'Lock'}
        >
          {element.locked ? <RxCross1 size={14} /> : <RxCheck size={14} />}
        </button>

        <div className="layer-icon">{getElementIcon(element.type)}</div>

        <span className="layer-name">{element.name}</span>

        {isHovered && (
          <div className="layer-actions">
            <button
              className="layer-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
              disabled={isTopLayer}
              title="Move Up"
            >
              ↑
            </button>
            <button
              className="layer-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
              disabled={isBottomLayer}
              title="Move Down"
            >
              ↓
            </button>
            <button
              className="layer-action-btn danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {element.variableName && (
        <div className="layer-variable-badge" title={`Bound to variable: ${element.variableName}`}>
          {`{{${element.variableName}}}`}
        </div>
      )}
    </div>
  );
};

const getElementIcon = (type: EditorElement['type']) => {
  switch (type) {
    case 'text':
      return <RxText size={18} />;
    case 'image':
      return <RxImage size={18} />;
    case 'rectangle':
      return <RxSquare size={18} />;
    case 'circle':
      return <RxCircle size={18} />;
    default:
      return <RxText size={18} />;
  }
};
