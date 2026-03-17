import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { format, parse, parseISO } from 'date-fns';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CampaignStats {
  CTR: number;
  activeImps: number;
  nrClicks: number;
  nrImps: number;
  cost: number;
  revenue: number;
  engagementRate: number;
}

interface DeviceStats {
  deviceType: { id: number; href: string };
  nrImps: number;
  nrClicks: number;
}

interface AudienceStats {
  audName: string;
  nrUniques: number;
  nrClickUniques: number;
  matchIndexImps: number;
}

interface GeoStats {
  region: string;
  latitude: number;
  longitude: number;
}

interface GeoCityStats {
  city: string;
  latitude: number;
  longitude: number;
  regionName: string;
  cityName: string;
  regionId: number;
  quota: number;
  ctr: number | null;
  quotaClick: number | null;
}

interface SiteStats {
  rtbSiteURL: string;
  nrImps: number;
  cost: number;
  revenue: number;
  viewableRate: number;
}

interface HotspotStats {
  hour?: number;
  weekday?: number;
  day?: number;
  month?: number;
  year?: number;
  nrImps: number;
  timeVisible: number;
  activeImps: number;
  nrClicks: number;
  engagementRate: number;
}

interface DailyStats {
  day: string;
  nrImps: number;
  nrClicks: number;
  CTR: number;
  activeImps: number;
  viewableRate: number;
  engagementRate: number;
  revenue: number;
  cost: number;
}

const CampaignDetails = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { campaigns } = useStore();
  const campaign = campaigns.find(c => c.id === campaignId);
  const { spendData } = location.state || {};
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [displayStats, setDisplayStats] = useState<CampaignStats[]>([]);
  const [pdoohStats, setPdoohStats] = useState<CampaignStats[]>([]);
  const [displayDevices, setDisplayDevices] = useState<DeviceStats[]>([]);
  const [displayAudience, setDisplayAudience] = useState<AudienceStats[]>([]);
  const [pdoohAudience, setPdoohAudience] = useState<AudienceStats[]>([]);
  const [displayGeo, setDisplayGeo] = useState<GeoStats[]>([]);
  const [pdoohGeo, setPdoohGeo] = useState<GeoStats[]>([]);
  const [displayGeoCities, setDisplayGeoCities] = useState<GeoCityStats[]>([]);
  const [pdoohGeoCities, setPdoohGeoCities] = useState<GeoCityStats[]>([]);
  const [displaySites, setDisplaySites] = useState<SiteStats[]>([]);
  const [pdoohSites, setPdoohSites] = useState<SiteStats[]>([]);
  const [displayHotspots, setDisplayHotspots] = useState<HotspotStats[]>([]);
  const [pdoohHotspots, setPdoohHotspots] = useState<HotspotStats[]>([]);
  const [displayDailyStats, setDisplayDailyStats] = useState<DailyStats[]>([]);
  const [pdoohDailyStats, setPdoohDailyStats] = useState<DailyStats[]>([]);
  
  // Replace two date inputs with a single month input
  const currentDate = new Date();
  const currentYearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);

  console.log('CampaignDetails: Initial render', { campaignId, spendData, selectedMonth });

  // Helper function to filter daily stats by selected month
  const filterDailyStatsByMonth = (dailyStats: any[]) => {
    if (!dailyStats || !Array.isArray(dailyStats)) return [];
    
    const [year, month] = selectedMonth.split('-').map(Number);
    
    return dailyStats.filter(stat => {
      if (!stat.day) return false;
      
      const statDate = parseISO(stat.day.split(' ')[0]);
      return statDate.getFullYear() === year && statDate.getMonth() + 1 === month;
    });
  };

  const fetchCampaignStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('fetchCampaignStats: Starting fetch', { campaignId, selectedMonth });

      const [year, month] = selectedMonth.split('-').map(Number);

      // Remove .single() to avoid errors when no data exists
      const { data: mediaCostsArray, error: mediaCostsError } = await supabase
        .from('media_costs')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('year', year)
        .eq('month', month)
        .order('created_at', { ascending: false });

      console.log('fetchCampaignStats: Media costs data from Supabase', { mediaCostsArray, mediaCostsError });
      
      // Check if we have any data
      const mediaCosts = mediaCostsArray && mediaCostsArray.length > 0 ? mediaCostsArray[0] : null;

      // If there's an error but it's not just "no data", show the error
      if (mediaCostsError && mediaCostsError.code !== 'PGRST116') {
        throw mediaCostsError;
      }

      // If no data found, set everything to default values instead of showing an error
      if (!mediaCosts) {
        console.log('No data found for the selected period, using default values');
        
        // Set default stats with zeroes
        setDisplayStats([{
          CTR: 0,
          activeImps: 0,
          nrClicks: 0,
          nrImps: 0,
          cost: 0,
          revenue: 0,
          engagementRate: 0,
        }]);
        
        setPdoohStats([{
          CTR: 0,
          activeImps: 0,
          nrClicks: 0,
          nrImps: 0,
          cost: 0,
          revenue: 0,
          engagementRate: 0,
        }]);
        
        // Clear all other arrays
        setDisplayDevices([]);
        setDisplayAudience([]);
        setPdoohAudience([]);
        setDisplayGeo([]);
        setPdoohGeo([]);
        setDisplayGeoCities([]);
        setPdoohGeoCities([]);
        setDisplaySites([]);
        setPdoohSites([]);
        setDisplayHotspots([]);
        setPdoohHotspots([]);
        setDisplayDailyStats([]);
        setPdoohDailyStats([]);
        
        setLoading(false);
        return;
      }

      // Transform base stats
      const displayStats: CampaignStats[] = [{
        CTR: mediaCosts.ctr_display || 0,
        activeImps: mediaCosts.active_impressions_display,
        nrClicks: mediaCosts.clicks_display,
        nrImps: mediaCosts.impressions_display,
        cost: mediaCosts.cost_display,
        revenue: mediaCosts.revenue_display,
        engagementRate: mediaCosts.engagement_rate_display || 0,
      }];
      setDisplayStats(displayStats);

      const pdoohStats: CampaignStats[] = [{
        CTR: mediaCosts.ctr_pdooh || 0,
        activeImps: mediaCosts.active_impressions_pdooh,
        nrClicks: mediaCosts.clicks_pdooh,
        nrImps: mediaCosts.impressions_pdooh,
        cost: mediaCosts.cost_pdooh,
        revenue: mediaCosts.revenue_pdooh,
        engagementRate: mediaCosts.engagement_rate_pdooh || 0,
      }];
      setPdoohStats(pdoohStats);

      // Set device stats
      setDisplayDevices(mediaCosts.device_stats_display || []);

      // Set audience stats
      setDisplayAudience(mediaCosts.audience_stats_display || []);
      setPdoohAudience(mediaCosts.audience_stats_pdooh || []);

      // Set geo stats
      setDisplayGeo(mediaCosts.geo_stats_display || []);
      setPdoohGeo(mediaCosts.geo_stats_pdooh || []);

      // Set geo city stats
      setDisplayGeoCities(mediaCosts.geo_city_stats_display || []);
      setPdoohGeoCities(mediaCosts.geo_city_stats_pdooh || []);

      // Set site stats
      setDisplaySites(mediaCosts.site_stats_display || []);
      setPdoohSites(mediaCosts.site_stats_pdooh || []);

      // Set hotspot stats
      setDisplayHotspots(mediaCosts.hotspot_stats_display || []);
      setPdoohHotspots(mediaCosts.hotspot_stats_pdooh || []);

      // Filter and set daily stats for selected month
      const filteredDisplayDailyStats = filterDailyStatsByMonth(mediaCosts.daily_stats_display || []);
      setDisplayDailyStats(filteredDisplayDailyStats);
      
      const filteredPdoohDailyStats = filterDailyStatsByMonth(mediaCosts.daily_stats_pdooh || []);
      setPdoohDailyStats(filteredPdoohDailyStats);

      console.log('fetchCampaignStats: Fetch completed', {
        displayStats,
        pdoohStats,
        displayDevices: mediaCosts.device_stats_display,
        displayAudience: mediaCosts.audience_stats_display,
        pdoohAudience: mediaCosts.audience_stats_pdooh,
        displayGeo: mediaCosts.geo_stats_display,
        pdoohGeo: mediaCosts.geo_stats_pdooh,
        displayGeoCities: mediaCosts.geo_city_stats_display,
        pdoohGeoCities: mediaCosts.geo_city_stats_pdooh,
        displaySites: mediaCosts.site_stats_display,
        pdoohSites: mediaCosts.site_stats_pdooh,
        displayHotspots: mediaCosts.hotspot_stats_display,
        pdoohHotspots: mediaCosts.hotspot_stats_pdooh,
        filteredDisplayDailyStats,
        filteredPdoohDailyStats
      });
    } catch (error) {
      console.error('fetchCampaignStats: Error fetching campaign stats', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  }, [campaignId, selectedMonth]);

  useEffect(() => {
    console.log('useEffect: Fetching campaign stats', { campaignId, selectedMonth });
    fetchCampaignStats();
  }, [fetchCampaignStats, campaignId, selectedMonth]);

  const deviceChartData = useMemo(() => (devices: DeviceStats[], channel: string) => {
    const deviceNames: { [key: number]: string } = {
      1: 'Desktop',
      2: 'Mobile',
      3: 'Tablet',
    };
    const data = {
      labels: devices.map(device => {
        // Add null check for deviceType
        const deviceId = device.deviceType?.id;
        return deviceId !== undefined ? (deviceNames[deviceId] || `Device ${deviceId}`) : 'Unknown';
      }),
      datasets: [
        {
          label: `${channel} Clicks`,
          data: devices.map(device => device.nrClicks),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC',
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95',
          borderWidth: 1,
        },
      ],
    };
    console.log(`deviceChartData: ${channel}`, data);
    return data;
  }, []);

  const devicePieChartData = useMemo(() => (devices: DeviceStats[], channel: string) => {
    const deviceNames: { [key: number]: string } = {
      1: 'Desktop',
      2: 'Mobile',
      3: 'Tablet',
    };
    const data = {
      labels: devices.map(device => {
        // Add null check for deviceType
        const deviceId = device.deviceType?.id;
        return deviceId !== undefined ? (deviceNames[deviceId] || `Device ${deviceId}`) : 'Unknown';
      }),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: devices.map(device => device.nrImps),
          backgroundColor: ['#6B21A8', '#A855F7', '#D8B4FE'], // Deep purple, light purple, very light purple
          borderColor: ['#4C1D95', '#6B21A8', '#A855F7'], // Dark purple, deep purple, light purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`devicePieChartData: ${channel}`, data);
    return data;
  }, []);

  const audienceChartData = useMemo(() => (audience: AudienceStats[], channel: string) => {
    const data = {
      labels: audience.map(item => item.audName),
      datasets: [
        {
          label: `${channel} Uniques`,
          data: audience.map(item => item.nrUniques),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95', // Deep purple and dark purple
          borderWidth: 1,
        },
        {
          label: `${channel} Click Uniques`,
          data: audience.map(item => item.nrClickUniques),
          backgroundColor: channel === 'Display' ? '#D8B4FE' : '#D8B4FE', // Very light purple
          borderColor: channel === 'Display' ? '#A855F7' : '#A855F7', // Light purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`audienceChartData: ${channel}`, data);
    return data;
  }, []);

  const sitesChartData = useMemo(() => (sites: SiteStats[], channel: string) => {
    const topSites = sites.slice(0, 5); // Top 5 sites by impressions
    const data = {
      labels: topSites.map(site => site.rtbSiteURL),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: topSites.map(site => site.nrImps),
          backgroundColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          borderColor: channel === 'Display' ? '#6B21A8' : '#4C1D95', // Deep purple and dark purple
          borderWidth: 1,
        },
      ],
    };
    console.log(`sitesChartData: ${channel}`, data);
    return data;
  }, []);

  const hourlyChartData = useMemo(() => (hotspots: HotspotStats[], channel: string) => {
    const hourlyDataImps = Array(24).fill(0).map((_, index) => {
      const hourData = hotspots.filter(h => h.hour === index);
      return hourData.reduce((sum, h) => sum + h.nrImps, 0);
    });
    const hourlyDataClicks = Array(24).fill(0).map((_, index) => {
      const hourData = hotspots.filter(h => h.hour === index);
      return hourData.reduce((sum, h) => sum + h.nrClicks, 0);
    });

    const data = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: hourlyDataImps,
          fill: false,
          borderColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          tension: 0.1,
        },
        {
          label: `${channel} Clicks`,
          data: hourlyDataClicks,
          fill: false,
          borderColor: channel === 'Display' ? '#D8B4FE' : '#D8B4FE', // Very light purple
          tension: 0.1,
        },
      ],
    };
    console.log(`hourlyChartData: ${channel}`, data);
    return data;
  }, []);

  const dailyImpressionsChartData = useMemo(() => (dailyStats: DailyStats[], channel: string) => {
    const data = {
      labels: dailyStats.map(stat => format(parseISO(stat.day.split(' ')[0]), 'yyyy-MM-dd')),
      datasets: [
        {
          label: `${channel} Impressions`,
          data: dailyStats.map(stat => stat.nrImps),
          borderColor: channel === 'Display' ? '#A855F7' : '#C084FC', // Light purple and medium purple
          backgroundColor: channel === 'Display' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(192, 132, 252, 0.2)',
          tension: 0.1,
          fill: true
        },
      ],
    };
    console.log(`dailyImpressionsChartData: ${channel}`, data);
    return data;
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  if (loading) {
    console.log('CampaignDetails: Rendering loading state');
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-900"></div>
      </div>
    );
  }

  console.log('CampaignDetails: Rendering main content', {
    spendData,
    displayStats,
    pdoohStats,
    displayDevices,
    displayAudience,
    pdoohAudience,
    displayGeo,
    pdoohGeo,
    displayGeoCities,
    pdoohGeoCities,
    displaySites,
    pdoohSites,
    displayHotspots,
    pdoohHotspots,
    displayDailyStats,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-purple-600 hover:text-purple-800 flex items-center transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Media Costs
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">{campaign?.name || `Campaign Details: ${campaignId}`}</h1>
        {campaign?.creator?.name && (
          <p className="text-sm text-gray-500 mb-6">Luonut: {campaign.creator.name}</p>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-blue-800">Meta Spend</h3>
            <p className="text-2xl font-semibold text-blue-900">
              €{spendData?.spendMeta ? spendData.spendMeta.toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-blue-700">Tracking not available</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow-sm border border-green-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-green-800">Display Spend</h3>
            <p className="text-2xl font-semibold text-green-900">
              €{spendData?.spendDisplay ? spendData.spendDisplay.toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-green-700">Impressions: {displayStats.length > 0 ? displayStats.reduce((sum, stat) => sum + stat.nrImps, 0) : 0}</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg shadow-sm border border-purple-100 transform hover:scale-105 transition-transform duration-200">
            <h3 className="text-lg font-medium text-purple-800">PDOOH Spend</h3>
            <p className="text-2xl font-semibold text-purple-900">
              €{spendData?.spendPdooh ? spendData.spendPdooh.toFixed(2) : '0.00'}
            </p>
            <p className="text-sm text-purple-700">Impressions: {pdoohStats.length > 0 ? pdoohStats.reduce((sum, stat) => sum + stat.nrImps, 0) : 0}</p>
          </div>
        </div>

        {/* Month/Year Selector */}
        <div className="mb-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <TabList className="flex border-b border-gray-200">
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 0 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Summary
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 1 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Devices
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 2 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Audience
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 3 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Geo
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 4 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Sites
            </Tab>
            <Tab className={`px-4 py-2 text-sm font-medium cursor-pointer ${tabIndex === 5 ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500 hover:text-purple-600'}`}>
              Hotspots
            </Tab>
          </TabList>

          {/* Summary Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayStats.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Total Impressions</p>
                      <p className="text-xl font-semibold text-gray-900">{displayStats.reduce((sum, stat) => sum + stat.nrImps, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Clicks</p>
                      <p className="text-xl font-semibold text-gray-900">{displayStats.reduce((sum, stat) => sum + stat.nrClicks, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average CTR</p>
                      <p className="text-xl font-semibold text-gray-900">{(displayStats.reduce((sum, stat) => sum + stat.CTR, 0) / displayStats.length).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-xl font-semibold text-gray-900">€{displayStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Line
                      data={dailyImpressionsChartData(displayDailyStats, 'Display')}
                      options={chartOptions}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Summary</h2>
                  <p className="text-sm text-gray-500">No data available for Display channel.</p>
                </div>
              )}
              {pdoohStats.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500">Total Impressions</p>
                      <p className="text-xl font-semibold text-gray-900">{pdoohStats.reduce((sum, stat) => sum + stat.nrImps, 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average CTR</p>
                      <p className="text-xl font-semibold text-gray-900">{(pdoohStats.reduce((sum, stat) => sum + stat.CTR, 0) / pdoohStats.length).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Cost</p>
                      <p className="text-xl font-semibold text-gray-900">€{pdoohStats.reduce((sum, stat) => sum + stat.cost, 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <Line
                      data={dailyImpressionsChartData(pdoohDailyStats, 'PDOOH')}
                      options={chartOptions}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Summary</h2>
                  <p className="text-sm text-gray-500">No data available for PDOOH channel in the selected period.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Devices Tab - Removed PDOOH Devices section */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayDevices.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Devices</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64">
                      <Pie data={devicePieChartData(displayDevices, 'Display')} options={chartOptions} />
                    </div>
                    <div className="h-64">
                      <Bar data={deviceChartData(displayDevices, 'Display')} options={chartOptions} />
                    </div>
                  </div>
                  <div className="overflow-x-auto mt-6">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clicks</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayDevices.map((device, index) => {
                          const deviceNames: { [key: number]: string } = {
                            1: 'Desktop',
                            2: 'Mobile',
                            3: 'Tablet',
                          };
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {device.deviceType?.id !== undefined 
                                  ? (deviceNames[device.deviceType.id] || `Device ${device.deviceType.id}`) 
                                  : 'Unknown'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.nrImps}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.nrClicks}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Devices</h2>
                  <p className="text-sm text-gray-500">No device data available for Display channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Audience Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayAudience.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Audience</h2>
                  <div className="h-64 mb-6">
                    <Bar data={audienceChartData(displayAudience, 'Display')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Index Imps</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displayAudience.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.audName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrClickUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.matchIndexImps.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Audience</h2>
                  <p className="text-sm text-gray-500">No audience data available for Display channel.</p>
                </div>
              )}
              {pdoohAudience.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Audience</h2>
                  <div className="h-64 mb-6">
                    <Bar data={audienceChartData(pdoohAudience, 'PDOOH')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Audience Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Click Uniques</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Index Imps</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pdoohAudience.map((item, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.audName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nrClickUniques}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.matchIndexImps.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Audience</h2>
                  <p className="text-sm text-gray-500">No audience data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Geo Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayGeoCities.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Geo</h2>
                  <div className="flex space-x-6">
                    <div className="w-2/3 h-96">
                      <MapContainer
                        center={[displayGeoCities[0].latitude, displayGeoCities[0].longitude]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {displayGeoCities.map((geo, index) => (
                          <Marker key={index} position={[geo.latitude, geo.longitude]}>
                            <Popup>
                              <div>
                                <h3 className="font-semibold">{geo.cityName}</h3>
                                <p>Region: {geo.regionName}</p>
                                <p>Quota: {geo.quota.toFixed(2)}</p>
                                <p>CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                                <p>Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                    <div className="w-1/3">
                      <h3 className="text-md font-semibold text-gray-800 mb-2">Geo Details</h3>
                      <div className="space-y-4">
                        {displayGeoCities.map((geo, index) => (
                          <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-gray-700">{geo.cityName}</h4>
                            <p className="text-sm text-gray-500">Region: {geo.regionName}</p>
                            <p className="text-sm text-gray-500">Quota: {geo.quota.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                            <p className="text-sm text-gray-500">Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Geo</h2>
                  <p className="text-sm text-gray-500">No geo data available for Display channel.</p>
                </div>
              )}
              {pdoohGeoCities.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Geo</h2>
                  <div className="flex space-x-6">
                    <div className="w-2/3 h-96">
                      <MapContainer
                        center={[pdoohGeoCities[0].latitude, pdoohGeoCities[0].longitude]}
                        zoom={6}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {pdoohGeoCities.map((geo, index) => (
                          <Marker key={index} position={[geo.latitude, geo.longitude]}>
                            <Popup>
                              <div>
                                <h3 className="font-semibold">{geo.cityName}</h3>
                                <p>Region: {geo.regionName}</p>
                                <p>Quota: {geo.quota.toFixed(2)}</p>
                                <p>CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                                <p>Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                    <div className="w-1/3">
                      <h3 className="text-md font-semibold text-gray-800 mb-2">Geo Details</h3>
                      <div className="space-y-4">
                        {pdoohGeoCities.map((geo, index) => (
                          <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-sm">
                            <h4 className="font-semibold text-gray-700">{geo.cityName}</h4>
                            <p className="text-sm text-gray-500">Region: {geo.regionName}</p>
                            <p className="text-sm text-gray-500">Quota: {geo.quota.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">CTR: {geo.ctr ? geo.ctr.toFixed(2) : 'N/A'}%</p>
                            <p className="text-sm text-gray-500">Quota Click: {geo.quotaClick ? geo.quotaClick.toFixed(2) : 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Geo</h2>
                  <p className="text-sm text-gray-500">No geo data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Sites Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displaySites.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Sites</h2>
                  <div className="h-64 mb-6">
                    <Bar data={sitesChartData(displaySites, 'Display')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewable Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {displaySites.map((site, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.rtbSiteURL}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.nrImps}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.cost.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.viewableRate.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Sites</h2>
                  <p className="text-sm text-gray-500">No site data available for Display channel.</p>
                </div>
              )}
              {pdoohSites.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Sites</h2>
                  <div className="h-64 mb-6">
                    <Bar data={sitesChartData(pdoohSites, 'PDOOH')} options={chartOptions} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site URL</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Viewable Rate</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pdoohSites.map((site, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.rtbSiteURL}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.nrImps}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.cost.toFixed(2)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">€{site.revenue.toFixed(2)}</td>
<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  {site.viewableRate != null ? `${site.viewableRate.toFixed(2)}%` : 'N/A'}
</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Sites</h2>
                  <p className="text-sm text-gray-500">No site data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Hotspots Tab */}
          <TabPanel>
            <div className="mt-4 space-y-6">
              {displayHotspots.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Hourly Impressions</h2>
                  <div className="h-64">
                    <Line data={hourlyChartData(displayHotspots, 'Display')} options={chartOptions} />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Hourly Impressions</h2>
                  <p className="text-sm text-gray-500">No hourly data available for Display channel.</p>
                </div>
              )}
              {pdoohHotspots.length > 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Hourly Impressions</h2>
                  <div className="h-64">
                    <Line data={hourlyChartData(pdoohHotspots, 'PDOOH')} options={chartOptions} />
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">PDOOH Hourly Impressions</h2>
                  <p className="text-sm text-gray-500">No hourly data available for PDOOH channel.</p>
                </div>
              )}
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default CampaignDetails;