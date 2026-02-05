// ============================================================================
// SUUN TERVEYSTALO - Demo Wizard Component
// Interactive onboarding wizard for demo mode users
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  LayoutDashboard, 
  Megaphone, 
  BarChart3, 
  CheckCircle2,
  Play,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  TrendingUp,
  ArrowRight,
  Zap
} from 'lucide-react';
import { 
  WIZARD_STEPS, 
  DEMO_CAMPAIGNS, 
  DEMO_ANALYTICS, 
  setDemoWizardCompleted, 
  setDemoWizardStep,
  getDemoWizardStep
} from '../lib/demoService';

interface DemoWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const DemoWizard = ({ isOpen, onClose, onComplete }: DemoWizardProps) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(getDemoWizardStep());
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setDemoWizardStep(currentStep);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleSkip = () => {
    setDemoWizardCompleted(true);
    onClose();
  };

  const handleComplete = () => {
    setDemoWizardCompleted(true);
    onComplete();
    onClose();
  };

  const handleTryIt = (path: string) => {
    setDemoWizardCompleted(true);
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  const step = WIZARD_STEPS[currentStep];

  const getStepIcon = (iconName: string, size: number = 24) => {
    const icons: Record<string, React.ReactNode> = {
      'sparkles': <Sparkles size={size} />,
      'layout-dashboard': <LayoutDashboard size={size} />,
      'megaphone': <Megaphone size={size} />,
      'chart-bar': <BarChart3 size={size} />,
      'check-circle': <CheckCircle2 size={size} />,
    };
    return icons[iconName] || <Sparkles size={size} />;
  };

  const renderStepContent = () => {
    switch (step.content) {
      case 'welcome':
        return (
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00A5B5] to-[#0046AD] rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-[#00A5B5] to-[#0046AD] rounded-full flex items-center justify-center mx-auto">
                <Sparkles size={32} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {step.titleFi}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto">
                {step.descriptionFi}
              </p>
            </div>
            <div className="bg-gradient-to-r from-[#00A5B5]/10 to-[#0046AD]/10 dark:from-[#00A5B5]/20 dark:to-[#0046AD]/20 rounded-xl p-4 border border-[#00A5B5]/20">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                Mitä tässä demossa opit:
              </h4>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A5B5]/20 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard size={14} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Kojelauta</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A5B5]/20 flex items-center justify-center flex-shrink-0">
                    <Megaphone size={14} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Kampanja</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A5B5]/20 flex items-center justify-center flex-shrink-0">
                    <BarChart3 size={14} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Analytiikka</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00A5B5]/20 flex items-center justify-center flex-shrink-0">
                    <Zap size={14} className="text-[#00A5B5]" />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">AI-työkalut</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#00A5B5] to-[#008A98] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <LayoutDashboard size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {step.titleFi}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                {step.descriptionFi}
              </p>
            </div>

            {/* Demo Stats Preview - Compact 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-[#00A5B5] mb-1">
                  <Eye size={14} />
                  <span className="text-xs font-medium">Näytöt</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {(DEMO_ANALYTICS.totalImpressions / 1000).toFixed(0)}k
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={10} /> +12.5%
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-[#E31E24] mb-1">
                  <MousePointer size={14} />
                  <span className="text-xs font-medium">Klikkaukset</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {(DEMO_ANALYTICS.totalClicks / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={10} /> +8.3%
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-[#1B365D] dark:text-[#60a5fa] mb-1">
                  <Target size={14} />
                  <span className="text-xs font-medium">Konversiot</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {DEMO_ANALYTICS.totalConversions}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={10} /> +15.2%
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign size={14} />
                  <span className="text-xs font-medium">Käytetty</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {(DEMO_ANALYTICS.totalSpent / 1000).toFixed(1)}k€
                </p>
                <p className="text-xs text-gray-500">
                  CTR: {DEMO_ANALYTICS.ctr}%
                </p>
              </div>
            </div>

            <button
              onClick={() => handleTryIt('/')}
              className="w-full py-2.5 px-4 bg-[#00A5B5]/10 hover:bg-[#00A5B5]/20 text-[#00A5B5] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Play size={16} />
              Kokeile kojelautaa
            </button>
          </div>
        );

      case 'create-campaign':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#E31E24] to-[#C91920] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Megaphone size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {step.titleFi}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                {step.descriptionFi}
              </p>
            </div>

            {/* Campaign Creation Steps - Two columns on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-7 h-7 rounded-full bg-[#00A5B5] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Valitse palvelu</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Hammashoito, oikominen...</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-7 h-7 rounded-full bg-[#00A5B5] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Valitse toimipiste</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Helsinki, Espoo, Tampere...</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-7 h-7 rounded-full bg-[#00A5B5] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Aseta budjetti</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Päivä/viikkobudjetti</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-7 h-7 rounded-full bg-[#00A5B5] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Valitse kanavat</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Display, PDOOH, Audio</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTryIt('/campaigns/create')}
              className="w-full py-2.5 px-4 bg-[#E31E24]/10 hover:bg-[#E31E24]/20 text-[#E31E24] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Play size={16} />
              Kokeile kampanjan luontia
            </button>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#1B365D] to-[#0046AD] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {step.titleFi}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
                {step.descriptionFi}
              </p>
            </div>

            {/* Demo Campaigns Preview - Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_CAMPAIGNS.slice(0, 2).map((campaign) => (
                <div 
                  key={campaign.id}
                  className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white text-xs truncate">
                      {campaign.name}
                    </h4>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                      campaign.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {campaign.status === 'active' ? 'Aktiivinen' : 'Valmis'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Näytöt</span>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {(campaign.impressions / 1000).toFixed(0)}k
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Budjetti</span>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {campaign.spent_budget}€
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00A5B5] to-[#008A98] rounded-full"
                      style={{ width: `${(campaign.spent_budget / campaign.total_budget) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleTryIt('/analytics')}
              className="w-full py-2.5 px-4 bg-[#1B365D]/10 hover:bg-[#1B365D]/20 text-[#1B365D] dark:text-[#60a5fa] font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
            >
              <Play size={16} />
              Katso analytiikka
            </button>
          </div>
        );

      case 'finish':
        return (
          <div className="text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {step.titleFi}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto">
                {step.descriptionFi}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-xl p-4 border border-green-500/20">
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                Nyt voit vapaasti tutkia alustaa. Demo-tilassa kampanjat eivät ole oikeasti aktiivisia.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-full text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  🔒 Turvallinen
                </span>
                <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-full text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  💰 Ei kuluja
                </span>
                <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded-full text-xs text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  📊 Demo-data
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 flex-shrink-0">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {WIZARD_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-[#00A5B5]' 
                    : index < currentStep 
                      ? 'w-4 bg-[#00A5B5]/50' 
                      : 'w-4 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {getStepIcon(step.icon, 16)}
            <span>Vaihe {currentStep + 1} / {WIZARD_STEPS.length}</span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className={`px-6 pb-4 overflow-y-auto flex-1 min-h-0 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          {renderStepContent()}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-slate-800/50 flex-shrink-0">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              currentStep === 0
                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <ChevronLeft size={18} />
            Edellinen
          </button>

          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Ohita
          </button>

          {currentStep === WIZARD_STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00A5B5] to-[#008A98] text-white font-medium rounded-xl shadow-lg shadow-[#00A5B5]/30 hover:shadow-xl hover:shadow-[#00A5B5]/40 transition-all"
            >
              Aloita
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#00A5B5] to-[#008A98] text-white font-medium rounded-xl shadow-lg shadow-[#00A5B5]/30 hover:shadow-xl hover:shadow-[#00A5B5]/40 transition-all"
            >
              Seuraava
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Demo badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 bg-[#00A5B5]/10 text-[#00A5B5] text-xs font-semibold rounded-full flex items-center gap-1">
            <Sparkles size={12} />
            DEMO
          </span>
        </div>
      </div>
    </div>
  );
};

export default DemoWizard;
