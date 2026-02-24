import React from 'react';
import { AlignmentOption } from '../../types/editor';
import {
  RxText,
  RxImage,
  RxCircle,
  RxAlignLeft,
  RxAlignRight,
  RxAlignTop,
  RxAlignBottom,
  RxReset,
  RxReload,
  RxTrash,
  RxZoomIn,
  RxZoomOut,
  RxMagicWand,
  RxMinus,
  RxSquare,
} from 'react-icons/rx';

interface EditorToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onAddText: () => void;
  onAddImage: () => void;
  onAddRectangle: () => void;
  onAddCircle: () => void;
  onAlign: (alignment: AlignmentOption) => void;
  onDelete: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleVariables?: () => void;
  onToggleAssets?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  zoom,
  onZoomChange,
  onAddText,
  onAddImage,
  onAddRectangle,
  onAddCircle,
  onAlign,
  onDelete,
  onUndo,
  onRedo,
  onToggleVariables,
  onToggleAssets,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
}) => {
  return (
    <div className="editor-toolbar">
      <ToolbarGroup title="Add Elements">
        <ToolbarButton icon={<RxText size={18} />} label="Text" onClick={onAddText} />
        <ToolbarButton icon={<RxImage size={18} />} label="Image" onClick={onAddImage} />
        <ToolbarButton icon={<RxSquare size={18} />} label="Rectangle" onClick={onAddRectangle} />
        <ToolbarButton icon={<RxCircle size={18} />} label="Circle" onClick={onAddCircle} />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup title="Alignment">
        <ToolbarButton
          icon={<RxAlignLeft size={18} />}
          label="Align Left"
          onClick={() => onAlign('left')}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<RxMinus size={18} style={{transform: 'rotate(0deg)'}} />}
          label="Align Center"
          onClick={() => onAlign('center')}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<RxAlignRight size={18} />}
          label="Align Right"
          onClick={() => onAlign('right')}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<RxAlignTop size={18} />}
          label="Align Top"
          onClick={() => onAlign('top')}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<RxMinus size={18} />}
          label="Align Middle"
          onClick={() => onAlign('middle')}
          disabled={!hasSelection}
        />
        <ToolbarButton
          icon={<RxAlignBottom size={18} />}
          label="Align Bottom"
          onClick={() => onAlign('bottom')}
          disabled={!hasSelection}
        />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup title="History">
        <ToolbarButton
          icon={<RxReset size={18} />}
          label="Undo"
          onClick={onUndo}
          disabled={!canUndo || !onUndo}
        />
        <ToolbarButton
          icon={<RxReload size={18} />}
          label="Redo"
          onClick={onRedo}
          disabled={!canRedo || !onRedo}
        />
        <ToolbarButton
          icon={<RxTrash size={18} />}
          label="Delete"
          onClick={onDelete}
          disabled={!hasSelection}
          danger
        />
      </ToolbarGroup>

      <ToolbarDivider />

      <ToolbarGroup title="Zoom">
        <ToolbarButton
          icon={<RxZoomOut size={18} />}
          label="Zoom Out"
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
        />
        <span className="zoom-label">{Math.round(zoom)}%</span>
        <ToolbarButton
          icon={<RxZoomIn size={18} />}
          label="Zoom In"
          onClick={() => onZoomChange(Math.min(200, zoom + 25))}
        />
      </ToolbarGroup>

      <div className="toolbar-spacer" />

      <ToolbarGroup title="Panels">
        {onToggleVariables && (
          <ToolbarButton
            icon={<RxMagicWand size={18} />}
            label="Variables"
            onClick={onToggleVariables}
          />
        )}
        {onToggleAssets && (
          <ToolbarButton icon={<RxImage size={18} />} label="Assets" onClick={onToggleAssets} />
        )}
      </ToolbarGroup>
    </div>
  );
};

interface ToolbarGroupProps {
  title: string;
  children: React.ReactNode;
}

const ToolbarGroup: React.FC<ToolbarGroupProps> = ({ title, children }) => {
  return (
    <div className="toolbar-group" title={title}>
      {children}
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}) => {
  return (
    <button
      className={`toolbar-button ${danger ? 'danger' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
    >
      {icon}
    </button>
  );
};

const ToolbarDivider: React.FC = () => {
  return <div className="toolbar-divider" />;
};
