import { useState, useCallback } from 'react';
import type { EditorState } from '../types/editor';
import { updateElement } from '../lib/editorActions';

interface UseInlineTextEditingProps {
  editorState: EditorState;
  onStateChange: (state: EditorState) => void;
}

export function useInlineTextEditing({ editorState, onStateChange }: UseInlineTextEditingProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const startEditing = useCallback((elementId: string) => {
    const element = editorState.elements.find((el) => el.id === elementId);
    if (!element || element.type !== 'text' || element.locked) return;
    setEditingId(elementId);
  }, [editorState]);

  const commitText = useCallback(
    (elementId: string, newText: string) => {
      if (editingId !== elementId) return;
      const element = editorState.elements.find((el) => el.id === elementId);
      if (!element) return;

      // Only update if text actually changed
      if (newText !== element.text) {
        onStateChange(updateElement(editorState, elementId, { text: newText }));
      }
      setEditingId(null);
    },
    [editingId, editorState, onStateChange]
  );

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  return { editingId, startEditing, commitText, cancelEditing };
}
