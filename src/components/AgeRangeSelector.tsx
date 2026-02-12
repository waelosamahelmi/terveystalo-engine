// ============================================================================
// SUUN TERVEYSTALO - Age Range Selector Component
// Dual-handle slider for age range selection
// ============================================================================

import { useState, useCallback } from 'react';

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

  const handleMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    // Ensure min doesn't exceed max
    const newMin = Math.min(value, localMax - 1);
    setLocalMin(newMin);
    onChange(newMin, localMax);
  }, [localMax, onChange]);

  const handleMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    // Ensure max doesn't go below min
    const newMax = Math.max(value, localMin + 1);
    setLocalMax(newMax);
    onChange(localMin, newMax);
  }, [localMin, onChange]);

  const handleNumberInputMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(minLimit, Math.min(localMax - 1, parseInt(e.target.value) || minLimit));
    setLocalMin(value);
    onChange(value, localMax);
  };

  const handleNumberInputMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(localMin + 1, Math.min(maxLimit, parseInt(e.target.value) || maxLimit));
    setLocalMax(value);
    onChange(localMin, value);
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

      {/* Dual Range Slider */}
      <div className="relative pt-6 pb-2 px-3">
        {/* Track background */}
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          {/* Selected range highlight */}
          <div
            className="absolute h-full bg-[#00A5B5] rounded-full pointer-events-none"
            style={{
              left: `${percentageMin}%`,
              width: `${percentageMax - percentageMin}%`
            }}
          />
        </div>

        {/* Min Range Input */}
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={1}
          value={localMin}
          onChange={handleMinChange}
          className="absolute top-4 left-0 w-full h-6 appearance-none bg-transparent pointer-events-none z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-[#00A5B5]
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-[#00A5B5]
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer"
          style={{ marginLeft: '0px', marginRight: '0px' }}
        />

        {/* Max Range Input */}
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={1}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute top-4 left-0 w-full h-6 appearance-none bg-transparent pointer-events-none z-20
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:pointer-events-auto
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-[#00A5B5]
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:appearance-none
            [&::-moz-range-thumb]:pointer-events-auto
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-[#00A5B5]
            [&::-moz-range-thumb]:shadow-lg
            [&::-moz-range-thumb]:cursor-pointer"
          style={{ marginLeft: '0px', marginRight: '0px' }}
        />

        {/* Quick Select Buttons */}
        <div className="flex gap-2 mt-8 justify-center">
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
            max={localMax - 1}
            value={localMin}
            onChange={handleNumberInputMinChange}
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
            min={localMin + 1}
            max={maxLimit}
            value={localMax}
            onChange={handleNumberInputMaxChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A5B5] focus:border-transparent dark:bg-gray-800 dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
