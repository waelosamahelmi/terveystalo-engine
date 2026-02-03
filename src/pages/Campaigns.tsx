// ============================================================================
// SUUN TERVEYSTALO - Campaigns Page
// List and manage all dental marketing campaigns
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { pauseCampaign, deleteCampaign, duplicateCampaign } from '../lib/campaignService';
import { supabase } from '../lib/supabase';
import type { DentalCampaign, CampaignStatus, CampaignFilters, Service, Branch } from '../types';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Pause,
  Copy,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Target,
  TrendingUp,
  RefreshCw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

// Status Badge Component
const StatusBadge = ({ status }: { status: CampaignStatus }) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    paused: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  };

  const labels = {
    draft: 'Luonnos',
    pending: 'Odottaa',
    active: 'Aktiivinen',
    paused: 'Keskeytetty',
    completed: 'Päättynyt',
    cancelled: 'Peruttu',
  };

  return (
    <span className={`badge ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// Campaign Card Component
interface CampaignCardProps {
  campaign: DentalCampaign;
  onPause: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const CampaignCard = ({ campaign, onPause, onDuplicate, onDelete }: CampaignCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const progress = campaign.total_budget > 0 
    ? Math.min(100, ((campaign.spent_budget || 0) / campaign.total_budget) * 100)
    : 0;

  return (
    <div className="card-hover overflow-hidden animate-fade-in dark:bg-slate-800/70 dark:border-white/10">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <StatusBadge status={campaign.status} />
              {campaign.channels && campaign.channels.length > 0 && (
                <span className="badge badge-primary">
                  {campaign.channels.join(', ')}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{campaign.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {campaign.service?.name || 'Palvelu'}
            </p>
          </div>
          
          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreVertical size={18} className="text-gray-400" />
            </button>
            
            {menuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 z-20 animate-scale-in">
                  <button
                    onClick={() => {
                      navigate(`/campaigns/${campaign.id}`);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <Eye size={16} className="mr-3 text-gray-400" />
                    Näytä tiedot
                  </button>
                  
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => {
                        onPause(campaign.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <Pause size={16} className="mr-3 text-gray-400" />
                      Keskeytä
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onDuplicate(campaign.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <Copy size={16} className="mr-3 text-gray-400" />
                    Kopioi
                  </button>
                  
                  {(campaign.status === 'draft' || campaign.status === 'cancelled') && (
                    <button
                      onClick={() => {
                        onDelete(campaign.id);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 size={16} className="mr-3" />
                      Poista
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Branch Info */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-3">
          <MapPin size={14} className="mr-1.5" />
          <span>{campaign.branch?.name}, {campaign.branch?.city}</span>
        </div>

        {/* Date Range */}
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          <Calendar size={14} className="mr-1.5" />
          <span>
            {format(new Date(campaign.start_date), 'd.M.yyyy')} - {campaign.end_date ? format(new Date(campaign.end_date), 'd.M.yyyy') : 'Jatkuva'}
          </span>
        </div>
      </div>

      {/* Budget Progress */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500 dark:text-gray-400">Budjetti</span>
          <span className="font-medium text-gray-900 dark:text-white">
            €{(campaign.spent_budget || 0).toLocaleString('fi-FI')} / €{campaign.total_budget.toLocaleString('fi-FI')}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#00A5B5] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Eye size={14} className="mr-1" />
            <span>{(campaign.total_impressions || 0).toLocaleString('fi-FI')}</span>
          </div>
          <div className="flex items-center text-gray-600 dark:text-gray-400">
            <Target size={14} className="mr-1" />
            <span>{(campaign.total_clicks || 0).toLocaleString('fi-FI')}</span>
          </div>
        </div>
        {campaign.ctr && campaign.ctr > 0 && (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <TrendingUp size={14} className="mr-1" />
            <span>CTR {campaign.ctr.toFixed(2)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Filter Modal Component
interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CampaignFilters;
  onApply: (filters: CampaignFilters) => void;
  services: Pick<Service, 'id' | 'name'>[];
  branches: Pick<Branch, 'id' | 'name' | 'city'>[];
}

const FilterModal = ({ isOpen, onClose, filters, onApply, services, branches }: FilterModalProps) => {
  const [localFilters, setLocalFilters] = useState<CampaignFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onApply({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Suodata kampanjat</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tila</label>
            <div className="flex flex-wrap gap-2">
              {(['draft', 'pending', 'active', 'paused', 'completed', 'cancelled'] as CampaignStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    const currentStatus = localFilters.status || [];
                    const newStatus = currentStatus.includes(status)
                      ? currentStatus.filter(s => s !== status)
                      : [...currentStatus, status];
                    setLocalFilters({ ...localFilters, status: newStatus.length ? newStatus : undefined });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    localFilters.status?.includes(status)
                      ? 'bg-[#00A5B5] text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <StatusBadge status={status} />
                </button>
              ))}
            </div>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kanava</label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'pdooh', label: 'DOOH' },
                { value: 'display', label: 'Display' },
                { value: 'meta', label: 'Social' },
                { value: 'digital_audio', label: 'Audio' },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocalFilters({ ...localFilters, channel: localFilters.channel === value ? undefined : value })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    localFilters.channel === value
                      ? 'bg-[#00A5B5] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Palvelu</label>
            <select
              value={localFilters.service_id || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, service_id: e.target.value || undefined })}
              className="input"
            >
              <option value="">Kaikki palvelut</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Piste</label>
            <select
              value={localFilters.branch_id || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, branch_id: e.target.value || undefined })}
              className="input"
            >
              <option value="">Kaikki pisteet</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}, {branch.city}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alkaen</label>
              <input
                type="date"
                value={localFilters.date_from || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, date_from: e.target.value || undefined })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Päättyen</label>
              <input
                type="date"
                value={localFilters.date_to || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, date_to: e.target.value || undefined })}
                className="input"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between p-6 border-t border-gray-100">
          <button onClick={handleClear} className="btn-ghost">
            Tyhjennä
          </button>
          <button onClick={handleApply} className="btn-primary">
            Käytä suodattimia
          </button>
        </div>
      </div>
    </div>
  );
};

const Campaigns = () => {
  // Get data from global store - instant, no loading
  const { campaigns: allCampaigns, services: allServices, branches: allBranches, refreshCampaigns } = useStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Filter and paginate from store data
  const filteredCampaigns = useMemo(() => {
    let result = [...allCampaigns];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.branch?.name?.toLowerCase().includes(query) ||
        c.service?.name?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (filters.status && filters.status.length > 0) {
      result = result.filter(c => filters.status?.includes(c.status as CampaignStatus));
    }
    
    // Service filter
    if (filters.service_id) {
      result = result.filter(c => c.service_id === filters.service_id);
    }
    
    // Branch filter
    if (filters.branch_id) {
      result = result.filter(c => c.branch_id === filters.branch_id);
    }
    
    return result;
  }, [allCampaigns, searchQuery, filters]);

  const totalCount = filteredCampaigns.length;
  const campaigns = filteredCampaigns.slice((page - 1) * pageSize, page * pageSize);
  
  // Services and branches for filter dropdowns
  const services = useMemo(() => 
    allServices.filter(s => s.active).map(s => ({ id: s.id, name: s.name })),
    [allServices]
  );
  const branches = useMemo(() => 
    allBranches.filter(b => b.active).map(b => ({ id: b.id, name: b.name, city: b.city })),
    [allBranches]
  );

  useEffect(() => {
    // Reset page when filters change
    setPage(1);
  }, [filters, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshCampaigns();
    setRefreshing(false);
  };

  const handlePause = async (id: string) => {
    const success = await pauseCampaign(id);
    if (success) {
      // Realtime will sync the store
      toast.success('Kampanja keskeytetty');
    } else {
      toast.error('Keskeytys epäonnistui');
    }
  };

  const handleDuplicate = async (id: string) => {
    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast.error('Kirjaudu sisään kopioidaksesi kampanjan');
      return;
    }
    
    const duplicated = await duplicateCampaign(id, session.user.id);
    if (duplicated) {
      toast.success('Kampanja kopioitu');
      refreshCampaigns();
    } else {
      toast.error('Kopiointi epäonnistui');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän kampanjan?')) return;
    
    const success = await deleteCampaign(id);
    if (success) {
      toast.success('Kampanja poistettu');
      // Store will refresh via realtime
    } else {
      toast.error('Poistaminen epäonnistui');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kampanjat</h1>
          <p className="text-gray-500 mt-1">
            {totalCount} kampanjaa yhteensä
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="btn-ghost"
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link to="/campaigns/create" className="btn-primary">
            <Plus size={18} className="mr-2" />
            Luo kampanja
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Hae kampanjoita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </form>

          {/* Quick Status Filters */}
          <div className="flex items-center space-x-2">
            {(['active', 'draft', 'paused'] as CampaignStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => {
                  const currentStatus = filters.status || [];
                  const newStatus = currentStatus.includes(status)
                    ? currentStatus.filter(s => s !== status)
                    : [...currentStatus, status];
                  setFilters({ ...filters, status: newStatus.length ? newStatus : undefined });
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.status?.includes(status)
                    ? 'bg-[#00A5B5] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'active' ? 'Aktiiviset' : status === 'draft' ? 'Luonnokset' : 'Keskeytetyt'}
              </button>
            ))}
          </div>

          {/* More Filters */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`btn-outline relative ${activeFiltersCount > 0 ? 'border-[#00A5B5]' : ''}`}
          >
            <Filter size={18} className="mr-2" />
            Suodattimet
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#00A5B5] text-white text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ei kampanjoita</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || activeFiltersCount > 0
              ? 'Yhtään kampanjaa ei löytynyt hakuehdoilla.'
              : 'Aloita luomalla ensimmäinen kampanja.'}
          </p>
          {!searchQuery && activeFiltersCount === 0 && (
            <Link to="/campaigns/create" className="btn-primary">
              <Plus size={18} className="mr-2" />
              Luo ensimmäinen kampanja
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onPause={handlePause}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost btn-sm disabled:opacity-50"
              >
                Edellinen
              </button>
              <span className="text-sm text-gray-600">
                Sivu {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost btn-sm disabled:opacity-50"
              >
                Seuraava
              </button>
            </div>
          )}
        </>
      )}

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={setFilters}
        services={services}
        branches={branches}
      />
    </div>
  );
};

export default Campaigns;
