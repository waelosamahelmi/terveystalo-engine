/**
 * Script to:
 * 1. Verify and fix templates in creative_templates table
 * 2. Re-render all existing creatives from updated templates
 * 3. Use correct absolute font URLs for deployed site
 * 
 * Run with: node scripts/fix-and-rerender-creatives.mjs
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Deployed site URL for absolute font paths
const SITE_URL = 'https://suunterveystalo.netlify.app';

function getFontFaceCSS() {
  return `@font-face { font-family: 'TerveystaloSans'; src: url('${SITE_URL}/font/TerveystaloSans-Regular.woff2') format('woff2'), url('${SITE_URL}/font/TerveystaloSans-Regular.woff') format('woff'); font-weight: 400; font-style: normal; }
        @font-face { font-family: 'TerveystaloSans'; src: url('${SITE_URL}/font/TerveystaloSans-SemiBold.woff2') format('woff2'), url('${SITE_URL}/font/TerveystaloSans-SemiBold.woff') format('woff'); font-weight: 600; font-style: normal; }
        @font-face { font-family: 'TerveystaloSans'; src: url('${SITE_URL}/font/TerveystaloSans-Bold.woff2') format('woff2'), url('${SITE_URL}/font/TerveystaloSans-Bold.woff') format('woff'); font-weight: 700; font-style: normal; }`;
}

function applyTemplateChanges(html) {
  // 1. Remove Google Fonts imports
  html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi, '');
  html = html.replace(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);?\s*/gi, '');
  
  // 2. Remove old @font-face blocks that reference relative paths (from previous run)
  html = html.replace(/@font-face\s*\{[^}]*\/font\/TerveystaloSans[^}]*\}\s*/g, '');
  
  // 3. Add TerveystaloSans @font-face with ABSOLUTE URLs after <style>
  if (html.includes('<style>')) {
    html = html.replace(/<style>\s*/i, `<style>\n        ${getFontFaceCSS()}\n        `);
  } else if (html.includes('<style ')) {
    html = html.replace(/(<style[^>]*>)\s*/i, `$1\n        ${getFontFaceCSS()}\n        `);
  }
  
  // 4. Replace ALL font-family references to use TerveystaloSans
  html = html.replace(/font-family:\s*['"]?Montserrat['"]?[^;]*/gi, "font-family: 'TerveystaloSans', sans-serif");
  html = html.replace(/font-family:\s*['"]?Inter['"]?[^;]*/gi, "font-family: 'TerveystaloSans', sans-serif");
  html = html.replace(/font-family:\s*['"]?Poppins['"]?[^;]*/gi, "font-family: 'TerveystaloSans', sans-serif");
  
  // 5. Remove ALL rotate(-3deg) from price-bubble
  // The price-bubble animation uses slideInFromLeft which had rotate(-3deg)
  // We need to remove it from BOTH the .price-bubble CSS AND the slideInFromLeft keyframes
  
  // Remove rotate(-3deg) anywhere it appears (but NOT -30deg which is for artwork)
  html = html.replace(/\s*rotate\(-3deg\)/g, '');
  
  // Clean up any resulting empty transform or double spaces
  html = html.replace(/transform:\s*;/g, '');
  html = html.replace(/transform:\s+;/g, '');
  
  return html;
}

function addDisclaimer(html, templateName) {
  const is1080 = templateName.includes('1080x1920');
  const is980 = templateName.includes('980x400');
  
  if (!is1080 && !is980) return html;
  
  // Add disclaimer CSS if not present
  if (!html.includes('.disclaimer')) {
    const disclaimerFontSize = is1080 ? '16px' : '7px';
    const disclaimerPadding = is1080 ? '0 40px' : '0 20px';
    const disclaimerBottom = is1080 ? '20px' : '5px';
    
    const disclaimerCSS = `\n        .disclaimer { position: absolute; bottom: ${disclaimerBottom}; left: 0; right: 0; padding: ${disclaimerPadding}; text-align: center; font-size: ${disclaimerFontSize}; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards; }`;
    
    // Insert before </style>
    html = html.replace('</style>', `${disclaimerCSS}\n    </style>`);
  }
  
  // Add disclaimer div if not present
  if (!html.includes('disclaimer_text') && !html.includes('class="disclaimer"')) {
    html = html.replace(
      '</div>\n</body>',
      '    <div class="disclaimer">{{disclaimer_text}}</div>\n    </div>\n</body>'
    );
    // Fallback: try before closing ad-container
    if (!html.includes('class="disclaimer"')) {
      html = html.replace(
        /(<\/div>\s*<\/body>)/,
        `        <div class="disclaimer">{{disclaimer_text}}</div>\n    $1`
      );
    }
  }
  
  return html;
}

async function main() {
  console.log('='.repeat(60));
  console.log('STEP 1: Fix templates in creative_templates table');
  console.log('='.repeat(60));
  
  const { data: templates, error: tErr } = await supabase
    .from('creative_templates')
    .select('*')
    .like('name', 'Suun Terveystalo%');

  if (tErr) {
    console.error('❌ Failed to fetch templates:', tErr);
    return;
  }

  console.log(`Found ${templates.length} templates\n`);

  for (const template of templates) {
    console.log(`📝 ${template.name}`);
    
    let html = template.html_template;
    
    // Check current state
    const hasRotate3 = html.includes('rotate(-3deg)');
    const hasTerveystaloFont = html.includes('TerveystaloSans');
    const hasAbsoluteFontUrl = html.includes(SITE_URL + '/font/');
    const hasMontserrat = /font-family:.*Montserrat/i.test(html);
    const hasInter = /font-family:.*Inter/i.test(html);
    
    console.log(`   rotate(-3deg): ${hasRotate3 ? '❌ STILL PRESENT' : '✅ removed'}`);
    console.log(`   TerveystaloSans: ${hasTerveystaloFont ? '✅ present' : '❌ MISSING'}`);
    console.log(`   Absolute font URLs: ${hasAbsoluteFontUrl ? '✅ present' : '⚠️  relative'}`);
    console.log(`   Old fonts (Montserrat/Inter): ${hasMontserrat || hasInter ? '❌ STILL PRESENT' : '✅ removed'}`);
    
    // Apply fixes
    html = applyTemplateChanges(html);
    html = addDisclaimer(html, template.name);
    
    // Verify fixes
    const fixedRotate = html.includes('rotate(-3deg)');
    const fixedFont = html.includes('TerveystaloSans');
    console.log(`   AFTER FIX: rotate(-3deg)=${fixedRotate ? 'STILL THERE' : 'REMOVED'}, TerveystaloSans=${fixedFont ? 'YES' : 'NO'}`);
    
    // Build update
    const updateData = {
      html_template: html,
      updated_at: new Date().toISOString()
    };
    
    // Add disclaimer placeholders/defaults for PDOOH templates
    if (template.name.includes('980x400') || template.name.includes('1080x1920')) {
      let placeholders = Array.isArray(template.placeholders) ? [...template.placeholders] : [];
      if (!placeholders.some(p => p.key === 'disclaimer_text')) {
        placeholders.push({
          key: 'disclaimer_text',
          label: 'Vastuuvapauslauseke',
          type: 'textarea',
          required: false,
          maxLength: 500
        });
      }
      
      let defaultValues = template.default_values ? { ...template.default_values } : {};
      if (!defaultValues.disclaimer_text) {
        defaultValues.disclaimer_text = 'Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.';
      }
      
      updateData.placeholders = placeholders;
      updateData.default_values = defaultValues;
      console.log(`   Disclaimer: ✅ added to placeholders and defaults`);
    }

    const { error: uErr } = await supabase
      .from('creative_templates')
      .update(updateData)
      .eq('id', template.id);

    if (uErr) {
      console.error(`   ❌ Update failed: ${uErr.message}`);
    } else {
      console.log(`   ✅ Template updated\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Re-render ALL existing creatives');
  console.log('='.repeat(60));
  
  // Fetch all creatives that reference templates
  const { data: creatives, error: cErr } = await supabase
    .from('creatives')
    .select('id, name, template_id, template_variables, html_content');

  if (cErr) {
    console.error('❌ Failed to fetch creatives:', cErr);
    return;
  }

  console.log(`Found ${creatives?.length || 0} creatives to re-render\n`);
  
  // Refresh templates (with our updates applied)
  const { data: updatedTemplates } = await supabase
    .from('creative_templates')
    .select('*')
    .like('name', 'Suun Terveystalo%');
  
  const templateMap = {};
  updatedTemplates?.forEach(t => { templateMap[t.id] = t; });

  let updated = 0;
  let skipped = 0;
  
  for (const creative of (creatives || [])) {
    const template = templateMap[creative.template_id];
    
    if (!template) {
      console.log(`   ⏭️  ${creative.name || creative.id} — no matching template, skipping`);
      skipped++;
      continue;
    }
    
    // Re-render: merge default values with creative's variables
    const variables = {
      ...(template.default_values || {}),
      ...(creative.template_variables || {})
    };
    
    let newHtml = template.html_template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      newHtml = newHtml.replace(regex, String(value));
    });
    
    // Also fix any existing html_content that might have rotation/old fonts
    const updateCreative = {
      html_content: newHtml,
      updated_at: new Date().toISOString()
    };
    
    const { error: cuErr } = await supabase
      .from('creatives')
      .update(updateCreative)
      .eq('id', creative.id);
    
    if (cuErr) {
      console.error(`   ❌ ${creative.name || creative.id}: ${cuErr.message}`);
    } else {
      console.log(`   ✅ Re-rendered: ${creative.name || creative.id}`);
      updated++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`DONE! Updated ${updated} creatives, skipped ${skipped}`);
  console.log(`${'='.repeat(60)}`);
  console.log('\nChanges applied:');
  console.log('  ✅ TerveystaloSans font (absolute URLs to suunterveystalo.netlify.app)');
  console.log('  ✅ rotate(-3deg) removed from price bubble');
  console.log('  ✅ Disclaimer text added to PDOOH templates (980x400 & 1080x1920)');
  console.log('\nRefresh your browser to see changes.');
}

main().catch(console.error);
