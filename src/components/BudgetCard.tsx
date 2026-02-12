// ============================================================================
// SUUN TERVEYSTALO - Budget Card Component
// Shows branch budget summary with allocated, used, and available amounts
// ============================================================================

import { Euro, TrendingUp, AlertCircle } from 'lucide-react';

interface BudgetCardProps {
  branchName: string;
  allocated: number;
  used: number;
  available: number;
  currency?: string;
  showDetails?: boolean;
}

export function BudgetCard({
  branchName,
  allocated,
  used,
  available,
  currency = '€',
  showDetails = true
}: BudgetCardProps) {
  // Calculate utilization percentage - handle NaN cases
  const utilizationPercentage = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

  // Determine status color
  const getStatusColor = () => {
    if (utilizationPercentage >= 100) return 'text-red-600 dark:text-red-400';
    if (utilizationPercentage >= 80) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    if (utilizationPercentage >= 100) return 'bg-red-500';
    if (utilizationPercentage >= 80) return 'bg-orange-500';
    return 'bg-[#00A5B5]';
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fi-FI')}${currency}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{branchName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Budjettitilanne</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getStatusColor()}`}>
            {utilizationPercentage >= 100 ? (
              <AlertCircle size={16} />
            ) : (
              <TrendingUp size={16} />
            )}
            <span className="text-sm font-medium">
              {Math.min(100, utilizationPercentage).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-4">
        <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 left-0 h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${Math.min(100, utilizationPercentage)}%` }}
          />
        </div>
      </div>

      {/* Budget Summary */}
      <div className="px-5 pb-5">
        {showDetails ? (
          <div className="grid grid-cols-3 gap-4">
            {/* Allocated */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Allokoitu yhteensä</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(allocated)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">100%</p>
            </div>

            {/* Used */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Käytetty</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(used)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {allocated > 0 ? ((used / allocated) * 100).toFixed(0) : '0'}%
              </p>
            </div>

            {/* Available */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Käytettävissä</p>
              <p className={`text-xl font-bold ${
                available > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(Math.max(0, available))}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {allocated > 0 ? ((available / allocated) * 100).toFixed(0) : '0'}%
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Käytettävissä</p>
              <p className={`text-2xl font-bold ${
                available > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {formatCurrency(Math.max(0, available))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Yhteensä</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(allocated)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Warning if over budget */}
      {available < 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Budjetti ylitetty! Vähennä kampanjan budjettia tai valitse toinen toimipiste.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
