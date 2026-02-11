'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { 
  FileText, 
  Users, 
  Calendar,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
  Car,
  Building,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  DollarSign
} from 'lucide-react';
import { DocumentViewer } from '@/components/ui/document-viewer';

// Helper functions for dates
const getFirstDayOfMonth = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = firstDay.getFullYear();
  const month = String(firstDay.getMonth() + 1).padStart(2, '0');
  const day = String(firstDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Interfaces
interface ExpiringApplication {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  status: string;
  amount?: number;
  companyCommission?: number;
  administrationFees?: number;
  insuranceProvider?: string;
  submittedAt: string;
  insuranceEndAt: string;
  insuranceIssuedAt?: string;
  agent?: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  } | null;
  admin?: {
    _id: string;
    fullName: string;
    email: string;
  } | null;
  client: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
  };
  vehicle?: {
    _id: string;
    vehicleType?: string;
    vehicleAge?: string;
    plateNumber?: string;
    vehicleUse?: string;
    otherVehicleUse?: string;
  } | null;
  deviceInfo?: {
    operatingSystem?: string;
    browser?: string;
    ipAddress?: string;
    userAgent?: string;
    platform?: string;
    timezone?: string;
  } | null;
  locationInfo?: any | null;
  invoice?: string | null;
  insuranceCertificate?: string | null;
  yellowCard?: string | null;
  pastInsuranceCertificate?: string | null;
  proofOfPayment?: string | null;
  transactionId?: string;
  paymentInstructions?: string;
  ebm?: string | null;
  contract?: string | null;
  receipt?: string | null;
  agentCommissionPaymentStatus?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) => {
  const getVisiblePages = () => {
    const maxVisiblePages = 7;
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="bg-white px-4 py-3 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200 gap-3">
      <div className="flex items-center gap-2 text-xs text-gray-700">
        <span>Showing</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>of {totalItems} results</span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          aria-label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        
        <div className="flex gap-1">
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2 py-1 text-xs text-gray-500">...</span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page as number)}
                className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          aria-label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

type SortField = 'applicationNumber' | 'clientName' | 'insuranceEndAt' | 'amount' | 'insuranceCategory';
type SortDirection = 'asc' | 'desc';

export default function ExpiringInsurancePage() {
  const { token, user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  
  // Date range state
  const [startDate, setStartDate] = useState<string>(getTodayDate());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  
  // Data state
  const [applications, setApplications] = useState<ExpiringApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('insuranceEndAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Detail modal state
  const [selectedApplication, setSelectedApplication] = useState<ExpiringApplication | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{ name: string; url: string } | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/getApplicationsWithExpiringInsurance?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.data || []);
    } catch (error) {
      console.error('Error fetching expiring insurance applications:', error);
      showToast('Failed to load expiring insurance applications', 'error');
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, startDate, endDate]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Summary stats
  const summaryStats = useMemo(() => {
    return {
      totalApplications: applications.length,
      totalVehicles: applications.filter(app => app.vehicle).length,
      totalClients: new Set(applications.map(app => app.client._id)).size,
      totalAmount: applications.reduce((sum, app) => sum + (app.amount || 0), 0),
    };
  }, [applications]);

  // Filtered and sorted applications
  const filteredAndSortedApplications = useMemo(() => {
    let filtered = applications.filter(app => {
      const matchesSearch = 
        app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.client.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.client.phoneNumber.includes(searchQuery) ||
        (app.vehicle?.plateNumber && app.vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || app.insuranceCategory === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      const normalizeValue = (value: string | number | undefined): string | number => {
        if (value === undefined || value === null) return '';
        if (typeof value === 'number') return value;
        return String(value).toLowerCase();
      };

      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'applicationNumber':
          aValue = normalizeValue(a.applicationNumber);
          bValue = normalizeValue(b.applicationNumber);
          break;
        case 'clientName':
          aValue = normalizeValue(a.client.fullName);
          bValue = normalizeValue(b.client.fullName);
          break;
        case 'insuranceEndAt':
          aValue = new Date(a.insuranceEndAt).getTime();
          bValue = new Date(b.insuranceEndAt).getTime();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'insuranceCategory':
          aValue = normalizeValue(a.insuranceCategory);
          bValue = normalizeValue(b.insuranceCategory);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [applications, searchQuery, categoryFilter, sortField, sortDirection]);

  // Paginated applications
  const paginatedApplications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedApplications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedApplications, currentPage, itemsPerPage]);

  // Unique categories
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(applications.map(app => app.insuranceCategory))).filter(Boolean);
  }, [applications]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  // Get days until expiration
  const getDaysUntilExpiration = (endDateString: string) => {
    if (!endDateString) return null;
    try {
      const endDate = new Date(endDateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Application Number', 'Client Name', 'Email', 'Phone', 'Vehicle Type', 'Plate Number', 'Insurance Category', 'Insurance End Date', 'Days Until Expiration', 'Amount (RWF)'];
    const rows = filteredAndSortedApplications.map(app => {
      const daysUntil = getDaysUntilExpiration(app.insuranceEndAt);
      return [
        app.applicationNumber,
        app.client.fullName,
        app.client.email,
        app.client.phoneNumber,
        app.vehicle?.vehicleType || 'N/A',
        app.vehicle?.plateNumber || 'N/A',
        app.insuranceCategory,
        formatDate(app.insuranceEndAt),
        daysUntil !== null ? daysUntil.toString() : 'N/A',
        (app.amount || 0).toLocaleString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expiring-insurance-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="absolute top-0 left-0 w-full h-[11vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Expiring Insurance</h1>
                <p className="mt-1 text-xs text-gray-500">
                  Applications with insurance expiring in the selected date range
                </p>
              </div>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs w-full sm:w-auto justify-center sm:justify-start"
                disabled={filteredAndSortedApplications.length === 0}
              >
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              setCurrentPage(1);
            }}
            onEndDateChange={(date) => {
              setEndDate(date);
              setCurrentPage(1);
            }}
            minStartDate={getTodayDate()}
            className="mb-6"
          />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {/* Total Applications Card */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/10 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-1.5">Total Applications</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-12 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalApplications).toLocaleString()
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">Expiring soon</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Total Vehicles Card */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/10 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-1.5">Total Vehicles</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-12 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalVehicles).toLocaleString()
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">Insured vehicles</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Car className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Total Clients Card */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/10 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-1.5">Total Clients</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-12 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalClients).toLocaleString()
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">Unique clients</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <Users className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </div>

            {/* Total Amount Card */}
            <div className="group relative bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl shadow-sm border border-slate-200/50 p-5 hover:shadow-md transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-200/10 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-slate-600 uppercase tracking-wider mb-1.5">Total Amount</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalAmount).toLocaleString() + ' RWF'
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500">Total value</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <DollarSign className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by application number, client name, email, phone, or plate number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-7 h-8 w-full text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 px-2.5"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 sm:flex-none min-w-[150px] px-2.5 py-1 h-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading expiring insurance applications...</p>
              </div>
            ) : filteredAndSortedApplications.length === 0 ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-16 w-16 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-600">No applications found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('applicationNumber')}>
                              <div className="flex items-center gap-2">
                                Application #
                                <SortIcon field="applicationNumber" />
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('clientName')}>
                              <div className="flex items-center gap-2">
                                Client
                                <SortIcon field="clientName" />
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Vehicle Info
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('insuranceCategory')}>
                              <div className="flex items-center gap-2">
                                Category
                                <SortIcon field="insuranceCategory" />
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('insuranceEndAt')}>
                              <div className="flex items-center gap-2">
                                Expires On
                                <SortIcon field="insuranceEndAt" />
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Days Left
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => handleSort('amount')}>
                              <div className="flex items-center gap-2">
                                Amount
                                <SortIcon field="amount" />
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {paginatedApplications.map((app) => {
                            const daysUntil = getDaysUntilExpiration(app.insuranceEndAt);
                            return (
                              <tr key={app._id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{app.applicationNumber}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{app.client.fullName || 'N/A'}</div>
                                  <div className="text-sm text-gray-500">{app.client.email || 'N/A'}</div>
                                  <div className="text-sm text-gray-500">{app.client.phoneNumber || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {app.vehicle ? (
                                    <>
                                      <div className="text-sm text-gray-900">{app.vehicle.vehicleType || 'N/A'}</div>
                                      <div className="text-sm text-gray-500">Plate: {app.vehicle.plateNumber || 'N/A'}</div>
                                    </>
                                  ) : (
                                    <div className="text-sm text-gray-500">N/A</div>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{app.insuranceCategory || 'N/A'}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{formatDate(app.insuranceEndAt)}</div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {daysUntil !== null ? (
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      daysUntil <= 7 
                                        ? 'bg-red-100 text-red-800'
                                        : daysUntil <= 30
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-500">N/A</span>
                                  )}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {(app.amount || 0).toLocaleString()} RWF
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedApplication(app)}
                                    className="flex items-center gap-1.5 h-7 px-2.5 text-xs"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">View Details</span>
                                    <span className="sm:hidden">View</span>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredAndSortedApplications.length / itemsPerPage)}
                  totalItems={filteredAndSortedApplications.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onViewDocument={setViewingDocument}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Document Viewer */}
      {viewingDocument && viewingDocument.url && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.url}
          onClose={() => setViewingDocument(null)}
        />
      )}

      <ToastContainer />
    </MainLayout>
  );
}

// Detail Modal Component
interface ApplicationDetailModalProps {
  application: ExpiringApplication;
  onClose: () => void;
  onViewDocument: (doc: { name: string; url: string }) => void;
  isSuperAdmin: boolean;
}

function ApplicationDetailModal({ application, onClose, onViewDocument, isSuperAdmin }: ApplicationDetailModalProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const getDaysUntilExpiration = (endDateString: string) => {
    if (!endDateString) return null;
    try {
      const endDate = new Date(endDateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return null;
    }
  };

  const daysUntil = getDaysUntilExpiration(application.insuranceEndAt);

  return (
    <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
      <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Application Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Application Header */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">Application Number</p>
              <p className="font-semibold text-lg">{application.applicationNumber}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {daysUntil !== null && (
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  daysUntil <= 7 
                    ? 'bg-red-100 text-red-800'
                    : daysUntil <= 30
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {daysUntil} {daysUntil === 1 ? 'day' : 'days'} until expiration
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Client Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Full Name:</span>
                <span className="ml-2 font-medium">{application.client.fullName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 font-medium">{application.client.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <span className="ml-2 font-medium">{application.client.phoneNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          {application.vehicle && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Vehicle Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Vehicle Type:</span>
                  <span className="ml-2 font-medium">{application.vehicle.vehicleType || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Vehicle Age:</span>
                  <span className="ml-2 font-medium">{application.vehicle.vehicleAge || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Plate Number:</span>
                  <span className="ml-2 font-medium">{application.vehicle.plateNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Vehicle Use:</span>
                  <span className="ml-2 font-medium">{application.vehicle.vehicleUse || 'N/A'}</span>
                </div>
                {application.vehicle.otherVehicleUse && (
                  <div>
                    <span className="text-gray-500">Other Use:</span>
                    <span className="ml-2 font-medium">{application.vehicle.otherVehicleUse}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insurance Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Insurance Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2 font-medium">{application.insuranceCategory || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <span className="ml-2 font-medium">{application.insuranceType || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium">{application.insuranceDuration || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Provider:</span>
                <span className="ml-2 font-medium">{application.insuranceProvider || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Issued At:</span>
                <span className="ml-2 font-medium">{formatDate(application.insuranceIssuedAt || application.submittedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Expires At:</span>
                <span className="ml-2 font-medium text-red-600">{formatDate(application.insuranceEndAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {application.status || 'N/A'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Financial Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className="ml-2 font-medium">{(application.amount || 0).toLocaleString()} RWF</span>
              </div>
              {application.companyCommission && (
                <div>
                  <span className="text-gray-500">Company Commission:</span>
                  <span className="ml-2 font-medium">{application.companyCommission.toLocaleString()} RWF</span>
                </div>
              )}
              {application.administrationFees && (
                <div>
                  <span className="text-gray-500">Administration Fees:</span>
                  <span className="ml-2 font-medium">{application.administrationFees.toLocaleString()} RWF</span>
                </div>
              )}
              {application.transactionId && (
                <div>
                  <span className="text-gray-500">Transaction ID:</span>
                  <span className="ml-2 font-medium">{application.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Agent Information */}
          {application.agent && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Agent Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Full Name:</span>
                  <span className="ml-2 font-medium">{application.agent.fullName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium">{application.agent.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{application.agent.phoneNumber || 'N/A'}</span>
                </div>
                {application.agentCommissionPaymentStatus && (
                  <div>
                    <span className="text-gray-500">Commission Status:</span>
                    <span className="ml-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {application.agentCommissionPaymentStatus}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Information (only for super admin) */}
          {isSuperAdmin && application.admin && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Admin Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Full Name:</span>
                  <span className="ml-2 font-medium">{application.admin.fullName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium">{application.admin.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Device Information (only for super admin) */}
          {isSuperAdmin && application.deviceInfo && (
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Device Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {application.deviceInfo.operatingSystem && (
                  <div>
                    <span className="text-gray-500">Operating System:</span>
                    <span className="ml-2 font-medium">{application.deviceInfo.operatingSystem}</span>
                  </div>
                )}
                {application.deviceInfo.browser && (
                  <div>
                    <span className="text-gray-500">Browser:</span>
                    <span className="ml-2 font-medium">{application.deviceInfo.browser}</span>
                  </div>
                )}
                {application.deviceInfo.platform && (
                  <div>
                    <span className="text-gray-500">Platform:</span>
                    <span className="ml-2 font-medium">{application.deviceInfo.platform}</span>
                  </div>
                )}
                {application.deviceInfo.timezone && (
                  <div>
                    <span className="text-gray-500">Timezone:</span>
                    <span className="ml-2 font-medium">{application.deviceInfo.timezone}</span>
                  </div>
                )}
                {application.deviceInfo.ipAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">IP Address:</span>
                    <span className="ml-2 font-medium break-all">{application.deviceInfo.ipAddress}</span>
                  </div>
                )}
                {application.deviceInfo.userAgent && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">User Agent:</span>
                    <span className="ml-2 font-medium break-all text-xs">{application.deviceInfo.userAgent}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Location Information (only for super admin) */}
          {isSuperAdmin && application.locationInfo && (
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Location Information</h4>
              <div className="text-sm">
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(application.locationInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Documents - Only show if at least one document exists */}
          {(application.insuranceCertificate || 
            application.yellowCard || 
            application.invoice || 
            application.proofOfPayment || 
            application.contract || 
            application.receipt || 
            application.ebm || 
            application.pastInsuranceCertificate) && (
            <div className="space-y-4 md:col-span-2">
              <h4 className="font-semibold text-gray-900 border-b pb-2">Documents</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {application.insuranceCertificate && (
                  <button
                    onClick={() => onViewDocument({ name: 'Insurance Certificate', url: application.insuranceCertificate! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Insurance Certificate
                  </button>
                )}
                {application.yellowCard && (
                  <button
                    onClick={() => onViewDocument({ name: 'Yellow Card', url: application.yellowCard! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Yellow Card
                  </button>
                )}
                {application.invoice && (
                  <button
                    onClick={() => onViewDocument({ name: 'Invoice', url: application.invoice! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Invoice
                  </button>
                )}
                {application.proofOfPayment && (
                  <button
                    onClick={() => onViewDocument({ name: 'Proof of Payment', url: application.proofOfPayment! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Proof of Payment
                  </button>
                )}
                {application.contract && (
                  <button
                    onClick={() => onViewDocument({ name: 'Contract', url: application.contract! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Contract
                  </button>
                )}
                {application.receipt && (
                  <button
                    onClick={() => onViewDocument({ name: 'Receipt', url: application.receipt! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Receipt
                  </button>
                )}
                {application.ebm && (
                  <button
                    onClick={() => onViewDocument({ name: 'EBM', url: application.ebm! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    EBM
                  </button>
                )}
                {application.pastInsuranceCertificate && (
                  <button
                    onClick={() => onViewDocument({ name: 'Past Insurance Certificate', url: application.pastInsuranceCertificate! })}
                    className="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4 inline mr-2" />
                    Past Insurance Certificate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

