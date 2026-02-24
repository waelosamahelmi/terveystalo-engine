import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreativeTemplate } from '../../types/editor';
import { getVisualEditorTemplates, deleteTemplate, duplicateTemplate } from '../../lib/editorService';
import { RxPlus, RxEyeOpen, RxPencil1, RxCopy, RxTrash, RxArrowLeft } from 'react-icons/rx';

export const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const loaded = await getVisualEditorTemplates();
    setTemplates(loaded);
    setLoading(false);
  };

  const handleDelete = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    if (!confirm(`Delete template "${template.name}"?`)) return;

    const deleted = await deleteTemplate(templateId);
    if (deleted) {
      setTemplates(templates.filter((t) => t.id !== templateId));
    }
  };

  const handleDuplicate = async (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const newName = prompt('Enter name for duplicate:', `${template.name} (Copy)`);
    if (!newName) return;

    const duplicated = await duplicateTemplate(templateId, newName);
    if (duplicated) {
      await loadTemplates();
    }
  };

  return (
    <div className="template-list-page">
      <div className="template-list-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            <RxArrowLeft size={20} />
          </button>
          <h1>Creative Templates</h1>
        </div>
        <button className="create-btn" onClick={() => navigate('/admin/editor/new')}>
          <RxPlus size={20} />
          New Template
        </button>
      </div>

      <div className="template-list-content">
        {loading ? (
          <div className="loading-state">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <h2>No templates yet</h2>
            <p>Create your first visual template to get started</p>
            <button className="create-btn" onClick={() => navigate('/admin/editor/new')}>
              <RxPlus size={20} />
              Create Template
            </button>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={() => navigate(`/admin/editor/${template.id}`)}
                onDuplicate={() => handleDuplicate(template.id!)}
                onDelete={() => handleDelete(template.id!)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: CreativeTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // Generate preview from template
    if (template.editor_state) {
      setPreview(generatePreviewSVG(template.editor_state));
    }
  }, [template]);

  return (
    <div className="template-card">
      <div className="template-preview">
        {preview ? (
          <div
            dangerouslySetInnerHTML={{ __html: preview }}
            className="template-preview-svg"
          />
        ) : (
          <div className="template-preview-placeholder">
            <span>{template.width}x{template.height}</span>
          </div>
        )}
        <div className="template-overlay">
          <button className="template-action-btn primary" onClick={onEdit}>
            <RxPencil1 size={16} />
            Edit
          </button>
          <button className="template-action-btn" onClick={onDuplicate}>
            <RxCopy size={16} />
            Duplicate
          </button>
        </div>
      </div>

      <div className="template-info">
        <h3 className="template-name">{template.name}</h3>
        <div className="template-meta">
          <span className="template-size">{template.width}x{template.height}</span>
          <span className="template-type">{template.type}</span>
        </div>
        {template.description && (
          <p className="template-description">{template.description}</p>
        )}
      </div>

      <div className="template-footer">
        <div className="template-tags">
          {template.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="template-tag">
              {tag}
            </span>
          ))}
        </div>
        <button
          className="template-delete-btn"
          onClick={onDelete}
          title="Delete template"
        >
          <RxTrash size={16} />
        </button>
      </div>
    </div>
  );
};

// Simple SVG preview generator
const generatePreviewSVG = (state: any): string => {
  const width = state.canvas?.width || 300;
  const height = state.canvas?.height || 250;
  const bg = state.canvas?.backgroundColor || '#ffffff';

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background: ${bg}">`;

  state.elements?.forEach((el: any) => {
    if (el.type === 'rectangle') {
      svg += `<rect x="${el.left}" y="${el.top}" width="${el.width}" height="${el.height}" fill="${el.fill || '#ccc'}" opacity="${el.opacity || 1}" />`;
    } else if (el.type === 'circle') {
      const r = (el.width || 100) / 2;
      svg += `<circle cx="${el.left + r}" cy="${el.top + r}" r="${r}" fill="${el.fill || '#ccc'}" opacity="${el.opacity || 1}" />`;
    } else if (el.type === 'text') {
      svg += `<text x="${el.left}" y="${el.top + (el.fontSize || 24)}" fill="${el.fill || '#000'}" font-size="${el.fontSize || 24}" font-family="${el.fontFamily || 'Arial'}" opacity="${el.opacity || 1}">${el.text?.substring(0, 20) || 'Text'}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
};
