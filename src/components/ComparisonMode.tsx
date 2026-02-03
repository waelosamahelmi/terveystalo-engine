// ============================================================================
// SUUN TERVEYSTALO - Comparison Mode Component
// Compare metrics between time periods, branches, or campaigns
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { format, subDays, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MapPin,
  Megaphone,
  ChevronDown,
  X,
  BarChart3,
  Eye,
  MousePointer,
  DollarSign,
  Target,
  Loader2
} from 'lucide-react';

type ComparisonType = 'time' | 'branch' | 'campaign';
type TimePeriod = 'week' | 'month' | 'quarter' | 'custom';

interface ComparisonData {
  label: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
}

interface ComparisonModeProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: ComparisonType;
}

const ComparisonMode = ({ isOpen, onClose, defaultType = 'time' }: ComparisonModeProps) => {
  const [comparisonType, setComparisonType] = useState<ComparisonType>(defaultType);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  
  const { campaigns, branches } = useStore();

  // Time period options
  const timeOptions = [
    { value: 'week', label: 'Viikko', description: 'Tämä vs. viime viikko' },
    { value: 'month', label: 'Kuukausi', description: 'Tämä vs. viime kuukausi' },
    { value: 'quarter', label: 'Kvartaali', description: '3kk vs. edellinen 3kk' },
  ];

  // Fetch comparison data based on type
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchComparisonData = async () => {
      setLoading(true);
      try {
        if (comparisonType === 'time') {
          await fetchTimeComparison();
        } else if (comparisonType === 'branch' && selectedItems.length >= 2) {
          await fetchBranchComparison();
        } else if (comparisonType === 'campaign' && selectedItems.length >= 2) {
          await fetchCampaignComparison();
        }
      } catch (error) {
        console.error('Error fetching comparison data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [isOpen, comparisonType, timePeriod, selectedItems]);

  const fetchTimeComparison = async () => {
    const now = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (timePeriod) {
      case 'week':
        currentStart = startOfWeek(now, { locale: fi });
        currentEnd = endOfWeek(now, { locale: fi });
        previousStart = startOfWeek(subDays(now, 7), { locale: fi });
        previousEnd = endOfWeek(subDays(now, 7), { locale: fi });
        break;
      case 'month':
        currentStart = startOfMonth(now);
        currentEnd = endOfMonth(now);
        previousStart = startOfMonth(subMonths(now, 1));
        previousEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        currentStart = subMonths(now, 3);
        currentEnd = now;
        previousStart = subMonths(now, 6);
        previousEnd = subMonths(now, 3);
        break;
      default:
        return;
    }

    // Fetch current period
    const { data: currentData } = await supabase
      .from('campaign_analytics')
      .select('impressions, clicks, spend')
      .gte('date', format(currentStart, 'yyyy-MM-dd'))
      .lte('date', format(currentEnd, 'yyyy-MM-dd'));

    // Fetch previous period
    const { data: previousData } = await supabase
      .from('campaign_analytics')
      .select('impressions, clicks, spend')
      .gte('date', format(previousStart, 'yyyy-MM-dd'))
      .lte('date', format(previousEnd, 'yyyy-MM-dd'));

    const aggregateCurrent = aggregateData(currentData || []);
    const aggregatePrevious = aggregateData(previousData || []);

    setComparisonData([
      {
        label: timePeriod === 'week' ? 'Tämä viikko' : timePeriod === 'month' ? 'Tämä kuukausi' : 'Viimeiset 3kk',
        ...aggregateCurrent
      },
      {
        label: timePeriod === 'week' ? 'Viime viikko' : timePeriod === 'month' ? 'Viime kuukausi' : 'Edelliset 3kk',
        ...aggregatePrevious
      }
    ]);
  };

  const fetchBranchComparison = async () => {
    const results: ComparisonData[] = [];
    
    for (const branchId of selectedItems.slice(0, 3)) {
      const branch = branches.find(b => b.id === branchId);
      if (!branch) continue;

      const { data } = await supabase
        .from('campaign_analytics')
        .select('impressions, clicks, spend, dental_campaigns!inner(branch_id)')
        .eq('dental_campaigns.branch_id', branchId);

      const aggregated = aggregateData(data || []);
      results.push({
        label: branch.name,
        ...aggregated
      });
    }

    setComparisonData(results);
  };

  const fetchCampaignComparison = async () => {
    const results: ComparisonData[] = [];
    
    for (const campaignId of selectedItems.slice(0, 3)) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) continue;

      const { data } = await supabase
        .from('campaign_analytics')
        .select('impressions, clicks, spend')
        .eq('campaign_id', campaignId);

      const aggregated = aggregateData(data || []);
      results.push({
        label: campaign.name,
        ...aggregated
      });
    }

    setComparisonData(results);
  };

  const aggregateData = (data: any[]): Omit<ComparisonData, 'label'> => {
    const impressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
    const clicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const spend = data.reduce((sum, d) => sum + (d.spend || 0), 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    
    return { impressions, clicks, spend, ctr };
  };

  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const ChangeIndicator = ({ value }: { value: number }) => {
    if (Math.abs(value) < 0.5) {
      return <Minus size={16} className="text-gray-400" />;
    }
    return value > 0 ? (
      <div className="flex items-center text-green-600">
        <TrendingUp size={16} className="mr-1" />
        <span className="text-sm font-medium">+{value.toFixed(1)}%</span>
      </div>
    ) : (
      <div className="flex items-center text-red-600">
        <TrendingDown size={16} className="mr-1" />
        <span className="text-sm font-medium">{value.toFixed(1)}%</span>
      </div>
    );
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id].slice(0, 3)
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#00A5B5]/5 to-[#1B365D]/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#00A5B5] to-[#1B365D]">
                <ArrowLeftRight size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Vertailutila</h2>
                <p className="text-sm text-gray-500">Vertaile suorituskykyä eri ajanjaksojen tai kohteiden välillä</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Comparison Type Tabs */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex space-x-2">
            {[
              { type: 'time' as const, label: 'Aikajakso', icon: Calendar },
              { type: 'branch' as const, label: 'Toimipisteet', icon: MapPin },
              { type: 'campaign' as const, label: 'Kampanjat', icon: Megaphone }
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  setComparisonType(type);
                  setSelectedItems([]);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  comparisonType === type
                    ? 'bg-gradient-to-r from-[#00A5B5] to-[#1B365D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selection Area */}
        <div className="p-6 border-b border-gray-100">
          {comparisonType === 'time' && (
            <div className="flex space-x-3">
              {timeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimePeriod(option.value as TimePeriod)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    timePeriod === option.value
                      ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </button>
              ))}
            </div>
          )}

          {comparisonType === 'branch' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Valitse 2-3 toimipistettä vertailtavaksi</p>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => toggleItem(branch.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedItems.includes(branch.id)
                        ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">{branch.name}</p>
                    <p className="text-xs text-gray-500">{branch.city}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {comparisonType === 'campaign' && (
            <div>
              <p className="text-sm text-gray-500 mb-3">Valitse 2-3 kampanjaa vertailtavaksi</p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {campaigns.slice(0, 10).map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => toggleItem(campaign.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedItems.includes(campaign.id)
                        ? 'border-[#00A5B5] bg-[#00A5B5]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm truncate">{campaign.name}</p>
                    <p className="text-xs text-gray-500">{campaign.status}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comparison Results */}
        <div className="p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#00A5B5] animate-spin" />
            </div>
          ) : comparisonData.length < 2 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {comparisonType === 'time' 
                  ? 'Valitse aikajakso nähdäksesi vertailun'
                  : 'Valitse vähintään 2 kohdetta vertailtavaksi'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { key: 'impressions', label: 'Näyttökerrat', icon: Eye, format: (v: number) => v.toLocaleString('fi-FI') },
                  { key: 'clicks', label: 'Klikkaukset', icon: MousePointer, format: (v: number) => v.toLocaleString('fi-FI') },
                  { key: 'spend', label: 'Käytetty', icon: DollarSign, format: (v: number) => `€${v.toLocaleString('fi-FI', { minimumFractionDigits: 2 })}` },
                  { key: 'ctr', label: 'CTR', icon: Target, format: (v: number) => `${v.toFixed(2)}%` }
                ].map(({ key, label, icon: Icon, format: formatValue }) => (
                  <div key={key} className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Icon size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-500">{label}</span>
                    </div>
                    {comparisonData.map((data, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-0">
                        <span className="text-xs text-gray-500 truncate max-w-[60px]">{data.label}</span>
                        <span className="font-semibold text-gray-900">
                          {formatValue(data[key as keyof ComparisonData] as number)}
                        </span>
                      </div>
                    ))}
                    {comparisonData.length === 2 && (
                      <div className="pt-2 mt-2 border-t border-gray-200">
                        <ChangeIndicator 
                          value={calculateChange(
                            comparisonData[0][key as keyof ComparisonData] as number,
                            comparisonData[1][key as keyof ComparisonData] as number
                          )} 
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Visual Comparison Bars */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-4">Visuaalinen vertailu</h4>
                {['impressions', 'clicks', 'spend'].map((metric) => {
                  const maxValue = Math.max(...comparisonData.map(d => d[metric as keyof ComparisonData] as number));
                  const labels = {
                    impressions: 'Näyttökerrat',
                    clicks: 'Klikkaukset',
                    spend: 'Käytetty budjetti'
                  };
                  
                  return (
                    <div key={metric} className="mb-4 last:mb-0">
                      <p className="text-sm text-gray-500 mb-2">{labels[metric as keyof typeof labels]}</p>
                      <div className="space-y-2">
                        {comparisonData.map((data, idx) => {
                          const value = data[metric as keyof ComparisonData] as number;
                          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                          const colors = ['from-[#00A5B5] to-[#008a97]', 'from-[#1B365D] to-[#2a4a7a]', 'from-[#E31E24] to-[#f15a5f]'];
                          
                          return (
                            <div key={idx} className="flex items-center space-x-3">
                              <span className="w-24 text-sm text-gray-600 truncate">{data.label}</span>
                              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${colors[idx]} rounded-full transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="w-20 text-sm font-medium text-gray-900 text-right">
                                {metric === 'spend' ? `€${value.toLocaleString('fi-FI')}` : value.toLocaleString('fi-FI')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonMode;
