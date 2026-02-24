import { supabase } from './supabase';
import type { CreativeTemplate, EditorState, TemplateVariable, EditorElement } from '../types/editor';

/**
 * Parse HTML template and convert to editor elements
 */
function parseHTMLToElements(html: string, css: string = '', width: number, height: number): EditorElement[] {
  const elements: EditorElement[] = [];

  console.log('Parsing HTML template:', { htmlLength: html.length, cssLength: css.length, width, height });

  // Extract background color from HTML
  let backgroundColor = '#ffffff';
  const bgMatch = html.match(/\.ad-container[^{]*background[^:]*:\s*([^;]+)/);
  if (bgMatch) backgroundColor = bgMatch[1].trim();

  // Extract style tags from HTML and parse them
  let combinedCSS = css;

  // Extract <style> tags from HTML
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRegex.exec(html)) !== null) {
    combinedCSS += '\n' + styleMatch[1];
  }

  console.log('Combined CSS length:', combinedCSS.length);

  // Create a mapping of class names to their CSS properties
  const classStyles = parseCSSRules(combinedCSS);
  console.log('Parsed CSS rules:', Object.keys(classStyles).length);

  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Set container size explicitly
  const adContainer = tempDiv.querySelector('.ad-container');
  if (adContainer) {
    (adContainer as HTMLElement).style.width = width + 'px';
    (adContainer)!.style.height = height + 'px';
    (adContainer as HTMLElement).style.position = 'relative';
  }

  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.width = (width + 100) + 'px';
  tempDiv.style.height = (height + 100) + 'px';

  // Append to document to get proper computed styles
  document.body.appendChild(tempDiv);

  // Append styles to get computed styles
  const styleEl = document.createElement('style');
  styleEl.textContent = combinedCSS;
  document.head.appendChild(styleEl);

  try {
    // Get the ad-container and its direct children
    const container = tempDiv.querySelector('.ad-container');
    if (!container) {
      console.log('No .ad-container found');
      return [];
    }

    const allElements = container.querySelectorAll('*');
    console.log('Found elements in container:', allElements.length);

    // Get container's bounding box for relative positioning
    const containerRect = container.getBoundingClientRect();

    allElements.forEach((el, index) => {
      const htmlElement = el as HTMLElement;

      // Get the element's bounding box
      const rect = htmlElement.getBoundingClientRect();

      // Calculate position relative to container
      const left = Math.round(rect.left - containerRect.left);
      const top = Math.round(rect.top - containerRect.top);
      const elWidth = Math.round(rect.width);
      const elHeight = Math.round(rect.height);

      // Skip very small elements (likely decorative)
      if (elWidth < 5 || elHeight < 5) {
        return;
      }

      // Skip if element is the container itself
      if (el === container) {
        return;
      }

      // Get computed styles
      const computedStyle = window.getComputedStyle(htmlElement);
      const fontSize = parseInt(computedStyle.fontSize, 10) || 24;
      const color = computedStyle.color || '#000000';
      const fontFamily = computedStyle.fontFamily || 'Arial';
      const fontWeight = computedStyle.fontWeight || 'normal';
      const opacity = parseFloat(computedStyle.opacity) || 1;
      const zIndex = parseInt(computedStyle.zIndex, 10) || 0;

      console.log(`Element ${index}:`, {
        tag: el.tagName,
        class: el.className,
        left,
        top,
        width: elWidth,
        height: elHeight,
      });

      // Check if this is an image
      if (el.tagName === 'IMG') {
        const img = el as HTMLImageElement;
        const src = img.src;

        // Skip placeholder images (URL-encoded template variables) and data URIs
        if (src && !src.includes('data:placeholder') && !src.includes('%7B%7B') && !src.includes('{{')) {
          // Check if image is actually loaded (has valid dimensions)
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            console.log('Found image:', { src, left, top, width: elWidth, height: elHeight });
            elements.push({
              id: `el_${Date.now()}_${index}`,
              type: 'image',
              name: `Image ${index + 1}`,
              visible: true,
              locked: false,
              left,
              top,
              width: elWidth,
              height: elHeight,
              angle: 0,
              opacity,
              src,
              zIndex,
            });
          }
        }
      }
      // Check if this is a text element
      else if (
        el.tagName === 'DIV' ||
        el.tagName === 'SPAN' ||
        el.tagName === 'P' ||
        el.tagName === 'H1' ||
        el.tagName === 'H2' ||
        el.tagName === 'H3'
      ) {
        const text = htmlElement.textContent?.trim();

        // Only add if it has text content
        if (text && text.length > 0 && text.length < 500) {
          // Skip if it's just a container with other elements inside
          if (htmlElement.children.length > 0) {
            return;
          }

          // Check if text contains template variables
          const variableMatch = text.match(/\{\{(\w+)\}\}/);
          const variableName = variableMatch ? variableMatch[1] : undefined;

          console.log('Found text element:', {
            text: text.substring(0, 30),
            left,
            top,
            fontSize,
            variableName
          });

          elements.push({
            id: `el_${Date.now()}_${index}`,
            type: 'text',
            name: `Text ${index + 1}`,
            visible: true,
            locked: false,
            left,
            top,
            width: elWidth > 0 ? elWidth : undefined,
            height: elHeight > 0 ? elHeight : undefined,
            angle: 0,
            opacity,
            text: variableName ? `{{${variableName}}}` : text,
            fontSize,
            fontFamily: fontFamily.split(',')[0].replace(/['"]/g, ''),
            fontWeight,
            fill: color,
            variableName,
            zIndex,
          });
        }
      }
    });

    console.log('Parsed elements:', elements.length);

    // Sort elements by z-index
    elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  } finally {
    // Clean up
    if (document.head.contains(styleEl)) {
      document.head.removeChild(styleEl);
    }
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }

  return elements;
}

/**
 * Parse CSS rules into a map by selector (handles class selectors)
 */
function parseCSSRules(css: string): Record<string, Record<string, string>> {
  const rules: Record<string, Record<string, string>> = {};

  if (!css) return rules;

  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match CSS rules: selector { properties }
  // This handles .class-name, .class-name1.class-name2, etc.
  const ruleRegex = /([.#]?[\w-]+(?:[.#][\w-]+)*)\s*{([^}]+)}/g;
  let match;

  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1];
    const properties = match[2];

    const props: Record<string, string> = {};

    // Parse each property: name: value;
    const propRegex = /([\w-]+)\s*:\s*([^;]+);?/g;
    let propMatch;

    while ((propMatch = propRegex.exec(properties)) !== null) {
      props[propMatch[1]] = propMatch[2].trim();
    }

    // Store by class name (remove the leading dot if present)
    const key = selector.startsWith('.') ? selector.slice(1) : selector;
    rules[key] = props;
  }

  return rules;
}

/**
 * Convert existing template to editor state
 */
export function convertTemplateToEditorState(template: CreativeTemplate): EditorState {
  // If template already has editor_state, return it
  if (template.editor_state && template.editor_state.elements && template.editor_state.elements.length > 0) {
    return template.editor_state;
  }

  // Otherwise, convert from HTML template
  const elements = template.html_template
    ? parseHTMLToElements(
        template.html_template,
        template.css_styles || '',
        template.width || 300,
        template.height || 250
      )
    : [];

  // Try to extract background color from the HTML
  let backgroundColor = '#ffffff';
  if (template.html_template) {
    // Look for .ad-container background color
    const containerBgMatch = template.html_template.match(/\.ad-container\s*{[^}]*background[^:]*:\s*([^;]+)/);
    if (containerBgMatch) {
      backgroundColor = containerBgMatch[1].trim();
      console.log('Found container background:', backgroundColor);
    } else {
      // Fallback: look for any background-color in the HTML
      const bgMatch = template.html_template.match(/background-color:\s*([^;]+)/);
      if (bgMatch) backgroundColor = bgMatch[1];
      else if (template.html_template.includes('#08091A')) {
        backgroundColor = '#08091A'; // Hardcoded Terveystalo dark background
        console.log('Using hardcoded Terveystalo background');
      } else if (template.html_template.includes('#ffffff')) {
        backgroundColor = '#ffffff';
      }
    }
  }

  console.log('Final background color:', backgroundColor);

  return {
    version: '1.0',
    canvas: {
      width: template.width || 300,
      height: template.height || 250,
      backgroundColor,
    },
    elements,
    variables: template.placeholders?.map((p) => ({
      name: p.name,
      type: p.type,
      label: p.label || p.name,
      defaultValue: p.default_value,
      required: p.required || false,
    })) || [],
  };
}

/**
 * Save editor state to a creative template
 */
export async function saveEditorState(
  templateId: string | undefined,
  state: EditorState,
  metadata: {
    name: string;
    description?: string;
    type: 'display' | 'meta' | 'pdooh' | 'audio';
    width: number;
    height: number;
    tags?: string[];
  }
): Promise<CreativeTemplate | null> {
  const templateData = {
    name: metadata.name,
    description: metadata.description,
    type: metadata.type,
    width: metadata.width,
    height: metadata.height,
    size: `${metadata.width}x${metadata.height}`,
    editor_state: state as any,
    is_visual_editor: true,
    canvas_width: metadata.width,
    canvas_height: metadata.height,
    placeholders: (state.variables || []).map((v) => ({
      name: v.name,
      type: v.type,
      label: v.label,
      default_value: v.defaultValue,
      required: v.required || false,
    })),
    default_values: (state.variables || []).reduce((acc, v) => {
      if (v.defaultValue) {
        acc[v.name] = v.defaultValue;
      }
      return acc;
    }, {} as Record<string, any>),
    tags: metadata.tags || [],
    updated_at: new Date().toISOString(),
  };

  if (templateId) {
    // Update existing template
    const { data, error } = await supabase
      .from('creative_templates')
      .update(templateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update template:', error);
      return null;
    }

    return data;
  } else {
    // Create new template
    const { data, error } = await supabase
      .from('creative_templates')
      .insert({
        ...templateData,
        active: true,
        sort_order: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create template:', error);
      return null;
    }

    return data;
  }
}

/**
 * Load a creative template for editing
 */
export async function loadEditorTemplate(templateId: string): Promise<CreativeTemplate | null> {
  const { data, error } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('Failed to load template:', error);
    return null;
  }

  return data;
}

/**
 * Get all visual editor templates
 */
export async function getVisualEditorTemplates(): Promise<CreativeTemplate[]> {
  const { data, error } = await supabase
    .from('creative_templates')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load visual editor templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('creative_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    console.error('Failed to delete template:', error);
    return false;
  }

  return true;
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  templateId: string,
  newName: string
): Promise<CreativeTemplate | null> {
  const original = await loadEditorTemplate(templateId);

  if (!original) {
    return null;
  }

  const { data, error } = await supabase
    .from('creative_templates')
    .insert({
      name: newName,
      description: original.description,
      type: original.type,
      size: original.size,
      width: original.width,
      height: original.height,
      html_template: original.html_template,
      css_styles: original.css_styles,
      js_scripts: original.js_scripts,
      placeholders: original.placeholders,
      default_values: original.default_values,
      editor_state: original.editor_state,
      is_visual_editor: original.is_visual_editor,
      canvas_width: original.canvas_width,
      canvas_height: original.canvas_height,
      tags: original.tags,
      active: true,
      sort_order: original.sort_order,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to duplicate template:', error);
    return null;
  }

  return data;
}

/**
 * Export template to HTML for use in production
 */
export function exportTemplateToHTML(state: EditorState): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${state.metadata?.name || 'Creative Template'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
      font-family: Arial, sans-serif;
    }
    .creative-container {
      width: ${state.canvas.width}px;
      height: ${state.canvas.height}px;
      background: ${state.canvas.backgroundColor || '#ffffff'};
      position: relative;
      overflow: hidden;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    .creative-element {
      position: absolute;
    }
  </style>
</head>
<body>
  <div class="creative-container">
`;

  // Generate HTML for each element
  state.elements.forEach((element) => {
    const style = `
      left: ${element.left}px;
      top: ${element.top}px;
      width: ${element.width || 'auto'}px;
      height: ${element.height || 'auto'}px;
      transform: rotate(${element.angle}deg);
      opacity: ${element.opacity || 1};
      z-index: ${element.zIndex || 0};
      ${element.fill ? `color: ${element.fill};` : ''}
      ${element.stroke ? `border: ${element.strokeWidth || 1}px solid ${element.stroke};` : ''}
    `;

    if (element.type === 'text') {
      const textStyle = `
        ${style}
        font-family: ${element.fontFamily || 'Arial'};
        font-size: ${element.fontSize || 24}px;
        font-weight: ${element.fontWeight || 'normal'};
        font-style: ${element.fontStyle || 'normal'};
        text-align: ${element.textAlign || 'left'};
        line-height: ${element.lineHeight || 1.2};
        white-space: pre-wrap;
      `;

      const content = element.variableName
        ? `{{${element.variableName}}}`
        : element.text || '';

      html += `    <div class="creative-element" style="${textStyle}">${content}</div>\n`;
    } else if (element.type === 'image' && element.src) {
      html += `    <img class="creative-element" src="${element.src}" style="${style}" alt="" />\n`;
    } else if (element.type === 'rectangle') {
      html += `    <div class="creative-element" style="${style} background: ${element.fill || '#ccc'};"></div>\n`;
    } else if (element.type === 'circle') {
      html += `    <div class="creative-element" style="${style} background: ${element.fill || '#ccc'}; border-radius: 50%;"></div>\n`;
    }
  });

  html += `  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate SVG from editor state
 */
export function exportTemplateToSVG(state: EditorState): string {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${state.canvas.width}" height="${state.canvas.height}" viewBox="0 0 ${state.canvas.width} ${state.canvas.height}">
  <rect width="100%" height="100%" fill="${state.canvas.backgroundColor || '#ffffff'}"/>
`;

  state.elements.forEach((element) => {
    const transform = `translate(${element.left}, ${element.top}) rotate(${element.angle || 0})`;
    const opacity = element.opacity || 1;

    if (element.type === 'text') {
      svg += `  <text x="0" y="${element.fontSize || 24}" transform="${transform}" fill="${element.fill || '#000'}" font-family="${element.fontFamily || 'Arial'}" font-size="${element.fontSize || 24}" font-weight="${element.fontWeight || 'normal'}" font-style="${element.fontStyle || 'normal'}" text-anchor="${element.textAlign === 'center' ? 'middle' : element.textAlign === 'right' ? 'end' : 'start'}" opacity="${opacity}">
    ${element.variableName ? `{{${element.variableName}}}` : element.text || ''}
  </text>
`;
    } else if (element.type === 'rectangle') {
      svg += `  <rect x="0" y="0" width="${element.width || 100}" height="${element.height || 100}" transform="${transform}" fill="${element.fill || '#ccc'}" stroke="${element.stroke || 'none'}" stroke-width="${element.strokeWidth || 0}" opacity="${opacity}"/>
`;
    } else if (element.type === 'circle') {
      const radius = (element.width || 100) / 2;
      svg += `  <circle cx="${radius}" cy="${radius}" r="${radius}" transform="${transform}" fill="${element.fill || '#ccc'}" stroke="${element.stroke || 'none'}" stroke-width="${element.strokeWidth || 0}" opacity="${opacity}"/>
`;
    } else if (element.type === 'image' && element.src) {
      svg += `  <image x="0" y="0" width="${element.width || 100}" height="${element.height || 100}" transform="${transform}" href="${element.src}" opacity="${opacity}"/>
`;
    }
  });

  svg += '</svg>';
  return svg;
}

/**
 * Convert editor state to HTML template for preview/rendering
 */
export function editorStateToHTML(state: EditorState): string {
  const width = state.canvas.width;
  const height = state.canvas.height;
  const bg = state.canvas.backgroundColor || '#ffffff';

  let html = `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${width}, height=${height}">
  <title>Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
      font-family: Arial, sans-serif;
    }
    .ad-container {
      width: ${width}px;
      height: ${height}px;
      background: ${bg};
      position: relative;
      overflow: hidden;
      box-shadow: 0 2px 20px rgba(0,0,0,0.1);
    }
    .ad-element {
      position: absolute;
    }
  </style>
</head>
<body>
  <div class="ad-container">
`;

  // Generate HTML for each element
  state.elements.forEach((element) => {
    const style = `
      left: ${element.left}px;
      top: ${element.top}px;
      width: ${element.width || 'auto'}px;
      height: ${element.height || 'auto'}px;
      transform: rotate(${element.angle || 0}deg);
      opacity: ${element.opacity || 1};
      z-index: ${element.zIndex || 0};
      ${element.fill ? `color: ${element.fill};` : ''}
      ${element.stroke ? `border: ${element.strokeWidth || 1}px solid ${element.stroke};` : ''}
    `;

    if (element.type === 'text') {
      const textStyle = `
        ${style}
        font-family: ${element.fontFamily || 'Arial'};
        font-size: ${element.fontSize || 24}px;
        font-weight: ${element.fontWeight || 'normal'};
        font-style: ${element.fontStyle || 'normal'};
        text-align: ${element.textAlign || 'left'};
        line-height: ${element.lineHeight || 1.2};
        white-space: pre-wrap;
      `;

      const content = element.variableName
        ? `{{${element.variableName}}}`
        : element.text || '';

      html += `    <div class="ad-element" style="${textStyle}">${content}</div>\n`;
    } else if (element.type === 'image' && element.src) {
      html += `    <img class="ad-element" src="${element.src}" style="${style}" alt="" />\n`;
    } else if (element.type === 'rectangle') {
      html += `    <div class="ad-element" style="${style} background: ${element.fill || '#ccc'};"></div>\n`;
    } else if (element.type === 'circle') {
      const radius = (element.width || 100) / 2;
      html += `    <div class="ad-element" style="${style} width: ${element.width || 100}px; height: ${element.height || 100}px; background: ${element.fill || '#ccc'}; border-radius: 50%;"></div>\n`;
    }
  });

  html += `  </div>
</body>
</html>`;

  return html;
}
