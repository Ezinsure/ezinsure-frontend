'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { DocumentViewer } from '@/components/ui/document-viewer';

interface Application {
  _id: string;
  applicationNumber: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
  status: string;
  invoice?: string;
  insuranceCertificate?: string;
  proofOfPayment?: string;
  paymentInstructions?: string;
  transactionId?: string;
  amount?: number;
  companyCommission?: number;
  agentCommission?: number;
  agentCommissionPaymentStatus?: 'PENDING' | 'PENDING_ADMIN_REVIEW' | 'READY_TO_BE_PAID' | 'PAID' | 'ON_HOLD';
  administrationFees?: string;
  insuranceProvider?: string;
  ebm?: string;
  contract?: string;
  receipt?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  submittedAt: string;
  insuranceEndAt?: string;
  agent?: {
    _id: string;
    fullName: string;
  } | null;
  admin?: {
    _id: string;
    fullName: string;
  } | null;
  client: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    address: string;
    nationalID: string;
    identificationDocumentType: string;
    identificationNumber: string;
    province: string;
    district: string;
    sector: string;
    createdAt: string;
  };
  vehicle?: {
    _id: string;
    clientId: string;
    vehicleType: string;
    vehicleAge: string;
    plateNumber?: string;
    vehicleUse: string;
    otherVehicleUse?: string;
    createdAt: string;
  };
  // Legacy / optional fields
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const AdminCommissionReviewPage = () => {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const showToastRef = useRef(showToast);

  // Keep ref updated with latest showToast (without useEffect to avoid loops)
  showToastRef.current = showToast;

  const [applications, setApplications] = useState<Application[]>([]);
  const [totalCommission, setTotalCommission] = useState<number>(0);
  const [totalApplications, setTotalApplications] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [holdComment, setHoldComment] = useState('');
  const [isPuttingOnHold, setIsPuttingOnHold] = useState(false);
  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const itemsPerPage = 10;

  // Helper to format dates
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Date Error';
    }
  };

  // Fetch applications ready to be paid
  const fetchApplications = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllApplicationsPendingAdminReview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications ready to be paid');
      }

      const data = await response.json();
      const fetched: Application[] = data.data || [];
      console.log('Applications In admin Review: ', data);

      // Sort by submittedAt (newest first)
      const sorted = fetched.slice().sort((a, b) => {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });

      setApplications(sorted);
      // Use values returned by API instead of calculating on the frontend
      setTotalCommission(data.totalAgentCommission || 0);
      setTotalApplications(data.count || fetched.length);
    } catch (error) {
      console.error('Error fetching applications ready to be paid:', error);
      showToastRef.current('Failed to load applications to review for commission payment.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Scroll hint visibility
  useEffect(() => {
    if (!isLoading && applications.length > 0) {
      setShowScrollHint(true);
      const timer = setTimeout(() => setShowScrollHint(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowScrollHint(false);
    }
  }, [isLoading, applications.length]);

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    setShowLeftFade(scrollLeft > 0);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Filter applications (search, status, date range)
  const filteredApplications = applications.filter((app) => {
    const searchableFields: string[] = [];

    const clientName = app.client?.fullName || app.fullName;
    const clientEmail = app.client?.email || app.email;

    if (clientName && clientName.trim()) {
      searchableFields.push(clientName.toLowerCase());
    }
    if (clientEmail && clientEmail.trim()) {
      searchableFields.push(clientEmail.toLowerCase());
    }
    if (app.applicationNumber && app.applicationNumber.trim()) {
      searchableFields.push(app.applicationNumber.toLowerCase());
    }

    const matchesSearch =
      searchQuery === '' ||
      searchableFields.some((field) => field.includes(searchQuery.toLowerCase()));

    const matchesStatus =
      selectedStatus === 'all' ||
      (app.status && app.status.toLowerCase() === selectedStatus);

    const submittedAtDate = new Date(app.submittedAt);
    const matchesStartDate =
      !startDate || submittedAtDate >= new Date(startDate + 'T00:00:00');
    const matchesEndDate =
      !endDate || submittedAtDate <= new Date(endDate + 'T23:59:59');

    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });

  // Pagination
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPaymentStatusBadge = (status?: string) => {
    if (!status) {
      return (
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium flex items-center gap-1 w-fit">
          Unknown
        </span>
      );
    }

    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Paid
          </span>
        );
      case 'READY_TO_BE_PAID':
        return (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Ready to be Paid
          </span>
        );
      case 'PENDING_ADMIN_REVIEW':
        return (
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Pending Admin Review
          </span>
        );
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            Pending
          </span>
        );
      case 'ON_HOLD':
        return (
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            On Hold
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium flex items-center gap-1 w-fit">
            {status}
          </span>
        );
    }
  };


  const getActionButtons = (app: Application) => {
    return (
      <div className="flex space-x-2">
        <Button size="xs" variant="outline">
          Edit
        </Button>
        <Button 
          size="xs"
          onClick={() => setSelectedApp(app)}
        >
          Review
        </Button>
      </div>
    );
  };

  // Handle putting application on hold
  const handlePutOnHold = async () => {
    if (!selectedApp || !holdComment.trim()) {
      showToast('Please provide a comment for putting this application on hold', 'error');
      return;
    }

    setIsPuttingOnHold(true);
    try {
      // Use URLSearchParams for application/x-www-form-urlencoded (as shown in Swagger)
      const formData = new URLSearchParams();
      formData.append('comment', holdComment.trim());

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markAsBlockedAdmin/${selectedApp._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      console.log('Put on hold response status:', response.status);
      console.log('Put on hold response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = 'Failed to put application on hold';
        try {
          // Clone response to read it without consuming the body
          const clonedResponse = response.clone();
          const errorData = await clonedResponse.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error response data:', errorData);
        } catch (parseError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            console.error('Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Could not parse error response:', textError);
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Put on hold response: ', responseData);
      
      // Use the message from API response or fallback to default
      const successMessage = responseData.message || 'Application has been put on hold successfully';
      showToast(successMessage, 'success');
      setSelectedApp(null);
      setHoldComment('');
      // Refetch applications
      await fetchApplications();
    } catch (error) {
      console.error('Error putting application on hold:', error);
      showToast(error instanceof Error ? error.message : 'Failed to put application on hold', 'error');
    } finally {
      setIsPuttingOnHold(false);
    }
  };

  // Handle marking application as ready to be paid
  const handleMarkAsReady = async () => {
    if (!selectedApp) {
      return;
    }

    setIsMarkingReady(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/markAsReadyToBePaid/${selectedApp._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark application as ready to be paid');
      }

      const responseData = await response.json();
      console.log('Mark as ready response: ', responseData);
      
      // Use the message from API response or fallback to default
      const successMessage = responseData.message || 'Application has been marked as ready to be paid successfully';
      showToast(successMessage, 'success');
      setSelectedApp(null);
      setHoldComment('');
      // Refetch applications
      await fetchApplications();
    } catch (error) {
      console.error('Error marking application as ready:', error);
      showToast(error instanceof Error ? error.message : 'Failed to mark application as ready', 'error');
    } finally {
      setIsMarkingReady(false);
    }
  };

  // Get status badge helper (same as in admin/applications)
  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
          Unknown
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
            Pending
          </span>
        );
      case 'application_approved':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
            Approved
          </span>
        );
      case 'waiting_for_user_action':
        return (
          <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium">
            Action Required
          </span>
        );
      case 'invoice_sent':
        return (
          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-medium">
            Invoice Sent
          </span>
        );
      case 'review_payment':
        return (
          <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-medium">
            Payment Review
          </span>
        );
      case 'payment_verified':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
            Payment Verified
          </span>
        );
      case 'insurance_issued':
        return (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
            Insurance Issued
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[10px] font-medium">
            {status}
          </span>
        );
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
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredApplications.length)}
              </span>{' '}
              of <span className="font-medium">{filteredApplications.length}</span> applications
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
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
                  className={
                    currentPage === page
                      ? 'z-10 bg-[var(--main-blue)] border-[var(--main-blue)] text-white'
                      : ''
                  }
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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]" />

        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2">Applications Ready for Commission Review</h1>
          <p className="text-gray-600">
            Review applications from all agents and prepare them for commission payment.
          </p>

          {/* Summary card */}
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Commission (Ready to be Paid)</p>
                <p className="text-2xl font-bold text-[var(--main-blue)]">
                  {totalCommission.toLocaleString()} RWF
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-xl font-semibold text-gray-800">{totalApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Applications
              </label>
              <Input
                label=""
                name="search"
                placeholder="Search by client name, email or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                error={undefined}
              />
            </div>

            {/* Status Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="application_approved">Approved</option>
                <option value="waiting_for_user_action">Action Required</option>
                <option value="invoice_sent">Invoice Sent</option>
                <option value="review_payment">Payment Review</option>
                <option value="payment_verified">Payment Verified</option>
                <option value="insurance_issued">Insurance Issued</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Scroll hint */}
          {!isLoading && showScrollHint && (
            <div className="w-screen py-2 bg-blue-50 border-b border-blue-200 overflow-hidden relative">
              {/* Left gradient fade */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none" />
              {/* Right gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none" />
              {/* Flowing text */}
              <div className="flex items-center justify-center text-sm text-blue-700">
                <span className="animate-flowing-text">
                  Scroll horizontally to view all columns
                </span>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]" />
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="relative">
              {/* Left fade indicator */}
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none" />
              )}

              {/* Right fade indicator */}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none" />
              )}

              <div className="overflow-x-auto" onScroll={handleTableScroll}>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Insurance Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Insurance End Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedApplications.map((app) => (
                      <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                          #{app.applicationNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {app.client?.fullName || app.fullName || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {app.client?.phoneNumber || app.phoneNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {app.insuranceCategory || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {app.insuranceEndAt
                              ? new Date(app.insuranceEndAt).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(app.submittedAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-[var(--accent-orange)]">
                            {app.agentCommission?.toLocaleString() || '0'} RWF
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getPaymentStatusBadge(app.agentCommissionPaymentStatus)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          {getActionButtons(app)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredApplications.length / itemsPerPage)}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Review Application</h3>
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setHoldComment('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">Application ID</p>
                  <p className="font-semibold">#{selectedApp.applicationNumber}</p>
                </div>
                <div>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>
            </div>

            {/* Enhanced Application Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Personal Information */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-semibold">
                    {selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold">
                    {selectedApp.client?.email || selectedApp.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold">
                    {selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-semibold">
                    {selectedApp.client?.dateOfBirth
                      ? new Date(selectedApp.client.dateOfBirth).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-semibold">
                    {selectedApp.client?.address || selectedApp.address || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Province</p>
                  <p className="font-semibold">{selectedApp.client?.province || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">District</p>
                  <p className="font-semibold">{selectedApp.client?.district || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sector</p>
                  <p className="font-semibold">{selectedApp.client?.sector || 'N/A'}</p>
                </div>
              </div>

              {/* Insurance Information */}
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Insurance Category</p>
                  <p className="font-semibold">{selectedApp.insuranceCategory || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Insurance Type</p>
                  <p className="font-semibold">{selectedApp.insuranceType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-semibold">{selectedApp.insuranceDuration || 'N/A'}</p>
                </div>
                {selectedApp.insuranceEndAt && (
                  <div>
                    <p className="text-sm text-gray-500">Insurance End Date</p>
                    <p className="font-semibold">
                      {new Date(selectedApp.insuranceEndAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-semibold">
                    {selectedApp.admin
                      ? `Admin: ${selectedApp.admin.fullName}`
                      : selectedApp.agent
                        ? `Agent: ${selectedApp.agent.fullName}`
                        : 'Client'}
                  </p>
                </div>
                {selectedApp.amount && (
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
                  </div>
                )}
                {selectedApp.insuranceProvider && (
                  <div>
                    <p className="text-sm text-gray-500">Insurance Provider</p>
                    <p className="font-semibold">{selectedApp.insuranceProvider}</p>
                  </div>
                )}
              </div>

              {/* Vehicle Information (if applicable) */}
              {(selectedApp.insuranceCategory === 'Car Insurance' ||
                selectedApp.insuranceCategory === 'MotorBike Insurance') && (
                <div className="space-y-2">
                  {selectedApp.vehicle?.vehicleType && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-semibold">{selectedApp.vehicle.vehicleType}</p>
                    </div>
                  )}
                  {selectedApp.vehicle?.vehicleAge && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Year</p>
                      <p className="font-semibold">{selectedApp.vehicle.vehicleAge}</p>
                    </div>
                  )}
                  {selectedApp.vehicle?.vehicleUse && (
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Use</p>
                      <p className="font-semibold">
                        {selectedApp.vehicle.vehicleUse === 'Other'
                          ? selectedApp.vehicle.otherVehicleUse || 'Other'
                          : selectedApp.vehicle.vehicleUse}
                      </p>
                    </div>
                  )}
                  {selectedApp.vehicle?.plateNumber && (
                    <div>
                      <p className="text-sm text-gray-500">Plate Number</p>
                      <p className="font-semibold">{selectedApp.vehicle.plateNumber}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Commission Information */}
              {(selectedApp.companyCommission || selectedApp.agentCommission) && (
                <div className="space-y-2">
                  {selectedApp.companyCommission && (
                    <div>
                      <p className="text-sm text-gray-500">Company Commission</p>
                      <p className="font-semibold">
                        {selectedApp.companyCommission.toLocaleString()} RWF
                      </p>
                    </div>
                  )}
                  {selectedApp.agent && selectedApp.agentCommission && (
                    <div>
                      <p className="text-sm text-gray-500">Agent Commission</p>
                      <p className="font-semibold">
                        {selectedApp.agentCommission.toLocaleString()} RWF
                      </p>
                    </div>
                  )}
                  {selectedApp.administrationFees && (
                    <div>
                      <p className="text-sm text-gray-500">Administration Fees</p>
                      <p className="font-semibold">{selectedApp.administrationFees} RWF</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4 mt-6">
              <h4 className="font-medium mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() =>
                    setViewingDocument({
                      name: 'National ID / Passport',
                      path: selectedApp.client?.nationalID || '',
                    })
                  }
                >
                  <p className="text-sm font-medium">National ID / Passport</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>

                <button
                  className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                  onClick={() =>
                    setViewingDocument({
                      name: 'Yellow Card',
                      path: selectedApp.yellowCard || '',
                    })
                  }
                >
                  <p className="text-sm font-medium">Yellow Card</p>
                  <p className="text-xs text-gray-500">View Document</p>
                </button>

                {selectedApp.pastInsuranceCertificate && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Past Insurance Certificate',
                        path: selectedApp.pastInsuranceCertificate || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Past Insurance</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.proofOfPayment && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Proof of Payment',
                        path: selectedApp.proofOfPayment || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Proof of Payment</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.invoice && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Quotation / Invoice</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.insuranceCertificate && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Insurance Certificate',
                        path: selectedApp.insuranceCertificate || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Insurance Certificate</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.contract && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Contract',
                        path: selectedApp.contract || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Contract</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.receipt && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'Receipt',
                        path: selectedApp.receipt || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">Receipt</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}

                {selectedApp.ebm && (
                  <button
                    className="bg-white p-3 rounded border text-left hover:bg-gray-50"
                    onClick={() =>
                      setViewingDocument({
                        name: 'EBM',
                        path: selectedApp.ebm || '',
                      })
                    }
                  >
                    <p className="text-sm font-medium">EBM</p>
                    <p className="text-xs text-gray-500">View Document</p>
                  </button>
                )}
              </div>
            </div>

            {/* Invoice & Payment Information */}
            {selectedApp.invoice && (
              <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Invoice & Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApp.amount && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Amount</p>
                      <p className="text-xs text-gray-500">{selectedApp.amount} RWF</p>
                    </div>
                  )}
                  {selectedApp.paymentInstructions && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Payment Instructions</p>
                      <p className="text-xs text-gray-500">{selectedApp.paymentInstructions}</p>
                    </div>
                  )}
                  {selectedApp.transactionId && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Transaction ID</p>
                      <p className="text-xs text-gray-500">{selectedApp.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment field for putting on hold */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment (Required for putting on hold)
              </label>
              <textarea
                value={holdComment}
                onChange={(e) => setHoldComment(e.target.value)}
                placeholder="Enter reason for putting this application on hold..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="text"
                onClick={() => {
                  setSelectedApp(null);
                  setHoldComment('');
                }}
                disabled={isPuttingOnHold || isMarkingReady}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handlePutOnHold}
                disabled={!holdComment.trim() || isPuttingOnHold || isMarkingReady}
              >
                {isPuttingOnHold ? 'Putting on Hold...' : 'Put on Hold'}
              </Button>
              <Button
                onClick={handleMarkAsReady}
                disabled={isPuttingOnHold || isMarkingReady}
              >
                {isMarkingReady ? 'Marking as Ready...' : 'Mark as Ready to be Paid'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document viewer modal */}
      {viewingDocument && (
        <DocumentViewer
          documentName={viewingDocument.name}
          documentPath={viewingDocument.path}
          onClose={() => setViewingDocument(null)}
        />
      )}

      <ToastContainer />
    </MainLayout>
  );
};

export default AdminCommissionReviewPage;


