import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Trash2, Edit, Plus } from 'lucide-react';
import { getFilterTargets, getRtbSitelists } from '../lib/bidTheatre'; // Added getRtbSitelists
import { format } from 'date-fns'; // Import format from date-fns

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
}

interface BidStrategyTemplate {
  id: number;
  channel: 'DISPLAY' | 'PDOOH';
  rtb_sitelist: number;
  adgroup_name?: string; // Only for DISPLAY
  max_cpm: number;
  name: string;
  paused: boolean;
  target_share?: number;
  filterTarget?: number | null; // Added filterTarget field
}

// Budget calculation settings
export interface BudgetSettings {
  mediaSpendPercentage: number; // e.g. 85 (means client spends 85% of budget on media)
  impressionDivisorMeta: number; // e.g. 4 (divide budget by 4 to get impressions in thousands)
  impressionDivisorDisplay: number; // e.g. 8
  impressionDivisorPdooh: number; // e.g. 7
  impressionMultiplier: number; // e.g. 1000 (multiply by 1000 to get actual impressions)
}

const BidTheatre: React.FC = () => {
  const [credentials, setCredentials] = useState<BidTheatreCredentials>({
    network_id: '',
    username: '',
    password: '',
  });
  const [bidStrategyTemplates, setBidStrategyTemplates] = useState<BidStrategyTemplate[]>([]);
  const [filterTargets, setFilterTargets] = useState<{ id: number; name: string }[]>([]); // Added state for filter targets
  const [rtbSitelists, setRtbSitelists] = useState<{ id: number; name: string }[]>([]); // Added state for RTB Sitelists
  const [isLoadingRtbSitelists, setIsLoadingRtbSitelists] = useState(true); // Added loading state for RTB Sitelists
  const [isLoadingFilterTargets, setIsLoadingFilterTargets] = useState(true); // Added loading state
  const [newTemplate, setNewTemplate] = useState<Partial<BidStrategyTemplate>>({
    channel: 'DISPLAY',
    rtb_sitelist: undefined, // Changed from 157553
    adgroup_name: 'Large desktop sizes',
    max_cpm: 5.0,
    name: '',
    paused: false,
    target_share: undefined,
    filterTarget: null,
  });
  const [editingTemplate, setEditingTemplate] = useState<BidStrategyTemplate | null>(null);

  // Budget calculation settings state
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    mediaSpendPercentage: 85, // Default: 85% of budget goes to media (15% fee)
    impressionDivisorMeta: 4,  // Default: Divide by 4 for Meta
    impressionDivisorDisplay: 8, // Default: Divide by 8 for Display
    impressionDivisorPdooh: 7, // Default: Divide by 7 for PDOOH
    impressionMultiplier: 1000, // Default: Multiply by 1000 for actual impressions
  });

  const [isTestingVideo, setIsTestingVideo] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [skipVideoDownload, setSkipVideoDownload] = useState(false);
  const [customCreativeHash, setCustomCreativeHash] = useState('x8x7e3x'); // Default hash for 1080x1920 template
  const [customLinearId, setCustomLinearId] = useState('16821');
  const [useFileUpload, setUseFileUpload] = useState(false); // New state for upload method

  // New state variables for historical sync
  const [historicalSyncMonth, setHistoricalSyncMonth] = useState<string>(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return format(lastMonth, 'yyyy-MM');
  });
  const [isSyncingHistorical, setIsSyncingHistorical] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    fetchCredentials();
    fetchBidStrategyTemplates();
    fetchFilterTargets();
    fetchRtbSitelists(); // Added fetch for RTB Sitelists
    fetchBudgetSettings(); // Added fetch for budget settings
  }, []);

  // Add function to fetch budget settings
  const fetchBudgetSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('Error fetching budget settings:', error);
        return;
      }

      if (data) {
        setBudgetSettings({
          mediaSpendPercentage: data.media_spend_percentage,
          impressionDivisorMeta: data.impression_divisor_meta,
          impressionDivisorDisplay: data.impression_divisor_display,
          impressionDivisorPdooh: data.impression_divisor_pdooh,
          impressionMultiplier: data.impression_multiplier,
        });
      }
    } catch (error) {
      console.error('Error fetching budget settings:', error);
    }
  };

  const fetchFilterTargets = async () => {
    try {
      setIsLoadingFilterTargets(true);
      const targets = await getFilterTargets();
      setFilterTargets(targets);
    } catch (error) {
      console.error('Error fetching filter targets:', error);
      toast.error('Failed to fetch filter targets');
    } finally {
      setIsLoadingFilterTargets(false);
    }
  };

  const fetchRtbSitelists = async () => {
    try {
      setIsLoadingRtbSitelists(true);
      const sitelists = await getRtbSitelists();
      setRtbSitelists(sitelists);
    } catch (error) {
      console.error('Error fetching RTB Sitelists:', error);
      toast.error('Failed to fetch RTB Sitelists');
    } finally {
      setIsLoadingRtbSitelists(false);
    }
  };

  const fetchCredentials = async () => {
    const { data, error } = await supabase
      .from('bidtheatre_credentials')
      .select('network_id, username, password')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to fetch credentials');
      return;
    }

    if (data) {
      setCredentials({
        network_id: data.network_id,
        username: data.username,
        password: data.password,
      });
    }
  };

  const fetchBidStrategyTemplates = async () => {
    const { data, error } = await supabase
      .from('bidtheatre_bid_strategies')
      .select('*');

    if (error) {
      console.error('Error fetching bid strategy templates:', error);
      toast.error('Failed to fetch bid strategy templates');
      return;
    }

    // Map the Supabase response to match the BidStrategyTemplate interface
    const mappedTemplates = (data || []).map(template => ({
      id: template.id,
      channel: template.channel,
      rtb_sitelist: template.rtb_sitelist,
      adgroup_name: template.adgroup_name,
      max_cpm: template.max_cpm,
      name: template.name,
      paused: template.paused,
      target_share: template.target_share,
      filterTarget: template.filtertarget, // Map filtertarget (lowercase) to filterTarget (camelCase)
    }));

    setBidStrategyTemplates(mappedTemplates);
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const saveCredentials = async () => {
    const { error } = await supabase
      .from('bidtheatre_credentials')
      .insert({
        network_id: credentials.network_id,
        username: credentials.username,
        password: credentials.password,
      });

    if (error) {
      console.error('Error saving credentials:', error);
      toast.error('Failed to save credentials');
      return;
    }

    toast.success('Credentials saved successfully');
  };

  const handleNewTemplateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTemplate(prev => ({
      ...prev,
      [name]:
        name === 'paused'
          ? value === 'true'
          : name === 'rtb_sitelist'
          ? parseInt(value)
          : name === 'target_share'
          ? value === '' ? undefined : parseInt(value)
          : name === 'max_cpm'
          ? parseFloat(value)
          : value,
    }));
  };

  const addBidStrategyTemplate = async () => {
    if (!newTemplate.name) {
      toast.error('Please fill in the name field');
      return;
    }

    const { error } = await supabase
      .from('bidtheatre_bid_strategies')
      .insert({
        channel: newTemplate.channel,
        rtb_sitelist: newTemplate.rtb_sitelist,
        adgroup_name: newTemplate.channel === 'DISPLAY' ? newTemplate.adgroup_name || 'Large desktop sizes' : undefined,
        max_cpm: newTemplate.max_cpm || 5.0,
        name: newTemplate.name,
        paused: newTemplate.paused || false,
        target_share: newTemplate.target_share ?? null, // Use null if undefined
        filtertarget: newTemplate.filterTarget || null,
      });

    if (error) {
      console.error('Error adding bid strategy template:', error);
      toast.error('Failed to add bid strategy template');
      return;
    }

    toast.success('Bid strategy template added successfully');
    setNewTemplate({
      channel: 'DISPLAY',
      rtb_sitelist: undefined,
      adgroup_name: 'Large desktop sizes',
      max_cpm: 5.0,
      name: '',
      paused: false,
      target_share: undefined,
      filterTarget: null, // Reset filterTarget (state remains camelCase)
    });
    fetchBidStrategyTemplates();
  };

  const saveEditedTemplate = async () => {
    if (!editingTemplate) return;

    const { error } = await supabase
      .from('bidtheatre_bid_strategies')
      .update({
        channel: editingTemplate.channel,
        rtb_sitelist: editingTemplate.rtb_sitelist,
        adgroup_name: editingTemplate.channel === 'DISPLAY' ? editingTemplate.adgroup_name : undefined,
        max_cpm: editingTemplate.max_cpm,
        name: editingTemplate.name,
        paused: editingTemplate.paused,
        target_share: editingTemplate.target_share ?? null, // Use null if undefined
        filtertarget: editingTemplate.filterTarget || null,
      })
      .eq('id', editingTemplate.id);

    if (error) {
      console.error('Error updating bid strategy template:', error);
      toast.error('Failed to update bid strategy template');
      return;
    }

    toast.success('Bid strategy template updated successfully');
    setEditingTemplate(null);
    fetchBidStrategyTemplates();
  };

  const deleteBidStrategyTemplate = async (id: number) => {
    const { error } = await supabase
      .from('bidtheatre_bid_strategies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bid strategy template:', error);
      toast.error('Failed to delete bid strategy template');
      return;
    }

    toast.success('Bid strategy template deleted successfully');
    fetchBidStrategyTemplates();
  };

  const handleTestVideoUpload = async () => {
    try {
      setIsTestingVideo(true);
      setTestResult(null);
      setTestError(null);

      const response = await fetch('/.netlify/functions/testBidTheatreVideoUpload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creativeHash: customCreativeHash,
          linearId: customLinearId,
          skipVideoDownload: skipVideoDownload,
          useFileUpload: useFileUpload // Add the file upload option
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test video upload');
      }

      setTestResult(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Video upload test failed:', error);
      setTestError(error.message || 'Unknown error occurred');
    } finally {
      setIsTestingVideo(false);
    }
  };

  // Add handler for historical sync
  const handleHistoricalSync = async () => {
    try {
      setIsSyncingHistorical(true);
      setSyncResult(null);
      setSyncError(null);

      const [year, month] = historicalSyncMonth.split('-').map(Number);
      
      const response = await fetch('/.netlify/functions/sync-historical-media-costs-background', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ year, month }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync historical data');
      }

      setSyncResult(JSON.stringify(data, null, 2));
      toast.success(`Historical data for ${historicalSyncMonth} synced successfully`);
    } catch (error) {
      console.error('Historical sync failed:', error);
      setSyncError(error.message || 'Unknown error occurred');
      toast.error('Failed to sync historical data');
    } finally {
      setIsSyncingHistorical(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">BidTheatre Management</h1>

      {/* Credentials Section */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">API Credentials</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Network ID</label>
            <input
              type="text"
              name="network_id"
              value={credentials.network_id}
              onChange={handleCredentialsChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="username"
              value={credentials.username}
              onChange={handleCredentialsChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleCredentialsChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        <button
          onClick={saveCredentials}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Save Credentials
        </button>
      </div>

      {/* Bid Strategy Templates Section */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Bid Strategy Templates</h2>

        {/* Add New Bid Strategy Template */}
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Add New Bid Strategy Template</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Channel</label>
              <select
                name="channel"
                value={newTemplate.channel}
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="DISPLAY">DISPLAY</option>
                <option value="PDOOH">PDOOH</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={newTemplate.name || ''}
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">RTB Sitelist</label>
              <select
                name="rtb_sitelist"
                value={newTemplate.rtb_sitelist !== undefined ? newTemplate.rtb_sitelist : ''}
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select RTB Sitelist</option>
                {rtbSitelists.map(sitelist => (
                  <option key={sitelist.id} value={sitelist.id}>
                    {sitelist.name}
                  </option>
                ))}
              </select>
            </div>
            {newTemplate.channel === 'DISPLAY' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Ad Group</label>
                <select
                  name="adgroup_name"
                  value={newTemplate.adgroup_name || 'Large desktop sizes'}
                  onChange={handleNewTemplateChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Large desktop sizes">Large desktop sizes</option>
                  <option value="Small desktop">Small desktop</option>
                  <option value="Mobile sizes">Mobile sizes</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Max CPM</label>
              <input
                type="number"
                step="0.1"
                name="max_cpm"
                value={newTemplate.max_cpm || 5.0}
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paused</label>
              <select
                name="paused"
                value={newTemplate.paused ? 'true' : 'false'}
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="false">False</option>
                <option value="true">True</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Target Share (Optional)</label>
              <input
                type="number"
                name="target_share"
                value={newTemplate.target_share ?? ''} // Use empty string if undefined
                onChange={handleNewTemplateChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Filter Target</label>
              <select
                name="filterTarget"
                value={newTemplate.filterTarget !== undefined && newTemplate.filterTarget !== null ? newTemplate.filterTarget : ''}
                onChange={(e) =>
                  setNewTemplate(prev => ({
                    ...prev,
                    filterTarget: e.target.value === '' ? null : parseInt(e.target.value),
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">None</option>
                {filterTargets.map(target => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={addBidStrategyTemplate}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center"
          >
            <Plus size={16} className="mr-2" /> Add Bid Strategy Template
          </button>
        </div>

        {/* List Bid Strategy Templates */}
        <div>
          <h3 className="text-lg font-medium mb-2">Existing Bid Strategy Templates</h3>
          {['DISPLAY', 'PDOOH'].map(channel => (
            <div key={channel} className="mb-6">
              <h4 className="text-md font-semibold mb-2">{channel} Templates</h4>
              {bidStrategyTemplates.filter(template => template.channel === channel).length === 0 ? (
                <p className="text-gray-500">No templates defined for {channel}</p>
              ) : (
                <div className="space-y-4">
                  {bidStrategyTemplates
                    .filter(template => template.channel === channel)
                    .map(template => (
                      <div key={template.id} className="p-4 border rounded-lg flex justify-between items-center">
                        {editingTemplate?.id === template.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Name</label>
                              <input
                                type="text"
                                value={editingTemplate.name}
                                onChange={e =>
                                  setEditingTemplate({ ...editingTemplate, name: e.target.value })
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">RTB Sitelist</label>
                              <select
                                value={
                                  editingTemplate.rtb_sitelist !== undefined
                                    ? editingTemplate.rtb_sitelist
                                    : ''
                                }
                                onChange={e => {
                                  const value = e.target.value;
                                  if (value === '') return; // Prevent setting to NaN
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    rtb_sitelist: parseInt(value),
                                  });
                                }}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">Select RTB Sitelist</option>
                                {rtbSitelists.map(sitelist => (
                                  <option key={sitelist.id} value={sitelist.id}>
                                    {sitelist.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            {editingTemplate.channel === 'DISPLAY' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Ad Group</label>
                                <select
                                  value={
                                    editingTemplate.adgroup_name || 'Large desktop sizes'
                                  }
                                  onChange={e =>
                                    setEditingTemplate({
                                      ...editingTemplate,
                                      adgroup_name: e.target.value,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                >
                                  <option value="Large desktop sizes">
                                    Large desktop sizes
                                  </option>
                                  <option value="Small desktop">Small desktop</option>
                                  <option value="Mobile sizes">Mobile sizes</option>
                                </select>
                              </div>
                            )}
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Max CPM</label>
                              <input
                                type="number"
                                step="0.1"
                                value={editingTemplate.max_cpm}
                                onChange={e =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    max_cpm: parseFloat(e.target.value),
                                  })
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">Paused</label>
                              <select
                                value={editingTemplate.paused ? 'true' : 'false'}
                                onChange={e =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    paused: e.target.value === 'true',
                                  })
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="false">False</option>
                                <option value="true">True</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Target Share (Optional)
                              </label>
                              <input
                                type="number"
                                value={editingTemplate.target_share ?? ''} // Use empty string if undefined
                                onChange={e =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    target_share:
                                      e.target.value === ''
                                        ? undefined
                                        : parseInt(e.target.value),
                                  })
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Filter Target
                              </label>
                              <select
                                value={
                                  editingTemplate.filterTarget !== undefined &&
                                  editingTemplate.filterTarget !== null
                                    ? editingTemplate.filterTarget
                                    : ''
                                }
                                onChange={e =>
                                  setEditingTemplate({
                                    ...editingTemplate,
                                    filterTarget:
                                      e.target.value === ''
                                        ? null
                                        : parseInt(e.target.value),
                                  })
                                }
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              >
                                <option value="">None</option>
                                {filterTargets.map(target => (
                                  <option key={target.id} value={target.id}>
                                    {target.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <p>
                              <strong>Name:</strong> {template.name}
                            </p>
                            <p>
                              <strong>RTB Sitelist:</strong>{' '}
                              {isLoadingRtbSitelists
                                ? 'Loading...'
                                : template.rtb_sitelist !== undefined
                                ? rtbSitelists.find(
                                    sitelist => sitelist.id === template.rtb_sitelist
                                  )?.name || `Unknown (${template.rtb_sitelist})`
                                : 'Not set'}
                            </p>
                            {template.channel === 'DISPLAY' && (
                              <p>
                                <strong>Ad Group:</strong> {template.adgroup_name}
                              </p>
                            )}
                            <p>
                              <strong>Max CPM:</strong> {template.max_cpm}
                            </p>
                            <p>
                              <strong>Paused:</strong> {template.paused ? 'Yes' : 'No'}
                            </p>
                            <p>
                              <strong>Target Share:</strong>{' '}
                              {template.target_share !== undefined
                                ? template.target_share
                                : 'Not set'}
                            </p>
                            <p>
                              <strong>Filter Target:</strong>{' '}
                              {isLoadingFilterTargets
                                ? 'Loading...'
                                : template.filterTarget !== null &&
                                  template.filterTarget !== undefined
                                ? filterTargets.find(
                                    target => target.id === template.filterTarget
                                  )?.name || `Unknown (${template.filterTarget})`
                                : 'Not set'}
                            </p>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          {editingTemplate?.id === template.id ? (
                            <>
                              <button
                                onClick={saveEditedTemplate}
                                className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => editBidStrategyTemplate(template)}
                                className="p-2 text-purple-600 hover:text-purple-800"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteBidStrategyTemplate(template.id)}
                                className="p-2 text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Budget Calculation Settings Section */}
      <div className="my-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Budget Calculation Settings</h2>
        <p className="mb-4 text-gray-700">
          Configure how budget calculations and impression estimates are displayed in campaign forms.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Spend Percentage
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                value={budgetSettings.mediaSpendPercentage}
                onChange={(e) => setBudgetSettings(prev => ({
                  ...prev,
                  mediaSpendPercentage: parseInt(e.target.value) || 85
                }))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-md mr-2"
              />
              <span className="text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Percentage of budget used for media (e.g., 85 means 15% fee)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impression Multiplier
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={budgetSettings.impressionMultiplier}
              onChange={(e) => setBudgetSettings(prev => ({
                ...prev,
                impressionMultiplier: parseInt(e.target.value) || 1000
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Multiplier for impression calculation (e.g., 1000 to convert to actual impressions)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meta Impressions Divisor
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={budgetSettings.impressionDivisorMeta}
              onChange={(e) => setBudgetSettings(prev => ({
                ...prev,
                impressionDivisorMeta: parseFloat(e.target.value) || 4
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Divide budget by this value to calculate Meta impressions
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Impressions Divisor
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={budgetSettings.impressionDivisorDisplay}
              onChange={(e) => setBudgetSettings(prev => ({
                ...prev,
                impressionDivisorDisplay: parseFloat(e.target.value) || 8
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Divide budget by this value to calculate Display impressions
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDOOH Impressions Divisor
            </label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={budgetSettings.impressionDivisorPdooh}
              onChange={(e) => setBudgetSettings(prev => ({
                ...prev,
                impressionDivisorPdooh: parseFloat(e.target.value) || 7
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Divide budget by this value to calculate PDOOH impressions
            </p>
          </div>
        </div>
        
        <div className="mt-6">
          <button
            onClick={async () => {
              try {
                const { error } = await supabase
                  .from('budget_settings')
                  .upsert({
                    id: 1, // Using a fixed ID to make it easy to fetch
                    media_spend_percentage: budgetSettings.mediaSpendPercentage,
                    impression_divisor_meta: budgetSettings.impressionDivisorMeta,
                    impression_divisor_display: budgetSettings.impressionDivisorDisplay,
                    impression_divisor_pdooh: budgetSettings.impressionDivisorPdooh,
                    impression_multiplier: budgetSettings.impressionMultiplier,
                    updated_at: new Date().toISOString()
                  });
                
                if (error) throw error;
                toast.success('Budget calculation settings saved successfully');
              } catch (error) {
                console.error('Error saving budget settings:', error);
                toast.error('Failed to save budget settings');
              }
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Save Budget Settings
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-md font-semibold text-blue-800 mb-2">Budget Calculation Preview</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Meta Channel:</p>
              <p className="text-sm">For a budget of €100, the actual media spend will be 
                <span className="font-bold"> €{budgetSettings.mediaSpendPercentage}</span>, yielding approximately 
                <span className="font-bold"> {Math.round((budgetSettings.mediaSpendPercentage / budgetSettings.impressionDivisorMeta) * budgetSettings.impressionMultiplier).toLocaleString()}</span> impressions
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Display Channel:</p>
              <p className="text-sm">For a budget of €100, the actual media spend will be 
                <span className="font-bold"> €{budgetSettings.mediaSpendPercentage}</span>, yielding approximately 
                <span className="font-bold"> {Math.round((budgetSettings.mediaSpendPercentage / budgetSettings.impressionDivisorDisplay) * budgetSettings.impressionMultiplier).toLocaleString()}</span> impressions
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">PDOOH Channel:</p>
              <p className="text-sm">For a budget of €100, the actual media spend will be 
                <span className="font-bold"> €{budgetSettings.mediaSpendPercentage}</span>, yielding approximately 
                <span className="font-bold"> {Math.round((budgetSettings.mediaSpendPercentage / budgetSettings.impressionDivisorPdooh) * budgetSettings.impressionMultiplier).toLocaleString()}</span> impressions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Video Upload Section */}
      <div className="my-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Test Video Upload</h2>
        <p className="mb-4 text-gray-700">
          This will test the video export from Creatopy and upload to BidTheatre without creating a
          campaign.
        </p>
        
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creative Hash</label>
            <input
              type="text"
              value={customCreativeHash}
              onChange={(e) => setCustomCreativeHash(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. x8x7e3x"
            />
            <p className="text-xs text-gray-500 mt-1">Default: x8x7e3x (1080x1920 template)</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linear ID</label>
            <input
              type="text"
              value={customLinearId}
              onChange={(e) => setCustomLinearId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g. 16821"
            />
          </div>
          
          <div className="flex items-center">
            <input
              id="skipDownload"
              type="checkbox"
              checked={skipVideoDownload}
              onChange={(e) => setSkipVideoDownload(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="skipDownload" className="ml-2 block text-sm text-gray-700">
              Skip video download (avoid timeout)
            </label>
          </div>

          <div className="flex items-center">
            <input
              id="useFileUpload"
              type="checkbox"
              checked={useFileUpload}
              onChange={(e) => setUseFileUpload(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="useFileUpload" className="ml-2 block text-sm text-gray-700">
              Use file upload method (instead of URL)
            </label>
            {useFileUpload && (
              <span className="ml-2 text-sm text-amber-600">
                Note: URL method is more efficient and reliable for production use
              </span>
            )}
          </div>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={handleTestVideoUpload}
            disabled={isTestingVideo}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isTestingVideo ? 'Testing...' : `Test Video Upload (${useFileUpload ? 'File Method' : 'URL Method'})`}
          </button>

          <div className="relative group">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 border border-gray-300"
              onClick={() => {
                const opposite = !useFileUpload;
                setUseFileUpload(opposite);
                toast.success(`Switched to ${opposite ? 'file upload' : 'URL'} method`);
              }}
            >
              Switch to {useFileUpload ? 'URL' : 'File Upload'} Method
            </button>
            <div className="absolute hidden group-hover:block bg-white p-2 rounded shadow-md text-sm w-64 -mt-2 right-0 z-10">
              <p><strong>URL Method:</strong> Sends Creatopy video URL to BidTheatre (faster, recommended)</p>
              <p><strong>File Method:</strong> Downloads and re-uploads the video (for testing only)</p>
            </div>
          </div>
        </div>
        
        {testError && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{testError}</p>
          </div>
        )}
        
        {testResult && (
          <div className="mt-4">
            <p className="font-bold">Test Result:</p>
            <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-96">
              {testResult}
            </pre>
          </div>
        )}
      </div>

      {/* Historical Campaign Data Sync Section */}
      <div className="my-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Historical Campaign Data Sync</h2>
        <p className="mb-4 text-gray-700">
          Fetch and store historical campaign data for a specific month. This will populate the media_costs table
          with data from BidTheatre for the selected time period.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
            <input
              type="month"
              value={historicalSyncMonth}
              onChange={(e) => setHistoricalSyncMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleHistoricalSync}
              disabled={isSyncingHistorical}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 flex items-center"
            >
              {isSyncingHistorical ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                'Sync Historical Data'
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            This process may take several minutes depending on the number of active campaigns.
            The data will be stored in the media_costs table with is_monthly_snapshot=true.
          </p>
        </div>
        
        {syncError && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{syncError}</p>
          </div>
        )}
        
        {syncResult && (
          <div className="mt-4">
            <p className="font-bold">Sync Results:</p>
            <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-64 text-sm">
              {syncResult}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default BidTheatre;