-- ============================================================================
-- SUUN TERVEYSTALO - Fix PDOOH 1080x1920 Template (targeted CSS-only fixes)
-- Preserves the original Figma-exported layout, only changes:
-- 1. Headline sizes: .Hymyile font-size 110px → 105px (match .OletHyvissKS)
-- 2. € sign smaller: separate <span> with smaller font for currency symbol
-- 3. Price flex-direction: column → row for side-by-side price + € layout
-- 4. Pricetag top position → template variable (adjustable for mies/nainen)
-- ============================================================================

UPDATE creative_templates
SET html_template = REPLACE(
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          html_template,
          -- Fix 1: Match headline sizes (Hymyile 110px → 105px like OletHyvissKS)
          'font-size: 110px;',
          'font-size: 105px;'
        ),
        -- Fix 2: Change Price from column to row layout for separate € sizing
        'display: flex; flex-direction: column; color: #0046AD; font-size: 133px;',
        'display: flex; flex-direction: row; align-items: flex-start; justify-content: center; color: #0046AD; font-size: 133px;'
      ),
      -- Fix 3: Separate € into its own span for smaller sizing
      '{{price}}€',
      '{{price}}<span class="Price-currency">€</span>'
    ),
    -- Fix 4: Add Price-currency CSS class before closing </style>
    '</style>',
    '        .Price-currency { font-size: 65px; margin-top: 10px; margin-left: 2px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>'
  ),
  -- Fix 5: Make pricetag top position a template variable
  'top: 720.62px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center;',
  'top: {{pricetag_top}}; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center;'
),
-- Update default_values to include pricetag_top
default_values = default_values::jsonb || '{"pricetag_top":"720.62px"}'::jsonb,
-- Update placeholders to include pricetag_top
placeholders = placeholders::jsonb || '[{"key":"pricetag_top","type":"text","label":"Pricetag sijainti (top)","required":false}]'::jsonb,
updated_at = NOW()
WHERE type = 'pdooh' AND size = '1080x1920';
