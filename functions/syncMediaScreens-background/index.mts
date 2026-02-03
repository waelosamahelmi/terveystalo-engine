import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Get Supabase credentials from environment variables
function getEnvVar(names: string[]): string {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name] || '';
    }
  }
  return '';
}

// Initialize Supabase client
const SUPABASE_URL = getEnvVar([
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'REACT_APP_SUPABASE_URL',
  'NETLIFY_SUPABASE_URL'
]);

const SUPABASE_SERVICE_ROLE_KEY = getEnvVar([
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'REACT_APP_SUPABASE_SERVICE_ROLE_KEY',
  'NETLIFY_SUPABASE_SERVICE_ROLE_KEY'
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// BidTheatre API URL
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

interface MediaScreen {
  id: number;
  site_url: string;
  rtb_supplier_name: string;
  site_type: string;
  daily_request: number;
  floor_cpm: number | null;
  avg_cpm: number | null;
  dimensions: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  network_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
}

// Fetch BidTheatre credentials from Supabase
async function getBidTheatreCredentials(): Promise<BidTheatreCredentials> {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch BidTheatre credentials');
  }

  return {
    network_id: data.network_id,
    username: data.username,
    password: data.password,
  };
}

// Authenticate with BidTheatre and get token
async function getBidTheatreToken(): Promise<string | null> {
  const credentials = await getBidTheatreCredentials();
  try {
    const response = await axios.post(`${BT_API_URL}/auth`, {
      username: credentials.username,
      password: credentials.password,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    const token = response.data?.auth?.token;
    return token || null;
  } catch (error) {
    console.error('Failed to authenticate with BidTheatre:', error);
    return null;
  }
}

// Map of Finnish cities with approximate coordinates for validation
const finnishCities = [
  'Akaa', 'Alajärvi', 'Alavieska', 'Alavus', 'Asikkala', 'Askola', 'Aura',
  'Espoo', 'Forssa', 'Haapajärvi', 'Haapavesi', 'Hamina', 'Hanko', 'Harjavalta',
  'Heinola', 'Helsinki', 'Hollola', 'Huittinen', 'Hyvinkää', 'Hämeenlinna',
  'Iisalmi', 'Ikaalinen', 'Imatra', 'Janakkala', 'Joensuu', 'Jyväskylä', 'Jämsä',
  'Järvenpää', 'Kaarina', 'Kajaani', 'Kalajoki', 'Kangasala', 'Kankaanpää',
  'Karkkila', 'Kauniainen', 'Kemi', 'Kemijärvi', 'Kempele', 'Kerava', 'Keuruu',
  'Kirkkonummi', 'Kitee', 'Kittilä', 'Kokkola', 'Kotka', 'Kouvola', 'Kuopio',
  'Kurikka', 'Kuusamo', 'Lahti', 'Lappeenranta', 'Lapua', 'Laukaa', 'Lempäälä',
  'Lieksa', 'Lohja', 'Loimaa', 'Loviisa', 'Maarianhamina', 'Mariehamn', 'Mikkeli',
  'Muhos', 'Mustasaari', 'Mäntsälä', 'Naantali', 'Nivala', 'Nokia', 'Nurmes',
  'Nurmijärvi', 'Orimattila', 'Orivesi', 'Oulainen', 'Oulu', 'Outokumpu',
  'Paimio', 'Parainen', 'Parkano', 'Pieksämäki', 'Pietarsaari', 'Pirkkala',
  'Pori', 'Porvoo', 'Raahe', 'Raisio', 'Rauma', 'Riihimäki', 'Rovaniemi',
  'Saarijärvi', 'Salo', 'Sastamala', 'Savonlinna', 'Seinäjoki', 'Siilinjärvi',
  'Sipoo', 'Sodankylä', 'Sotkamo', 'Tampere', 'Tornio', 'Turku', 'Tuusula',
  'Ulvila', 'Uusikaupunki', 'Vaasa', 'Valkeakoski', 'Vantaa', 'Varkaus',
  'Viitasaari', 'Virrat', 'Ylivieska', 'Ylöjärvi', 'Äänekoski', 'Kamppi'
];

// Check if the coordinates are valid (in Finland)
function isValidCoordinate(lat: number, lng: number): boolean {
  const minLat = 59.5;
  const maxLat = 70.0;
  const minLng = 19.0;
  const maxLng = 32.0;
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

// Extract coordinates from site URL
function extractCoordinatesFromSiteURL(siteURL: string): { latitude: number | null; longitude: number | null } {
  try {
    const coordPattern = /(\d+\.\d+)[,\s]+(\d+\.\d+)/;
    const match = siteURL.match(coordPattern);
    
    if (match && match.length >= 3) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return { latitude: null, longitude: null };
  } catch (error) {
    return { latitude: null, longitude: null };
  }
}

// Extract location name from site URL
function extractLocationFromSiteURL(siteURL: string): string | null {
  try {
    const parts = siteURL.split(' - ');
    if (parts.length > 0) {
      return parts[0] || null;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Extract city from site URL
function extractCityFromSiteURL(siteURL: string): string | null {
  try {
    const normalizedSiteURL = siteURL.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const city of finnishCities) {
      const pattern = new RegExp(`\\b${city}\\b`, 'i');
      if (pattern.test(normalizedSiteURL)) {
        return city;
      }
      
      const normalizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedPattern = new RegExp(`\\b${normalizedCity}\\b`, 'i');
      if (normalizedPattern.test(normalizedSiteURL)) {
        return city;
      }
    }
    
    // Check parenthesized part
    const parenthesesMatch = siteURL.match(/\((.*?)\)/);
    if (parenthesesMatch && parenthesesMatch[1]) {
      const innerText = parenthesesMatch[1];
      for (const city of finnishCities) {
        if (innerText.includes(city)) {
          return city;
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Extract dimensions from site URL
function extractDimensionsFromSiteURL(siteURL: string): string | null {
  try {
    const dimensionPattern = /(\d+)x(\d+)/;
    const match = siteURL.match(dimensionPattern);
    if (match && match[0]) {
      return match[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Generate fallback ID
function generateFallbackId(site: any): number {
  try {
    const str = `${site.siteURL || ''}${site.rtbSupplierName || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  } catch (error) {
    return Math.floor(Math.random() * 1000000) + 1000000;
  }
}

// Fetch all media screens from BidTheatre API
async function fetchAllMediaScreens(token: string, networkId: string): Promise<MediaScreen[]> {
  let allSites: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMorePages = true;
  
  while (hasMorePages) {
    console.log(`Fetching screens page with offset ${offset}...`);
    
    const url = `${BT_API_URL}/${networkId}/rtb-site?siteType=dooh&limit=${limit}&offset=${offset}`;
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data) {
      break;
    }
    
    let currentPageSites: any[] = [];
    let totalCount = 0;
    
    if (response.data.rtbSites && Array.isArray(response.data.rtbSites)) {
      currentPageSites = response.data.rtbSites;
      if (response.data.pagination?.totalRowCount) {
        totalCount = response.data.pagination.totalRowCount;
      }
    } else if (Array.isArray(response.data)) {
      currentPageSites = response.data;
    } else if (response.data.id) {
      currentPageSites = [response.data];
    }
    
    // Filter out pagination metadata objects
    currentPageSites = currentPageSites.filter(site => {
      return site && typeof site === 'object' && !site.rtbSites && !site.apiVersion;
    });
    
    console.log(`Found ${currentPageSites.length} sites on this page`);
    allSites = [...allSites, ...currentPageSites];
    
    offset += limit;
    if (currentPageSites.length < limit || (totalCount > 0 && offset >= totalCount)) {
      hasMorePages = false;
    }
    
    // Safety limit (max 5000 sites)
    if (offset >= 5000) {
      hasMorePages = false;
    }
  }
  
  console.log(`Total sites fetched: ${allSites.length}`);
  
  return allSites.map(site => {
    if (!site.id) {
      site.id = generateFallbackId(site);
    }
    
    const coordinates = extractCoordinatesFromSiteURL(site.siteURL || '');
    const location = extractLocationFromSiteURL(site.siteURL || '');
    const dimensions = extractDimensionsFromSiteURL(site.siteURL || '');
    const city = extractCityFromSiteURL(site.siteURL || '');
    
    return {
      id: site.id,
      site_url: site.siteURL || '',
      rtb_supplier_name: site.rtbSupplierName || '',
      site_type: site.siteType || '',
      daily_request: site.dailyRequest || 0,
      floor_cpm: site.floorCPM || null,
      avg_cpm: site.avgCPM || null,
      dimensions: dimensions,
      location: location,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      city: city,
      network_id: networkId,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }).filter(screen => screen.id > 0);
}

// Netlify Background Function handler for syncing media screens
export async function handler(event) {
  console.log(`Media screens sync function started at ${new Date().toISOString()}`);
  
  try {
    // Step 1: Get BidTheatre credentials and authenticate
    console.log('Authenticating with BidTheatre...');
    const credentials = await getBidTheatreCredentials();
    const token = await getBidTheatreToken();
    
    if (!token) {
      throw new Error('Failed to authenticate with BidTheatre');
    }
    
    console.log('Successfully authenticated with BidTheatre');
    
    // Step 2: Fetch all media screens from BidTheatre
    console.log('Fetching media screens from BidTheatre API...');
    const screens = await fetchAllMediaScreens(token, credentials.network_id);
    
    if (!screens || screens.length === 0) {
      console.log('No media screens found from BidTheatre');
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'No media screens found',
          count: 0
        }),
      };
    }
    
    console.log(`Fetched ${screens.length} media screens from BidTheatre`);
    
    // Step 3: Filter screens with valid IDs
    const screensWithValidIds = screens.filter(screen => screen.id != null && screen.id !== undefined);
    
    if (screensWithValidIds.length < screens.length) {
      console.warn(`Found ${screens.length - screensWithValidIds.length} screens with missing IDs`);
    }
    
    if (screensWithValidIds.length === 0) {
      throw new Error('All screens are missing IDs');
    }
    
    // Step 4: Upsert screens to database in batches
    const BATCH_SIZE = 100;
    let upsertedCount = 0;
    
    for (let i = 0; i < screensWithValidIds.length; i += BATCH_SIZE) {
      const batch = screensWithValidIds.slice(i, i + BATCH_SIZE);
      console.log(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} screens`);
      
      const { error } = await supabase
        .from('media_screens')
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`Error upserting batch: ${error.message}`);
        throw error;
      }
      
      upsertedCount += batch.length;
    }
    
    console.log(`Successfully synced ${upsertedCount} media screens`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Successfully synced ${upsertedCount} media screens`,
        count: upsertedCount
      }),
    };
  } catch (error) {
    console.error('Error in syncMediaScreens-background:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to sync media screens',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}
