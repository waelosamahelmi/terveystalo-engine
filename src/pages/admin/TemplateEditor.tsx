import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { PropertyInspector } from '../../components/editor/PropertyInspector';
import { LayersPanel } from '../../components/editor/LayersPanel';
import { AssetManager } from '../../components/editor/AssetManager';
import { TemplateVariablesManager } from '../../components/editor/TemplateVariablesManager';
import { VisualEditor } from '../../components/editor/VisualEditor';
import { CreativeTemplate, EditorElement, EditorState, TemplateVariable } from '../../types/editor';
import {
  loadEditorTemplate,
  saveEditorState,
  deleteTemplate,
  duplicateTemplate,
  convertTemplateToEditorState,
} from '../../lib/editorService';
import {
  addTextElement,
  addImageElement,
  addRectangleElement,
  addCircleElement,
  deleteElements,
  updateElement,
  updateElements,
  alignElements,
  reorderElement,
} from '../../lib/editorActions';
import { RxDownload, RxArrowLeft, RxCopy, RxTrash, RxMagicWand, RxDesktop } from 'react-icons/rx';

type ViewMode = 'edit' | 'code';

export const TemplateEditor: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<CreativeTemplate | null>(null);
  const [editorState, setEditorState] = useState<EditorState | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      const initialState: EditorState = {
        version: '1.0',
        canvas: { width: 300, height: 250, backgroundColor: '#ffffff' },
        elements: [],
        variables: [],
      };
      setTemplate({
        name: 'New Template',
        type: 'display',
        width: 300,
        height: 250,
        editor_state: initialState,
        is_visual_editor: true,
        canvas_width: 300,
        canvas_height: 250,
        default_values: {},
        placeholders: [],
      });
      setEditorState(initialState);
    }
  }, [templateId]);

  const loadTemplate = async (id: string) => {
    const loaded = await loadEditorTemplate(id);
    if (loaded) {
      setTemplate(loaded);
      const state = convertTemplateToEditorState(loaded);
      setEditorState(state);
      // Initialize history with loaded state
      setHistory([state]);
      setHistoryIndex(0);
    }
  };

  const handleStateChange = (state: EditorState) => {
    setEditorState(state);
    setIsDirty(true);
    addToHistory(state);
  };

  const handleSave = async () => {
    if (!editorState || !template) return;

    setSaving(true);
    try {
      const saved = await saveEditorState(template.id, editorState, {
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

  const handleSelect = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const selectedElements = editorState
    ? editorState.elements.filter((el) => selectedIds.includes(el.id))
    : [];

  const handleElementUpdate = (id: string, updates: Partial<EditorElement>) => {
    if (!editorState) return;
    const newState = updateElement(editorState, id, updates);
    handleStateChange(newState);
  };

  const handleElementsUpdate = (updates: Partial<EditorElement>) => {
    if (!editorState) return;
    const newState = updateElements(editorState, selectedIds, updates);
    handleStateChange(newState);
  };

  const handleVariableBind = (elementId: string, variableName: string) => {
    handleElementUpdate(elementId, variableName ? { variableName } : { variableName: undefined });
  };

  const handleToggleVisibility = (id: string) => {
    if (!editorState) return;
    const el = editorState.elements.find((e) => e.id === id);
    if (el) {
      handleElementUpdate(id, { visible: !el.visible });
    }
  };

  const handleToggleLock = (id: string) => {
    if (!editorState) return;
    const el = editorState.elements.find((e) => e.id === id);
    if (el) {
      handleElementUpdate(id, { locked: !el.locked });
    }
  };

  const handleDeleteElement = (id: string) => {
    if (!editorState) return;
    const newState = deleteElements(editorState, [id]);
    handleStateChange(newState);
    setSelectedIds(selectedIds.filter((sid) => sid !== id));
  };

  const handleReorder = (id: string, direction: 'up' | 'down') => {
    if (!editorState) return;
    const newState = reorderElement(editorState, id, direction);
    handleStateChange(newState);
  };

  const handleAddImage = (url: string) => {
    if (!editorState) return;
    const newState = addImageElement(editorState, url);
    const newEl = newState.elements[newState.elements.length - 1];
    handleStateChange(newState);
    setSelectedIds([newEl.id]);
  };

  const handleVariablesChange = (variables: TemplateVariable[]) => {
    if (!editorState) return;
    handleStateChange({ ...editorState, variables });
  };

  const addToHistory = (state: EditorState) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      // Limit history to 50 entries
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setHistoryIndex(newIndex);
      setEditorState(prevState);
      setIsDirty(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setHistoryIndex(newIndex);
      setEditorState(nextState);
      setIsDirty(true);
    }
  };

  const handleAddText = () => {
    if (!editorState) return;
    const newState = addTextElement(editorState);
    const newEl = newState.elements[newState.elements.length - 1];
    handleStateChange(newState);
    setSelectedIds([newEl.id]);
  };

  const handleAddRectangle = () => {
    if (!editorState) return;
    const newState = addRectangleElement(editorState);
    const newEl = newState.elements[newState.elements.length - 1];
    handleStateChange(newState);
    setSelectedIds([newEl.id]);
  };

  const handleAddCircle = () => {
    if (!editorState) return;
    const newState = addCircleElement(editorState);
    const newEl = newState.elements[newState.elements.length - 1];
    handleStateChange(newState);
    setSelectedIds([newEl.id]);
  };

  const handleDeleteSelected = () => {
    if (!editorState || selectedIds.length === 0) return;
    const newState = deleteElements(editorState, selectedIds);
    handleStateChange(newState);
    setSelectedIds([]);
  };

  const handleAlign = (alignment: string) => {
    if (!editorState || selectedIds.length === 0) return;
    const newState = alignElements(editorState, selectedIds, alignment as any);
    handleStateChange(newState);
  };

  if (!template) {
    return <div className="editor-loading">Loading...</div>;
  }

  const availableVariables =
    editorState?.variables?.map((v) => v.name) || [];

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
              title="Visual Edit"
            >
              <RxMagicWand size={16} />
              Visual
            </button>
            <button
              className={`mode-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Code Edit (HTML)"
            >
              <RxDesktop size={16} />
              Code
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
        onAddText={handleAddText}
        onAddImage={() => setShowAssets(true)}
        onAddRectangle={handleAddRectangle}
        onAddCircle={handleAddCircle}
        onAlign={handleAlign}
        onDelete={handleDeleteSelected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleVariables={() => setShowVariables(true)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasSelection={selectedIds.length > 0}
      />

      {/* Main Content */}
      <div className="editor-main">
        {/* Left Sidebar - Layers */}
        <div className="editor-sidebar layers-sidebar">
          <LayersPanel
            elements={editorState?.elements || []}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDelete={handleDeleteElement}
            onReorder={handleReorder}
          />
        </div>

        {/* Canvas Area */}
        <div className="editor-canvas-area">
          {viewMode === 'edit' && editorState ? (
            <div
              className="canvas-wrapper"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
              }}
            >
              <VisualEditor
                editorState={editorState}
                selectedIds={selectedIds}
                zoom={zoom}
                htmlTemplate={template.html_template}
                defaultValues={template.default_values || {}}
                onStateChange={handleStateChange}
                onSelect={handleSelect}
              />
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
          ) : null}
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
