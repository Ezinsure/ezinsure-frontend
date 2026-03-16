'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import { 
  MessageSquare, 
  Search, 
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter
} from 'lucide-react';
import { formatDateUTC, formatTime } from '@/utils/date-formatter';

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

// API response item shape
interface RelatedApplication {
  _id: string;
  applicationNumber: string;
}

// Interface for SMS record (matches getSMSReport API)
interface SMSRecord {
  _id: string;
  phone: string;
  message: string;
  requestId: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  type?: string;
  relatedApplication?: RelatedApplication;
  sentAt: string;
}

// API report summary (returned with data)
interface SMSReportSummary {
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: string;
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
          className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>of {totalItems} records</span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronsLeft className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        
        <div className="flex items-center gap-1">
          {getVisiblePages().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`px-2.5 py-1 rounded text-xs border ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : page === '...'
                  ? 'border-transparent cursor-default'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } transition-colors`}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          <ChevronsRight className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

const getStatusBadge = (status: string) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';
  
  switch (status) {
    case 'DELIVERED':
      return (
        <span className={`${baseClasses} bg-green-100 text-green-700`}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Delivered
        </span>
      );
    case 'FAILED':
      return (
        <span className={`${baseClasses} bg-red-100 text-red-700`}>
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </span>
      );
    case 'PENDING':
      return (
        <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </span>
      );
    default:
      return <span className={`${baseClasses} bg-gray-100 text-gray-700`}>{status}</span>;
  }
};

export default function SMSTrackingPage() {
  const { ToastContainer, showToast } = useToast();
  const { token } = useAuth();
  const [smsRecords, setSmsRecords] = useState<SMSRecord[]>([]);
  const [reportSummary, setReportSummary] = useState<SMSReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const { apiFetch } = useApiClient();

  // Fetch SMS records from API
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);

    const query = new URLSearchParams({
      startDate,
      endDate,
    }).toString();

    (async () => {
      try {
        const res = await apiFetch(`/getSMSReport?${query}`, {
          signal: controller.signal,
          method: 'GET',
        });

        const json = await res.json();
        const data: SMSRecord[] = Array.isArray(json?.data) ? json.data : [];
        setSmsRecords(data);
        setReportSummary({
          totalMessages:
            typeof json.totalMessages === 'number' ? json.totalMessages : data.length,
          delivered:
            typeof json.delivered === 'number'
              ? json.delivered
              : data.filter((r: SMSRecord) => r.status === 'DELIVERED').length,
          failed:
            typeof json.failed === 'number'
              ? json.failed
              : data.filter((r: SMSRecord) => r.status === 'FAILED').length,
          pending:
            typeof json.pending === 'number'
              ? json.pending
              : data.filter((r: SMSRecord) => r.status === 'PENDING').length,
          deliveryRate:
            typeof json.deliveryRate === 'string'
              ? json.deliveryRate
              : typeof json.deliveryRate === 'number'
              ? String(json.deliveryRate)
              : data.length > 0
              ? (
                  (data.filter((r: SMSRecord) => r.status === 'DELIVERED').length /
                    data.length) *
                  100
                ).toFixed(2)
              : '0',
        });
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        showToast(
          err instanceof Error ? err.message : 'Failed to load SMS report',
          'error',
        );
        setSmsRecords([]);
        setReportSummary(null);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, startDate, endDate]);

  // Filter SMS records
  const filteredRecords = useMemo(() => {
    return smsRecords.filter(record => {
      // Search filter
      const matchesSearch = !searchTerm || 
        record.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.relatedApplication?.applicationNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.type ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
      
      // Date range filter
      const matchesDateRange = (() => {
        if (!startDate && !endDate) return true;
        
        const sentDate = new Date(record.sentAt);
        const sentDateOnly = new Date(sentDate.getFullYear(), sentDate.getMonth(), sentDate.getDate());
        
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;
        
        if (start && end) {
          return sentDateOnly >= start && sentDateOnly <= end;
        } else if (start) {
          return sentDateOnly >= start;
        } else if (end) {
          return sentDateOnly <= end;
        }
        return true;
      })();
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [smsRecords, searchTerm, selectedStatus, startDate, endDate]);

  // Paginate filtered records
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRecords.slice(startIndex, endIndex);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  // Statistics: use API report summary when available (for selected date range), else compute from filtered data
  const stats = useMemo(() => {
    if (reportSummary) {
      return {
        total: reportSummary.totalMessages,
        delivered: reportSummary.delivered,
        pending: reportSummary.pending,
        failed: reportSummary.failed,
        deliveryRate: reportSummary.deliveryRate,
      };
    }
    const total = filteredRecords.length;
    const delivered = filteredRecords.filter(r => r.status === 'DELIVERED').length;
    const pending = filteredRecords.filter(r => r.status === 'PENDING').length;
    const failed = filteredRecords.filter(r => r.status === 'FAILED').length;
    const deliveryRate = total > 0 ? ((delivered / total) * 100).toFixed(2) : '0';
    return { total, delivered, pending, failed, deliveryRate };
  }, [reportSummary, filteredRecords]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, startDate, endDate]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">SMS Tracking</h1>
                <p className="text-sm text-gray-500">Monitor insurance expiration reminder SMS delivery status</p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total SMS</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivered</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Failed</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Delivery Rate</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.deliveryRate}%</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-medium text-gray-700">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by phone, message, request ID, or application..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 tracking-wide mb-1 uppercase">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-2 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedStatus !== 'all' || startDate || endDate) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Search: {searchTerm}
                  </span>
                )}
                {selectedStatus !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Status: {selectedStatus}
                  </span>
                )}
                {(startDate || endDate) && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Date: {startDate || 'beginning'} - {endDate || 'now'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SMS Records Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Application</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Request ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sent At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivered At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          <span className="ml-2">Loading SMS records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                        No SMS records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            {record.phone}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                          <div className="truncate" title={record.message}>
                            {record.message}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {record.type ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                          {record.relatedApplication?.applicationNumber ?? '–'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                          {record.requestId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span>{formatDateUTC(record.sentAt)}</span>
                            <span className="text-xs text-gray-400">{formatTime(record.sentAt)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className="text-gray-400">–</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && filteredRecords.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRecords.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(items) => {
                  setItemsPerPage(items);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      </div>
      <ToastContainer />
    </MainLayout>
  );
}

