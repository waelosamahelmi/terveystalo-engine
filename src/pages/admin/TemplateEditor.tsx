import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EditorCanvas, { EditorCanvasRef } from '../../components/editor/EditorCanvas';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { PropertyInspector } from '../../components/editor/PropertyInspector';
import { LayersPanel } from '../../components/editor/LayersPanel';
import { AssetManager } from '../../components/editor/AssetManager';
import { TemplateVariablesManager } from '../../components/editor/TemplateVariablesManager';
import { CreativeTemplate, EditorElement, EditorState, TemplateVariable } from '../../types/editor';
import {
  loadEditorTemplate,
  saveEditorState,
  getVisualEditorTemplates,
  deleteTemplate,
  duplicateTemplate,
  convertTemplateToEditorState,
  editorStateToHTML,
} from '../../lib/editorService';
import { renderTemplateHtml, fixFontUrls } from '../../lib/creativeService';
import { RxDownload, RxArrowLeft, RxCopy, RxTrash, RxEyeOpen, RxDesktop, RxDeviceMobile, RxMagicWand } from 'react-icons/rx';
import { supabase } from '../../lib/supabase';

type ViewMode = 'edit' | 'preview' | 'code';

export const TemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const canvasRef = useRef<EditorCanvasRef>(null);
  const [template, setTemplate] = useState<CreativeTemplate | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [selectedElements, setSelectedElements] = useState<EditorElement[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showAssets, setShowAssets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  // Load template on mount
  useEffect(() => {
    if (templateId && templateId !== 'new') {
      loadTemplate(templateId);
    } else {
      // Create new blank template
      setTemplate({
        name: 'New Template',
        type: 'display',
        width: 300,
        height: 250,
        editor_state: {
          version: '1.0',
          canvas: { width: 300, height: 250 },
          elements: [],
          variables: [],
        },
        is_visual_editor: true,
        canvas_width: 300,
        canvas_height: 250,
        default_values: {},
        placeholders: [],
      });
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    const loaded = await loadEditorTemplate(id);
    if (loaded) {
      setTemplate(loaded);
      // Convert template to editor state (handles both old HTML and new editor_state formats)
      const editorState = convertTemplateToEditorState(loaded);
      setEditorState(editorState);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current || !template) return;

    setSaving(true);
    try {
      const state = canvasRef.current.getState();
      const saved = await saveEditorState(template.id, state, {
        name: template.name,
        description: template.description,
        type: template.type,
        width: template.width,
        height: template.height,
        tags: template.tags,
      });

      if (saved) {
        setTemplate(saved);
        setIsDirty(false);
        addToHistory(state);
        alert('Template saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!template) return;

    const newName = prompt('Enter name for duplicate:', `${template.name} (Copy)`);
    if (!newName) return;

    const duplicated = await duplicateTemplate(template.id, newName);
    if (duplicated) {
      navigate(`/admin/editor/${duplicated.id}`);
    }
  };

  const handleDelete = async () => {
    if (!template) return;

    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return;

    const deleted = await deleteTemplate(template.id);
    if (deleted) {
      navigate('/admin/templates');
    }
  };

  const handleStateChange = (state: EditorState) => {
    setEditorState(state);
    setIsDirty(true);
  };

  const handleSelect = (elements: EditorElement[]) => {
    setSelectedElements(elements);
  };

  const handleElementUpdate = (id: string, updates: Partial<EditorElement>) => {
    // Update element in canvas
    if (canvasRef.current) {
      const state = canvasRef.current.getState();
      const elementIndex = state.elements.findIndex((e) => e.id === id);

      if (elementIndex !== -1) {
        state.elements[elementIndex] = { ...state.elements[elementIndex], ...updates };
        canvasRef.current.loadState(state);
        handleStateChange(state);
      }
    }
  };

  const handleElementsUpdate = (updates: Partial<EditorElement>) => {
    // Bulk update selected elements
    if (canvasRef.current) {
      const state = canvasRef.current.getState();
      const selectedIds = selectedElements.map((e) => e.id);

      state.elements = state.elements.map((el) =>
        selectedIds.includes(el.id) ? { ...el, ...updates } : el
      );

      canvasRef.current.loadState(state);
      handleStateChange(state);
    }
  };

  const handleVariableBind = (elementId: string, variableName: string) => {
    if (variableName) {
      handleElementUpdate(elementId, { variableName });
    } else {
      handleElementUpdate(elementId, { variableName: undefined });
    }
  };

  const handleToggleVisibility = (id: string) => {
    if (canvasRef.current) {
      // Toggle visibility (would need to extend canvas ref)
      handleElementUpdate(id, { visible: !selectedElements.find((e) => e.id === id)?.visible });
    }
  };

  const handleToggleLock = (id: string) => {
    handleElementUpdate(id, { locked: !selectedElements.find((e) => e.id === id)?.locked });
  };

  const handleDeleteElement = (id: string) => {
    // Would need to extend canvas ref to support deletion by ID
    setSelectedElements(selectedElements.filter((e) => e.id !== id));
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    // Would need to extend canvas ref to support reordering
    const offset = direction === 'up' ? 1 : -1;
    const element = selectedElements.find((e) => e.id === id);
    if (element) {
      handleElementUpdate(id, { zIndex: (element.zIndex || 0) + offset });
    }
  };

  const handleAddImage = (url: string) => {
    if (canvasRef.current) {
      canvasRef.current.addImage(url);
    }
  };

  const handleVariablesChange = (variables: TemplateVariable[]) => {
    if (canvasRef.current) {
      const state = canvasRef.current.getState();
      state.variables = variables;
      canvasRef.current.loadState(state);
      handleStateChange(state);
    }
  };

  const addToHistory = (state: EditorState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0 && canvasRef.current) {
      const newState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      canvasRef.current.loadState(newState);
      handleStateChange(newState);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1 && canvasRef.current) {
      const newState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      canvasRef.current.loadState(newState);
      handleStateChange(newState);
    }
  };

  if (!template) {
    return <div className="editor-loading">Loading...</div>;
  }

  const availableVariables =
    template.editor_state?.variables?.map((v) => v.name) || [];

  // Generate preview HTML with default values
  const getPreviewHTML = () => {
    if (!template) return '';

    // If template has editor_state and no HTML template, convert editor state to HTML
    if (editorState && !template.html_template) {
      const html = editorStateToHTML(editorState);
      // Replace variables with default values
      const mergedVars = {
        ...template.default_values,
        ...(editorState.variables?.reduce((acc, v) => {
          if (v.defaultValue) acc[v.name] = v.defaultValue;
          return acc;
        }, {} as Record<string, string>))
      };

      let renderedHtml = html;
      Object.entries(mergedVars).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        renderedHtml = renderedHtml.replace(regex, String(value));
      });

      return fixFontUrls(renderedHtml);
    }

    // Use original HTML template with default values
    if (template.html_template) {
      return fixFontUrls(renderTemplateHtml(template, template.default_values || {}));
    }

    return '<html><body><div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">No preview available</div></body></html>';
  };

  return (
    <div className="template-editor-page">
      {/* Top Bar */}
      <div className="editor-topbar">
        <div className="topbar-left">
          <button className="back-btn" onClick={() => navigate('/admin/templates')}>
            <RxArrowLeft size={20} />
          </button>
          <div className="template-info">
            <input
              type="text"
              value={template.name}
              onChange={(e) => setTemplate({ ...template, name: e.target.value })}
              className="template-name-input"
            />
            <span className="template-size">
              {template.width}x{template.height}
            </span>
            <span className="template-type">{template.type}</span>
          </div>
        </div>

        <div className="topbar-center">
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
              title="Visual Edit (for templates created in visual editor)"
            >
              <RxMagicWand size={16} />
              Visual
            </button>
            <button
              className={`mode-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Code Edit (for HTML templates)"
            >
              <RxDesktop size={16} />
              Code
            </button>
            <button
              className={`mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              <RxEyeOpen size={16} />
              Preview
            </button>
          </div>
          {isDirty && <span className="dirty-indicator">Unsaved changes</span>}
        </div>

        <div className="topbar-right">
          <button className="toolbar-btn" onClick={handleDuplicate} title="Duplicate">
            <RxCopy size={18} />
          </button>
          <button className="toolbar-btn danger" onClick={handleDelete} title="Delete">
            <RxTrash size={18} />
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            <RxDownload size={18} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        zoom={zoom}
        onZoomChange={setZoom}
        onAddText={() => canvasRef.current?.addText()}
        onAddImage={() => setShowAssets(true)}
        onAddRectangle={() => canvasRef.current?.addRectangle()}
        onAddCircle={() => canvasRef.current?.addRectangle()} // Placeholder - needs circle method
        onAlign={(alignment) => canvasRef.current?.alignElements(alignment)}
        onDelete={() => canvasRef.current?.deleteSelected()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleVariables={() => setShowVariables(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasSelection={selectedElements.length > 0}
      />

      {/* Main Content */}
      <div className="editor-main">
        {/* Left Sidebar - Layers */}
        <div className="editor-sidebar layers-sidebar">
          <LayersPanel
            elements={editorState?.elements || []}
            selectedIds={selectedElements.map((e) => e.id)}
            onSelect={(ids) => {
              // Would need to select on canvas
            }}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDelete={handleDeleteElement}
            onReorder={handleReorder}
          />
        </div>

        {/* Canvas Area */}
        <div className="editor-canvas-area">
          {viewMode === 'edit' ? (
            <div
              className="canvas-wrapper"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {template && (
                <EditorCanvas
                  ref={canvasRef}
                  template={template}
                  width={template.width}
                  height={template.height}
                  onStateChange={handleStateChange}
                  onSelect={handleSelect}
                  onDirtyChange={setIsDirty}
                />
              )}
            </div>
          ) : viewMode === 'code' ? (
            <div className="code-editor-wrapper">
              <textarea
                className="code-editor"
                value={template.html_template || ''}
                onChange={(e) => {
                  if (template) {
                    setTemplate({ ...template, html_template: e.target.value });
                    setIsDirty(true);
                  }
                }}
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="preview-wrapper">
              {template && (
                <iframe
                  key={`preview-${template.id}-${viewMode}`}
                  srcDoc={getPreviewHTML()}
                  className="preview-iframe"
                  sandbox="allow-same-origin allow-scripts"
                  title={`${template.name} Preview`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#f5f5f5',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - Properties */}
        <div className="editor-sidebar properties-sidebar">
          <PropertyInspector
            elements={selectedElements}
            onElementUpdate={handleElementUpdate}
            onElementsUpdate={handleElementsUpdate}
            onVariableBind={handleVariableBind}
            availableVariables={availableVariables}
          />
        </div>
      </div>

      {/* Asset Manager Modal */}
      {showAssets && (
        <AssetManager
          onSelect={handleAddImage}
          onClose={() => setShowAssets(false)}
        />
      )}

      {/* Variables Manager Modal */}
      {showVariables && editorState && (
        <TemplateVariablesManager
          variables={editorState.variables || []}
          onChange={handleVariablesChange}
          onClose={() => setShowVariables(false)}
        />
      )}
    </div>
  );
};
