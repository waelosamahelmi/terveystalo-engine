// ============================================================================
// SUUN TERVEYSTALO - Campaign Creation Wizard V2
// Complete redesign with dynamic budget allocation and map integration
// ============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createCampaign, updateCampaign, getCampaignById } from '../lib/campaignService';
import { getCreativeTemplates, renderTemplateHtml } from '../lib/creativeService';
import { countScreensInRadius, MediaScreen } from '../lib/mediaScreensService';
import { useStore, store } from '../lib/store';
import { loader } from '../lib/googleMapsLoader';
import type { Service, Branch, CampaignFormData, CreativeType, AdType, PricingOption, NationwideAddressMode, CreativeTemplate } from '../types';
import { getConjugatedCity, getBundleForBranch, LOCATION_BUNDLES } from '../lib/metaTemplateVariables';
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
  User,
  UserCircle,
  Baby,
  Smile,
  Eye,
  MousePointerClick,
  X,
  TrendingUp,
  Play,
  Pause,
  Film,
  Video,
  Clock,
  FolderOpen,
  Sparkles as SparklesIcon,
  LayoutGrid,
  MoreHorizontal,
  ChevronDown,
  Settings,
  Download,
  Building2,
  PieChart,
  Percent,
  Loader,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isDemoMode, addDemoCreatedCampaign } from '../lib/demoService';
import { DemoBanner } from '../components/DemoTooltip';
import { AgeRangeSelector } from '../components/AgeRangeSelector';
import { GenderSelector } from '../components/GenderSelector';
import { AutoExpandTextarea } from '../components/AutoExpandTextarea';
import { supabase } from '../lib/supabase';

// Terveystalo Budget Edit State
interface TerveystaloBudgetEditState {
  isOpen: boolean;
  newValue: number;
  isLoading: boolean;
}

// Per-branch radius settings
interface BranchRadiusSettings {
  [branchId: string]: {
    radius: number;
    enabled: boolean;
  }
}

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
  servicePrices: Record<string, string>;
  offerTitle: string;
  offerSubtitle: string;
  offerDate: string;
  cta: string;
  backgroundImage: string | null;
  useCustomBackground: boolean;
  priceBubbleMode: 'price' | 'no-price' | 'both';
  targetUrl: string;
  audioFile: File | null;
  selectedAudio: string | null;
  disclaimerText: string;
  generalBrandMessage: string; // Yleinen brändiviesti
  // Video for Meta ads
  videoFile: File | null;
  selectedVideo: string | null; // URL from library
  // Ad concept type
  conceptType: 'brandviesti' | 'service';
  // Multi-location mode
  multiLocationMode: 'single' | 'multi';
  // Meta ad copy
  metaPrimaryText: string;
  metaHeadline: string;
  metaDescription: string;
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
  templateType?: 'display' | 'pdooh' | 'meta'; // Store actual template type for lookup
}

const PREVIEW_SIZES: PreviewSize[] = [
  // Display
  { id: '300x300', name: '300×300', width: 300, height: 300, icon: Square, label: 'Neliö', category: 'Display', templateType: 'display' },
  { id: '300x431', name: '300×431', width: 300, height: 431, icon: RectangleVertical, label: 'Pysty', category: 'Display', templateType: 'display' },
  { id: '300x600', name: '300×600', width: 300, height: 600, icon: RectangleVertical, label: 'Half-page', category: 'Display', templateType: 'display' },
  { id: '620x891', name: '620×891', width: 620, height: 891, icon: RectangleVertical, label: 'Iso pysty', category: 'Display', templateType: 'display' },
  // Display (horizontal)
  { id: '980x400', name: '980×400', width: 980, height: 400, icon: RectangleHorizontal, label: 'Vaaka', category: 'Display', templateType: 'display' },
  // PDOOH
  { id: '1080x1920-pdooh', name: '1080×1920', width: 1080, height: 1920, icon: Smartphone, label: 'Pysty', category: 'PDOOH', templateType: 'pdooh' },
  // Meta (under development)
  { id: '1080x1080', name: '1080×1080', width: 1080, height: 1080, icon: Instagram, label: 'Feed', category: 'Meta', templateType: 'meta' },
  { id: '1080x1920-meta', name: '1080×1920', width: 1080, height: 1920, icon: Smartphone, label: 'Stories/Reels', category: 'Meta', templateType: 'meta' },
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
  const servicePrice = service.default_price || (service.price ? `${service.price}€` : null);
  const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti';

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4 ${
        selected
          ? 'border-[#00A5B5] bg-[#00A5B5]/10'
          : 'border-gray-200 hover:border-[#00A5B5]/50'
      }`}
    >
      <div className={selected ? 'text-[#00A5B5]' : 'text-gray-400'}>
        {isGeneralBrandMessage ? <TrendingUp size={24} /> : <ToothIcon size={24} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-base font-semibold ${selected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>
          {serviceName}
        </div>
        {!isGeneralBrandMessage && servicePrice && (
          <div className={`text-sm mt-1 ${selected ? 'text-[#00A5B5]/70' : 'text-gray-500'}`}>
            {servicePrice}
          </div>
        )}
      </div>

      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
        selected
          ? 'border-[#00A5B5] bg-[#00A5B5]'
          : 'border-gray-300'
      }`}>
        {selected && <Check size={12} className="text-white" strokeWidth={3} />}
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

interface BranchWithRadius {
  branch: Branch;
  radius: number;
}

interface MapComponentProps {
  branches?: BranchWithRadius[];
  center?: { lat: number; lng: number };
  radius?: number;
  single?: boolean; // If true, use old single-circle mode
  screens?: MediaScreen[];
  allScreens?: MediaScreen[]; // All Finland screens for nationwide mode
  onRadiusChange?: (branchId: string, radius: number) => void;
  mode?: 'single' | 'multi' | 'finland';
}

const MapComponent = ({ branches, center, radius = 10, screens, allScreens, onRadiusChange, single = false, mode = 'multi' }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  // Use plain objects instead of Map to avoid conflict with Google Maps
  const circlesRef = useRef<Record<string, any>>({});
  const markersRef = useRef<Record<string, any>>({});
  const screenMarkersRef = useRef<Record<string, any>>({});
  const googleRef = useRef<any>(null);

  // Finland bounds for nationwide view
  const FINLAND_BOUNDS = {
    north: 70.093,
    south: 59.685,
    east: 31.517,
    west: 20.546
  };

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        const google = await loader.load();
        googleRef.current = google;

        let mapCenter = center;
        let mapZoom = 12;

        if (mode === 'finland') {
          mapCenter = { lat: 65.5, lng: 26 };
          mapZoom = 5;
        } else if (branches && branches.length > 0) {
          // Calculate center from all branches
          const avgLat = branches.reduce((sum, b) => sum + b.branch.latitude, 0) / branches.length;
          const avgLng = branches.reduce((sum, b) => sum + (b.branch.longitude || 0), 0) / branches.length;
          mapCenter = { lat: avgLat, lng: avgLng };
          mapZoom = 7;
        }

        const map = new google.maps.Map(mapRef.current, {
          center: mapCenter || { lat: 60.1699, lng: 24.9384 },
          zoom: mapZoom,
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
          restriction: mode === 'finland' ? {
            latLngBounds: FINLAND_BOUNDS,
            strictBounds: false
          } : undefined,
        });

        mapInstanceRef.current = map;

        // Draw Finland outline for nationwide mode
        if (mode === 'finland') {
          const finlandPolygon = new google.maps.Polygon({
            paths: [
              // Simplified Finland border coordinates
              { lat: 69.76, lng: 29.07 }, { lat: 69.70, lng: 27.50 }, { lat: 68.55, lng: 22.83 },
              { lat: 66.80, lng: 23.90 }, { lat: 65.50, lng: 24.50 }, { lat: 63.30, lng: 21.50 },
              { lat: 62.90, lng: 21.50 }, { lat: 61.70, lng: 21.80 }, { lat: 60.40, lng: 22.50 },
              { lat: 59.80, lng: 23.50 }, { lat: 59.85, lng: 24.50 }, { lat: 60.40, lng: 27.80 },
              { lat: 61.20, lng: 28.50 }, { lat: 62.00, lng: 29.50 }, { lat: 63.30, lng: 31.50 },
              { lat: 65.50, lng: 31.00 }, { lat: 66.80, lng: 30.00 }, { lat:68.50, lng: 28.50 },
              { lat: 69.76, lng: 29.07 }
            ],
            map,
            strokeColor: '#00A5B5',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            fillColor: '#00A5B5',
            fillOpacity: 0.1
          });
        }

        // Add branch markers and circles
        if (mode === 'multi' && branches) {
          branches.forEach(({ branch, radius: r }) => {
            const position = { lat: branch.latitude, lng: branch.longitude || 0 };

            // Marker
            const marker = new google.maps.Marker({
              position,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#00A5B5',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              title: branch.name,
              zIndex: 100
            });
            markersRef.current[branch.id] = marker;

            // Circle
            const circle = new google.maps.Circle({
              map,
              center: position,
              radius: r * 1000,
              fillColor: '#00A5B5',
              fillOpacity: 0.15,
              strokeColor: '#00A5B5',
              strokeWeight: 2,
              strokeOpacity: 0.7,
            });
            circlesRef.current[branch.id] = circle;
          });
        }

        // Add PDOOH screen markers
        const screensToShow = mode === 'finland' ? allScreens : screens;
        if (screensToShow && screensToShow.length > 0) {
          screensToShow.forEach((screen, index) => {
            if (screen.latitude && screen.longitude) {
              const screenMarker = new google.maps.Marker({
                position: { lat: screen.latitude, lng: screen.longitude },
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: '#1B365D',
                  fillOpacity: 0.8,
                  strokeColor: '#ffffff',
                  strokeWeight: 1,
                },
                title: `${screen.site_url} (${screen.city || 'Unknown'})`,
                zIndex: 50
              });
              screenMarkersRef.current[`screen-${index}`] = screenMarker;
            }
          });
        }

        // Single branch mode (backward compatible)
        if (single && center && radius) {
          // Single branch mode (backward compatible)
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
          circlesRef.current['single'] = circle;
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, branches?.map(b => b.branch.id).join(','), screens?.length, allScreens?.length]);

  // Update circle radii when branches change
  useEffect(() => {
    if (mode === 'multi' && branches) {
      branches.forEach(({ branch, radius: r }) => {
        const circle = circlesRef.current[branch.id];
        if (circle) {
          circle.setRadius(r * 1000);
        }
      });
    } else if (single && radius) {
      const circle = circlesRef.current['single'];
      if (circle) {
        circle.setRadius(radius * 1000);
      }
    }
  }, [branches, radius, mode, single]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-inner">
      <div ref={mapRef} className="w-full h-80" />

      {/* Screen count badge */}
      {(single && screens && screens.length > 0) && (
        <div className="absolute top-4 right-4 bg-[#1B365D] text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Monitor size={16} />
            <span className="font-bold">{screens.length}</span>
            <span className="text-sm opacity-80">näyttöä</span>
          </div>
        </div>
      )}

      {/* Finland screen count badge for nationwide mode */}
      {mode === 'finland' && allScreens && allScreens.length > 0 && (
        <div className="absolute top-4 left-4 bg-[#1B365D] text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Monitor size={16} />
            <span className="font-bold">{allScreens.length}</span>
            <span className="text-sm opacity-80">PDOOH-näyttöä Suomessa</span>
          </div>
        </div>
      )}

      {/* Multi-branch screen count badge */}
      {mode === 'multi' && screens && screens.length > 0 && (
        <div className="absolute top-4 right-4 bg-[#1B365D] text-white px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <Monitor size={16} />
            <span className="font-bold">{screens.length}</span>
            <span className="text-sm opacity-80">näyttöä alueella</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// BACKGROUND IMAGES - From refs
// ============================================================================

const backgroundImages = [
  { id: 'mies', name: 'Mies', url: '/refs/assets/mies-980w.jpg' },
  { id: 'nainen', name: 'Nainen', url: '/refs/assets/nainen-980w.jpg' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CampaignCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCampaignId = searchParams.get('edit');
  const isEditMode = !!editCampaignId;
  const { services, branches, campaigns, user } = useStore();
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
  const [selectedBudget, setSelectedBudget] = useState<number | undefined>(500);

  // Database creative templates
  const [dbTemplates, setDbTemplates] = useState<CreativeTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Terveystalo total budget edit state
  const [terveystaloBudgetEdit, setTerveystaloBudgetEdit] = useState<TerveystaloBudgetEditState>({
    isOpen: false,
    newValue: 0,
    isLoading: false,
  });

  // Per-branch radius settings
  const [branchRadiusSettings, setBranchRadiusSettings] = useState<BranchRadiusSettings>({});

  // Branch screen counts - stores screen count for each branch
  const [branchScreenCounts, setBranchScreenCounts] = useState<Record<string, number>>({});
  // Per-branch budget allocation percentages (should sum to 100)
  const [branchBudgetAllocations, setBranchBudgetAllocations] = useState<Record<string, number>>({});

  // Per-branch channel budget overrides (branchId -> { meta, display, pdooh, audio })
  const [branchChannelOverrides, setBranchChannelOverrides] = useState<Record<string, { meta?: number; display?: number; pdooh?: number; audio?: number }>>({});

  // Track whether budget recommendation has been auto-applied
  const [recommendationApplied, setRecommendationApplied] = useState(false);

  // Combined screens within all selected branches' radii
  const [combinedBranchScreens, setCombinedBranchScreens] = useState<MediaScreen[]>([]);

  // Total monthly budget from app_settings
  const [totalMonthlyBudget, setTotalMonthlyBudget] = useState<number>(0);

  // Calculate total Terveystalo budget and remaining
  const getTotalTerveystaloBudget = useCallback((): { total: number; used: number; remaining: number } => {
    // Get current month period
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total used by campaigns running during current month
    const totalUsed = campaigns.reduce((sum, c) => {
      // Only count active/paused/pending campaigns
      if (c.status !== 'active' && c.status !== 'pending' && c.status !== 'paused') {
        return sum;
      }

      // Check if campaign overlaps with current month
      const campaignStart = new Date(c.start_date);
      const campaignEnd = c.end_date ? new Date(c.end_date) : new Date(2099, 11, 31); // Ongoing campaigns

      // Check if date ranges overlap
      const overlaps = campaignStart <= currentMonthEnd && campaignEnd >= currentMonthStart;

      if (overlaps) {
        return sum + (c.total_budget || 0);
      }
      return sum;
    }, 0);

    return {
      total: totalMonthlyBudget,
      used: totalUsed,
      remaining: totalMonthlyBudget - totalUsed,
    };
  }, [campaigns, totalMonthlyBudget]);

  // Load budget presets and templates on mount
  useEffect(() => {
    // Hardcoded budget presets
    setBudgetPresets([50, 100, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000]);

    // Load total monthly budget from app_settings
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'total_monthly_budget')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          setTotalMonthlyBudget(Number(data.value));
        }
      })
      .catch(console.error);

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
    service_ids: [],
    branch_id: '',
    branch_ids: [],
    campaign_address: '',
    campaign_postal_code: '',
    campaign_city: '',
    campaign_radius: 10,
    campaign_coordinates: { lat: 60.1699, lng: 24.9384 },
    creative_type: 'both',
    nationwide_address_mode: 'with_address',
    creative_weight_nationwide: 50,
    creative_weight_local: 50,
    start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: format(addWeeks(new Date(), 4), 'yyyy-MM-dd'),
    total_budget: 500,
    channel_meta: true,
    channel_display: true,
    channel_pdooh: true,
    channel_audio: false,
    budget_meta: 250,
    budget_display: 250,
    budget_pdooh: 250,
    budget_audio: 0,
    headline: '',
    offer_text: '',
    cta_text: 'Varaa aika',
    background_image_url: undefined,
    description: '',
    // New fields for campaign creation
    ad_type: undefined,
    target_age_min: 18,
    target_age_max: 65,
    target_genders: ['all'],
    campaign_objective: 'traffic',
    is_ongoing: false,
    // Meta ad copy
    meta_primary_text: '',
    meta_headline: '',
    meta_description: '',
    // Excluded branches
    excluded_branch_ids: [],
  });

  // ---- Edit Mode: load existing campaign data ----
  useEffect(() => {
    if (!editCampaignId) return;
    getCampaignById(editCampaignId).then(c => {
      if (!c) { toast.error('Kampanjaa ei löytynyt'); navigate('/campaigns'); return; }
      setFormData(prev => ({
        ...prev,
        name: c.name || '',
        service_id: c.service_id || '',
        service_ids: c.service_id ? [c.service_id] : [],
        branch_id: c.branch_id || '',
        branch_ids: c.branch_id ? [c.branch_id] : (c as any).branch_ids || [],
        start_date: c.start_date || prev.start_date,
        end_date: c.end_date || prev.end_date,
        is_ongoing: !c.end_date || (c as any).campaign_end_date === 'ONGOING',
        total_budget: c.total_budget || prev.total_budget,
        channel_meta: !!c.channel_meta,
        channel_display: !!c.channel_display,
        channel_pdooh: !!c.channel_pdooh,
        channel_audio: !!c.channel_audio,
        budget_meta: c.budget_meta || 0,
        budget_display: c.budget_display || 0,
        budget_pdooh: c.budget_pdooh || 0,
        budget_audio: c.budget_audio || 0,
        headline: c.headline || '',
        offer_text: c.offer_text || '',
        cta_text: c.cta_text || 'Varaa aika',
        landing_url: c.landing_url || '',
        description: c.description || '',
        ad_type: (c as any).ad_type || undefined,
        target_age_min: (c as any).target_age_min || 18,
        target_age_max: (c as any).target_age_max || 65,
        target_genders: (c as any).target_genders || ['all'],
        campaign_objective: (c as any).campaign_objective || 'traffic',
        meta_primary_text: (c as any).meta_primary_text || '',
        meta_headline: (c as any).meta_headline || '',
        meta_description: (c as any).meta_description || '',
        excluded_branch_ids: (c as any).excluded_branch_ids || [],
      }));
    }).catch(err => { console.error('Failed to load campaign for edit:', err); toast.error('Virhe kampanjan lataamisessa'); });
  }, [editCampaignId]);

  // Calculate channel budget recommendation based on campaign factors
  const getChannelBudgetRecommendation = useCallback(() => {
    const recs = {
      meta: 40,    // Default: 40% Meta
      display: 35,  // Default: 35% Display
      pdooh: 25,   // Default: 25% PDOOH
      audio: 0     // Audio hidden for now
    };

    // Adjust based on campaign objective
    if (formData.campaign_objective === 'traffic') {
      recs.meta = 45;
      recs.display = 30;
      recs.pdooh = 25;
      recs.audio = 0;
    } else if (formData.campaign_objective === 'reach') {
      recs.meta = 30;
      recs.display = 40;
      recs.pdooh = 30;
      recs.audio = 0;
    }

    // Adjust based on PDOOH screens availability
    const totalScreens = Object.values(branchScreenCounts).reduce((sum, count) => sum + count, 0);

    if (totalScreens > 0) {
      const screenFactor = Math.min(totalScreens / 20, 1);
      recs.pdooh = Math.round(20 + (screenFactor * 20));
      const reduction = recs.pdooh - 25;
      recs.meta = Math.max(20, recs.meta - Math.round(reduction * 0.4));
      recs.display = Math.max(20, recs.display - Math.round(reduction * 0.4));
      // Audio hidden: recs.audio = Math.max(0, recs.audio - Math.round(reduction * 0.2));
    } else {
      recs.pdooh = 0;
      recs.meta = Math.round(recs.meta + 12);
      recs.display = Math.round(recs.display + 13);
    }

    // Adjust based on campaign type
    if (formData.ad_type === 'nationwide') {
      recs.display = Math.round(recs.display * 1.1);
      recs.pdooh = Math.round(recs.pdooh * 1.1);
      recs.meta = Math.round(100 - recs.display - recs.pdooh);
    }

    // Normalize percentages to always sum to exactly 100%
    const total = recs.meta + recs.display + recs.pdooh + recs.audio;
    if (total !== 100 && total > 0) {
      const diff = 100 - total;
      // Add/subtract the difference to the largest active channel
      const channels: ('meta' | 'display' | 'pdooh' | 'audio')[] = ['meta', 'display', 'pdooh', 'audio'];
      const largest = channels.reduce((a, b) => recs[a] >= recs[b] ? a : b);
      recs[largest] += diff;
    }

    return recs;
  }, [formData.campaign_objective, formData.ad_type, branchScreenCounts]);

  // Apply budget recommendation
  const applyBudgetRecommendation = useCallback((silent = false) => {
    const recommendation = getChannelBudgetRecommendation();
    const newBudgets = {
      budget_meta: Math.round(formData.total_budget * recommendation.meta / 100),
      budget_display: Math.round(formData.total_budget * recommendation.display / 100),
      budget_pdooh: recommendation.pdooh > 0 ? Math.round(formData.total_budget * recommendation.pdooh / 100) : 0,
      budget_audio: Math.round(formData.total_budget * recommendation.audio / 100),
    };
    // Ensure rounding doesn't leave unallocated budget — assign remainder to largest channel
    const allocated = newBudgets.budget_meta + newBudgets.budget_display + newBudgets.budget_pdooh + newBudgets.budget_audio;
    const remainder = formData.total_budget - allocated;
    if (remainder !== 0) {
      const budgetKeys: ('budget_meta' | 'budget_display' | 'budget_pdooh' | 'budget_audio')[] = ['budget_meta', 'budget_display', 'budget_pdooh', 'budget_audio'];
      const largest = budgetKeys.reduce((a, b) => newBudgets[a] >= newBudgets[b] ? a : b);
      newBudgets[largest] += remainder;
    }
    setFormData(prev => ({
      ...prev,
      ...newBudgets,
      channel_meta: newBudgets.budget_meta > 0,
      channel_display: newBudgets.budget_display > 0,
      channel_pdooh: newBudgets.budget_pdooh > 0,
      channel_audio: newBudgets.budget_audio > 0,
    }));
    setRecommendationApplied(true);
    // Clear branch overrides when applying recommendation
    setBranchChannelOverrides({});
    if (!silent) {
      toast.success('Suositus toteutettu!');
    }
  }, [getChannelBudgetRecommendation, formData.total_budget]);

  // Auto-apply recommendation when first entering budget step
  useEffect(() => {
    if (currentStep === 3 && !recommendationApplied && formData.total_budget > 0) {
      applyBudgetRecommendation(true);
    }
  }, [currentStep, recommendationApplied, formData.total_budget, applyBudgetRecommendation]);

  // Fetch screens when branches or radii change
  // Optimized: fetch all screens once, then compute per-branch counts locally
  useEffect(() => {
    let cancelled = false;

    const fetchBranchScreens = async () => {
      if (formData.branch_ids.length === 0) {
        setBranchScreenCounts({});
        setCombinedBranchScreens([]);
        return;
      }

      try {
        // Fetch ALL active screens once (instead of N separate queries)
        const { data: allActiveScreens, error } = await supabase
          .from('media_screens')
          .select('*')
          .eq('status', 'active')
          .limit(10000);

        if (error || !allActiveScreens || cancelled) return;

        const screenCounts: Record<string, number> = {};
        const combinedScreens: MediaScreen[] = [];
        const seenScreenIds = new Set<number>();

        // Haversine distance calculation (meters)
        const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
          const R = 6371e3;
          const φ1 = lat1 * Math.PI / 180;
          const φ2 = lat2 * Math.PI / 180;
          const Δφ = (lat2 - lat1) * Math.PI / 180;
          const Δλ = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };

        for (const branchId of formData.branch_ids) {
          const branch = branches.find(b => b.id === branchId);
          if (!branch) continue;

          const lat = branch.latitude ?? branch.coordinates?.lat ?? 0;
          const lng = branch.longitude ?? branch.coordinates?.lng ?? 0;
          if (!lat || !lng) { screenCounts[branchId] = 0; continue; }

          const radiusKm = branchRadiusSettings[branchId]?.radius || 10;
          const radiusMeters = radiusKm * 1000;

          let branchCount = 0;
          for (const screen of allActiveScreens) {
            if (!screen.latitude || !screen.longitude) continue;
            const dist = calcDistance(lat, lng, screen.latitude, screen.longitude);
            if (dist <= radiusMeters) {
              branchCount++;
              if (!seenScreenIds.has(screen.id)) {
                seenScreenIds.add(screen.id);
                combinedScreens.push(screen);
              }
            }
          }
          screenCounts[branchId] = branchCount;
        }

        if (!cancelled) {
          setBranchScreenCounts(screenCounts);
          setCombinedBranchScreens(combinedScreens);
        }
      } catch (error) {
        console.error('Error loading branch screens:', error);
      }
    };

    // Debounce to avoid excessive re-fetching during rapid slider changes
    const timer = setTimeout(fetchBranchScreens, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [formData.branch_ids, formData.ad_type, branchRadiusSettings, branches]);

  // Auto-initialize branch budget allocations when selected branches change
  useEffect(() => {
    if (formData.branch_ids.length <= 1) {
      setBranchBudgetAllocations({});
      return;
    }
    setBranchBudgetAllocations(prev => {
      const selectedIds = new Set(formData.branch_ids);
      // Check if all selected branches already have allocations
      const existingIds = new Set(Object.keys(prev).filter(id => selectedIds.has(id)));
      if (existingIds.size === selectedIds.size && [...selectedIds].every(id => existingIds.has(id))) {
        // Clean up removed branches only
        const cleaned: Record<string, number> = {};
        for (const id of formData.branch_ids) {
          cleaned[id] = prev[id] ?? 0;
        }
        return cleaned;
      }
      // Initialize evenly
      const evenPct = Math.floor(100 / formData.branch_ids.length);
      return Object.fromEntries(
        formData.branch_ids.map((id, i) => [
          id,
          i === formData.branch_ids.length - 1
            ? 100 - evenPct * (formData.branch_ids.length - 1)
            : evenPct
        ])
      );
    });
  }, [formData.branch_ids]);

  // Creative config - initialize with defaults, will update based on selections
  const [creativeConfig, setCreativeConfig] = useState<CreativeConfig>({
    headline: '',
    subheadline: '',
    offer: '49',
    servicePrices: {},
    offerTitle: '', // Empty so service name is used by default
    offerSubtitle: 'uusille asiakkaille',
    offerDate: 'Varaa viimeistään<br/>28.10.',
    cta: 'Varaa aika',
    backgroundImage: null,
    useCustomBackground: false,
    priceBubbleMode: 'price',
    targetUrl: 'https://terveystalo.com/suunterveystalo',
    audioFile: null,
    selectedAudio: '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav',
    disclaimerText: 'Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.',
    generalBrandMessage: 'Hymyile.<br>Olet hyvissä käsissä.',
    videoFile: null,
    selectedVideo: '/meta/vids/nainen.mp4',
    conceptType: 'service',
    multiLocationMode: 'single',
    metaPrimaryText: 'Suun Terveystalo – Sujuvampaa suunterveyttä. Varaa aika helposti verkossa!',
    metaHeadline: 'Varaa aika Suun Terveystaloon',
    metaDescription: 'Kokeneet hammaslääkärit ja nopea ajanvaraus. Tervetuloa!',
  });

  // Video library state
  const [videoLibrary, setVideoLibrary] = useState<Array<{
    id: string;
    name: string;
    url: string;
    thumbnail: string;
    duration: number;
    uploadedAt: string;
  }>>([]);

  // Creatives step tab state
  const [creativeTab, setCreativeTab] = useState<'content' | 'media' | 'meta' | 'audio'>('content');

  // Sync ad_type choice with creative_type
  useEffect(() => {
    if (formData.ad_type) {
      setFormData(prev => ({ ...prev, creative_type: formData.ad_type as CreativeType }));
    }
  }, [formData.ad_type]);

  // Preview size state - dynamically loaded from templates
  const [availableSizes, setAvailableSizes] = useState<PreviewSize[]>(PREVIEW_SIZES);
  const [previewSize, setPreviewSize] = useState<PreviewSize>(PREVIEW_SIZES[2]); // Default to 300x600

  // Preview service state - for switching between services when multiple are selected
  const [previewServiceId, setPreviewServiceId] = useState<string | null>(null);

  // Preview branch state - for switching between branches when multiple are selected
  const [previewBranchId, setPreviewBranchId] = useState<string | null>(null);

  // Update available sizes when templates are loaded
  useEffect(() => {
    if (dbTemplates.length > 0) {
      // Build available sizes from database templates
      // Use a plain object to dedupe by size+type combination (unique key)
      // Note: Can't use Map because it's shadowed by lucide-react's Map icon import
      const sizesRecord: Record<string, PreviewSize> = {};

      dbTemplates
        .filter(t => t.active === true || t.active === 'true')
        .forEach(t => {
          const sizeKey = t.size;
          const type = t.type as 'display' | 'pdooh' | 'meta';

          // Create unique ID combining size and type
          const uniqueId = `${sizeKey}-${type}`;

          // Skip if we already have this size+type combo
          if (sizesRecord[uniqueId]) return;

          // Map to icon and label
          let icon = RectangleVertical;
          let label = sizeKey;

          if (sizeKey === '300x300') { icon = Square; label = 'Neliö'; }
          else if (sizeKey === '300x431') { icon = RectangleVertical; label = 'Pysty'; }
          else if (sizeKey === '300x600') { icon = RectangleVertical; label = 'Half-page'; }
          else if (sizeKey === '620x891') { icon = RectangleVertical; label = 'Iso pysty'; }
          else if (sizeKey === '980x400') { icon = RectangleHorizontal; label = 'Vaaka'; }
          else if (sizeKey === '1080x1920') {
            icon = Smartphone;
            label = type === 'meta' ? 'Stories' : type === 'pdooh' ? 'PDOOH' : 'Pysty';
          }
          else if (sizeKey === '1080x1080') { icon = Instagram; label = 'Feed'; }

          sizesRecord[uniqueId] = {
            id: uniqueId, // Use unique ID combining size and type
            name: sizeKey,
            width: t.width,
            height: t.height,
            icon,
            label,
            category: ({
              display: 'Display',
              pdooh: 'PDOOH',
              meta: 'Meta'
            })[type] || type.charAt(0).toUpperCase() + type.slice(1) as 'Display' | 'PDOOH' | 'Meta',
            templateType: type // Store the actual template type for lookup
          };
        });

      const sizesFromDb = Object.values(sizesRecord);

      console.log('[Size Debug] Available sizes from DB:', sizesFromDb.map(s => ({ id: s.id, category: s.category, label: s.label })));

      if (sizesFromDb.length > 0) {
        setAvailableSizes(sizesFromDb);
        // Set default to 300x600-display if available, otherwise first size
        const defaultSize = sizesFromDb.find(s => s.id === '300x600-display') || sizesFromDb[0];
        setPreviewSize(defaultSize);
      }
    }
  }, [dbTemplates]);

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter items - show all branches (including inactive) so all toimipisteet are available for radius selection
  const activeServices = services.filter(s => s.active);
  const activeBranches = branches.filter(b => b.coordinates || (b.latitude && b.longitude));

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
  const selectedServices = useMemo(() => services.filter(s => formData.service_ids.includes(s.id)), [services, formData.service_ids]);
  const selectedService = selectedServices[0] || services.find(s => s.id === formData.service_id);
  const selectedBranches = useMemo(() => branches.filter(b => formData.branch_ids.includes(b.id)), [branches, formData.branch_ids]);
  const selectedBranch = selectedBranches[0] || branches.find(b => b.id === formData.branch_id);

  // Auto-select first branch for preview when branches change
  useEffect(() => {
    if (selectedBranches.length > 0 && (!previewBranchId || !selectedBranches.find(b => b.id === previewBranchId))) {
      setPreviewBranchId(selectedBranches[0].id);
    }
  }, [selectedBranches, previewBranchId]);

  // Preview service - allows switching between services when multiple are selected
  const previewService = selectedServices.find(s => s.id === previewServiceId) || selectedService;

  // Update preview service when services change
  useEffect(() => {
    if (selectedServices.length > 0 && !previewServiceId) {
      setPreviewServiceId(selectedServices[0].id);
    } else if (selectedServices.length > 0 && previewServiceId && !selectedServices.find(s => s.id === previewServiceId)) {
      // If current preview service is no longer selected, switch to first selected
      setPreviewServiceId(selectedServices[0].id);
    }
  }, [selectedServices, previewServiceId]);

  // Auto-populate per-service prices when services change
  useEffect(() => {
    if (selectedServices.length > 0) {
      setCreativeConfig(prev => {
        const newPrices = { ...prev.servicePrices };
        for (const svc of selectedServices) {
          if (!newPrices[svc.id]) {
            newPrices[svc.id] = (svc.default_price || '').replace(/€/g, '').trim() || '49';
          }
        }
        // Remove prices for deselected services
        for (const id of Object.keys(newPrices)) {
          if (!selectedServices.find(s => s.id === id)) {
            delete newPrices[id];
          }
        }
        return { ...prev, servicePrices: newPrices };
      });
    }
  }, [selectedServices]);

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

  // Update creative config based on service and branch selections
  useEffect(() => {
    setCreativeConfig(prev => ({
      ...prev,
      conceptType: selectedService?.code === 'yleinen-brandiviesti' ? 'brandviesti' : 'service',
      multiLocationMode: selectedBranches.length > 1 ? 'multi' : 'single',
    }));
  }, [selectedService?.code, selectedBranches.length]);

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

    // Simplified: Only update the changed channel, don't rebalance others
    const newBudgets: Partial<CampaignFormData> = {};

    if (changedChannel === 'meta') newBudgets.budget_meta = newValue;
    if (changedChannel === 'display') newBudgets.budget_display = newValue;
    if (changedChannel === 'pdooh') newBudgets.budget_pdooh = newValue;
    if (changedChannel === 'audio') newBudgets.budget_audio = newValue;

    setFormData(prev => ({ ...prev, ...newBudgets }));
  }, [formData]);

  // Toggle channel
  const toggleChannel = (channel: 'meta' | 'display' | 'pdooh' | 'audio') => {
    const channelKey = `channel_${channel}` as keyof CampaignFormData;
    const newEnabled = !formData[channelKey];

    setFormData(prev => {
      const updated = { ...prev, [channelKey]: newEnabled };

      if (!newEnabled) {
        // Disabling: zero out the channel budget
        if (channel === 'meta') updated.budget_meta = 0;
        if (channel === 'display') updated.budget_display = 0;
        if (channel === 'pdooh') updated.budget_pdooh = 0;
        if (channel === 'audio') updated.budget_audio = 0;

        // Redistribute freed budget among remaining enabled channels
        const freed = prev[`budget_${channel}` as keyof typeof prev] as number || 0;
        const remainingChannels: ('meta' | 'display' | 'pdooh' | 'audio')[] = ['meta', 'display', 'pdooh', 'audio']
          .filter(ch => ch !== channel && updated[`channel_${ch}` as keyof typeof updated]) as any;

        if (remainingChannels.length > 0 && freed > 0) {
          const extra = Math.floor(freed / remainingChannels.length);
          const leftover = freed - extra * remainingChannels.length;
          remainingChannels.forEach((ch, i) => {
            const key = `budget_${ch}` as keyof typeof updated;
            (updated as any)[key] = ((updated as any)[key] || 0) + extra + (i === 0 ? leftover : 0);
          });
        }
      } else {
        // Enabling: take proportional share from existing channels
        const enabledChannels: ('meta' | 'display' | 'pdooh' | 'audio')[] = ['meta', 'display', 'pdooh', 'audio']
          .filter(ch => updated[`channel_${ch}` as keyof typeof updated]) as any;
        const count = enabledChannels.length;
        const share = Math.floor(prev.total_budget / count);
        const leftover = prev.total_budget - share * count;
        enabledChannels.forEach((ch, i) => {
          const key = `budget_${ch}` as keyof typeof updated;
          (updated as any)[key] = share + (i === 0 ? leftover : 0);
        });
      }

      return updated;
    });
  };

  // Get channel budget recommendation
  const getChannelRecommendation = (channel: 'meta' | 'display' | 'pdooh' | 'audio'): string | undefined => {
    const total = formData.total_budget;
    if (total <= 0) return undefined;

    const recommendations: Record<string, { pct: number; min: number }> = {
      meta: { pct: 0.40, min: 150 },
      display: { pct: 0.25, min: 100 },
      pdooh: { pct: 0.30, min: 200 },
      audio: { pct: 0.05, min: 50 },
    };

    const rec = recommendations[channel];
    const recommended = Math.max(Math.round(total * rec.pct), rec.min);
    const currentBudget = formData[`budget_${channel}` as keyof CampaignFormData] as number;

    if (currentBudget >= recommended) return undefined;
    return `Suositus: ${recommended.toLocaleString('fi-FI')}€ (${Math.round(rec.pct * 100)}% kokonaisbudjetista)`;
  };

  // Update total budget - re-apply recommendation ratios, or divide equally as fallback
  const updateTotalBudget = (newTotal: number) => {
    // If recommendation was already applied, re-apply with the new total
    if (recommendationApplied) {
      const recommendation = getChannelBudgetRecommendation();
      const newBudgets = {
        budget_meta: Math.round(newTotal * recommendation.meta / 100),
        budget_display: Math.round(newTotal * recommendation.display / 100),
        budget_pdooh: recommendation.pdooh > 0 ? Math.round(newTotal * recommendation.pdooh / 100) : 0,
        budget_audio: Math.round(newTotal * recommendation.audio / 100),
      };
      // Fix rounding so channel sum === newTotal
      const allocated = newBudgets.budget_meta + newBudgets.budget_display + newBudgets.budget_pdooh + newBudgets.budget_audio;
      const remainder = newTotal - allocated;
      if (remainder !== 0) {
        const budgetKeys: ('budget_meta' | 'budget_display' | 'budget_pdooh' | 'budget_audio')[] = ['budget_meta', 'budget_display', 'budget_pdooh', 'budget_audio'];
        const largest = budgetKeys.reduce((a, b) => newBudgets[a] >= newBudgets[b] ? a : b);
        newBudgets[largest] += remainder;
      }
      setFormData(prev => ({
        ...prev,
        total_budget: newTotal,
        ...newBudgets,
        channel_meta: newBudgets.budget_meta > 0,
        channel_display: newBudgets.budget_display > 0,
        channel_pdooh: newBudgets.budget_pdooh > 0,
        channel_audio: newBudgets.budget_audio > 0,
      }));
      setBranchChannelOverrides({});
      return;
    }

    // Fallback: divide equally among enabled channels (with rounding fix)
    setFormData(prev => {
      const enabledChannels: ('budget_meta' | 'budget_display' | 'budget_pdooh' | 'budget_audio')[] = [];
      if (prev.channel_meta) enabledChannels.push('budget_meta');
      if (prev.channel_display) enabledChannels.push('budget_display');
      if (prev.channel_pdooh) enabledChannels.push('budget_pdooh');
      if (prev.channel_audio) enabledChannels.push('budget_audio');
      const count = enabledChannels.length;
      const channelBudget = count > 0 ? Math.floor(newTotal / count) : 0;
      const leftover = count > 0 ? newTotal - channelBudget * count : 0;

      return {
        ...prev,
        total_budget: newTotal,
        budget_meta: prev.channel_meta ? channelBudget + (enabledChannels.indexOf('budget_meta') === 0 ? leftover : 0) : 0,
        budget_display: prev.channel_display ? channelBudget + (enabledChannels.indexOf('budget_display') === 0 ? leftover : 0) : 0,
        budget_pdooh: prev.channel_pdooh ? channelBudget + (enabledChannels.indexOf('budget_pdooh') === 0 ? leftover : 0) : 0,
        budget_audio: prev.channel_audio ? channelBudget + (enabledChannels.indexOf('budget_audio') === 0 ? leftover : 0) : 0,
      };
    });
  };

  // Open Terveystalo budget edit dialog
  const openTerveystaloBudgetEdit = () => {
    const currentTotal = getTotalTerveystaloBudget();
    setTerveystaloBudgetEdit({
      isOpen: true,
      newValue: currentTotal.total,
      isLoading: false,
    });
  };

  // Confirm Terveystalo budget change
  const confirmTerveystaloBudgetChange = async () => {
    const oldTotal = getTotalTerveystaloBudget().total;
    const newTotal = terveystaloBudgetEdit.newValue;

    if (newTotal === oldTotal) {
      setTerveystaloBudgetEdit({ isOpen: false, newValue: 0, isLoading: false });
      return;
    }

    // Set loading state
    setTerveystaloBudgetEdit(prev => ({ ...prev, isLoading: true }));

    try {
      // Update app_settings
      const { error } = await supabase
        .from('app_settings')
        .update({
          value: String(newTotal),
          updated_at: new Date().toISOString()
        })
        .eq('key', 'total_monthly_budget');

      if (error) throw error;

      // Update local state
      setTotalMonthlyBudget(newTotal);

      // Log the change with user info
      await supabase.from('activity_logs').insert({
        user_id: user?.id,
        action: 'terveystalo_budget_updated',
        entity_type: 'system',
        details: {
          user_name: user?.name || user?.email || 'Unknown',
          old_budget: oldTotal,
          new_budget: newTotal,
          difference: newTotal - oldTotal,
          message: `${user?.name || user?.email || 'Unknown'} muutti Terveystalon kokonaisbudjettia: ${oldTotal.toLocaleString('fi-FI')}€ → ${newTotal.toLocaleString('fi-FI')}€`
        }
      });

      // Close dialog and reset loading
      setTerveystaloBudgetEdit({ isOpen: false, newValue: 0, isLoading: false });

      toast.success(`Kokonaisbudjetti päivitetty: ${oldTotal.toLocaleString('fi-FI')}€ → ${newTotal.toLocaleString('fi-FI')}€`);
    } catch (error) {
      console.error('Failed to update Terveystalo budget:', error);
      toast.error('Budjetin päivitys epäonnistui');
      setTerveystaloBudgetEdit(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (formData.service_ids.length === 0) {
          toast.error('Valitse vähintään yksi palvelu');
          return false;
        }
        if (!formData.ad_type) {
          toast.error('Valitse mainonnan tyyppi');
          return false;
        }
        break;
      case 1:
        if (formData.branch_ids.length === 0) {
          toast.error('Valitse vähintään yksi toimipiste');
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
        // Check if channel budgets match total budget
        const channelSum = enabledChannelsBudget;
        if (channelSum !== formData.total_budget) {
          if (channelSum === 0) {
            toast.error('Aseta budjetit valituille kanaville');
          } else if (channelSum > formData.total_budget) {
            toast.error(`Kanavien budjetit (${channelSum}€) ylittävät kampanjan budjetin (${formData.total_budget}€). Vähennä kanavien budjetteja.`);
          } else {
            toast.error(`Kampanjan budjettia (${formData.total_budget}€) ei ole käytetty kokonaan. Käytä ${formData.total_budget - channelSum}€ lisää kanaville.`);
          }
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
    // Parse the size ID which may include type suffix (e.g., '1080x1920-meta', '300x600-display')
    let baseSize = sizeId;
    let templateType: string | undefined;

    if (sizeId.includes('-')) {
      const parts = sizeId.split('-');
      baseSize = parts[0];
      templateType = parts[1]; // 'display', 'pdooh', 'meta'
    }

    // Debug: Log available templates
    console.log('[Template Debug] Looking for size:', sizeId, 'baseSize:', baseSize, 'type:', templateType);
    console.log('[Template Debug] Available templates:', dbTemplates.map(t => ({ name: t.name, size: t.size, type: t.type, active: t.active })));

    // If we have a type suffix, find exact match
    if (templateType) {
      const found = dbTemplates.find(t => t.size === baseSize && t.type === templateType && t.active);
      console.log('[Template Debug] With type filter, found:', found?.name);
      return found;
    }

    // Legacy fallback: Handle 1080x1080 as Meta size (square format)
    if (sizeId === '1080x1080') {
      const found = dbTemplates.find(t => t.size === '1080x1080' && t.type === 'meta' && t.active);
      console.log('[Template Debug] 1080x1080 meta, found:', found?.name);
      return found;
    }

    // For sizes without type suffix, find first active non-meta template (backward compat)
    const found = dbTemplates.find(t => t.size === baseSize && t.type !== 'meta' && t.active);
    console.log('[Template Debug] Without type filter, found:', found?.name);
    return found;
  }, [dbTemplates]);

  // Build template variables from creativeConfig + branch data
  const buildTemplateVariables = useCallback((showAddress: boolean): Record<string, string> => {
    const baseUrl = window.location.origin;
    // Use previewService for preview context, fallback to selectedService
    const serviceForPreview = previewService || selectedService;
    const isGeneralBrandMessage = serviceForPreview?.code === 'yleinen-brandiviesti';

    // When a specific preview branch is selected, use it as the single branch for preview
    const previewBranch = previewBranchId ? selectedBranches.find(b => b.id === previewBranchId) : null;
    const branchesForPreview = previewBranch ? [previewBranch] : selectedBranches;

    // Get cities for multi-location display
    const uniqueCities = [...new Set(branchesForPreview.map(b => b.city))].sort();
    const isMultiLocation = branchesForPreview.length > 1;
    const isMultiService = selectedServices.length > 1;

    // Get service name
    const serviceName = serviceForPreview?.name_fi || serviceForPreview?.name || 'Palvelu';
    // Convert service name to elative form (e.g., "Suuhygienistikäynti" -> "Suuhygienistikäynnistä")
    let serviceNameElative = serviceName.toLowerCase();
    if (serviceNameElative.endsWith('äynti')) {
      serviceNameElative = serviceNameElative.slice(0, -5) + 'äynnistä';
    } else if (serviceNameElative.endsWith('nti')) {
      serviceNameElative = serviceNameElative.slice(0, -3) + 'nnistä';
    } else if (serviceNameElative.endsWith('us')) {
      serviceNameElative = serviceNameElative.slice(0, -2) + 'uksesta';
    } else {
      serviceNameElative = serviceNameElative + 'sta';
    }

    // Use preview branch or fall back to first selected branch
    const activeBranch = previewBranch || selectedBranch;

    // Check if the preview branch belongs to a bundle whose locations are ALL selected
    // E.g., if previewing "Iso Omena" and all Espoo branches (Leppävaara, Iso Omena, Lippulaiva) are selected,
    // show the bundle address "Leppävaara • Iso Omena • Lippulaiva" instead of just "Iso Omena"
    const activeBranchName = (activeBranch?.short_name || activeBranch?.name || activeBranch?.city || '');
    const branchBundle = getBundleForBranch(activeBranchName);
    const allSelectedNames = selectedBranches.map(b => (b.short_name || b.name || b.city).replace('Suun Terveystalo ', '').replace('Terveystalo ', '').trim());
    const bundleFullySelected = branchBundle
      ? branchBundle.locations.every(loc => allSelectedNames.includes(loc))
      : false;
    const matchingBundle = bundleFullySelected ? branchBundle : null;

    // Build location text for address position
    // This goes in the {{branch_address}} placeholder
    let locationText = '';
    if (matchingBundle) {
      // Bundle match: use predefined address text (e.g., "Leppävaara • Iso Omena • Lippulaiva")
      locationText = matchingBundle.bundleAddress;
    } else if (isMultiLocation) {
      // Multi-location: "Kamppi • Itäkeskus • Ogeli • Redi" style
      locationText = uniqueCities.join(' \u2022 ');
    } else {
      // Single location: Use actual address - e.g., "Torikatu 1, Lahti"
      const city = activeBranch?.city || '';
      const address = activeBranch?.address || '';
      locationText = address ? `${address}, ${city}` : city;
    }

    // Build branch name for message (e.g., "Lahden Suun Terveystalo")
    const branchName = activeBranch?.name || activeBranch?.city || '';

    // Build message for subheadline position
    // This goes in the {{subheadline}} placeholder
    let messageText = creativeConfig.subheadline;
    if (!messageText) {
      if (matchingBundle) {
        // Bundle match: use predefined copy text
        messageText = matchingBundle.bundleCopy;
      } else if (isGeneralBrandMessage) {
        // Brand message with conjugated city name
        if (isMultiLocation) {
          messageText = 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
        } else {
          const cityConj = activeBranch?.city ? getConjugatedCity(activeBranch.city) : '';
          messageText = `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`;
        }
      } else if (isMultiService) {
        // Multi-service
        messageText = `Sujuvampaa suunterveyttä aina ${serviceNameElative} erikoisosaamista vaativiin hoitoihin.`;
      } else {
        // Single service with conjugated city name
        if (isMultiLocation) {
          messageText = 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
        } else {
          const cityConj = activeBranch?.city ? getConjugatedCity(activeBranch.city) : '';
          messageText = `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`;
        }
      }
    }

    // Headline - always use the user's input or default
    // Use | in default which will be converted to <br> in renderTemplateHtml
    const headlineText = creativeConfig.headline || 'Hymyile.|Olet hyvissä käsissä.';

    // Check if the current template uses split structure (separate {{headline_line2}} placeholder)
    const template = getTemplateForSize(previewSize.id);
    const isSplitTemplate = template?.html_template?.includes('{{headline_line2}}');

    let headlineValue: string;
    let headlineLine2Value: string | undefined;

    if (isSplitTemplate) {
      // For split templates, split headline at | into two separate elements
      // Each element has its own font size in the template (e.g. PDOOH: Hymyile=89px, OletHyvissKS=79px)
      const parts = headlineText.split('|');
      headlineValue = parts[0]?.trim() || headlineText;
      headlineLine2Value = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
    } else {
      // For combined templates (single {{headline}} placeholder),
      // pass the full headline with | - do NOT split it
      headlineValue = headlineText;
      headlineLine2Value = undefined; // Don't pass headline_line2 for combined templates
    }

    // Meta templates: Scene 2 uses headline + subheadline as TWO separate animation elements
    // headline = "Hymyile." (slides in, moves up), subheadline = "Olet hyvissä käsissä." (appears below)
    // The brand/service message is encoded in Scene 3 (blue bg text), NOT in Scene 2
    const isMetaTemplate = template?.type === 'meta';
    if (isMetaTemplate) {
      const parts = headlineText.split('|');
      headlineValue = parts[0]?.trim() || 'Hymyile.';
      headlineLine2Value = undefined;
      messageText = parts.length > 1 ? parts.slice(1).join(' ').trim() : 'Olet hyvissä käsissä.';
    }

    // Offer title - use service name if user hasn't entered custom text
    let offerTitle = creativeConfig.offerTitle;
    if (!offerTitle && !isGeneralBrandMessage) {
      offerTitle = serviceName; // e.g., "Suuhygienistikäynti"

      // Add hyphenation for long Finnish service names
      // Using | which will be converted to <br> in renderTemplateHtml
      const hyphenationMap: Record<string, string> = {
        'Suuhygienistikäynti': 'Suuhygienisti-|käynti',
        'Hammastarkastus': 'Hammas-|tarkastus',
      };

      // Match the service name with hyphenation (handle variations with/without hyphen)
      const cleanServiceName = serviceName.replace(/-/g, '');
      if (hyphenationMap[cleanServiceName]) {
        offerTitle = hyphenationMap[cleanServiceName];
      } else if (hyphenationMap[serviceName]) {
        offerTitle = hyphenationMap[serviceName];
      }
    }

    // Price — use per-service price for the current preview service
    const priceValue = (serviceForPreview && creativeConfig.servicePrices[serviceForPreview.id]) || creativeConfig.offer || '49';

    // For brand message, don't show offer
    const finalOfferTitle = isGeneralBrandMessage ? '' : offerTitle;
    const finalPrice = isGeneralBrandMessage ? '' : priceValue;

    // Branch address - shows the location text when showAddress is true
    const finalAddress = showAddress ? locationText : '';

    // Scale badge price font size for 3+ digit prices
    const priceDigits = String(finalPrice).replace(/[^0-9]/g, '').length;
    const badgePriceSize = priceDigits >= 3 ? '62' : '82';
    const badgeEuroSize = priceDigits >= 3 ? '40' : '52';

    return {
      // Text content
      title: 'Suun Terveystalo',
      headline: headlineValue,
      // For split templates, headline_line2 contains the second part of the headline (e.g. "Olet hyvissä käsissä.")
      // For combined templates, headline_line2 is undefined (not passed)
      ...(headlineLine2Value !== undefined && { headline_line2: headlineLine2Value }),
      subheadline: messageText,
      offer_title: finalOfferTitle,
      offer_subtitle: isGeneralBrandMessage ? '' : (creativeConfig.offerSubtitle || 'uusille asiakkaille'),
      price: finalPrice,
      currency: '€',
      // CTA removed from PDOOH creatives, only show on other channels
      cta_text: (template?.type === 'pdooh') ? '' : (creativeConfig.cta || 'Varaa aika'),
      branch_address: finalAddress,

      // Scene 3 text lines — layout depends on template type
      // Meta: 4 lines with suun.webm video hardcoded before line2 ("terveyttä")
      // PDOOH: 5 lines with "suun" as text in line2
      ...(isMetaTemplate ? {
        scene3_line1: 'Sujuvampaa',
        scene3_line2: 'terveyttä',
        scene3_line3: isMultiLocation ? '' : (activeBranch?.city ? getConjugatedCity(activeBranch.city) : ''),
        scene3_line4: 'Suun Terveystalossa.',
      } : {
        scene3_line1: 'Sujuvampaa',
        scene3_line2: 'suun',
        scene3_line3: 'terveyttä',
        scene3_line4: matchingBundle
          ? matchingBundle.bundleCopy.match(/suunterveyttä\s+(\S+)/)?.[1] || (activeBranch?.city ? getConjugatedCity(activeBranch.city) : 'Oulun')
          : (activeBranch?.city ? getConjugatedCity(activeBranch.city) : 'Oulun'),
        scene3_line5: isMultiLocation ? 'Suun Terveystaloissa.' : 'Suun Terveystalossa.',
      }),

      city_name: activeBranch?.city || 'Oulu',

      // Audio & video
      audio_track: encodeURI(creativeConfig.selectedAudio || '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav'),
      background_video: encodeURI(creativeConfig.selectedVideo || '/meta/vids/nainen.mp4'),

      // Images (for Meta templates - two scene images)
      scene1_image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop&crop=faces',
      scene2_image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop&crop=faces',

      // Images (for PDOOH templates - single image + logo)
      logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
      artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork-700w.png`,
      image_url: creativeConfig.backgroundImage || `${baseUrl}/refs/assets/nainen-980w.jpg`,
      // Pricetag position: lower for mies image to avoid covering face
      pricetag_top: (creativeConfig.backgroundImage || '').includes('mies') ? '920px' : '720.62px',
      image_url_1: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop',
      image_url_2: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop',

      // Styling - fonts and colors
      font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap',
      font_family: 'Inter',
      bg_color: '#0a1e5c',
      text_color: '#fff',
      wipe_color: '#0a3d91',
      badge_color: '#0a3d91',
      scene3_text_dim: '#6b82b8',
      scene3_text_bright_color: '#ffffff',
      scene4_addr_color: 'rgba(255,255,255,0.6)',

      // SVG badge path
      badge_svg_path: 'M 145,10 C 175,8   205,15  230,35 Q 258,55  270,90 C 280,120  282,155  272,185 Q 260,220  235,248 C 210,272  175,285  140,284 C 105,283  70,270   45,245 Q 20,218   10,180 C 2,148    5,112   18,82 Q 32,48    65,28 C 90,14   118,10  145,10 Z',

      // Animation timing (all percentages)
      animation_duration: '15',
      scene1_end: '44',
      scene1_fade: '48',
      scene1_zoom_duration: '8',
      scene1_zoom_scale: '1.08',
      scene2_start: '42',
      scene2_fade: '47',
      logo_end: '54',
      logo_hide: '57',
      badge_show: '27',
      badge_pop: '30',
      badge_pop_scale: '1.05',
      badge_hold: '32',
      badge_end: '55',
      badge_hide: '57',
      headline_show: '27',
      headline_pop: '30',
      headline_hold: '35',
      headline_move: '38',
      headline_end: '55',
      headline_hide: '57',
      subline_show: '36',
      subline_pop: '40',
      subline_end: '55',
      subline_hide: '57',
      cw1_show: '48',
      cw1_pop: '50',
      cw1_hold: '54',
      cw1_wipe: '57',
      cw2_show: '49',
      cw2_pop: '51',
      cw2_hold: '54',
      cw2_wipe: '57',
      cw3_show: '49',
      cw3_pop: '51.5',
      cw3_hold: '54',
      cw3_wipe: '57',
      cw4_show: '49.5',
      cw4_pop: '52',
      cw4_hold: '54',
      cw4_wipe: '57',
      cw5_show: '50',
      cw5_pop: '52',
      cw5_hold: '54',
      cw5_wipe: '57',
      cw6_show: '50',
      cw6_pop: '52.5',
      cw6_hold: '54',
      cw6_wipe: '57',
      cw7_show: '50.5',
      cw7_pop: '53',
      cw7_hold: '54',
      cw7_wipe: '57',
      cw_big_show: '55',
      cw_big_pop: '56',
      cw_big_hold: '59',
      cw_big_wipe: '8',
      scene3_start: '58',
      scene3_show: '60',
      scene3_end: '82',
      scene3_hide: '85',
      scene3_text_dim_start: '60',
      scene3_text_bright: '67',
      scene3_arc: '72',
      scene3_logo_show: '61',
      scene3_logo_pop: '64',
      scene3_logo_end: '82',
      scene3_logo_hide: '85',
      scene4_start: '83',
      scene4_show: '86',
      scene4_logo_show: '84',
      scene4_logo_pop: '87',
      scene4_addr_show: '89',
      scene4_addr_pop: '94',

      // Sizes - 1080x1080 default values
      logo_bottom: '65',
      logo_height: '52',
      badge_top: '20',
      badge_left: '15',
      badge_size: '290',
      badge_pad_bottom: '5',
      badge_pad_right: '10',
      badge_label_size: '26',
      badge_label_weight: '700',
      badge_price_size: badgePriceSize,
      badge_price_weight: '900',
      badge_price_lineheight: '0.85',
      badge_euro_size: badgeEuroSize,
      badge_euro_weight: '700',
      badge_euro_top: '6',
      badge_euro_left: '2',
      headline_top: '50',
      headline_size: '70',
      headline_weight: '800',
      headline_start_y: '30',
      headline_end_y: '90',
      subline_top: '50',
      subline_size: '70',
      subline_weight: '800',
      subline_start_y: '10',
      subline_end_y: '10',
      subline_lineheight: '1.15',
      text_shadow: '2',

      // Circle wipe sizes and positions
      cw1_size: '140',
      cw1_bottom: '-20',
      cw1_left: '-30',
      cw1_scale: '15',
      cw2_size: '100',
      cw2_bottom: '90',
      cw2_left: '60',
      cw2_scale: '15',
      cw3_size: '70',
      cw3_bottom: '50',
      cw3_left: '150',
      cw3_scale: '18',
      cw4_size: '55',
      cw4_bottom: '160',
      cw4_left: '20',
      cw4_scale: '22',
      cw5_size: '90',
      cw5_bottom: '130',
      cw5_left: '130',
      cw5_scale: '15',
      cw6_size: '120',
      cw6_bottom: '30',
      cw6_left: '200',
      cw6_scale: '12',
      cw7_size: '45',
      cw7_bottom: '190',
      cw7_left: '100',
      cw7_scale: '28',
      cw_big_size: '400',
      cw_big_bottom: '-200',
      cw_big_left: '-200',
      cw_big_scale: '8',

      // Scene 3 styling
      scene3_text_size: '78',
      scene3_text_weight: '800',
      scene3_text_lineheight: '1.15',
      scene3_text_pad: '60',
      scene3_text_style: 'italic',
      scene3_arc_angle: '-18',
      scene3_arc_scale: '0.82',
      scene3_logo_bottom: '95',
      scene3_logo_height: '46',

      // Scene 4 styling
      scene4_margin_top: '60',
      scene4_logo_height: '54',
      scene4_addr_top: '18',
      scene4_addr_size: '40',
      scene4_addr_weight: '300',
      scene4_addr_spacing: '0.5',
      scene4_addr_slide: '8',

      // Other variables
      offer_date: isGeneralBrandMessage ? '' : (creativeConfig.offerDate || 'Varaa viimeistään 28.10.'),
      click_url: creativeConfig.targetUrl || 'https://terveystalo.com/suunterveystalo',
      disclaimer_text: isGeneralBrandMessage ? '' : (creativeConfig.disclaimerText || ''),
      legal_text: isGeneralBrandMessage ? '' : (creativeConfig.disclaimerText || ''),
    };
  }, [creativeConfig, selectedBranch, selectedBranches, selectedService, previewService, getTemplateForSize, previewSize, previewBranchId]);

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

    // Use previewService for checking if brand message in preview
    const serviceForPreview = previewService || selectedService;
    if (creativeConfig.priceBubbleMode === 'no-price' || serviceForPreview?.code === 'yleinen-brandiviesti') {
      // Inject CSS to hide price bubble elements (class names used in Figma templates)
      renderedHtml = renderedHtml.replace('</head>', '<style>.Pricetag, .Price, .HammasTarkast, .HammasTarkastu, .VaronViimcist, .pricetag, .price-bubble { display: none !important; }</style></head>');
    }

    if (!showAddress) {
      // Inject CSS to hide address
      renderedHtml = renderedHtml.replace('</head>', '<style>.address, .Torikatu1Laht, .Torikatu1Lahti, .branch_address { display: none !important; }</style></head>');
    }

    // Hide legal/disclaimer text for non-PDOOH templates (legal text is only for PDOOH)
    if (template.type !== 'pdooh') {
      renderedHtml = renderedHtml.replace('</head>', '<style>.disclaimer, .LegalTeksti { display: none !important; }</style></head>');
    }

    // Also hide legal text for brand campaigns on PDOOH
    if (template.type === 'pdooh' && serviceForPreview?.code === 'yleinen-brandiviesti') {
      renderedHtml = renderedHtml.replace('</head>', '<style>.disclaimer, .LegalTeksti { display: none !important; }</style></head>');
    }

    // PDOOH or empty CTA: Remove CTA button entirely (hide element AND its white background shape)
    if (template.type === 'pdooh' || !variables.cta_text) {
      // CSS nuclear option: hide every possible CTA selector with zero dimensions
      renderedHtml = renderedHtml.replace('</head>',
        '<style>.cta, .cta-button, .VaraaAika, .cta_text, [class*="cta"], [class*="Cta"], a.cta-button, a[href].cta-button { display: none !important; visibility: hidden !important; width: 0 !important; height: 0 !important; padding: 0 !important; margin: 0 !important; border: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }</style></head>');
      // Also strip CTA anchor tags from the HTML entirely as fallback
      renderedHtml = renderedHtml.replace(/<a[^>]*class="[^"]*cta[^"]*"[^>]*>.*?<\/a>/gi, '');
    }

    // Fix address alignment for specific sizes
    // 300x300: left-align address with logo and other text
    if (previewSize.id === '300x300') {
      renderedHtml = renderedHtml.replace('</head>', '<style>.Torikatu1Laht, .Torikatu1Lahti { text-align: left !important; justify-content: flex-start !important; }</style></head>');
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
        sandbox="allow-same-origin allow-scripts allow-autoplay"
        allow="autoplay"
        scrolling="no"
      />
    );
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setSaving(true);
    const isDemo = isDemoMode();

    try {
      const branchLabel = selectedBranches.length > 1
        ? `${selectedBranches.length} toimipistettä`
        : selectedBranch?.city || '';
      const campaignName = formData.name ||
        `${getServiceName(selectedService)} - ${branchLabel} ${format(new Date(), 'MM/yyyy')}`;

      if (isDemo) {
        await new Promise(resolve => setTimeout(resolve, 1500));
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
        addDemoCreatedCampaign(demoCampaign);
        toast.success('Kampanja luotu!');
        navigate('/campaigns');
        return;
      }

      // Create or update campaign in Supabase
      // Strip non-DB fields from formData before spreading
      const {
        creative_weight_nationwide, creative_weight_local,
        daily_budget_meta, daily_budget_display, daily_budget_pdooh, daily_budget_audio,
        target_screens_count, service, branch, excluded_branch_ids,
        spent_budget, total_impressions, total_clicks, ctr, channels,
        creator, creatives,
        ...dbFormData
      } = formData;
      const campaignPayload = {
        ...dbFormData,
        name: campaignName,
        headline: creativeConfig.headline || 'Hymyile.|Olet hyvissä käsissä.',
        subheadline: creativeConfig.subheadline || '',
        offer_text: creativeConfig.offer,
        service_prices: creativeConfig.servicePrices,
        cta_text: creativeConfig.cta,
        background_image_url: creativeConfig.backgroundImage || undefined,
        landing_url: creativeConfig.targetUrl || 'https://terveystalo.com/suunterveystalo',
        general_brand_message: creativeConfig.generalBrandMessage || undefined,
        meta_primary_text: creativeConfig.metaPrimaryText || undefined,
        meta_headline: creativeConfig.metaHeadline || undefined,
        meta_description: creativeConfig.metaDescription || undefined,
        offer_subtitle: creativeConfig.offerSubtitle || undefined,
        offer_date: creativeConfig.offerDate || undefined,
        disclaimer_text: creativeConfig.disclaimerText || undefined,
        meta_video_url: creativeConfig.selectedVideo || undefined,
        meta_video_file: creativeConfig.videoFile || undefined,
        meta_audio_url: creativeConfig.selectedAudio || undefined,
        branch_radius_settings: branchRadiusSettings,
        branch_channel_budgets: (() => {
          if (selectedBranches.length <= 1) return undefined;
          const channelTotal =
            (formData.channel_meta ? formData.budget_meta : 0) +
            (formData.channel_display ? formData.budget_display : 0) +
            (formData.channel_pdooh ? formData.budget_pdooh : 0) +
            (formData.channel_audio ? formData.budget_audio : 0);
          // Use current allocations or default to equal split
          const allocs: Record<string, number> = {};
          const selectedIds = new Set(selectedBranches.map(b => b.id));
          let needsInit = false;
          for (const b of selectedBranches) {
            if (branchBudgetAllocations[b.id] === undefined) { needsInit = true; break; }
          }
          if (needsInit) {
            selectedBranches.forEach((b, i) => {
              allocs[b.id] = i === selectedBranches.length - 1
                ? 100 - Math.floor(100 / selectedBranches.length) * (selectedBranches.length - 1)
                : Math.floor(100 / selectedBranches.length);
            });
          } else {
            for (const [id, pct] of Object.entries(branchBudgetAllocations)) {
              if (selectedIds.has(id)) allocs[id] = pct;
            }
          }
          const result: Record<string, { meta: number; display: number; pdooh: number; audio: number }> = {};
          for (const b of selectedBranches) {
            const overrides = branchChannelOverrides[b.id];
            if (overrides) {
              result[b.id] = {
                meta: overrides.meta ?? 0,
                display: overrides.display ?? 0,
                pdooh: overrides.pdooh ?? 0,
                audio: overrides.audio ?? 0,
              };
            } else {
              const branchPct = allocs[b.id] || 0;
              const branchTotal = Math.round(channelTotal * branchPct / 100);
              const screens = branchScreenCounts[b.id] ?? 0;
              const hasPdooh = screens > 0;
              let pdoohShare = 0;
              if (hasPdooh && formData.channel_pdooh && channelTotal > 0) {
                const basePdoohRatio = formData.budget_pdooh / Math.max(channelTotal, 1);
                let sf: number;
                if (screens <= 3) sf = 0.3 + (screens / 3) * 0.2;
                else if (screens <= 10) sf = 0.5 + ((screens - 3) / 7) * 0.3;
                else sf = 0.8 + Math.min((screens - 10) / 20, 0.2);
                pdoohShare = basePdoohRatio * sf;
              }
              const pdoohAmount = hasPdooh && formData.channel_pdooh ? Math.round(branchTotal * pdoohShare) : 0;
              const remaining = branchTotal - pdoohAmount;
              const otherTotal =
                (formData.channel_meta ? formData.budget_meta : 0) +
                (formData.channel_display ? formData.budget_display : 0) +
                (formData.channel_audio ? formData.budget_audio : 0);
              let meta = 0, display = 0, audio = 0;
              if (otherTotal > 0) {
                meta = formData.channel_meta ? Math.round(remaining * (formData.budget_meta / otherTotal)) : 0;
                display = formData.channel_display ? Math.round(remaining * (formData.budget_display / otherTotal)) : 0;
                audio = formData.channel_audio ? Math.round(remaining * (formData.budget_audio / otherTotal)) : 0;
              } else if (remaining > 0) {
                meta = Math.round(remaining / 2);
                display = remaining - meta;
              }
              result[b.id] = { meta, display, pdooh: pdoohAmount, audio };
            }
          }
          return result;
        })(),
      };

      if (isEditMode && editCampaignId) {
        // Update existing campaign
        const updated = await updateCampaign(editCampaignId, campaignPayload);
        if (updated) {
          toast.success('Kampanja päivitetty!');
          navigate(`/campaigns/${editCampaignId}`);
        } else {
          throw new Error('Campaign update failed');
        }
      } else {
        // Create new campaign
        const campaign = await createCampaign(campaignPayload, user?.id || '', user?.name || user?.email || '');
        if (campaign) {
          toast.success('Kampanja luotu!');
          navigate(`/campaigns/${campaign.id}`);
        } else {
          throw new Error('Campaign creation failed');
        }
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(isEditMode ? 'Kampanjan päivittäminen epäonnistui' : 'Kampanjan luominen epäonnistui');
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{isEditMode ? 'Muokkaa kampanjaa' : 'Luo uusi kampanja'}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Vaihe {currentStep + 1}/{steps.length} • {steps[currentStep].name}
            </p>
          </div>
          {selectedServices.length > 0 && (
            <div className="hidden md:flex items-center space-x-2 bg-[#00A5B5]/10 text-[#00A5B5] px-4 py-2 rounded-full">
              <ToothIcon size={18} />
              <span className="font-medium">
                {selectedServices.length === 1
                  ? getServiceName(selectedServices[0])
                  : `${selectedServices.length} palvelua`}
              </span>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Service Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Palvelu</h4>
                <div className="space-y-3">
                  {activeServices.length > 0 ? (
                    activeServices.map(service => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        selected={formData.service_ids.includes(service.id)}
                        onClick={() => {
                          setFormData(prev => {
                            const ids = prev.service_ids.includes(service.id)
                              ? prev.service_ids.filter(id => id !== service.id)
                              : [...prev.service_ids, service.id];
                            return { ...prev, service_ids: ids, service_id: ids[0] || '' };
                          });
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Ei aktiivisia palveluita</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Type Selection */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Mainonnan tyyppi</h4>
                <div className="space-y-3">
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
                          if (type.id === 'nationwide') {
                            const allBranchIds = activeBranches.map(b => b.id);
                            // Initialize radius settings for all branches
                            const radiusSettings: Record<string, { radius: number; enabled: boolean }> = {};
                            activeBranches.forEach(b => {
                              radiusSettings[b.id] = { radius: 10, enabled: true };
                            });
                            setBranchRadiusSettings(prev => ({ ...prev, ...radiusSettings }));
                            setFormData({ ...formData, ad_type: type.id, creative_type: type.id, nationwide_address_mode: 'with_address', branch_ids: allBranchIds, branch_id: allBranchIds[0] || '' });
                          } else {
                            setFormData({ ...formData, ad_type: type.id, creative_type: type.id, nationwide_address_mode: undefined, branch_ids: [], branch_id: '' });
                          }
                        }}
                        className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center gap-4 ${
                          isSelected
                            ? 'border-[#00A5B5] bg-[#00A5B5]/10'
                            : 'border-gray-200 hover:border-[#00A5B5]/50'
                        }`}
                      >
                        <TypeIcon size={24} className={isSelected ? 'text-[#00A5B5]' : 'text-gray-400'} />
                        <div className={`text-base font-semibold ${isSelected ? 'text-[#00A5B5]' : 'text-gray-700'}`}>{type.label}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Nationwide address mode sub-option */}
                {formData.ad_type === 'nationwide' && (
                  <div className="mt-4 ml-1">
                    <p className="text-sm font-medium text-gray-700 mb-2">Osoitteen näyttäminen</p>
                    <div className="flex gap-2">
                      {([
                        { id: 'with_address' as const, label: 'Osoitteella', desc: 'Toimipisteen osoite näkyy mainoksissa' },
                        { id: 'without_address' as const, label: 'Ilman osoitetta', desc: 'Osoitetta ei näytetä mainoksissa' },
                      ] as const).map((opt) => {
                        const isActive = formData.nationwide_address_mode === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, nationwide_address_mode: opt.id }))}
                            className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
                              isActive
                                ? 'border-[#00A5B5] bg-[#00A5B5]/10'
                                : 'border-gray-200 hover:border-[#00A5B5]/50'
                            }`}
                          >
                            <div className={`text-sm font-semibold ${isActive ? 'text-[#00A5B5]' : 'text-gray-700'}`}>{opt.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Date Selection */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100">
                    <Calendar className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Kampanjan ajankohta</h3>
                    <p className="text-xs text-gray-500">Valitse aloitus- ja päättymispäivä</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Start Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Alkamispäivä</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setFormData(prev => {
                          const updated = { ...prev, start_date: newStart };
                          if (!prev.is_ongoing && newStart > prev.end_date) {
                            updated.end_date = format(addWeeks(new Date(newStart), 4), 'yyyy-MM-dd');
                          }
                          return updated;
                        });
                      }}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Päättymispäivä</label>
                    <input
                      type="date"
                      value={formData.is_ongoing ? '' : formData.end_date}
                      min={formData.start_date}
                      disabled={formData.is_ongoing}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all ${
                        formData.is_ongoing ? 'opacity-50 bg-gray-100' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Continuous Campaign Toggle */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">Jatkuva kampanja</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      is_ongoing: !prev.is_ongoing,
                      end_date: !prev.is_ongoing
                        ? format(addWeeks(new Date(prev.start_date), 52), 'yyyy-MM-dd')
                        : format(addWeeks(new Date(prev.start_date), 4), 'yyyy-MM-dd')
                    }))}
                    className={`relative w-12 h-6 rounded-full transition-all ${
                      formData.is_ongoing ? 'bg-[#00A5B5]' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all ${
                      formData.is_ongoing ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 1: BRANCHES & MAP */}
        {/* =============================================================== */}
        {currentStep === 1 && (
          <div className="animate-fade-in max-w-6xl mx-auto">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Toimipisteet</h2>
                <p className="text-xs text-gray-500">
                  {formData.ad_type === 'nationwide'
                    ? `${formData.branch_ids.length} / ${activeBranches.length} valittu (valtakunnallinen)`
                    : `${formData.branch_ids.length} valittu`
                  }
                </p>
              </div>
            </div>

            {/* Branch Selection with Radii (both nationwide and local modes) */}
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, branch_ids: activeBranches.map(b => b.id), branch_id: activeBranches[0]?.id || '' }))}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#00A5B5] text-white"
                  >
                    Valitse kaikki
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, branch_ids: [], branch_id: '' }))}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600"
                  >
                    Tyhjennä
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Hae toimipisteitä..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Branch Cards */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                    {filteredBranches.map(branch => {
                      const isSelected = formData.branch_ids.includes(branch.id);
                      const branchRadius = branchRadiusSettings[branch.id]?.radius || 10;
                      return (
                        <div
                          key={branch.id}
                          onClick={() => {
                            setFormData(prev => {
                              const ids = isSelected
                                ? prev.branch_ids.filter(id => id !== branch.id)
                                : [...prev.branch_ids, branch.id];
                              return { ...prev, branch_ids: ids, branch_id: ids[0] || '' };
                            });
                            // Initialize radius for newly selected branch
                            if (!isSelected) {
                              setBranchRadiusSettings(prev => ({
                                ...prev,
                                [branch.id]: { radius: 10, enabled: true }
                              }));
                            }
                          }}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-[#00A5B5]/10 border-[#00A5B5]'
                              : 'bg-white border-gray-200 hover:border-[#00A5B5]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#00A5B5]' : 'bg-gray-300'}`} />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                                <div className="text-xs text-gray-500">{branch.city}</div>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'border-[#00A5B5] bg-[#00A5B5]' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t border-[#00A5B5]/20 space-y-2">
                              {/* Radius slider */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Säde:</span>
                                <input
                                  type="range"
                                  min={1}
                                  max={50}
                                  value={branchRadius}
                                  onChange={(e) => {
                                    const newRadius = Number(e.target.value);
                                    setBranchRadiusSettings(prev => ({
                                      ...prev,
                                      [branch.id]: { ...prev[branch.id], radius: newRadius }
                                    }));
                                  }}
                                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00A5B5]"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="text-xs font-medium text-[#00A5B5] w-8 text-right">{branchRadius} km</span>
                              </div>
                              {/* Screen count */}
                              <div className="flex items-center gap-1.5">
                                <Monitor size={12} className="text-[#1B365D]" />
                                <span className="text-xs text-gray-600">
                                  {branchScreenCounts[branch.id] !== undefined
                                    ? `${branchScreenCounts[branch.id]} näyttöä`
                                    : 'Ladataan...'
                                  }
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right: Map Preview */}
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    {selectedBranches.length > 0 ? (
                      <MapComponent
                        mode="multi"
                        branches={selectedBranches.map(branch => ({
                          branch,
                          radius: branchRadiusSettings[branch.id]?.radius || 10
                        }))}
                        screens={combinedBranchScreens}
                      />
                    ) : (
                      <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                        <MapPin size={32} className="mr-2" />
                        Valitse toimipisteitä nähdäksesi kartalla
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected branches summary */}
                {selectedBranches.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-2">Valitut toimipisteet ja säteet:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedBranches.map(b => {
                        const radius = branchRadiusSettings[b.id]?.radius || 10;
                        return (
                          <span key={b.id} className="px-2 py-1 bg-white rounded-full text-xs text-gray-700 border border-gray-200 flex items-center gap-1">
                            <span>{b.city}: {b.name}</span>
                            <span className="text-[#00A5B5] font-medium">({radius} km)</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 2: AUDIENCE SELECTION */}
        {/* =============================================================== */}
        {currentStep === 2 && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#00A5B5]/10 mb-3">
                <Users className="text-[#00A5B5]" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Kohderyhmä</h2>
              <p className="text-sm text-gray-500 mt-1">Määritä kampanjan kohderyhmä ja tavoite</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age Range Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100">
                    <Baby className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Ikäryhmä</h3>
                    <p className="text-xs text-gray-500">{formData.target_age_min || 18} – {formData.target_age_max || 80} vuotta</p>
                  </div>
                </div>

                {/* Age range display */}
                <div className="flex items-center justify-center gap-3 mb-4 py-2">
                  <span className="text-2xl font-bold text-[#00A5B5]">{formData.target_age_min || 18}</span>
                  <div className="w-8 h-0.5 bg-gray-300" />
                  <span className="text-2xl font-bold text-[#00A5B5]">{formData.target_age_max || 65}</span>
                  <span className="text-sm text-gray-500">vuotta</span>
                </div>

                {/* Age Presets — only 3 groups */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '18-40', min: 18, max: 40, icon: Smile },
                    { label: '25-64', min: 25, max: 64, icon: Users },
                    { label: '40-100', min: 40, max: 100, icon: User },
                  ].map(preset => {
                    const Icon = preset.icon;
                    const isActive = (formData.target_age_min || 18) === preset.min && (formData.target_age_max || 65) === preset.max;
                    return (
                      <button
                        key={preset.label}
                        onClick={() => setFormData({ ...formData, target_age_min: preset.min, target_age_max: preset.max })}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                          isActive
                            ? 'bg-[#00A5B5] text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <Icon size={14} />
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {/* PDOOH disclaimer */}
                {formData.channel_pdooh && (
                  <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Ikä-kohdennus ei mahdollista PDOOH-kanavassa.</p>
                  </div>
                )}
              </div>

              {/* Gender Card — only applies to Meta channel */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-50 to-purple-100">
                    <UserCircle className="text-pink-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sukupuoli</h3>
                    <p className="text-xs text-gray-500">
                      {formData.target_genders?.[0] === 'all' && 'Kaikki'}
                      {formData.target_genders?.[0] === 'male' && 'Miehet'}
                      {formData.target_genders?.[0] === 'female' && 'Naiset'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                  <Instagram size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-700">Sukupuolikohdistus vaikuttaa vain Meta-kanavaan. Display ja PDOOH näytetään kaikille.</p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'all', label: 'Kaikki', icon: Users, desc: 'Kaikki sukupuolet' },
                    { id: 'male', label: 'Miehet', icon: User, desc: 'Mieskohtainen' },
                    { id: 'female', label: 'Naiset', icon: UserCircle, desc: 'Naiskohtainen' },
                  ].map(gender => {
                    const Icon = gender.icon;
                    const isActive = formData.target_genders?.[0] === gender.id;
                    return (
                      <button
                        key={gender.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, target_genders: [gender.id] }))}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isActive
                            ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                            : 'border-gray-200 hover:border-[#00A5B5]/30 bg-white'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                          isActive ? 'bg-[#00A5B5]' : 'bg-gray-100'
                        }`}>
                          <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isActive ? 'text-[#00A5B5]' : 'text-gray-900'}`}>
                            {gender.label}
                          </div>
                          <div className="text-xs text-gray-500">{gender.desc}</div>
                        </div>
                        {isActive && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00A5B5]">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Campaign Objective - Wide Card */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100">
                  <Target className="text-orange-600" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Kampanjan tavoite</h3>
                  <p className="text-xs text-gray-500">Mitä haluat saavuttaa?</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'traffic', label: 'Liikenne', icon: MousePointerClick, desc: 'Klikkaukset ja vierailut' },
                  { id: 'reach', label: 'Reach', icon: Eye, desc: 'Näkyvyys ja tavoittavuus' },
                ].map(obj => {
                  const Icon = obj.icon;
                  const isActive = formData.campaign_objective === obj.id;
                  return (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, campaign_objective: obj.id })}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        isActive
                          ? 'border-[#00A5B5] bg-[#00A5B5]/5 shadow-sm'
                          : 'border-gray-200 hover:border-[#00A5B5]/30 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
                          isActive ? 'bg-[#00A5B5]' : 'bg-gray-100'
                        }`}>
                          <Icon size={22} className={isActive ? 'text-white' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-semibold ${isActive ? 'text-[#00A5B5]' : 'text-gray-900'}`}>
                            {obj.label}
                          </div>
                          <div className="text-xs text-gray-500">{obj.desc}</div>
                        </div>
                        {isActive && (
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#00A5B5]">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 4: BUDGET & CHANNELS */}
        {/* =============================================================== */}
        {currentStep === 3 && (
          <div className="animate-fade-in max-w-5xl mx-auto">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Budjetti ja kanavat</h2>
                <p className="text-sm text-gray-500">
                  {formData.is_ongoing
                    ? `Jatkuva alkaen ${format(new Date(formData.start_date), 'd.M.yyyy', { locale: fi })}`
                    : `${format(new Date(formData.start_date), 'd.M.', { locale: fi })} – ${format(new Date(formData.end_date), 'd.M.yyyy', { locale: fi })} (${campaignDays} pv)`
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_ongoing: !prev.is_ongoing,
                  end_date: !prev.is_ongoing
                    ? format(addWeeks(new Date(prev.start_date), 52), 'yyyy-MM-dd')
                    : format(addWeeks(new Date(prev.start_date), 4), 'yyyy-MM-dd'),
                }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  formData.is_ongoing
                    ? 'bg-[#00A5B5] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw size={14} />
                {formData.is_ongoing ? 'Jatkuva' : 'Määrätty'}
              </button>
            </div>

            {/* Terveystalo Budget - Compact */}
            {(() => {
              const tb = getTotalTerveystaloBudget();
              return (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#1B365D]/10 to-[#00A5B5]/10 rounded-xl mb-6">
                  <div className="flex items-center gap-4">
                    <Euro size={18} className="text-[#00A5B5]" />
                    <div className="flex gap-6 text-sm">
                      <span className="text-gray-600">Käytössä: <strong>{tb.total.toLocaleString('fi-FI')}€</strong></span>
                      <span className="text-gray-600">Käytetty: <strong>{tb.used.toLocaleString('fi-FI')}€</strong></span>
                      <span className={tb.remaining >= 0 ? 'text-gray-600' : 'text-red-600'}>
                        Jäljellä: <strong>{tb.remaining.toLocaleString('fi-FI')}€</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openTerveystaloBudgetEdit}
                    className="text-xs text-[#00A5B5] hover:underline font-medium"
                  >
                    Muokkaa kokonaisbudjettia
                  </button>
                </div>
              );
            })()}

            {/* Budget Selection - Compact */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">
                  {formData.is_ongoing ? 'Kuukausibudjetti' : 'Kampanjan budjetti'}
                </label>
                <span className="text-sm text-gray-500">
                  {formData.is_ongoing
                    ? `${formData.total_budget.toLocaleString('fi-FI')}€/kk`
                    : campaignDays > 0 ? `${Math.round(formData.total_budget / campaignDays)}€/päivä` : '-'
                  }
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {budgetPresets.map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedBudget(amount);
                      setCustomBudget(undefined);
                      updateTotalBudget(amount);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedBudget === amount || formData.total_budget === amount
                        ? 'bg-[#00A5B5] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {amount}€{formData.is_ongoing ? '/kk' : ''}
                  </button>
                ))}
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={customBudget !== undefined ? customBudget : (selectedBudget ? undefined : formData.total_budget)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomBudget(val);
                      setSelectedBudget(undefined);
                      updateTotalBudget(val);
                    }}
                    placeholder="Muu"
                    className="w-20 px-3 py-2 rounded-lg text-sm border border-gray-300 focus:border-[#00A5B5] focus:ring-1 focus:ring-[#00A5B5]/20 outline-none text-right"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                </div>
              </div>
            </div>

            {/* Budget Recommendation */}
            {(() => {
              const recommendation = getChannelBudgetRecommendation();
              const totalScreens = Object.values(branchScreenCounts).reduce((sum, count) => sum + count, 0);

              return (
                <div className="bg-gradient-to-r from-[#00A5B5]/10 to-[#1B365D]/10 rounded-xl p-4 mb-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-[#00A5B5]" />
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Budjetin suositus</h3>
                        <p className="text-xs text-gray-500">
                          {formData.campaign_objective === 'traffic'
                            ? 'Tavoitteena liikenne - korostetaan Meta-mainontaa'
                            : 'Tavoitteena näkyvyys - korostetaan Display/PDOOH-mainontaa'
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyBudgetRecommendation()}
                      className="px-3 py-1.5 text-xs font-medium bg-[#00A5B5] text-white rounded-lg hover:bg-[#0095a5] transition-colors"
                    >
                      Käytä suositusta
                    </button>
                  </div>

                  {/* Recommended split bars */}
                  <div className="space-y-2">
                    {[
                      { channel: 'meta', label: 'Meta', percent: recommendation.meta, color: '#E1306C' },
                      { channel: 'display', label: 'Display', percent: recommendation.display, color: '#00A5B5' },
                      { channel: 'pdooh', label: 'PDOOH', percent: recommendation.pdooh, color: '#1B365D', screens: totalScreens },
                      // Audio channel hidden for now
                      // { channel: 'audio', label: 'Audio', percent: recommendation.audio, color: '#1DB954' },
                    ].filter(ch => ch.percent > 0).map(ch => (
                      <div key={ch.channel} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-gray-600">{ch.label}</div>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${ch.percent}%`, backgroundColor: ch.color }}
                          >
                            <span className="text-xs font-bold text-white">{ch.percent}%</span>
                          </div>
                        </div>
                        {ch.screens !== undefined && (
                          <div className="w-16 text-xs text-gray-500 text-right">
                            {ch.screens} näyttöä
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Channels - Compact Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-gray-200">
                {/* Meta */}
                <div className={`p-4 cursor-pointer transition-colors ${formData.channel_meta ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                     onClick={() => toggleChannel('meta')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Instagram size={16} style={{ color: '#E1306C' }} />
                      <span className="text-sm font-medium">Meta</span>
                    </div>
                    <div className="relative w-8 h-4">
                      <div className={`absolute inset-0 rounded-full transition-colors ${formData.channel_meta ? 'bg-[#E1306C]' : 'bg-gray-300'}`} />
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.channel_meta ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {formData.channel_meta && (
                    <input
                      type="number"
                      value={formData.budget_meta}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_meta: Number(e.target.value) }))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-lg font-bold text-center border border-gray-200 rounded-lg"
                    />
                  )}
                </div>

                {/* Display */}
                <div className={`p-4 cursor-pointer transition-colors ${formData.channel_display ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                     onClick={() => toggleChannel('display')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor size={16} className="text-[#00A5B5]" />
                      <span className="text-sm font-medium">Display</span>
                    </div>
                    <div className="relative w-8 h-4">
                      <div className={`absolute inset-0 rounded-full transition-colors ${formData.channel_display ? 'bg-[#00A5B5]' : 'bg-gray-300'}`} />
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.channel_display ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {formData.channel_display && (
                    <input
                      type="number"
                      value={formData.budget_display}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_display: Number(e.target.value) }))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-lg font-bold text-center border border-gray-200 rounded-lg"
                    />
                  )}
                </div>

                {/* PDOOH */}
                <div className={`p-4 cursor-pointer transition-colors ${formData.channel_pdooh ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                     onClick={() => toggleChannel('pdooh')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Tv size={16} className="text-[#1B365D]" />
                      <span className="text-sm font-medium">PDOOH</span>
                    </div>
                    <div className="relative w-8 h-4">
                      <div className={`absolute inset-0 rounded-full transition-colors ${formData.channel_pdooh ? 'bg-[#1B365D]' : 'bg-gray-300'}`} />
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.channel_pdooh ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {formData.channel_pdooh && (
                    <input
                      type="number"
                      value={formData.budget_pdooh}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_pdooh: Number(e.target.value) }))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-lg font-bold text-center border border-gray-200 rounded-lg"
                    />
                  )}
                </div>

                {/* Audio — hidden for now, kept for future use */}
                {/* Digital Audio channel is temporarily hidden from the UI.
                    To re-enable, uncomment the block below. */}
              </div>

              {/* Budget bar */}
              <div className="h-2 bg-gray-100 flex">
                {formData.channel_meta && formData.budget_meta > 0 && (
                  <div className="h-full bg-[#E1306C]" style={{ width: `${(formData.budget_meta / formData.total_budget) * 100}%` }} />
                )}
                {formData.channel_display && formData.budget_display > 0 && (
                  <div className="h-full bg-[#00A5B5]" style={{ width: `${(formData.budget_display / formData.total_budget) * 100}%` }} />
                )}
                {formData.channel_pdooh && formData.budget_pdooh > 0 && (
                  <div className="h-full bg-[#1B365D]" style={{ width: `${(formData.budget_pdooh / formData.total_budget) * 100}%` }} />
                )}
                {/* Audio bar hidden for now */}
              </div>

              {/* Summary row */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 text-xs text-gray-600">
                <span>Yhteensä: <strong>{enabledChannelsBudget}€{formData.is_ongoing ? '/kk' : ''}</strong></span>
                <span className={enabledChannelsBudget > formData.total_budget ? 'text-red-600' : 'text-green-600'}>
                  {enabledChannelsBudget > formData.total_budget
                    ? `${((enabledChannelsBudget / formData.total_budget) * 100).toFixed(0)}% yli budjetin`
                    : enabledChannelsBudget === formData.total_budget
                      ? 'Täysmäärä käytetty'
                      : `${((1 - enabledChannelsBudget / formData.total_budget) * 100).toFixed(0)}% vapaana`
                  }
                </span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* BRANCH BUDGET ALLOCATION */}
            {/* ============================================================= */}
            {selectedBranches.length > 1 && (() => {
              // Initialize allocations for newly selected branches
              const currentAllocations = { ...branchBudgetAllocations };
              let needsInit = false;
              for (const b of selectedBranches) {
                if (currentAllocations[b.id] === undefined) {
                  needsInit = true;
                  break;
                }
              }
              // Clean up removed branches
              const selectedIds = new Set(selectedBranches.map(b => b.id));
              const cleanedAllocations: Record<string, number> = {};
              for (const [id, pct] of Object.entries(currentAllocations)) {
                if (selectedIds.has(id)) {
                  cleanedAllocations[id] = pct;
                }
              }

              const allocations = needsInit
                ? Object.fromEntries(selectedBranches.map((b, i) => [
                    b.id,
                    i === selectedBranches.length - 1
                      ? 100 - Math.floor(100 / selectedBranches.length) * (selectedBranches.length - 1)
                      : Math.floor(100 / selectedBranches.length)
                  ]))
                : cleanedAllocations;

              const totalPct = Object.values(allocations).reduce((s, v) => s + v, 0);

              // Per-branch channel breakdowns - smart allocation based on screen counts
              const getBranchChannelBudgets = (branchId: string) => {
                const branchPct = allocations[branchId] || 0;
                const branchTotal = Math.round(enabledChannelsBudget * branchPct / 100);
                const screens = branchScreenCounts[branchId] ?? 0;
                const hasPdooh = screens > 0;
                const overrides = branchChannelOverrides[branchId];

                // If we have manual overrides for this branch, use them
                if (overrides) {
                  const meta = overrides.meta ?? 0;
                  const display = overrides.display ?? 0;
                  const pdooh = overrides.pdooh ?? 0;
                  const audio = overrides.audio ?? 0;
                  return { meta, display, pdooh, audio, total: meta + display + pdooh + audio, screens, hasPdooh, isManual: true };
                }

                // Smart allocation: adjust PDOOH based on screen density
                // Fewer screens = less PDOOH budget, more goes to other channels
                let pdoohShare = 0;
                if (hasPdooh && formData.channel_pdooh && enabledChannelsBudget > 0) {
                  // Base PDOOH share from campaign-level ratio
                  const basePdoohRatio = formData.budget_pdooh / Math.max(enabledChannelsBudget, 1);
                  // Scale factor based on screen count: 1-3 screens = 30-50%, 4-10 = 50-80%, 10+ = 80-100%
                  let screenScaleFactor: number;
                  if (screens <= 3) {
                    screenScaleFactor = 0.3 + (screens / 3) * 0.2; // 0.30 - 0.50
                  } else if (screens <= 10) {
                    screenScaleFactor = 0.5 + ((screens - 3) / 7) * 0.3; // 0.50 - 0.80
                  } else {
                    screenScaleFactor = 0.8 + Math.min((screens - 10) / 20, 0.2); // 0.80 - 1.00
                  }
                  pdoohShare = basePdoohRatio * screenScaleFactor;
                }

                // Calculate channel amounts
                const pdoohAmount = hasPdooh && formData.channel_pdooh ? Math.round(branchTotal * pdoohShare) : 0;
                const remaining = branchTotal - pdoohAmount;

                // Distribute remaining among other enabled channels proportionally
                const otherChannelTotal =
                  (formData.channel_meta ? formData.budget_meta : 0) +
                  (formData.channel_display ? formData.budget_display : 0) +
                  (formData.channel_audio ? formData.budget_audio : 0);

                let meta = 0, display = 0, audio = 0;
                if (otherChannelTotal > 0) {
                  meta = formData.channel_meta ? Math.round(remaining * (formData.budget_meta / otherChannelTotal)) : 0;
                  display = formData.channel_display ? Math.round(remaining * (formData.budget_display / otherChannelTotal)) : 0;
                  audio = formData.channel_audio ? Math.round(remaining * (formData.budget_audio / otherChannelTotal)) : 0;
                } else if (remaining > 0) {
                  // Fallback: split evenly among meta and display
                  meta = Math.round(remaining / 2);
                  display = remaining - meta;
                }

                // If no PDOOH screens, the pdoohAmount is already 0, so remaining == branchTotal
                // which gets fully distributed to other channels

                return { meta, display, pdooh: pdoohAmount, audio, total: meta + display + pdoohAmount + audio, screens, hasPdooh, isManual: false };
              };

              // Handle manual override of a branch channel budget
              const handleBranchChannelOverride = (branchId: string, channel: 'meta' | 'display' | 'pdooh' | 'audio', value: number) => {
                const current = getBranchChannelBudgets(branchId);
                setBranchChannelOverrides(prev => ({
                  ...prev,
                  [branchId]: {
                    meta: prev[branchId]?.meta ?? current.meta,
                    display: prev[branchId]?.display ?? current.display,
                    pdooh: prev[branchId]?.pdooh ?? current.pdooh,
                    audio: prev[branchId]?.audio ?? current.audio,
                    [channel]: Math.max(0, value),
                  }
                }));
              };

              // Reset a branch back to auto-calculated budgets
              const resetBranchOverride = (branchId: string) => {
                setBranchChannelOverrides(prev => {
                  const updated = { ...prev };
                  delete updated[branchId];
                  return updated;
                });
              };

              const handleDistributeEvenly = () => {
                const evenPct = Math.floor(100 / selectedBranches.length);
                const newAllocations = Object.fromEntries(
                  selectedBranches.map((b, i) => [
                    b.id,
                    i === selectedBranches.length - 1
                      ? 100 - evenPct * (selectedBranches.length - 1)
                      : evenPct
                  ])
                );
                setBranchBudgetAllocations(newAllocations);
                setBranchChannelOverrides({});
              };

              const handlePctChange = (branchId: string, newPct: number) => {
                const clamped = Math.max(0, Math.min(100, newPct));
                const updated = { ...allocations, [branchId]: clamped };
                setBranchBudgetAllocations(updated);
              };

              return (
                <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <PieChart size={16} className="text-[#00A5B5]" />
                      <h3 className="text-sm font-semibold text-gray-900">Budjetin jako toimipisteittäin</h3>
                      <span className="text-xs text-gray-500">({selectedBranches.length} toimipistettä)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${
                        totalPct === 100 ? 'text-green-600' : totalPct > 100 ? 'text-red-600' : 'text-amber-600'
                      }`}>
                        {totalPct}% / 100%
                      </span>
                      <button
                        type="button"
                        onClick={handleDistributeEvenly}
                        className="px-3 py-1 text-xs font-medium bg-[#00A5B5] text-white rounded-lg hover:bg-[#0095a5] transition-colors"
                      >
                        Jaa tasaisesti
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {selectedBranches.map(branch => {
                      const pct = allocations[branch.id] || 0;
                      const cb = getBranchChannelBudgets(branch.id);
                      return (
                        <div key={branch.id} className="px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Building2 size={14} className="text-[#1B365D] flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-gray-900 truncate block">{branch.name}</span>
                                <span className="text-xs text-gray-500">{branch.city}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {/* Screen badge */}
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                cb.hasPdooh
                                  ? 'bg-[#1B365D]/10 text-[#1B365D]'
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                <Monitor size={10} />
                                {cb.screens} näyttöä
                              </div>
                              {/* Percentage input */}
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={pct}
                                  onChange={(e) => handlePctChange(branch.id, Number(e.target.value))}
                                  className="w-14 px-2 py-1 text-sm font-bold text-center border border-gray-200 rounded-lg focus:border-[#00A5B5] outline-none"
                                />
                                <Percent size={12} className="text-gray-400" />
                              </div>
                            </div>
                          </div>

                          {/* Percentage slider */}
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={pct}
                            onChange={(e) => handlePctChange(branch.id, Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00A5B5] mb-2"
                          />

                          {/* Channel breakdown for this branch - editable */}
                          <div className="flex gap-2 flex-wrap items-center">
                            {formData.channel_meta && (
                              <div className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E1306C' }} />
                                <span className="text-gray-500">Meta</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={cb.meta}
                                  onChange={(e) => handleBranchChannelOverride(branch.id, 'meta', Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 px-1 py-0.5 text-xs font-medium text-center border border-gray-200 rounded focus:border-[#E1306C] outline-none"
                                />
                                <span className="text-gray-400">€</span>
                              </div>
                            )}
                            {formData.channel_display && (
                              <div className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00A5B5' }} />
                                <span className="text-gray-500">Display</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={cb.display}
                                  onChange={(e) => handleBranchChannelOverride(branch.id, 'display', Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 px-1 py-0.5 text-xs font-medium text-center border border-gray-200 rounded focus:border-[#00A5B5] outline-none"
                                />
                                <span className="text-gray-400">€</span>
                              </div>
                            )}
                            {formData.channel_pdooh && (
                              <div className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cb.hasPdooh ? '#1B365D' : '#d1d5db' }} />
                                <span className={cb.hasPdooh ? 'text-gray-500' : 'text-gray-400 line-through'}>PDOOH</span>
                                {cb.hasPdooh ? (
                                  <>
                                    <input
                                      type="number"
                                      min={0}
                                      value={cb.pdooh}
                                      onChange={(e) => handleBranchChannelOverride(branch.id, 'pdooh', Number(e.target.value))}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-16 px-1 py-0.5 text-xs font-medium text-center border border-gray-200 rounded focus:border-[#1B365D] outline-none"
                                    />
                                    <span className="text-gray-400">€</span>
                                    {cb.screens <= 3 && (
                                      <span className="text-amber-500 text-[10px]" title={`Vain ${cb.screens} näyttöä → pienempi PDOOH`}>
                                        ({cb.screens} näyttöä)
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-gray-400">0€</span>
                                    <span className="text-amber-500 text-[10px]">(ei näyttöjä)</span>
                                  </>
                                )}
                              </div>
                            )}
                            {formData.channel_audio && (
                              <div className="flex items-center gap-1 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1DB954' }} />
                                <span className="text-gray-500">Audio</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={cb.audio}
                                  onChange={(e) => handleBranchChannelOverride(branch.id, 'audio', Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 px-1 py-0.5 text-xs font-medium text-center border border-gray-200 rounded focus:border-[#1DB954] outline-none"
                                />
                                <span className="text-gray-400">€</span>
                              </div>
                            )}
                            <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-gray-700">
                              Yht. {cb.total}€
                              {cb.isManual && (
                                <button
                                  type="button"
                                  onClick={() => resetBranchOverride(branch.id)}
                                  className="text-[10px] text-[#00A5B5] hover:underline font-normal"
                                  title="Palauta automaattinen jako"
                                >
                                  Nollaa
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Allocation total warning */}
                  {totalPct !== 100 && (
                    <div className={`px-4 py-2 text-xs flex items-center gap-2 ${
                      totalPct > 100 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      <AlertCircle size={12} />
                      {totalPct > 100
                        ? `Prosenttien summa ylittää 100% (${totalPct}%). Vähennä jostakin toimipisteestä.`
                        : `Prosenttien summa on alle 100% (${totalPct}%). ${100 - totalPct}% budjetista jakamatta.`
                      }
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* =============================================================== */}
        {/* STEP 4: CREATIVE CONTENT - Comprehensive Redesign */}
        {/* =============================================================== */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 mb-4">
                <Palette size={32} className="text-[#00A5B5]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Mainosten sisältö</h2>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Muokkaa mainosten tekstejä, kuvia ja videoita. Esikatselu päivittyy reaaliajassa.
              </p>
            </div>

            {/* Campaign Info Summary */}
            <div className="max-w-4xl mx-auto mb-6">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#00A5B5]/5 to-[#1B365D]/5 rounded-xl border border-[#00A5B5]/20">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <ToothIcon size={18} className="text-[#00A5B5]" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedServices.length > 1
                        ? `${selectedServices.length} palvelua`
                        : getServiceName(selectedService)
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-[#00A5B5]" />
                    <span className="text-sm font-medium text-gray-700">
                      {selectedBranches.length > 1
                        ? `${selectedBranches.length} toimipistettä`
                        : selectedBranch?.name || 'Ei valittu'
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-[#00A5B5]" />
                    <span className="text-sm font-medium text-gray-700">
                      {formData.creative_type === 'nationwide' ? 'Valtakunnallinen' : 'Paikallinen'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedServices.length > 1 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                      Luodaan {selectedServices.length} eri mainosta
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-6xl mx-auto">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
                {[
                  { id: 'content' as const, label: 'Sisältö', icon: Type },
                  { id: 'media' as const, label: 'Kuvat', icon: ImageIcon },
                  ...(formData.channel_meta ? [{ id: 'meta' as const, label: 'Meta', icon: Instagram }] : []),
                  ...(formData.channel_audio ? [{ id: 'audio' as const, label: 'Audio', icon: Volume2 }] : []),
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = creativeTab === tab.id;
                  const hasMetaErrors = tab.id === 'meta' && formData.channel_meta && (
                    !creativeConfig.metaPrimaryText || !creativeConfig.metaHeadline || !creativeConfig.metaDescription ||
                    (!creativeConfig.videoFile && !creativeConfig.selectedVideo)
                  );
                  const hasAudioErrors = tab.id === 'audio' && formData.channel_audio && (
                    !creativeConfig.audioFile && !creativeConfig.selectedAudio
                  );
                  const hasErrors = hasMetaErrors || hasAudioErrors;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCreativeTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#00A5B5] text-white shadow-md shadow-[#00A5B5]/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${hasErrors && !isActive ? 'ring-2 ring-red-400' : ''}`}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {hasErrors && !isActive && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel - Tab Content */}
                <div className="lg:col-span-2 space-y-5">
                  {/* CONTENT TAB */}
                  {creativeTab === 'content' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Text Content Section */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                              <Type size={18} className="text-[#00A5B5]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Tekstisisältö</h3>
                              <p className="text-xs text-gray-500">Pääotsikko ja alaotsikko</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Otsikko
                            </label>
                            <AutoExpandTextarea
                              value={creativeConfig.headline}
                              onChange={(value) => setCreativeConfig({ ...creativeConfig, headline: value })}
                              placeholder="Hymyile. Olet hyvissä käsissä."
                              minHeight={50}
                              maxHeight={150}
                              className="text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Alaotsikko
                            </label>
                            <AutoExpandTextarea
                              value={creativeConfig.subheadline}
                              onChange={(value) => setCreativeConfig({ ...creativeConfig, subheadline: value })}
                              placeholder={`Sujuvampaa suunterveyttä${selectedBranches.length === 1 ? ` ${selectedBranch?.city} ` : ''}Suun Terveystalossa.`}
                              minHeight={50}
                              maxHeight={150}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price Bubble Section */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#004E9A]/5 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#004E9A]/10">
                              <Euro size={18} className="text-[#004E9A]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Tarjouskupla</h3>
                              <p className="text-xs text-gray-500">Hinta- ja tarjoustiedot</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          {/* Show price toggle */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">Näytä hinta mainoksessa</span>
                            <button
                              type="button"
                              onClick={() => setCreativeConfig({ ...creativeConfig, priceBubbleMode: creativeConfig.priceBubbleMode === 'price' ? 'no-price' : 'price' })}
                              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                                creativeConfig.priceBubbleMode === 'price' ? 'bg-[#00A5B5]' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                creativeConfig.priceBubbleMode === 'price' ? 'translate-x-6' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {creativeConfig.priceBubbleMode === 'price' && (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    Tarjouksen otsikko
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={creativeConfig.offerTitle.replace(/<br\s*\/?>/gi, '\n')}
                                    onChange={(e) => setCreativeConfig({ ...creativeConfig, offerTitle: e.target.value.replace(/\n/g, '|') })}
                                    placeholder={"Suuhygienisti-\nkäynti"}
                                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    Hinta per palvelu (€)
                                  </label>
                                  {selectedServices.filter(s => s.code !== 'yleinen-brandiviesti').length > 0 ? (
                                    <div className="space-y-2">
                                      {selectedServices.filter(s => s.code !== 'yleinen-brandiviesti').map(svc => (
                                        <div key={svc.id} className="flex items-center gap-2">
                                          <span className="text-xs text-gray-500 min-w-[100px] truncate" title={svc.name_fi || svc.name}>{svc.name_fi || svc.name}</span>
                                          <input
                                            type="number"
                                            value={creativeConfig.servicePrices[svc.id] || ''}
                                            onChange={(e) => setCreativeConfig({
                                              ...creativeConfig,
                                              servicePrices: { ...creativeConfig.servicePrices, [svc.id]: e.target.value },
                                            })}
                                            placeholder={(svc.default_price || '').replace(/€/g, '').trim() || '49'}
                                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                                          />
                                          <span className="text-sm text-gray-400">€</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <input
                                      type="number"
                                      value={creativeConfig.offer}
                                      onChange={(e) => setCreativeConfig({ ...creativeConfig, offer: e.target.value })}
                                      placeholder="49"
                                      className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                                    />
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                  Alateksti (hintalapussa)
                                </label>
                                <textarea
                                  rows={2}
                                  value={creativeConfig.offerSubtitle.replace(/\|/g, '\n')}
                                  onChange={(e) => setCreativeConfig({ ...creativeConfig, offerSubtitle: e.target.value.replace(/\n/g, '|') })}
                                  placeholder="uusille asiakkaille"
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                  Voimassaoloaika
                                </label>
                                <textarea
                                  rows={2}
                                  value={creativeConfig.offerDate.replace(/<br\s*\/?>/gi, '\n').replace(/\|/g, '\n')}
                                  onChange={(e) => setCreativeConfig({ ...creativeConfig, offerDate: e.target.value.replace(/\n/g, '|') })}
                                  placeholder={"Varaa viimeistään\n28.10."}
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all resize-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CTA and URL */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <MousePointerClick size={18} className="text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Toimintakehote</h3>
                              <p className="text-xs text-gray-500">CTA-painike ja kohde-URL</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Painiketeksti (CTA)
                            </label>
                            <input
                              type="text"
                              value={creativeConfig.cta}
                              onChange={(e) => setCreativeConfig({ ...creativeConfig, cta: e.target.value })}
                              placeholder="Varaa aika"
                              className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kohde-URL
                            </label>
                            <div className="relative">
                              <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="url"
                                value={creativeConfig.targetUrl}
                                onChange={(e) => setCreativeConfig({ ...creativeConfig, targetUrl: e.target.value })}
                                placeholder="https://terveystalo.com/suunterveystalo"
                                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Legal Text - for PDOOH (offer campaigns only, not brand) */}
                      {formData.channel_pdooh && selectedService?.code !== 'yleinen-brandiviesti' && (
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-100">
                              <AlertCircle size={18} className="text-amber-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Legal teksti (PDOOH)</h3>
                              <p className="text-xs text-gray-500">Näytetään vain PDOOH-näytöillä</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <AutoExpandTextarea
                            value={creativeConfig.disclaimerText}
                            onChange={(value) => setCreativeConfig({ ...creativeConfig, disclaimerText: value })}
                            placeholder="Tarjous voimassa uusille asiakkaille..."
                            minHeight={80}
                            maxHeight={200}
                            className="text-xs text-gray-600"
                          />
                        </div>
                      </div>
                      )}


                    </div>
                  )}

                  {/* MEDIA TAB */}
                  {creativeTab === 'media' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Background Images */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                              <ImageIcon size={18} className="text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Taustakuva</h3>
                              <p className="text-xs text-gray-500">Valitse kuva mainoksen taustalle</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-4 gap-4">
                            {backgroundImages.map(img => (
                              <button
                                key={img.id}
                                onClick={() => setCreativeConfig({
                                  ...creativeConfig,
                                  backgroundImage: img.url,
                                  useCustomBackground: false
                                })}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
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
                                <span className="absolute bottom-0 left-0 right-0 text-xs text-white bg-black/60 px-2 py-1 text-center">
                                  {img.name}
                                </span>
                              </button>
                            ))}

                            {/* Upload custom */}
                            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-[#00A5B5] flex flex-col items-center justify-center text-gray-400 hover:text-[#00A5B5] transition-colors cursor-pointer">
                              <Upload size={24} />
                              <span className="text-xs mt-1 text-center">Lataa oma</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    setCreativeConfig({ ...creativeConfig, backgroundImage: url, useCustomBackground: true });
                                    toast.success(`Kuva "${file.name}" ladattu`);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Artwork (Blue Bubbles) */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <SparklesIcon size={18} className="text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Koristekuvi (Blue Bubbles)</h3>
                              <p className="text-xs text-gray-500">Automaattisesti kaikissa mainoksissa</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 flex items-center justify-center">
                          <img
                            src="/refs/assets/terveystalo-artwork.png"
                            alt="Terveystalo Artwork"
                            className="w-32 h-32 object-contain opacity-80"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* META TAB - Meta ads */}
                  {creativeTab === 'meta' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Meta Ad Copy */}
                      <div className={`bg-white rounded-2xl border overflow-hidden ${
                        !creativeConfig.metaPrimaryText || !creativeConfig.metaHeadline || !creativeConfig.metaDescription
                          ? 'border-red-300'
                          : 'border-gray-200'
                      }`}>
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-100">
                              <Instagram size={18} className="text-pink-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Meta-mainostekstit</h3>
                              <p className="text-xs text-gray-500">Pääviesti, otsikko ja kuvaus Meta-mainoksille</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Pääviesti (Primary Text) <span className="text-red-500">*</span>
                            </label>
                            <AutoExpandTextarea
                              value={creativeConfig.metaPrimaryText}
                              onChange={(value) => setCreativeConfig({ ...creativeConfig, metaPrimaryText: value })}
                              placeholder="Suun Terveystalo - Sujuvampaa suunterveyttä. Varaa aika nyt!"
                              minHeight={80}
                              maxHeight={200}
                              className={`text-sm ${!creativeConfig.metaPrimaryText ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''}`}
                            />
                            {!creativeConfig.metaPrimaryText && (
                              <p className="text-xs text-red-500 mt-1">Pääviesti on pakollinen</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Otsikko (Headline) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={creativeConfig.metaHeadline}
                              onChange={(e) => setCreativeConfig({ ...creativeConfig, metaHeadline: e.target.value })}
                              placeholder="Hammastarkastus alk. 49€"
                              className={`w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all ${
                                !creativeConfig.metaHeadline
                                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                                  : 'border-gray-200 focus:border-[#E1306C] focus:ring-2 focus:ring-[#E1306C]/20'
                              }`}
                            />
                            {!creativeConfig.metaHeadline && (
                              <p className="text-xs text-red-500 mt-1">Otsikko on pakollinen</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Kuvaus (Description) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={creativeConfig.metaDescription}
                              onChange={(e) => setCreativeConfig({ ...creativeConfig, metaDescription: e.target.value })}
                              placeholder="Varaa aika helposti verkossa"
                              className={`w-full px-4 py-3 text-sm rounded-xl border outline-none transition-all ${
                                !creativeConfig.metaDescription
                                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                                  : 'border-gray-200 focus:border-[#E1306C] focus:ring-2 focus:ring-[#E1306C]/20'
                              }`}
                            />
                            {!creativeConfig.metaDescription && (
                              <p className="text-xs text-red-500 mt-1">Kuvaus on pakollinen</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Video Upload Section */}
                      <div className={`bg-white rounded-2xl border overflow-hidden ${
                        !creativeConfig.videoFile && !creativeConfig.selectedVideo
                          ? 'border-red-300'
                          : 'border-gray-200'
                      }`}>
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-100">
                              <Video size={18} className="text-pink-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Videon lataus <span className="text-red-500">*</span></h3>
                              <p className="text-xs text-gray-500">MP4, MOV tai WebP - enintään 30 sekuntia</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          {!creativeConfig.videoFile && !creativeConfig.selectedVideo ? (
                            <>
                              <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-all group ${
                                'border-red-300'
                              }`}>
                                <div className="p-4 rounded-full bg-pink-100 group-hover:bg-pink-200 transition-colors mb-3">
                                  <Upload size={32} className="text-pink-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">Lataa video</span>
                                <span className="text-xs text-gray-500 mt-1">MP4, MOV tai WebP, max 30MB</span>
                                <input
                                  type="file"
                                  accept="video/mp4,video/quicktime,video/webm"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      if (file.size > 30 * 1024 * 1024) {
                                        toast.error('Videon maksimikoko on 30MB');
                                        return;
                                      }
                                      setCreativeConfig({ ...creativeConfig, videoFile: file, selectedVideo: null });
                                      toast.success(`Video "${file.name}" valittu`);
                                    }
                                  }}
                                />
                              </label>
                              <p className="text-xs text-red-500 mt-2">Video on pakollinen - lataa video tai valitse taustahahmo alla</p>
                            </>
                          ) : (
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                              <div className="p-3 rounded-lg bg-pink-100">
                                <Video size={20} className="text-pink-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {creativeConfig.videoFile?.name || 'Valittu video'}
                                </p>
                                {creativeConfig.videoFile && (
                                  <p className="text-xs text-gray-500">
                                    {(creativeConfig.videoFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setCreativeConfig({ ...creativeConfig, videoFile: null, selectedVideo: null })}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta Background Video Selection */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-100">
                              <Film size={18} className="text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Taustakuva</h3>
                              <p className="text-xs text-gray-500">Valitse videon taustahahmo</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-4">
                            {[
                              { id: 'nainen', name: 'Nainen', url: '/meta/vids/nainen.mp4' },
                              { id: 'mies', name: 'Mies', url: '/meta/vids/mies.mp4' },
                            ].map((video) => {
                              const isSelected = creativeConfig.selectedVideo === video.url;
                              return (
                                <button
                                  key={video.id}
                                  type="button"
                                  onClick={() => {
                                    setCreativeConfig({ ...creativeConfig, selectedVideo: video.url, videoFile: null });
                                    toast.success(`Valittu: ${video.name}`);
                                  }}
                                  className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                                    isSelected
                                      ? 'border-[#E1306C] ring-2 ring-[#E1306C]/30'
                                      : 'border-gray-200 hover:border-[#E1306C]/50'
                                  }`}
                                >
                                  <div className="aspect-[9/16] bg-gray-900 relative">
                                    <video
                                      src={video.url}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                      preload="metadata"
                                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                                      onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                        <Play size={20} className="text-[#E1306C] ml-1" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-3 bg-white flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-700">{video.name}</p>
                                    {isSelected && (
                                      <div className="w-5 h-5 bg-[#E1306C] rounded-full flex items-center justify-center">
                                        <Check size={12} className="text-white" />
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Meta Audio Selection */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Volume2 size={18} className="text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Ääniraita</h3>
                              <p className="text-xs text-gray-500">Valitse videon ääniraita</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { id: 'brandillinen', name: 'Brändillinen', url: '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav' },
                              { id: 'geneerinen', name: 'Geneerinen', url: '/meta/audio/Terveystalo Suun TT TVC Geneerinen 15s i2 2025 09 23 Net Master -14LUFS.wav' },
                            ].map((audio) => {
                              const isSelected = creativeConfig.selectedAudio === audio.url;
                              return (
                                <button
                                  key={audio.id}
                                  type="button"
                                  onClick={() => {
                                    setCreativeConfig({ ...creativeConfig, selectedAudio: audio.url, audioFile: null });
                                    toast.success(`Valittu: ${audio.name}`);
                                  }}
                                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? 'border-[#1DB954] bg-[#1DB954]/10'
                                      : 'border-gray-200 hover:border-[#1DB954]/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${
                                        isSelected ? 'bg-[#1DB954]/20' : 'bg-gray-100'
                                      }`}>
                                        <Volume2 size={16} className={isSelected ? 'text-[#1DB954]' : 'text-gray-400'} />
                                      </div>
                                      <span className={`text-sm font-medium ${
                                        isSelected ? 'text-[#1DB954]' : 'text-gray-700'
                                      }`}>{audio.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {isSelected && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (playingAudio === audio.url) {
                                              if (audioRef.current) {
                                                audioRef.current.pause();
                                                setPlayingAudio(null);
                                              }
                                            } else {
                                              if (audioRef.current) {
                                                audioRef.current.pause();
                                              }
                                              const audioEl = new Audio(audio.url);
                                              audioEl.onended = () => setPlayingAudio(null);
                                              audioEl.play().then(() => {
                                                setPlayingAudio(audio.url);
                                                audioRef.current = audioEl;
                                              }).catch(() => toast.error('Ei voitu toistaa'));
                                            }
                                          }}
                                          className="text-[#1DB954] hover:scale-110 transition-transform"
                                        >
                                          {playingAudio === audio.url ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                      )}
                                      {isSelected && (
                                        <div className="w-5 h-5 bg-[#1DB954] rounded-full flex items-center justify-center">
                                          <Check size={12} className="text-white" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUDIO TAB */}
                  {creativeTab === 'audio' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Audio Settings */}
                      <div className={`bg-white rounded-2xl border overflow-hidden ${
                        !creativeConfig.audioFile && !creativeConfig.selectedAudio
                          ? 'border-red-300'
                          : 'border-gray-200'
                      }`}>
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Volume2 size={18} className="text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Audio-mainos <span className="text-red-500">*</span></h3>
                              <p className="text-xs text-gray-500">Radio- ja podcast-mainokset</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          {/* Predefined audio files */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                              { id: 'suun1', name: 'suun1.wav', url: '/audio/suun1.wav' },
                              { id: 'suun2', name: 'suun2.wav', url: '/audio/suun2.wav' }
                            ].map((audio) => {
                              const isSelected = creativeConfig.selectedAudio === audio.url;
                              return (
                                <button
                                  key={audio.id}
                                  type="button"
                                  onClick={() => {
                                    setCreativeConfig({ ...creativeConfig, selectedAudio: audio.url, audioFile: null });
                                    toast.success(`Valittu: ${audio.name}`);
                                  }}
                                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                                    isSelected
                                      ? 'border-[#1DB954] bg-[#1DB954]/10'
                                      : 'border-gray-200 hover:border-[#1DB954]/50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Volume2 size={16} className={isSelected ? 'text-[#1DB954]' : 'text-gray-400'} />
                                      <span className={`text-xs font-medium ${isSelected ? 'text-[#1DB954]' : 'text-gray-700'}`}>{audio.name}</span>
                                    </div>
                                    {isSelected && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (playingAudio === audio.url) {
                                            if (audioRef.current) {
                                              audioRef.current.pause();
                                              setPlayingAudio(null);
                                            }
                                          } else {
                                            if (audioRef.current) {
                                              audioRef.current.pause();
                                            }
                                            const audioEl = new Audio(audio.url);
                                            audioEl.onended = () => setPlayingAudio(null);
                                            audioEl.play().then(() => {
                                              setPlayingAudio(audio.url);
                                              audioRef.current = audioEl;
                                            }).catch(() => toast.error('Ei voitu toistaa'));
                                          }
                                        }}
                                        className="text-[#1DB954] hover:scale-110 transition-transform"
                                      >
                                        {playingAudio === audio.url ? <Pause size={14} /> : <Play size={14} />}
                                      </button>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom upload */}
                          <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#1DB954] hover:bg-green-50/30 transition-all ${
                            !creativeConfig.audioFile && !creativeConfig.selectedAudio ? 'border-red-300' : 'border-gray-300'
                          }`}>
                            <Upload size={20} className="text-gray-400 mb-1" />
                            <span className="text-xs text-gray-600">Lataa oma äänitiedosto...</span>
                            <input
                              type="file"
                              accept="audio/mp3,audio/mpeg,audio/wav"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setCreativeConfig({ ...creativeConfig, audioFile: file, selectedAudio: null });
                                  toast.success(`Äänitiedosto "${file.name}" valittu`);
                                }
                              }}
                            />
                          </label>
                          {!creativeConfig.audioFile && !creativeConfig.selectedAudio && (
                            <p className="text-xs text-red-500 mt-2">Äänitiedosto on pakollinen - valitse valmis tai lataa oma</p>
                          )}
                          {creativeConfig.audioFile && (
                            <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center gap-2">
                                <Volume2 size={16} className="text-[#1DB954]" />
                                <span className="text-xs text-gray-700 truncate max-w-[200px]">{creativeConfig.audioFile.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCreativeConfig({ ...creativeConfig, audioFile: null })}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel - Live Preview */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4 space-y-4">
                    {/* Preview Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye size={16} className="text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">Esikatselu</span>
                        </div>
                        <span className="text-xs text-gray-400">{previewSize.name}</span>
                      </div>

                      {/* Service selector - only shown when multiple services are selected */}
                      {selectedServices.length > 1 && (
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 mb-1">
                            <ToothIcon size={12} className="text-gray-400" />
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Palvelu ({selectedServices.length} valittu)</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedServices.map((service) => {
                              const isSelected = previewServiceId === service.id;
                              return (
                                <button
                                  key={service.id}
                                  onClick={() => setPreviewServiceId(service.id)}
                                  className={`px-2 py-1 text-xs rounded transition-all ${
                                    isSelected
                                      ? 'bg-[#00A5B5] text-white'
                                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                  }`}
                                >
                                  {service.name_fi || service.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Branch/Location selector - only shown when multiple branches are selected */}
                      {selectedBranches.length > 1 && (
                        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin size={12} className="text-gray-400" />
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Toimipiste ({selectedBranches.length} valittu)</p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {selectedBranches.map((branch) => {
                              const isSelected = previewBranchId === branch.id;
                              return (
                                <button
                                  key={branch.id}
                                  onClick={() => setPreviewBranchId(branch.id)}
                                  className={`px-2 py-1 text-xs rounded transition-all ${
                                    isSelected
                                      ? 'bg-[#00A5B5] text-white'
                                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                  }`}
                                >
                                  {branch.short_name || branch.city}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Size selector - grouped by category */}
                      <div className="p-3 border-b border-gray-100">
                        {/* Group sizes by category */}
                        {['Display', 'PDOOH', 'Meta'].map((category) => {
                          const sizesInCat = availableSizes.filter(s => s.category === category);
                          const isChannelDisabled =
                            (category === 'Display' && !formData.channel_display) ||
                            (category === 'PDOOH' && !formData.channel_pdooh) ||
                            (category === 'Meta' && !formData.channel_meta);

                          console.log('[Category Debug]', category, 'sizesInCat:', sizesInCat.length, 'isChannelDisabled:', isChannelDisabled, 'channel_flags:', { display: formData.channel_display, pdooh: formData.channel_pdooh, meta: formData.channel_meta });

                          if (sizesInCat.length === 0 || isChannelDisabled) return null;

                          return (
                            <div key={category} className="mb-2 last:mb-0">
                              <div className="flex items-center gap-1 mb-1">
                                {category === 'Display' && <Monitor size={10} className="text-gray-400" />}
                                {category === 'PDOOH' && <Tv size={10} className="text-gray-400" />}
                                {category === 'Meta' && <Instagram size={10} className="text-gray-400" />}
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{category}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {sizesInCat.map((size) => {
                                  const isSelected = previewSize.id === size.id;
                                  const Icon = size.icon;
                                  return (
                                    <button
                                      key={size.id}
                                      onClick={() => setPreviewSize(size)}
                                      className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded transition-all ${
                                        isSelected
                                          ? 'bg-[#00A5B5] text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                      title={size.label}
                                    >
                                      <Icon size={10} />
                                      <span className="text-[9px] font-medium">{size.name.split('×')[1]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Preview Container */}
                      <div className="p-4 bg-gray-900">
                        {(() => {
                          const showBothCreativeTypes = formData.creative_type === 'both';
                          const numColumns = showBothCreativeTypes ? 2 : 1;
                          const containerWidth = showBothCreativeTypes ? 140 : 280;
                          const containerHeight = showBothCreativeTypes ? 200 : 350;
                          const scaleX = containerWidth / previewSize.width;
                          const scaleY = containerHeight / previewSize.height;
                          const previewScaleFactor = Math.min(scaleX, scaleY, 1);

                          return (
                            <div className={numColumns > 1 ? 'grid grid-cols-2 gap-2' : ''}>
                              {(() => {
                                // Determine which preview(s) to show
                                // For nationwide: use nationwide_address_mode to decide
                                const isNationwide = formData.ad_type === 'nationwide';
                                const showWithAddress = isNationwide
                                  ? formData.nationwide_address_mode === 'with_address'
                                  : (formData.creative_type === 'local' || formData.creative_type === 'both');
                                const showWithoutAddress = isNationwide
                                  ? formData.nationwide_address_mode === 'without_address'
                                  : (formData.creative_type === 'nationwide' || formData.creative_type === 'both');

                                return (
                                  <>
                                    {showWithAddress && (
                                      <div>
                                        {formData.creative_type === 'both' && (
                                          <p className="text-[8px] text-gray-500 text-center mb-1">Paikallinen</p>
                                        )}
                                        <div className="flex items-center justify-center" style={{ height: `${previewSize.height * previewScaleFactor}px` }}>
                                          <div
                                            className="origin-top-center"
                                            style={{ transform: `scale(${previewScaleFactor})` }}
                                          >
                                            {renderPreviewTemplate(true)}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {showWithoutAddress && (
                                      <div>
                                        {formData.creative_type === 'both' && (
                                          <p className="text-[8px] text-gray-500 text-center mb-1">Valtakunnallinen</p>
                                        )}
                                        <div className="flex items-center justify-center" style={{ height: `${previewSize.height * previewScaleFactor}px` }}>
                                          <div
                                            className="origin-top-center"
                                            style={{ transform: `scale(${previewScaleFactor})` }}
                                          >
                                            {renderPreviewTemplate(false)}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Preview Info */}
                      <div className="px-4 py-3 bg-gray-50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Koko</span>
                          <span className="font-medium text-gray-700">{previewSize.width} × {previewSize.height}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Tyyppi</span>
                          <span className="font-medium text-gray-700">{previewSize.category}</span>
                        </div>
                        {creativeConfig.priceBubbleMode !== 'no-price' && selectedService?.code !== 'yleinen-brandiviesti' && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Hinta</span>
                            <span className="font-medium text-[#004E9A]">
                              {(() => {
                                const svcId = (previewService || selectedService)?.id;
                                return `${(svcId && creativeConfig.servicePrices[svcId]) || creativeConfig.offer || '49'}€`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Tips */}
                    <div className="bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10 rounded-xl p-4 border border-[#00A5B5]/20">
                      <div className="flex items-start gap-3">
                        <SparklesIcon size={16} className="text-[#00A5B5] mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-gray-800">Vinkki</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {selectedServices.length > 1
                              ? 'Luodaan automaattesti eri mainokset jokaiselle valitulle palvelulle.'
                              : 'Valitse useampi palvelu luodaksesi useampia mainoksia.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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

            {/* Summary sections */}
            <div className="max-w-4xl mx-auto space-y-6 mb-8">

              {/* --- Service & Type --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <ToothIcon size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Palvelu ja tyyppi</h3>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {selectedServices.length > 1 ? `Palvelut (${selectedServices.length})` : 'Palvelu'}
                    </p>
                    {selectedServices.length <= 1 ? (
                      <p className="text-sm font-semibold text-gray-900">{getServiceName(selectedService)}</p>
                    ) : (
                      <div className="space-y-0.5">
                        {selectedServices.map(s => (
                          <p key={s.id} className="text-sm font-medium text-gray-900">{getServiceName(s)}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Mainostyyppi</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.ad_type === 'nationwide' ? 'Valtakunnallinen' : formData.ad_type === 'local' ? 'Paikallinen' : 'Yhdistelmä'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Konseptityyppi</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {creativeConfig.conceptType === 'brandviesti' ? 'Yleinen brändiviesti' : 'Palvelumainos'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tavoite</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.campaign_objective === 'traffic' ? 'Liikenne (klikkaukset)' : 'Reach (näkyvyys)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Locations & Radius --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <MapPin size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedBranches.length > 1 ? `Toimipisteet (${selectedBranches.length})` : 'Toimipiste'}
                    </h3>
                    {selectedBranches.length > 1 && (
                      <span className="ml-auto text-xs font-medium text-[#00A5B5] bg-[#00A5B5]/10 px-2 py-1 rounded-full">
                        {creativeConfig.multiLocationMode === 'multi' ? 'Yhdistetty' : 'Erilliset mainokset'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {selectedBranches.map(branch => {
                      const radius = branchRadiusSettings[branch.id]?.radius || formData.campaign_radius || 10;
                      const screens = branchScreenCounts[branch.id] ?? 0;
                      return (
                        <div key={branch.id} className="p-4 flex items-center gap-4">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#00A5B5]/10 flex items-center justify-center">
                            <MapPin size={16} className="text-[#00A5B5]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{branch.name}</p>
                            <p className="text-xs text-gray-500">{branch.address}, {branch.city}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-gray-900">{radius} km</p>
                            <p className="text-xs text-gray-500">{screens} näyttöä</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
                {selectedBranches.length > 1 && (
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">Yhteensä</p>
                    <p className="text-sm font-semibold text-[#00A5B5]">
                      {combinedBranchScreens.length} näyttöä
                    </p>
                  </div>
                )}
              </div>

              {/* --- Target Audience --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <Users size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Kohderyhmä</h3>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Ikäryhmä</p>
                    <p className="text-sm font-semibold text-gray-900">{formData.target_age_min || 18} – {formData.target_age_max || 80} vuotta</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Sukupuoli</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.target_genders?.includes('all') ? 'Kaikki'
                        : formData.target_genders?.map(g => g === 'male' ? 'Miehet' : g === 'female' ? 'Naiset' : g).join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Schedule --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <Calendar size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Aikataulu</h3>
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Alkaa</p>
                    <p className="text-sm font-semibold text-gray-900">{format(new Date(formData.start_date), 'd.M.yyyy', { locale: fi })}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Päättyy</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.is_ongoing ? 'Jatkuva' : format(new Date(formData.end_date), 'd.M.yyyy', { locale: fi })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Kesto</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.is_ongoing ? 'Jatkuva kampanja' : `${campaignDays} päivää`}
                    </p>
                  </div>
                </div>
              </div>

              {/* --- Channels --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <Tv size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Kanavat</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {formData.channel_meta && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                        <Instagram size={14} /> Meta
                      </span>
                    )}
                    {formData.channel_display && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-purple-50 text-purple-700">
                        <Monitor size={14} /> Display
                      </span>
                    )}
                    {formData.channel_pdooh && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-teal-50 text-teal-700">
                        <Tv size={14} /> PDOOH
                      </span>
                    )}
                    {formData.channel_audio && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                        <Volume2 size={14} /> Audio
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* --- Creative Content --- */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                      <Palette size={18} className="text-[#00A5B5]" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Sisältö</h3>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Otsikko</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {(creativeConfig.headline || 'Hymyile.|Olet hyvissä käsissä.').replace(/\|/g, ' ').replace(/<br\s*\/?>/g, ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">CTA</p>
                      <p className="text-sm font-semibold text-gray-900">{creativeConfig.cta || 'Varaa aika'}</p>
                    </div>
                    {creativeConfig.priceBubbleMode === 'price' && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Hinta</p>
                        {selectedServices.filter(s => s.code !== 'yleinen-brandiviesti').length > 1 ? (
                          <div className="space-y-0.5">
                            {selectedServices.filter(s => s.code !== 'yleinen-brandiviesti').map(svc => (
                              <p key={svc.id} className="text-sm font-semibold text-gray-900">
                                {getServiceName(svc)}: {creativeConfig.servicePrices[svc.id] || creativeConfig.offer || '49'}€
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">
                            {(() => {
                              const svc = selectedServices.find(s => s.code !== 'yleinen-brandiviesti') || selectedService;
                              const price = (svc?.id && creativeConfig.servicePrices[svc.id]) || creativeConfig.offer || '49';
                              return `${price}€`;
                            })()}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Hintakupla</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {creativeConfig.priceBubbleMode === 'price' ? 'Hinnalla' : 'Ilman hintaa'}
                      </p>
                    </div>
                    {creativeConfig.targetUrl && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Kohde-URL</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{creativeConfig.targetUrl}</p>
                      </div>
                    )}
                  </div>

                  {/* Media selections */}
                  {(creativeConfig.videoFile || creativeConfig.selectedVideo || creativeConfig.selectedAudio || creativeConfig.audioFile) && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Meta Media</p>
                      <div className="flex flex-wrap gap-2">
                        {(creativeConfig.videoFile || creativeConfig.selectedVideo) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-pink-50 text-pink-700">
                            <Video size={14} />
                            {creativeConfig.videoFile
                              ? creativeConfig.videoFile.name
                              : creativeConfig.selectedVideo?.includes('nainen') ? 'Nainen' : creativeConfig.selectedVideo?.includes('mies') ? 'Mies' : 'Video'}
                          </span>
                        )}
                        {(creativeConfig.audioFile || creativeConfig.selectedAudio) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-50 text-green-700">
                            <Volume2 size={14} />
                            {creativeConfig.audioFile
                              ? 'Oma äänitiedosto'
                              : creativeConfig.selectedAudio?.includes('Brändillinen') ? 'Brändillinen' : creativeConfig.selectedAudio?.includes('Geneerinen') ? 'Geneerinen' : creativeConfig.selectedAudio?.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {formData.creative_type === 'both' && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Luovien jako</p>
                      <p className="text-sm font-semibold text-gray-900">
                        Valtakunnallinen {formData.creative_weight_nationwide}% / Paikallinen {formData.creative_weight_local}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* --- Budget --- */}
              <div className="bg-gradient-to-r from-[#1B365D] to-[#00A5B5] rounded-2xl overflow-hidden text-white">
                <div className="px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/15">
                      <Euro size={18} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-white">Budjetti</h3>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <p className="text-white/70 text-sm">{formData.is_ongoing ? 'Kuukausibudjetti' : 'Kokonaisbudjetti'}</p>
                      <p className="text-4xl font-bold mt-1">{formData.total_budget.toLocaleString('fi-FI')}€{formData.is_ongoing ? '/kk' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/70 text-sm">{formData.is_ongoing ? 'Viikkobudjetti' : 'Päiväbudjetti'}</p>
                      <p className="text-xl font-bold">
                        ~{formData.is_ongoing
                          ? Math.round(formData.total_budget / 4.3).toLocaleString('fi-FI')
                          : Math.round(formData.total_budget / Math.max(campaignDays, 1)).toLocaleString('fi-FI')
                        }€{formData.is_ongoing ? '/vko' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {formData.channel_meta && (
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">Meta{formData.is_ongoing ? ' /kk' : ''}</p>
                        <p className="text-lg font-bold">{formData.budget_meta.toLocaleString('fi-FI')}€</p>
                      </div>
                    )}
                    {formData.channel_display && (
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">Display{formData.is_ongoing ? ' /kk' : ''}</p>
                        <p className="text-lg font-bold">{formData.budget_display.toLocaleString('fi-FI')}€</p>
                      </div>
                    )}
                    {formData.channel_pdooh && (
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">PDOOH{formData.is_ongoing ? ' /kk' : ''}</p>
                        <p className="text-lg font-bold">{formData.budget_pdooh.toLocaleString('fi-FI')}€</p>
                      </div>
                    )}
                    {formData.channel_audio && (
                      <div className="bg-white/10 rounded-xl p-3">
                        <p className="text-white/60 text-xs mb-1">Audio{formData.is_ongoing ? ' /kk' : ''}</p>
                        <p className="text-lg font-bold">{formData.budget_audio.toLocaleString('fi-FI')}€</p>
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

        {currentStep < 5 ? (
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
                {isEditMode ? 'Päivitetään...' : 'Luodaan...'}
              </>
            ) : (
              <>
                <Sparkles size={18} className="mr-2" />
                {isEditMode ? 'Tallenna muutokset' : 'Luo kampanja'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Terveystalo Budget Edit Dialog */}
      {terveystaloBudgetEdit.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md animate-scale-in">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Muokkaa kokonaisbudjettia</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Haluatko muuttaa Terveystalon kokonaisbudjettia? Tämä vaikuttaa kaikkien toimipisteiden budjetteihin.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Uusi kokonaisbudjetti
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={terveystaloBudgetEdit.newValue}
                    onChange={(e) => setTerveystaloBudgetEdit(prev => ({ ...prev, newValue: Number(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    placeholder="Kirjoita uusi budjetti..."
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Nykyinen:</span>
                  <span className="font-semibold">{getTotalTerveystaloBudget().total.toLocaleString('fi-FI')}€</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setTerveystaloBudgetEdit({ isOpen: false, newValue: 0, isLoading: false })}
                  disabled={terveystaloBudgetEdit.isLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Peruuta
                </button>
                <button
                  onClick={confirmTerveystaloBudgetChange}
                  disabled={terveystaloBudgetEdit.isLoading}
                  className="flex-1 px-4 py-2.5 bg-[#00A5B5] text-white rounded-xl font-medium hover:bg-[#00A5B5]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {terveystaloBudgetEdit.isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Tallennetaan...
                    </>
                  ) : (
                    'Vahvista'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignCreate;
