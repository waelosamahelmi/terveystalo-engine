import { FabricObject, FabricObjectProps, FabricImage } from 'fabric';

// Editor element types
export type EditorElementType = 'text' | 'image' | 'rectangle' | 'circle' | 'background';

// Template variable types
export interface TemplateVariable {
  name: string;
  type: 'text' | 'image' | 'color' | 'number';
  label: string;
  defaultValue?: string;
  required?: boolean;
}

// Editor state structure
export interface EditorState {
  version: string;
  canvas: {
    width: number;
    height: number;
    backgroundColor?: string;
    backgroundImage?: string;
  };
  elements: EditorElement[];
  variables?: TemplateVariable[];
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
}

// Editor element (simplified Fabric object representation)
export interface EditorElement {
  id: string;
  type: EditorElementType;
  name: string;
  visible: boolean;
  locked: boolean;
  // Position
  left: number;
  top: number;
  // Dimensions
  width?: number;
  height?: number;
  // Rotation
  angle: number;
  // Style
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  charSpacing?: number;
  // Image-specific
  src?: string;
  cropX?: number;
  cropY?: number;
  // Variable binding
  variableName?: string;
  // Z-index
  zIndex?: number;
}

// Alignment options
export type AlignmentOption =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'distribute-h'
  | 'distribute-v';

// Property inspector sections
export interface PropertySection {
  id: string;
  title: string;
  icon?: string;
  fields: PropertyField[];
}

export interface PropertyField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'slider' | 'toggle' | 'font' | 'image';
  value?: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange?: (value: any) => void;
}

// Layer item
export interface LayerItem {
  id: string;
  name: string;
  type: EditorElementType;
  visible: boolean;
  locked: boolean;
  thumbnail?: string;
}

// Editor context
export interface EditorContext {
  canvas: any; // fabric.Canvas
  selectedElements: EditorElement[];
  history: EditorState[];
  historyIndex: number;
  isDirty: boolean;
  template?: CreativeTemplate;
}

// Creative template with editor support
export interface CreativeTemplate {
  id?: string;
  name: string;
  description?: string;
  type: 'display' | 'meta' | 'pdooh' | 'audio';
  size?: string;
  width: number;
  height: number;
  html_template?: string;
  css_styles?: string;
  js_scripts?: string;
  placeholders?: TemplateVariable[];
  default_values?: Record<string, any>;
  editor_state?: EditorState;
  is_visual_editor?: boolean;
  canvas_width?: number;
  canvas_height?: number;
  preview_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

// Asset manager types
export interface AssetFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'logo' | 'background' | 'font';
  size: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  created_at: string;
}

// Preview mode
export type PreviewMode = 'desktop' | 'tablet' | 'mobile' | 'actual';
