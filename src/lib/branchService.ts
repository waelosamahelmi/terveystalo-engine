// ============================================================================
// SUUN TERVEYSTALO - Branch Service
// Handles all branch (toimipiste) operations
// ============================================================================

import { supabase } from './supabase';
import type { Branch, BranchPerformance } from '../types';

/**
 * Get all branches
 */
export async function getBranches(activeOnly = true): Promise<Branch[]> {
  let query = supabase
    .from('branches')
    .select('*')
    .order('city')
    .order('name');

  if (activeOnly) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch branches:', error);
    return [];
  }

  return data || [];
}

/**
 * Get branch by ID
 */
export async function getBranchById(id: string): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch branch:', error);
    return null;
  }

  return data;
}

/**
 * Get branches by city
 */
export async function getBranchesByCity(city: string): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .ilike('city', `%${city}%`)
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch branches by city:', error);
    return [];
  }

  return data || [];
}

/**
 * Search branches
 */
export async function searchBranches(query: string): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('active', true)
    .or(`name.ilike.%${query}%,city.ilike.%${query}%,address.ilike.%${query}%`)
    .order('city')
    .order('name')
    .limit(20);

  if (error) {
    console.error('Failed to search branches:', error);
    return [];
  }

  return data || [];
}

/**
 * Create a new branch
 */
export async function createBranch(branch: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branches')
    .insert(branch)
    .select()
    .single();

  if (error) {
    console.error('Failed to create branch:', error);
    return null;
  }

  return data;
}

/**
 * Update a branch
 */
export async function updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | null> {
  const { data, error } = await supabase
    .from('branches')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update branch:', error);
    return null;
  }

  return data;
}

/**
 * Delete a branch (soft delete by setting active = false)
 */
export async function deleteBranch(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('branches')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to delete branch:', error);
    return false;
  }

  return true;
}

/**
 * Get branch performance metrics
 */
export async function getBranchPerformance(branchId?: string, days = 30): Promise<BranchPerformance[]> {
  // Use the database view for branch performance
  let query = supabase
    .from('branch_performance')
    .select('*');

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch branch performance:', error);
    return [];
  }

  return data || [];
}

/**
 * Get unique cities from branches
 */
export async function getBranchCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('city')
    .eq('active', true)
    .order('city');

  if (error) {
    console.error('Failed to fetch branch cities:', error);
    return [];
  }

  // Get unique cities
  const cities = [...new Set(data?.map(b => b.city) || [])];
  return cities;
}

/**
 * Get branches with coordinates for map display
 */
export async function getBranchesForMap(): Promise<Array<Branch & { lat: number; lng: number }>> {
  const branches = await getBranches(true);
  
  return branches
    .filter(b => b.coordinates?.lat && b.coordinates?.lng)
    .map(b => ({
      ...b,
      lat: b.coordinates.lat,
      lng: b.coordinates.lng
    }));
}

/**
 * Get branch statistics
 */
export async function getBranchStats(): Promise<{
  total: number;
  active: number;
  byCity: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('branches')
    .select('city, active');

  if (error) {
    console.error('Failed to fetch branch stats:', error);
    return { total: 0, active: 0, byCity: {} };
  }

  const total = data?.length || 0;
  const active = data?.filter(b => b.active).length || 0;
  const byCity: Record<string, number> = {};

  data?.forEach(b => {
    if (b.active) {
      byCity[b.city] = (byCity[b.city] || 0) + 1;
    }
  });

  return { total, active, byCity };
}

/**
 * Toggle branch active status
 */
export async function toggleBranchStatus(id: string): Promise<Branch | null> {
  // First get current status
  const { data: current, error: fetchError } = await supabase
    .from('branches')
    .select('active')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    console.error('Failed to fetch branch:', fetchError);
    return null;
  }

  // Toggle the status
  const { data, error } = await supabase
    .from('branches')
    .update({ active: !current.active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to toggle branch status:', error);
    return null;
  }

  return data;
}
