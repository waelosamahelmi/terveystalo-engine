// ============================================================================
// SUUN TERVEYSTALO - BidTheatre Settings Component
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import {
  Monitor,
  Key,
  Save,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Plus,
  Edit,
  X,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface BidStrategy {
  id: number;
  name: string;
  channel: 'DISPLAY' | 'PDOOH';
  rtb_sitelist: number;
  adgroup_name?: string;
  max_cpm: number;
  paused: boolean;
  target_share: number;
  filterTarget?: number | null;
}

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
}

const SettingsBidTheatre = () => {
  const [credentials, setCredentials] = useState<BidTheatreCredentials>({
    network_id: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  // Bid strategies
  const [bidStrategies, setBidStrategies] = useState<BidStrategy[]>([]);
  const [editingStrategy, setEditingStrategy] = useState<BidStrategy | null>(null);
  const [showStrategyForm, setShowStrategyForm] = useState(false);

  const [newStrategy, setNewStrategy] = useState<Partial<BidStrategy>>({
    name: '',
    channel: 'DISPLAY',
    rtb_sitelist: 0,
    max_cpm: 0,
    paused: false,
    target_share: 100,
    filterTarget: null,
  });

  // Load credentials and bid strategies
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load credentials
      const { data: credsData, error: credsError } = await supabase
        .from('bidtheatre_credentials')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!credsError && credsData) {
        setCredentials({
          network_id: credsData.network_id || '',
          username: credsData.username || '',
          password: credsData.password || '',
        });
        setConnectionStatus('success');
      }

      // Load bid strategies
      const { data: strategiesData } = await supabase
        .from('bid_strategies')
        .select('*')
        .order('created_at', { ascending: false });

      if (strategiesData) {
        setBidStrategies(strategiesData);
      }
    } catch (error) {
      console.error('Error loading BidTheatre data:', error);
      toast.error('BidTheatre-tietojen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('bidtheatre_credentials')
        .upsert({
          network_id: credentials.network_id,
          username: credentials.username,
          password: credentials.password,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });

      if (error) throw error;
      toast.success('BidTheatre-tunnukset tallennettu');
      setConnectionStatus('success');
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast.error('Tallentaminen epäonnistui');
      setConnectionStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/bidtheatre/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        toast.success('Yhteys BidTheatreen toimii!');
        setConnectionStatus('success');
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      toast.error('Yhteys BidTheatreen epäonnistui');
      setConnectionStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSaveStrategy = async () => {
    setSaving(true);
    try {
      if (editingStrategy) {
        // Update existing
        const { error } = await supabase
          .from('bid_strategies')
          .update({
            ...newStrategy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStrategy.id);

        if (error) throw error;
        toast.success('Bidsuunnitelma päivitetty');
      } else {
        // Create new
        const { error } = await supabase
          .from('bid_strategies')
          .insert({
            ...newStrategy,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
        toast.success('Bidsuunnitelma luotu');
      }

      setShowStrategyForm(false);
      setEditingStrategy(null);
      setNewStrategy({
        name: '',
        channel: 'DISPLAY',
        rtb_sitelist: 0,
        max_cpm: 0,
        paused: false,
        target_share: 100,
        filterTarget: null,
      });
      loadData();
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStrategy = async (id: number) => {
    if (!confirm('Haluatko varmasti poistaa tämän bidsuunnitelman?')) return;

    try {
      const { error } = await supabase
        .from('bid_strategies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bidsuunnitelma poistettu');
      loadData();
    } catch (error) {
      console.error('Error deleting strategy:', error);
      toast.error('Poistaminen epäonnistui');
    }
  };

  const handleEditStrategy = (strategy: BidStrategy) => {
    setEditingStrategy(strategy);
    setNewStrategy({ ...strategy });
    setShowStrategyForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#00A5B5] flex items-center justify-center">
              <Monitor size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">BidTheatre-integraatio</h2>
              <p className="text-sm text-gray-500">Hallitse ohjelmallista mainontaa</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            connectionStatus === 'success' ? 'bg-green-100 text-green-700' :
            connectionStatus === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {connectionStatus === 'success' ? (
              <>
                <Check size={14} />
                <span className="text-xs font-medium">Yhdistetty</span>
              </>
            ) : connectionStatus === 'error' ? (
              <>
                <AlertCircle size={14} />
                <span className="text-xs font-medium">Virhe</span>
              </>
            ) : (
              <span className="text-xs font-medium">Ei yhdistetty</span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Network ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Key size={14} className="inline mr-1" />
              Network ID
            </label>
            <input
              type="text"
              value={credentials.network_id}
              onChange={(e) => setCredentials({ ...credentials, network_id: e.target.value })}
              placeholder="esim. 12345"
              className="input"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Käyttäjätunnus
            </label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="BidTheatre-käyttäjätunnus"
              className="input"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Salasana
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="BidTheatre-salasana"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSaveCredentials}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <RefreshCw size={18} className="animate-spin mr-2" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              Tallenna tunnukset
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing || !credentials.network_id}
              className="btn-outline"
            >
              {testing ? (
                <RefreshCw size={18} className="animate-spin mr-2" />
              ) : (
                <RefreshCw size={18} className="mr-2" />
              )}
              Testaa yhteys
            </button>
            <a
              href="https://console.bidtheatre.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline flex items-center"
            >
              <ExternalLink size={18} className="mr-2" />
              Avaa BidTheatre
            </a>
          </div>
        </div>
      </div>

      {/* Bid Strategies Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900">Bidsuunnitelmat</h3>
            <p className="text-sm text-gray-500">Hallitse bidsuunnitelmia eri kanaville</p>
          </div>
          <button
            onClick={() => {
              setEditingStrategy(null);
              setNewStrategy({
                name: '',
                channel: 'DISPLAY',
                rtb_sitelist: 0,
                max_cpm: 0,
                paused: false,
                target_share: 100,
                filterTarget: null,
              });
              setShowStrategyForm(true);
            }}
            className="btn-primary flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Lisää suunnitelma
          </button>
        </div>

        {showStrategyForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-4">
              {editingStrategy ? 'Muokkaa bidsuunnitelmaa' : 'Uusi bidsuunnitelma'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nimi</label>
                <input
                  type="text"
                  value={newStrategy.name || ''}
                  onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                  placeholder="esim. Display Main"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kanava</label>
                <select
                  value={newStrategy.channel || 'DISPLAY'}
                  onChange={(e) => setNewStrategy({ ...newStrategy, channel: e.target.value as 'DISPLAY' | 'PDOOH' })}
                  className="input"
                >
                  <option value="DISPLAY">Display</option>
                  <option value="PDOOH">PDOOH</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RTB Site List</label>
                <input
                  type="number"
                  value={newStrategy.rtb_sitelist || 0}
                  onChange={(e) => setNewStrategy({ ...newStrategy, rtb_sitelist: parseInt(e.target.value) })}
                  placeholder="esim. 12345"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max CPM (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStrategy.max_cpm || 0}
                  onChange={(e) => setNewStrategy({ ...newStrategy, max_cpm: parseFloat(e.target.value) })}
                  placeholder="esim. 5.00"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Share (%)</label>
                <input
                  type="number"
                  value={newStrategy.target_share || 100}
                  onChange={(e) => setNewStrategy({ ...newStrategy, target_share: parseInt(e.target.value) })}
                  placeholder="100"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter Target</label>
                <input
                  type="number"
                  value={newStrategy.filterTarget || ''}
                  onChange={(e) => setNewStrategy({ ...newStrategy, filterTarget: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Valinnainen"
                  className="input"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adgroup Name (valinnainen)</label>
                <input
                  type="text"
                  value={newStrategy.adgroup_name || ''}
                  onChange={(e) => setNewStrategy({ ...newStrategy, adgroup_name: e.target.value })}
                  placeholder="esim. Main Campaign"
                  className="input"
                />
              </div>
              <div className="col-span-2 flex items-center">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newStrategy.paused || false}
                    onChange={(e) => setNewStrategy({ ...newStrategy, paused: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                  />
                  <span className="text-sm text-gray-700">Paused (pysäytetty)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowStrategyForm(false);
                  setEditingStrategy(null);
                }}
                className="btn-outline"
              >
                Peruuta
              </button>
              <button
                onClick={handleSaveStrategy}
                disabled={saving || !newStrategy.name}
                className="btn-primary"
              >
                {saving ? (
                  <RefreshCw size={18} className="animate-spin mr-2" />
                ) : (
                  <Save size={18} className="mr-2" />
                )}
                {editingStrategy ? 'Päivitä' : 'Lisää'}
              </button>
            </div>
          </div>
        )}

        {/* Strategies List */}
        {bidStrategies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Monitor size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Ei bidsuunnitelmia. Lisää ensimmäinen suunnitelma.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bidStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      strategy.channel === 'DISPLAY' ? 'bg-blue-500' : 'bg-purple-500'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{strategy.name}</h4>
                      <p className="text-sm text-gray-500">
                        {strategy.channel} • Max CPM: €{strategy.max_cpm.toFixed(2)} • Target: {strategy.target_share}%
                      </p>
                    </div>
                    {strategy.paused && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Paused</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditStrategy(strategy)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteStrategy(strategy.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card p-6 bg-blue-50 border-blue-100">
        <div className="flex items-start space-x-3">
          <AlertCircle size={20} className="text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">BidTheatre-integraation käyttöönotto:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Hae Network ID, käyttäjätunnus ja salasana BidTheatre-konsolista</li>
              <li>Tallenna tunnukset yllä olevaan lomakkeeseen</li>
              <li>Luo bidsuunnitelmia eri kanaville ja kohteille</li>
              <li>Käytä bidsuunnitelmia kampanjoiden luonnissa</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsBidTheatre;
