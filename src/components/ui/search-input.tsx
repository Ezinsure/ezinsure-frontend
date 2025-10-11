'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface SearchInputProps {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSearchSuccess?: (data: Record<string, unknown>) => void;
  searchType: 'plate' | 'id';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  resetTrigger?: number; // Add reset trigger prop
}

export const SearchInput = ({
  label,
  name,
  placeholder,
  value,
  onChange,
  onSearchSuccess,
  searchType,
  error,
  required = false,
  disabled = false,
  resetTrigger = 0,
}: SearchInputProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { showToast } = useToast();

  // Reset search status when resetTrigger changes
  useEffect(() => {
    setSearchStatus('idle');
    setIsSearching(false);
  }, [resetTrigger]);

  const handleSearch = async () => {
    if (!value.trim()) {
      showToast('Please enter a value to search', 'error');
      return;
    }

    setIsSearching(true);
    setSearchStatus('idle');

    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Test logic: 123 = success, abc = error, others = not found
      let response;
      if (value.trim() === '123') {
        response = {
          success: true,
          data: {
            fullName: 'Jean Claude Niyonzima',
            email: 'jean.claude@example.com',
            phoneNumber: '250781234567',
            address: 'KN 5 RD, Kigali - Rwanda',
            dateOfBirth: '1990-05-15',
            province: 'Kigali',
            district: 'Gasabo',
            sector: 'Kacyiru',
            ...(searchType === 'plate' && {
              vehicleType: 'Jeep',
              vehicleAge: '2018',
              vehicleUse: 'Private'
            })
          }
        };
      } else if (value.trim() === 'abc') {
        response = {
          success: false,
          error: 'Invalid input format. Please check your entry.'
        };
      } else {
        response = {
          success: false,
          error: 'No data found for the provided information.'
        };
      }

      if (response.success) {
        setSearchStatus('success');
        showToast('Data retrieved successfully!', 'success');
        console.log(`Search successful for ${searchType}:`, response.data);
        onSearchSuccess?.(response.data as Record<string, unknown>);
      } else {
        setSearchStatus('error');
        showToast(response.error || 'Search failed', 'error');
        console.log(`Search failed for ${searchType}:`, response.error);
      }
    } catch (error) {
      setSearchStatus('error');
      showToast('Search failed. Please try again.', 'error');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const getSearchIcon = () => {
    if (isSearching) {
      return <Loader2 className="w-5 h-5 animate-spin text-white" />;
    }
    
    switch (searchStatus) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-white" />;
      default:
        return <Search className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchStatus('idle'); // Reset status when typing
          }}
          onKeyPress={handleKeyPress}
          disabled={disabled || isSearching}
          className={`w-full py-2 px-3 pr-12 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error 
              ? 'border-red-300 bg-red-50' 
              : searchStatus === 'success'
              ? 'border-green-300 bg-green-50'
              : searchStatus === 'error'
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          } ${
            disabled || isSearching ? 'cursor-not-allowed opacity-60' : ''
          }`}
        />
        
        <button
          type="button"
          onClick={handleSearch}
          disabled={disabled || isSearching || !value.trim()}
          className={`absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center rounded-r-lg transition-all duration-200 text-white ${
            disabled || isSearching || !value.trim()
              ? 'cursor-not-allowed opacity-60 bg-gray-400'
              : 'cursor-pointer bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)]'
          }`}
        >
          {getSearchIcon()}
        </button>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
          <XCircle className="w-4 h-4" />
          {error}
        </p>
      )}
      
      {searchStatus === 'success' && !error && (
        <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
          <CheckCircle className="w-4 h-4" />
          Data retrieved successfully
        </p>
      )}
      
      {searchStatus === 'error' && !error && (
        <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
          <XCircle className="w-4 h-4" />
          Search failed. Please try again.
        </p>
      )}
    </div>
  );
};
