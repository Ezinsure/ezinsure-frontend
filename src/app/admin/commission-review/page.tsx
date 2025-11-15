'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

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
  // Legacy / optional fields
  fullName?: string;
  email?: string;
  phoneNumber?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const AdminCommissionReviewPage = () => {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ezinsure-backend.onrender.com';
  };

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
  useEffect(() => {
    if (!token) return;

    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${getBaseUrl()}/getAllApplicationsReadyToBePaid`, {
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
      } catch (error) {
        console.error('Error fetching applications ready to be paid:', error);
        showToast('Failed to load applications to review for commission payment.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplications();
  }, [token]);

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

  // Derived data: total commission for these applications
  const totalCommission = applications.reduce((total, app) => {
    return total + (app.agentCommission || 0);
  }, 0);

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

  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[9px] font-medium">
          Unknown
        </span>
      );
    }

    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-medium">
            Pending
          </span>
        );
      case 'application_approved':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-medium">
            Approved
          </span>
        );
      case 'waiting_for_user_action':
        return (
          <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-[9px] font-medium">
            Action Required
          </span>
        );
      case 'invoice_sent':
        return (
          <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[9px] font-medium">
            Invoice Sent
          </span>
        );
      case 'review_payment':
        return (
          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-medium">
            Review Payment
          </span>
        );
      case 'payment_verified':
        return (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-medium">
            Payment Verified
          </span>
        );
      case 'insurance_issued':
        return (
          <span className="px-2 py-1 rounded-full bg-teal-100 text-teal-700 text-[9px] font-medium">
            Insurance Issued
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[9px] font-medium">
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
        <Button size="xs">
          Review
        </Button>
      </div>
    );
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
                <p className="text-xl font-semibold text-gray-800">{applications.length}</p>
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
      <ToastContainer />
    </MainLayout>
  );
};

export default AdminCommissionReviewPage;


