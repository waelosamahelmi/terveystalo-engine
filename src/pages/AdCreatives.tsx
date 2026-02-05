import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AdCreative, Campaign, CampaignApartment } from '../types';
import { Search, Download, Eye, FileText, Copy, RefreshCw, ChevronRight, ChevronDown, FileCode, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { isDemoMode, DEMO_CREATIVES } from '../lib/demoService';
import { DemoBanner } from '../components/DemoTooltip';

// Suun Terveystalo Creative Sizes - matches reference images in refs/ads/different-sizes/
// TODO: Update hashes when Creatopy templates for Suun Terveystalo are created
const CREATIVE_SIZES = [
  { width: 300, height: 300, hash: 'PENDING' },   // Suun-Terveystalo-300x300 (Square display banner)
  { width: 300, height: 431, hash: 'g3jo2pn' },   // Suun-Terveystalo-300x431 (Mobile vertical)
  { width: 300, height: 600, hash: '11jp13n' },   // Suun-Terveystalo-300x600 (Half page/Skyscraper)
  { width: 620, height: 891, hash: 'mqopyyq' },   // Suun-Terveystalo-620x891 (Large vertical)
  { width: 980, height: 400, hash: '58z5ylw' },   // Suun-Terveystalo-980x400 (Leaderboard)
  { width: 1080, height: 1920, hash: 'x8x7e3x' }  // Suun-Terveystalo-1080x1920 (PDOOH Portrait)
];

interface GroupedCreatives {
  [campaignId: string]: {
    campaign: Campaign;
    apartments: {
      [apartmentKey: string]: AdCreative[];
    };
  };
}

const AdCreatives = () => {
  const isDemo = isDemoMode();
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCreative, setSelectedCreative] = useState<AdCreative | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedApartments, setExpandedApartments] = useState<Set<string>>(new Set());
  const [groupedCreatives, setGroupedCreatives] = useState<GroupedCreatives>({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Group creatives by campaign and apartment
    const grouped: GroupedCreatives = {};
    
    creatives.forEach(creative => {
      const campaign = campaigns.find(c => c.id === creative.campaign_id);
      if (!campaign) return;
      
      if (!grouped[creative.campaign_id]) {
        grouped[creative.campaign_id] = {
          campaign,
          apartments: {}
        };
      }
      
      if (!grouped[creative.campaign_id].apartments[creative.apartment_key]) {
        grouped[creative.campaign_id].apartments[creative.apartment_key] = [];
      }
      
      grouped[creative.campaign_id].apartments[creative.apartment_key].push(creative);
    });
    
    setGroupedCreatives(grouped);
  }, [creatives, campaigns]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Demo mode - use demo creatives
      if (isDemo) {
        // Convert demo creatives to AdCreative format
        const demoCreativeData: AdCreative[] = DEMO_CREATIVES.map((dc, index) => ({
          id: dc.id,
          campaign_id: 'demo-campaign-1',
          apartment_key: 'demo-apt-1',
          target_id: `demo-target-${index}`,
          name: dc.name,
          size: `${dc.width}x${dc.height}`,
          hash: 'demo-hash',
          width: dc.width,
          height: dc.height,
          created_at: dc.created_at
        }));
        
        const demoCampaignData: Campaign[] = [{
          id: 'demo-campaign-1',
          partner_name: 'Demo Hammashoitola',
          campaign_address: 'Mannerheimintie 1, Helsinki'
        } as Campaign];
        
        setCreatives(demoCreativeData);
        setCampaigns(demoCampaignData);
        // Auto-expand the demo campaign
        setExpandedCampaigns(new Set(['demo-campaign-1']));
        setExpandedApartments(new Set(['demo-apt-1']));
        setLoading(false);
        return;
      }
      
      // Fetch creatives
      const { data: creativesData, error: creativesError } = await supabase
        .from('ad_creatives')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (creativesError) throw creativesError;
      
      // Fetch campaigns to get names
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, partner_name, campaign_address');
      
      if (campaignsError) throw campaignsError;
      
      setCreatives(creativesData);
      setCampaigns(campaignsData);
      
      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('activity_logs').insert({
          user_id: session.user.id,
          user_email: session.user.email,
          action: 'view_ad_creatives',
          details: 'User viewed ad creatives page'
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load ad creatives');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCreatives = async () => {
    try {
      setSyncing(true);
      
      // Get active campaigns
      const { data: activeCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*, campaign_apartments(*)')
        .eq('active', true)
        .eq('channel_display', 1);
      
      if (campaignsError) throw campaignsError;
      
      if (!activeCampaigns || activeCampaigns.length === 0) {
        toast.info('No active display campaigns found');
        return;
      }

      let createdCount = 0;
      const errors: string[] = [];

      // For each campaign, create creatives for each apartment
      for (const campaign of activeCampaigns) {
        const apartments = campaign.campaign_apartments as CampaignApartment[];
        
        for (const apartment of apartments) {
          // Check if creatives already exist for this apartment
          const { data: existingCreatives } = await supabase
            .from('ad_creatives')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('apartment_key', apartment.apartment_key);

          if (existingCreatives && existingCreatives.length > 0) {
            continue; // Skip if creatives already exist
          }

          // Create creatives for each size
          const creativesToInsert = CREATIVE_SIZES.map(size => ({
            campaign_id: campaign.id,
            apartment_key: apartment.apartment_key,
            target_id: `${campaign.id}-${apartment.apartment_key}`,
            name: `${campaign.partner_name}-${apartment.apartment_key}-${size.width}x${size.height}`,
            size: `${size.width}x${size.height}`,
            hash: size.hash,
            width: size.width,
            height: size.height
          }));

          const { error: insertError } = await supabase
            .from('ad_creatives')
            .insert(creativesToInsert);

          if (insertError) {
            errors.push(`Failed to create creatives for apartment ${apartment.apartment_key}: ${insertError.message}`);
          } else {
            createdCount += creativesToInsert.length;
          }
        }
      }

      // Log activity
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('activity_logs').insert({
          user_id: session.user.id,
          user_email: session.user.email,
          action: 'sync_ad_creatives',
          details: `Created ${createdCount} new ad creatives${errors.length > 0 ? ' with some errors' : ''}`
        });
      }

      // Refresh the data
      await fetchData();

      // Show results
      if (errors.length > 0) {
        toast.error(`Created ${createdCount} creatives with ${errors.length} errors`);
        console.error('Sync errors:', errors);
      } else {
        toast.success(`Successfully created ${createdCount} new creatives`);
      }
    } catch (error) {
      console.error('Error syncing creatives:', error);
      toast.error('Failed to sync ad creatives');
    } finally {
      setSyncing(false);
    }
  };

  const getCreativeHtml = (creative: AdCreative) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${creative.name}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f0f0f0;
    }
    .creative-container {
      width: ${creative.width}px;
      height: ${creative.height}px;
      background: white;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="creative-container">
    <script type="text/javascript">
      var embedConfig = {
        "hash": "${creative.hash}",
        "width": ${creative.width},
        "height": ${creative.height},
        "t": "{timestamp}",
        "userId": 762652,
        "network": "STANDARD",
        "clickTag": "{clickurl}",
        "type": "html5",
        "targetId": "${creative.target_id}"
      };
    </script>
    <script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>
  </div>
</body>
</html>`;
  };

  const handleDownloadHtml = (creative: AdCreative) => {
    try {
      const html = getCreativeHtml(creative);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${creative.name}-${creative.size}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('HTML file downloaded');
    } catch (error) {
      console.error('Error downloading HTML:', error);
      toast.error('Failed to download HTML');
    }
  };

  const handleDownloadTxt = (creative: AdCreative) => {
    try {
      const scriptContent = `<script type="text/javascript">
var embedConfig = {
  "hash": "${creative.hash}",
  "width": ${creative.width},
  "height": ${creative.height},
  "t": "{timestamp}",
  "userId": 762652,
  "network": "STANDARD",
  "clickTag": "{clickurl}",
  "type": "html5",
  "targetId": "${creative.target_id}"
};
</script>
<script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>`;

      const blob = new Blob([scriptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${creative.name}-${creative.size}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('TXT file downloaded');
    } catch (error) {
      console.error('Error downloading TXT:', error);
      toast.error('Failed to download TXT');
    }
  };

  const handleCopyHtml = (creative: AdCreative) => {
    try {
      const scriptContent = `<script type="text/javascript">
var embedConfig = {
  "hash": "${creative.hash}",
  "width": ${creative.width},
  "height": ${creative.height},
  "t": "{timestamp}",
  "userId": 762652,
  "network": "STANDARD",
  "clickTag": "{clickurl}",
  "type": "html5",
  "targetId": "${creative.target_id}"
};
</script>
<script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>`;

      navigator.clipboard.writeText(scriptContent);
      toast.success('HTML code copied to clipboard');
    } catch (error) {
      console.error('Error copying HTML:', error);
      toast.error('Failed to copy HTML');
    }
  };

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const toggleApartment = (apartmentKey: string) => {
    setExpandedApartments(prev => {
      const next = new Set(prev);
      if (next.has(apartmentKey)) {
        next.delete(apartmentKey);
      } else {
        next.add(apartmentKey);
      }
      return next;
    });
  };

  const filteredGroupedCreatives = Object.entries(groupedCreatives).filter(([_, { campaign }]) => {
    return (
      campaign.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.campaign_address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Banner */}
      {isDemo && <DemoBanner message="Demo-tila: Nämä ovat esimerkkikreatiiveja. Oikeassa tilissä voit hallita kampanjoidesi mainosmateriaaleja." />}
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ad Creatives</h1>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>

          <button
            onClick={handleSyncCreatives}
            disabled={syncing || isDemo}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              syncing || isDemo
                ? 'bg-purple-400 text-white cursor-not-allowed'
                : 'bg-purple-700 text-white hover:bg-purple-800'
            }`}
          >
            <RefreshCw size={18} className={`mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Creatives'}
          </button>
        </div>
      </div>

      {/* Demo Mode: Show creative gallery directly */}
      {isDemo ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Mainospohjat ({DEMO_CREATIVES.length} kpl)
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Nämä ovat valmiita mainospohjia eri kanaville ja kokoihin. Oikeassa tilissä voit luoda ja hallita omia kreatiivejasi.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {DEMO_CREATIVES.map((creative) => (
                <div 
                  key={creative.id}
                  className="bg-gray-50 dark:bg-slate-700 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-shadow"
                >
                  {/* Creative Preview */}
                  <div className="aspect-video bg-gray-100 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
                    <img 
                      src={creative.preview_url}
                      alt={creative.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                  
                  {/* Creative Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {creative.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {creative.width} × {creative.height}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        creative.channel === 'display' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      }`}>
                        {creative.channel.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Palvelu: {creative.service_name}
                    </div>
                    
                    {/* Actions */}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Esikatsele"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Lataa"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                        title="Kopioi koodi"
                      >
                        <Copy size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Info Card */}
          <div className="bg-gradient-to-r from-[#00A5B5]/10 to-[#1B365D]/10 dark:from-[#00A5B5]/20 dark:to-[#1B365D]/20 rounded-xl p-6 border border-[#00A5B5]/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#00A5B5] rounded-xl">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Kreatiivien hallinta</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Oikeassa tilissä voit ladata omia kuvia, luoda uusia mainospohjia ja synkronoida ne automaattisesti kampanjoihin.
                  Järjestelmä luo mainosmateriaalit kaikissa tarvittavissa ko'oissa DOOH- ja Display-kanaville.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
      /* Regular Mode: Split View Layout */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Hierarchical List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 space-y-2">
            {filteredGroupedCreatives.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No creatives found
              </div>
            ) : (
              filteredGroupedCreatives.map(([campaignId, { campaign, apartments }]) => (
                <div key={campaignId} className="border rounded-lg">
                  {/* Campaign Level */}
                  <div 
                    className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleCampaign(campaignId)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{campaign.partner_name}</h3>
                      <p className="text-sm text-gray-500">{campaign.campaign_address}</p>
                    </div>
                    {expandedCampaigns.has(campaignId) ? (
                      <ChevronDown size={20} className="text-gray-500" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-500" />
                    )}
                  </div>
                  
                  {/* Apartment Level */}
                  {expandedCampaigns.has(campaignId) && (
                    <div className="border-t">
                      {Object.entries(apartments).map(([apartmentKey, creatives]) => (
                        <div key={apartmentKey} className="border-b last:border-b-0">
                          <div 
                            className="flex items-center justify-between p-3 pl-8 bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleApartment(apartmentKey)}
                          >
                            <span className="text-sm font-medium text-gray-700">
                              Apartment: {apartmentKey}
                            </span>
                            {expandedApartments.has(apartmentKey) ? (
                              <ChevronDown size={18} className="text-gray-500" />
                            ) : (
                              <ChevronRight size={18} className="text-gray-500" />
                            )}
                          </div>
                          
                          {/* Creative Level */}
                          {expandedApartments.has(apartmentKey) && (
                            <div className="bg-white">
                              {creatives.map((creative) => (
                                <div 
                                  key={creative.id}
                                  className={`flex items-center justify-between p-3 pl-12 border-t hover:bg-gray-50 ${
                                    selectedCreative?.id === creative.id ? 'bg-purple-50' : ''
                                  }`}
                                >
                                  <div>
                                    <span className="text-sm font-medium text-gray-700">
                                      {creative.width}x{creative.height}
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      Created: {format(parseISO(creative.created_at), 'MMM d, yyyy HH:mm')}
                                    </span>
                                  </div>
                                  
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => setSelectedCreative(creative)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Preview"
                                    >
                                      <Eye size={18} />
                                    </button>
                                    
                                    <button
                                      onClick={() => handleDownloadHtml(creative)}
                                      className="text-green-600 hover:text-green-900"
                                      title="Download HTML"
                                    >
                                      <FileText size={18} />
                                    </button>

                                    <button
                                      onClick={() => handleDownloadTxt(creative)}
                                      className="text-orange-600 hover:text-orange-900"
                                      title="Download TXT"
                                    >
                                      <FileCode size={18} />
                                    </button>
                                    
                                    <button
                                      onClick={() => handleCopyHtml(creative)}
                                      className="text-purple-600 hover:text-purple-900"
                                      title="Copy HTML"
                                    >
                                      <Copy size={18} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4">
            {selectedCreative ? (
              <div>
                <h3 className="font-medium text-gray-900 mb-4">
                  Preview: {selectedCreative.width}x{selectedCreative.height}
                </h3>
                <div 
                  className="bg-gray-100 rounded-lg p-4 flex items-center justify-center"
                  style={{
                    minHeight: '400px',
                    maxHeight: 'calc(100vh - 300px)',
                    overflow: 'auto'
                  }}
                >
                  <div 
                    style={{
                      transform: selectedCreative.width > 800 ? 'scale(0.5)' : 'none',
                      transformOrigin: 'center center'
                    }}
                  >
                    <iframe
                      srcDoc={getCreativeHtml(selectedCreative)}
                      style={{
                        width: `${selectedCreative.width}px`,
                        height: `${selectedCreative.height}px`,
                        border: 'none',
                        background: 'white'
                      }}
                      sandbox="allow-scripts allow-same-origin allow-popups"
                      allow="autoplay"
                      referrerPolicy="origin"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Select a creative to preview
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default AdCreatives;