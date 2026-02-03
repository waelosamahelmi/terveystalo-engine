// ============================================================================
// SUUN TERVEYSTALO - Campaign Preview Mode Component
// Preview campaigns before launching with multi-device views
// ============================================================================

import { useState, useEffect } from 'react';
import { 
  X, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ExternalLink,
  MapPin,
  Calendar,
  Euro,
  Target,
  Eye,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCw,
  Check,
  AlertTriangle,
  Sparkles,
  Share2,
  Download,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import type { Campaign, Branch } from '../types';

interface CampaignPreviewProps {
  campaign: Partial<Campaign>;
  selectedBranches: Branch[];
  creatives: Array<{
    id: string;
    name: string;
    type: 'image' | 'video';
    url: string;
    width: number;
    height: number;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: () => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';
type PreviewMode = 'creative' | 'targeting' | 'summary';

const CampaignPreview = ({
  campaign,
  selectedBranches,
  creatives,
  isOpen,
  onClose,
  onLaunch
}: CampaignPreviewProps) => {
  const [activeDevice, setActiveDevice] = useState<DeviceType>('desktop');
  const [activeCreativeIndex, setActiveCreativeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('creative');
  const [zoom, setZoom] = useState(100);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Auto-rotate creatives
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && creatives.length > 1) {
      interval = setInterval(() => {
        setActiveCreativeIndex(prev => (prev + 1) % creatives.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, creatives.length]);

  // Validate campaign on open
  useEffect(() => {
    if (isOpen) {
      validateCampaign();
    }
  }, [isOpen, campaign, selectedBranches, creatives]);

  const validateCampaign = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field checks
    if (!campaign.name?.trim()) errors.push('Kampanjan nimi puuttuu');
    if (!campaign.start_date) errors.push('Aloituspäivä puuttuu');
    if (!campaign.end_date) errors.push('Lopetuspäivä puuttuu');
    if (!campaign.budget || campaign.budget <= 0) errors.push('Budjetti puuttuu tai on virheellinen');
    if (selectedBranches.length === 0) errors.push('Valitse vähintään yksi piste');
    if (creatives.length === 0) errors.push('Lisää vähintään yksi mainos');

    // Warning checks
    if (campaign.budget && campaign.budget < 500) {
      warnings.push('Pieni budjetti voi rajoittaa näkyvyyttä');
    }
    
    const startDate = new Date(campaign.start_date || '');
    const endDate = new Date(campaign.end_date || '');
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (duration < 7) {
      warnings.push('Lyhyt kampanja-aika (alle viikko) voi heikentää tuloksia');
    }
    
    if (duration > 60) {
      warnings.push('Pitkä kampanja-aika - harkitse jakamista osiin');
    }

    if (creatives.length === 1) {
      warnings.push('Suosittelemme useamman mainoksen käyttöä A/B-testaukseen');
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);
  };

  const getDeviceFrame = () => {
    switch (activeDevice) {
      case 'desktop':
        return { width: 1200, height: 800, scale: zoom / 100 * 0.6 };
      case 'tablet':
        return { width: 768, height: 1024, scale: zoom / 100 * 0.5 };
      case 'mobile':
        return { width: 375, height: 667, scale: zoom / 100 * 0.8 };
    }
  };

  const estimateReach = () => {
    // Simple estimation based on budget and branches
    const baseReach = (campaign.budget || 0) * 10;
    const branchMultiplier = Math.max(1, selectedBranches.length * 0.8);
    const durationMultiplier = 1; // Would calculate from dates
    return Math.round(baseReach * branchMultiplier * durationMultiplier);
  };

  const estimateClicks = () => {
    const reach = estimateReach();
    return Math.round(reach * 0.02); // 2% CTR estimate
  };

  if (!isOpen) return null;

  const deviceFrame = getDeviceFrame();
  const activeCreative = creatives[activeCreativeIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-[#00A5B5] to-[#1B365D] rounded-lg">
              <Eye className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Kampanjan esikatselu
              </h2>
              <p className="text-sm text-gray-500">
                {campaign.name || 'Nimetön kampanja'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview mode tabs */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {[
                { id: 'creative', label: 'Mainokset' },
                { id: 'targeting', label: 'Kohdistus' },
                { id: 'summary', label: 'Yhteenveto' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setPreviewMode(mode.id as PreviewMode)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    previewMode === mode.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Main Preview Area */}
          <div className="flex-1 bg-gray-100 p-6 overflow-auto">
            {previewMode === 'creative' && (
              <div className="h-full flex flex-col">
                {/* Device Selector */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  {[
                    { id: 'desktop', icon: Monitor, label: 'Työpöytä' },
                    { id: 'tablet', icon: Tablet, label: 'Tabletti' },
                    { id: 'mobile', icon: Smartphone, label: 'Mobiili' }
                  ].map(device => (
                    <button
                      key={device.id}
                      onClick={() => setActiveDevice(device.id as DeviceType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        activeDevice === device.id
                          ? 'bg-[#00A5B5] text-white shadow-lg'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <device.icon size={18} />
                      <span className="text-sm font-medium">{device.label}</span>
                    </button>
                  ))}

                  <div className="ml-4 flex items-center gap-2 bg-white rounded-lg px-3 py-1">
                    <button
                      onClick={() => setZoom(Math.max(50, zoom - 10))}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
                    <button
                      onClick={() => setZoom(Math.min(150, zoom + 10))}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Device Frame */}
                {creatives.length > 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div 
                      className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
                      style={{
                        width: deviceFrame.width * deviceFrame.scale,
                        height: deviceFrame.height * deviceFrame.scale,
                      }}
                    >
                      {/* Device chrome */}
                      <div className="bg-gray-800 h-8 flex items-center px-3 gap-2">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500" />
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="flex-1 mx-4">
                          <div className="bg-gray-700 rounded-full h-5 flex items-center px-3">
                            <span className="text-xs text-gray-400 truncate">
                              bidtheatre.com/ad/{campaign.id || 'preview'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content area */}
                      <div className="relative" style={{ height: `calc(100% - 32px)` }}>
                        {activeCreative.type === 'video' ? (
                          <video
                            src={activeCreative.url}
                            className="w-full h-full object-contain bg-black"
                            autoPlay
                            muted
                            loop
                          />
                        ) : (
                          <img
                            src={activeCreative.url}
                            alt={activeCreative.name}
                            className="w-full h-full object-contain"
                          />
                        )}
                        
                        {/* Ad badge */}
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                          Mainos
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Eye size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Ei mainoksia esikatseluun</p>
                    </div>
                  </div>
                )}

                {/* Creative Selector */}
                {creatives.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setActiveCreativeIndex(prev => (prev - 1 + creatives.length) % creatives.length)}
                      className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>

                    <div className="flex items-center gap-2">
                      {creatives.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveCreativeIndex(idx)}
                          className={`w-3 h-3 rounded-full transition-all ${
                            idx === activeCreativeIndex
                              ? 'bg-[#00A5B5] scale-125'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-2 rounded-lg shadow transition-colors ${
                        isPlaying ? 'bg-[#00A5B5] text-white' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <button
                      onClick={() => setActiveCreativeIndex(prev => (prev + 1) % creatives.length)}
                      className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {previewMode === 'targeting' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Kohdistusalueet</h3>
                
                {/* Map placeholder */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                      <p>Karttanäkymä - {selectedBranches.length} pistettä valittu</p>
                    </div>
                  </div>
                </div>

                {/* Branch list */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-3">Valitut pisteet</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedBranches.map(branch => (
                      <div
                        key={branch.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                      >
                        <MapPin size={14} className="text-[#00A5B5]" />
                        <span className="text-sm text-gray-700 truncate">{branch.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {previewMode === 'summary' && (
              <div className="space-y-4">
                {/* Validation Status */}
                <div className={`p-4 rounded-xl ${
                  validationErrors.length > 0 
                    ? 'bg-red-50 border border-red-200' 
                    : validationWarnings.length > 0
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {validationErrors.length > 0 ? (
                      <AlertTriangle className="text-red-500" size={20} />
                    ) : validationWarnings.length > 0 ? (
                      <AlertTriangle className="text-yellow-500" size={20} />
                    ) : (
                      <Check className="text-green-500" size={20} />
                    )}
                    <h4 className="font-medium">
                      {validationErrors.length > 0 
                        ? 'Korjaa virheet ennen julkaisua' 
                        : validationWarnings.length > 0
                          ? 'Kampanja on valmis, mutta huomioi varoitukset'
                          : 'Kampanja on valmis julkaistavaksi!'}
                    </h4>
                  </div>
                  
                  {validationErrors.length > 0 && (
                    <ul className="text-sm text-red-700 space-y-1 ml-8">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  )}
                  
                  {validationWarnings.length > 0 && (
                    <ul className="text-sm text-yellow-700 space-y-1 ml-8 mt-2">
                      {validationWarnings.map((warning, idx) => (
                        <li key={idx}>• {warning}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Campaign Summary */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Kampanjan tiedot</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500">Nimi</label>
                        <p className="font-medium text-gray-900">{campaign.name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Aikataulu</label>
                        <p className="font-medium text-gray-900">
                          {campaign.start_date && campaign.end_date 
                            ? `${new Date(campaign.start_date).toLocaleDateString('fi')} - ${new Date(campaign.end_date).toLocaleDateString('fi')}`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Budjetti</label>
                        <p className="font-medium text-gray-900">
                          {campaign.budget ? `${campaign.budget.toLocaleString('fi')} €` : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-500">Pisteet</label>
                        <p className="font-medium text-gray-900">{selectedBranches.length} kpl</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Mainokset</label>
                        <p className="font-medium text-gray-900">{creatives.length} kpl</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-500">Tyyppi</label>
                        <p className="font-medium text-gray-900 capitalize">{campaign.type || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estimated Performance */}
                <div className="bg-gradient-to-br from-[#00A5B5]/5 to-[#1B365D]/5 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-[#00A5B5]" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Arvioitu suorituskyky</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Users className="mx-auto text-[#00A5B5] mb-2" size={24} />
                      <p className="text-2xl font-bold text-gray-900">
                        {estimateReach().toLocaleString('fi')}
                      </p>
                      <p className="text-sm text-gray-500">Arvioitu tavoittavuus</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <Target className="mx-auto text-purple-500 mb-2" size={24} />
                      <p className="text-2xl font-bold text-gray-900">
                        {estimateClicks().toLocaleString('fi')}
                      </p>
                      <p className="text-sm text-gray-500">Arvioitu klikkaukset</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
                      <p className="text-2xl font-bold text-gray-900">2.0%</p>
                      <p className="text-sm text-gray-500">Arvioitu CTR</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    * Arviot perustuvat historialliseen dataan ja saattavat vaihdella
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-white p-4 overflow-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Mainokset ({creatives.length})</h3>
            
            <div className="space-y-3">
              {creatives.map((creative, idx) => (
                <button
                  key={creative.id}
                  onClick={() => {
                    setActiveCreativeIndex(idx);
                    setPreviewMode('creative');
                  }}
                  className={`w-full p-2 rounded-lg border transition-all text-left ${
                    idx === activeCreativeIndex && previewMode === 'creative'
                      ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="aspect-video bg-gray-100 rounded overflow-hidden mb-2">
                    {creative.type === 'video' ? (
                      <video src={creative.url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={creative.url} alt={creative.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{creative.name}</p>
                  <p className="text-xs text-gray-500">{creative.width} x {creative.height}</p>
                </button>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Pikakatsaus</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Budjetti</span>
                  <span className="text-sm font-medium">
                    {campaign.budget?.toLocaleString('fi')} €
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Kesto</span>
                  <span className="text-sm font-medium">
                    {campaign.start_date && campaign.end_date
                      ? `${Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))} pv`
                      : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Pisteet</span>
                  <span className="text-sm font-medium">{selectedBranches.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Share2 size={18} />
              Jaa
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Download size={18} />
              Lataa PDF
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Sulje
            </button>
            <button
              onClick={onLaunch}
              disabled={validationErrors.length > 0}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all btn-press ${
                validationErrors.length > 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#00A5B5] to-[#1B365D] text-white hover:shadow-lg'
              }`}
            >
              <Play size={18} />
              Julkaise kampanja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignPreview;
