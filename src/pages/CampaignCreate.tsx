// ============================================================================
// SUUN TERVEYSTALO - Campaign Creation Wizard V2
// Complete redesign with dynamic budget allocation and map integration
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../lib/campaignService';
import { getCreativeTemplates, renderTemplateHtml } from '../lib/creativeService';
import { countScreensInRadius, MediaScreen } from '../lib/mediaScreensService';
import { useStore } from '../lib/store';
import { getBudgetPresets } from '../lib/settingsService';
import { loader } from '../lib/googleMapsLoader';
import type { Service, Branch, CampaignFormData, CreativeType, AdType, PricingOption, CreativeTemplate } from '../types';
import { format, addDays, addWeeks, differenceInDays } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Tv,
  Calendar,
  Euro,
  Palette,
  Sparkles,
  Target,
  Layers,
  Search,
  Map,
  Volume2,
  Instagram,
  Globe,
  Monitor,
  AlertCircle,
  ImageIcon,
  Type,
  Upload,
  RefreshCw,
  Square,
  RectangleVertical,
  RectangleHorizontal,
  Smartphone,
  Users,
  X,
  TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isDemoMode, addDemoCreatedCampaign } from '../lib/demoService';
import { DemoBanner } from '../components/DemoTooltip';
import { AgeRangeSelector } from '../components/AgeRangeSelector';
import { GenderSelector } from '../components/GenderSelector';
import { BudgetCard } from '../components/BudgetCard';
import { AutoExpandTextarea } from '../components/AutoExpandTextarea';

// Custom Tooth Icon Component
const ToothIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2C9.5 2 7.5 3.5 7 5.5C6.5 7.5 6 8.5 5.5 10C4.5 13 5 14.5 5.5 16C6 17.5 6.5 22 8.5 22C10 22 10 19 10.5 17C11 15 11.5 14 12 14C12.5 14 13 15 13.5 17C14 19 14 22 15.5 22C17.5 22 18 17.5 18.5 16C19 14.5 19.5 13 18.5 10C18 8.5 17.5 7.5 17 5.5C16.5 3.5 14.5 2 12 2Z" />
  </svg>
);

// ============================================================================
// TYPES
// ============================================================================

interface ScreenInfo {
  total: number;
  byType: Record<string, number>;
  screens: MediaScreen[];
  suggestedBudget: number;
}

interface CreativeConfig {
  headline: string;
  subheadline: string;
  offer: string;
  offerTitle: string;
  offerDate: string;
  cta: string;
  backgroundImage: string | null;
  useCustomBackground: boolean;
  priceBubbleMode: 'price' | 'no-price' | 'both';
  targetUrl: string;
  audioFile: File | null;
  disclaimerText: string;
  generalBrandMessage: string; // Yleinen brändiviesti
}

// Preview size options
interface PreviewSize {
  id: string;
  name: string;
  width: number;
  height: number;
  icon: React.ElementType;
  label: string;
  category: 'Display' | 'PDOOH' | 'Meta';
}

const PREVIEW_SIZES: PreviewSize[] = [
  // Display
  { id: '300x300', name: '300×300', width: 300, height: 300, icon: Square, label: 'Neliö', category: 'Display' },
  { id: '300x431', name: '300×431', width: 300, height: 431, icon: RectangleVertical, label: 'Pysty', category: 'Display' },
  { id: '300x600', name: '300×600', width: 300, height: 600, icon: RectangleVertical, label: 'Half-page', category: 'Display' },
  { id: '620x891', name: '620×891', width: 620, height: 891, icon: RectangleVertical, label: 'Iso pysty', category: 'Display' },
  // Display (horizontal)
  { id: '980x400', name: '980×400', width: 980, height: 400, icon: RectangleHorizontal, label: 'Vaaka', category: 'Display' },
  // PDOOH
  { id: '1080x1920', name: '1080×1920', width: 1080, height: 1920, icon: Smartphone, label: 'Pysty', category: 'PDOOH' },
  // Meta (under development)
  { id: '1080x1080', name: '1080×1080', width: 1080, height: 1080, icon: Instagram, label: 'Feed', category: 'Meta' },
  { id: '1080x1920-meta', name: '1080×1920', width: 1080, height: 1920, icon: Smartphone, label: 'Stories/Reels', category: 'Meta' },
];

const PREVIEW_SIZE_CATEGORIES = [
  { key: 'Display' as const, label: 'Display', icon: Monitor },
  { key: 'PDOOH' as const, label: 'PDOOH', icon: Tv },
  { key: 'Meta' as const, label: 'Meta (tulossa)', icon: Instagram },
] as const;

// ============================================================================
// STEP INDICATOR COMPONENT
// ============================================================================

interface StepIndicatorProps {
  currentStep: number;
  steps: { name: string; icon: React.ElementType }[];
  onStepClick: (step: number) => void;
  completedSteps: number[];
}

const StepIndicator = ({ currentStep, steps, onStepClick, completedSteps }: StepIndicatorProps) => (
  <div className="flex items-center justify-between mb-8 px-4">
    {steps.map((step, index) => {
      const Icon = step.icon;
      const isCompleted = completedSteps.includes(index);
      const isCurrent = index === currentStep;
      const isClickable = isCompleted || index <= Math.max(...completedSteps, 0) + 1;
      
      return (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          <button
            onClick={() => isClickable && onStepClick(index)}
            disabled={!isClickable}
            className={`group flex flex-col items-center transition-all ${
              isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl font-medium transition-all duration-300 ${
              isCurrent 
                ? 'bg-gradient-to-br from-[#00A5B5] to-[#1B365D] text-white shadow-lg shadow-[#00A5B5]/30 scale-110' 
                : isCompleted
                  ? 'bg-[#00A5B5] text-white'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
            }`}>
              {isCompleted && !isCurrent ? (
                <Check size={20} strokeWidth={3} />
              ) : (
                <Icon size={20} />
              )}
              {isCurrent && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                  <span className="w-2 h-2 bg-[#00A5B5] rounded-full animate-pulse" />
                </span>
              )}
            </div>
            <span className={`mt-2 text-xs font-medium transition-colors ${
              isCurrent ? 'text-[#00A5B5]' : isCompleted ? 'text-gray-700' : 'text-gray-400'
            }`}>
              {step.name}
            </span>
          </button>
          
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-3 rounded transition-colors ${
              isCompleted ? 'bg-[#00A5B5]' : 'bg-gray-200'
            }`} />
          )}
        </div>
      );
    })}
  </div>
);

// ============================================================================
// SERVICE CARD COMPONENT
// ============================================================================

interface ServiceCardProps {
  service: Service;
  selected: boolean;
  onClick: () => void;
}

const ServiceCard = ({ service, selected, onClick }: ServiceCardProps) => {
  // Use name_fi as primary, fallback to name
  const serviceName = service.name_fi || service.name || 'Nimetön palvelu';
  const serviceDesc = service.description_fi || service.description;
  const servicePrice = service.default_price || (service.price ? `${service.price}€` : null);
  const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti';

  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden p-6 rounded-2xl border-2 text-left transition-all duration-300 transform hover:scale-[1.02] ${
        selected
          ? 'border-[#00A5B5] bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/5 shadow-lg shadow-[#00A5B5]/20'
          : 'border-gray-200 hover:border-[#00A5B5]/50 hover:shadow-md bg-white'
      }`}
    >
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full transform translate-x-16 -translate-y-16 transition-colors ${
        selected ? 'bg-[#00A5B5]/10' : 'bg-gray-50'
      }`} />

      <div className="relative flex items-start space-x-4">
        <div className={`p-4 rounded-xl transition-colors ${
          selected
            ? 'bg-gradient-to-br from-[#00A5B5] to-[#1B365D] text-white shadow-lg'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {isGeneralBrandMessage ? <TrendingUp size={28} /> : <ToothIcon size={28} />}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-lg font-semibold text-gray-900">
            {serviceName}
          </h4>
          {serviceDesc && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{serviceDesc}</p>
          )}
          <div className="flex items-center mt-3 space-x-4">
            {servicePrice && !isGeneralBrandMessage && (
              <span className={`text-lg font-bold ${selected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>
                {servicePrice}
              </span>
            )}
            {isGeneralBrandMessage && selected && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Ei hintaa
              </span>
            )}
            {service.duration_minutes !== undefined && service.duration_minutes !== null && (
              <span className="text-sm text-gray-400">
                {service.duration_minutes} min
              </span>
            )}
          </div>
        </div>

        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          selected
            ? 'border-[#00A5B5] bg-[#00A5B5]'
            : 'border-gray-300'
        }`}>
          {selected && <Check size={14} className="text-white" strokeWidth={3} />}
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// BRANCH CARD COMPONENT
// ============================================================================

interface BranchCardProps {
  branch: Branch;
  selected: boolean;
  onClick: () => void;
}

const BranchCard = ({ branch, selected, onClick }: BranchCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
      selected 
        ? 'border-[#00A5B5] bg-[#00A5B5]/5 shadow-md' 
        : 'border-gray-200 hover:border-[#00A5B5]/30 hover:bg-gray-50'
    }`}
  >
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg transition-colors ${
        selected ? 'bg-[#00A5B5] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        <MapPin size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{branch.name}</h4>
        <p className="text-sm text-gray-500 truncate">{branch.address}</p>
        <p className="text-sm text-gray-400">{branch.postal_code} {branch.city}</p>
      </div>
      {selected && (
        <div className="w-5 h-5 rounded-full bg-[#00A5B5] flex items-center justify-center">
          <Check size={12} className="text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  </button>
);

// ============================================================================
// CHANNEL CARD COMPONENT
// ============================================================================

interface ChannelCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  enabled: boolean;
  budget: number;
  percentage: number;
  totalBudget: number;
  onToggle: () => void;
  onBudgetChange: (value: number) => void;
  suggestion?: string;
}

const ChannelCard = ({ 
  name, description, icon: Icon, color, 
  enabled, budget, percentage, totalBudget,
  onToggle, onBudgetChange, suggestion 
}: ChannelCardProps) => (
  <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
    enabled 
      ? 'shadow-lg' 
      : 'border-gray-200 bg-gray-50 opacity-60'
  }`} style={{ borderColor: enabled ? color : undefined }}>
    {/* Header */}
    <div 
      className="p-4 cursor-pointer flex items-center justify-between"
      onClick={onToggle}
    >
      <div className="flex items-center space-x-3">
        <div 
          className={`p-3 rounded-xl transition-colors ${enabled ? 'text-white' : 'bg-gray-200 text-gray-500'}`}
          style={{ backgroundColor: enabled ? color : undefined }}
        >
          <Icon size={24} />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      
      <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
        enabled ? 'bg-[#00A5B5]' : 'bg-gray-300'
      }`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-0'
        }`} />
      </div>
    </div>
    
    {/* Budget slider - only shown when enabled */}
    {enabled && (
      <div className="px-4 pb-4 space-y-3">
        {suggestion && (
          <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-2">
            <AlertCircle size={14} />
            <span>{suggestion}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Budjetti</span>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold" style={{ color }}>{budget.toLocaleString('fi-FI')}€</span>
            <span className="text-sm text-gray-400">({percentage}%)</span>
          </div>
        </div>
        
        <input
          type="range"
          min={0}
          max={totalBudget}
          step={50}
          value={budget}
          onChange={(e) => onBudgetChange(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${percentage}%, #e5e7eb ${percentage}%)`
          }}
        />
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>0€</span>
          <span>{totalBudget.toLocaleString('fi-FI')}€</span>
        </div>
      </div>
    )}
  </div>
);

// ============================================================================
// CREATIVE TYPE CARD COMPONENT
// ============================================================================

interface CreativeTypeCardProps {
  type: CreativeType;
  name: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
  weight?: number;
  onWeightChange?: (weight: number) => void;
  showWeight?: boolean;
}

const CreativeTypeCard = ({ 
  name, description, icon: Icon, 
  selected, onClick, weight, onWeightChange, showWeight 
}: CreativeTypeCardProps) => (
  <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
    selected 
      ? 'border-[#00A5B5] bg-[#00A5B5]/5 shadow-lg' 
      : 'border-gray-200 hover:border-[#00A5B5]/30'
  }`}>
    <button onClick={onClick} className="w-full p-5 text-left">
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-xl ${selected ? 'bg-[#00A5B5] text-white' : 'bg-gray-100 text-gray-500'}`}>
          <Icon size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{name}</h4>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-[#00A5B5] bg-[#00A5B5]' : 'border-gray-300'
        }`}>
          {selected && <Check size={14} className="text-white" />}
        </div>
      </div>
    </button>
    
    {selected && showWeight && onWeightChange && (
      <div className="px-5 pb-5 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Painotus</span>
          <span className="text-sm font-bold text-[#00A5B5]">{weight}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={weight}
          onChange={(e) => onWeightChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00A5B5]"
        />
      </div>
    )}
  </div>
);

// ============================================================================
// MAP COMPONENT
// ============================================================================

interface MapComponentProps {
  center: { lat: number; lng: number };
  radius: number;
  screens: MediaScreen[];
  onRadiusChange: (radius: number) => void;
}

const MapComponent = ({ center, radius, screens, onRadiusChange }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleRef = useRef<any>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;
      
      try {
        const google = await loader.load();
        googleRef.current = google;
        
        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        
        mapInstanceRef.current = map;
        
        // Add branch marker (teal color for the clinic)
        new google.maps.Marker({
          position: center,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: '#00A5B5',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
          title: 'Toimipiste',
          zIndex: 1000
        });
        
        // Add radius circle
        const circle = new google.maps.Circle({
          map,
          center,
          radius: radius * 1000,
          fillColor: '#00A5B5',
          fillOpacity: 0.1,
          strokeColor: '#00A5B5',
          strokeWeight: 2,
          strokeOpacity: 0.8
        });
        
        circleRef.current = circle;
        
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  // Update circle radius
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius * 1000);
      
      // Adjust zoom based on radius
      if (mapInstanceRef.current) {
        const zoom = radius > 30 ? 9 : radius > 15 ? 10 : radius > 5 ? 11 : 12;
        mapInstanceRef.current.setZoom(zoom);
      }
    }
  }, [radius]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-inner">
      <div ref={mapRef} className="w-full h-80" />
      
      {/* Radius control overlay */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Kohdistussäde</span>
          <span className="text-lg font-bold text-[#00A5B5]">{radius} km</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={radius}
          onChange={(e) => onRadiusChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00A5B5]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 km</span>
          <span>50 km</span>
        </div>
      </div>
      
      {/* Screen count badge */}
      <div className="absolute top-4 right-4 bg-[#1B365D] text-white px-3 py-2 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <Monitor size={16} />
          <span className="font-bold">{screens.length}</span>
          <span className="text-sm opacity-80">näyttöä</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// BACKGROUND IMAGES - From refs
// ============================================================================

const backgroundImages = [
  { id: 'mies', name: 'Mies', url: '/refs/assets/mies.jpg' },
  { id: 'nainen', name: 'Nainen', url: '/refs/assets/nainen.jpg' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CampaignCreate = () => {
  const navigate = useNavigate();
  const { services, branches, user } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [_loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Screen info
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>({
    total: 0,
    byType: {},
    screens: [],
    suggestedBudget: 0
  });
  const [loadingScreens, setLoadingScreens] = useState(false);

  // Budget presets from settings
  const [budgetPresets, setBudgetPresets] = useState<number[]>([]);
  const [customBudget, setCustomBudget] = useState<number | undefined>(undefined);
  const [selectedBudget, setSelectedBudget] = useState<number | undefined>(undefined);

  // Database creative templates
  const [dbTemplates, setDbTemplates] = useState<CreativeTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Load budget presets and templates on mount
  useEffect(() => {
    getBudgetPresets().then(setBudgetPresets).catch(console.error);
    // Load active templates from database
    setTemplatesLoading(true);
    getCreativeTemplates({ active: true })
      .then(setDbTemplates)
      .catch(console.error)
      .finally(() => setTemplatesLoading(false));
  }, []);

  // Form data
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    service_id: '',
    branch_id: '',
    campaign_address: '',
    campaign_postal_code: '',
    campaign_city: '',
    campaign_radius: 10,
    campaign_coordinates: { lat: 60.1699, lng: 24.9384 },
    creative_type: 'both',
    creative_weight_nationwide: 50,
    creative_weight_local: 50,
    start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd'),
    total_budget: 0,
    channel_meta: true,
    channel_display: true,
    channel_pdooh: true,
    channel_audio: false,
    budget_meta: 500,
    budget_display: 500,
    budget_pdooh: 800,
    budget_audio: 200,
    headline: '',
    offer_text: '',
    cta_text: 'Varaa aika',
    background_image_url: undefined,
    description: '',
    // New fields for campaign creation
    ad_type: undefined,
    target_age_min: 18,
    target_age_max: 80,
    target_genders: ['all'],
    campaign_objective: 'traffic',
    is_ongoing: false
  });

  // Creative config
  const [creativeConfig, setCreativeConfig] = useState<CreativeConfig>({
    headline: '',
    subheadline: '',
    offer: '49',
    offerTitle: 'Hammas-<br/>tarkastus',
    offerDate: 'Varaa viimeistään<br/>28.10.',
    cta: 'Varaa aika',
    backgroundImage: null,
    useCustomBackground: false,
    priceBubbleMode: 'price',
    targetUrl: 'https://terveystalo.com/suunterveystalo',
    audioFile: null,
    disclaimerText: 'Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.',
    generalBrandMessage: 'Hymyile.<br>Olet hyvissä käsissä.'
  });

  // Sync ad_type choice with creative_type
  useEffect(() => {
    if (formData.ad_type) {
      setFormData(prev => ({ ...prev, creative_type: formData.ad_type as CreativeType }));
    }
  }, [formData.ad_type]);

  // Preview size state
  const [previewSize, setPreviewSize] = useState<PreviewSize>(PREVIEW_SIZES[2]); // Default to 300x600

  // Auto-set budget to 50% of remaining branch budget when branch is selected
  useEffect(() => {
    if (selectedBranch?.budget && formData.total_budget === 0) {
      const remaining = (selectedBranch.budget.allocated_budget || 0) - (selectedBranch.budget.used_budget || 0);
      const defaultBudget = Math.round(remaining * 0.5);
      if (defaultBudget > 0) {
        updateTotalBudget(defaultBudget);
      }
    }
  }, [formData.branch_id]);

  // Filter active items
  const activeServices = services.filter(s => s.active);
  const activeBranches = branches.filter(b => b.active);

  // Filtered branches based on search
  const filteredBranches = activeBranches.filter(branch => 
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    branch.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const steps = [
    { name: 'Palvelu ja tyyppi', icon: ToothIcon },
    { name: 'Toimipiste', icon: MapPin },
    { name: 'Kohderyhmä', icon: Users },
    { name: 'Budjetti', icon: Euro },
    { name: 'Sisältö', icon: Palette },
    { name: 'Yhteenveto', icon: Check },
  ];

  // Get selected items
  const selectedService = services.find(s => s.id === formData.service_id);
  const selectedBranch = branches.find(b => b.id === formData.branch_id);
  
  // Helper to get service name (handles name_fi vs name)
  const getServiceName = (service: Service | undefined) => 
    service?.name_fi || service?.name || 'Palvelu';

  // Calculate campaign duration
  const campaignDays = Math.max(1, differenceInDays(
    new Date(formData.end_date),
    new Date(formData.start_date)
  ));

  // Calculate enabled channels budget total
  const enabledChannelsBudget = 
    (formData.channel_meta ? formData.budget_meta : 0) +
    (formData.channel_display ? formData.budget_display : 0) +
    (formData.channel_pdooh ? formData.budget_pdooh : 0) +
    (formData.channel_audio ? formData.budget_audio : 0);

  // Load screens when branch or radius changes
  useEffect(() => {
    if (selectedBranch && currentStep >= 2) {
      loadScreens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, formData.campaign_radius, currentStep]);

  const loadScreens = async () => {
    if (!selectedBranch) return;
    
    const lat = selectedBranch.coordinates?.lat || selectedBranch.latitude || 0;
    const lng = selectedBranch.coordinates?.lng || selectedBranch.longitude || 0;
    
    console.log('Loading screens for branch:', selectedBranch.name, 'at', lat, lng);
    
    if (!lat || !lng) {
      toast.error('Toimipisteen koordinaatit puuttuvat');
      return;
    }
    
    setLoadingScreens(true);
    
    try {
      const result = await countScreensInRadius(lat, lng, formData.campaign_radius * 1000);
      
      console.log('Screens loaded:', result.total, 'screens, with coords:', result.screensInRadius.filter(s => s.latitude && s.longitude).length);
      
      // Calculate suggested PDOOH budget as percentage of total budget
      // Base recommendation: 30-40% of total budget for PDOOH when screens are available
      // Scale based on screen density: more screens = higher percentage (up to 40%)
      const screenDensityFactor = Math.min(result.total / 50, 1); // Cap at 50 screens
      const basePercentage = 0.30; // 30% minimum
      const maxPercentage = 0.40; // 40% maximum
      const recommendedPercentage = basePercentage + (screenDensityFactor * (maxPercentage - basePercentage));
      const suggestedBudget = Math.round(formData.total_budget * recommendedPercentage);
      
      setScreenInfo({
        total: result.total,
        byType: result.byType,
        screens: result.screensInRadius,
        suggestedBudget: Math.max(suggestedBudget, 200)
      });
      
      // Update coordinates
      setFormData(prev => ({
        ...prev,
        campaign_coordinates: { lat, lng },
        campaign_address: selectedBranch.address,
        campaign_postal_code: selectedBranch.postal_code,
        campaign_city: selectedBranch.city
      }));
      
    } catch (error) {
      console.error('Error loading screens:', error);
      toast.error('Näyttöjen lataaminen epäonnistui');
    } finally {
      setLoadingScreens(false);
    }
  };

  // Budget rebalancing function
  const rebalanceBudgets = useCallback((changedChannel: string, newValue: number) => {
    const enabledChannels = [
      formData.channel_meta && 'meta',
      formData.channel_display && 'display',
      formData.channel_pdooh && 'pdooh',
      formData.channel_audio && 'audio'
    ].filter(Boolean) as string[];

    if (enabledChannels.length <= 1) return;

    const totalBudget = formData.total_budget;
    const otherChannels = enabledChannels.filter(c => c !== changedChannel);
    const remaining = totalBudget - newValue;
    const perChannel = Math.round(remaining / otherChannels.length);

    const newBudgets: Partial<CampaignFormData> = {};
    
    if (changedChannel === 'meta') newBudgets.budget_meta = newValue;
    else if (formData.channel_meta) newBudgets.budget_meta = perChannel;
    
    if (changedChannel === 'display') newBudgets.budget_display = newValue;
    else if (formData.channel_display) newBudgets.budget_display = perChannel;
    
    if (changedChannel === 'pdooh') newBudgets.budget_pdooh = newValue;
    else if (formData.channel_pdooh) newBudgets.budget_pdooh = perChannel;
    
    if (changedChannel === 'audio') newBudgets.budget_audio = newValue;
    else if (formData.channel_audio) newBudgets.budget_audio = perChannel;

    setFormData(prev => ({ ...prev, ...newBudgets }));
  }, [formData]);

  // Toggle channel
  const toggleChannel = (channel: 'meta' | 'display' | 'pdooh' | 'audio') => {
    const channelKey = `channel_${channel}` as keyof CampaignFormData;
    const newEnabled = !formData[channelKey];
    
    setFormData(prev => {
      const updated = { ...prev, [channelKey]: newEnabled };
      
      // Rebalance budgets when toggling
      const enabledChannels = [
        updated.channel_meta && 'meta',
        updated.channel_display && 'display',
        updated.channel_pdooh && 'pdooh',
        updated.channel_audio && 'audio'
      ].filter(Boolean) as string[];
      
      if (enabledChannels.length > 0) {
        const perChannel = Math.round(formData.total_budget / enabledChannels.length);
        
        if (enabledChannels.includes('meta')) updated.budget_meta = perChannel;
        if (enabledChannels.includes('display')) updated.budget_display = perChannel;
        if (enabledChannels.includes('pdooh')) updated.budget_pdooh = perChannel;
        if (enabledChannels.includes('audio')) updated.budget_audio = perChannel;
      }
      
      return updated;
    });
  };

  // Update total budget and rebalance
  const updateTotalBudget = (newTotal: number) => {
    const enabledChannels = [
      formData.channel_meta && 'meta',
      formData.channel_display && 'display',
      formData.channel_pdooh && 'pdooh',
      formData.channel_audio && 'audio'
    ].filter(Boolean) as string[];

    const perChannel = Math.round(newTotal / Math.max(1, enabledChannels.length));

    setFormData(prev => ({
      ...prev,
      total_budget: newTotal,
      budget_meta: enabledChannels.includes('meta') ? perChannel : 0,
      budget_display: enabledChannels.includes('display') ? perChannel : 0,
      budget_pdooh: enabledChannels.includes('pdooh') ? perChannel : 0,
      budget_audio: enabledChannels.includes('audio') ? perChannel : 0,
    }));
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.service_id) {
          toast.error('Valitse palvelu');
          return false;
        }
        if (!formData.ad_type) {
          toast.error('Valitse mainonnan tyyppi');
          return false;
        }
        break;
      case 1:
        if (!formData.branch_id) {
          toast.error('Valitse toimipiste');
          return false;
        }
        break;
      case 2:
        if (formData.campaign_radius < 1) {
          toast.error('Säteen tulee olla vähintään 1 km');
          return false;
        }
        break;
      case 3:
        if (!formData.start_date) {
          toast.error('Valitse kampanjan alkamispäivä');
          return false;
        }
        if (!formData.is_ongoing && !formData.end_date) {
          toast.error('Valitse päättymispäivä tai aseta jatkuva kampanja');
          return false;
        }
        if (!formData.is_ongoing && formData.end_date <= formData.start_date) {
          toast.error('Päättymispäivän tulee olla alkamispäivän jälkeen');
          return false;
        }
        if (formData.total_budget < 100) {
          toast.error('Minimibudjetti on 100€');
          return false;
        }
        if (!formData.channel_meta && !formData.channel_display && !formData.channel_pdooh && !formData.channel_audio) {
          toast.error('Valitse vähintään yksi kanava');
          return false;
        }
        break;
      case 4:
        break;
      case 5:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep || completedSteps.includes(step - 1) || step === 0) {
      setCurrentStep(step);
    }
  };

  // Find the database template matching the current preview size
  const getTemplateForSize = useCallback((sizeId: string): CreativeTemplate | undefined => {
    // Handle Meta sizes that have a suffix (e.g. '1080x1920-meta' -> look for type='meta' + size='1080x1920')
    if (sizeId.endsWith('-meta')) {
      const baseSize = sizeId.replace('-meta', '');
      return dbTemplates.find(t => t.size === baseSize && t.type === 'meta');
    }
    // For non-meta, find active templates matching the size (excludes meta type to avoid collision)
    return dbTemplates.find(t => t.size === sizeId && t.type !== 'meta' && t.active);
  }, [dbTemplates]);

  // Build template variables from creativeConfig + branch data
  const buildTemplateVariables = useCallback((showAddress: boolean): Record<string, string> => {
    const baseUrl = window.location.origin;
    const isGeneralBrandMessage = selectedService?.code === 'yleinen-brandiviesti';

    return {
      headline: creativeConfig.generalBrandMessage || 'Hymyile.<br>Olet hyvissä käsissä.',
      subheadline: (creativeConfig.subheadline || 'Sujuvampaa suunterveyttä.').replace(/\n/g, '<br>'),
      offer_title: isGeneralBrandMessage ? '' : (creativeConfig.offerTitle || 'Hammas-<br>tarkastus').replace(/\n/g, '<br>'),
      price: isGeneralBrandMessage ? '' : (creativeConfig.offer || '49'),
      offer_date: isGeneralBrandMessage ? '' : (creativeConfig.offerDate || 'Varaa viimeistään<br>28.10.').replace(/\n/g, '<br>'),
      cta_text: creativeConfig.cta || 'Varaa aika',
      branch_address: showAddress ? (selectedBranch?.address || 'Torikatu 1, Lahti') : '',
      image_url: creativeConfig.backgroundImage || `${baseUrl}/refs/assets/nainen.jpg`,
      artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork.png`,
      logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
      click_url: creativeConfig.targetUrl || 'https://terveystalo.com/suunterveystalo',
      disclaimer_text: creativeConfig.disclaimerText || '',
    };
  }, [creativeConfig, selectedBranch]);

  // Render preview template using database HTML templates in an iframe
  const renderPreviewTemplate = (showAddress: boolean) => {
    const template = getTemplateForSize(previewSize.id);
    
    if (!template) {
      // Fallback: no matching template in DB
      return (
        <div 
          className="flex items-center justify-center bg-gray-800 text-white rounded-xl"
          style={{ width: `${previewSize.width}px`, height: `${previewSize.height}px` }}
        >
          <div className="text-center p-8">
            <AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm opacity-70">
              {templatesLoading ? 'Ladataan mallipohjaa...' : `Mallipohjaa ei löydy koolle ${previewSize.id}`}
            </p>
          </div>
        </div>
      );
    }

    const variables = buildTemplateVariables(showAddress);
    
    // If price bubble is hidden, hide it via CSS override
    let renderedHtml = renderTemplateHtml(template, variables);
    
    if (creativeConfig.priceBubbleMode === 'no-price') {
      // Inject CSS to hide price bubble
      renderedHtml = renderedHtml.replace('</head>', '<style>.price-bubble { display: none !important; }</style></head>');
    }
    
    if (!showAddress) {
      // Inject CSS to hide address
      renderedHtml = renderedHtml.replace('</head>', '<style>.address { display: none !important; }</style></head>');
    }

    // Font URL rewriting is handled inside renderTemplateHtml()

    return (
      <iframe
        title={`Preview ${previewSize.id}`}
        srcDoc={renderedHtml}
        style={{
          width: `${previewSize.width}px`,
          height: `${previewSize.height}px`,
          border: 'none',
          overflow: 'hidden',
          borderRadius: '4px',
        }}
        sandbox="allow-same-origin allow-scripts"
        scrolling="no"
      />
    );
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    const isDemo = isDemoMode();
    setSaving(true);
    
    try {
      // Generate campaign name if empty
      const campaignName = formData.name || 
        `${getServiceName(selectedService)} - ${selectedBranch?.city} ${format(new Date(), 'MM/yyyy')}`;

      // Demo mode - simulate campaign creation
      if (isDemo) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create demo campaign object
        const demoCampaign = {
          id: `demo-created-${Date.now()}`,
          name: campaignName,
          status: 'active',
          service: getServiceName(selectedService),
          city: selectedBranch?.city || 'Helsinki',
          budget: formData.total_budget || 500,
          spent: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          startDate: formData.start_date,
          endDate: formData.end_date,
          created_at: new Date().toISOString()
        };
        
        // Save to demo created campaigns
        addDemoCreatedCampaign(demoCampaign);
        
        toast.success('🎉 Demo-kampanja luotu onnistuneesti!');
        navigate('/campaigns');
        return;
      }

      const campaign = await createCampaign({
        ...formData,
        name: campaignName,
        headline: creativeConfig.generalBrandMessage || 'Hymyile.<br>Olet hyvissä käsissä.',
        subheadline: creativeConfig.subheadline || 'Sujuvampaa suunterveyttä.',
        offer_text: creativeConfig.offer,
        cta_text: creativeConfig.cta,
        background_image_url: creativeConfig.backgroundImage || undefined,
        landing_url: creativeConfig.targetUrl || 'https://terveystalo.com/suunterveystalo',
        general_brand_message: creativeConfig.generalBrandMessage || 'Hymyile.<br>Olet hyvissä käsissä.',
      }, user?.id || '');

      if (campaign) {
        // Sheet sync now happens automatically inside createCampaign()
        toast.success('Kampanja luotu onnistuneesti!');
        navigate(`/campaigns/${campaign.id}`);
      } else {
        throw new Error('Campaign creation failed');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Kampanjan luominen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  if (_loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw size={48} className="mx-auto text-[#00A5B5] animate-spin mb-4" />
          <p className="text-gray-500">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-8">
      {/* Demo Banner */}
      {isDemoMode() && <DemoBanner message="Demo-tila: Kampanja luodaan vain simulaationa. Oikeassa tilissä kampanja lähetetään mediajärjestelmiin." />}
      
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Takaisin kampanjoihin
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Luo uusi kampanja</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Vaihe {currentStep + 1}/{steps.length} • {steps[currentStep].name}
            </p>
          </div>
          {selectedService && (
            <div className="hidden md:flex items-center space-x-2 bg-[#00A5B5]/10 text-[#00A5B5] px-4 py-2 rounded-full">
              <ToothIcon size={18} />
              <span className="font-medium">{getServiceName(selectedService)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator 
        currentStep={currentStep} 
        steps={steps} 
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
      />

      {/* Step Content */}
      <div className="card p-8 mb-6 min-h-[500px]">
        
        {/* =============================================================== */}
        {/* STEP 1: SERVICE SELECTION */}
        {/* =============================================================== */}
        {currentStep === 0 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <ToothIcon size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Palvelu ja tyyppi</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Valitse markkinoitava palvelu ja mainonnan tyyppi
              </p>
            </div>

            <div className="max-w-lg mx-auto">
              <div className="space-y-4">
                {activeServices.length > 0 ? (
                  activeServices.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={formData.service_id === service.id}
                      onClick={() => setFormData({ ...formData, service_id: service.id })}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Ei aktiivisia palveluita</p>
                  </div>
                )}
              </div>

              {/* Ad Type Selection */}
              <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Mainonnan tyyppi</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'nationwide' as const, label: 'Valtakunnallinen', icon: Globe },
                    { id: 'local' as const, label: 'Paikallinen', icon: MapPin }
                  ].map((type) => {
                    const TypeIcon = type.icon;
                    const isSelected = formData.ad_type === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, ad_type: type.id, creative_type: type.id });
                        }}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${
                          isSelected
                            ? 'border-[#00A5B5] bg-[#00A5B5]/10'
                            : 'border-gray-200 hover:border-[#00A5B5]/50'
                        }`}
                      >
                        <TypeIcon size={22} className={`mx-auto mb-2 ${isSelected ? 'text-[#00A5B5]' : 'text-gray-400'}`} />
                        <div className={`text-sm font-semibold ${isSelected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>{type.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 2: BRANCH SELECTION */}
        {/* =============================================================== */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <MapPin size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Valitse toimipiste</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Minkä toimipisteen {getServiceName(selectedService)?.toLowerCase() || 'palvelua'} markkinoidaan?
              </p>
            </div>

            {/* Search */}
            <div className="max-w-lg mx-auto mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Hae nimellä, kaupungilla tai osoitteella..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                />
              </div>
              <p className="text-sm text-gray-400 mt-2 text-center">
                {filteredBranches.length} toimipistettä
              </p>
            </div>
            
            {/* Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Toimipiste</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Osoite</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kaupunki</th>
                      <th className="w-16 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBranches.map(branch => (
                      <tr
                        key={branch.id}
                        onClick={() => setFormData({ ...formData, branch_id: branch.id })}
                        className={`cursor-pointer transition-colors ${
                          formData.branch_id === branch.id 
                            ? 'bg-[#00A5B5]/10' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              formData.branch_id === branch.id 
                                ? 'bg-[#00A5B5] text-white' 
                                : 'bg-gray-100 text-gray-400'
                            }`}>
                              <MapPin size={16} />
                            </div>
                            <span className="font-medium text-gray-900">{branch.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{branch.address}</td>
                        <td className="px-4 py-3 text-gray-500">{branch.city}</td>
                        <td className="px-4 py-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.branch_id === branch.id 
                              ? 'border-[#00A5B5] bg-[#00A5B5]' 
                              : 'border-gray-300'
                          }`}>
                            {formData.branch_id === branch.id && (
                              <Check size={12} className="text-white" strokeWidth={3} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {filteredBranches.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                <p>Ei hakutuloksia</p>
              </div>
            )}
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 3: AUDIENCE SELECTION */}
        {/* =============================================================== */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <Users size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Kohderyhmä</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Määritä ikäryhmä ja sukupuoli, joille haluat mainostaa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Map with screens */}
              <div className="lg:col-span-2">
                <MapComponent
                  center={formData.campaign_coordinates}
                  radius={formData.campaign_radius}
                  screens={screenInfo.screens}
                  onRadiusChange={(radius) => setFormData({ ...formData, campaign_radius: radius })}
                />
              </div>

              {/* Right: Screen info sidebar */}
              <div className="space-y-4">
                <div className="card p-5 bg-gradient-to-br from-[#1B365D] to-[#00A5B5] text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/80">DOOH-näytöt alueella</span>
                    {loadingScreens && <RefreshCw size={16} className="animate-spin" />}
                  </div>
                  <div className="text-4xl font-bold">{screenInfo.total}</div>
                  <p className="text-sm text-white/70 mt-1">
                    {formData.campaign_radius} km säteellä
                  </p>
                </div>

                {/* Screen types breakdown */}
                {Object.keys(screenInfo.byType).length > 0 && (
                  <div className="card p-5">
                    <h4 className="font-medium text-gray-700 mb-3">Näyttötyypit</h4>
                    <div className="space-y-2">
                      {Object.entries(screenInfo.byType).slice(0, 5).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 truncate">{type}</span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audience selectors below map */}
            <div className="max-w-2xl mx-auto mt-8 space-y-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kohderyhmän valinta</h3>

              {/* Age Range Selector */}
              <div>
                <AgeRangeSelector
                  minAge={formData.target_age_min || 18}
                  maxAge={formData.target_age_max || 80}
                  onChange={(min, max) => setFormData({ ...formData, target_age_min: min, target_age_max: max })}
                  minLimit={18}
                  maxLimit={100}
                />
              </div>

              {/* Gender Selector */}
              <div>
                <GenderSelector
                  selected={formData.target_genders || ['all']}
                  onChange={(genders) => setFormData({ ...formData, target_genders: genders })}
                />
              </div>

              {/* Location Targeting (Collapsible - Optional) */}
              <details className="group">
                <summary className="cursor-pointer p-4 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MapPin size={20} className="text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Sijaintiin perustuva kohdistus (valinnainen)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {formData.campaign_address && (
                        <span className="text-sm text-gray-500">
                          {formData.campaign_city || 'Valittu'}
                        </span>
                      )}
                      <ArrowRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform" />
                    </div>
                  </div>
                </summary>

                <div className="mt-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Osoite
                    </label>
                    <input
                      type="text"
                      placeholder="Katuosoite"
                      value={formData.campaign_address}
                      onChange={(e) => setFormData({ ...formData, campaign_address: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          // Move focus to postal code input
                          (document.activeElement as HTMLElement)?.parentElement?.parentElement?.querySelector('input[placeholder*="00100"]')?.focus();
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Postinumero
                      </label>
                      <input
                        type="text"
                        placeholder="00100"
                        value={formData.campaign_postal_code}
                        onChange={(e) => setFormData({ ...formData, campaign_postal_code: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Move focus to city input
                            (document.activeElement as HTMLElement)?.parentElement?.nextElementSibling?.querySelector('input')?.focus();
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kaupunki
                      </label>
                      <input
                        type="text"
                        placeholder="Helsinki"
                        value={formData.campaign_city}
                        onChange={(e) => setFormData({ ...formData, campaign_city: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            // Move focus to radius slider or blur
                            (document.activeElement as HTMLElement)?.blur();
                          }
                        }}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Säde (km): {formData.campaign_radius}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={formData.campaign_radius}
                      onChange={(e) => setFormData({ ...formData, campaign_radius: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>1 km</span>
                      <span>50 km</span>
                    </div>
                  </div>
                </div>
              </details>

              {/* Summary Box */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Valittu kohderyhmä</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Ikäryhmä:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formData.target_age_min || 18}-{formData.target_age_max || 80} vuotta
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sukupuoli:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {formData.target_genders?.includes('all')
                        ? 'Kaikki'
                        : formData.target_genders?.length === 1
                        ? formData.target_genders[0] === 'male'
                          ? 'Miehet'
                          : formData.target_genders[0] === 'female'
                          ? 'Naiset'
                          : 'Muut'
                        : `${formData.target_genders?.length || 0} valittu`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Objective Selection */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="card p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Kampanjan tavoite</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Valitse mitä haluat kampanjalla saavuttaa</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  {[
                    {
                      id: 'traffic' as const,
                      label: 'Liikenne',
                      description: 'Vie käyttäjiä verkkosivustolle',
                      icon: '🎯',
                      gradient: 'from-green-500 to-emerald-500'
                    },
                    {
                      id: 'reach' as const,
                      label: 'Reach',
                      description: 'Tavoita mahdollisimman monta ihmistä',
                      icon: '📣',
                      gradient: 'from-blue-500 to-indigo-500'
                    }
                  ].map((objective) => (
                    <button
                      key={objective.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, campaign_objective: objective.id })}
                      className={`relative p-5 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-[1.02] ${
                        formData.campaign_objective === objective.id
                          ? 'border-purple-500 bg-white dark:bg-gray-800 shadow-lg shadow-purple-500/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{objective.icon}</span>
                        {formData.campaign_objective === objective.id && (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${objective.gradient} flex items-center justify-center`}>
                            <Check size={14} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <h4 className={`font-semibold mb-1 ${
                        formData.campaign_objective === objective.id
                          ? 'text-purple-700 dark:text-purple-400'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {objective.label}
                      </h4>
                      <p className={`text-sm ${
                        formData.campaign_objective === objective.id
                          ? 'text-purple-600 dark:text-purple-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {objective.description}
                      </p>
                    </button>
                  ))}
                </div>

                {formData.campaign_objective && (
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Valittu tavoite:</span>{' '}
                      {formData.campaign_objective === 'traffic'
                        ? 'Liikenne - Optimoidaan kävijöiden saamiseksi verkkosivustolle'
                        : 'Reach - Maximoidaan ihmisten tavoittaminen'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 4: BUDGET & CHANNELS */}
        {/* =============================================================== */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <Euro size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Budjetti ja kanavat</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Määritä kampanjan ajankohta, budjetti ja kanavat.
              </p>
            </div>

            {/* Campaign Schedule Section */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="card p-6 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <Calendar size={20} className="text-[#00A5B5]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Kampanjan aikataulu</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Alkamispäivä
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFormData(prev => {
                          const updated = { ...prev, start_date: newStart };
                          // If end_date is before start_date, push it forward
                          if (!prev.is_ongoing && newStart > prev.end_date) {
                            updated.end_date = format(addWeeks(new Date(newStart), 4), 'yyyy-MM-dd');
                          }
                          return updated;
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white dark:border-gray-600"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Päättymispäivä
                    </label>
                    <input
                      type="date"
                      value={formData.is_ongoing ? '' : formData.end_date}
                      min={formData.start_date}
                      disabled={formData.is_ongoing}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
                        formData.is_ongoing ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''
                      }`}
                    />
                  </div>

                  {/* Ongoing Toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          is_ongoing: !prev.is_ongoing,
                          // When toggling ongoing ON, set end_date far in the future for calculation purposes
                          end_date: !prev.is_ongoing 
                            ? format(addWeeks(new Date(prev.start_date), 52), 'yyyy-MM-dd')
                            : format(addWeeks(new Date(prev.start_date), 4), 'yyyy-MM-dd'),
                        }));
                      }}
                      className={`w-full px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.is_ongoing
                          ? 'bg-[#00A5B5] text-white border-[#00A5B5] shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-[#00A5B5] hover:bg-[#00A5B5]/10'
                      }`}
                    >
                      <RefreshCw size={18} />
                      Jatkuva kampanja
                    </button>
                  </div>
                </div>

                {/* Duration summary */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#00A5B5]" />
                    {formData.is_ongoing ? (
                      <span>Jatkuva kampanja alkaen <strong>{format(new Date(formData.start_date), 'd.M.yyyy', { locale: fi })}</strong></span>
                    ) : (
                      <span>
                        <strong>{format(new Date(formData.start_date), 'd.M.', { locale: fi })}</strong> – <strong>{format(new Date(formData.end_date), 'd.M.yyyy', { locale: fi })}</strong>
                        {' '}({campaignDays} päivää)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Branch Budget Card */}
              <div className="lg:col-span-1">
                {selectedBranch && selectedBranch.budget ? (
                  <BudgetCard
                    branchName={selectedBranch.name}
                    allocated={selectedBranch.budget?.allocated_budget || 0}
                    used={selectedBranch.budget?.used_budget || 0}
                    available={(selectedBranch.budget?.allocated_budget || 0) - (selectedBranch.budget?.used_budget || 0)}
                    currency="€"
                  />
                ) : selectedBranch ? (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBranch.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Budjettitietoja ei ole määritelty tälle toimipisteelle.
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Right Column: Budget Selection */}
              <div className="lg:col-span-2 space-y-6">
                {/* Budget Presets */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Valitse kampanjan budjetti
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {budgetPresets.map(amount => {
                      const available = selectedBranch?.budget
                        ? (selectedBranch.budget.allocated_budget || 0) - (selectedBranch.budget.used_budget || 0)
                        : Infinity;
                      const isDisabled = amount > available;
                      return (
                        <button
                          key={amount}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            setSelectedBudget(amount);
                            setCustomBudget(undefined);
                            updateTotalBudget(amount);
                          }}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            selectedBudget === amount || formData.total_budget === amount
                              ? 'bg-[#00A5B5] text-white border-[#00A5B5] shadow-md'
                              : isDisabled
                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-[#00A5B5] hover:bg-[#00A5B5]/10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="text-lg font-bold">{amount}€</div>
                          {isDisabled && (
                            <div className="text-xs mt-1">Ei saatavilla</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tai oma budjetti
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={selectedBranch?.budget
                        ? (selectedBranch.budget.allocated_budget || 0) - (selectedBranch.budget.used_budget || 0)
                        : undefined}
                      value={customBudget !== undefined ? customBudget : formData.total_budget}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomBudget(val);
                        setSelectedBudget(undefined);
                        updateTotalBudget(val || 0);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-800 dark:text-white dark:border-gray-600"
                      placeholder="Kirjoita oma budjetti..."
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  </div>
                  {selectedBranch?.budget && formData.total_budget > (
                    (selectedBranch.budget.allocated_budget || 0) - (selectedBranch.budget.used_budget || 0)
                  ) && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle size={16} />
                      Budjetti ylittää saatavilla olevan määrän ({((selectedBranch.budget.allocated_budget || 0) - (selectedBranch.budget.used_budget || 0))}€)
                    </p>
                  )}
                </div>

                {/* Daily budget estimate */}
                <div className="p-4 bg-[#00A5B5]/5 rounded-xl border border-[#00A5B5]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Arvioitu päiväbudjetti:</span>
                      <span className="text-lg font-bold text-[#00A5B5] ml-2">
                        {campaignDays > 0 ? Math.round(formData.total_budget / campaignDays).toLocaleString('fi-FI') : 0}€
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{campaignDays} päivää</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Channel cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mt-8">
              <ChannelCard
                id="meta"
                name="Meta"
                description="Facebook ja Instagram -mainokset"
                icon={Instagram}
                color="#E1306C"
                enabled={formData.channel_meta}
                budget={formData.budget_meta}
                percentage={Math.round((formData.budget_meta / formData.total_budget) * 100) || 0}
                totalBudget={formData.total_budget}
                onToggle={() => toggleChannel('meta')}
                onBudgetChange={(val) => {
                  setFormData({ ...formData, budget_meta: val });
                  rebalanceBudgets('meta', val);
                }}
              />
              
              <ChannelCard
                id="display"
                name="Display"
                description="Bannerimainokset verkkosivuilla"
                icon={Monitor}
                color="#00A5B5"
                enabled={formData.channel_display}
                budget={formData.budget_display}
                percentage={Math.round((formData.budget_display / formData.total_budget) * 100) || 0}
                totalBudget={formData.total_budget}
                onToggle={() => toggleChannel('display')}
                onBudgetChange={(val) => {
                  setFormData({ ...formData, budget_display: val });
                  rebalanceBudgets('display', val);
                }}
              />
              
              <ChannelCard
                id="pdooh"
                name="PDOOH"
                description="Digitaaliset ulkomainokset"
                icon={Tv}
                color="#1B365D"
                enabled={formData.channel_pdooh}
                budget={formData.budget_pdooh}
                percentage={Math.round((formData.budget_pdooh / formData.total_budget) * 100) || 0}
                totalBudget={formData.total_budget}
                onToggle={() => toggleChannel('pdooh')}
                onBudgetChange={(val) => {
                  setFormData({ ...formData, budget_pdooh: val });
                  rebalanceBudgets('pdooh', val);
                }}
                suggestion={screenInfo.total > 0 ? `${screenInfo.total} näyttöä alueella • Suositus: ${screenInfo.suggestedBudget}€ (${Math.round((screenInfo.suggestedBudget / formData.total_budget) * 100)}%)` : undefined}
              />
              
              <ChannelCard
                id="audio"
                name="Digital Audio"
                description="Spotify ja podcast-mainokset"
                icon={Volume2}
                color="#1DB954"
                enabled={formData.channel_audio}
                budget={formData.budget_audio}
                percentage={Math.round((formData.budget_audio / formData.total_budget) * 100) || 0}
                totalBudget={formData.total_budget}
                onToggle={() => toggleChannel('audio')}
                onBudgetChange={(val) => {
                  setFormData({ ...formData, budget_audio: val });
                  rebalanceBudgets('audio', val);
                }}
              />
            </div>

            {/* Budget allocation visualization */}
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="card p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Budjetin jakautuminen</span>
                  <span className={`text-sm font-medium ${
                    enabledChannelsBudget === formData.total_budget ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {enabledChannelsBudget.toLocaleString('fi-FI')}€ / {formData.total_budget.toLocaleString('fi-FI')}€
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden flex">
                  {formData.channel_meta && formData.budget_meta > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${(formData.budget_meta / formData.total_budget) * 100}%`,
                        backgroundColor: '#E1306C'
                      }}
                    />
                  )}
                  {formData.channel_display && formData.budget_display > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${(formData.budget_display / formData.total_budget) * 100}%`,
                        backgroundColor: '#00A5B5'
                      }}
                    />
                  )}
                  {formData.channel_pdooh && formData.budget_pdooh > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${(formData.budget_pdooh / formData.total_budget) * 100}%`,
                        backgroundColor: '#1B365D'
                      }}
                    />
                  )}
                  {formData.channel_audio && formData.budget_audio > 0 && (
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${(formData.budget_audio / formData.total_budget) * 100}%`,
                        backgroundColor: '#1DB954'
                      }}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3">
                  {formData.channel_meta && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E1306C' }} />
                      <span className="text-sm text-gray-600">Meta</span>
                    </div>
                  )}
                  {formData.channel_display && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00A5B5' }} />
                      <span className="text-sm text-gray-600">Display</span>
                    </div>
                  )}
                  {formData.channel_pdooh && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1B365D' }} />
                      <span className="text-sm text-gray-600">PDOOH</span>
                    </div>
                  )}
                  {formData.channel_audio && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1DB954' }} />
                      <span className="text-sm text-gray-600">Audio</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PDOOH Suggested Budget */}
              {formData.channel_pdooh && screenInfo.total > 0 && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-amber-800">Suositeltu PDOOH-budjetti</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">
                        {screenInfo.suggestedBudget.toLocaleString('fi-FI')}€
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        Perustuu {screenInfo.total} näyttöön ja {campaignDays} päivän kestoon
                      </p>
                      {formData.budget_pdooh < screenInfo.suggestedBudget && (
                        <button
                          onClick={() => {
                            const newPdoohBudget = screenInfo.suggestedBudget;
                            setFormData(prev => ({ ...prev, budget_pdooh: newPdoohBudget }));
                            rebalanceBudgets('pdooh', newPdoohBudget);
                          }}
                          className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                        >
                          Käytä suositeltua budjettia
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 5: CREATIVE CONTENT */}
        {/* =============================================================== */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <Palette size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Mainosten sisältö</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Muokkaa mainosten tekstejä ja valitse taustakuva.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Form */}
              <div className="space-y-5">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Type size={16} className="inline mr-2" />
                    Otsikko
                  </label>
                  <AutoExpandTextarea
                    value={creativeConfig.headline}
                    onChange={(value) => setCreativeConfig({ ...creativeConfig, headline: value })}
                    placeholder="Hymyile. Olet hyvissä käsissä."
                    minHeight={44}
                    maxHeight={200}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alaotsikko
                  </label>
                  <AutoExpandTextarea
                    value={creativeConfig.subheadline}
                    onChange={(value) => setCreativeConfig({ ...creativeConfig, subheadline: value })}
                    placeholder="Sujuvampaa suunterveyttä Lahden Suun Terveystalossa."
                    minHeight={44}
                    maxHeight={200}
                  />
                </div>

                {/* Price Bubble Mode */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Euro size={20} className="text-[#004E9A]" />
                    <div>
                      <h4 className="font-medium text-gray-900">Tarjouskupla</h4>
                      <p className="text-xs text-gray-500">Valitse näytetäänkö hintakupla mainoksessa</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { id: 'price' as const, label: 'Hinta' },
                      { id: 'no-price' as const, label: 'Ilman hintaa' },
                      { id: 'both' as const, label: 'Molemmat' }
                    ].map((mode) => {
                      const isSelected = creativeConfig.priceBubbleMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setCreativeConfig({ ...creativeConfig, priceBubbleMode: mode.id })}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            isSelected
                              ? 'border-[#00A5B5] bg-[#00A5B5]/10'
                              : 'border-gray-200 hover:border-[#00A5B5]/50'
                          }`}
                        >
                          <div className={`text-xs font-semibold ${isSelected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>{mode.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {creativeConfig.priceBubbleMode !== 'no-price' && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Otsikko (esim. Hammas-tarkastus)</label>
                          <AutoExpandTextarea
                            value={creativeConfig.offerTitle}
                            onChange={(value) => setCreativeConfig({ ...creativeConfig, offerTitle: value })}
                            placeholder="Hammas-tarkastus"
                            minHeight={40}
                            maxHeight={100}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Hinta (vain numero)</label>
                          <AutoExpandTextarea
                            value={creativeConfig.offer}
                            onChange={(value) => setCreativeConfig({ ...creativeConfig, offer: value })}
                            placeholder="49"
                            minHeight={40}
                            maxHeight={100}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Voimassaolo</label>
                        <AutoExpandTextarea
                          value={creativeConfig.offerDate}
                          onChange={(value) => setCreativeConfig({ ...creativeConfig, offerDate: value })}
                          placeholder="Varaa viimeistään 28.10."
                          minHeight={40}
                          maxHeight={100}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CTA (Toimintakehote)
                  </label>
                  <AutoExpandTextarea
                    value={creativeConfig.cta}
                    onChange={(value) => setCreativeConfig({ ...creativeConfig, cta: value })}
                    placeholder="Varaa aika"
                    minHeight={44}
                    maxHeight={200}
                  />
                </div>

                {/* Target URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe size={16} className="inline mr-2" />
                    Kohde-URL
                  </label>
                  <input
                    type="url"
                    value={creativeConfig.targetUrl}
                    onChange={(e) => setCreativeConfig({ ...creativeConfig, targetUrl: e.target.value })}
                    placeholder="https://terveystalo.com/suunterveystalo"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Mainosta klikkaavan käyttäjän ohjausosoite</p>
                </div>

                {/* Disclaimer text for PDOOH */}
                {formData.channel_pdooh && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vastuuvapauslauseke (PDOOH)
                    </label>
                    <AutoExpandTextarea
                      value={creativeConfig.disclaimerText}
                      onChange={(value) => setCreativeConfig({ ...creativeConfig, disclaimerText: value })}
                      placeholder="Tarjous voimassa uusille asiakkaille..."
                      minHeight={60}
                      maxHeight={200}
                    />
                    <p className="text-xs text-gray-400 mt-1">Näytetään vain PDOOH-mainoksissa</p>
                  </div>
                )}

                {/* Audio upload when audio channel is enabled */}
                {formData.channel_audio && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <Volume2 size={20} className="text-[#1DB954]" />
                      <div>
                        <h4 className="font-medium text-gray-900">Audio-mainos</h4>
                        <p className="text-xs text-gray-500">Lataa äänitiedosto (MP3, max 30s)</p>
                      </div>
                    </div>
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1DB954] transition-colors">
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {creativeConfig.audioFile ? creativeConfig.audioFile.name : 'Valitse äänitiedosto...'}
                      </span>
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCreativeConfig({ ...creativeConfig, audioFile: file });
                            toast.success(`Äänitiedosto "${file.name}" valittu`);
                          }
                        }}
                      />
                    </label>
                    {creativeConfig.audioFile && (
                      <div className="mt-3 flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Volume2 size={16} className="text-[#1DB954]" />
                          <span className="text-sm text-gray-700">{creativeConfig.audioFile.name}</span>
                          <span className="text-xs text-gray-400">({(creativeConfig.audioFile.size / 1024).toFixed(0)} KB)</span>
                        </div>
                        <button
                          onClick={() => setCreativeConfig({ ...creativeConfig, audioFile: null })}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Background images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <ImageIcon size={16} className="inline mr-2" />
                    Taustakuva
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {backgroundImages.map(img => (
                      <button
                        key={img.id}
                        onClick={() => setCreativeConfig({ 
                          ...creativeConfig, 
                          backgroundImage: img.url,
                          useCustomBackground: false 
                        })}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          creativeConfig.backgroundImage === img.url
                            ? 'border-[#00A5B5] ring-2 ring-[#00A5B5]/30'
                            : 'border-gray-200 hover:border-[#00A5B5]/50'
                        }`}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        {creativeConfig.backgroundImage === img.url && (
                          <div className="absolute inset-0 bg-[#00A5B5]/20 flex items-center justify-center">
                            <Check size={24} className="text-white drop-shadow-lg" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-2 py-0.5 rounded">
                          {img.name}
                        </span>
                      </button>
                    ))}
                    
                    {/* Upload custom */}
                    <button
                      onClick={() => {/* TODO: File upload */}}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00A5B5] flex flex-col items-center justify-center text-gray-400 hover:text-[#00A5B5] transition-colors"
                    >
                      <Upload size={24} />
                      <span className="text-xs mt-1">Lataa oma</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Esikatselu</h3>
                
                {/* Size selector grouped by category - filtered by enabled channels */}
                <div className="space-y-3 mb-4">
                  {PREVIEW_SIZE_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const sizesInCat = PREVIEW_SIZES.filter(s => s.category === cat.key);
                    const isMeta = cat.key === 'Meta';
                    // Hide category if its channel is disabled
                    const isChannelDisabled = 
                      (cat.key === 'Display' && !formData.channel_display) ||
                      (cat.key === 'PDOOH' && !formData.channel_pdooh) ||
                      (cat.key === 'Meta' && !formData.channel_meta);
                    if (isChannelDisabled && !isMeta) return null;
                    return (
                      <div key={cat.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <CatIcon size={14} className="text-gray-500" />
                          <span className={`text-xs font-semibold uppercase tracking-wider ${isMeta ? 'text-gray-400' : 'text-gray-600'}`}>
                            {cat.label}
                          </span>
                        </div>
                        <div className={`flex flex-wrap gap-2 ${isMeta ? 'opacity-50 pointer-events-none' : ''}`}>
                          {sizesInCat.map((size) => {
                            const Icon = size.icon;
                            const isSelected = previewSize.id === size.id;
                            return (
                              <button
                                key={size.id}
                                onClick={() => setPreviewSize(size)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                                  isSelected
                                    ? 'border-[#00A5B5] bg-[#00A5B5]/10 text-[#00A5B5]'
                                    : 'border-gray-200 hover:border-[#00A5B5]/50 text-gray-600 hover:text-[#00A5B5]'
                                }`}
                              >
                                <Icon size={18} className={isSelected ? 'text-[#00A5B5]' : ''} />
                                <div className="text-left">
                                  <div className={`text-xs font-semibold ${isSelected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>
                                    {size.name}
                                  </div>
                                  <div className="text-[10px] text-gray-400">{size.label}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Preview containers - handle creative_type and priceBubbleMode for pricing */}
                {(() => {
                  const showBothCreativeTypes = formData.creative_type === 'both';
                  const showAddress = formData.creative_type === 'local' || formData.creative_type === 'both';
                  const showNationwide = formData.creative_type === 'nationwide' || formData.creative_type === 'both';

                  // Determine number of columns based on what we're showing
                  const numColumns = showBothCreativeTypes ? 2 : 1;
                  const containerWidth = numColumns > 1 ? 280 : 450;
                  const containerHeight = numColumns > 1 ? 350 : 500;
                  const scaleX = containerWidth / previewSize.width;
                  const scaleY = containerHeight / previewSize.height;
                  const previewScaleFactor = Math.min(scaleX, scaleY, 1);
                  const minHeight = `${Math.round(previewSize.height * previewScaleFactor) + 32}px`;

                  return (
                    <div className={numColumns > 1 ? 'grid grid-cols-2 gap-4' : ''}>
                      {/* Local version (with address) - shown for 'local' or 'both' */}
                      {(formData.creative_type === 'local' || formData.creative_type === 'both') && (
                        <div>
                          {formData.creative_type === 'both' && (
                            <div className="text-center mb-2">
                              <span className="text-xs font-medium text-[#00A5B5] bg-[#00A5B5]/10 px-3 py-1 rounded-full">
                                <MapPin size={12} className="inline mr-1" />
                                Paikkakuntakohtainen
                              </span>
                            </div>
                          )}
                          <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-center overflow-hidden" style={{ minHeight }}>
                            <div
                              className="origin-top-center"
                              style={{
                                transform: `scale(${previewScaleFactor})`
                              }}
                            >
                              {renderPreviewTemplate(true)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nationwide version (without address) - shown for 'nationwide' or 'both' */}
                      {(formData.creative_type === 'nationwide' || formData.creative_type === 'both') && (
                        <div>
                          {formData.creative_type === 'both' && (
                            <div className="text-center mb-2">
                              <span className="text-xs font-medium text-[#1B365D] bg-[#1B365D]/10 px-3 py-1 rounded-full">
                                <Globe size={12} className="inline mr-1" />
                                Valtakunnallinen
                              </span>
                            </div>
                          )}
                          <div className="bg-gray-900 rounded-2xl p-4 flex items-center justify-center overflow-hidden" style={{ minHeight }}>
                            <div
                              className="origin-top-center"
                              style={{
                                transform: `scale(${previewScaleFactor})`
                              }}
                            >
                              {renderPreviewTemplate(false)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                <p className="text-center text-sm text-gray-500 mt-4">
                  {previewSize.name} - {previewSize.label}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 6: SUMMARY */}
        {/* =============================================================== */}
        {currentStep === 5 && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Yhteenveto</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Tarkista kampanjan tiedot ennen luomista.
              </p>
            </div>

            {/* Campaign name */}
            <div className="max-w-2xl mx-auto mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kampanjan nimi
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`${getServiceName(selectedService)} - ${selectedBranch?.city} ${format(new Date(), 'MM/yyyy')}`}
                className="input text-lg font-medium"
              />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <ToothIcon size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Palvelu</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{getServiceName(selectedService)}</p>
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <MapPin size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Toimipiste</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{selectedBranch?.name}</p>
                <p className="text-sm text-gray-500">{selectedBranch?.city}</p>
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <Target size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Kohdealue</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formData.campaign_radius} km säde</p>
                <p className="text-sm text-gray-500">{screenInfo.total} DOOH-näyttöä</p>
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <Calendar size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Aikataulu</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formData.is_ongoing ? (
                    <>Jatkuva – alkaen {format(new Date(formData.start_date), 'd.M.yyyy', { locale: fi })}</>
                  ) : (
                    <>{format(new Date(formData.start_date), 'd.M.', { locale: fi })} - {format(new Date(formData.end_date), 'd.M.yyyy', { locale: fi })}</>
                  )}
                </p>
                <p className="text-sm text-gray-500">{formData.is_ongoing ? 'Jatkuva kampanja' : `${campaignDays} päivää`}</p>
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <Layers size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Luovat</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {formData.creative_type === 'nationwide' ? 'Valtakunnallinen' : 'Paikallinen'}
                </p>
                {creativeConfig.priceBubbleMode === 'both' ? (
                  <p className="text-sm text-gray-500">Hinta + Ilman hintaa</p>
                ) : creativeConfig.priceBubbleMode === 'price' ? (
                  <p className="text-sm text-gray-500">Hinnalla</p>
                ) : (
                  <p className="text-sm text-gray-500">Ilman hintaa</p>
                )}
                {formData.creative_type === 'both' && (
                  <p className="text-sm text-gray-500">
                    {formData.creative_weight_nationwide}% / {formData.creative_weight_local}%
                  </p>
                )}
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <Tv size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">Kanavat</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {[
                    formData.channel_meta && 'Meta',
                    formData.channel_display && 'Display',
                    formData.channel_pdooh && 'PDOOH',
                    formData.channel_audio && 'Audio'
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>

            {/* Budget summary */}
            <div className="max-w-2xl mx-auto">
              <div className="card p-6 bg-gradient-to-r from-[#1B365D] to-[#00A5B5] text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Kokonaisbudjetti</p>
                    <p className="text-4xl font-bold mt-1">{formData.total_budget.toLocaleString('fi-FI')}€</p>
                    <p className="text-white/70 text-sm mt-2">
                      ~{Math.round(formData.total_budget / campaignDays).toLocaleString('fi-FI')}€ / päivä
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    {formData.channel_meta && (
                      <div className="text-sm">
                        <span className="text-white/70">Meta: </span>
                        <span className="font-medium">{formData.budget_meta.toLocaleString('fi-FI')}€</span>
                      </div>
                    )}
                    {formData.channel_display && (
                      <div className="text-sm">
                        <span className="text-white/70">Display: </span>
                        <span className="font-medium">{formData.budget_display.toLocaleString('fi-FI')}€</span>
                      </div>
                    )}
                    {formData.channel_pdooh && (
                      <div className="text-sm">
                        <span className="text-white/70">PDOOH: </span>
                        <span className="font-medium">{formData.budget_pdooh.toLocaleString('fi-FI')}€</span>
                      </div>
                    )}
                    {formData.channel_audio && (
                      <div className="text-sm">
                        <span className="text-white/70">Audio: </span>
                        <span className="font-medium">{formData.budget_audio.toLocaleString('fi-FI')}€</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="btn-ghost disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
          Edellinen
        </button>

        {currentStep < steps.length - 1 ? (
          <button onClick={handleNext} className="btn-primary group">
            Seuraava
            <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button 
            onClick={handleSubmit} 
            className="btn-primary bg-gradient-to-r from-[#00A5B5] to-[#1B365D] hover:shadow-lg hover:shadow-[#00A5B5]/30 transition-all"
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="mr-2 animate-spin" />
                Luodaan...
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                Luo kampanja
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CampaignCreate;
