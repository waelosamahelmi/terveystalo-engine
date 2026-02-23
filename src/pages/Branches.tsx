// ============================================================================
// SUUN TERVEYSTALO - Branches (Pisteet) Page
// Manage all dental clinic branches/locations
// Shows campaign budgets and active campaigns overview
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBranch, updateBranch, toggleBranchStatus } from '../lib/branchService';
import { getCampaignsByBranch } from '../lib/campaignService';
import { useStore } from '../lib/store';
import { countScreensInRadius } from '../lib/mediaScreensService';
import type { Branch, DentalCampaign } from '../types';
import {
  MapPin,
  Plus,
  Search,
  Edit,
  ToggleLeft,
  ToggleRight,
  Phone,
  Mail,
  X,
  Check,
  MapPinned,
  ChevronDown,
  Download,
  LayoutGrid,
  List,
  Monitor,
  Euro,
  Percent,
  TrendingUp,
  Calendar,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

// Branch Card Component
interface BranchCardProps {
  branch: Branch;
  onEdit: (branch: Branch) => void;
  onToggleStatus: (branchId: string) => void;
  screenCount?: number;
  campaigns: DentalCampaign[];
  totalCampaignBudget: number;
  hasActiveCampaigns: boolean;
}

const BranchCard = ({
  branch,
  onEdit,
  onToggleStatus,
  screenCount,
  campaigns,
  totalCampaignBudget,
  hasActiveCampaigns
}: BranchCardProps) => {
  // Calculate total budget from all campaigns
  const totalBudget = campaigns.reduce((sum, campaign) => {
    return sum + (campaign.total_budget || 0);
  }, 0);

  // Calculate budget by channel
  const channelBudgets = campaigns.reduce((acc, campaign) => {
    return {
      display: acc.display + (campaign.budget_display || 0),
      pdooh: acc.pdooh + (campaign.budget_pdooh || 0),
      meta: acc.meta + (campaign.budget_meta || 0),
    };
  }, { display: 0, pdooh: 0, meta: 0 });

  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  return (
  <div className="card-hover p-6 animate-fade-in dark:bg-slate-800/70 dark:border-white/10">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${branch.active ? 'bg-[#00A5B5]/10 dark:bg-[#00A5B5]/20' : 'bg-gray-100 dark:bg-slate-700'}`}>
          <MapPin size={24} className={branch.active ? 'text-[#00A5B5]' : 'text-gray-400'} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{branch.name}</h3>
            {hasActiveCampaigns && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full dark:bg-green-900/30 dark:text-green-400">
                <Activity size={12} />
                Aktiivinen
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{branch.city}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onToggleStatus(branch.id)}
          className={`p-2 rounded-lg transition-colors ${branch.active ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
          title={branch.active ? 'Deaktivoi' : 'Aktivoi'}
        >
          {branch.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>
        <button
          onClick={() => onEdit(branch)}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Muokkaa"
        >
          <Edit size={18} />
        </button>
      </div>
    </div>

    <div className="space-y-2 text-sm">
      <div className="flex items-center text-gray-600 dark:text-gray-300">
        <MapPinned size={16} className="mr-2 text-gray-400" />
        <span>{branch.address}, {branch.postal_code} {branch.city}</span>
      </div>
      {branch.phone && (
        <div className="flex items-center text-gray-600 dark:text-gray-300">
          <Phone size={16} className="mr-2 text-gray-400" />
          <span>{branch.phone}</span>
        </div>
      )}
      {branch.email && (
        <div className="flex items-center text-gray-600 dark:text-gray-300">
          <Mail size={16} className="mr-2 text-gray-400" />
          <span>{branch.email}</span>
        </div>
      )}
      {screenCount !== undefined && (
        <div className="flex items-center text-gray-600 dark:text-gray-300">
          <Monitor size={16} className="mr-2 text-gray-400" />
          <span>{screenCount} näyttöä 5 km säteellä</span>
        </div>
      )}

      {/* Campaign Budget Overview */}
      {campaigns.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/10">
          <div className="flex items-center text-gray-700 dark:text-gray-300 mb-2">
            <Euro size={16} className="mr-2 text-[#00A5B5]" />
            <span className="font-medium">Kampanjabudjetti:</span>
            <span className="ml-auto font-semibold text-[#00A5B5]">
              {totalBudget.toLocaleString('fi-FI')} €
            </span>
          </div>

          {/* Channel breakdown */}
          {(channelBudgets.display > 0 || channelBudgets.pdooh > 0 || channelBudgets.meta > 0) && (
            <div className="flex gap-2 text-xs mt-2">
              {channelBudgets.display > 0 && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded dark:bg-purple-900/30 dark:text-purple-400">
                  Display: {channelBudgets.display.toLocaleString('fi-FI')} €
                </span>
              )}
              {channelBudgets.pdooh > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded dark:bg-blue-900/30 dark:text-blue-400">
                  PDOOH: {channelBudgets.pdooh.toLocaleString('fi-FI')} €
                </span>
              )}
              {channelBudgets.meta > 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded dark:bg-green-900/30 dark:text-green-400">
                  Meta: {channelBudgets.meta.toLocaleString('fi-FI')} €
                </span>
              )}
            </div>
          )}

          {/* Active campaigns count */}
          {activeCampaigns.length > 0 && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-2">
              <Calendar size={12} className="mr-1" />
              {activeCampaigns.length} aktiivista kampanjaa
            </div>
          )}
        </div>
      )}
    </div>

    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/10">
      <div className="flex items-center space-x-1">
        <span className={`status-dot ${branch.active ? 'status-dot-active' : 'status-dot-inactive'}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{branch.active ? 'Aktiivinen' : 'Ei aktiivinen'}</span>
      </div>
      {branch.region && (
        <span className="badge badge-gray dark:bg-slate-700 dark:text-gray-300">{branch.region}</span>
      )}
    </div>
  </div>
  );
};

// Branch Modal Component
interface BranchModalProps {
  branch: Branch | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Branch>) => void;
}

const BranchModal = ({ branch, isOpen, onClose, onSave }: BranchModalProps) => {
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    region: '',
    phone: '',
    email: '',
    latitude: undefined,
    longitude: undefined,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branch) {
      setFormData(branch);
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        region: '',
        phone: '',
        email: '',
        latitude: undefined,
        longitude: undefined,
        active: true,
      });
    }
  }, [branch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving branch:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {branch ? 'Muokkaa pistettä' : 'Lisää uusi piste'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nimi *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Esim. Suun Terveystalo Helsinki Keskusta"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Osoite *</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input"
                placeholder="Katuosoite"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postinumero *</label>
              <input
                type="text"
                value={formData.postal_code || ''}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="input"
                placeholder="00100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaupunki *</label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input"
                placeholder="Helsinki"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alue</label>
              <input
                type="text"
                value={formData.region || ''}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="input"
                placeholder="Uusimaa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Puhelin</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input"
                placeholder="+358 9 1234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sähköposti</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input"
                placeholder="helsinki@suunterveystalo.fi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Leveysaste (lat)</label>
              <input
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || undefined })}
                className="input"
                placeholder="60.1699"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pituusaste (lng)</label>
              <input
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || undefined })}
                className="input"
                placeholder="24.9384"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active ?? true}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
            />
            <label htmlFor="active" className="text-sm text-gray-700">Aktiivinen</label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-ghost">
              Peruuta
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner mr-2" />
                  Tallennetaan...
                </>
              ) : (
                <>
                  <Check size={18} className="mr-2" />
                  {branch ? 'Tallenna' : 'Lisää piste'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Branches = () => {
  // Get data from global store (instant, already loaded, realtime synced)
  const { branches: storeBranches } = useStore();

  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'has-active-campaigns'>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [screenCounts, setScreenCounts] = useState<Record<string, number>>({});
  const [branchCampaigns, setBranchCampaigns] = useState<Record<string, DentalCampaign[]>>({});
  const [loadingCampaigns, setLoadingCampaigns] = useState<Record<string, boolean>>({});

  // Load campaigns for each branch
  useEffect(() => {
    const loadCampaignsForBranches = async () => {
      const campaignsData: Record<string, DentalCampaign[]> = {};
      const loadingState: Record<string, boolean> = {};

      for (const branch of storeBranches) {
        loadingState[branch.id] = true;
        setLoadingCampaigns(prev => ({ ...prev, [branch.id]: true }));

        try {
          const campaigns = await getCampaignsByBranch(branch.id);
          campaignsData[branch.id] = campaigns;
        } catch (error) {
          console.error(`Error loading campaigns for branch ${branch.id}:`, error);
          campaignsData[branch.id] = [];
        } finally {
          loadingState[branch.id] = false;
          setLoadingCampaigns(prev => ({ ...prev, [branch.id]: false }));
        }
      }

      setBranchCampaigns(campaignsData);
    };

    if (storeBranches.length > 0) {
      loadCampaignsForBranches();
    }
  }, [storeBranches]);

  // Extract unique regions from store data
  const regions = useMemo(() =>
    [...new Set(storeBranches.map(b => b.region).filter(Boolean))] as string[],
    [storeBranches]
  );

  // Load screen counts for branches
  useEffect(() => {
    const loadScreenCounts = async () => {
      const counts: Record<string, number> = {};

      for (const branch of storeBranches) {
        if (branch.latitude && branch.longitude) {
          try {
            const result = await countScreensInRadius(branch.latitude, branch.longitude, 5000); // 5km = 5000m
            counts[branch.id] = result.total;
          } catch (error) {
            console.error(`Error loading screen count for branch ${branch.id}:`, error);
            counts[branch.id] = 0;
          }
        } else {
          counts[branch.id] = 0;
        }
      }

      setScreenCounts(counts);
    };

    if (storeBranches.length > 0) {
      loadScreenCounts();
    }
  }, [storeBranches]);

  const filterBranches = useCallback(() => {
    let filtered = [...storeBranches];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.city.toLowerCase().includes(query) ||
        b.address.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'has-active-campaigns') {
        // Filter branches that have active campaigns
        filtered = filtered.filter(b => {
          const campaigns = branchCampaigns[b.id] || [];
          return campaigns.some(c => c.status === 'active');
        });
      } else {
        filtered = filtered.filter(b =>
          statusFilter === 'active' ? b.active : !b.active
        );
      }
    }

    // Region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(b => b.region === regionFilter);
    }

    setFilteredBranches(filtered);
  }, [storeBranches, searchQuery, statusFilter, regionFilter, branchCampaigns]);

  // Re-filter when store data or filters change
  useEffect(() => {
    filterBranches();
  }, [filterBranches]);

  const handleCreateBranch = () => {
    setSelectedBranch(null);
    setShowModal(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowModal(true);
  };

  const handleSaveBranch = async (data: Partial<Branch> & { _budget?: number }) => {
    try {
      // Extract budget from data (it's passed as _budget to avoid type conflicts)
      const { _budget, ...branchData } = data;
      
      if (selectedBranch) {
        // Update existing - realtime will sync the store
        const updated = await updateBranch(selectedBranch.id, branchData);
        if (updated) {
          // Also update budget if provided
          if (_budget !== undefined) {
            await upsertBranchAllocatedBudget(selectedBranch.id, _budget);
          }
          toast.success('Piste päivitetty');
        }
      } else {
        // Create new - realtime will sync the store
        const created = await createBranch(branchData as Omit<Branch, 'id' | 'created_at' | 'updated_at'>);
        if (created) {
          // Also create budget if provided
          if (_budget !== undefined && _budget > 0) {
            await upsertBranchAllocatedBudget(created.id, _budget);
          }
          toast.success('Uusi piste lisätty');
        }
      }
    } catch (error) {
      toast.error('Toiminto epäonnistui');
      throw error;
    }
  };

  const handleToggleStatus = async (branchId: string) => {
    const result = await toggleBranchStatus(branchId);
    if (result) {
      // Realtime will sync the store
      toast.success(result.active ? 'Piste aktivoitu' : 'Piste deaktivoitu');
    } else {
      toast.error('Tilan muuttaminen epäonnistui');
    }
  };

  const handleExport = () => {
    const csv = [
      ['Nimi', 'Osoite', 'Postinumero', 'Kaupunki', 'Alue', 'Puhelin', 'Sähköposti', 'Aktiivinen'].join(','),
      ...filteredBranches.map(b => [
        `"${b.name}"`,
        `"${b.address}"`,
        b.postal_code,
        `"${b.city}"`,
        `"${b.region || ''}"`,
        `"${b.phone || ''}"`,
        `"${b.email || ''}"`,
        b.active ? 'Kyllä' : 'Ei'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pisteet.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Pisteet viety CSV-tiedostoon');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pisteet</h1>
          <p className="text-gray-500 mt-1">
            {`${filteredBranches.length} pistettä • ${storeBranches.filter(b => b.active).length} aktiivista`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#00A5B5]' : 'text-gray-500 hover:text-gray-700'}`}
              title="Ruudukkonäkymä"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-[#00A5B5]' : 'text-gray-500 hover:text-gray-700'}`}
              title="Taulukkonäkymä"
            >
              <List size={18} />
            </button>
          </div>
          <button onClick={handleExport} className="btn-ghost">
            <Download size={18} className="mr-2" />
            Vie CSV
          </button>
          <button onClick={handleCreateBranch} className="btn-primary">
            <Plus size={18} className="mr-2" />
            Lisää piste
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Hae nimellä, kaupungilla tai osoitteella..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'has-active-campaigns')}
              className="input pr-10 appearance-none min-w-[140px]"
            >
              <option value="all">Kaikki tilat</option>
              <option value="active">Aktiiviset</option>
              <option value="inactive">Ei aktiiviset</option>
              <option value="has-active-campaigns">Aktiiviset kampanjat</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Region Filter */}
          <div className="relative">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="input pr-10 appearance-none min-w-[160px]"
            >
              <option value="all">Kaikki alueet</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Branches Grid/Table */}
      {filteredBranches.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ei pisteitä</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || statusFilter !== 'all' || regionFilter !== 'all'
              ? 'Yhtään pistettä ei löytynyt hakuehdoilla.'
              : 'Aloita lisäämällä ensimmäinen piste.'}
          </p>
          {!searchQuery && statusFilter === 'all' && regionFilter === 'all' && (
            <button onClick={handleCreateBranch} className="btn-primary">
              <Plus size={18} className="mr-2" />
              Lisää ensimmäinen piste
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => {
            const campaigns = branchCampaigns[branch.id] || [];
            const hasActiveCampaigns = campaigns.some(c => c.status === 'active');
            const totalCampaignBudget = campaigns.reduce((sum, c) => sum + (c.total_budget || 0), 0);

            return (
              <BranchCard
                key={branch.id}
                branch={branch}
                onEdit={handleEditBranch}
                onToggleStatus={handleToggleStatus}
                screenCount={screenCounts[branch.id]}
                campaigns={campaigns}
                totalCampaignBudget={totalCampaignBudget}
                hasActiveCampaigns={hasActiveCampaigns}
              />
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nimi</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Osoite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaupunki</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puhelin</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Näytöt (5 km)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tila</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toiminnot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${branch.active ? 'bg-[#00A5B5]/10' : 'bg-gray-100'}`}>
                          <MapPin size={16} className={branch.active ? 'text-[#00A5B5]' : 'text-gray-400'} />
                        </div>
                        <span className="font-medium text-gray-900">{branch.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {branch.address}, {branch.postal_code}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{branch.city}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{branch.region || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{branch.phone || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <Monitor size={14} className="mr-1 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          {screenCounts[branch.id] !== undefined ? screenCounts[branch.id] : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${branch.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {branch.active ? 'Aktiivinen' : 'Ei aktiivinen'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(branch.id)}
                          className={`p-1.5 rounded-lg transition-colors ${branch.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={branch.active ? 'Deaktivoi' : 'Aktivoi'}
                        >
                          {branch.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        </button>
                        <button
                          onClick={() => handleEditBranch(branch)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Muokkaa"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Branch Modal */}
      <BranchModal
        branch={selectedBranch}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveBranch}
      />
    </div>
  );
};

export default Branches;
