// ============================================================================
// SUUN TERVEYSTALO - Realtime Data Store
// Global data store with Supabase Realtime subscriptions
// Data loads ONCE at login and stays synced - instant navigation everywhere
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from './supabase';
import type { User, Branch, Service, DentalCampaign } from '../types';

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================
interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: { name: string; email: string };
}

interface MediaScreen {
  id: string;
  name: string;
  screen_id: string;
  network: string;
  location: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  screen_type: string;
  width?: number;
  height?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Video {
  id: string;
  name: string;
  filename: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STORE TYPE
// ============================================================================
interface DataStore {
  // Core data - always loaded
  users: User[];
  branches: Branch[];
  services: Service[];
  campaigns: DentalCampaign[];
  
  // Secondary data - loaded on demand but cached
  activityLogs: ActivityLog[];
  mediaScreens: MediaScreen[];
  videos: Video[];
  
  // Loading states
  initialLoading: boolean;
  usersLoading: boolean;
  branchesLoading: boolean;
  servicesLoading: boolean;
  campaignsLoading: boolean;
  
  // Refresh functions
  refreshUsers: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshServices: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshActivityLogs: () => Promise<void>;
  refreshMediaScreens: () => Promise<void>;
  refreshVideos: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DataStoreContext = createContext<DataStore | null>(null);

// ============================================================================
// HOOK
// ============================================================================
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) {
    throw new Error('useDataStore must be used within DataStoreProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER - Loads ALL data once, keeps it synced via Realtime
// ============================================================================
interface DataStoreProviderProps {
  children: ReactNode;
}

export const DataStoreProvider = ({ children }: DataStoreProviderProps) => {
  // Core data
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [campaigns, setCampaigns] = useState<DentalCampaign[]>([]);
  
  // Secondary data
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [mediaScreens, setMediaScreens] = useState<MediaScreen[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // ========== FETCH FUNCTIONS ==========
  
  const refreshUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      if (!error && data) setUsers(data);
    } catch (e) {
      console.error('Error fetching users:', e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const refreshBranches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name');
      if (!error && data) setBranches(data);
    } catch (e) {
      console.error('Error fetching branches:', e);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const refreshServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('sort_order');
      if (!error && data) setServices(data);
    } catch (e) {
      console.error('Error fetching services:', e);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const refreshCampaigns = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dental_campaigns')
        .select('*, service:services(*), branch:branches(*)')
        .order('created_at', { ascending: false });
      if (!error && data) setCampaigns(data);
    } catch (e) {
      console.error('Error fetching campaigns:', e);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const refreshActivityLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, user:users(name, email)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) setActivityLogs(data);
    } catch (e) {
      console.error('Error fetching activity logs:', e);
    }
  }, []);

  const refreshMediaScreens = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('media_screens')
        .select('*')
        .order('name');
      if (!error && data) setMediaScreens(data);
    } catch (e) {
      console.error('Error fetching media screens:', e);
    }
  }, []);

  const refreshVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setVideos(data);
    } catch (e) {
      console.error('Error fetching videos:', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshUsers(),
      refreshBranches(),
      refreshServices(),
      refreshCampaigns(),
      refreshActivityLogs(),
      refreshMediaScreens(),
      refreshVideos(),
    ]);
  }, [refreshUsers, refreshBranches, refreshServices, refreshCampaigns, refreshActivityLogs, refreshMediaScreens, refreshVideos]);

  // ========== INITIAL LOAD + REALTIME SUBSCRIPTIONS ==========
  
  useEffect(() => {
    // Load ALL core data in parallel
    const loadInitialData = async () => {
      await Promise.all([
        refreshUsers(),
        refreshBranches(),
        refreshServices(),
        refreshCampaigns(),
      ]);
      setInitialLoading(false);
      
      // Load secondary data in background
      refreshActivityLogs();
      refreshMediaScreens();
      refreshVideos();
    };

    loadInitialData();

    // ========== REALTIME SUBSCRIPTIONS ==========
    
    const usersChannel = supabase
      .channel('store-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [...prev, payload.new as User].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new as User : u));
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id !== payload.old.id));
        }
      })
      .subscribe();

    const branchesChannel = supabase
      .channel('store-branches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setBranches(prev => [...prev, payload.new as Branch].sort((a, b) => a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'UPDATE') {
          setBranches(prev => prev.map(b => b.id === payload.new.id ? payload.new as Branch : b));
        } else if (payload.eventType === 'DELETE') {
          setBranches(prev => prev.filter(b => b.id !== payload.old.id));
        }
      })
      .subscribe();

    const servicesChannel = supabase
      .channel('store-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setServices(prev => [...prev, payload.new as Service].sort((a, b) => a.sort_order - b.sort_order));
        } else if (payload.eventType === 'UPDATE') {
          setServices(prev => prev.map(s => s.id === payload.new.id ? payload.new as Service : s));
        } else if (payload.eventType === 'DELETE') {
          setServices(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const campaignsChannel = supabase
      .channel('store-campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dental_campaigns' }, () => {
        // For campaigns with relations, just refetch
        refreshCampaigns();
      })
      .subscribe();

    const activityChannel = supabase
      .channel('store-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
        refreshActivityLogs();
      })
      .subscribe();

    const screensChannel = supabase
      .channel('store-screens')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'media_screens' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMediaScreens(prev => [...prev, payload.new as MediaScreen].sort((a, b) => a.name.localeCompare(b.name)));
        } else if (payload.eventType === 'UPDATE') {
          setMediaScreens(prev => prev.map(s => s.id === payload.new.id ? payload.new as MediaScreen : s));
        } else if (payload.eventType === 'DELETE') {
          setMediaScreens(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
      .subscribe();

    const videosChannel = supabase
      .channel('store-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setVideos(prev => [payload.new as Video, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setVideos(prev => prev.map(v => v.id === payload.new.id ? payload.new as Video : v));
        } else if (payload.eventType === 'DELETE') {
          setVideos(prev => prev.filter(v => v.id !== payload.old.id));
        }
      })
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(branchesChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(activityChannel);
      supabase.removeChannel(screensChannel);
      supabase.removeChannel(videosChannel);
    };
  }, [refreshUsers, refreshBranches, refreshServices, refreshCampaigns, refreshActivityLogs, refreshMediaScreens, refreshVideos]);

  return (
    <DataStoreContext.Provider value={{
      // Data
      users,
      branches,
      services,
      campaigns,
      activityLogs,
      mediaScreens,
      videos,
      // Loading
      initialLoading,
      usersLoading,
      branchesLoading,
      servicesLoading,
      campaignsLoading,
      // Actions
      refreshUsers,
      refreshBranches,
      refreshServices,
      refreshCampaigns,
      refreshActivityLogs,
      refreshMediaScreens,
      refreshVideos,
      refreshAll,
    }}>
      {children}
    </DataStoreContext.Provider>
  );
};
