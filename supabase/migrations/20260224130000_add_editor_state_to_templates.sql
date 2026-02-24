-- Add editor_state column to creative_templates for storing Fabric.js canvas state
ALTER TABLE creative_templates
ADD COLUMN editor_state JSONB DEFAULT NULL;

-- Add column to track if template was created/edited in visual editor
ALTER TABLE creative_templates
ADD COLUMN is_visual_editor BOOLEAN DEFAULT FALSE;

-- Add columns for better editor support
ALTER TABLE creative_templates
ADD COLUMN canvas_width INTEGER DEFAULT NULL;
ALTER TABLE creative_templates
ADD COLUMN canvas_height INTEGER DEFAULT NULL;

-- Create index for querying visual editor templates
CREATE INDEX idx_creative_templates_visual_editor ON creative_templates(is_visual_editor) WHERE is_visual_editor = TRUE;

COMMENT ON COLUMN creative_templates.editor_state IS 'Fabric.js canvas state JSON for visual editor serialization';
COMMENT ON COLUMN creative_templates.is_visual_editor IS 'Whether template was created in visual editor vs manually coded';
COMMENT ON COLUMN creative_templates.canvas_width IS 'Canvas width in pixels for visual editor';
COMMENT ON COLUMN creative_templates.canvas_height IS 'Canvas height in pixels for visual editor';
