// ============================================================================
// SUUN TERVEYSTALO - Age Range Selector Component
// Dual-handle slider for age range selection
// ============================================================================

import { useState } from 'react';
import { RangeSlider } from 'lucide-react';

interface AgeRangeSelectorProps {
  minAge: number;
  maxAge: number;
  onChange: (min: number, max: number) => void;
  minLimit?: number;
  maxLimit?: number;
  label?: string;
}

export function AgeRangeSelector({
  minAge,
  maxAge,
  onChange,
  minLimit = 18,
  maxLimit = 100,
  label = 'Ikäalue'
}: AgeRangeSelectorProps) {
  const [localMin, setLocalMin] = useState(minAge);
  const [localMax, setLocalMax] = useState(maxAge);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(minLimit, Math.min(maxLimit, parseInt(e.target.value) || minLimit));
    setLocalMin(value);
    if (value <= localMax) {
      onChange(value, localMax);
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(minLimit, Math.min(maxLimit, parseInt(e.target.value) || maxLimit));
    setLocalMax(value);
    if (value >= localMin) {
      onChange(localMin, value);
    }
  };

  const handleSliderChange = (values: number[]) => {
    if (values.length === 2) {
      const [newMin, newMax] = values;
      setLocalMin(newMin);
      setLocalMax(newMax);
      onChange(newMin, newMax);
    }
  };

  const percentageMin = ((localMin - minLimit) / (maxLimit - minLimit)) * 100;
  const percentageMax = ((localMax - minLimit) / (maxLimit - minLimit)) * 100;

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Age Range Display */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl font-bold text-[#00A5B5]">{localMin}</span>
        <span className="text-gray-400">-</span>
        <span className="text-2xl font-bold text-[#00A5B5]">{localMax}</span>
        <span className="text-sm text-gray-500 ml-2">vuotta</span>
      </div>

      {/* Custom Dual-Handle Slider */}
      <div className="relative pt-6 pb-2">
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          {/* Selected range */}
          <div
            className="absolute h-full bg-[#00A5B5] rounded-full"
            style={{
              left: `${percentageMin}%`,
              width: `${percentageMax - percentageMin}%`
            }}
          />

          {/* Min Handle */}
          <div
            className="absolute w-6 h-6 bg-white border-2 border-[#00A5B5] rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `calc(${percentageMin}% - 12px)`, top: '-10px' }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
            }}
          >
            <input
              type="range"
              min={minLimit}
              max={maxLimit}
              value={localMin}
              onChange={handleMinChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Max Handle */}
          <div
            className="absolute w-6 h-6 bg-white border-2 border-[#00A5B5] rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform"
            style={{ left: `calc(${percentageMax}% - 12px)`, top: '-10px' }}
          >
            <input
              type="range"
              min={minLimit}
              max={maxLimit}
              value={localMax}
              onChange={handleMaxChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="flex gap-2 mt-4 justify-center">
          {[
            { min: 18, max: 30, label: '18-30' },
            { min: 25, max: 45, label: '25-45' },
            { min: 35, max: 65, label: '35-65' },
            { min: 50, max: 100, label: '50+' }
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setLocalMin(preset.min);
                setLocalMax(preset.max);
                onChange(preset.min, preset.max);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                localMin === preset.min && localMax === preset.max
                  ? 'bg-[#00A5B5] text-white border-[#00A5B5]'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-[#00A5B5] dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Input Fields */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label htmlFor="minAge" className="block text-xs text-gray-500 mb-1">
            Minimi-ikä
          </label>
          <input
            id="minAge"
            type="number"
            min={minLimit}
            max={maxLimit}
            value={localMin}
            onChange={handleMinChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="maxAge" className="block text-xs text-gray-500 mb-1">
            Maksimi-ikä
          </label>
          <input
            id="maxAge"
            type="number"
            min={minLimit}
            max={maxLimit}
            value={localMax}
            onChange={handleMaxChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
