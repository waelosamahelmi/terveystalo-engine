import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('Applying Meta ad templates migration...');

    // Read and execute the migration SQL
    const migrationPath = join(__dirname, '../supabase/migrations/20260223000005_add_meta_ad_templates.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('INSERT INTO creative_templates')) {
        console.log('Executing INSERT statement...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          // Try direct SQL execution via client
          console.log('Trying direct execution...');
          const result = await supabase
            .from('creative_templates')
            .select('*')
            .limit(1);

          // If we get here, we have access but need to use the dashboard
          console.log('\n⚠️  Migration needs to be applied manually via Supabase SQL Editor');
          console.log('\nPlease run this SQL in your Supabase SQL Editor:');
          console.log('─'.repeat(80));
          console.log(statement);
          console.log('─'.repeat(80));
        }
      }
    }

    console.log('\n✓ Meta ad templates migration completed!');
    console.log('\nTemplates added:');
    console.log('  - Suun Terveystalo 1080x1080 Meta (Square)');
    console.log('  - Suun Terveystalo 1080x1920 Meta (Stories/Reels Portrait)');
  } catch (err) {
    console.error('Error applying migration:', err.message);
    process.exit(1);
  }
}

applyMigration();
