'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Loader2, TriangleAlert } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

interface SearchInputProps {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSearchSuccess?: (data: Record<string, unknown>) => void;
  onSearchResult?: (exists: boolean, searchType: 'plateNumber' | 'identificationNumber') => void;
  searchType: 'plateNumber' | 'identificationNumber';
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
  onSearchResult,
  searchType,
  error,
  required = false,
  disabled = false,
  resetTrigger = 0,
}: SearchInputProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'success' | 'error' | 'unknown'>('idle');
  const [searchMessage, setSearchMessage] = useState<string>('');
  const { showToast } = useToast();

  // Reset search status when resetTrigger changes
  useEffect(() => {
    setSearchStatus('idle');
    setSearchMessage('');
    setIsSearching(false);
  }, [resetTrigger]);

  const handleSearch = async () => {
    if (!value.trim()) {
      showToast('Please enter a value to search', 'error');
      return;
    }

    setIsSearching(true);
    setSearchStatus('idle');
    setSearchMessage('');

    try {
      // Determine the API endpoint based on search type
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }

      let apiUrl: string;
      let queryParam: string;

      if (searchType === 'identificationNumber') {
        // For identification number search
        apiUrl = `${baseUrl}/getIdNumber`;
        queryParam = 'identificationNumber';
      } else {
        // For plate number search
        apiUrl = `${baseUrl}/getPlateNumber`;
        queryParam = 'plateNumber';
      }

      // Make API call
      const response = await fetch(`${apiUrl}?${queryParam}=${encodeURIComponent(value.trim())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (response.ok && responseData.exists) {
        // Success case - data found
        setSearchStatus('success');
        setSearchMessage('Data retrieved successfully!');
        showToast('Data retrieved successfully!', 'success');
        
        // Transform the API response to match expected format
        const transformedData = transformApiResponse(responseData.data, searchType);
        console.log(`Search successful for ${searchType}:`, transformedData);
        onSearchSuccess?.(transformedData);
        
        // Notify parent component about the search result
        onSearchResult?.(true, searchType);
      } else if (response.status === 404 && !responseData.exists) {
        // Not found case - valid format but no data
        setSearchStatus('unknown');
        const friendlyMessage = searchType === 'identificationNumber' 
          ? 'No client found with this identification number. This will be saved as a new entry.'
          : 'No vehicle found with this plate number. This will be saved as a new entry.';
        setSearchMessage(friendlyMessage);
        showToast(friendlyMessage, 'info');
        console.log(`New entry for ${searchType}:`, responseData.message);
        
        // Notify parent component about the search result
        onSearchResult?.(false, searchType);
      } else {
        // Error case - invalid format or server error
        setSearchStatus('error');
        const errorMessage = responseData.message || 'Invalid input format. Please check your entry.';
        setSearchMessage(errorMessage);
        showToast(errorMessage, 'error');
        console.log(`Search error for ${searchType}:`, errorMessage);
        
        // Notify parent component about the search result (treat as new entry for error cases)
        onSearchResult?.(false, searchType);
      }
    } catch (error) {
      setSearchStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Search failed. Please try again.';
      setSearchMessage(errorMessage);
      showToast(errorMessage, 'error');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Transform API response to match expected format for form prefilling
  const transformApiResponse = (data: Record<string, unknown>, type: 'identificationNumber' | 'plateNumber') => {
    if (type === 'identificationNumber') {
      // Transform identification number response
      return {
        fullName: data.fullName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        dateOfBirth: data.dateOfBirth && typeof data.dateOfBirth === 'string' ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
        province: data.province || '',
        district: data.district || '',
        sector: data.sector || '',
        clientId: data.clientId || '',
      };
    } else {
      // Transform plate number response
      return {
        fullName: (data.client as Record<string, unknown>)?.fullName as string || '',
        email: (data.client as Record<string, unknown>)?.email as string || '',
        phoneNumber: (data.client as Record<string, unknown>)?.phoneNumber as string || '',
        vehicleId: data.vehicleId || '',
        plateNumber: data.plateNumber || '',
        vehicleType: data.vehicleType || '',
        vehicleAge: data.vehicleAge || '',
        vehicleUse: data.vehicleUse || '',
        otherVehicleUse: data.otherVehicleUse || '',
        clientId: (data.client as Record<string, unknown>)?.clientId as string || '',
      };
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
      case 'unknown':
        return <TriangleAlert className="w-5 h-5 text-white" />;
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
            setSearchMessage(''); // Clear message when typing
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
              : searchStatus === 'unknown'
              ? 'border-blue-300 bg-blue-50'
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
        <div className="text-base text-red-600 flex items-start gap-2 mt-1">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
      
      {searchStatus === 'success' && !error && (
        <div className="text-base text-green-600 flex items-start gap-2 mt-1">
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{searchMessage}</span>
        </div>
      )}
      
      {searchStatus === 'error' && !error && (
        <div className="text-base text-red-600 flex items-start gap-2 mt-1">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{searchMessage}</span>
        </div>
      )}
      
      {searchStatus === 'unknown' && !error && (
        <div className="text-base text-blue-600 flex items-start gap-2 mt-1">
          <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{searchMessage}</span>
        </div>
      )}
    </div>
  );
};
