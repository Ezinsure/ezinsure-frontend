'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

// Application statuses
enum ApplicationStatus {
  PENDING = 'pending',
  APPLICATION_APPROVED = 'application_approved',
  WAITING_FOR_USER_ACTION = 'waiting_for_user_action',
  INVOICE_SENT = 'invoice_sent',
  REVIEW_PAYMENT = 'review_payment',
  PAYMENT_VERIFIED = 'payment_verified',
  INSURANCE_ISSUED = 'insurance_issued'
}

interface Application {
  _id: string;
  applicationNumber: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  isCOMESA?: boolean;
  vehicleUse?: string;
  otherVehicleUse?: string;
  insuranceProvider?: string;
  status: string;
  nationalID: string;
  yellowCard: string;
  pastInsuranceCertificate?: string;
  submittedAt: string;
  proofOfPayment?: string;
  insuranceCertificate?: string;
  invoiceId?: string;
  invoice?: string;
  invoiceAmount?: string;
  transactionId?: string;
  rejectionReason?: string;
  amount?: number;
  paymentInstructions?: string;
  companyCommission?: number;
  agentCommission?: number;
  agentId?: string;
  agentFullName?: string;
  agent?: {
    _id: string;
    fullName: string;
  };
  reasonForPaymentRejection?: string;
  vehicleType?: string;
  vehicleAge?: string;
  province?: string;
  district?: string;
  sector?: string;
  contract?: string;
  receipt?: string;
  ebm?: string;
  createdAt?: string;
  insuranceEndAt?: string;
  otp?: string;
  otpExpires?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminMyApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Helper functions for date filtering
  const getFirstDayOfMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Set default date range to current month
  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
  }, []);

  // Fetch applications from API
  const fetchApplications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/applications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      
      const data = await response.json();
      
      // Sort applications by submittedAt in descending order (newest first)
      const sortedApplications = data.data.sort((a: Application, b: Application) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setApplications(sortedApplications);
    } catch {
      showToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token]);

  // Filter applications based on search query, status, and date range
  const filteredApplications = applications.filter(app => {
    // Only search fields that have meaningful data
    const searchableFields = [];
    
    if (app.fullName && app.fullName.trim()) {
      searchableFields.push(app.fullName.toLowerCase());
    }
    if (app.email && app.email.trim()) {
      searchableFields.push(app.email.toLowerCase());
    }
    if (app.applicationNumber && app.applicationNumber.trim()) {
      searchableFields.push(app.applicationNumber.toLowerCase());
    }
    
    const matchesSearch = searchQuery === '' || searchableFields.some(field => 
      field.includes(searchQuery.toLowerCase())
    );
    
    const matchesStatus = selectedStatus === 'all' || (app.status && app.status.toLowerCase() === selectedStatus);
    
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      
      if (!app.submittedAt) return false; // Skip applications without submission date
      
      // Normalize dates to remove time components for accurate date comparison
      const appDate = new Date(app.submittedAt);
      const appDateOnly = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59') : null; // Set to end of day
      
      if (start && end) {
        return appDateOnly >= start && appDateOnly <= end;
      } else if (start) {
        return appDateOnly >= start;
      } else if (end) {
        return appDateOnly <= end;
      }
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'search':
        setSearchQuery(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      case 'startDate':
        setStartDate(value);
        break;
      case 'endDate':
        setEndDate(value);
        break;
    }
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
    setCurrentPage(1);
  };

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Unknown</span>;
    }
    
    switch (status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">Pending</span>;
      case ApplicationStatus.APPLICATION_APPROVED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">Application Approved</span>;
      case ApplicationStatus.WAITING_FOR_USER_ACTION:
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">Waiting for User Action</span>;
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">Invoice Sent</span>;
      case ApplicationStatus.REVIEW_PAYMENT:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">Review Payment</span>;
      case ApplicationStatus.PAYMENT_VERIFIED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">Payment Verified</span>;
      case ApplicationStatus.INSURANCE_ISSUED:
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">Insurance Issued</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-medium">Unknown</span>;
    }
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 p-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * 10, filteredApplications.length)}</span> of{' '}
              <span className="font-medium">{filteredApplications.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px " aria-label="Pagination">
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <span className="sr-only">First</span>
                «
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous</span>
                ‹
              </Button>
              
              {startPage > 1 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              {pages.map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'text'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className={currentPage === page ? 'z-10 bg-[var(--main-blue)] border-[var(--main-blue)] text-white' : ''}
                >
                  {page}
                </Button>
              ))}
              
              {endPage < totalPages && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>
                ›
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-r-md"
              >
                <span className="sr-only">Last</span>
                »
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2 fade-in">My Applications</h1>
          <p className="text-gray-600 slide-up">View and manage all applications</p>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm slide-in-right">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Applications</label>
              <Input
                label=""
                name="search"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            
            {/* Status Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm bg-white"
              >
                <option value="all">All Statuses</option>
                <option value={ApplicationStatus.PENDING}>Pending</option>
                <option value={ApplicationStatus.APPLICATION_APPROVED}>Application Approved</option>
                <option value={ApplicationStatus.WAITING_FOR_USER_ACTION}>Waiting for User Action</option>
                <option value={ApplicationStatus.INVOICE_SENT}>Invoice Sent</option>
                <option value={ApplicationStatus.REVIEW_PAYMENT}>Review Payment</option>
                <option value={ApplicationStatus.PAYMENT_VERIFIED}>Payment Verified</option>
                <option value={ApplicationStatus.INSURANCE_ISSUED}>Insurance Issued</option>
              </select>
            </div>
            
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm bg-white"
              />
            </div>
            
            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm bg-white"
              />
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-sm text-gray-500">
              {searchQuery && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">Search: {searchQuery}</span>}
              {selectedStatus !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">Status: {(selectedStatus || '').replace('_', ' ')}</span>}
              {(startDate || endDate) && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Date Range: {startDate || 'beginning'} - {endDate || 'now'}</span>}
            </div>
            <div className="flex gap-2">
              <Button
                variant="text"
                size="sm"
                onClick={handleClearFilters}
                className="text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 px-4"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{filteredApplications.length}</span> of <span className="font-medium">{applications.length}</span> applications
              {selectedStatus !== 'all' && (
                <span> with status: <span className="font-medium capitalize">{(selectedStatus || '').replace('_', ' ')}</span></span>
              )}
              {(startDate || endDate) && (
                <span> from <span className="font-medium">{startDate || 'beginning'}</span> to <span className="font-medium">{endDate || 'now'}</span></span>
              )}
            </div>
            {filteredApplications.length > 0 && (
              <div className="text-sm text-gray-500">
                Page {currentPage} of {Math.ceil(filteredApplications.length / itemsPerPage)}
              </div>
            )}
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
              {(searchQuery || selectedStatus !== 'all' || startDate || endDate) && (
                <p className="mt-2 text-sm text-gray-500">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
               <thead className="bg-gray-50">
  <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Client</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Agent</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Company Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Agent Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
  </tr>
</thead>
                <tbody className="divide-y divide-gray-200">
                 {paginatedApplications.map((app, index) => (
  <tr key={app._id} className="hover:bg-gray-50 transition-colors ">
    <td className="px-4 py-4 text-sm whitespace-nowrap font-medium text-[var(--main-blue)]">
      #{(currentPage - 1) * itemsPerPage + index + 1}
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="flex items-center">
        <div>
          <div className="text-sm font-medium text-gray-900">{app.fullName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{app.email || 'N/A'}</div>
        </div>
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900 capitalize">{app.insuranceCategory || 'N/A'}</div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.insuranceEndAt ? new Date(app.insuranceEndAt).toLocaleDateString() : 'N/A'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.agent ? (
          <>
            <div className="font-medium text-[var(--main-blue)]">Agent</div>
            <div className="text-gray-600">{app.agent.fullName}</div>
          </>
        ) : (
          <div className="font-medium text-gray-700">Client</div>
        )}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      <div className="text-sm text-gray-900">
        {app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-sm whitespace-nowrap text-gray-500">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}</td>
    <td className="px-4 py-4 text-sm whitespace-nowrap">
      {getStatusBadge(app.status)}
    </td>
  </tr>
))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredApplications.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
    </MainLayout>
  );
}
