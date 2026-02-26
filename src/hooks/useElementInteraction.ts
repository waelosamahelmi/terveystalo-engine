import { useCallback, useRef } from 'react';
import type { EditorState, EditorElement } from '../types/editor';
import type { ResizeHandle } from '../components/editor/SelectionOverlay';

const GRID_SIZE = 10;
const MIN_SIZE = 10;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

interface UseElementInteractionProps {
  editorState: EditorState;
  selectedIds: string[];
  zoom: number;
  onStateChange: (state: EditorState) => void;
}

export function useElementInteraction({
  editorState,
  selectedIds,
  zoom,
  onStateChange,
}: UseElementInteractionProps) {
  const dragRef = useRef<{
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    originals: Map<string, { left: number; top: number; width: number; height: number }>;
    resizeHandle?: ResizeHandle;
  } | null>(null);

  const handleMoveStart = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (e.button !== 0) return;

      const element = editorState.elements.find((el) => el.id === elementId);
      if (!element || element.locked) return;

      // Build originals map for all selected elements
      const originals = new Map<string, { left: number; top: number; width: number; height: number }>();
      const idsToMove = selectedIds.includes(elementId) ? selectedIds : [elementId];

      idsToMove.forEach((id) => {
        const el = editorState.elements.find((e) => e.id === id);
        if (el) {
          originals.set(id, {
            left: el.left,
            top: el.top,
            width: el.width || 0,
            height: el.height || 0,
          });
        }
      });

      dragRef.current = {
        type: 'move',
        startX: e.clientX,
        startY: e.clientY,
        originals,
      };

      const scale = zoom / 100;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current || dragRef.current.type !== 'move') return;

        const dx = (moveEvent.clientX - dragRef.current.startX) / scale;
        const dy = (moveEvent.clientY - dragRef.current.startY) / scale;

        const newElements = editorState.elements.map((el) => {
          const orig = dragRef.current!.originals.get(el.id);
          if (!orig) return el;
          return {
            ...el,
            left: snapToGrid(orig.left + dx),
            top: snapToGrid(orig.top + dy),
          };
        });

        onStateChange({ ...editorState, elements: newElements });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [editorState, selectedIds, zoom, onStateChange]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, elementId: string, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();

      const element = editorState.elements.find((el) => el.id === elementId);
      if (!element || element.locked) return;

      const originals = new Map<string, { left: number; top: number; width: number; height: number }>();
      originals.set(elementId, {
        left: element.left,
        top: element.top,
        width: element.width || 0,
        height: element.height || 0,
      });

      dragRef.current = {
        type: 'resize',
        startX: e.clientX,
        startY: e.clientY,
        originals,
        resizeHandle: handle,
      };

      const scale = zoom / 100;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current || dragRef.current.type !== 'resize') return;

        const dx = (moveEvent.clientX - dragRef.current.startX) / scale;
        const dy = (moveEvent.clientY - dragRef.current.startY) / scale;
        const orig = dragRef.current.originals.get(elementId)!;
        const h = dragRef.current.resizeHandle!;

        let newLeft = orig.left;
        let newTop = orig.top;
        let newWidth = orig.width;
        let newHeight = orig.height;

        // Handle horizontal resize
        if (h.includes('e')) {
          newWidth = Math.max(MIN_SIZE, snapToGrid(orig.width + dx));
        }
        if (h.includes('w')) {
          const dw = snapToGrid(dx);
          newWidth = Math.max(MIN_SIZE, orig.width - dw);
          newLeft = orig.left + (orig.width - newWidth);
        }

        // Handle vertical resize
        if (h.includes('s')) {
          newHeight = Math.max(MIN_SIZE, snapToGrid(orig.height + dy));
        }
        if (h === 'n' || h === 'nw' || h === 'ne') {
          const dh = snapToGrid(dy);
          newHeight = Math.max(MIN_SIZE, orig.height - dh);
          newTop = orig.top + (orig.height - newHeight);
        }

        const newElements = editorState.elements.map((el) => {
          if (el.id !== elementId) return el;
          return { ...el, left: newLeft, top: newTop, width: newWidth, height: newHeight };
        });

        onStateChange({ ...editorState, elements: newElements });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [editorState, zoom, onStateChange]
  );

  return { handleMoveStart, handleResizeStart };
}
