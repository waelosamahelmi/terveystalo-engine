// ============================================================================
// SUUN TERVEYSTALO - Branch Service
// Handles all branch (toimipiste) operations
// ============================================================================

import { supabase } from './supabase';
import type { Branch, BranchBudget, BranchPerformance } from '../types';

// ============================================================================
// BRANCH BUDGET TYPES
// ============================================================================

export interface BranchBudgetSummary {
  total_allocated: number;
  total_used: number;
  total_available: number;
  by_branch: Array<{
    branch: Branch;
    allocated: number;
    used: number;
    available: number;
  }>;
}

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

// ============================================================================
// BRANCH BUDGET FUNCTIONS
// ============================================================================

/**
 * Get branches with budget information
 */
export async function getBranchesWithBudgets(): Promise<Array<Branch & { budget?: BranchBudget }>> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  const { data, error } = await supabase
    .from('branches')
    .select(`
      *,
      budget:branch_budgets!left(*)
    `)
    .eq('active', true)
    .order('name');

  if (error) {
    console.error('Failed to fetch branches with budgets:', error);
    return [];
  }

  // Filter budgets for current period
  return (data || []).map(branch => ({
    ...branch,
    budget: (branch as any).budget?.find((b: BranchBudget) => b.period_start === currentPeriod) || undefined
  }));
}

/**
 * Get branch budget summary for a specific branch
 */
export async function getBranchBudgetSummary(branchId: string): Promise<BranchBudget | null> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  const { data, error } = await supabase
    .from('branch_budgets')
    .select('*')
    .eq('branch_id', branchId)
    .eq('period_start', currentPeriod)
    .single();

  if (error) {
    console.error('Failed to fetch branch budget:', error);
    return null;
  }

  return data;
}

/**
 * Get total budget summary across all branches
 */
export async function getTotalBudgetSummary(): Promise<BranchBudgetSummary> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  const { data: branches, error: branchesError } = await supabase
    .from('branches')
    .select('id, name, city')
    .eq('active', true)
    .order('name');

  if (branchesError || !branches) {
    console.error('Failed to fetch branches for budget summary:', branchesError);
    return {
      total_allocated: 0,
      total_used: 0,
      total_available: 0,
      by_branch: []
    };
  }

  const branchIds = branches.map(b => b.id);

  const { data: budgets, error: budgetsError } = await supabase
    .from('branch_budgets')
    .select('*')
    .in('branch_id', branchIds)
    .eq('period_start', currentPeriod);

  if (budgetsError) {
    console.error('Failed to fetch budgets:', budgetsError);
  }

  const budgetMap = new Map((budgets || []).map(b => [b.branch_id, b]));

  const by_branch = branches.map(branch => {
    const budget = budgetMap.get(branch.id);
    return {
      branch,
      allocated: budget?.allocated_budget || 0,
      used: budget?.used_budget || 0,
      available: (budget?.allocated_budget || 0) - (budget?.used_budget || 0)
    };
  });

  const total_allocated = by_branch.reduce((sum, b) => sum + b.allocated, 0);
  const total_used = by_branch.reduce((sum, b) => sum + b.used, 0);
  const total_available = total_allocated - total_used;

  return {
    total_allocated,
    total_used,
    total_available,
    by_branch
  };
}

/**
 * Update branch used budget when campaign is created (sets absolute value)
 */
export async function updateBranchUsedBudget(
  branchId: string,
  budgetAmount: number
): Promise<boolean> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  // Check if budget record exists for current period
  const { data: existing } = await supabase
    .from('branch_budgets')
    .select('id')
    .eq('branch_id', branchId)
    .eq('period_start', currentPeriod)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('branch_budgets')
      .update({
        used_budget: budgetAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update branch used budget:', error);
      return false;
    }
  } else {
    // Create new record with zero allocation
    const { error } = await supabase
      .from('branch_budgets')
      .insert({
        branch_id: branchId,
        allocated_budget: 0,
        used_budget: budgetAmount,
        period_start: currentPeriod
      });

    if (error) {
      console.error('Failed to create branch budget:', error);
      return false;
    }
  }

  return true;
}

/**
 * Create or update branch allocated budget
 */
export async function upsertBranchAllocatedBudget(
  branchId: string,
  allocatedBudget: number
): Promise<boolean> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  // Check if budget record exists for current period
  const { data: existing } = await supabase
    .from('branch_budgets')
    .select('id')
    .eq('branch_id', branchId)
    .eq('period_start', currentPeriod)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('branch_budgets')
      .update({
        allocated_budget: allocatedBudget,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update branch allocated budget:', error);
      return false;
    }
  } else {
    // Create new record
    const { error } = await supabase
      .from('branch_budgets')
      .insert({
        branch_id: branchId,
        allocated_budget: allocatedBudget,
        used_budget: 0,
        period_start: currentPeriod
      });

    if (error) {
      console.error('Failed to create branch budget:', error);
      return false;
    }
  }

  return true;
}

/**
 * Update branch used budget when campaign is created (increments)
 */
export async function updateBranchUsedBudgetIncrement(
  branchId: string,
  budgetAmount: number
): Promise<boolean> {
  const currentPeriod = new Date().toISOString().slice(0, 7) + '-01';

  // Check if budget record exists for current period
  const { data: existing } = await supabase
    .from('branch_budgets')
    .select('id, used_budget')
    .eq('branch_id', branchId)
    .eq('period_start', currentPeriod)
    .maybeSingle();

  if (existing) {
    // Update existing record
    const { error } = await supabase
      .from('branch_budgets')
      .update({
        used_budget: existing.used_budget + budgetAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update branch budget:', error);
      return false;
    }
  } else {
    // Create new record with zero allocation
    const { error } = await supabase
      .from('branch_budgets')
      .insert({
        branch_id: branchId,
        allocated_budget: 0,
        used_budget: budgetAmount,
        period_start: currentPeriod
      });

    if (error) {
      console.error('Failed to create branch budget:', error);
      return false;
    }
  }

  return true;
}

/**
 * Get available budget for a branch
 */
export async function getBranchAvailableBudget(branchId: string): Promise<number> {
  const budget = await getBranchBudgetSummary(branchId);
  if (!budget) {
    return 0;
  }
  return (budget.allocated_budget || 0) - (budget.used_budget || 0);
}
