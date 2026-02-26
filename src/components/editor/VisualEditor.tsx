import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EditorState, EditorElement } from '../../types/editor';
import { SelectionOverlay, ResizeHandle } from './SelectionOverlay';
import { useElementInteraction } from '../../hooks/useElementInteraction';
import { useInlineTextEditing } from '../../hooks/useInlineTextEditing';
import { editorStateToHTML } from '../../lib/editorService';
import { fixFontUrls } from '../../lib/creativeService';

interface VisualEditorProps {
  editorState: EditorState;
  selectedIds: string[];
  zoom: number;
  htmlTemplate?: string;
  defaultValues: Record<string, any>;
  onStateChange: (state: EditorState) => void;
  onSelect: (ids: string[]) => void;
}

interface ElementPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

function resolveAllVariables(html: string, values: Record<string, any>): string {
  let result = html;
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }
  });
  return result;
}

/**
 * Normalize a URL for comparison - strips protocol/domain to compare paths.
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '');
  }
}

export const VisualEditor: React.FC<VisualEditorProps> = ({
  editorState,
  selectedIds,
  zoom,
  htmlTemplate,
  defaultValues,
  onStateChange,
  onSelect,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeReadyRef = useRef(false);

  // For htmlTemplate mode: matched DOM elements and their real positions
  const matchedElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [realPositions, setRealPositions] = useState<Map<string, ElementPosition>>(new Map());
  const movedElementsRef = useRef<Set<string>>(new Set());
  const prevElementsRef = useRef<EditorElement[]>([]);
  const positionsReadRef = useRef(false);

  // Merged variable values (from template defaults + editor variables)
  const mergedValues = useMemo(() => {
    const values: Record<string, string> = {};
    if (defaultValues) {
      Object.entries(defaultValues).forEach(([k, v]) => {
        if (v !== undefined && v !== null) values[k] = String(v);
      });
    }
    if (editorState.variables) {
      editorState.variables.forEach((v) => {
        if (v.defaultValue) values[v.name] = v.defaultValue;
      });
    }
    return values;
  }, [defaultValues, editorState.variables]);

  // Adjusted editor state: use real DOM positions for unmoved elements in htmlTemplate mode
  const adjustedEditorState = useMemo(() => {
    if (!htmlTemplate || !positionsReadRef.current) return editorState;

    const adjustedElements = editorState.elements.map((el) => {
      if (movedElementsRef.current.has(el.id)) return el;
      const pos = realPositions.get(el.id);
      if (!pos) return el;
      return { ...el, left: pos.left, top: pos.top, width: pos.width, height: pos.height };
    });

    return { ...editorState, elements: adjustedElements };
  }, [editorState, htmlTemplate, realPositions]);

  // Pass adjusted state to interaction hooks for accurate drag/resize starting positions
  const { handleMoveStart, handleResizeStart } = useElementInteraction({
    editorState: adjustedEditorState,
    selectedIds,
    zoom,
    onStateChange,
  });

  const { editingId, startEditing, commitText, cancelEditing } = useInlineTextEditing({
    editorState: adjustedEditorState,
    onStateChange,
  });

  // Structural key: changes when elements are added/removed
  const elementIds = editorState.elements.map((e) => e.id).join(',');
  const structuralKey = elementIds + '|' + editorState.elements.length;

  // Generate iframe HTML
  const baseHTML = useMemo(() => {
    let html: string;
    if (htmlTemplate) {
      // PRODUCTION-IDENTICAL rendering: just resolve variables + fix font URLs
      html = resolveAllVariables(htmlTemplate, mergedValues);
      html = fixFontUrls(html);
    } else {
      html = editorStateToHTML(editorState);
      html = resolveAllVariables(html, mergedValues);
      html = fixFontUrls(html);
    }

    // Override body styles for clean rendering in editor
    const overrideCSS = `<style>
      html, body { background: transparent !important; min-height: auto !important; margin: 0 !important; padding: 0 !important; display: block !important; }
      body > .ad-container, body > div > .ad-container { margin: 0 !important; box-shadow: none !important; }
    </style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${overrideCSS}\n</head>`);
    }

    return html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey, htmlTemplate, mergedValues, editorState.canvas.backgroundColor]);

  // Reset state on HTML change (iframe will reload)
  useEffect(() => {
    iframeReadyRef.current = false;
    matchedElementsRef.current.clear();
    movedElementsRef.current.clear();
    prevElementsRef.current = [];
    positionsReadRef.current = false;
    setRealPositions(new Map());
  }, [baseHTML]);

  // Core: match editorState elements to DOM elements and read their real positions
  const matchAndReadPositions = useCallback(
    (doc: Document) => {
      const container = doc.querySelector('.ad-container') || doc.body;
      const allDomEls = Array.from(container.querySelectorAll('*'));
      const newMatched = new Map<string, HTMLElement>();
      const newPositions = new Map<string, ElementPosition>();
      const usedDomEls = new Set<Element>();
      const containerRect = container.getBoundingClientRect();

      editorState.elements.forEach((element) => {
        let bestMatch: HTMLElement | null = null;
        let bestScore = 0;

        if (element.type === 'text') {
          // Resolve text for matching (use default value if variable-bound)
          const rawText = element.variableName
            ? mergedValues[element.variableName] || element.text || ''
            : element.text || '';
          const cleanTarget = rawText
            .replace(/<br\s*\/?>/g, ' ')
            .replace(/<[^>]+>/g, '')
            .trim()
            .replace(/\s+/g, ' ');

          if (!cleanTarget) return;

          for (const domEl of allDomEls) {
            if (usedDomEls.has(domEl)) continue;
            const tag = domEl.tagName;
            if (
              ![
                'DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'A',
                'LABEL', 'STRONG', 'EM', 'B', 'I', 'LI',
              ].includes(tag)
            )
              continue;

            const domText = (domEl.textContent?.trim() || '').replace(/\s+/g, ' ');
            if (!domText) continue;

            let score = 0;

            // Content scoring
            if (domText === cleanTarget) score = 100;
            else if (domText.includes(cleanTarget)) score = 80;
            else if (
              cleanTarget.length > 3 &&
              domText.includes(cleanTarget.substring(0, Math.min(20, cleanTarget.length)))
            )
              score = 60;
            else continue;

            // Prefer leaf nodes (no children with meaningful text)
            if (domEl.children.length === 0) score += 30;
            else if (!Array.from(domEl.children).some((c) => c.textContent?.trim())) score += 20;

            // Prefer more specific (shorter) text matches
            if (domText.length <= cleanTarget.length * 1.5) score += 15;

            // Prefer elements with visible dimensions
            const rect = (domEl as HTMLElement).getBoundingClientRect();
            if (rect.width > 5 && rect.height > 5) score += 10;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = domEl as HTMLElement;
            }
          }
        } else if (element.type === 'image') {
          // Resolve image src for matching
          const targetSrc = element.variableName
            ? mergedValues[element.variableName] || element.src || ''
            : element.src || '';

          if (!targetSrc) return;

          const normalizedTarget = normalizeUrl(targetSrc);
          const targetFilename = targetSrc.split('/').pop()?.split('?')[0] || '';

          for (const domEl of allDomEls) {
            if (usedDomEls.has(domEl)) continue;
            if (domEl.tagName !== 'IMG') continue;

            const imgEl = domEl as HTMLImageElement;
            const domSrc = imgEl.src || imgEl.getAttribute('src') || '';
            if (!domSrc) continue;

            let score = 0;
            const normalizedDom = normalizeUrl(domSrc);
            const domFilename = domSrc.split('/').pop()?.split('?')[0] || '';

            // URL matching (multiple strategies for robustness)
            if (domSrc === targetSrc) score = 100;
            else if (normalizedDom === normalizedTarget) score = 95;
            else if (domSrc.includes(targetSrc) || targetSrc.includes(domSrc)) score = 80;
            else if (targetFilename && targetFilename.length > 3 && domFilename === targetFilename)
              score = 70;
            else continue;

            // Prefer loaded images with natural dimensions
            if (imgEl.complete && imgEl.naturalWidth > 0) score += 10;

            // Prefer images with visible dimensions
            const rect = imgEl.getBoundingClientRect();
            if (rect.width > 5 && rect.height > 5) score += 5;

            if (score > bestScore) {
              bestScore = score;
              bestMatch = domEl as HTMLElement;
            }
          }
        }

        if (bestMatch) {
          bestMatch.setAttribute('data-element-id', element.id);
          newMatched.set(element.id, bestMatch);
          usedDomEls.add(bestMatch);

          // Read real bounding rect relative to container
          const rect = bestMatch.getBoundingClientRect();
          newPositions.set(element.id, {
            left: Math.round(rect.left - containerRect.left),
            top: Math.round(rect.top - containerRect.top),
            width: Math.round(rect.width) || element.width || 50,
            height: Math.round(rect.height) || element.height || 20,
          });
        }
      });

      matchedElementsRef.current = newMatched;
      positionsReadRef.current = true;
      setRealPositions(newPositions);
    },
    [editorState.elements, mergedValues]
  );

  // After iframe loads: wait for all images to finish loading, then match elements
  const handleIframeLoad = useCallback(() => {
    iframeReadyRef.current = true;

    if (!htmlTemplate) return;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Wait for all images to load before reading positions
    const images = Array.from(doc.querySelectorAll('img'));
    const unloadedImages = images.filter((img) => !img.complete);

    if (unloadedImages.length > 0) {
      let loaded = 0;
      const total = unloadedImages.length;
      let done = false;

      const onImageReady = () => {
        loaded++;
        if (loaded >= total && !done) {
          done = true;
          matchAndReadPositions(doc);
        }
      };

      unloadedImages.forEach((img) => {
        img.addEventListener('load', onImageReady, { once: true });
        img.addEventListener('error', onImageReady, { once: true });
      });

      // Fallback timeout in case images never load
      setTimeout(() => {
        if (!done) {
          done = true;
          matchAndReadPositions(doc);
        }
      }, 3000);
    } else {
      matchAndReadPositions(doc);
    }
  }, [htmlTemplate, matchAndReadPositions]);

  // Sync user-initiated changes to the iframe DOM
  useEffect(() => {
    if (!iframeReadyRef.current) return;
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    if (htmlTemplate) {
      // Only sync elements that have actually changed since last render
      editorState.elements.forEach((element) => {
        const prev = prevElementsRef.current.find((e) => e.id === element.id);
        if (!prev || prev === element) return;

        // Track position/size changes as "moved"
        if (
          prev.left !== element.left ||
          prev.top !== element.top ||
          prev.width !== element.width ||
          prev.height !== element.height
        ) {
          movedElementsRef.current.add(element.id);
        }

        // Find matched DOM element
        const domEl = matchedElementsRef.current.get(element.id);
        if (!domEl) return;

        // Position sync (only for user-moved elements — forces absolute positioning)
        if (movedElementsRef.current.has(element.id)) {
          domEl.style.position = 'absolute';
          domEl.style.left = `${element.left}px`;
          domEl.style.top = `${element.top}px`;
          if (element.width) domEl.style.width = `${element.width}px`;
          if (element.height) domEl.style.height = `${element.height}px`;
        }

        // Text content
        if (
          element.type === 'text' &&
          (prev.text !== element.text || prev.variableName !== element.variableName)
        ) {
          const resolved = element.variableName
            ? mergedValues[element.variableName] || element.text || `{{${element.variableName}}}`
            : resolveAllVariables(element.text || '', mergedValues);
          if (resolved.includes('<')) {
            domEl.innerHTML = resolved;
          } else {
            domEl.textContent = resolved;
          }
        }

        // Text styles
        if (element.type === 'text') {
          if (prev.fontFamily !== element.fontFamily) domEl.style.fontFamily = element.fontFamily || '';
          if (prev.fontSize !== element.fontSize)
            domEl.style.fontSize = element.fontSize ? `${element.fontSize}px` : '';
          if (prev.fontWeight !== element.fontWeight)
            domEl.style.fontWeight = String(element.fontWeight || '');
          if (prev.fontStyle !== element.fontStyle) domEl.style.fontStyle = element.fontStyle || '';
          if (prev.fill !== element.fill) domEl.style.color = element.fill || '';
          if (prev.textAlign !== element.textAlign) domEl.style.textAlign = element.textAlign || '';
          if (prev.lineHeight !== element.lineHeight)
            domEl.style.lineHeight = String(element.lineHeight || '');
        }

        // Image src
        if (
          element.type === 'image' &&
          domEl.tagName === 'IMG' &&
          (prev.src !== element.src || prev.variableName !== element.variableName)
        ) {
          let src = element.src || '';
          if (element.variableName && mergedValues[element.variableName]) {
            src = mergedValues[element.variableName];
          }
          (domEl as HTMLImageElement).src = src;
        }

        // Shape fill
        if (
          (element.type === 'rectangle' || element.type === 'circle') &&
          prev.fill !== element.fill
        ) {
          domEl.style.background = element.fill || '';
        }

        // Visibility
        if (prev.visible !== element.visible) {
          domEl.style.display = element.visible === false ? 'none' : '';
        }

        // Opacity
        if (prev.opacity !== element.opacity) {
          domEl.style.opacity = String(element.opacity ?? 1);
        }

        // Rotation
        if (prev.angle !== element.angle) {
          domEl.style.transform = element.angle ? `rotate(${element.angle}deg)` : '';
        }
      });
    } else {
      // Full DOM sync for generated (non-template) editors
      editorState.elements.forEach((element) => {
        const domEl = doc.querySelector(
          `[data-element-id="${element.id}"]`
        ) as HTMLElement | null;
        if (!domEl) return;

        domEl.style.left = `${element.left}px`;
        domEl.style.top = `${element.top}px`;
        if (element.width) domEl.style.width = `${element.width}px`;
        if (element.height) domEl.style.height = `${element.height}px`;
        domEl.style.transform = element.angle ? `rotate(${element.angle}deg)` : '';
        domEl.style.opacity = String(element.opacity ?? 1);
        domEl.style.zIndex = String(element.zIndex || 0);

        if (element.type === 'text') {
          const resolvedText = element.variableName
            ? mergedValues[element.variableName] || element.text || `{{${element.variableName}}}`
            : resolveAllVariables(element.text || '', mergedValues);
          if (resolvedText.includes('<br') || resolvedText.includes('<')) {
            domEl.innerHTML = resolvedText;
          } else {
            domEl.textContent = resolvedText;
          }
          domEl.style.fontFamily = element.fontFamily || 'Arial';
          domEl.style.fontSize = `${element.fontSize || 24}px`;
          domEl.style.fontWeight = String(element.fontWeight || 'normal');
          domEl.style.fontStyle = element.fontStyle || 'normal';
          domEl.style.textAlign = element.textAlign || 'left';
          domEl.style.lineHeight = String(element.lineHeight || 1.2);
          domEl.style.color = element.fill || '#000000';
        }

        if (element.type === 'image' && domEl.tagName === 'IMG') {
          let src = element.src || '';
          if (element.variableName && mergedValues[element.variableName]) {
            src = mergedValues[element.variableName];
          } else if (src.includes('{{')) {
            src = resolveAllVariables(src, mergedValues);
          }
          (domEl as HTMLImageElement).src = src;
        }

        if (element.type === 'rectangle' || element.type === 'circle') {
          domEl.style.background = element.fill || '#cccccc';
        }

        domEl.style.display = element.visible === false ? 'none' : '';
      });
    }

    prevElementsRef.current = editorState.elements;
  }, [editorState.elements, mergedValues, htmlTemplate]);

  const canvasWidth = editorState.canvas.width;
  const canvasHeight = editorState.canvas.height;

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onSelect([]);
        cancelEditing();
      }
    },
    [onSelect, cancelEditing]
  );

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string) => {
      if (editingId === elementId) return;
      e.stopPropagation();

      // Mark element (and selected group) as moved for position tracking
      if (htmlTemplate) {
        movedElementsRef.current.add(elementId);
        if (selectedIds.includes(elementId)) {
          selectedIds.forEach((id) => movedElementsRef.current.add(id));
        }
      }

      if (e.shiftKey) {
        if (selectedIds.includes(elementId)) {
          onSelect(selectedIds.filter((id) => id !== elementId));
        } else {
          onSelect([...selectedIds, elementId]);
        }
      } else if (!selectedIds.includes(elementId)) {
        onSelect([elementId]);
      }

      handleMoveStart(e, elementId);
    },
    [editingId, selectedIds, onSelect, handleMoveStart, htmlTemplate]
  );

  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      startEditing(elementId);
    },
    [startEditing]
  );

  const handleResizeStartForElement = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (selectedIds.length === 1) {
        if (htmlTemplate) {
          movedElementsRef.current.add(selectedIds[0]);
        }
        handleResizeStart(e, selectedIds[0], handle);
      }
    },
    [selectedIds, handleResizeStart, htmlTemplate]
  );

  // Use adjusted elements (with real DOM positions) for rendering
  const elementsForRender = adjustedEditorState.elements;

  const sortedElements = [...elementsForRender].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );

  const selectedElements = elementsForRender.filter((el) => selectedIds.includes(el.id));

  return (
    <div className="visual-editor-container">
      <div
        className="visual-editor-canvas"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          position: 'relative',
        }}
      >
        {/* Layer 1: Production-identical iframe rendering */}
        <iframe
          ref={iframeRef}
          srcDoc={baseHTML}
          title="Template Preview"
          sandbox="allow-same-origin"
          onLoad={handleIframeLoad}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            border: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Layer 2: Transparent interaction overlay */}
        <div
          className="visual-editor-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
          }}
          onClick={handleOverlayClick}
        >
          {sortedElements.map((element) => {
            if (!element.visible) return null;

            const isEditing = editingId === element.id;
            const isSelected = selectedIds.includes(element.id);

            return (
              <div
                key={element.id}
                data-element-id={element.id}
                className={`element-hitbox ${isSelected ? 'selected' : ''}`}
                style={{
                  position: 'absolute',
                  left: element.left,
                  top: element.top,
                  width: element.width || 50,
                  height: element.height || 20,
                  transform: element.angle ? `rotate(${element.angle}deg)` : undefined,
                  zIndex: element.zIndex || 0,
                  cursor: element.locked ? 'default' : 'move',
                  pointerEvents: element.locked ? 'none' : 'auto',
                }}
                onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                onDoubleClick={() => handleElementDoubleClick(element.id)}
              >
                {isEditing && element.type === 'text' && (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="inline-text-edit"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      fontFamily: element.fontFamily || 'Arial',
                      fontSize: element.fontSize || 24,
                      fontWeight: element.fontWeight || 'normal',
                      fontStyle: element.fontStyle || 'normal',
                      textAlign: element.textAlign || 'left',
                      lineHeight: element.lineHeight || 1.2,
                      color: element.fill || '#000000',
                      background: 'rgba(255,255,255,0.95)',
                      outline: '2px solid #0066cc',
                      whiteSpace: 'pre-wrap',
                      overflow: 'hidden',
                      zIndex: 10001,
                      cursor: 'text',
                      padding: 0,
                      margin: 0,
                    }}
                    onBlur={(e) => {
                      commitText(element.id, (e.target as HTMLElement).textContent || '');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        cancelEditing();
                        (e.target as HTMLElement).blur();
                      }
                    }}
                  >
                    {element.text || ''}
                  </div>
                )}
              </div>
            );
          })}

          {selectedElements.map((element) => (
            <SelectionOverlay
              key={`selection-${element.id}`}
              element={element}
              zoom={zoom}
              onResizeStart={handleResizeStartForElement}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
