/**
 * Script to update creative templates directly in Supabase
 * Run with: node scripts/update-templates.mjs
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Font base URL - change this to your deployed site URL for production
const FONT_BASE_URL = ''; // Empty means relative path (works for localhost)

function getFontFaceCSS() {
  return `
@font-face { font-family: 'TerveystaloSans'; src: url('${FONT_BASE_URL}/font/TerveystaloSans-Regular.woff2') format('woff2'), url('${FONT_BASE_URL}/font/TerveystaloSans-Regular.woff') format('woff'); font-weight: 400; font-style: normal; }
@font-face { font-family: 'TerveystaloSans'; src: url('${FONT_BASE_URL}/font/TerveystaloSans-SemiBold.woff2') format('woff2'), url('${FONT_BASE_URL}/font/TerveystaloSans-SemiBold.woff') format('woff'); font-weight: 600; font-style: normal; }
@font-face { font-family: 'TerveystaloSans'; src: url('${FONT_BASE_URL}/font/TerveystaloSans-Bold.woff2') format('woff2'), url('${FONT_BASE_URL}/font/TerveystaloSans-Bold.woff') format('woff'); font-weight: 700; font-style: normal; }
`.trim();
}

async function updateTemplates() {
  console.log('🔄 Fetching existing templates...');
  
  const { data: templates, error } = await supabase
    .from('creative_templates')
    .select('*')
    .like('name', 'Suun Terveystalo%');

  if (error) {
    console.error('❌ Failed to fetch templates:', error);
    return;
  }

  console.log(`📋 Found ${templates.length} templates to update`);

  for (const template of templates) {
    console.log(`\n📝 Updating: ${template.name}`);
    
    let html = template.html_template;
    
    // 1. Replace Google Fonts import or existing @font-face with TerveystaloSans
    html = html.replace(
      /<link[^>]*fonts\.googleapis\.com[^>]*>/gi,
      ''
    );
    html = html.replace(
      /@import url\([^)]*fonts\.googleapis\.com[^)]*\);?/gi,
      ''
    );
    
    // 2. Add TerveystaloSans @font-face after <style> tag if not already present
    if (!html.includes('TerveystaloSans')) {
      html = html.replace(
        /<style>/i,
        `<style>\n        ${getFontFaceCSS()}`
      );
    }
    
    // 3. Replace Montserrat font-family with TerveystaloSans
    html = html.replace(
      /font-family:\s*['"]?Montserrat['"]?([^;]*);/gi,
      "font-family: 'TerveystaloSans'$1;"
    );
    html = html.replace(
      /font-family:\s*['"]?Inter['"]?([^;]*);/gi,
      "font-family: 'TerveystaloSans'$1;"
    );
    
    // 4. Remove rotation from price-bubble (keep other transforms)
    // Match .price-bubble { ... } and remove rotate(-3deg) from transform
    html = html.replace(
      /(\.price-bubble\s*\{[^}]*transform:\s*[^;]*?)rotate\(-3deg\)\s*/gi,
      '$1'
    );
    
    // 5. Remove rotation from slideInFromLeft animation
    html = html.replace(
      /(@keyframes\s+slideInFromLeft\s*\{[^}]*from\s*\{[^}]*transform:\s*)translateX\([^)]+\)\s*rotate\(-3deg\)/gi,
      '$1translateX(-50px)'
    );
    html = html.replace(
      /(@keyframes\s+slideInFromLeft\s*\{[^}]*to\s*\{[^}]*transform:\s*)translateX\([^)]+\)\s*rotate\(-3deg\)/gi,
      '$1translateX(0)'
    );
    
    // Also check for simpler slideInFromLeft that might just need cleanup
    html = html.replace(
      /transform:\s*translateX\([^)]+\)\s*rotate\(-3deg\)/g,
      (match) => {
        // Only apply to slideInFromLeft (which moves price bubble)
        // Keep rotation for artwork (slideInFromRight with -30deg)
        if (match.includes('rotate(-3deg)') && !match.includes('rotate(-30deg)')) {
          return match.replace('rotate(-3deg)', '').trim();
        }
        return match;
      }
    );

    // Prepare update data
    const updateData = {
      html_template: html,
      updated_at: new Date().toISOString()
    };

    // 6. For PDOOH templates (980x400 and 1080x1920), add disclaimer
    if (template.name.includes('980x400') || template.name.includes('1080x1920')) {
      // Add disclaimer CSS if not present
      if (!html.includes('.disclaimer')) {
        const disclaimerFontSize = template.name.includes('1080x1920') ? '16px' : '7px';
        const disclaimerPadding = template.name.includes('1080x1920') ? '0 40px' : '0 20px';
        const disclaimerBottom = template.name.includes('1080x1920') ? '20px' : '5px';
        
        const disclaimerCSS = `
        .disclaimer { position: absolute; bottom: ${disclaimerBottom}; left: 0; right: 0; padding: ${disclaimerPadding}; text-align: center; font-size: ${disclaimerFontSize}; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards; }`;
        
        html = html.replace(
          /(\.address\s*\{[^}]+\})/,
          `$1${disclaimerCSS}`
        );
      }
      
      // Add disclaimer div if not present
      if (!html.includes('{{disclaimer_text}}')) {
        html = html.replace(
          /(<div class="address">[^<]*<\/div>)/,
          `$1\n        <div class="disclaimer">{{disclaimer_text}}</div>`
        );
      }
      
      // Update placeholders to include disclaimer_text
      let placeholders = template.placeholders || [];
      if (!placeholders.some(p => p.key === 'disclaimer_text')) {
        placeholders.push({
          key: 'disclaimer_text',
          label: 'Vastuuvapauslauseke',
          type: 'textarea',
          required: false,
          maxLength: 500
        });
      }
      
      // Update default_values to include disclaimer_text
      let defaultValues = template.default_values || {};
      if (!defaultValues.disclaimer_text) {
        defaultValues.disclaimer_text = 'Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.';
      }
      
      updateData.html_template = html;
      updateData.placeholders = placeholders;
      updateData.default_values = defaultValues;
    }

    // Run the update
    const { error: updateError } = await supabase
      .from('creative_templates')
      .update(updateData)
      .eq('id', template.id);

    if (updateError) {
      console.error(`   ❌ Failed: ${updateError.message}`);
    } else {
      console.log(`   ✅ Updated successfully`);
    }
  }

  console.log('\n✨ Template update complete!');
  console.log('   Refresh your app to see the changes.');
}

updateTemplates().catch(console.error);
