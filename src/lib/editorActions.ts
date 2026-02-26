import type { EditorState, EditorElement, AlignmentOption } from '../types/editor';

export function generateElementId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function addTextElement(state: EditorState): EditorState {
  const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
  const newElement: EditorElement = {
    id: generateElementId(),
    type: 'text',
    name: `Text ${state.elements.length + 1}`,
    visible: true,
    locked: false,
    left: Math.round(state.canvas.width / 2 - 50),
    top: Math.round(state.canvas.height / 2 - 12),
    width: 100,
    height: 30,
    angle: 0,
    opacity: 1,
    text: 'Text',
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fill: '#000000',
    zIndex: maxZ + 1,
  };
  return { ...state, elements: [...state.elements, newElement] };
}

export function addImageElement(state: EditorState, src: string): EditorState {
  const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
  const newElement: EditorElement = {
    id: generateElementId(),
    type: 'image',
    name: `Image ${state.elements.length + 1}`,
    visible: true,
    locked: false,
    left: Math.round(state.canvas.width / 2 - 75),
    top: Math.round(state.canvas.height / 2 - 50),
    width: 150,
    height: 100,
    angle: 0,
    opacity: 1,
    src,
    zIndex: maxZ + 1,
  };
  return { ...state, elements: [...state.elements, newElement] };
}

export function addRectangleElement(state: EditorState): EditorState {
  const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
  const newElement: EditorElement = {
    id: generateElementId(),
    type: 'rectangle',
    name: `Rectangle ${state.elements.length + 1}`,
    visible: true,
    locked: false,
    left: Math.round(state.canvas.width / 2 - 50),
    top: Math.round(state.canvas.height / 2 - 50),
    width: 100,
    height: 100,
    angle: 0,
    opacity: 1,
    fill: '#cccccc',
    zIndex: maxZ + 1,
  };
  return { ...state, elements: [...state.elements, newElement] };
}

export function addCircleElement(state: EditorState): EditorState {
  const maxZ = state.elements.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
  const newElement: EditorElement = {
    id: generateElementId(),
    type: 'circle',
    name: `Circle ${state.elements.length + 1}`,
    visible: true,
    locked: false,
    left: Math.round(state.canvas.width / 2 - 50),
    top: Math.round(state.canvas.height / 2 - 50),
    width: 100,
    height: 100,
    angle: 0,
    opacity: 1,
    fill: '#cccccc',
    zIndex: maxZ + 1,
  };
  return { ...state, elements: [...state.elements, newElement] };
}

export function deleteElements(state: EditorState, ids: string[]): EditorState {
  return {
    ...state,
    elements: state.elements.filter((el) => !ids.includes(el.id)),
  };
}

export function updateElement(state: EditorState, id: string, updates: Partial<EditorElement>): EditorState {
  return {
    ...state,
    elements: state.elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    ),
  };
}

export function updateElements(state: EditorState, ids: string[], updates: Partial<EditorElement>): EditorState {
  return {
    ...state,
    elements: state.elements.map((el) =>
      ids.includes(el.id) ? { ...el, ...updates } : el
    ),
  };
}

export function reorderElement(state: EditorState, id: string, direction: 'up' | 'down'): EditorState {
  const sorted = [...state.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  const idx = sorted.findIndex((el) => el.id === id);
  if (idx === -1) return state;

  const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return state;

  // Swap z-indices
  const currentZ = sorted[idx].zIndex || 0;
  const swapZ = sorted[swapIdx].zIndex || 0;

  return {
    ...state,
    elements: state.elements.map((el) => {
      if (el.id === sorted[idx].id) return { ...el, zIndex: swapZ };
      if (el.id === sorted[swapIdx].id) return { ...el, zIndex: currentZ };
      return el;
    }),
  };
}

export function alignElements(
  state: EditorState,
  ids: string[],
  alignment: AlignmentOption
): EditorState {
  const canvasWidth = state.canvas.width;
  const canvasHeight = state.canvas.height;

  return {
    ...state,
    elements: state.elements.map((el) => {
      if (!ids.includes(el.id)) return el;

      switch (alignment) {
        case 'left':
          return { ...el, left: 0 };
        case 'center':
          return { ...el, left: Math.round((canvasWidth - (el.width || 0)) / 2) };
        case 'right':
          return { ...el, left: canvasWidth - (el.width || 0) };
        case 'top':
          return { ...el, top: 0 };
        case 'middle':
          return { ...el, top: Math.round((canvasHeight - (el.height || 0)) / 2) };
        case 'bottom':
          return { ...el, top: canvasHeight - (el.height || 0) };
        default:
          return el;
      }
    }),
  };
}
