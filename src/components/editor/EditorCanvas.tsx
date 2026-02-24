import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Circle, IText, FabricImage, FabricObject } from 'fabric';
import { EditorElement, EditorState, CreativeTemplate } from '../../types/editor';
import { convertTemplateToEditorState } from '../../lib/editorService';

interface EditorCanvasProps {
  template?: CreativeTemplate;
  width: number;
  height: number;
  onStateChange?: (state: EditorState) => void;
  onSelect?: (elements: EditorElement[]) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = (props, ref) => {
  const {
    template,
    width,
    height,
    onStateChange,
    onSelect,
    onDirtyChange,
  } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    });

    fabricCanvasRef.current = canvas;
    setIsReady(true);

    // Enable snap to grid
    const GRID_SIZE = 10;
    canvas.on('object:moving', (options) => {
      if (options.target) {
        options.target.set({
          left: Math.round(options.target.left! / GRID_SIZE) * GRID_SIZE,
          top: Math.round(options.target.top! / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    // Listen to selection events
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      onSelect?.([]);
    });

    // Listen to modifications
    canvas.on('object:modified', () => {
      onDirtyChange?.(true);
      emitStateChange();
    });

    canvas.on('object:added', () => {
      onDirtyChange?.(true);
      emitStateChange();
    });

    canvas.on('object:removed', () => {
      onDirtyChange?.(true);
      emitStateChange();
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height]);

  // Load template state
  useEffect(() => {
    if (!isReady || !fabricCanvasRef.current || !template) return;

    // Convert template to editor state (handles both old HTML and new editor_state formats)
    const editorState = template.editor_state || convertTemplateToEditorState(template);
    loadState(editorState);
  }, [isReady, template]);

  const handleSelection = () => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    const elements: EditorElement[] = activeObjects.map((obj) =>
      fabricObjectToEditorElement(obj)
    );

    onSelect?.(elements);
  };

  const emitStateChange = () => {
    if (!fabricCanvasRef.current) return;

    const state = getCanvasState();
    onStateChange?.(state);
  };

  const getCanvasState = (): EditorState => {
    if (!fabricCanvasRef.current) {
      return {
        version: '1.0',
        canvas: { width, height },
        elements: [],
      };
    }

    const canvas = fabricCanvasRef.current;
    const elements = canvas.getObjects().map((obj) =>
      fabricObjectToEditorElement(obj)
    );

    return {
      version: '1.0',
      canvas: {
        width: canvas.width!,
        height: canvas.height!,
        backgroundColor: canvas.backgroundColor as string,
      },
      elements,
      variables: template?.placeholders,
    };
  };

  const fabricObjectToEditorElement = (obj: any): EditorElement => {
    // Get z-index from canvas objects array (Fabric.js v7 doesn't have getZIndex())
    let zIndex = 0;
    if (fabricCanvasRef.current) {
      zIndex = fabricCanvasRef.current.getObjects().indexOf(obj);
    }

    return {
      id: obj.id || obj.data?.id || generateId(),
      type: obj.data?.type || getElementDataType(obj),
      name: obj.data?.name || obj.type,
      visible: obj.visible,
      locked: obj.lockMovementX && obj.lockMovementY,
      left: obj.left || 0,
      top: obj.top || 0,
      width: obj.width,
      height: obj.height,
      angle: obj.angle || 0,
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
      text: obj.text,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      textAlign: obj.textAlign,
      lineHeight: obj.lineHeight,
      src: (obj as any).src?._elements?.[0]?.src || (obj as any).src,
      variableName: obj.data?.variableName,
      zIndex,
    };
  };

  const getElementDataType = (obj: any): EditorElement['type'] => {
    if (obj.type === 'i-text' || obj.type === 'text') return 'text';
    if (obj.type === 'image') return 'image';
    if (obj.type === 'rect') return 'rectangle';
    if (obj.type === 'circle') return 'circle';
    return 'text';
  };

  const loadState = (state: EditorState) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Set background color directly on canvas (Fabric.js v7 API)
    if (state.canvas.backgroundColor) {
      canvas.backgroundColor = state.canvas.backgroundColor;
    }

    state.elements.forEach((elementData) => {
      const obj = createElementFromData(elementData);
      if (obj) {
        canvas.add(obj);
      }
    });

    canvas.renderAll();
  };

  const createElementFromData = (data: EditorElement): FabricObject | null => {
    switch (data.type) {
      case 'text':
        return new IText(data.text || 'Text', {
          left: data.left,
          top: data.top,
          fontSize: data.fontSize || 24,
          fontFamily: data.fontFamily || 'Arial',
          fontWeight: data.fontWeight || 'normal',
          fontStyle: data.fontStyle || 'normal',
          fill: data.fill || '#000000',
          textAlign: data.textAlign || 'left',
          width: data.width,
          height: data.height,
          angle: data.angle,
          opacity: data.opacity,
          data: {
            id: data.id,
            type: 'text',
            name: data.name,
            variableName: data.variableName,
          },
        });

      case 'image':
        if (data.src) {
          FabricImage.fromURL(data.src, (img) => {
            if (!fabricCanvasRef.current) return;

            img.set({
              left: data.left,
              top: data.top,
              width: data.width,
              height: data.height,
              angle: data.angle,
              opacity: data.opacity,
              data: {
                id: data.id,
                type: 'image',
                name: data.name,
              },
            });

            fabricCanvasRef.current.add(img);
            fabricCanvasRef.current.renderAll();
          });
          return null;
        }
        return null;

      case 'rectangle':
        return new Rect({
          left: data.left,
          top: data.top,
          width: data.width || 100,
          height: data.height || 100,
          fill: data.fill || '#cccccc',
          stroke: data.stroke,
          strokeWidth: data.strokeWidth,
          angle: data.angle,
          opacity: data.opacity,
          data: {
            id: data.id,
            type: 'rectangle',
            name: data.name,
          },
        });

      case 'circle':
        return new Circle({
          left: data.left,
          top: data.top,
          radius: (data.width || 100) / 2,
          fill: data.fill || '#cccccc',
          stroke: data.stroke,
          strokeWidth: data.strokeWidth,
          angle: data.angle,
          opacity: data.opacity,
          data: {
            id: data.id,
            type: 'circle',
            name: data.name,
          },
        });

      default:
        return null;
    }
  };

  const generateId = (): string => {
    return `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Public methods
  const addText = (text: string = 'Text') => {
    if (!fabricCanvasRef.current) return;

    const textbox = new IText(text, {
      left: width / 2 - 50,
      top: height / 2 - 12,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      data: {
        id: generateId(),
        type: 'text',
        name: `Text ${fabricCanvasRef.current.getObjects().length + 1}`,
      },
    });

    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
    onDirtyChange?.(true);
  };

  const addImage = (src: string) => {
    if (!fabricCanvasRef.current) return;

    FabricImage.fromURL(src, (img) => {
      if (!fabricCanvasRef.current) return;

      // Scale image to fit
      const scale = Math.min(
        (width * 0.5) / (img.width || 1),
        (height * 0.5) / (img.height || 1),
        1
      );

      img.set({
        left: width / 2 - ((img.width || 1) * scale) / 2,
        top: height / 2 - ((img.height || 1) * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        data: {
          id: generateId(),
          type: 'image',
          name: `Image ${fabricCanvasRef.current.getObjects().length + 1}`,
        },
      });

      fabricCanvasRef.current.add(img);
      fabricCanvasRef.current.setActiveObject(img);
      fabricCanvasRef.current.renderAll();
      onDirtyChange?.(true);
    });
  };

  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;

    const rect = new Rect({
      left: width / 2 - 50,
      top: height / 2 - 50,
      width: 100,
      height: 100,
      fill: '#cccccc',
      data: {
        id: generateId(),
        type: 'rectangle',
        name: `Rectangle ${fabricCanvasRef.current.getObjects().length + 1}`,
      },
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    fabricCanvasRef.current.renderAll();
    onDirtyChange?.(true);
  };

  const deleteSelected = () => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    activeObjects.forEach((obj) => {
      fabricCanvasRef.current?.remove(obj);
    });

    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();
    onDirtyChange?.(true);
  };

  const alignElements = (alignment: string) => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length === 0) return;

    const canvas = fabricCanvasRef.current;

    switch (alignment) {
      case 'left':
        activeObjects.forEach((obj) => obj.set({ left: 0 }));
        break;
      case 'center':
        activeObjects.forEach((obj) => obj.set({ left: (width - (obj.width || 0)) / 2 }));
        break;
      case 'right':
        activeObjects.forEach((obj) => obj.set({ left: width - (obj.width || 0) }));
        break;
      case 'top':
        activeObjects.forEach((obj) => obj.set({ top: 0 }));
        break;
      case 'middle':
        activeObjects.forEach((obj) => obj.set({ top: (height - (obj.height || 0)) / 2 }));
        break;
      case 'bottom':
        activeObjects.forEach((obj) => obj.set({ top: height - (obj.height || 0) }));
        break;
    }

    canvas.renderAll();
    onDirtyChange?.(true);
  };

  const exportToHTML = (): string => {
    if (!fabricCanvasRef.current) return '';

    const canvas = fabricCanvasRef.current;
    const svg = canvas.toSVG();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
    .creative-container { width: ${width}px; height: ${height}px; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .creative-container svg { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div class="creative-container">
    ${svg}
  </div>
</body>
</html>
    `;
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    addText,
    addImage,
    addRectangle,
    deleteSelected,
    alignElements,
    exportToHTML,
    getState: getCanvasState,
    loadState,
  }));

  return (
    <div className="editor-canvas-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f5f5f5', padding: '20px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export interface EditorCanvasRef {
  addText: (text?: string) => void;
  addImage: (src: string) => void;
  addRectangle: () => void;
  deleteSelected: () => void;
  alignElements: (alignment: string) => void;
  exportToHTML: () => string;
  getState: () => EditorState;
  loadState: (state: EditorState) => void;
}

// Forward ref support
const EditorCanvasWithRef = React.forwardRef<EditorCanvasRef, EditorCanvasProps>(EditorCanvas);
export default EditorCanvasWithRef;
