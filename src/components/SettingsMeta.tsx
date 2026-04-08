// ============================================================================
// SUUN TERVEYSTALO - Meta Ads Settings Component
// ============================================================================

import { useState, useEffect } from 'react';
import { getAppSetting, updateAppSetting } from '../lib/settingsService';
import { getMetaCampaigns, syncMetaAnalytics } from '../lib/metaAdsService';
import toast from 'react-hot-toast';
import {
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

const SettingsMeta = () => {
  // Form state
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [metaAdAccountId, setMetaAdAccountId] = useState('');
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [metaSyncEnabled, setMetaSyncEnabled] = useState(false);

  // UI state
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ rows: number; errors: number } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      const [appId, appSecret, adAccountId, accessToken, syncEnabled, lastSync] = await Promise.all([
        getAppSetting('meta_app_id'),
        getAppSetting('meta_app_secret'),
        getAppSetting('meta_ad_account_id'),
        getAppSetting('meta_access_token'),
        getAppSetting('meta_sync_enabled'),
        getAppSetting('meta_last_sync'),
      ]);

      setMetaAppId(appId || '');
      setMetaAppSecret(appSecret || '');
      setMetaAdAccountId(adAccountId || '');
      setMetaAccessToken(accessToken || '');
      setMetaSyncEnabled(syncEnabled === 'true');
      setLastSyncTime(lastSync || null);

      // Set connection status based on whether token exists
      if (accessToken) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error loading Meta settings:', error);
      toast.error('Meta-asetusten lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateAppSetting('meta_app_id', metaAppId),
        updateAppSetting('meta_app_secret', metaAppSecret),
        updateAppSetting('meta_ad_account_id', metaAdAccountId),
        updateAppSetting('meta_access_token', metaAccessToken),
        updateAppSetting('meta_sync_enabled', metaSyncEnabled ? 'true' : 'false'),
      ]);

      toast.success('Meta-asetukset tallennettu');

      if (metaAccessToken) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error saving Meta settings:', error);
      toast.error('Tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const campaigns = await getMetaCampaigns();

      if (campaigns) {
        const count = Array.isArray(campaigns) ? campaigns.length : 0;
        toast.success(`Yhteys toimii! ${count} kampanjaa löydetty.`);
        setConnectionStatus('connected');
      } else {
        throw new Error('No campaigns returned');
      }
    } catch (error) {
      console.error('Meta connection test failed:', error);
      toast.error('Meta-yhteys epäonnistui');
      setConnectionStatus('disconnected');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncMetaAnalytics();

      const rows = result?.synced_rows ?? result?.rows ?? 0;
      const errors = result?.errors ?? 0;

      setSyncResult({ rows, errors });
      setLastSyncTime(new Date().toISOString());

      // Also persist last sync time
      await updateAppSetting('meta_last_sync', new Date().toISOString());

      if (errors > 0) {
        toast.success(`Synkronointi valmis: ${rows} riviä, ${errors} virhettä`);
      } else {
        toast.success(`Synkronointi valmis: ${rows} riviä synkronoitu`);
      }
    } catch (error) {
      console.error('Meta sync failed:', error);
      toast.error('Synkronointi epäonnistui');
    } finally {
      setSyncing(false);
    }
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
            <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center">
              <Settings size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Meta Ads -integraatio</h2>
              <p className="text-sm text-gray-500">Hallitse Meta-mainonnan asetuksia</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
            connectionStatus === 'disconnected' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle size={14} />
                <span className="text-xs font-medium">Yhdistetty</span>
              </>
            ) : connectionStatus === 'disconnected' ? (
              <>
                <XCircle size={14} />
                <span className="text-xs font-medium">Ei yhteyttä</span>
              </>
            ) : (
              <span className="text-xs font-medium">Ei määritetty</span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* App ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App ID
            </label>
            <input
              type="text"
              value={metaAppId}
              onChange={(e) => setMetaAppId(e.target.value)}
              placeholder="esim. 123456789012345"
              className="input"
            />
          </div>

          {/* App Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                placeholder="Meta App Secret"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Ad Account ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Account ID
            </label>
            <input
              type="text"
              value={metaAdAccountId}
              onChange={(e) => setMetaAdAccountId(e.target.value)}
              placeholder="esim. act_123456789"
              className="input"
            />
            <p className="text-xs text-gray-400 mt-1">Sisällytä act_ -etuliite</p>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={metaAccessToken}
                onChange={(e) => setMetaAccessToken(e.target.value)}
                placeholder="Meta Access Token"
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Sync Enabled Toggle */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setMetaSyncEnabled(!metaSyncEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                metaSyncEnabled ? 'bg-[#00A5B5]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  metaSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Automaattinen synkronointi {metaSyncEnabled ? 'käytössä' : 'pois käytöstä'}
            </span>
          </div>

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="text-xs text-gray-400 pt-1">
              Viimeisin synkronointi: {new Date(lastSyncTime).toLocaleString('fi-FI')}
            </div>
          )}

          {/* Sync Result */}
          {syncResult && (
            <div className={`text-sm px-3 py-2 rounded-lg ${
              syncResult.errors > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
            }`}>
              Synkronoitu {syncResult.rows} riviä
              {syncResult.errors > 0 && `, ${syncResult.errors} virhettä`}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <Settings size={18} className="mr-2" />
              )}
              Tallenna asetukset
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing || !metaAccessToken}
              className="btn-outline"
            >
              {testing ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <CheckCircle size={18} className="mr-2" />
              )}
              Testaa yhteys
            </button>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !metaAccessToken}
              className="btn-outline"
            >
              {syncing ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <RefreshCw size={18} className="mr-2" />
              )}
              Synkronoi nyt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsMeta;
