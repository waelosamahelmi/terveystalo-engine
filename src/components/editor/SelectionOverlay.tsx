import React from 'react';
import type { EditorElement } from '../../types/editor';

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface SelectionOverlayProps {
  element: EditorElement;
  zoom: number;
  onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
}

const HANDLE_SIZE = 8;

const handlePositions: Record<ResizeHandle, { top: string; left: string; cursor: string }> = {
  nw: { top: '-4px', left: '-4px', cursor: 'nwse-resize' },
  n:  { top: '-4px', left: '50%', cursor: 'ns-resize' },
  ne: { top: '-4px', left: 'calc(100% - 4px)', cursor: 'nesw-resize' },
  e:  { top: '50%', left: 'calc(100% - 4px)', cursor: 'ew-resize' },
  se: { top: 'calc(100% - 4px)', left: 'calc(100% - 4px)', cursor: 'nwse-resize' },
  s:  { top: 'calc(100% - 4px)', left: '50%', cursor: 'ns-resize' },
  sw: { top: 'calc(100% - 4px)', left: '-4px', cursor: 'nesw-resize' },
  w:  { top: '50%', left: '-4px', cursor: 'ew-resize' },
};

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  element,
  zoom,
  onResizeStart,
}) => {
  return (
    <div
      className="selection-overlay"
      style={{
        position: 'absolute',
        left: element.left,
        top: element.top,
        width: element.width || 0,
        height: element.height || 0,
        transform: element.angle ? `rotate(${element.angle}deg)` : undefined,
        zIndex: 9999,
        pointerEvents: 'none',
        border: '2px solid #0066cc',
        boxSizing: 'border-box',
      }}
    >
      {(Object.entries(handlePositions) as [ResizeHandle, typeof handlePositions[ResizeHandle]][]).map(
        ([handle, pos]) => (
          <div
            key={handle}
            className="resize-handle"
            style={{
              position: 'absolute',
              top: pos.top,
              left: pos.left,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              background: 'white',
              border: '2px solid #0066cc',
              borderRadius: '50%',
              cursor: pos.cursor,
              pointerEvents: 'auto',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onResizeStart(e, handle);
            }}
          />
        )
      )}
    </div>
  );
};
