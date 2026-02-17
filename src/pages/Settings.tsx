// ============================================================================
// SUUN TERVEYSTALO - Settings Page
// Application settings, AI config, and brand management
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { updateSetting, getAllSettings } from '../lib/settingsService';
import { getAIConfig } from '../lib/aiService';
import { getBrandAssets, uploadMedia } from '../lib/creativeService';
import {
  getSlackIntegration,
  saveSlackIntegration,
  getSlackNotificationSettings,
  saveSlackNotificationSettings,
  testSlackWebhook,
  SLACK_NOTIFICATION_TYPES,
  type SlackIntegration,
  type SlackNotificationType
} from '../lib/slackService';
import type { AIConfig } from '../types';
import {
  Settings as SettingsIcon,
  Bot,
  Palette,
  Bell,
  Database,
  Save,
  Upload,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Image,
  Key,
  Globe,
  ChevronRight,
  Edit,
  X,
  Plus,
  Code,
  Monitor,
  Loader2,
  Mail,
  MessageSquare,
  Hash,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import SettingsBidTheatre from '../components/SettingsBidTheatre';

type SettingsTab = 'general' | 'ai' | 'brand' | 'notifications' | 'slack' | 'bidtheatre' | 'integrations' | 'database' | 'developer';

interface DbSetting {
  key: string;
  value: any;
  category: string | null;
  description: string | null;
  updated_at: string | null;
}

// Tab Button
interface TabButtonProps {
  tab: SettingsTab;
  currentTab: SettingsTab;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}

const TabButton = ({ tab, currentTab, label, icon: Icon, onClick }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all ${
      currentTab === tab
        ? 'bg-[#00A5B5] text-white'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
    }`}
  >
    <Icon size={18} />
    <span className="font-medium">{label}</span>
  </button>
);

// BidTheatre API configuration
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// Finnish locations with coordinates (shopping centers, stations, etc.)
const finnishLocations: Record<string, { lat: number; lng: number; city: string }> = {
  // Helsinki area
  'iso omena': { lat: 60.1616, lng: 24.7386, city: 'Espoo' },
  'forum': { lat: 60.1693, lng: 24.9375, city: 'Helsinki' },
  'forum hki': { lat: 60.1693, lng: 24.9375, city: 'Helsinki' },
  'kamppi': { lat: 60.1685, lng: 24.9319, city: 'Helsinki' },
  'stockmann': { lat: 60.1688, lng: 24.9413, city: 'Helsinki' },
  'citycenter': { lat: 60.1709, lng: 24.9413, city: 'Helsinki' },
  'itäkeskus': { lat: 60.2098, lng: 25.0810, city: 'Helsinki' },
  'itis': { lat: 60.2098, lng: 25.0810, city: 'Helsinki' },
  'tripla': { lat: 60.1983, lng: 24.9292, city: 'Helsinki' },
  'mall of tripla': { lat: 60.1983, lng: 24.9292, city: 'Helsinki' },
  'redi': { lat: 60.1870, lng: 24.9815, city: 'Helsinki' },
  'pasila': { lat: 60.1989, lng: 24.9338, city: 'Helsinki' },
  'kalasatama': { lat: 60.1870, lng: 24.9780, city: 'Helsinki' },
  'kauppakeskus': { lat: 60.1688, lng: 24.9413, city: 'Helsinki' },
  'jumbo': { lat: 60.2921, lng: 25.0404, city: 'Vantaa' },
  'tikkurila': { lat: 60.2925, lng: 25.0418, city: 'Vantaa' },
  'sello': { lat: 60.2181, lng: 24.8111, city: 'Espoo' },
  'leppävaara': { lat: 60.2192, lng: 24.8128, city: 'Espoo' },
  'ainoa': { lat: 60.1750, lng: 24.8000, city: 'Espoo' },
  'tapiola': { lat: 60.1750, lng: 24.8050, city: 'Espoo' },
  'verkkokauppa': { lat: 60.1625, lng: 24.9058, city: 'Helsinki' },
  'myyrmanni': { lat: 60.2610, lng: 24.8535, city: 'Vantaa' },
  'myyrmäki': { lat: 60.2610, lng: 24.8535, city: 'Vantaa' },
  
  // Tampere area
  'ratina': { lat: 61.4935, lng: 23.7660, city: 'Tampere' },
  'koskikeskus': { lat: 61.4981, lng: 23.7617, city: 'Tampere' },
  'tullintori': { lat: 61.4988, lng: 23.7543, city: 'Tampere' },
  'ideapark': { lat: 61.4620, lng: 23.8600, city: 'Lempäälä' },
  'duo': { lat: 61.5060, lng: 23.7883, city: 'Tampere' },
  'sokos tampere': { lat: 61.4981, lng: 23.7620, city: 'Tampere' },
  
  // Turku area
  'hansa': { lat: 60.4518, lng: 22.2666, city: 'Turku' },
  'skanssi': { lat: 60.4330, lng: 22.2350, city: 'Turku' },
  'mylly': { lat: 60.4630, lng: 22.1630, city: 'Raisio' },
  'länsikeskus': { lat: 60.4410, lng: 22.2080, city: 'Turku' },
  'kupittaa': { lat: 60.4440, lng: 22.2900, city: 'Turku' },
  
  // Oulu area
  'valkea': { lat: 65.0142, lng: 25.4719, city: 'Oulu' },
  'stockmann oulu': { lat: 65.0130, lng: 25.4700, city: 'Oulu' },
  'zeppelin': { lat: 64.9990, lng: 25.5120, city: 'Oulu' },
  'ideapark oulu': { lat: 64.9500, lng: 25.5200, city: 'Oulu' },
  
  // Jyväskylä area
  'seppä': { lat: 62.2395, lng: 25.7580, city: 'Jyväskylä' },
  'jyväskeskus': { lat: 62.2426, lng: 25.7473, city: 'Jyväskylä' },
  'keljo': { lat: 62.2380, lng: 25.7030, city: 'Jyväskylä' },
  'prisma jyväskylä': { lat: 62.2310, lng: 25.7280, city: 'Jyväskylä' },
  
  // Kuopio area
  'matkus': { lat: 62.8800, lng: 27.6260, city: 'Kuopio' },
  'apaja': { lat: 62.8924, lng: 27.6783, city: 'Kuopio' },
  'sokos kuopio': { lat: 62.8924, lng: 27.6780, city: 'Kuopio' },
  
  // Lahti area
  'trio': { lat: 60.9827, lng: 25.6567, city: 'Lahti' },
  'karisma': { lat: 60.9700, lng: 25.6200, city: 'Lahti' },
  'sokos lahti': { lat: 60.9830, lng: 25.6560, city: 'Lahti' },
  
  // Joensuu area
  'iso myy': { lat: 62.6010, lng: 29.7630, city: 'Joensuu' },
  'sokos joensuu': { lat: 62.6010, lng: 29.7630, city: 'Joensuu' },
  
  // Lappeenranta
  'iso kristiina': { lat: 61.0587, lng: 28.1900, city: 'Lappeenranta' },
  'galleria': { lat: 61.0590, lng: 28.1870, city: 'Lappeenranta' },
  
  // Rovaniemi
  'rinteenkulma': { lat: 66.5039, lng: 25.7294, city: 'Rovaniemi' },
  'sampokeskus': { lat: 66.5039, lng: 25.7294, city: 'Rovaniemi' },
  'revontuli': { lat: 66.5000, lng: 25.7300, city: 'Rovaniemi' },
  
  // Vaasa
  'rewell': { lat: 63.0951, lng: 21.6164, city: 'Vaasa' },
  'sokos vaasa': { lat: 63.0950, lng: 21.6160, city: 'Vaasa' },
  
  // Pori
  'puuvilla': { lat: 61.4850, lng: 21.7970, city: 'Pori' },
  'sokos pori': { lat: 61.4833, lng: 21.7975, city: 'Pori' },
  
  // Kouvola
  'veturi': { lat: 60.8680, lng: 26.7040, city: 'Kouvola' },
  'sokos kouvola': { lat: 60.8680, lng: 26.7040, city: 'Kouvola' },
  
  // Hämeenlinna
  'goodman': { lat: 60.9946, lng: 24.4590, city: 'Hämeenlinna' },
  'sokos hämeenlinna': { lat: 60.9946, lng: 24.4550, city: 'Hämeenlinna' },
  
  // Kotka
  'pasaati': { lat: 60.4664, lng: 26.9458, city: 'Kotka' },
  'sokos kotka': { lat: 60.4664, lng: 26.9450, city: 'Kotka' },
  
  // Kokkola
  'chydenia': { lat: 63.8383, lng: 23.1312, city: 'Kokkola' },
  'sokos kokkola': { lat: 63.8383, lng: 23.1310, city: 'Kokkola' },
  
  // Seinäjoki
  'ideapark seinäjoki': { lat: 62.8000, lng: 22.8300, city: 'Seinäjoki' },
  'sokos seinäjoki': { lat: 62.7903, lng: 22.8403, city: 'Seinäjoki' },
  
  // Mikkeli
  'stella': { lat: 61.6870, lng: 27.2730, city: 'Mikkeli' },
  'sokos mikkeli': { lat: 61.6870, lng: 27.2730, city: 'Mikkeli' },
  
  // Generic city centers
  'espoo': { lat: 60.2055, lng: 24.6559, city: 'Espoo' },
  'vantaa': { lat: 60.2934, lng: 25.0378, city: 'Vantaa' },
  'helsinki': { lat: 60.1699, lng: 24.9384, city: 'Helsinki' },
  'tampere': { lat: 61.4978, lng: 23.7610, city: 'Tampere' },
  'turku': { lat: 60.4518, lng: 22.2666, city: 'Turku' },
  'oulu': { lat: 65.0121, lng: 25.4651, city: 'Oulu' },
  'jyväskylä': { lat: 62.2426, lng: 25.7473, city: 'Jyväskylä' },
  'kuopio': { lat: 62.8924, lng: 27.6783, city: 'Kuopio' },
  'lahti': { lat: 60.9827, lng: 25.6567, city: 'Lahti' },
  'pori': { lat: 61.4833, lng: 21.7975, city: 'Pori' },
  'joensuu': { lat: 62.6010, lng: 29.7630, city: 'Joensuu' },
  'lappeenranta': { lat: 61.0587, lng: 28.1900, city: 'Lappeenranta' },
  'rovaniemi': { lat: 66.5039, lng: 25.7294, city: 'Rovaniemi' },
  'vaasa': { lat: 63.0951, lng: 21.6164, city: 'Vaasa' },
  'kouvola': { lat: 60.8680, lng: 26.7040, city: 'Kouvola' },
  'hämeenlinna': { lat: 60.9946, lng: 24.4590, city: 'Hämeenlinna' },
  'kotka': { lat: 60.4664, lng: 26.9458, city: 'Kotka' },
  'kokkola': { lat: 63.8383, lng: 23.1312, city: 'Kokkola' },
  'seinäjoki': { lat: 62.7903, lng: 22.8403, city: 'Seinäjoki' },
  'mikkeli': { lat: 61.6870, lng: 27.2730, city: 'Mikkeli' },
  'savonlinna': { lat: 61.8686, lng: 28.8780, city: 'Savonlinna' },
  'rauma': { lat: 61.1275, lng: 21.5111, city: 'Rauma' },
  'kajaani': { lat: 64.2271, lng: 27.7285, city: 'Kajaani' },
  'iisalmi': { lat: 63.5578, lng: 27.1903, city: 'Iisalmi' },
  'hyvinkää': { lat: 60.6308, lng: 24.8608, city: 'Hyvinkää' },
  'porvoo': { lat: 60.3928, lng: 25.6650, city: 'Porvoo' },
  'riihimäki': { lat: 60.7389, lng: 24.7697, city: 'Riihimäki' },
  'salo': { lat: 60.3833, lng: 23.1333, city: 'Salo' },
  'lohja': { lat: 60.2500, lng: 24.0667, city: 'Lohja' },
  'järvenpää': { lat: 60.4739, lng: 25.0897, city: 'Järvenpää' },
  'kerava': { lat: 60.4028, lng: 25.1003, city: 'Kerava' },
  'nokia': { lat: 61.4778, lng: 23.5083, city: 'Nokia' },
  'kangasala': { lat: 61.4647, lng: 24.0675, city: 'Kangasala' },
  'pirkkala': { lat: 61.4667, lng: 23.6333, city: 'Pirkkala' },
  'raisio': { lat: 60.4861, lng: 22.1694, city: 'Raisio' },
  'kaarina': { lat: 60.4069, lng: 22.3722, city: 'Kaarina' },
  'lempäälä': { lat: 61.3153, lng: 23.7528, city: 'Lempäälä' },
  'ylöjärvi': { lat: 61.5500, lng: 23.5833, city: 'Ylöjärvi' },
  'varkaus': { lat: 62.3167, lng: 27.8833, city: 'Varkaus' },
  'imatra': { lat: 61.1711, lng: 28.7525, city: 'Imatra' },
  'tornio': { lat: 65.8500, lng: 24.1500, city: 'Tornio' },
  'kemi': { lat: 65.7347, lng: 24.5636, city: 'Kemi' },
  'forssa': { lat: 60.8167, lng: 23.6167, city: 'Forssa' },
  'heinola': { lat: 61.2044, lng: 26.0339, city: 'Heinola' },
};

// Extract location and coordinates from siteURL
const extractLocationInfo = (siteURL: string): { latitude: number | null; longitude: number | null; city: string | null; location: string | null } => {
  const lowerURL = siteURL.toLowerCase();
  
  // Try to match known locations
  for (const [locationKey, coords] of Object.entries(finnishLocations)) {
    if (lowerURL.includes(locationKey)) {
      return {
        latitude: coords.lat,
        longitude: coords.lng,
        city: coords.city,
        location: locationKey.charAt(0).toUpperCase() + locationKey.slice(1)
      };
    }
  }
  
  // Try to extract location name from format "FI - Location Name (xxx)"
  const match = siteURL.match(/FI\s*-\s*([^(]+)/i);
  if (match) {
    const locationName = match[1].trim().toLowerCase();
    for (const [locationKey, coords] of Object.entries(finnishLocations)) {
      if (locationName.includes(locationKey)) {
        return {
          latitude: coords.lat,
          longitude: coords.lng,
          city: coords.city,
          location: match[1].trim()
        };
      }
    }
    // Return location name even if no coordinates found
    return {
      latitude: null,
      longitude: null,
      city: null,
      location: match[1].trim()
    };
  }
  
  return { latitude: null, longitude: null, city: null, location: null };
};

const extractDimensionsFromSiteURL = (siteURL: string): string | null => {
  try {
    const dimensionPattern = /(\d+)x(\d+)/;
    const match = siteURL.match(dimensionPattern);
    return match && match[0] ? match[0] : null;
  } catch {
    return null;
  }
};

const generateFallbackId = (site: any): number => {
  try {
    const str = `${site.siteURL || ''}${site.rtbSupplierName || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  } catch {
    return Math.floor(Math.random() * 1000000) + 1000000;
  }
};

// Developer Tab Component
const DeveloperTab = () => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncResult, setSyncResult] = useState<{ count: number; errors: number } | null>(null);
  const [screenCount, setScreenCount] = useState<number | null>(null);

  // Load current screen count on mount
  useEffect(() => {
    loadScreenCount();
  }, []);

  const loadScreenCount = async () => {
    const { count, error } = await supabase
      .from('media_screens')
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      setScreenCount(count || 0);
    }
  };

  const addLog = (message: string) => {
    setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString('fi-FI')}] ${message}`]);
  };

  const syncMediaScreens = async () => {
    setSyncStatus('syncing');
    setSyncLog([]);
    setSyncResult(null);
    addLog('🚀 Aloitetaan DOOH-näyttöjen synkronointi...');

    try {
      // Step 1: Get BidTheatre credentials
      addLog('🔑 Haetaan BidTheatre-tunnukset...');
      const { data: credData, error: credError } = await supabase
        .from('bidtheatre_credentials')
        .select('network_id, username, password')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (credError || !credData) {
        throw new Error('BidTheatre-tunnuksia ei löytynyt. Lisää tunnukset ensin.');
      }

      addLog(`✅ Tunnukset löydetty (Network ID: ${credData.network_id})`);

      // Step 2: Authenticate with BidTheatre
      addLog('🔐 Kirjaudutaan BidTheatre API:iin...');
      const authResponse = await fetch(`${BT_API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: credData.username,
          password: credData.password,
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`Kirjautuminen epäonnistui: ${authResponse.status}`);
      }

      const authData = await authResponse.json();
      const token = authData?.auth?.token;

      if (!token) {
        throw new Error('Token puuttuu vastauksesta');
      }

      addLog('✅ Kirjautuminen onnistui');

      // Step 3: Fetch all media screens
      addLog('📡 Haetaan DOOH-näyttöjä BidTheatre API:sta...');
      let allSites: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMorePages = true;
      let pageCount = 0;

      while (hasMorePages) {
        const url = `${BT_API_URL}/${credData.network_id}/rtb-site?siteType=dooh&limit=${limit}&offset=${offset}`;
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`API-virhe: ${response.status}`);
        }

        const data = await response.json();
        let currentPageSites: any[] = [];
        let totalCount = 0;

        if (data.rtbSites && Array.isArray(data.rtbSites)) {
          currentPageSites = data.rtbSites;
          if (data.pagination?.totalRowCount) {
            totalCount = data.pagination.totalRowCount;
          }
        } else if (Array.isArray(data)) {
          currentPageSites = data;
        } else if (data.id) {
          currentPageSites = [data];
        }

        // Filter out metadata objects
        currentPageSites = currentPageSites.filter(site => 
          site && typeof site === 'object' && !site.rtbSites && !site.apiVersion
        );

        allSites = [...allSites, ...currentPageSites];
        pageCount++;
        addLog(`📄 Sivu ${pageCount}: ${currentPageSites.length} näyttöä haettu`);

        offset += limit;
        if (currentPageSites.length < limit || (totalCount > 0 && offset >= totalCount) || offset >= 5000) {
          hasMorePages = false;
        }
      }

      addLog(`✅ Yhteensä ${allSites.length} näyttöä haettu`);

      if (allSites.length === 0) {
        addLog('⚠️ Näyttöjä ei löytynyt');
        setSyncStatus('success');
        setSyncResult({ count: 0, errors: 0 });
        return;
      }

      // Step 4: Transform and prepare screens
      addLog('🔄 Käsitellään näyttödata...');
      let screensWithCoords = 0;
      let screensWithoutCoords = 0;
      
      const screens = allSites.map(site => {
        if (!site.id) {
          site.id = generateFallbackId(site);
        }

        const locationInfo = extractLocationInfo(site.siteURL || '');
        const dimensions = extractDimensionsFromSiteURL(site.siteURL || '');
        
        if (locationInfo.latitude && locationInfo.longitude) {
          screensWithCoords++;
        } else {
          screensWithoutCoords++;
        }

        return {
          id: site.id,
          site_url: site.siteURL || '',
          rtb_supplier_name: site.rtbSupplierName || '',
          site_type: site.siteType || '',
          daily_request: site.dailyRequest || 0,
          floor_cpm: site.floorCPM || null,
          avg_cpm: site.avgCPM || null,
          dimensions: dimensions,
          location: locationInfo.location,
          latitude: locationInfo.latitude,
          longitude: locationInfo.longitude,
          city: locationInfo.city,
          network_id: credData.network_id,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }).filter(screen => screen.id > 0);

      addLog(`✅ ${screens.length} näyttöä käsitelty`);
      addLog(`📍 Koordinaatit löydetty: ${screensWithCoords} näytölle`);
      addLog(`⚠️ Koordinaatit puuttuvat: ${screensWithoutCoords} näytöltä`);

      // Step 5: Upsert to database in batches
      addLog('💾 Tallennetaan tietokantaan...');
      const BATCH_SIZE = 100;
      let upsertedCount = 0;
      let errorCount = 0;

      for (let i = 0; i < screens.length; i += BATCH_SIZE) {
        const batch = screens.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(screens.length / BATCH_SIZE);

        const { error } = await supabase
          .from('media_screens')
          .upsert(batch, { onConflict: 'id' });

        if (error) {
          addLog(`❌ Erä ${batchNum}/${totalBatches} epäonnistui: ${error.message}`);
          errorCount += batch.length;
        } else {
          addLog(`✅ Erä ${batchNum}/${totalBatches}: ${batch.length} näyttöä tallennettu`);
          upsertedCount += batch.length;
        }
      }

      addLog(`🎉 Synkronointi valmis! ${upsertedCount} näyttöä tallennettu.`);
      setSyncStatus('success');
      setSyncResult({ count: upsertedCount, errors: errorCount });
      await loadScreenCount();

    } catch (error: any) {
      addLog(`❌ Virhe: ${error.message}`);
      setSyncStatus('error');
      setSyncResult({ count: 0, errors: 1 });
    }
  };

  return (
    <div className="card p-6 space-y-6 dark:bg-slate-800/70 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kehittäjäasetukset</h2>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        Kehittäjätyökalut ja integraatioiden hallinta.
      </p>

      {/* DOOH Screens Sync Section */}
      <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Monitor size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">DOOH-näyttöjen synkronointi</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Synkronoi DOOH-näytöt BidTheatre API:sta paikalliseen tietokantaan
              </p>
              {screenCount !== null && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Nykyinen näyttömäärä: <span className="font-medium text-gray-600 dark:text-gray-300">{screenCount}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={syncMediaScreens}
            disabled={syncStatus === 'syncing'}
            className="btn-primary flex items-center gap-2"
          >
            {syncStatus === 'syncing' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Synkronoidaan...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Synkronoi näytöt
              </>
            )}
          </button>
        </div>

        {/* Sync Result */}
        {syncResult && syncStatus !== 'syncing' && (
          <div className={`mt-4 p-3 rounded-lg ${
            syncStatus === 'success' ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatus === 'success' ? (
                <Check size={18} className="text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              )}
              <span className={syncStatus === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                {syncStatus === 'success' 
                  ? `Synkronointi onnistui! ${syncResult.count} näyttöä tallennettu.`
                  : 'Synkronointi epäonnistui'
                }
              </span>
            </div>
          </div>
        )}

        {/* Sync Log */}
        {syncLog.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Loki</h4>
            <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {syncLog.join('\n')}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Huomio</p>
            <p className="mt-1">
              Synkronointi vaatii voimassa olevat BidTheatre-tunnukset <code className="bg-blue-100 px-1 rounded">bidtheatre_credentials</code>-taulussa.
              Varmista myös, että <code className="bg-blue-100 px-1 rounded">media_screens</code>-taulu on luotu tietokantaan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showApiKey, setShowApiKey] = useState(false);

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    app_name: 'Suun Terveystalo',
    default_timezone: 'Europe/Helsinki',
    default_language: 'fi',
    date_format: 'dd.MM.yyyy',
    currency: 'EUR',
  });

  const [aiConfig, setAIConfig] = useState<Partial<AIConfig> & { api_key?: string }>({
    provider: 'openrouter',
    model: 'anthropic/claude-3-sonnet',
    api_key: '',
    temperature: 0.7,
    max_tokens: 2048,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    campaign_alerts: true,
    budget_warnings: true,
    weekly_reports: false,
    notification_email: '',
  });

  const [brandAssets, setBrandAssets] = useState<{ logos: string[]; images: string[]; fonts: string[] }>({ logos: [], images: [], fonts: [] });
  
  // Database settings state
  const [dbSettings, setDbSettings] = useState<DbSetting[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [dbLoading, setDbLoading] = useState(false);

  // Slack settings state
  const [slackIntegration, setSlackIntegration] = useState<SlackIntegration | null>(null);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackChannelName, setSlackChannelName] = useState('#marketing');
  const [slackEnabled, setSlackEnabled] = useState(false);
  const [slackNotifications, setSlackNotifications] = useState<Record<SlackNotificationType, boolean>>(
    Object.keys(SLACK_NOTIFICATION_TYPES).reduce((acc, key) => ({ ...acc, [key]: false }), {} as Record<SlackNotificationType, boolean>)
  );
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackSaving, setSlackSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load all settings from DB
      const settings = await getAllSettings();
      
      // Map settings to state
      if (settings) {
        setGeneralSettings({
          app_name: (typeof settings.app_name === 'string' ? settings.app_name : '') || 'Suun Terveystalo',
          default_timezone: (typeof settings.default_timezone === 'string' ? settings.default_timezone : '') || 'Europe/Helsinki',
          default_language: (typeof settings.default_language === 'string' ? settings.default_language : '') || 'fi',
          date_format: (typeof settings.date_format === 'string' ? settings.date_format : '') || 'dd.MM.yyyy',
          currency: (typeof settings.currency === 'string' ? settings.currency : '') || 'EUR',
        });

        setNotificationSettings({
          email_notifications: settings.email_notifications !== false,
          campaign_alerts: settings.campaign_alerts !== false,
          budget_warnings: settings.budget_warnings !== false,
          weekly_reports: settings.weekly_reports === true,
          notification_email: (typeof settings.notification_email === 'string' ? settings.notification_email : '') || '',
        });
      }

      // Load AI config
      const aiConfigData = await getAIConfig();
      if (aiConfigData) {
        setAIConfig({
          provider: aiConfigData.provider || 'openrouter',
          model: aiConfigData.model || 'anthropic/claude-3-sonnet',
          api_key: (aiConfigData as any).api_key || '',
          temperature: aiConfigData.temperature || 0.7,
          max_tokens: aiConfigData.max_tokens || 2048,
        });
      }

      // Load brand assets
      const assets = await getBrandAssets();
      setBrandAssets(assets);

      // Load raw database settings
      const { data: rawSettings, error: settingsError } = await supabase
        .from('app_settings')
        .select('key, value, category, description, updated_at')
        .order('category', { ascending: true })
        .order('key', { ascending: true });
      
      if (!settingsError && rawSettings) {
        setDbSettings(rawSettings);
      }

      // Load Slack integration
      const slackData = await getSlackIntegration();
      if (slackData) {
        setSlackIntegration(slackData);
        setSlackWebhookUrl(slackData.webhook_url || '');
        setSlackChannelName(slackData.channel_name || '#marketing');
        setSlackEnabled(slackData.is_enabled);
        
        // Load Slack notification settings
        const notifSettings = await getSlackNotificationSettings(slackData.id);
        setSlackNotifications(notifSettings);
      }

    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Asetusten lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(generalSettings)) {
        await updateSetting(key, value);
      }
      toast.success('Asetukset tallennettu');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('ai_config')
        .upsert({
          id: 'default',
          ...aiConfig,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('AI-asetukset tallennettu');
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast.error('Tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(notificationSettings)) {
        await updateSetting(key, value);
      }
      toast.success('Ilmoitusasetukset tallennettu');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  // Slack handlers
  const handleTestSlack = async () => {
    if (!slackWebhookUrl) {
      toast.error('Syötä Webhook URL ensin');
      return;
    }

    setSlackTesting(true);
    try {
      const result = await testSlackWebhook(slackWebhookUrl);
      if (result.success) {
        toast.success('Testi-ilmoitus lähetetty Slackiin!');
      } else {
        toast.error(result.error || 'Webhook-testi epäonnistui');
      }
    } catch (error) {
      toast.error('Webhook-testi epäonnistui');
    } finally {
      setSlackTesting(false);
    }
  };

  const handleSaveSlack = async () => {
    setSlackSaving(true);
    try {
      // Save integration settings
      const result = await saveSlackIntegration(slackWebhookUrl, slackChannelName, slackEnabled);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Save notification preferences if we have an integration ID
      if (result.id) {
        await saveSlackNotificationSettings(result.id, slackNotifications);
        setSlackIntegration({
          id: result.id,
          webhook_url: slackWebhookUrl,
          channel_name: slackChannelName,
          is_enabled: slackEnabled,
          created_at: slackIntegration?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      toast.success('Slack-asetukset tallennettu');
    } catch (error: any) {
      console.error('Error saving Slack settings:', error);
      toast.error(error.message || 'Tallentaminen epäonnistui');
    } finally {
      setSlackSaving(false);
    }
  };

  const toggleSlackNotification = (type: SlackNotificationType) => {
    setSlackNotifications(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const toggleAllSlackNotifications = (category: string, enabled: boolean) => {
    const typesInCategory = Object.entries(SLACK_NOTIFICATION_TYPES)
      .filter(([_, config]) => config.category === category)
      .map(([key]) => key as SlackNotificationType);
    
    setSlackNotifications(prev => {
      const updated = { ...prev };
      typesInCategory.forEach(type => {
        updated[type] = enabled;
      });
      return updated;
    });
  };

  const handleUploadBrandAsset = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadMedia(file, 'brand-assets');
      
      if (!result) {
        toast.error('Lataus epäonnistui. Tarkista Supabase Storage RLS-käytännöt (Row Level Security).');
        return;
      }

      // Save asset reference
      const { error } = await supabase
        .from('brand_assets')
        .insert({
          type,
          name: file.name,
          url: result.url,
          mime_type: file.type,
        });

      if (error) {
        console.error('brand_assets insert error:', error);
        // Provide specific error messages
        if (error.code === '42P01') {
          toast.error('brand_assets taulu ei ole olemassa. Suorita migraatio.');
        } else if (error.code === '23505') {
          toast.error('Tämän tyyppinen tiedosto on jo olemassa.');
        } else {
          toast.error(`Tallennus epäonnistui: ${error.message}`);
        }
        return;
      }
      
      toast.success('Tiedosto ladattu');
      loadSettings(); // Refresh assets
    } catch (error: any) {
      console.error('Error uploading asset:', error);
      toast.error(error.message || 'Lataus epäonnistui');
    }
  };

  const _handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän tiedoston?')) return;

    try {
      const { error } = await supabase
        .from('brand_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;
      
      toast.success('Tiedosto poistettu');
      loadSettings(); // Reload assets
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Poistaminen epäonnistui');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asetukset</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Hallitse sovelluksen asetuksia</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="card p-4 space-y-1 dark:bg-slate-800/70 dark:border-white/10">
            <TabButton
              tab="general"
              currentTab={activeTab}
              label="Yleiset"
              icon={SettingsIcon}
              onClick={() => setActiveTab('general')}
            />
            <TabButton
              tab="ai"
              currentTab={activeTab}
              label="AI Asetukset"
              icon={Bot}
              onClick={() => setActiveTab('ai')}
            />
            <TabButton
              tab="brand"
              currentTab={activeTab}
              label="Brändi"
              icon={Palette}
              onClick={() => setActiveTab('brand')}
            />
            <TabButton
              tab="notifications"
              currentTab={activeTab}
              label="Ilmoitukset"
              icon={Bell}
              onClick={() => setActiveTab('notifications')}
            />
            <TabButton
              tab="slack"
              currentTab={activeTab}
              label="Slack"
              icon={MessageSquare}
              onClick={() => setActiveTab('slack')}
            />
            <TabButton
              tab="bidtheatre"
              currentTab={activeTab}
              label="BidTheatre"
              icon={Monitor}
              onClick={() => setActiveTab('bidtheatre')}
            />
            <TabButton
              tab="integrations"
              currentTab={activeTab}
              label="Integraatiot"
              icon={Database}
              onClick={() => setActiveTab('integrations')}
            />
            <TabButton
              tab="database"
              currentTab={activeTab}
              label="Tietokanta"
              icon={Key}
              onClick={() => setActiveTab('database')}
            />
            <TabButton
              tab="developer"
              currentTab={activeTab}
              label="Kehittäjä"
              icon={Code}
              onClick={() => setActiveTab('developer')}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="card p-6 space-y-6 dark:bg-slate-800/70 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Yleiset asetukset</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sovelluksen nimi
                  </label>
                  <input
                    type="text"
                    value={generalSettings.app_name}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, app_name: e.target.value })}
                    className="input dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Aikavyöhyke
                  </label>
                  <select
                    value={generalSettings.default_timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, default_timezone: e.target.value })}
                    className="input dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                  >
                    <option value="Europe/Helsinki">Suomi (Europe/Helsinki)</option>
                    <option value="Europe/Stockholm">Ruotsi (Europe/Stockholm)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kieli
                  </label>
                  <select
                    value={generalSettings.default_language}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, default_language: e.target.value })}
                    className="input dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                  >
                    <option value="fi">Suomi</option>
                    <option value="en">English</option>
                    <option value="sv">Svenska</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Päivämäärämuoto
                  </label>
                  <select
                    value={generalSettings.date_format}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, date_format: e.target.value })}
                    className="input dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                  >
                    <option value="dd.MM.yyyy">31.12.2025</option>
                    <option value="yyyy-MM-dd">2025-12-31</option>
                    <option value="MM/dd/yyyy">12/31/2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valuutta
                  </label>
                  <select
                    value={generalSettings.currency}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                    className="input dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="SEK">SEK (kr)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/10">
                <button onClick={handleSaveGeneral} disabled={saving} className="btn-primary">
                  {saving ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                  Tallenna
                </button>
              </div>
            </div>
          )}

          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="card p-6 space-y-6 dark:bg-slate-800/70 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Asetukset</h2>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#00A5B5] hover:underline flex items-center"
                >
                  Hanki API-avain
                  <ExternalLink size={14} className="ml-1" />
                </a>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-start space-x-3">
                <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">OpenRouter-integraatio</p>
                  <p className="mt-1">AI Assistentti käyttää OpenRouter-palvelua. Voit valita haluamasi mallin ja säätää parametreja.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Key size={14} className="inline mr-1" />
                    API-avain
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={aiConfig.api_key || ''}
                      onChange={(e) => setAIConfig({ ...aiConfig, api_key: e.target.value })}
                      placeholder="sk-or-..."
                      className="input pr-10 dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Malli
                  </label>
                  <input
                    type="text"
                    value={aiConfig.model || ''}
                    onChange={(e) => setAIConfig({ ...aiConfig, model: e.target.value })}
                    placeholder="anthropic/claude-3-sonnet"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    OpenRouter-mallin nimi, esim: anthropic/claude-3.5-sonnet, openai/gpt-4o, google/gemini-pro
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lämpötila (Temperature)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={aiConfig.temperature || 0.7}
                      onChange={(e) => setAIConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Tarkka (0)</span>
                      <span>{aiConfig.temperature}</span>
                      <span>Luova (2)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max tokenit
                    </label>
                    <input
                      type="number"
                      value={aiConfig.max_tokens || 2048}
                      onChange={(e) => setAIConfig({ ...aiConfig, max_tokens: parseInt(e.target.value) })}
                      min="256"
                      max="8192"
                      className="input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSaveAI} disabled={saving} className="btn-primary">
                  {saving ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                  Tallenna
                </button>
              </div>
            </div>
          )}

          {/* Brand Settings */}
          {activeTab === 'brand' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Brändiasetukset</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Logo */}
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                    {brandAssets.logos[0] ? (
                      <img 
                        src={brandAssets.logos[0]} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image size={32} className="text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Logo</h4>
                  <p className="text-sm text-gray-500 mb-4">PNG tai SVG, max 2MB</p>
                  <label className="btn-outline cursor-pointer">
                    <Upload size={16} className="mr-2" />
                    Lataa logo
                    <input
                      type="file"
                      accept=".png,.svg"
                      onChange={(e) => handleUploadBrandAsset(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Favicon */}
                <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                    {brandAssets.images[0] ? (
                      <img 
                        src={brandAssets.images[0]} 
                        alt="Favicon" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Image size={32} className="text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Favicon</h4>
                  <p className="text-sm text-gray-500 mb-4">ICO tai PNG, 32x32 tai 64x64</p>
                  <label className="btn-outline cursor-pointer">
                    <Upload size={16} className="mr-2" />
                    Lataa favicon
                    <input
                      type="file"
                      accept=".ico,.png"
                      onChange={(e) => handleUploadBrandAsset(e, 'favicon')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Brand Colors Preview */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Brändvärit</h3>
                <div className="flex space-x-4">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#00A5B5]" />
                    <p className="text-xs text-gray-500 mt-2">Pääväri</p>
                    <p className="text-xs font-mono text-gray-700">#00A5B5</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#E31E24]" />
                    <p className="text-xs text-gray-500 mt-2">Toissijainen</p>
                    <p className="text-xs font-mono text-gray-700">#E31E24</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-xl bg-[#1B365D]" />
                    <p className="text-xs text-gray-500 mt-2">Korostus</p>
                    <p className="text-xs font-mono text-gray-700">#1B365D</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Assets */}
              {(brandAssets.logos.length > 0 || brandAssets.images.length > 0 || brandAssets.fonts.length > 0) && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Ladatut tiedostot</h3>
                  <div className="space-y-2">
                    {/* Logos */}
                    {brandAssets.logos.map((url, index) => (
                      <div key={`logo-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                            <img src={url} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Logo</p>
                            <p className="text-xs text-gray-500">logo</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Images */}
                    {brandAssets.images.map((url, index) => (
                      <div key={`image-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                            <img src={url} alt="" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Image</p>
                            <p className="text-xs text-gray-500">image</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Fonts */}
                    {brandAssets.fonts.map((_url, index) => (
                      <div key={`font-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                            <span className="text-gray-400 text-xs">Font</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Font</p>
                            <p className="text-xs text-gray-500">font</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Ilmoitusasetukset</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail size={14} className="inline mr-1" />
                    Ilmoitusten sähköposti
                  </label>
                  <input
                    type="email"
                    value={notificationSettings.notification_email}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, notification_email: e.target.value })}
                    placeholder="email@example.com"
                    className="input"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Sähköposti-ilmoitukset</p>
                      <p className="text-sm text-gray-500">Vastaanota ilmoituksia sähköpostitse</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.email_notifications}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, email_notifications: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Kampanjahälytykset</p>
                      <p className="text-sm text-gray-500">Ilmoitukset kampanjan tilasta</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.campaign_alerts}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, campaign_alerts: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Budjettivaroitukset</p>
                      <p className="text-sm text-gray-500">Varoitukset budjetin ylityksestä</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.budget_warnings}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, budget_warnings: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Viikkoraportit</p>
                      <p className="text-sm text-gray-500">Automaattinen viikottainen yhteenveto</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationSettings.weekly_reports}
                      onChange={(e) => setNotificationSettings({ ...notificationSettings, weekly_reports: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button onClick={handleSaveNotifications} disabled={saving} className="btn-primary">
                  {saving ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                  Tallenna
                </button>
              </div>
            </div>
          )}

          {/* Slack Integration */}
          {activeTab === 'slack' && (
            <div className="space-y-6">
              {/* Connection Card */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-[#4A154B] flex items-center justify-center">
                      <MessageSquare size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Slack-integraatio</h2>
                      <p className="text-sm text-gray-500">Yhdistä Slack ja vastaanota ilmoituksia</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSlackEnabled(!slackEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      slackEnabled ? 'bg-[#00A5B5]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        slackEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Status indicator */}
                <div className={`p-3 rounded-lg mb-6 ${
                  slackEnabled && slackWebhookUrl 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {slackEnabled && slackWebhookUrl ? (
                      <>
                        <Check size={16} className="text-green-600" />
                        <span className="text-sm font-medium text-green-700">Slack-integraatio on aktiivinen</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {!slackWebhookUrl ? 'Webhook URL puuttuu' : 'Integraatio on pois päältä'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Webhook URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Key size={14} className="inline mr-1" />
                      Slack Webhook URL
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={slackWebhookUrl}
                        onChange={(e) => setSlackWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="input flex-1"
                      />
                      <button
                        onClick={handleTestSlack}
                        disabled={slackTesting || !slackWebhookUrl}
                        className="btn-outline whitespace-nowrap"
                      >
                        {slackTesting ? (
                          <Loader2 size={16} className="animate-spin mr-2" />
                        ) : (
                          <Send size={16} className="mr-2" />
                        )}
                        Testaa
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Luo webhook Slack App:ssa → Incoming Webhooks → Add New Webhook
                    </p>
                  </div>

                  {/* Channel Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Hash size={14} className="inline mr-1" />
                      Kanavan nimi
                    </label>
                    <input
                      type="text"
                      value={slackChannelName}
                      onChange={(e) => setSlackChannelName(e.target.value)}
                      placeholder="#marketing"
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Kanava johon webhook on yhdistetty (vain viitteeksi)
                    </p>
                  </div>
                </div>

                {/* Setup Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-2">Slack-integraation käyttöönotto:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-700">
                        <li>Siirry osoitteeseen <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com/apps</a></li>
                        <li>Luo uusi Slack App tai valitse olemassa oleva</li>
                        <li>Aktivoi "Incoming Webhooks"</li>
                        <li>Lisää uusi webhook ja valitse kanava</li>
                        <li>Kopioi Webhook URL tähän</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Preferences */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900">Ilmoitusasetukset</h3>
                    <p className="text-sm text-gray-500">Valitse mitkä ilmoitukset lähetetään Slackiin</p>
                  </div>
                </div>

                {/* Notification Categories */}
                <div className="space-y-6">
                  {/* Campaigns */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center mr-2">
                          📣
                        </span>
                        Kampanjat
                      </h4>
                      <button
                        onClick={() => toggleAllSlackNotifications('campaigns', !Object.entries(SLACK_NOTIFICATION_TYPES)
                          .filter(([_, c]) => c.category === 'campaigns')
                          .every(([key]) => slackNotifications[key as SlackNotificationType]))}
                        className="text-xs text-[#00A5B5] hover:underline"
                      >
                        Valitse kaikki
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(SLACK_NOTIFICATION_TYPES)
                        .filter(([_, config]) => config.category === 'campaigns')
                        .map(([key, config]) => (
                          <label
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              slackNotifications[key as SlackNotificationType]
                                ? 'bg-[#00A5B5]/5 border-[#00A5B5]'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{config.emoji}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{config.label}</p>
                                <p className="text-xs text-gray-500">{config.description}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={slackNotifications[key as SlackNotificationType] || false}
                              onChange={() => toggleSlackNotification(key as SlackNotificationType)}
                              className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                            />
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center mr-2">
                          💰
                        </span>
                        Budjetti
                      </h4>
                      <button
                        onClick={() => toggleAllSlackNotifications('budget', !Object.entries(SLACK_NOTIFICATION_TYPES)
                          .filter(([_, c]) => c.category === 'budget')
                          .every(([key]) => slackNotifications[key as SlackNotificationType]))}
                        className="text-xs text-[#00A5B5] hover:underline"
                      >
                        Valitse kaikki
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(SLACK_NOTIFICATION_TYPES)
                        .filter(([_, config]) => config.category === 'budget')
                        .map(([key, config]) => (
                          <label
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              slackNotifications[key as SlackNotificationType]
                                ? 'bg-[#00A5B5]/5 border-[#00A5B5]'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{config.emoji}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{config.label}</p>
                                <p className="text-xs text-gray-500">{config.description}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={slackNotifications[key as SlackNotificationType] || false}
                              onChange={() => toggleSlackNotification(key as SlackNotificationType)}
                              className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                            />
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* Performance & Reports */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="w-6 h-6 rounded bg-green-100 flex items-center justify-center mr-2">
                          📊
                        </span>
                        Suorituskyky & Raportit
                      </h4>
                      <button
                        onClick={() => {
                          toggleAllSlackNotifications('performance', true);
                          toggleAllSlackNotifications('reports', true);
                        }}
                        className="text-xs text-[#00A5B5] hover:underline"
                      >
                        Valitse kaikki
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(SLACK_NOTIFICATION_TYPES)
                        .filter(([_, config]) => config.category === 'performance' || config.category === 'reports')
                        .map(([key, config]) => (
                          <label
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              slackNotifications[key as SlackNotificationType]
                                ? 'bg-[#00A5B5]/5 border-[#00A5B5]'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{config.emoji}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{config.label}</p>
                                <p className="text-xs text-gray-500">{config.description}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={slackNotifications[key as SlackNotificationType] || false}
                              onChange={() => toggleSlackNotification(key as SlackNotificationType)}
                              className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                            />
                          </label>
                        ))}
                    </div>
                  </div>

                  {/* System & Other */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="w-6 h-6 rounded bg-red-100 flex items-center justify-center mr-2">
                          ⚙️
                        </span>
                        Järjestelmä & Muut
                      </h4>
                      <button
                        onClick={() => {
                          toggleAllSlackNotifications('system', true);
                          toggleAllSlackNotifications('users', true);
                          toggleAllSlackNotifications('ai', true);
                        }}
                        className="text-xs text-[#00A5B5] hover:underline"
                      >
                        Valitse kaikki
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(SLACK_NOTIFICATION_TYPES)
                        .filter(([_, config]) => ['system', 'users', 'ai'].includes(config.category))
                        .map(([key, config]) => (
                          <label
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                              slackNotifications[key as SlackNotificationType]
                                ? 'bg-[#00A5B5]/5 border-[#00A5B5]'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{config.emoji}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{config.label}</p>
                                <p className="text-xs text-gray-500">{config.description}</p>
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={slackNotifications[key as SlackNotificationType] || false}
                              onChange={() => toggleSlackNotification(key as SlackNotificationType)}
                              className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                            />
                          </label>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6 mt-6 border-t border-gray-100">
                  <button
                    onClick={handleSaveSlack}
                    disabled={slackSaving}
                    className="btn-primary"
                  >
                    {slackSaving ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Save size={18} className="mr-2" />
                    )}
                    Tallenna Slack-asetukset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BidTheatre Integration */}
          {activeTab === 'bidtheatre' && <SettingsBidTheatre />}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Integraatiot</h2>
              </div>

              <div className="space-y-4">
                {/* Supabase */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Database size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Supabase</p>
                        <p className="text-sm text-gray-500">Tietokanta ja autentikaatio</p>
                      </div>
                    </div>
                    <span className="badge badge-success flex items-center">
                      <Check size={12} className="mr-1" />
                      Yhdistetty
                    </span>
                  </div>
                </div>

                {/* OpenRouter */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Bot size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">OpenRouter</p>
                        <p className="text-sm text-gray-500">AI-mallit</p>
                      </div>
                    </div>
                    <span className={`badge ${aiConfig.api_key ? 'badge-success' : 'badge-warning'} flex items-center`}>
                      {aiConfig.api_key ? (
                        <><Check size={12} className="mr-1" />Yhdistetty</>
                      ) : (
                        <><AlertCircle size={12} className="mr-1" />API-avain puuttuu</>
                      )}
                    </span>
                  </div>
                </div>

                {/* BidTheatre */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Globe size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">BidTheatre</p>
                        <p className="text-sm text-gray-500">Mainosverkosto</p>
                      </div>
                    </div>
                    <button className="btn-outline btn-sm">
                      Määritä
                      <ChevronRight size={14} className="ml-1" />
                    </button>
                  </div>
                </div>

                {/* Slack */}
                <div className="p-4 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center">
                        <MessageSquare size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Slack</p>
                        <p className="text-sm text-gray-500">Ilmoitukset ja hälytykset</p>
                      </div>
                    </div>
                    <span className={`badge ${slackEnabled && slackWebhookUrl ? 'badge-success' : 'badge-warning'} flex items-center`}>
                      {slackEnabled && slackWebhookUrl ? (
                        <><Check size={12} className="mr-1" />Yhdistetty</>
                      ) : (
                        <><AlertCircle size={12} className="mr-1" />Ei määritetty</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Settings */}
          {activeTab === 'database' && (
            <div className="card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Tietokanta-asetukset</h2>
                <button
                  onClick={loadSettings}
                  className="btn-outline btn-sm"
                  disabled={loading}
                >
                  <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Päivitä
                </button>
              </div>

              <p className="text-sm text-gray-500">
                Kaikki app_settings-taulun asetukset. Muokkaa arvoja varovasti.
              </p>

              <div className="space-y-3">
                {dbSettings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Ei asetuksia tietokannassa
                  </div>
                ) : (
                  dbSettings.map((setting) => (
                    <div
                      key={setting.key}
                      className="p-4 border border-gray-200 rounded-xl hover:border-[#00A5B5]/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono text-sm font-medium text-gray-900">{setting.key}</p>
                          {setting.category && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 mt-1 inline-block">
                              {setting.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {editingKey === setting.key ? (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    setDbLoading(true);
                                    const parsedValue = JSON.parse(editValue);
                                    const { error } = await supabase
                                      .from('app_settings')
                                      .update({ value: parsedValue, updated_at: new Date().toISOString() })
                                      .eq('key', setting.key);
                                    
                                    if (error) throw error;
                                    
                                    toast.success(`${setting.key} päivitetty`);
                                    setEditingKey(null);
                                    loadSettings();
                                  } catch (error: any) {
                                    console.error('Error updating setting:', error);
                                    toast.error(error.message || 'Virheellinen JSON tai tallennus epäonnistui');
                                  } finally {
                                    setDbLoading(false);
                                  }
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                disabled={dbLoading}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingKey(setting.key);
                                setEditValue(JSON.stringify(setting.value, null, 2));
                              }}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {setting.description && (
                        <p className="text-xs text-gray-500 mb-2">{setting.description}</p>
                      )}

                      {editingKey === setting.key ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full font-mono text-sm p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent"
                          rows={Math.min(10, editValue.split('\n').length + 2)}
                          placeholder="JSON arvo"
                        />
                      ) : (
                        <pre className="text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto max-h-32 overflow-y-auto">
                          <code className="text-gray-700">
                            {typeof setting.value === 'object'
                              ? JSON.stringify(setting.value, null, 2)
                              : String(setting.value)}
                          </code>
                        </pre>
                      )}

                      {setting.updated_at && (
                        <p className="text-xs text-gray-400 mt-2">
                          Päivitetty: {new Date(setting.updated_at).toLocaleString('fi-FI')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add new setting */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Lisää uusi asetus</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Avain (esim. new_setting)"
                    className="input"
                    id="new-setting-key"
                  />
                  <input
                    type="text"
                    placeholder="Kategoria (valinnainen)"
                    className="input"
                    id="new-setting-category"
                  />
                </div>
                <textarea
                  placeholder='JSON arvo (esim. "teksti" tai {"key": "value"})'
                  className="input mt-3 font-mono text-sm"
                  rows={3}
                  id="new-setting-value"
                />
                <input
                  type="text"
                  placeholder="Kuvaus (valinnainen)"
                  className="input mt-3"
                  id="new-setting-description"
                />
                <button
                  onClick={async () => {
                    const keyInput = document.getElementById('new-setting-key') as HTMLInputElement;
                    const valueInput = document.getElementById('new-setting-value') as HTMLTextAreaElement;
                    const categoryInput = document.getElementById('new-setting-category') as HTMLInputElement;
                    const descInput = document.getElementById('new-setting-description') as HTMLInputElement;
                    
                    const key = keyInput?.value?.trim();
                    const valueStr = valueInput?.value?.trim();
                    const category = categoryInput?.value?.trim() || null;
                    const description = descInput?.value?.trim() || null;
                    
                    if (!key || !valueStr) {
                      toast.error('Avain ja arvo vaaditaan');
                      return;
                    }
                    
                    try {
                      const parsedValue = JSON.parse(valueStr);
                      const { error } = await supabase
                        .from('app_settings')
                        .insert({
                          key,
                          value: parsedValue,
                          category,
                          description,
                        });
                      
                      if (error) throw error;
                      
                      toast.success('Asetus lisätty');
                      keyInput.value = '';
                      valueInput.value = '';
                      categoryInput.value = '';
                      descInput.value = '';
                      loadSettings();
                    } catch (error: any) {
                      console.error('Error adding setting:', error);
                      toast.error(error.message || 'Virheellinen JSON tai lisäys epäonnistui');
                    }
                  }}
                  className="btn-primary mt-3"
                >
                  <Plus size={16} className="mr-2" />
                  Lisää asetus
                </button>
              </div>
            </div>
          )}

          {/* Developer Tab */}
          {activeTab === 'developer' && (
            <DeveloperTab />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
