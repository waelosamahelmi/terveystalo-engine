// ============================================================================
// SUUN TERVEYSTALO - Auto-Expand Textarea Component
// Textarea that automatically grows as user types, preserves newlines on Enter
// ============================================================================

import { useRef, useEffect, useState } from 'react';
import { Minus, Maximize2 } from 'lucide-react';

interface AutoExpandTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  label?: string;
  error?: string;
  disabled?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
  rows?: number;
}

export function AutoExpandTextarea({
  value,
  onChange,
  placeholder = '',
  minHeight = 44,
  maxHeight = 200,
  label,
  error,
  disabled = false,
  maxLength,
  showCharCount = false,
  rows = 1
}: AutoExpandTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height
    let newHeight = textarea.scrollHeight;

    // Apply min and max constraints
    if (newHeight < minHeight) {
      newHeight = minHeight;
    } else if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
    }

    textarea.style.height = `${newHeight}px`;
  }, [value, minHeight, maxHeight]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Enter key to create new line (don't prevent default)
    // The auto-expand will handle the height adjustment
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (maxLength && newValue.length > maxLength) {
      onChange(newValue.slice(0, maxLength));
    } else {
      onChange(newValue);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (!isExpanded) {
      // Expand to max height
      textarea.style.height = `${maxHeight}px`;
    } else {
      // Reset to auto height
      textarea.style.height = 'auto';
      setTimeout(() => {
        const newHeight = textarea.scrollHeight;
        textarea.style.height = `${Math.min(newHeight, minHeight)}px`;
      }, 0);
    }
  };

  const charCount = value.length;
  const charCountColor = maxLength && charCount > maxLength * 0.9
    ? 'text-orange-600 dark:text-orange-400'
    : 'text-gray-400';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={`
            w-full px-3 py-2.5 pr-10 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all resize-none
            dark:bg-gray-800 dark:text-white
            ${
              error
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500 text-red-900 placeholder:text-red-300'
                : 'border-gray-300 focus:ring-[#00A5B5] focus:border-[#00A5B5] text-gray-900 placeholder:text-gray-400'
                } dark:border-gray-600
          `}
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
            overflow: isExpanded ? 'auto' : 'hidden'
          }}
        />

        {/* Expand/Collapse Button */}
        {maxHeight > minHeight && (
          <button
            type="button"
            onClick={toggleExpand}
            className="absolute right-2 bottom-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={isExpanded ? 'Kutista' : 'Laajenna'}
          >
            {isExpanded ? (
              <Minus size={14} />
            ) : (
              <Maximize2 size={14} />
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm1-9a1 1 0 00-2 0v4a1 1 0 002 0V5a1 1 0 00-2 0z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Character Count */}
      {showCharCount && (
        <div className="mt-1.5 flex justify-end">
          <span className={`text-xs ${charCountColor}`}>
            {charCount}
            {maxLength && ` / ${maxLength}`}
          </span>
        </div>
      )}
    </div>
  );
}
