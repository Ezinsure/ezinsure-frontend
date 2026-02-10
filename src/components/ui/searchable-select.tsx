'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronDown, X, Loader2, Check } from 'lucide-react';

export interface SearchableSelectOption {
  _id: string;
  [key: string]: unknown; // Allow additional properties
}

export interface SearchableSelectProps<T extends SearchableSelectOption> {
  label: string;
  name: string;
  placeholder?: string;
  value: string | null; // Selected option ID
  onChange: (value: string | null) => void;
  fetchOptions: () => Promise<{ success: boolean; data: T[] }>;
  getDisplayValue: (option: T) => string; // Function to get display text from option
  getSearchValue?: (option: T) => string; // Optional: custom search value (defaults to display value)
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  noResultsMessage?: string;
}

export function SearchableSelect<T extends SearchableSelectOption>({
  label,
  name,
  placeholder = 'Type to search...',
  value,
  onChange,
  fetchOptions,
  getDisplayValue,
  getSearchValue,
  error,
  required = false,
  disabled = false,
  className = '',
  emptyMessage = 'No options available',
  noResultsMessage = 'No results found',
}: SearchableSelectProps<T>) {
  const [options, setOptions] = useState<T[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch options on mount
  useEffect(() => {
    const loadOptions = async () => {
      setIsFetching(true);
      try {
        const response = await fetchOptions();
        if (response.success && Array.isArray(response.data)) {
          setOptions(response.data);
        }
      } catch (error) {
        console.error('Error fetching options:', error);
      } finally {
        setIsFetching(false);
      }
    };

    loadOptions();
  }, [fetchOptions]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }

    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const searchValue = getSearchValue 
        ? getSearchValue(option).toLowerCase()
        : getDisplayValue(option).toLowerCase();
      return searchValue.includes(query);
    });
  }, [options, searchQuery, getDisplayValue, getSearchValue]);

  // Get selected option
  const selectedOption = useMemo(() => {
    if (!value) return null;
    return options.find((opt) => opt._id === value) || null;
  }, [options, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle option selection
  const handleSelect = useCallback((option: T) => {
    onChange(option._id);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  // Handle clear selection
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery('');
  }, [onChange]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsOpen(true);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0]);
    }
  }, [filteredOptions, handleSelect]);

  const displayText = selectedOption ? getDisplayValue(selectedOption) : '';
  const showSearchInput = isOpen || !selectedOption;

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {/* Display selected value or search input */}
        <div
          className={`
            w-full min-h-[42px] px-3 py-2 rounded-lg border transition-all duration-200
            focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent
            ${error 
              ? 'border-red-300 bg-red-50' 
              : disabled
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text'}
          `}
          onClick={handleInputFocus}
        >
          {showSearchInput ? (
            <input
              ref={inputRef}
              type="text"
              name={name}
              placeholder={placeholder}
              value={searchQuery || displayText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || isFetching}
              className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          ) : (
            <div className="flex items-center justify-between w-full pr-8">
              <span className="text-sm text-gray-900 flex-1 truncate">{displayText}</span>
              {!disabled && value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="ml-2 p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  aria-label="Clear selection"
                  onMouseDown={(e) => e.preventDefault()} // Prevent input focus on click
                >
                  <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dropdown icon */}
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors z-10"
            aria-label="Toggle dropdown"
            onMouseDown={(e) => e.preventDefault()} // Prevent input focus on click
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : (
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            )}
          </button>
        )}

        {/* Dropdown menu */}
        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {isFetching ? (
              <div className="px-4 py-8 text-center">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading options...</p>
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">
                  {options.length === 0 ? emptyMessage : noResultsMessage}
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {filteredOptions.map((option) => {
                  const isSelected = value === option._id;
                  const displayValue = getDisplayValue(option);
                  
                  return (
                    <li
                      key={option._id}
                      onClick={() => handleSelect(option)}
                      className={`
                        px-4 py-2 cursor-pointer text-sm transition-colors
                        ${isSelected 
                          ? 'bg-blue-50 text-blue-900' 
                          : 'hover:bg-gray-50 text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span>{displayValue}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}

