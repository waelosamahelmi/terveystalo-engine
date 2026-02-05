// ============================================================================
// SUUN TERVEYSTALO - Demo Tooltip Component
// Guided tooltips for demo mode
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { isDemoMode, markTooltipShown, isTooltipShown } from '../lib/demoService';

interface DemoTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  showOnce?: boolean;
  delay?: number;
  onDismiss?: () => void;
  nextTooltip?: string;
}

const DemoTooltip = ({ 
  id, 
  title, 
  description, 
  position = 'bottom',
  children, 
  showOnce = true,
  delay = 500,
  onDismiss,
  nextTooltip
}: DemoTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show in demo mode and if not already shown (when showOnce is true)
    if (!isDemoMode()) return;
    if (showOnce && isTooltipShown(id)) return;

    const timer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => setIsVisible(true), 50);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, showOnce, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsAnimating(false);
      if (showOnce) {
        markTooltipShown(id);
      }
      onDismiss?.();
    }, 200);
  };

  const handleNext = () => {
    handleDismiss();
    if (nextTooltip) {
      // Trigger next tooltip by dispatching custom event
      window.dispatchEvent(new CustomEvent('demo-tooltip-next', { detail: nextTooltip }));
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-8 border-r-8 border-t-8 border-transparent border-t-[#1B365D]';
      case 'bottom':
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-transparent border-b-[#1B365D]';
      case 'left':
        return 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-t-8 border-b-8 border-l-8 border-transparent border-l-[#1B365D]';
      case 'right':
        return 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-t-8 border-b-8 border-r-8 border-transparent border-r-[#1B365D]';
      default:
        return 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-8 border-r-8 border-b-8 border-transparent border-b-[#1B365D]';
    }
  };

  if (!isDemoMode()) {
    return <>{children}</>;
  }

  return (
    <div ref={targetRef} className="relative inline-block">
      {children}
      
      {isAnimating && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()} transition-all duration-200 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* Tooltip card */}
          <div className="relative bg-gradient-to-br from-[#1B365D] to-[#0046AD] text-white rounded-xl shadow-2xl w-72 overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00A5B5]/20 to-transparent pointer-events-none" />
            
            {/* Header */}
            <div className="relative px-4 pt-4 pb-2 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#00A5B5]/20 rounded-lg">
                  <Sparkles size={14} className="text-[#00A5B5]" />
                </div>
                <h4 className="font-semibold text-sm">{title}</h4>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            
            {/* Content */}
            <div className="relative px-4 pb-3">
              <p className="text-sm text-white/80 leading-relaxed">{description}</p>
            </div>
            
            {/* Footer */}
            <div className="relative px-4 pb-4 flex items-center justify-between">
              <span className="text-xs text-white/50">Demo-vinkki</span>
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#00A5B5] hover:bg-[#008A98] text-white text-xs font-medium rounded-lg transition-colors"
              >
                Selvä
                <ChevronRight size={12} />
              </button>
            </div>
            
            {/* Arrow */}
            <div className={`absolute w-0 h-0 ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoTooltip;

// ============================================================================
// DEMO BANNER COMPONENT
// Shows at the top of pages in demo mode
// ============================================================================

interface DemoBannerProps {
  message?: string;
}

export const DemoBanner = ({ message }: DemoBannerProps) => {
  if (!isDemoMode()) return null;

  return (
    <div className="bg-gradient-to-r from-[#00A5B5]/10 via-[#0046AD]/10 to-[#00A5B5]/10 dark:from-[#00A5B5]/20 dark:via-[#0046AD]/20 dark:to-[#00A5B5]/20 border-b border-[#00A5B5]/20 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm">
        <Sparkles size={14} className="text-[#00A5B5]" />
        <span className="text-[#1B365D] dark:text-white/90 font-medium">
          {message || 'Demo-tila: Tämä on esimerkki-dataa. Muutokset eivät tallennu.'}
        </span>
      </div>
    </div>
  );
};
