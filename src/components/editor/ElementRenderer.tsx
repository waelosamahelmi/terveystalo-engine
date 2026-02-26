import React from 'react';
import type { EditorElement } from '../../types/editor';

interface ElementRendererProps {
  element: EditorElement;
  isSelected: boolean;
  isEditing: boolean;
  resolvedValues: Record<string, string>;
  onDoubleClick: () => void;
  onTextChange: (text: string) => void;
  onBlurText: () => void;
}

/**
 * Resolve all {{variable}} patterns in a string using the resolved values map.
 */
function resolveVariables(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

export const ElementRenderer: React.FC<ElementRendererProps> = ({
  element,
  isSelected,
  isEditing,
  resolvedValues,
  onDoubleClick,
  onTextChange,
  onBlurText,
}) => {
  if (!element.visible) return null;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: element.left,
    top: element.top,
    width: element.width || 'auto',
    height: element.height || 'auto',
    transform: element.angle ? `rotate(${element.angle}deg)` : undefined,
    opacity: element.opacity ?? 1,
    zIndex: element.zIndex || 0,
    pointerEvents: element.locked ? 'none' : 'auto',
    cursor: element.locked ? 'default' : 'move',
    userSelect: isEditing ? 'text' : 'none',
  };

  if (element.stroke) {
    baseStyle.border = `${element.strokeWidth || 1}px solid ${element.stroke}`;
  }

  const dataAttrs = {
    'data-element-id': element.id,
  };

  switch (element.type) {
    case 'text': {
      const textStyle: React.CSSProperties = {
        ...baseStyle,
        fontFamily: element.fontFamily || 'Arial',
        fontSize: element.fontSize || 24,
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        textAlign: element.textAlign || 'left',
        lineHeight: element.lineHeight || 1.2,
        color: element.fill || '#000000',
        whiteSpace: 'pre-wrap',
        overflow: 'hidden',
        outline: isEditing ? '2px solid #0066cc' : undefined,
        cursor: isEditing ? 'text' : baseStyle.cursor,
      };

      const hasVariable = element.variableName || element.text?.includes('{{');

      // Resolve the display content:
      // - If editing, show raw text (user is typing)
      // - If bound to a variable, show resolved default value
      // - If text contains {{...}} patterns, resolve them
      // - Otherwise show raw text
      let displayContent: string;
      if (isEditing) {
        displayContent = element.text || '';
      } else if (element.variableName) {
        displayContent = resolvedValues[element.variableName] || element.text || `{{${element.variableName}}}`;
      } else if (element.text) {
        displayContent = resolveVariables(element.text, resolvedValues);
      } else {
        displayContent = '';
      }

      // Default values may contain <br> tags for line breaks
      const containsHTML = displayContent.includes('<br') || displayContent.includes('<');

      if (containsHTML && !isEditing) {
        return (
          <div
            {...dataAttrs}
            className={`visual-element ${isSelected ? 'selected' : ''} ${hasVariable ? 'has-variable' : ''}`}
            style={textStyle}
            onDoubleClick={onDoubleClick}
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />
        );
      }

      return (
        <div
          {...dataAttrs}
          className={`visual-element ${isSelected ? 'selected' : ''} ${hasVariable ? 'has-variable' : ''}`}
          style={textStyle}
          onDoubleClick={onDoubleClick}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onInput={(e) => onTextChange((e.target as HTMLDivElement).textContent || '')}
          onBlur={onBlurText}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onBlurText();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {displayContent}
        </div>
      );
    }

    case 'image': {
      // Resolve image src if it contains {{variable}} patterns
      let resolvedSrc = element.src || '';
      if (resolvedSrc.includes('{{')) {
        resolvedSrc = resolveVariables(resolvedSrc, resolvedValues);
      }
      // Also check if the element is bound to a variable (image type variable)
      if (element.variableName && resolvedValues[element.variableName]) {
        resolvedSrc = resolvedValues[element.variableName];
      }

      return (
        <img
          {...dataAttrs}
          className={`visual-element ${isSelected ? 'selected' : ''}`}
          src={resolvedSrc}
          alt={element.name}
          style={{
            ...baseStyle,
            objectFit: 'cover',
            display: 'block',
          }}
          draggable={false}
          onDoubleClick={onDoubleClick}
        />
      );
    }

    case 'rectangle': {
      return (
        <div
          {...dataAttrs}
          className={`visual-element ${isSelected ? 'selected' : ''}`}
          style={{
            ...baseStyle,
            background: element.fill || '#cccccc',
          }}
          onDoubleClick={onDoubleClick}
        />
      );
    }

    case 'circle': {
      return (
        <div
          {...dataAttrs}
          className={`visual-element ${isSelected ? 'selected' : ''}`}
          style={{
            ...baseStyle,
            background: element.fill || '#cccccc',
            borderRadius: '50%',
          }}
          onDoubleClick={onDoubleClick}
        />
      );
    }

    default:
      return null;
  }
};
