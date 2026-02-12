// ============================================================================
// SUUN TERVEYSTALO - Global Store (SINGLETON)
// Data lives OUTSIDE React - never lost, never re-fetched unnecessarily
// This is the KEY to instant navigation and stability
// ============================================================================

import { supabase } from './supabase';
import { clearDemoData } from './demoService';
import type { User, Branch, Service, DentalCampaign } from '../types';

// ============================================================================
// TYPES
// ============================================================================
interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
  user?: { name: string; email: string };
}

interface Video {
  id: string;
  name: string;
  filename?: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
  format?: string;
  created_at: string;
  updated_at?: string;
}

// Snapshot type that useStore returns
interface StoreSnapshot {
  user: User | null;
  authInitialized: boolean;
  isReady: boolean;
  users: User[];
  branches: Branch[];
  services: Service[];
  campaigns: DentalCampaign[];
  activityLogs: ActivityLog[];
  videos: Video[];
  signOut: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshBranches: () => Promise<void>;
  refreshServices: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshActivityLogs: () => Promise<void>;
  refreshVideos: () => Promise<void>;
}

// ============================================================================
// GLOBAL STORE - Singleton pattern, lives outside React
// ============================================================================
class GlobalStore {
  // Data
  private _users: User[] = [];
  private _branches: Branch[] = [];
  private _services: Service[] = [];
  private _campaigns: DentalCampaign[] = [];
  private _activityLogs: ActivityLog[] = [];
  private _videos: Video[] = [];
  
  // Auth
  private _currentUser: User | null = null;
  private _authInitialized = false;
  
  // Status
  private _initialDataLoaded = false;
  private _subscriptionsActive = false;
  
  // Listeners (for React components to subscribe)
  private _listeners: Set<() => void> = new Set();
  
  // CRITICAL: Cached snapshot to prevent infinite loops
  private _cachedSnapshot: StoreSnapshot | null = null;
  private _snapshotVersion = 0;

  // ========== GETTERS ==========
  get users() { return this._users; }
  get branches() { return this._branches; }
  get services() { return this._services; }
  get campaigns() { return this._campaigns; }
  get activityLogs() { return this._activityLogs; }
  get videos() { return this._videos; }
  get currentUser() { return this._currentUser; }
  get isReady() { return this._initialDataLoaded && this._authInitialized; }
  get authInitialized() { return this._authInitialized; }

  // ========== SNAPSHOT (cached for React) ==========
  getSnapshot = (): StoreSnapshot => {
    if (!this._cachedSnapshot) {
      this._cachedSnapshot = this._createSnapshot();
    }
    return this._cachedSnapshot;
  };

  private _createSnapshot(): StoreSnapshot {
    return {
      user: this._currentUser,
      authInitialized: this._authInitialized,
      isReady: this._initialDataLoaded && this._authInitialized,
      users: this._users,
      branches: this._branches,
      services: this._services,
      campaigns: this._campaigns,
      activityLogs: this._activityLogs,
      videos: this._videos,
      signOut: this.signOut,
      refreshUsers: this.refreshUsers,
      refreshBranches: this.refreshBranches,
      refreshServices: this.refreshServices,
      refreshCampaigns: this.refreshCampaigns,
      refreshActivityLogs: this.refreshActivityLogs,
      refreshVideos: this.refreshVideos,
    };
  }

  private _invalidateSnapshot() {
    this._snapshotVersion++;
    this._cachedSnapshot = this._createSnapshot();
  }

  // ========== SUBSCRIPTION FOR REACT ==========
  subscribe = (listener: () => void) => {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  };

  private notify() {
    this._invalidateSnapshot();
    this._listeners.forEach(l => l());
  }

  // ========== AUTH ==========
  async initAuth(): Promise<User | null> {
    if (this._authInitialized && this._currentUser) {
      return this._currentUser;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          this._currentUser = data;
          this._authInitialized = true;
          this.notify();
          return data;
        }
      }
      
      this._authInitialized = true;
      this.notify();
      return null;
    } catch (error) {
      console.error('Auth init error:', error);
      this._authInitialized = true;
      this.notify();
      return null;
    }
  }

  signOut = async () => {
    this._currentUser = null;
    this._initialDataLoaded = false;
    // Clear demo data when signing out
    clearDemoData();
    await supabase.auth.signOut();
    this.notify();
  };

  setUser(user: User | null) {
    this._currentUser = user;
    this._authInitialized = true;
    this.notify();
  }

  // ========== DATA LOADING ==========
  async loadAllData() {
    if (this._initialDataLoaded) return;

    try {
      // Load all core data in parallel
      const [usersRes, branchesRes, servicesRes, campaignsRes] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('branches').select('*, budget:branch_budgets(*)').order('name'),
        supabase.from('services').select('*').order('sort_order'),
        supabase.from('dental_campaigns').select('*, service:services(*), branch:branches(*)').order('created_at', { ascending: false }),
      ]);

      if (usersRes.data) this._users = usersRes.data;
      if (branchesRes.data) {
        // Transform branches to extract budget from array to single object
        this._branches = branchesRes.data.map((branch: any) => ({
          ...branch,
          budget: Array.isArray(branch.budget) && branch.budget.length > 0
            ? branch.budget[0]  // Get the first/latest budget record
            : branch.budget
        }));
      }
      if (servicesRes.data) this._services = servicesRes.data;
      if (campaignsRes.data) this._campaigns = campaignsRes.data;

      this._initialDataLoaded = true;
      this.notify();

      // Load secondary data in background (non-blocking)
      this.loadSecondaryData();
      
      // Setup realtime subscriptions
      this.setupRealtimeSubscriptions();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async loadSecondaryData() {
    try {
      const [logsRes] = await Promise.all([
        supabase.from('activity_logs').select('*, user:users(name, email)').order('created_at', { ascending: false }).limit(100),
      ]);

      if (logsRes.data) this._activityLogs = logsRes.data;
      this.notify();
    } catch (error) {
      console.error('Error loading secondary data:', error);
    }
  }

  // ========== INDIVIDUAL REFRESH FUNCTIONS ==========
  refreshUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('name');
    if (data) { this._users = data; this.notify(); }
  };

  refreshBranches = async () => {
    const { data } = await supabase.from('branches').select('*, budget:branch_budgets(*)').order('name');
    if (data) {
      // Transform branches to extract budget from array to single object
      this._branches = data.map((branch: any) => ({
        ...branch,
        budget: Array.isArray(branch.budget) && branch.budget.length > 0
          ? branch.budget[0]  // Get the first/latest budget record
          : branch.budget
      }));
      this.notify();
    }
  };

  refreshServices = async () => {
    const { data } = await supabase.from('services').select('*').order('sort_order');
    if (data) { this._services = data; this.notify(); }
  };

  refreshCampaigns = async () => {
    const { data } = await supabase.from('dental_campaigns').select('*, service:services(*), branch:branches(*)').order('created_at', { ascending: false });
    if (data) { this._campaigns = data; this.notify(); }
  };

  refreshActivityLogs = async () => {
    const { data } = await supabase.from('activity_logs').select('*, user:users(name, email)').order('created_at', { ascending: false }).limit(100);
    if (data) { this._activityLogs = data; this.notify(); }
  };

  refreshVideos = async () => {
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false });
    if (data) { this._videos = data; this.notify(); }
  };

  // ========== REALTIME SUBSCRIPTIONS ==========
  private setupRealtimeSubscriptions() {
    if (this._subscriptionsActive) return;
    this._subscriptionsActive = true;

    // Users
    supabase.channel('global-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => this.refreshUsers())
      .subscribe();

    // Branches
    supabase.channel('global-branches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => this.refreshBranches())
      .subscribe();

    // Services
    supabase.channel('global-services')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => this.refreshServices())
      .subscribe();

    // Campaigns
    supabase.channel('global-campaigns')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dental_campaigns' }, () => this.refreshCampaigns())
      .subscribe();

    // Activity Logs (only INSERT)
    supabase.channel('global-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => this.refreshActivityLogs())
      .subscribe();
  }
}

// ============================================================================
// SINGLETON INSTANCE - Created once, lives forever
// ============================================================================
export const store = new GlobalStore();

// ============================================================================
// REACT HOOK - Subscribes component to store updates
// ============================================================================
import { useSyncExternalStore } from 'react';

export function useStore(): StoreSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
