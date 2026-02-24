import React, { useState, useEffect } from 'react';
import { TemplateVariable } from '../../types/editor';
import { RxPlus, RxTrash, RxPencil1, RxCheck, RxCross2 } from 'react-icons/rx';

interface TemplateVariablesManagerProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
  onClose: () => void;
}

export const TemplateVariablesManager: React.FC<TemplateVariablesManagerProps> = ({
  variables,
  onChange,
  onClose,
}) => {
  const [localVariables, setLocalVariables] = useState<TemplateVariable[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TemplateVariable>>({});

  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  const handleAdd = () => {
    const newVariable: TemplateVariable = {
      name: `variable_${localVariables.length + 1}`,
      type: 'text',
      label: 'New Variable',
      required: false,
    };

    setLocalVariables([...localVariables, newVariable]);
    startEditing(newVariable);
  };

  const handleDelete = (id: string) => {
    const updated = localVariables.filter((v) => v.name !== id);
    setLocalVariables(updated);
  };

  const startEditing = (variable: TemplateVariable) => {
    setEditingId(variable.name);
    setEditForm(variable);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = () => {
    if (!editingId || !editForm.name) return;

    const updated = localVariables.map((v) =>
      v.name === editingId ? { ...v, ...editForm } : v
    );

    setLocalVariables(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = () => {
    onChange(localVariables);
    onClose();
  };

  return (
    <div className="variables-manager-overlay" onClick={onClose}>
      <div className="variables-manager-panel" onClick={(e) => e.stopPropagation()}>
        <div className="variables-manager-header">
          <h2>Template Variables</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="variables-manager-content">
          <div className="variables-info">
            <p>
              Variables allow you to create dynamic templates. Text elements can be bound to
              variables using <code>{'{{variable_name}}'}</code> syntax.
            </p>
          </div>

          <div className="variables-list">
            {localVariables.map((variable) => (
              <VariableItem
                key={variable.name}
                variable={variable}
                isEditing={editingId === variable.name}
                editForm={editForm}
                onEdit={() => startEditing(variable)}
                onDelete={() => handleDelete(variable.name)}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onEditChange={(field, value) =>
                  setEditForm({ ...editForm, [field]: value })
                }
              />
            ))}

            {localVariables.length === 0 && (
              <div className="variables-empty">
                <p>No variables defined</p>
                <p className="hint">Add variables to make your template dynamic</p>
              </div>
            )}
          </div>

          <button className="add-variable-btn" onClick={handleAdd}>
            <RxPlus size={18} />
            Add Variable
          </button>
        </div>

        <div className="variables-manager-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSave}>
            Save Variables
          </button>
        </div>
      </div>
    </div>
  );
};

interface VariableItemProps {
  variable: TemplateVariable;
  isEditing: boolean;
  editForm: Partial<TemplateVariable>;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (field: string, value: any) => void;
}

const VariableItem: React.FC<VariableItemProps> = ({
  variable,
  isEditing,
  editForm,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
}) => {
  if (isEditing) {
    return (
      <div className="variable-item editing">
        <div className="variable-edit-form">
          <div className="form-row">
            <label>Name</label>
            <input
              type="text"
              value={editForm.name || ''}
              onChange={(e) => onEditChange('name', e.target.value)}
              placeholder="variable_name"
            />
          </div>

          <div className="form-row">
            <label>Label</label>
            <input
              type="text"
              value={editForm.label || ''}
              onChange={(e) => onEditChange('label', e.target.value)}
              placeholder="Display Label"
            />
          </div>

          <div className="form-row">
            <label>Type</label>
            <select
              value={editForm.type || 'text'}
              onChange={(e) => onEditChange('type', e.target.value)}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="color">Color</option>
              <option value="number">Number</option>
            </select>
          </div>

          <div className="form-row">
            <label>Default</label>
            <input
              type="text"
              value={editForm.defaultValue || ''}
              onChange={(e) => onEditChange('defaultValue', e.target.value)}
              placeholder="Default value"
            />
          </div>

          <div className="form-row checkbox">
            <label>
              <input
                type="checkbox"
                checked={editForm.required || false}
                onChange={(e) => onEditChange('required', e.target.checked)}
              />
              Required
            </label>
          </div>
        </div>

        <div className="variable-edit-actions">
          <button className="action-btn cancel" onClick={onCancelEdit}>
            <RxCross2 size={16} />
          </button>
          <button className="action-btn save" onClick={onSaveEdit}>
            <RxCheck size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="variable-item">
      <div className="variable-info">
        <span className="variable-name-badge">{`{{${variable.name}}}`}</span>
        <span className="variable-label">{variable.label}</span>
        <span className="variable-type">{variable.type}</span>
        {variable.required && <span className="variable-required">required</span>}
        {variable.defaultValue && (
          <span className="variable-default" title="Default value">
            "{variable.defaultValue}"
          </span>
        )}
      </div>

      <div className="variable-actions">
        <button className="action-btn edit" onClick={onEdit} title="Edit">
          <RxPencil1 size={14} />
        </button>
        <button className="action-btn delete" onClick={onDelete} title="Delete">
          <RxTrash size={14} />
        </button>
      </div>
    </div>
  );
};
