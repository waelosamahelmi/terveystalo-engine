import React, { useState, useEffect } from 'react';
import { EditorElement } from '../../types/editor';
import { RxText, RxImage, RxSquare, RxCircle } from 'react-icons/rx';
import { BiColorFill } from 'react-icons/bi';

interface PropertyInspectorProps {
  elements: EditorElement[];
  onElementUpdate: (id: string, updates: Partial<EditorElement>) => void;
  onElementsUpdate: (updates: Partial<EditorElement>) => void;
  onVariableBind?: (elementId: string, variableName: string) => void;
  availableVariables?: string[];
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  elements,
  onElementUpdate,
  onElementsUpdate,
  onVariableBind,
  availableVariables = [],
}) => {
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (elements.length === 1) {
      setLocalValues(elements[0]);
    } else {
      setLocalValues({});
    }
  }, [elements]);

  if (elements.length === 0) {
    return (
      <div className="property-inspector empty">
        <p>Select an element to edit its properties</p>
      </div>
    );
  }

  if (elements.length > 1) {
    return <MultiSelectionInspector elements={elements} onElementsUpdate={onElementsUpdate} />;
  }

  const element = elements[0];

  return (
    <div className="property-inspector">
      <div className="property-header">
        {getElementIcon(element.type)}
        <input
          type="text"
          value={element.name}
          onChange={(e) => onElementUpdate(element.id, { name: e.target.value })}
          className="element-name-input"
        />
      </div>

      <div className="property-sections">
        {/* Position & Size */}
        <PropertySection title="Position & Size">
          <PropertyRow label="X">
            <NumberInput
              value={Math.round(element.left)}
              onChange={(value) => onElementUpdate(element.id, { left: value })}
            />
          </PropertyRow>
          <PropertyRow label="Y">
            <NumberInput
              value={Math.round(element.top)}
              onChange={(value) => onElementUpdate(element.id, { top: value })}
            />
          </PropertyRow>
          {element.width !== undefined && (
            <PropertyRow label="Width">
              <NumberInput
                value={Math.round(element.width)}
                onChange={(value) => onElementUpdate(element.id, { width: value })}
              />
            </PropertyRow>
          )}
          {element.height !== undefined && (
            <PropertyRow label="Height">
              <NumberInput
                value={Math.round(element.height)}
                onChange={(value) => onElementUpdate(element.id, { height: value })}
              />
            </PropertyRow>
          )}
          <PropertyRow label="Rotation">
            <NumberInput
              value={Math.round(element.angle)}
              onChange={(value) => onElementUpdate(element.id, { angle: value })}
              suffix="°"
            />
          </PropertyRow>
          <PropertyRow label="Opacity">
            <SliderInput
              value={(element.opacity || 1) * 100}
              onChange={(value) => onElementUpdate(element.id, { opacity: value / 100 })}
              min={0}
              max={100}
              suffix="%"
            />
          </PropertyRow>
        </PropertySection>

        {/* Appearance */}
        <PropertySection title="Appearance">
          <PropertyRow label="Fill">
            <ColorInput
              value={element.fill || '#000000'}
              onChange={(value) => onElementUpdate(element.id, { fill: value })}
            />
          </PropertyRow>
          {element.stroke !== undefined && (
            <PropertyRow label="Stroke">
              <ColorInput
                value={element.stroke || '#000000'}
                onChange={(value) => onElementUpdate(element.id, { stroke: value })}
              />
            </PropertyRow>
          )}
          {element.strokeWidth !== undefined && (
            <PropertyRow label="Stroke Width">
              <NumberInput
                value={element.strokeWidth}
                onChange={(value) => onElementUpdate(element.id, { strokeWidth: value })}
                min={0}
              />
            </PropertyRow>
          )}
        </PropertySection>

        {/* Image Properties */}
        {element.type === 'image' && (
          <PropertySection title="Image">
            <PropertyRow label="Source URL" fullWidth>
              <TextAreaInput
                value={element.src || ''}
                onChange={(value) => onElementUpdate(element.id, { src: value })}
                rows={2}
              />
            </PropertyRow>
          </PropertySection>
        )}

        {/* Text Properties */}
        {element.type === 'text' && (
          <PropertySection title="Text">
            <PropertyRow label="Content" fullWidth>
              <TextAreaInput
                value={element.text || ''}
                onChange={(value) => onElementUpdate(element.id, { text: value })}
                rows={3}
              />
            </PropertyRow>
            <PropertyRow label="Font Family">
              <SelectInput
                value={element.fontFamily || 'Arial'}
                options={[
                  { label: 'Arial', value: 'Arial' },
                  { label: 'Helvetica', value: 'Helvetica' },
                  { label: 'Times New Roman', value: 'Times New Roman' },
                  { label: 'Georgia', value: 'Georgia' },
                  { label: 'Courier New', value: 'Courier New' },
                  { label: 'Verdana', value: 'Verdana' },
                  { label: 'Inter', value: 'Inter' },
                  { label: 'Roboto', value: 'Roboto' },
                  { label: 'Montserrat', value: 'Montserrat' },
                  { label: 'TerveystaloSans', value: 'TerveystaloSans' },
                ]}
                onChange={(value) => onElementUpdate(element.id, { fontFamily: value })}
              />
            </PropertyRow>
            <PropertyRow label="Font Size">
              <NumberInput
                value={element.fontSize || 24}
                onChange={(value) => onElementUpdate(element.id, { fontSize: value })}
                min={8}
                max={200}
                suffix="px"
              />
            </PropertyRow>
            <PropertyRow label="Font Weight">
              <SelectInput
                value={String(element.fontWeight || 'normal')}
                options={[
                  { label: 'Normal', value: 'normal' },
                  { label: 'Bold', value: 'bold' },
                  { label: '100', value: '100' },
                  { label: '200', value: '200' },
                  { label: '300', value: '300' },
                  { label: '400', value: '400' },
                  { label: '500', value: '500' },
                  { label: '600', value: '600' },
                  { label: '700', value: '700' },
                  { label: '800', value: '800' },
                  { label: '900', value: '900' },
                ]}
                onChange={(value) =>
                  onElementUpdate(element.id, { fontWeight: value === 'normal' ? 'normal' : value })
                }
              />
            </PropertyRow>
            <PropertyRow label="Font Style">
              <SelectInput
                value={element.fontStyle || 'normal'}
                options={[
                  { label: 'Normal', value: 'normal' },
                  { label: 'Italic', value: 'italic' },
                ]}
                onChange={(value) => onElementUpdate(element.id, { fontStyle: value as any })}
              />
            </PropertyRow>
            <PropertyRow label="Text Align">
              <SelectInput
                value={element.textAlign || 'left'}
                options={[
                  { label: 'Left', value: 'left' },
                  { label: 'Center', value: 'center' },
                  { label: 'Right', value: 'right' },
                ]}
                onChange={(value) => onElementUpdate(element.id, { textAlign: value as any })}
              />
            </PropertyRow>
            <PropertyRow label="Line Height">
              <NumberInput
                value={element.lineHeight || 1.2}
                onChange={(value) => onElementUpdate(element.id, { lineHeight: value })}
                min={0.8}
                max={3}
                step={0.1}
              />
            </PropertyRow>
          </PropertySection>
        )}

        {/* Variable Binding (text and image elements) */}
        {onVariableBind && (element.type === 'text' || element.type === 'image') && (
          <PropertySection title="Variable Binding">
            <PropertyRow label="Bind to Variable">
              <SelectInput
                value={element.variableName || ''}
                options={[
                  { label: 'None', value: '' },
                  ...availableVariables.map((v) => ({ label: v, value: v })),
                ]}
                onChange={(value) => onVariableBind(element.id, value)}
              />
            </PropertyRow>
            {element.variableName && (
              <PropertyRow label="Variable" fullWidth>
                <span style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                  Bound to: {`{{${element.variableName}}}`}
                </span>
              </PropertyRow>
            )}
          </PropertySection>
        )}
      </div>
    </div>
  );
};

interface MultiSelectionInspectorProps {
  elements: EditorElement[];
  onElementsUpdate: (updates: Partial<EditorElement>) => void;
}

const MultiSelectionInspector: React.FC<MultiSelectionInspectorProps> = ({
  elements,
  onElementsUpdate,
}) => {
  return (
    <div className="property-inspector multi-selection">
      <div className="property-header">
        <span className="selection-count">{elements.length} elements selected</span>
      </div>

      <PropertySection title="Bulk Actions">
        <PropertyRow label="Opacity">
          <SliderInput
            value={(elements[0].opacity || 1) * 100}
            onChange={(value) => onElementsUpdate({ opacity: value / 100 })}
            min={0}
            max={100}
            suffix="%"
          />
        </PropertyRow>
      </PropertySection>
    </div>
  );
};

// Property Section Components
interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

const PropertySection: React.FC<PropertySectionProps> = ({ title, children }) => {
  return (
    <div className="property-section">
      <h4 className="property-section-title">{title}</h4>
      <div className="property-section-content">{children}</div>
    </div>
  );
};

interface PropertyRowProps {
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ label, fullWidth, children }) => {
  return (
    <div className={`property-row ${fullWidth ? 'full-width' : ''}`}>
      <label className="property-label">{label}</label>
      <div className="property-value">{children}</div>
    </div>
  );
};

// Input Components
interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
}) => {
  return (
    <div className="number-input">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
      />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
  );
};

interface ColorInputProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorInput: React.FC<ColorInputProps> = ({ value, onChange }) => {
  return (
    <div className="color-input">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="color-hex-input"
      />
    </div>
  );
};

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  suffix?: string;
}

const SliderInput: React.FC<SliderInputProps> = ({ value, onChange, min, max, suffix }) => {
  return (
    <div className="slider-input">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
      />
      <span className="slider-value">
        {Math.round(value)}
        {suffix}
      </span>
    </div>
  );
};

interface SelectInputProps {
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

const SelectInput: React.FC<SelectInputProps> = ({ value, options, onChange }) => {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="select-input">
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

interface TextAreaInputProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({ value, onChange, rows = 3 }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="textarea-input"
    />
  );
};

// Helper
const getElementIcon = (type: EditorElement['type']) => {
  switch (type) {
    case 'text':
      return <RxText size={20} />;
    case 'image':
      return <RxImage size={20} />;
    case 'rectangle':
      return <RxSquare size={20} />;
    case 'circle':
      return <RxCircle size={20} />;
    default:
      return null;
  }
};
