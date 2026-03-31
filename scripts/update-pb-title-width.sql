-- Update .pb-title CSS in all creative_templates to allow wider offer titles
-- Adds: width: 130%; overflow: visible; white-space: nowrap;

-- Display 300x300
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 8px;
            font-weight: 600;
            line-height: 1.1;
            text-align: center;
            width: 100%;
        }',
  '.pb-title {
            font-size: 8px;
            font-weight: 600;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -2px;
        }'
)
WHERE size = '300x300' AND type = 'display';

-- Display 300x431
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 10px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 10px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -3px;
        }'
)
WHERE size = '300x431' AND type = 'display';

-- Display 300x600
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -4px;
        }'
)
WHERE size = '300x600' AND type = 'display';

-- Display 620x891
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 19px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 19px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -5px;
        }'
)
WHERE size = '620x891' AND type = 'display';

-- Display 980x400
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 16px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 16px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -4px;
        }'
)
WHERE size = '980x400' AND type = 'display';

-- PDOOH 1080x1920
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 32px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 32px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -8px;
        }'
)
WHERE size = '1080x1920' AND type = 'pdooh';

-- Meta 1080x1920
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 32px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 32px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -8px;
        }'
)
WHERE size = '1080x1920' AND type = 'meta';

-- Meta 1080x1080
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  '.pb-title {
            font-size: 22px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }',
  '.pb-title {
            font-size: 22px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            width: 160%;
            overflow: visible;
            white-space: nowrap;
            margin-bottom: -5px;
        }'
)
WHERE size = '1080x1080' AND type = 'meta';

-- ============================================================
-- Reduce margin between offer title and price (.pb-price margin)
-- ============================================================

-- Display 300x300: 2px 0 → 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 2px 0;
            letter-spacing: -1px;',
  'margin: 0;
            letter-spacing: -1px;'
)
WHERE size = '300x300' AND type = 'display';

-- Display 300x431: 3px 0 → 1px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 3px 0;
            letter-spacing: -1px;',
  'margin: 1px 0;
            letter-spacing: -1px;'
)
WHERE size = '300x431' AND type = 'display';

-- Display 300x600: 4px 0 → 1px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 4px 0;
            letter-spacing: -2px;',
  'margin: 1px 0;
            letter-spacing: -2px;'
)
WHERE size = '300x600' AND type = 'display';

-- Display 620x891: 6px 0 → 2px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 6px 0;
            letter-spacing: -3px;',
  'margin: 2px 0;
            letter-spacing: -3px;'
)
WHERE size = '620x891' AND type = 'display';

-- Display 980x400: 6px 0 → 2px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 6px 0;
            letter-spacing: -3px;',
  'margin: 2px 0;
            letter-spacing: -3px;'
)
WHERE size = '980x400' AND type = 'display';

-- PDOOH 1080x1920: 10px 0 → 4px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 10px 0;
            letter-spacing: -5px;',
  'margin: 4px 0;
            letter-spacing: -5px;'
)
WHERE size = '1080x1920' AND type = 'pdooh';

-- Meta 1080x1920: 10px 0 → 4px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 10px 0;
            letter-spacing: -5px;',
  'margin: 4px 0;
            letter-spacing: -5px;'
)
WHERE size = '1080x1920' AND type = 'meta';

-- Meta 1080x1080: 8px 0 → 3px 0
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'margin: 8px 0;
            letter-spacing: -4px;',
  'margin: 3px 0;
            letter-spacing: -4px;'
)
WHERE size = '1080x1080' AND type = 'meta';

-- ============================================================
-- Increase price bubble size (~15% larger)
-- ============================================================

-- Display 300x300: 90×90 → 105×105
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 90px;
            height: 90px;',
  'width: 105px;
            height: 105px;'
)
WHERE size = '300x300' AND type = 'display';

-- Display 300x431: 105×105 → 120×120
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 105px;
            height: 105px;',
  'width: 120px;
            height: 120px;'
)
WHERE size = '300x431' AND type = 'display';

-- Display 300x600: 140×140 → 160×160
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 140px;
            height: 140px;',
  'width: 160px;
            height: 160px;'
)
WHERE size = '300x600' AND type = 'display';

-- Display 620x891: 210×210 → 240×240
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 210px;
            height: 210px;',
  'width: 240px;
            height: 240px;'
)
WHERE size = '620x891' AND type = 'display';

-- Display 980x400: 200×200 → 230×230
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 200px;
            height: 200px;',
  'width: 230px;
            height: 230px;'
)
WHERE size = '980x400' AND type = 'display';

-- PDOOH 1080x1920: 340×340 → 390×390
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 340px;
            height: 340px;',
  'width: 390px;
            height: 390px;'
)
WHERE size = '1080x1920' AND type = 'pdooh';

-- Meta 1080x1920: 340×340 → 390×390
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 340px;
            height: 340px;',
  'width: 390px;
            height: 390px;'
)
WHERE size = '1080x1920' AND type = 'meta';

-- Meta 1080x1080: 240×240 → 275×275
UPDATE creative_templates
SET html_template = REPLACE(
  html_template,
  'width: 240px;
            height: 240px;',
  'width: 275px;
            height: 275px;'
)
WHERE size = '1080x1080' AND type = 'meta';
