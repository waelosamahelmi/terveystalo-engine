import type { Handler } from '@netlify/functions';

const handler: Handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const url = event.queryStringParameters?.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parameter is required' }),
    };
  }

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    
    // Optional: Add allowed domains whitelist for security
    // const allowedDomains = ['kiinteistomaailma.fi', 'example.com'];
    // if (!allowedDomains.some(domain => parsedUrl.hostname.endsWith(domain))) {
    //   return {
    //     statusCode: 403,
    //     body: JSON.stringify({ error: 'Domain not allowed' }),
    //   };
    // }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Norr3-Marketing-Engine/1.0',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Failed to fetch: ${response.statusText}` }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to fetch data' }),
    };
  }
};

export { handler };
