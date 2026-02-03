// ============================================================================
// SUUN TERVEYSTALO - Campaign Creation Wizard
// 7-step wizard for creating dental marketing campaigns
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createCampaign } from '../lib/campaignService';
import { getCreativeTemplates, generateCreativeHTML } from '../lib/creativeService';
import { useStore } from '../lib/store';
import type { Service, Branch, CampaignFormData, CreativeTemplate } from '../types';
import { format, addDays, addWeeks } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  Stethoscope,
  Tv,
  Calendar,
  DollarSign,
  Palette,
  Eye,
  Sparkles,
  Target,
  Users,
  Building2,
  Zap,
  ChevronDown,
  Info,
  X,
  Plus,
  Minus
} from 'lucide-react';
import toast from 'react-hot-toast';

// Step indicator component
interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

const StepIndicator = ({ currentStep, totalSteps, steps }: StepIndicatorProps) => (
  <div className="flex items-center justify-center mb-8">
    {steps.map((step, index) => (
      <div key={index} className="flex items-center">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-medium transition-all ${
          index < currentStep 
            ? 'bg-[#00A5B5] text-white' 
            : index === currentStep 
              ? 'bg-[#1B365D] text-white ring-4 ring-[#00A5B5]/20' 
              : 'bg-gray-200 text-gray-500'
        }`}>
          {index < currentStep ? <Check size={18} /> : index + 1}
        </div>
        {index < totalSteps - 1 && (
          <div className={`w-16 h-1 mx-2 rounded ${
            index < currentStep ? 'bg-[#00A5B5]' : 'bg-gray-200'
          }`} />
        )}
      </div>
    ))}
  </div>
);

// Service selection card
interface ServiceCardProps {
  service: Service;
  selected: boolean;
  onClick: () => void;
}

const ServiceCard = ({ service, selected, onClick }: ServiceCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border-2 text-left transition-all ${
      selected 
        ? 'border-[#00A5B5] bg-[#00A5B5]/5 ring-2 ring-[#00A5B5]/20' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${selected ? 'bg-[#00A5B5]/10 text-[#00A5B5]' : 'bg-gray-100 text-gray-500'}`}>
        <Stethoscope size={20} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{service.name}</h4>
        {service.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
        )}
        {service.price_from && (
          <p className="text-sm font-medium text-[#00A5B5] mt-2">
            Alkaen €{service.price_from}
          </p>
        )}
      </div>
      {selected && <Check size={20} className="text-[#00A5B5]" />}
    </div>
  </button>
);

// Branch selection card
interface BranchCardProps {
  branch: Branch;
  selected: boolean;
  onClick: () => void;
}

const BranchCard = ({ branch, selected, onClick }: BranchCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border-2 text-left transition-all ${
      selected 
        ? 'border-[#00A5B5] bg-[#00A5B5]/5 ring-2 ring-[#00A5B5]/20' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className="flex items-start space-x-3">
      <div className={`p-2 rounded-lg ${selected ? 'bg-[#00A5B5]/10 text-[#00A5B5]' : 'bg-gray-100 text-gray-500'}`}>
        <MapPin size={20} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-gray-900">{branch.name}</h4>
        <p className="text-sm text-gray-500">{branch.address}</p>
        <p className="text-sm text-gray-500">{branch.postal_code} {branch.city}</p>
      </div>
      {selected && <Check size={20} className="text-[#00A5B5]" />}
    </div>
  </button>
);

// Channel selection card
interface ChannelCardProps {
  name: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}

const ChannelCard = ({ name, description, icon: Icon, selected, onClick }: ChannelCardProps) => (
  <button
    onClick={onClick}
    className={`p-6 rounded-xl border-2 text-left transition-all ${
      selected 
        ? 'border-[#00A5B5] bg-[#00A5B5]/5 ring-2 ring-[#00A5B5]/20' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className={`p-3 rounded-xl inline-flex mb-4 ${selected ? 'bg-[#00A5B5]/10 text-[#00A5B5]' : 'bg-gray-100 text-gray-500'}`}>
      <Icon size={28} />
    </div>
    <h4 className="font-semibold text-gray-900">{name}</h4>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    {selected && (
      <div className="mt-4 flex items-center text-sm text-[#00A5B5] font-medium">
        <Check size={16} className="mr-1" />
        Valittu
      </div>
    )}
  </button>
);

const CampaignCreate = () => {
  const navigate = useNavigate();
  const { services, branches } = useStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<CampaignFormData>({
    name: '',
    service_id: '',
    branch_id: '',
    channels: [],
    start_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    end_date: format(addWeeks(new Date(), 5), 'yyyy-MM-dd'),
    total_budget: 1000,
    daily_budget: undefined,
    target_radius_km: 10,
    target_demographics: {},
    template_id: '',
    creative_variables: {},
  });
  
  // Data not in store
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [user, setUser] = useState<any>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Filter active items from store
  const activeServices = services.filter(s => s.active);
  const activeBranches = branches.filter(b => b.active);

  const steps = [
    'Palvelu',
    'Toimipiste',
    'Kanavat',
    'Aikataulu',
    'Budjetti',
    'Luova',
    'Yhteenveto'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Generate preview when template changes
    if (formData.template_id) {
      generatePreview();
    }
  }, [formData.template_id, formData.creative_variables]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setUser(userData);
      }

      // Load templates (not in store)
      const templatesData = await getCreativeTemplates({ active: true });
      setTemplates(templatesData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Tietojen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!formData.template_id) return;
    
    try {
      const selectedService = services.find(s => s.id === formData.service_id);
      const selectedBranch = branches.find(b => b.id === formData.branch_id);
      
      const variables = {
        service_name: selectedService?.name || 'Palvelu',
        service_price: selectedService?.price_from || '',
        branch_name: selectedBranch?.name || 'Toimipiste',
        branch_city: selectedBranch?.city || 'Kaupunki',
        branch_address: selectedBranch?.address || '',
        branch_phone: selectedBranch?.phone || '',
        ...formData.creative_variables
      };

      const html = await generateCreativeHTML(formData.template_id, variables);
      setPreviewHtml(html);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0:
        if (!formData.service_id) {
          toast.error('Valitse palvelu');
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
        if (formData.channels.length === 0) {
          toast.error('Valitse vähintään yksi kanava');
          return false;
        }
        break;
      case 3:
        if (!formData.start_date || !formData.end_date) {
          toast.error('Valitse kampanjan ajankohta');
          return false;
        }
        if (new Date(formData.start_date) >= new Date(formData.end_date)) {
          toast.error('Aloituspäivä tulee olla ennen lopetuspäivää');
          return false;
        }
        break;
      case 4:
        if (!formData.total_budget || formData.total_budget < 100) {
          toast.error('Minimibudjetti on €100');
          return false;
        }
        break;
      case 5:
        if (!formData.template_id) {
          toast.error('Valitse luova pohja');
          return false;
        }
        break;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setSaving(true);
    try {
      // Generate campaign name if empty
      const selectedService = services.find(s => s.id === formData.service_id);
      const selectedBranch = branches.find(b => b.id === formData.branch_id);
      
      const campaignName = formData.name || 
        `${selectedService?.name} - ${selectedBranch?.city} ${format(new Date(), 'MM/yyyy')}`;

      const campaign = await createCampaign({
        ...formData,
        name: campaignName,
        status: 'draft',
        created_by: user?.id,
      });

      if (campaign) {
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

  const toggleChannel = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const selectedService = services.find(s => s.id === formData.service_id);
  const selectedBranch = branches.find(b => b.id === formData.branch_id);
  const selectedTemplate = templates.find(t => t.id === formData.template_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/campaigns')}
          className="flex items-center text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Takaisin kampanjoihin
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Luo uusi kampanja</h1>
        <p className="text-gray-500 mt-1">
          {steps[currentStep]} • Vaihe {currentStep + 1}/{steps.length}
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} totalSteps={steps.length} steps={steps} />

      {/* Step Content */}
      <div className="card p-6 mb-6">
        {/* Step 1: Service Selection */}
        {currentStep === 0 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Valitse palvelu</h2>
            <p className="text-gray-500 mb-6">Mitä palvelua haluat markkinoida?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeServices.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  selected={formData.service_id === service.id}
                  onClick={() => setFormData({ ...formData, service_id: service.id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Branch Selection */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Valitse toimipiste</h2>
            <p className="text-gray-500 mb-6">Minkä toimipisteen palveluja markkinoidaan?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {activeBranches.map(branch => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  selected={formData.branch_id === branch.id}
                  onClick={() => setFormData({ ...formData, branch_id: branch.id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Channel Selection */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Valitse kanavat</h2>
            <p className="text-gray-500 mb-6">Missä kanavissa kampanja näkyy?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChannelCard
                name="DOOH"
                description="Digitaaliset ulkomainokset ja näytöt julkisissa tiloissa"
                icon={Tv}
                selected={formData.channels.includes('DOOH')}
                onClick={() => toggleChannel('DOOH')}
              />
              <ChannelCard
                name="Display"
                description="Bannerimainokset verkkosivuilla ja sovelluksissa"
                icon={Target}
                selected={formData.channels.includes('Display')}
                onClick={() => toggleChannel('Display')}
              />
              <ChannelCard
                name="Social"
                description="Mainokset sosiaalisessa mediassa"
                icon={Users}
                selected={formData.channels.includes('Social')}
                onClick={() => toggleChannel('Social')}
              />
            </div>

            {formData.channels.includes('DOOH') && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-900 mb-3">Kohdistussäde</h3>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.target_radius_km}
                    onChange={(e) => setFormData({ ...formData, target_radius_km: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00A5B5]"
                  />
                  <span className="text-lg font-semibold text-gray-900 min-w-[60px]">
                    {formData.target_radius_km} km
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Mainokset näkyvät {formData.target_radius_km} km säteellä toimipisteestä
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Schedule */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Aikataulu</h2>
            <p className="text-gray-500 mb-6">Milloin kampanja on aktiivinen?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alkamispäivä
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Päättymispäivä
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            {/* Quick duration buttons */}
            <div className="mt-6">
              <p className="text-sm text-gray-600 mb-3">Pikavalinnat:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '1 viikko', days: 7 },
                  { label: '2 viikkoa', days: 14 },
                  { label: '1 kuukausi', days: 30 },
                  { label: '3 kuukautta', days: 90 },
                ].map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => setFormData({
                      ...formData,
                      start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                      end_date: format(addDays(new Date(), days + 1), 'yyyy-MM-dd'),
                    })}
                    className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Budget */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Budjetti</h2>
            <p className="text-gray-500 mb-6">Määritä kampanjan budjetti</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kokonaisbudjetti (€)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: parseFloat(e.target.value) || 0 })}
                    min={100}
                    step={100}
                    className="input pl-10 text-xl font-semibold"
                    placeholder="1000"
                  />
                </div>
              </div>

              {/* Budget presets */}
              <div className="flex flex-wrap gap-2">
                {[500, 1000, 2500, 5000, 10000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setFormData({ ...formData, total_budget: amount })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.total_budget === amount
                        ? 'bg-[#00A5B5] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    €{amount.toLocaleString('fi-FI')}
                  </button>
                ))}
              </div>

              {/* Budget allocation */}
              {formData.channels.length > 1 && (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-900 mb-3">Kanavajakauma</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Budjetti jaetaan automaattisesti kanavien kesken tasaisesti.
                  </p>
                  <div className="space-y-2">
                    {formData.channels.map(channel => (
                      <div key={channel} className="flex items-center justify-between">
                        <span className="text-gray-700">{channel}</span>
                        <span className="font-medium text-gray-900">
                          €{Math.round(formData.total_budget / formData.channels.length).toLocaleString('fi-FI')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily budget estimate */}
              <div className="p-4 bg-[#00A5B5]/5 rounded-xl border border-[#00A5B5]/20">
                <div className="flex items-center space-x-2 text-[#00A5B5]">
                  <Info size={18} />
                  <span className="font-medium">Arvioitu päiväbudjetti</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  €{Math.round(formData.total_budget / Math.max(1, Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24)))).toLocaleString('fi-FI')} / päivä
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Creative */}
        {currentStep === 5 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Luova sisältö</h2>
            <p className="text-gray-500 mb-6">Valitse mainospohja ja muokkaa sisältöä</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mainospohja
                </label>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setFormData({ ...formData, template_id: template.id })}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        formData.template_id === template.id
                          ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          <p className="text-sm text-gray-500">{template.type} • {template.category}</p>
                        </div>
                        {formData.template_id === template.id && (
                          <Check size={20} className="text-[#00A5B5]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Custom variables */}
                {selectedTemplate && (
                  <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-gray-900">Muokkaa tekstejä</h4>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Otsikko</label>
                      <input
                        type="text"
                        value={formData.creative_variables?.headline || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          creative_variables: { ...formData.creative_variables, headline: e.target.value }
                        })}
                        placeholder={`${selectedService?.name || 'Palvelun nimi'}`}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Alateksti</label>
                      <input
                        type="text"
                        value={formData.creative_variables?.subheadline || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          creative_variables: { ...formData.creative_variables, subheadline: e.target.value }
                        })}
                        placeholder="Varaa aika nyt!"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Toimintakehotus (CTA)</label>
                      <input
                        type="text"
                        value={formData.creative_variables?.cta || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          creative_variables: { ...formData.creative_variables, cta: e.target.value }
                        })}
                        placeholder="Varaa aika"
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Esikatselu
                </label>
                <div className="bg-gray-100 rounded-xl p-4 min-h-64 flex items-center justify-center">
                  {previewHtml ? (
                    <div 
                      className="bg-white rounded-lg shadow-lg overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <Palette size={48} className="mx-auto mb-3 opacity-50" />
                      <p>Valitse pohja nähdäksesi esikatselun</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Summary */}
        {currentStep === 6 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Yhteenveto</h2>
            <p className="text-gray-500 mb-6">Tarkista kampanjan tiedot ennen luomista</p>
            
            <div className="space-y-6">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kampanjan nimi
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={`${selectedService?.name} - ${selectedBranch?.city} ${format(new Date(), 'MM/yyyy')}`}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Jätä tyhjäksi käyttääksesi automaattista nimeä
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-[#00A5B5]/10 rounded-lg">
                      <Stethoscope size={18} className="text-[#00A5B5]" />
                    </div>
                    <span className="font-medium text-gray-900">Palvelu</span>
                  </div>
                  <p className="text-gray-700">{selectedService?.name}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-[#00A5B5]/10 rounded-lg">
                      <MapPin size={18} className="text-[#00A5B5]" />
                    </div>
                    <span className="font-medium text-gray-900">Toimipiste</span>
                  </div>
                  <p className="text-gray-700">{selectedBranch?.name}</p>
                  <p className="text-sm text-gray-500">{selectedBranch?.city}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-[#00A5B5]/10 rounded-lg">
                      <Tv size={18} className="text-[#00A5B5]" />
                    </div>
                    <span className="font-medium text-gray-900">Kanavat</span>
                  </div>
                  <p className="text-gray-700">{formData.channels.join(', ')}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 bg-[#00A5B5]/10 rounded-lg">
                      <Calendar size={18} className="text-[#00A5B5]" />
                    </div>
                    <span className="font-medium text-gray-900">Aikataulu</span>
                  </div>
                  <p className="text-gray-700">
                    {format(new Date(formData.start_date), 'd.M.yyyy', { locale: fi })} - {format(new Date(formData.end_date), 'd.M.yyyy', { locale: fi })}
                  </p>
                </div>
              </div>

              {/* Budget Summary */}
              <div className="p-6 bg-gradient-to-r from-[#00A5B5]/10 to-[#1B365D]/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Kokonaisbudjetti</p>
                    <p className="text-3xl font-bold text-gray-900">€{formData.total_budget.toLocaleString('fi-FI')}</p>
                  </div>
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    <DollarSign size={32} className="text-[#00A5B5]" />
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
          className="btn-ghost disabled:opacity-50"
        >
          <ArrowLeft size={18} className="mr-2" />
          Edellinen
        </button>

        {currentStep < steps.length - 1 ? (
          <button onClick={handleNext} className="btn-primary">
            Seuraava
            <ArrowRight size={18} className="ml-2" />
          </button>
        ) : (
          <button 
            onClick={handleSubmit} 
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner mr-2" />
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
