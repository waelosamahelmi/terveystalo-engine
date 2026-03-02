const fs = require('fs');

const syncFunction = `// Netlify function to sync creative templates to the database
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Missing Supabase environment variables' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    const action = event.queryStringParameters?.action || 'sync';

    if (action === 'list') {
      const { data, error } = await supabase
        .from('creative_templates')
        .select('*')
        .order('sort_order');

      if (error) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ templates: data }),
      };
    }

    if (action === 'sync') {
      const { data: existing, error: fetchError } = await supabase
        .from('creative_templates')
        .select('*');

      if (fetchError) {
        throw new Error('Failed to fetch existing templates: ' + fetchError.message);
      }

      const templateConfigs = [
        { name: '300x300 Display', size: '300x300', type: 'display', width: 300, height: 300, sort_order: 1 },
        { name: '300x431 Display', size: '300x431', type: 'display', width: 300, height: 431, sort_order: 2 },
        { name: '300x600 Display', size: '300x600', type: 'display', width: 300, height: 600, sort_order: 3 },
        { name: '620x891 Display', size: '620x891', type: 'display', width: 620, height: 891, sort_order: 4 },
        { name: '980x400 Display', size: '980x400', type: 'display', width: 980, height: 400, sort_order: 5 },
        { name: '1080x1920 PDOOH', size: '1080x1920', type: 'pdooh', width: 1080, height: 1920, sort_order: 6 },
        { name: '1080x1080 Meta Feed', size: '1080x1080', type: 'meta', width: 1080, height: 1080, sort_order: 7 },
      ];

      const results = [];

      for (const config of templateConfigs) {
        const existingTemplate = existing?.find(t => t.size === config.size && t.type === config.type);

        if (existingTemplate) {
          results.push({
            action: 'found',
            size: config.size,
            type: config.type,
            name: config.name,
            error: null,
          });
        } else {
          results.push({
            action: 'missing',
            size: config.size,
            type: config.type,
            name: config.name,
            error: { message: 'Template not found - run SQL migration to add' },
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          message: 'Template check complete. Run SQL migration if templates are missing.',
          results,
        }),
      };
    }

    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Unknown action' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
    };
  }
};
`;

fs.writeFileSync('c:/Users/Owner/terveystalo-engine/netlify/functions/sync-templates.cjs', syncFunction);
console.log('File written successfully');
