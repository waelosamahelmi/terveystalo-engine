// ============================================================================
// SUUN TERVEYSTALO - Campaign Creation Wizard V2
// Complete redesign with dynamic budget allocation and map integration
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCampaign } from '../lib/campaignService';
import { getCreativeTemplates, renderTemplateHtml } from '../lib/creativeService';
import { countScreensInRadius, MediaScreen } from '../lib/mediaScreensService';
import { useStore, store } from '../lib/store';
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
  Download
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

// Finnish cities for exclusion list
const FINNISH_CITIES = [
  'Helsinki', 'Espoo', 'Vantaa', 'Tampere', 'Turku', 'Oulu',
  'Jyväskylä', 'Lahti', 'Pori', 'Kouvola', 'Rovaniemi',
  'Joensuu', 'Lappeenranta', 'Hämeenlinna', 'Vaasa', 'Seinäjoki',
  'Kuopio', 'Kotka', 'Hyvinkää', 'Iisalmi', 'Kerava', 'Raisio',
  'Nurmijärvi', 'Mikkeli', 'Kaarina', 'Lohja', 'Porvoo', 'Rauma',
  'Tuusula', 'Vihti', 'Eurajoki', 'Salo', 'Kokkola', 'Oulainen',
  'Riihimäki', 'Tornio', 'Järvenpää', 'Mäntsälä'
];

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
  { id: 'mies', name: 'Mies', url: '/refs/assets/mies.jpg' },
  { id: 'nainen', name: 'Nainen', url: '/refs/assets/nainen.jpg' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CampaignCreate = () => {
  const navigate = useNavigate();
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

  // Excluded cities for nationwide campaigns
  const [excludedCities, setExcludedCities] = useState<string[]>([]);

  // Branch screen counts - stores screen count for each branch
  const [branchScreenCounts, setBranchScreenCounts] = useState<Record<string, number>>({});

  // All Finland screens for nationwide mode
  const [allFinlandScreens, setAllFinlandScreens] = useState<MediaScreen[]>([]);

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
    target_age_max: 80,
    target_genders: ['all'],
    campaign_objective: 'traffic',
    is_ongoing: false
  });

  // Fetch screens when branches or radii change
  useEffect(() => {
    const fetchBranchScreens = async () => {
      if (formData.ad_type === 'nationwide') {
        // Fetch all Finland screens for nationwide mode
        try {
          const { data, error } = await supabase
            .from('media_screens')
            .select('*')
            .eq('status', 'active');
          if (data) {
            const validScreens = data.filter(s => s.latitude && s.longitude);
            setAllFinlandScreens(validScreens);
          }
        } catch (error) {
          console.error('Error loading Finland screens:', error);
        }
        return;
      }

      // For local mode, fetch screens for each selected branch
      if (formData.branch_ids.length === 0) {
        setBranchScreenCounts({});
        setCombinedBranchScreens([]);
        return;
      }

      try {
        const screenCounts: Record<string, number> = {};
        const allScreens: MediaScreen[] = [];
        const seenScreenIds = new Set<number>();

        // Fetch screens for each branch
        for (const branchId of formData.branch_ids) {
          const branch = branches.find(b => b.id === branchId);
          if (!branch) continue;

          const radius = branchRadiusSettings[branchId]?.radius || 10;
          const result = await countScreensInRadius(
            branch.latitude,
            branch.longitude || 0,
            radius * 1000
          );

          screenCounts[branchId] = result.total;

          // Add unique screens to combined list
          result.screensInRadius.forEach(screen => {
            if (!seenScreenIds.has(screen.id)) {
              seenScreenIds.add(screen.id);
              allScreens.push(screen);
            }
          });
        }

        setBranchScreenCounts(screenCounts);
        setCombinedBranchScreens(allScreens);
      } catch (error) {
        console.error('Error loading branch screens:', error);
      }
    };

    fetchBranchScreens();
  }, [formData.branch_ids, formData.ad_type, branchRadiusSettings, branches]);

  // Creative config - initialize with defaults, will update based on selections
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
    selectedAudio: null,
    disclaimerText: 'Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.',
    generalBrandMessage: 'Hymyile.<br>Olet hyvissä käsissä.',
    videoFile: null,
    selectedVideo: null,
    conceptType: 'service',
    multiLocationMode: 'single',
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
  const [creativeTab, setCreativeTab] = useState<'content' | 'media' | 'videos' | 'settings'>('content');

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

  // Update available sizes when templates are loaded
  useEffect(() => {
    if (dbTemplates.length > 0) {
      // Build available sizes from database templates
      // Use a plain object to dedupe by size+type combination (unique key)
      // Note: Can't use Map because it's shadowed by lucide-react's Map icon import
      const sizesRecord: Record<string, PreviewSize> = {};

      dbTemplates
        .filter(t => t.active)
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
            category: type.charAt(0).toUpperCase() + type.slice(1) as 'Display' | 'PDOOH' | 'Meta',
            templateType: type // Store the actual template type for lookup
          };
        });

      const sizesFromDb = Object.values(sizesRecord);

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
  const selectedServices = services.filter(s => formData.service_ids.includes(s.id));
  const selectedService = selectedServices[0] || services.find(s => s.id === formData.service_id);
  const selectedBranches = branches.filter(b => formData.branch_ids.includes(b.id));
  const selectedBranch = selectedBranches[0] || branches.find(b => b.id === formData.branch_id);

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

      // When enabling a channel, set its budget to 50% of total
      // When disabling, set to 0
      if (newEnabled) {
        const channelBudget = Math.round(formData.total_budget * 0.5);

        if (channel === 'meta') updated.budget_meta = channelBudget;
        if (channel === 'display') updated.budget_display = channelBudget;
        if (channel === 'pdooh') updated.budget_pdooh = channelBudget;
        if (channel === 'audio') updated.budget_audio = channelBudget;
      } else {
        if (channel === 'meta') updated.budget_meta = 0;
        if (channel === 'display') updated.budget_display = 0;
        if (channel === 'pdooh') updated.budget_pdooh = 0;
        if (channel === 'audio') updated.budget_audio = 0;
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

  // Update total budget - each enabled channel gets 50% of the total
  const updateTotalBudget = (newTotal: number) => {
    const channelBudget = Math.round(newTotal * 0.5);

    setFormData(prev => ({
      ...prev,
      total_budget: newTotal,
      budget_meta: prev.channel_meta ? channelBudget : 0,
      budget_display: prev.channel_display ? channelBudget : 0,
      budget_pdooh: prev.channel_pdooh ? channelBudget : 0,
      budget_audio: prev.channel_audio ? channelBudget : 0,
    }));
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

    // If we have a type suffix, find exact match
    if (templateType) {
      return dbTemplates.find(t => t.size === baseSize && t.type === templateType && t.active);
    }

    // Legacy fallback: Handle 1080x1080 as Meta size (square format)
    if (sizeId === '1080x1080') {
      return dbTemplates.find(t => t.size === '1080x1080' && t.type === 'meta' && t.active);
    }

    // For sizes without type suffix, find first active non-meta template (backward compat)
    return dbTemplates.find(t => t.size === baseSize && t.type !== 'meta' && t.active);
  }, [dbTemplates]);

  // Build template variables from creativeConfig + branch data
  const buildTemplateVariables = useCallback((showAddress: boolean): Record<string, string> => {
    const baseUrl = window.location.origin;
    // Use previewService for preview context, fallback to selectedService
    const serviceForPreview = previewService || selectedService;
    const isGeneralBrandMessage = serviceForPreview?.code === 'yleinen-brandiviesti';

    // Get cities for multi-location display
    const uniqueCities = [...new Set(selectedBranches.map(b => b.city))].sort();
    const isMultiLocation = selectedBranches.length > 1;
    const isMultiService = selectedServices.length > 1;

    // Get service name
    const serviceName = serviceForPreview?.name_fi || serviceForPreview?.name || 'Palvelu';
    // Convert service name to elative form (e.g., "Suuhygienistikäynti" -> "Suuhygienistikäynnistä")
    let serviceNameElative = serviceName.toLowerCase();
    if (serviceNameElative.endsWith('äynti')) {
      serviceNameElative = serviceNameElative.slice(0, -5) + 'äynnistä';
    } else if (serviceNameElative.endsWith('nti')) {
      serviceNameElative = serviceNameElative.slice(0, -3) + 'nnistä';
    } else {
      serviceNameElative = serviceNameElative + 'sta';
    }

    // Build location text for address position
    // This goes in the {{branch_address}} placeholder
    let locationText = '';
    if (isMultiLocation) {
      // Multi-location: "Kamppi • Itäkeskus • Ogeli • Redi" style
      locationText = uniqueCities.join(' • ');
    } else {
      // Single location: Use actual address - e.g., "Torikatu 1, Lahti"
      const city = selectedBranch?.city || '';
      const address = selectedBranch?.address || '';
      locationText = address ? `${address}, ${city}` : city;
    }

    // Build branch name for message (e.g., "Lahden Suun Terveystalo")
    const branchName = selectedBranch?.name || selectedBranch?.city || '';

    // Build message for subheadline position
    // This goes in the {{subheadline}} placeholder
    let messageText = creativeConfig.subheadline;
    if (!messageText) {
      if (isGeneralBrandMessage) {
        // Brand message: "Sujuvampaa suunterveyttä hammastarkastuksista erikoisosaamisesta vaativiin hoitoihin"
        messageText = 'Sujuvampaa suunterveyttä hammastarkastuksista erikoisosaamisesta vaativiin hoitoihin';
      } else if (isMultiService) {
        // Multi-service: Include service name "Sujuvampaa suunterveyttä Suuhygienistikäynnistä erikoisosaamisesta vaativiin hoitoihin"
        messageText = `Sujuvampaa suunterveyttä ${serviceNameElative} erikoisosaamisesta vaativiin hoitoihin`;
      } else {
        // Single service: Include branch name in message
        messageText = `Sujuvampaa suunterveyttä ${branchName}`;
      }
    }

    // Headline - always use the user's input or default
    // Use | in default which will be converted to <br> in renderTemplateHtml
    const headlineText = creativeConfig.headline || 'Hymyile.|Olet hyvissä käsissä.';

    // Split headline into two parts for templates that use headline_line2
    // Handle both | and <br> as line separator
    const headlineParts = headlineText.split(/<br>|\|/);
    const headlineLine2 = headlineParts.length > 1 ? headlineParts.slice(1).join('<br>') : '';

    // Offer title - use service name if user hasn't entered custom text
    let offerTitle = creativeConfig.offerTitle;
    if (!offerTitle && !isGeneralBrandMessage) {
      offerTitle = serviceName; // e.g., "Suuhygienistikäynti"
    }

    // Price
    const priceValue = creativeConfig.offer || '49';

    // For brand message, don't show offer
    const finalOfferTitle = isGeneralBrandMessage ? '' : offerTitle;
    const finalPrice = isGeneralBrandMessage ? '' : priceValue;

    // Branch address - shows the location text when showAddress is true
    const finalAddress = showAddress ? locationText : '';

    return {
      // Text content
      title: 'Suun Terveystalo',
      headline: headlineParts[0], // First part only (e.g., "Hymyile.")
      headline_line2: headlineLine2, // Second part if exists (e.g., "Olet hyvissä käsissä.")
      subheadline: messageText,
      offer_title: finalOfferTitle,
      price: finalPrice,
      currency: '€',
      cta_text: creativeConfig.cta || 'Varaa aika',
      branch_address: finalAddress,

      // Scene 3 text lines (for PDOOH templates with 5-line format)
      scene3_line1: 'Sujuvampaa',
      scene3_line2: 'suun',
      scene3_line3: 'terveyttä',
      scene3_line4: selectedBranch?.city || 'Oulun',
      scene3_line5: 'Suun Terveystalossa.',

      // Scene 3 text lines (for Meta templates with 4-line format)
      scene3_line2a: 'suun',
      scene3_line2b: 'terveyttä',

      city_name: selectedBranch?.city || 'Oulu',

      // Images (for Meta templates - two scene images)
      scene1_image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop&crop=faces',
      scene2_image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop&crop=faces',

      // Images (for PDOOH templates - single image + logo)
      logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
      artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork.png`,
      image_url: creativeConfig.backgroundImage || `${baseUrl}/refs/assets/nainen.jpg`,
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
      badge_price_size: '82',
      badge_price_weight: '900',
      badge_price_lineheight: '0.85',
      badge_euro_size: '52',
      badge_euro_weight: '700',
      badge_euro_top: '6',
      badge_euro_left: '2',
      headline_top: '50',
      headline_size: '70',
      headline_weight: '800',
      headline_start_y: '30',
      headline_end_y: '90',
      subline_top: '50',
      subline_size: '62',
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
      disclaimer_text: creativeConfig.disclaimerText || '',
    };
  }, [creativeConfig, selectedBranch, selectedBranches, selectedService, previewService]);

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
      renderedHtml = renderedHtml.replace('</head>', '<style>.address, .Torikatu1Laht, .branch_address { display: none !important; }</style></head>');
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
        headline: creativeConfig.headline || 'Hymyile.<br>Olet hyvissä käsissä.',
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
                            setFormData({ ...formData, ad_type: type.id, creative_type: type.id, branch_ids: allBranchIds, branch_id: allBranchIds[0] || '' });
                          } else {
                            setFormData({ ...formData, ad_type: type.id, creative_type: type.id, branch_ids: [], branch_id: '' });
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
                <h2 className="text-lg font-bold text-gray-900">
                  {formData.ad_type === 'nationwide' ? 'Alueellinen kohdistus' : 'Toimipisteet'}
                </h2>
                <p className="text-xs text-gray-500">
                  {formData.ad_type === 'nationwide'
                    ? 'Valtakunnallinen kampanja'
                    : `${formData.branch_ids.length} valittu`
                  }
                </p>
              </div>
            </div>

            {formData.ad_type === 'nationwide' ? (
              // ============================================
              // NATIONWIDE MODE: Finland Map + City Exclusion
              // ============================================
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  <MapComponent mode="finland" allScreens={allFinlandScreens} />
                </div>

                {/* City Exclusion */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Sulje pois kaupungkeja (valinnainen)
                    </label>
                    <span className="text-xs text-gray-500">
                      {excludedCities.length} valittu
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    Valitse kaupungkeja, jotka haluat jättää kampanjan ulkopuolelle.
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {FINNISH_CITIES.map(city => {
                      const isExcluded = excludedCities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setExcludedCities(prev =>
                              isExcluded
                                ? prev.filter(c => c !== city)
                                : [...prev, city]
                            );
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                            isExcluded
                              ? 'bg-red-50 border-red-300 text-red-700 line-through'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-[#00A5B5]'
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                  {excludedCities.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">Pois suljetut:</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {excludedCities.map(city => (
                          <span key={city} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            {city}
                            <button
                              type="button"
                              onClick={() => setExcludedCities(prev => prev.filter(c => c !== city))}
                              className="ml-1 hover:text-red-900"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // ============================================
              // LOCAL MODE: Branch Selection with Radii
              // ============================================
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
                    {filteredBranches.slice(0, 20).map(branch => {
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
            )}
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

                {/* Age Input */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Minimi</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={formData.target_age_min || 18}
                      onChange={(e) => setFormData({ ...formData, target_age_min: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 text-center font-semibold border border-gray-200 rounded-xl focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center text-gray-300 pt-5">
                    <div className="w-8 h-0.5 bg-gray-300" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Maksimi</label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={formData.target_age_max || 80}
                      onChange={(e) => setFormData({ ...formData, target_age_max: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 text-center font-semibold border border-gray-200 rounded-xl focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Age Presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '18-35', min: 18, max: 35, icon: Smile },
                    { label: '25-45', min: 25, max: 45, icon: UserCircle },
                    { label: '35-65', min: 35, max: 65, icon: Users },
                    { label: '45-75', min: 45, max: 75, icon: User },
                  ].map(preset => {
                    const Icon = preset.icon;
                    const isActive = (formData.target_age_min || 18) === preset.min && (formData.target_age_max || 80) === preset.max;
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
              </div>

              {/* Gender Card */}
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
                        onClick={() => setFormData({ ...formData, target_genders: [gender.id] })}
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
                <label className="text-sm font-semibold text-gray-700">Kampanjan budjetti</label>
                <span className="text-sm text-gray-500">
                  {campaignDays > 0 ? `${Math.round(formData.total_budget / campaignDays)}€/päivä` : '-'}
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
                    {amount}€
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
              // Calculate recommendation based on campaign factors
              const getRecommendation = () => {
                const recs = {
                  meta: 35,    // Default: 35% Meta
                  display: 35,  // Default: 35% Display
                  pdooh: 25,   // Default: 25% PDOOH
                  audio: 5     // Default: 5% Audio
                };

                // Adjust based on campaign objective
                if (formData.campaign_objective === 'traffic') {
                  recs.meta = 40;    // Meta is good for clicks/traffic
                  recs.display = 30;
                  recs.pdooh = 25;
                  recs.audio = 5;
                } else if (formData.campaign_objective === 'reach') {
                  recs.meta = 30;
                  recs.display = 40;  // Display is good for reach
                  recs.pdooh = 25;
                  recs.audio = 5;
                }

                // Adjust based on PDOOH screens availability
                const totalScreens = formData.ad_type === 'nationwide'
                  ? allFinlandScreens.length
                  : Object.values(branchScreenCounts).reduce((sum, count) => sum + count, 0);

                if (totalScreens > 0) {
                  // More screens = higher PDOOH recommendation
                  const screenFactor = Math.min(totalScreens / 20, 1); // Cap at 20 screens
                  recs.pdooh = Math.round(20 + (screenFactor * 20)); // 20-40%

                  // Reduce others proportionally
                  const reduction = recs.pdooh - 25;
                  recs.meta = Math.max(20, recs.meta - Math.round(reduction * 0.4));
                  recs.display = Math.max(20, recs.display - Math.round(reduction * 0.4));
                  recs.audio = Math.max(0, recs.audio - Math.round(reduction * 0.2));
                } else {
                  // No screens available = reduce PDOOH
                  recs.pdooh = 0;
                  recs.meta = Math.round(recs.meta + 12);
                  recs.display = Math.round(recs.display + 13);
                }

                // Adjust based on campaign type
                if (formData.ad_type === 'nationwide') {
                  // Nationwide campaigns benefit more from display/PDOOH for broad reach
                  recs.display = Math.round(recs.display * 1.1);
                  recs.pdooh = Math.round(recs.pdooh * 1.1);
                  recs.meta = Math.round(100 - recs.display - recs.pdooh - recs.audio);
                }

                return recs;
              };

              const recommendation = getRecommendation();
              const applyRecommendation = () => {
                const newBudgets = {
                  budget_meta: Math.round(formData.total_budget * recommendation.meta / 100),
                  budget_display: Math.round(formData.total_budget * recommendation.display / 100),
                  budget_pdooh: recommendation.pdooh > 0 ? Math.round(formData.total_budget * recommendation.pdooh / 100) : 0,
                  budget_audio: Math.round(formData.total_budget * recommendation.audio / 100),
                };
                setFormData(prev => ({ ...prev, ...newBudgets }));
                // Also enable channels with budget > 0
                setFormData(prev => ({
                  ...prev,
                  ...newBudgets,
                  channel_meta: newBudgets.budget_meta > 0,
                  channel_display: newBudgets.budget_display > 0,
                  channel_pdooh: newBudgets.budget_pdooh > 0,
                  channel_audio: newBudgets.budget_audio > 0,
                }));
                toast.success('Suositus toteutettu!');
              };

              const totalScreens = formData.ad_type === 'nationwide'
                ? allFinlandScreens.length
                : Object.values(branchScreenCounts).reduce((sum, count) => sum + count, 0);

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
                      onClick={applyRecommendation}
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
                      { channel: 'audio', label: 'Audio', percent: recommendation.audio, color: '#1DB954' },
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
              <div className="grid grid-cols-4 divide-x divide-gray-200">
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

                {/* Audio */}
                <div className={`p-4 cursor-pointer transition-colors ${formData.channel_audio ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                     onClick={() => toggleChannel('audio')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 size={16} style={{ color: '#1DB954' }} />
                      <span className="text-sm font-medium">Audio</span>
                    </div>
                    <div className="relative w-8 h-4">
                      <div className={`absolute inset-0 rounded-full transition-colors ${formData.channel_audio ? 'bg-[#1DB954]' : 'bg-gray-300'}`} />
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${formData.channel_audio ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                  {formData.channel_audio && (
                    <input
                      type="number"
                      value={formData.budget_audio}
                      onChange={(e) => setFormData(prev => ({ ...prev, budget_audio: Number(e.target.value) }))}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1 text-lg font-bold text-center border border-gray-200 rounded-lg"
                    />
                  )}
                </div>
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
                {formData.channel_audio && formData.budget_audio > 0 && (
                  <div className="h-full bg-[#1DB954]" style={{ width: `${(formData.budget_audio / formData.total_budget) * 100}%` }} />
                )}
              </div>

              {/* Summary row */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 text-xs text-gray-600">
                <span>Yhteensä: <strong>{enabledChannelsBudget}€</strong></span>
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
                  { id: 'videos' as const, label: 'Videot', icon: Video, badge: formData.channel_meta ? 'Meta' : undefined },
                  { id: 'settings' as const, label: 'Asetukset', icon: Settings },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = creativeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setCreativeTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-[#00A5B5] text-white shadow-md shadow-[#00A5B5]/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      } ${tab.id === 'videos' && !formData.channel_meta ? 'opacity-50' : ''}`}
                    >
                      <Icon size={16} />
                      {tab.label}
                      {tab.badge && (
                        <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">{tab.badge}</span>
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

                      {/* Price Bubble Section - Hide for general brand message */}
                      {selectedService?.code !== 'yleinen-brandiviesti' && (
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
                                  <input
                                    type="text"
                                    value={creativeConfig.offerTitle.replace(/<br\s*\/?>/gi, '')}
                                    onChange={(e) => setCreativeConfig({ ...creativeConfig, offerTitle: e.target.value })}
                                    placeholder="Hammas-tarkastus"
                                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                    Hinta (€)
                                  </label>
                                  <input
                                    type="number"
                                    value={creativeConfig.offer}
                                    onChange={(e) => setCreativeConfig({ ...creativeConfig, offer: e.target.value })}
                                    placeholder="49"
                                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                  Voimassaoloaika
                                </label>
                                <input
                                  type="text"
                                  value={creativeConfig.offerDate.replace(/<br\s*\/?>/gi, ' ')}
                                  onChange={(e) => setCreativeConfig({ ...creativeConfig, offerDate: e.target.value })}
                                  placeholder="Varaa viimeistään 28.10."
                                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#00A5B5] focus:ring-2 focus:ring-[#00A5B5]/20 outline-none transition-all"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      )}

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

                      {/* Legal Text - for PDOOH */}
                      {formData.channel_pdooh && (
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

                  {/* VIDEOS TAB - Meta ads */}
                  {creativeTab === 'videos' && (
                    <div className="space-y-5 animate-fade-in">
                      {!formData.channel_meta ? (
                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
                          <Instagram size={48} className="mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">Meta-kanava ei ole valittu</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Videot ovat saatavilla vain Meta-mainoksille.
                          </p>
                          <button
                            onClick={() => setCurrentStep(3)}
                            className="px-4 py-2 bg-[#E1306C] text-white rounded-lg text-sm font-medium hover:bg-[#d0295f] transition-colors"
                          >
                            Lisää Meta-kanava budjetista
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Video Upload Section */}
                          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-white">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-100">
                                  <Video size={18} className="text-pink-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">Videon lataus</h3>
                                  <p className="text-xs text-gray-500">MP4, MOV tai WebP - enintään 30 sekuntia</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-5">
                              {!creativeConfig.videoFile && !creativeConfig.selectedVideo ? (
                                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-pink-400 hover:bg-pink-50/30 transition-all group">
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

                          {/* Video Library */}
                          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 rounded-lg bg-indigo-100">
                                    <FolderOpen size={18} className="text-indigo-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-900">Videokirjasto</h3>
                                    <p className="text-xs text-gray-500">Tallennetut videot</p>
                                  </div>
                                </div>
                                <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                                  Hallitse
                                </button>
                              </div>
                            </div>
                            <div className="p-5">
                              {videoLibrary.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                  <Film size={48} className="mx-auto mb-3 opacity-50" />
                                  <p className="text-sm">Ei tallennettuja videoita</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-4">
                                  {videoLibrary.map(video => (
                                    <button
                                      key={video.id}
                                      onClick={() => setCreativeConfig({ ...creativeConfig, selectedVideo: video.url, videoFile: null })}
                                      className={`relative rounded-xl overflow-hidden border-2 transition-all group ${
                                        creativeConfig.selectedVideo === video.url
                                          ? 'border-[#E1306C] ring-2 ring-[#E1306C]/30'
                                          : 'border-gray-200 hover:border-[#E1306C]/50'
                                      }`}
                                    >
                                      <div className="aspect-video bg-gray-900 relative">
                                        {video.thumbnail ? (
                                          <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Video size={32} className="text-gray-600" />
                                          </div>
                                        )}
                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                                          <Clock size={10} />
                                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play size={20} className="text-[#E1306C] ml-1" />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-2 bg-white">
                                        <p className="text-xs font-medium text-gray-700 truncate">{video.name}</p>
                                      </div>
                                      {creativeConfig.selectedVideo === video.url && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#E1306C] rounded-full flex items-center justify-center">
                                          <Check size={14} className="text-white" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* SETTINGS TAB */}
                  {creativeTab === 'settings' && (
                    <div className="space-y-5 animate-fade-in">
                      {/* Multi-location Settings */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-teal-100">
                              <MapPin size={18} className="text-teal-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Sijaintiasetukset</h3>
                              <p className="text-xs text-gray-500">Miten sijainnit näkyvät mainoksissa</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-5">
                          {selectedBranches.length > 1 ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">Yhdistä sijainnit</p>
                                  <p className="text-xs text-gray-500">Luo yksi mainos kaikille sijainneille</p>
                                </div>
                                <select
                                  value={creativeConfig.multiLocationMode}
                                  onChange={(e) => setCreativeConfig({ ...creativeConfig, multiLocationMode: e.target.value as 'single' | 'multi' })}
                                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-[#00A5B5] outline-none"
                                >
                                  <option value="multi">Yhdistä ("Usealla paikkakunnalla")</option>
                                  <option value="single">Eroittain (jokaiselle oma)</option>
                                </select>
                              </div>
                              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <div className="flex items-start gap-3">
                                  <AlertCircle size={18} className="text-amber-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-amber-800">Valittu {selectedBranches.length} toimipistettä</p>
                                    <p className="text-xs text-amber-700 mt-1">
                                      {creativeConfig.multiLocationMode === 'multi'
                                        ? `Luodaan yksi mainos, jossa maininta "${[...new Set(selectedBranches.map(b => b.city))].sort().slice(0, 3).join(', ')}${selectedBranches.length > 3 ? '...' : ''}"`
                                        : `Luodaan ${selectedBranches.length} eri mainosta, yksi kutakin toimipistettä varten`
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Valitse useampi toimipiste nähdäksesi sijaintiasetukset.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Audio Settings */}
                      {formData.channel_audio && (
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-white">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Volume2 size={18} className="text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Audio-mainos</h3>
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
                          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1DB954] hover:bg-green-50/30 transition-all">
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
                      )}
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

                      {/* Size selector - grouped by category */}
                      <div className="p-3 border-b border-gray-100">
                        {/* Group sizes by category */}
                        {['Display', 'PDOOH', 'Meta'].map((category) => {
                          const sizesInCat = availableSizes.filter(s => s.category === category);
                          const isChannelDisabled =
                            (category === 'Display' && !formData.channel_display) ||
                            (category === 'PDOOH' && !formData.channel_pdooh) ||
                            (category === 'Meta' && !formData.channel_meta);

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
                              {(formData.creative_type === 'local' || formData.creative_type === 'both') && (
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
                              {(formData.creative_type === 'nationwide' || formData.creative_type === 'both') && (
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
                            <span className="font-medium text-[#004E9A]">{creativeConfig.offer}€</span>
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

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <ToothIcon size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {selectedServices.length > 1 ? `Palvelut (${selectedServices.length})` : 'Palvelu'}
                  </span>
                </div>
                {selectedServices.length <= 1 ? (
                  <p className="text-lg font-semibold text-gray-900">{getServiceName(selectedService)}</p>
                ) : (
                  <div className="space-y-1">
                    {selectedServices.map(s => (
                      <p key={s.id} className="text-sm font-medium text-gray-900">{getServiceName(s)}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="card p-5 bg-gradient-to-br from-[#00A5B5]/5 to-transparent">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#00A5B5]/10">
                    <MapPin size={20} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {selectedBranches.length > 1 ? `Toimipisteet (${selectedBranches.length})` : 'Toimipiste'}
                  </span>
                </div>
                {selectedBranches.length <= 1 ? (
                  <>
                    <p className="text-lg font-semibold text-gray-900">{selectedBranch?.name}</p>
                    <p className="text-sm text-gray-500">{selectedBranch?.city}</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-gray-900">{selectedBranches.length} toimipistettä</p>
                    <p className="text-sm text-gray-500">
                      {[...new Set(selectedBranches.map(b => b.city))].sort().join(', ')}
                    </p>
                  </>
                )}
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
                {creativeConfig.priceBubbleMode === 'price' ? (
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
