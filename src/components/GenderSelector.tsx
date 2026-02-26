// ============================================================================
// SUUN TERVEYSTALO - Gender Selector Component
// Toggle buttons for gender selection with "All" as mutually exclusive option
// ============================================================================

import { Users, User } from 'lucide-react';

interface GenderSelectorProps {
  selected: string[];
  onChange: (genders: string[]) => void;
  label?: string;
}

const GENDER_OPTIONS = [
  { id: 'all', label: 'Kaikki', icon: Users },
  { id: 'male', label: 'Miehet', icon: User },
  { id: 'female', label: 'Naiset', icon: User }
];

export function GenderSelector({
  selected,
  onChange,
  label = 'Sukupuoli'
}: GenderSelectorProps) {

  const handleToggle = (genderId: string) => {
    if (genderId === 'all') {
      // If "All" is selected, clear all other selections
      onChange(['all']);
    } else if (selected.includes('all')) {
      // If a specific gender is clicked and "All" was selected, replace with just this gender
      onChange([genderId]);
    } else if (selected.includes(genderId)) {
      // Deselect current gender
      const newSelected = selected.filter(g => g !== genderId);
      // If nothing selected, default to "all"
      onChange(newSelected.length > 0 ? newSelected : ['all']);
    } else {
      // Add gender to selection
      onChange([...selected.filter(g => g !== 'all'), genderId]);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        {GENDER_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selected.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all
                ${isSelected
                  ? 'bg-[#00A5B5] text-white border-[#00A5B5] shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#00A5B5] hover:bg-[#00A5B5]/10 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }
              `}
            >
              <Icon size={18} />
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Visual feedback for current selection */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {selected.includes('all')
          ? 'Kaikki sukupuolet kohdistettu'
          : selected.length === 1
            ? `Kohdistettu: ${GENDER_OPTIONS.find(g => g.id === selected[0])?.label}`
            : `Kohdistettu: ${selected.length} sukupuolta`
        }
      </div>
    </div>
  );
}
