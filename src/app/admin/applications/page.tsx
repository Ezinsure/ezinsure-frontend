'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
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
  administrationFees?: string;
  insuranceProvider?: string;
  ebm?: string;
  contract?: string;
  receipt?: string;
  submittedAt: string;
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
  // Legacy fields for backward compatibility
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  nationalID?: string;
  yellowCard?: string;
  pastInsuranceCertificate?: string;
  invoiceId?: string;
  invoiceAmount?: string;
  rejectionReason?: string;
  agentId?: string;
  agentFullName?: string;
  reasonForPaymentRejection?: string;
  vehicleType?: string;
  vehicleAge?: string;
  province?: string;
  district?: string;
  sector?: string;
  createdAt?: string;
  insuranceEndAt?: string;
  otp?: string;
  otpExpires?: string;
  isCOMESA?: boolean;
  vehicleUse?: string;
  otherVehicleUse?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ManageApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ebmFile, setEbmFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
const [isRejecting, setIsRejecting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [agentCommission, setAgentCommission] = useState('');
  const [companyCommission, setCompanyCommission] = useState('');
  const [administrationFees, setAdministrationFees] = useState('');
  const [activeModal, setActiveModal] = useState<'details' | 'review' | 'invoice' | 'verify' | 'issue' | null>(null);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);
  const [showScrollHint, setShowScrollHint] = useState(true);
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

  // Calculate administration fees based on insurance category
  const calculateAdministrationFees = (insuranceCategory: string) => {
    if (insuranceCategory.toLowerCase().includes('moto')) {
      return Math.round(2500 * 0.25); // 25% of 2500 for MOTO
    } else {
      return Math.round(5000 * 0.25); // 25% of 5000 for all other applications
    }
  };

  // Set default date range to current month
  useEffect(() => {
    setStartDate(getFirstDayOfMonth());
    setEndDate(getCurrentDate());
  }, []);

  // Auto-calculate administration fees when selectedApp changes
  useEffect(() => {
    if (selectedApp && selectedApp.insuranceCategory) {
      const calculatedFees = calculateAdministrationFees(selectedApp.insuranceCategory);
      setAdministrationFees(calculatedFees.toString());
    }
  }, [selectedApp]);


  // Console log form state changes
  useEffect(() => {
    const formState = {
      invoiceAmount,
      agentCommission,
      companyCommission,
      administrationFees,
      invoiceMessage,
      selectedApp: selectedApp ? {
        id: selectedApp._id,
        name: selectedApp.fullName,
        category: selectedApp.insuranceCategory
      } : null
    };
    console.log('Invoice Form State Changed:', formState);
  }, [invoiceAmount, agentCommission, companyCommission, administrationFees, invoiceMessage, selectedApp]);

  // Handle table scroll to show/hide fade indicators
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
    
    // Show left fade if scrolled past the beginning
    setShowLeftFade(scrollLeft > 0);
    
    // Show right fade if there's more content to scroll
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1);
  };

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
      console.log("Applications: ", data);
      
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
    
    // Search in client object (new structure) or legacy fields
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

  // Start animation immediately when table is shown (regardless of data)
  useEffect(() => {
    if (!isLoading) {
      // Start animation immediately when table is shown
      setShowScrollHint(true);
      
      // Hide after animation completes (40 seconds)
      const timer = setTimeout(() => {
        setShowScrollHint(false);
      }, 40000); // 40 seconds total single flow

      return () => clearTimeout(timer);
    } else {
      // Hide during loading
      setShowScrollHint(false);
    }
  }, [isLoading]);



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

  // Send invoice to client
 const handleSendInvoice = async () => {
  const hasAgent = selectedApp?.agent !== null && selectedApp?.agent !== undefined;
  const requiredFields = [!selectedApp, !invoiceMessage, !invoiceAmount, !companyCommission, !administrationFees];
  
  // Only require agent commission if there's an agent
  if (hasAgent) {
    requiredFields.push(!agentCommission);
  }
  
  if (requiredFields.some(field => field)) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  setIsProcessing(true);
  try {
    const formData = new FormData();
    formData.append('paymentInstructions', invoiceMessage);
    formData.append('amount', invoiceAmount);
    formData.append('companyCommission', companyCommission);
    formData.append('administrationFees', administrationFees);
    
    // Only include agent commission if there's an agent
    if (hasAgent) {
      formData.append('agentCommission', agentCommission);
    }
    
    if (invoiceFile) {
      formData.append('invoice', invoiceFile);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendInvoice/${selectedApp!._id}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send invoice');
    }

    showToast(`Invoice sent to ${selectedApp?.client?.fullName || selectedApp?.fullName || 'client'}`, 'success');
    setInvoiceMessage('');
    setInvoiceAmount('');
    setAgentCommission('');
    setCompanyCommission('');
    setAdministrationFees('');
    setInvoiceFile(null);
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error sending invoice:', error);
    showToast(error instanceof Error ? error.message : 'Failed to send invoice', 'error');
  } finally {
    setIsProcessing(false);
  }
};

  // Verify client payment
// Replace the existing handleVerifyPayment function with this:
const handleVerifyPayment = async (action: 'approve' | 'reject') => {
  if (!selectedApp) return;
  
  setIsProcessing(true);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/verifyPayment/${selectedApp._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          ...(action === 'reject' && { reasonForPaymentRejection: rejectionComment })
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to verify payment');
    }

    showToast(
      action === 'approve' 
        ? `Payment from ${selectedApp.client?.fullName || selectedApp.fullName} verified` 
        : `Payment from ${selectedApp.client?.fullName || selectedApp.fullName} rejected`,
      action === 'approve' ? 'success' : 'error'
    );
    setRejectionComment('');
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error verifying payment:', error);
    showToast(error instanceof Error ? error.message : 'Failed to verify payment', 'error');
  } finally {
    setIsProcessing(false);
  }
};

  // Reject application or payment
const handleReject = async (action: 'application' | 'payment') => {
  if (!selectedApp || !rejectionComment) {
    showToast('Please enter rejection reason', 'error');
    return;
  }
  
  setIsRejecting(true);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendApplicationForAction/${selectedApp._id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: rejectionComment,
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to reject');
    }

    showToast(
      action === 'application' 
        ? `Application from ${selectedApp.client?.fullName || selectedApp.fullName} rejected` 
        : `Payment from ${selectedApp.client?.fullName || selectedApp.fullName} rejected`, 
      'error'
    );
    setRejectionComment('');
    setSelectedApp(null);
    setActiveModal(null);
    // Refetch applications to get updated status
    await fetchApplications();
  } catch (error) {
    console.error('Error rejecting:', error);
    showToast(error instanceof Error ? error.message : 'Failed to reject', 'error');
  } finally {
    setIsRejecting(false);
  }
};

  // Issue insurance to client
  const handleIssueInsurance = async () => {
    if (!selectedApp || !insuranceFile) {
      showToast('Please upload insurance certificate', 'error');
      return;
    }
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('insuranceCertificate', insuranceFile);
      if (contractFile) formData.append('contract', contractFile);
      if (receiptFile) formData.append('receipt', receiptFile);
      if (ebmFile) formData.append('ebm', ebmFile);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/issueInsurance/${selectedApp._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to issue insurance');
      }

      showToast(`Insurance issued to ${selectedApp.client?.fullName || selectedApp.fullName}`, 'success');
      setInsuranceFile(null);
      setContractFile(null);
      setReceiptFile(null);
      setEbmFile(null);
      setSelectedApp(null);
      setActiveModal(null);
      // Refetch applications to get updated status
      await fetchApplications();
    } catch (error) {
      console.error('Error issuing insurance:', error);
      showToast(error instanceof Error ? error.message : 'Failed to issue insurance', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Approve application
const handleApproveApplication = async () => {
  if (!selectedApp) return;
  
  try {
    setIsApproving(true);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/approveApplication/${selectedApp._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to approve application');
    }
    
    showToast('Application approved successfully', 'success');
    setActiveModal(null);
    setSelectedApp(null);
    fetchApplications();
  } catch (error) {
    console.error('Error approving application:', error);
    showToast('Failed to approve application', 'error');
  } finally {
    setIsApproving(false);
  }
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

  // Get action buttons based on application status
const getActionButtons = (app: Application) => {
  return (
    <div className="flex space-x-2">
      {/* Always show View Details button */}
      <Button 
        size="sm" 
        variant="text"
        onClick={() => {
          setSelectedApp(app);
          setActiveModal('details');
        }}
      >
        View Details
      </Button>

      {/* Show status-specific buttons */}
      {app.status && app.status.toLowerCase() === ApplicationStatus.PENDING && (
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('review');
          }}
        >
          Review
        </Button>
      )}
      
      {app.status && app.status.toLowerCase() === ApplicationStatus.APPLICATION_APPROVED && (
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('invoice');
            setInvoiceMessage(`Please make your payment to one of the following:\nBank of Kigali: 100000129075 (SONARWA)\nOr via Momo Account: 051499 (SONARWA) \nOr Agency at Kimihurura (KBC) under SOLEKTRA`);
          }}
        >
          Send Invoice
        </Button>
      )}
      
      {app.status && app.status.toLowerCase() === ApplicationStatus.REVIEW_PAYMENT && (
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('verify');
          }}
        >
          Verify Payment
        </Button>
      )}
      
      {app.status && app.status.toLowerCase() === ApplicationStatus.PAYMENT_VERIFIED && (
        <Button 
          size="sm" 
          onClick={() => {
            setSelectedApp(app);
            setActiveModal('issue');
          }}
        >
          Issue Insurance
        </Button>
      )}
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

  // PDF Download Function
  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = await import('jspdf-autotable');
      
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      
                // Add title
          doc.setFontSize(20);
          doc.setTextColor(10, 37, 64); // Dark blue color
          doc.text('Ezinsure Applications Report', 14, 20);
      
      // Add subtitle with date and time
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 14, 30);
      
      // Add filter information
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      let filterY = 40;
      
      if (searchQuery) {
        doc.text(`Search Query: ${searchQuery}`, 14, filterY);
        filterY += 6;
      }
      
      if (selectedStatus !== 'all') {
        doc.text(`Status Filter: ${(selectedStatus || '').replace('_', ' ')}`, 14, filterY);
        filterY += 6;
      }
      
      if (startDate || endDate) {
        doc.text(`Date Range: ${startDate || 'beginning'} to ${endDate || 'now'}`, 14, filterY);
        filterY += 6;
      }
      
      // Add summary information
      filterY += 3;
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(`Total Applications: ${filteredApplications.length}`, 14, filterY);
      filterY += 5;
      
      // Calculate totals
      const totalAmount = filteredApplications.reduce((sum, app) => sum + (app.amount || 0), 0);
      const totalCompanyCommission = filteredApplications.reduce((sum, app) => sum + (app.companyCommission || 0), 0);
      const totalAgentCommission = filteredApplications.reduce((sum, app) => sum + (app.agentCommission || 0), 0);
      
      doc.text(`Total Amount: ${totalAmount.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Company Commission: ${totalCompanyCommission.toLocaleString()} RWF`, 14, filterY);
      filterY += 5;
      doc.text(`Total Agent Commission: ${totalAgentCommission.toLocaleString()} RWF`, 14, filterY);
      
      // Helper function to format dates for PDF
      const formatDateForPDF = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        
        try {
          const date = new Date(dateString);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          
          // Format as DD/MM/YYYY for PDF readability
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return 'Date Error';
        }
      };
      
      // Prepare table data with text truncation for better fit
      const tableData = filteredApplications.map((app, index) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const createdBy = app.admin ? `Admin: ${app.admin.fullName}` : 
                         app.agent ? `Agent: ${app.agent.fullName}` : 'Client';
        
        const row = [
          (index + 1).toString(),
          clientName.length > 28 ? clientName.substring(0, 28) + '...' : clientName,
          clientEmail.length > 32 ? clientEmail.substring(0, 32) + '...' : clientEmail,
          (app.insuranceCategory || '').length > 22 ? (app.insuranceCategory || '').substring(0, 22) + '...' : (app.insuranceCategory || ''),
          formatDateForPDF(app.insuranceEndAt),
          createdBy.length > 22 ? createdBy.substring(0, 22) + '...' : createdBy,
          app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF',
          app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF',
          app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF',
          formatDateForPDF(app.submittedAt),
          (app.status || '').replace('_', ' ').toUpperCase()
        ];
        
        return row;
      });
      
      // Add table
      autoTable.default(doc, {
        head: [
          ['#', 'Client Name', 'Email', 'Category', 'End Date', 'Performed By', 'Amount', 'Company Comm.', 'Agent Comm.', 'Date', 'Status']
        ],
        body: tableData,
        startY: filterY + 10,
        styles: {
          fontSize: 7,
          cellPadding: 1,
          overflow: 'linebreak',
          font: 'helvetica',
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          fillColor: false,
          halign: 'left',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [51, 122, 183], // Lighter blue header
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' }, // #
          1: { cellWidth: 30, halign: 'left' }, // Name
          2: { cellWidth: 35, halign: 'left' }, // Email
          3: { cellWidth: 25, halign: 'left' }, // Category
          4: { cellWidth: 25, halign: 'left' }, // End Date
          5: { cellWidth: 25, halign: 'left' }, // Performed By
          6: { cellWidth: 25, halign: 'right' }, // Amount
          7: { cellWidth: 25, halign: 'right' }, // Company Comm
          8: { cellWidth: 25, halign: 'right' }, // Agent Comm
          9: { cellWidth: 25, halign: 'center' }, // Date
          10: { cellWidth: 25, halign: 'center' }, // Status
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { top: 10, right: 8, bottom: 10, left: 8 },
        pageBreak: 'auto',
        showFoot: 'lastPage',
        didDrawPage: function (data) {
          // Add page numbers
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10);
        },
      });
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `insurance_applications_${dateStr}_${timeStr}.pdf`;
      
      // Save the PDF
      doc.save(filename);
      
      showToast('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  };

  // Excel Download Function
  const handleDownloadExcel = () => {
    try {
      // Helper function to format dates for Excel
      const formatDateForExcel = (dateString: string | undefined) => {
        if (!dateString) return 'N/A';
        
        try {
          const date = new Date(dateString);
          // Check if date is valid
          if (isNaN(date.getTime())) {
            return 'Invalid Date';
          }
          
          // Format as YYYY-MM-DD for Excel compatibility
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch {
          return 'Date Error';
        }
      };

      // Prepare headers
      const headers = [
        'Client Name', 'Email', 'Phone', 'Insurance Category', 'Insurance Type', 
        'Duration', 'Insurance End Date', 'Performed By', 'Amount (RWF)', 'Company Commission (RWF)', 
        'Agent Commission (RWF)', 'Date', 'Status', 'Address', 'Province', 'District', 'Sector'
      ];
      
      // Prepare data rows
      const csvData = filteredApplications.map((app) => {
        const clientName = app.client?.fullName || app.fullName || '';
        const clientEmail = app.client?.email || app.email || '';
        const clientPhone = app.client?.phoneNumber || app.phoneNumber || '';
        const clientAddress = app.client?.address || app.address || '';
        const clientProvince = app.client?.province || app.province || '';
        const clientDistrict = app.client?.district || app.district || '';
        const clientSector = app.client?.sector || app.sector || '';
        const createdBy = app.admin ? `Admin: ${app.admin.fullName}` : 
                         app.agent ? `Agent: ${app.agent.fullName}` : 'Client';
        
        const row = [
          clientName,
          clientEmail,
          clientPhone,
          app.insuranceCategory || '',
          app.insuranceType || '',
          app.insuranceDuration || '',
          formatDateForExcel(app.insuranceEndAt),
          createdBy,
          app.amount ? app.amount.toString() : '0',
          app.companyCommission ? app.companyCommission.toString() : '0',
          app.agentCommission ? app.agentCommission.toString() : '0',
          formatDateForExcel(app.submittedAt),
          (app.status || '').replace('_', ' '),
          clientAddress,
          clientProvince,
          clientDistrict,
          clientSector
        ];
        
        return row;
      });
      
      // Combine headers and data
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          row.map(cell => 
            typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
          ).join(',')
        )
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
      const filename = `insurance_applications_${dateStr}_${timeStr}.csv`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Excel file downloaded successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      showToast('Failed to generate Excel file', 'error');
    }
  };

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2 fade-in">Manage Insurance Applications</h1>
          <p className="text-gray-600 slide-up">Review and process client insurance applications</p>
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
              {filteredApplications.length > 0 && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    Download PDF
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadExcel}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10,9 9,9 8,9"></polyline>
                    </svg>
                    Download Excel
                  </Button>

                </>
              )}
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
          {/* Scroll hint - show when table is displayed and animation hasn't completed */}
          {!isLoading && showScrollHint && (
            <div className="w-screen py-2 bg-blue-50 border-b border-blue-200 overflow-hidden relative">
              {/* Left gradient fade */}
              <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Right gradient fade */}
              <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-blue-50 to-transparent z-10 pointer-events-none"></div>
              
              {/* Flowing text */}
              <div className="flex items-center justify-center text-sm text-blue-700">
                <span className="animate-flowing-text">Scroll to the left to view all columns</span>
              </div>
            </div>
          )}
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
            <div className="relative">
              {/* Left fade indicator */}
              {showLeftFade && (
                <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              {/* Right fade indicator */}
              {showRightFade && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-gray-100 via-gray-50/80 to-transparent z-10 pointer-events-none"></div>
              )}
              
              <div className="overflow-x-auto" onScroll={handleTableScroll}>
                <table className="w-full">
               <thead className="bg-gray-50">
  <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Client</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Created By</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Company Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Agent Commission</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
          <div className="text-sm font-medium text-gray-900">{app.client?.fullName || app.fullName || 'N/A'}</div>
          <div className="text-sm text-gray-500">{app.client?.email || app.email || 'N/A'}</div>
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
        {app.admin ? (
          <>
            <div className="font-medium text-[var(--main-blue)]">Admin</div>
            <div className="text-gray-600">{app.admin.fullName}</div>
          </>
        ) : app.agent ? (
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
    <td className="px-4 py-4 text-sm whitespace-nowrap font-medium">
      <div className="flex space-x-2">
        {getActionButtons(app)}
      </div>
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

   {/* Modal for reviewing pending application */}
{selectedApp   && activeModal === 'review' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.PENDING && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Review Application</h3>
        <button onClick={() => {setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
      
      {/* Enhanced application details section with all fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Personal Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="font-semibold">{selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.client?.email || selectedApp.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth) ? new Date(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth!).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {/* Address Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.client?.address || selectedApp.address || 'N/A'}</p>
          </div>
        </div>
        
        {/* Insurance Info */}
        <div className="space-y-4">
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
              <p className="font-semibold">{new Date(selectedApp.insuranceEndAt).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-semibold">
              {selectedApp.admin ? `Admin: ${selectedApp.admin.fullName}` : 
               selectedApp.agent ? `Agent: ${selectedApp.agent.fullName}` : 'Client'}
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
          {selectedApp.isCOMESA !== undefined && (
            <div>
              <p className="text-sm text-gray-500">COMESA Coverage</p>
              <p className="font-semibold">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Info (if applicable) */}
        {(selectedApp.vehicle || selectedApp.vehicleType || selectedApp.vehicleAge) && (
          <div className="space-y-4">
            {(selectedApp.vehicle?.vehicleType || selectedApp.vehicleType) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleType || selectedApp.vehicleType}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Use</p>
                <p className="font-semibold">
                  {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) === 'Other' 
                    ? (selectedApp.vehicle?.otherVehicleUse || selectedApp.otherVehicleUse)
                    : (selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse)}
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
        
        {/* Commission Info (if available) */}
        {(selectedApp.companyCommission || selectedApp.agentCommission) && (
          <div className="space-y-4">
            {selectedApp.companyCommission && (
              <div>
                <p className="text-sm text-gray-500">Company Commission</p>
                <p className="font-semibold">{selectedApp.companyCommission.toLocaleString()} RWF</p>
              </div>
            )}
            {selectedApp.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-semibold">{selectedApp.agentCommission.toLocaleString()} RWF</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Documents Section */}
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
        <h4 className="font-medium mb-2">Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'National ID / Passport',
              path: selectedApp.client?.nationalID || selectedApp.nationalID || ''
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard || ''
            })}
          >
            <p className="text-sm font-medium">Yellow Card</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          {selectedApp.pastInsuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Past Insurance Certificate',
                path: selectedApp.pastInsuranceCertificate || '/File_not_found.jpg'
              })}
            >
              <p className="text-sm font-medium">Past Insurance</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
          rows={4}
          value={rejectionComment}
          onChange={(e) => setRejectionComment(e.target.value)}
          placeholder="Enter reason for rejecting this application..."
        />
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
  <Button 
    variant="text" 
    onClick={() => {setSelectedApp(null); setActiveModal(null);}} 
    disabled={isApproving || isRejecting}
  >
    Cancel
  </Button>
  <Button 
    variant="danger" 
    onClick={() => handleReject('application')}
    disabled={!rejectionComment || isRejecting || isApproving}
    // loading={isRejecting}
  >
    {isRejecting ? 'Processing...' : 'Reject Application'}
  </Button>
  <Button 
    onClick={handleApproveApplication}
    disabled={rejectionComment.length > 0 || isApproving || isRejecting}
    // loading={isApproving}
  >
    {isApproving ? 'Processing...' : 'Approve Application'}
  </Button>
</div>
    </div>
  </div>
)}

      {/* Modal for sending invoice */}
      {selectedApp && activeModal === 'invoice' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.APPLICATION_APPROVED && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 fade-in">
      <h3 className="text-lg font-semibold mb-4">Send Invoice to {selectedApp.client?.fullName || selectedApp.fullName}</h3>
              <p className="text-gray-600 mb-4">Enter the invoice details for {selectedApp.insuranceCategory} insurance:</p>
      
      {/* Amount field */}
     <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF) *</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
          value={invoiceAmount || selectedApp.amount || ''}
          onChange={(e) => setInvoiceAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>

      {/* Agent Commission field - only show if application has an agent */}
      {selectedApp.agent && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Agent Commission (RWF) *</label>
          <input
            type="number"
            className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
            value={agentCommission}
            onChange={(e) => setAgentCommission(e.target.value)}
            placeholder="Enter agent commission"
            required
          />
        </div>
      )}

      {/* Company Commission field */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Company Commission (RWF) *</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
          value={companyCommission}
          onChange={(e) => setCompanyCommission(e.target.value)}
          placeholder="Enter company commission"
          required
        />
      </div>

      {/* Administration Fees field */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Administration Fees (RWF) *</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
          value={administrationFees}
          onChange={(e) => setAdministrationFees(e.target.value)}
          placeholder="Administration fees (auto-calculated)"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          {selectedApp.insuranceCategory.toLowerCase().includes('moto') 
            ? 'Calculated as 25% of 2500 RWF for MOTO insurance' 
            : 'Calculated as 25% of 5000 RWF for other insurance types'}
        </p>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions *</label>
        <textarea
          className="w-full px-3 py-2 border border-[var(--card-green)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--card-green)] focus:border-[var(--card-green)] sm:text-sm"
          rows={4}
          value={invoiceMessage}
          onChange={(e) => setInvoiceMessage(e.target.value)}
          placeholder="Enter payment instructions..."
          required
        />
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Attachment (Optional)</label>
        <input
          type="file"
          onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-[var(--main-blue)] file:text-white
            hover:file:bg-[var(--secondary-blue)]
          "
        />
        {invoiceFile && (
          <button 
            className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
            onClick={() => setViewingDocument({
              name: invoiceFile.name,
              path: URL.createObjectURL(invoiceFile)
            })}
          >
            View: {invoiceFile.name}
          </button>
        )}
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="text" onClick={() => {setSelectedApp(null); setActiveModal(null);}} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSendInvoice} disabled={isProcessing || !invoiceMessage || !invoiceAmount || !companyCommission || !administrationFees || (selectedApp.agent !== null && selectedApp.agent !== undefined && !agentCommission)}>
          {isProcessing ? 'Sending...' : 'Send Invoice'}
        </Button>
      </div>
    </div>
  </div>
)}

      {/* Modal for verifying payment */}
      {selectedApp && activeModal === 'verify' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.REVIEW_PAYMENT && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Verify Payment</h3>
        <button onClick={() => {setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
            <p className="text-gray-600 mb-4">Review payment proof for {selectedApp.client?.fullName || selectedApp.fullName}&apos;s application:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p className="font-medium">Payment Details:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {selectedApp.invoiceId && (
                  <li><span className="text-gray-600">Invoice ID:</span> {selectedApp.invoiceId}</li>
                )}
                {selectedApp.invoice && (
                  <li><span className="text-gray-600">Quotation / Invoice:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Quotation / Invoice',
                        path: selectedApp.invoice || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
                {selectedApp.amount && (
                  <li><span className="text-gray-600">Amount Expected:</span> {selectedApp.amount} RWF</li>
                )}
                
                
                {selectedApp.proofOfPayment && (
                  <li><span className="text-gray-600">Payment Proof:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Payment Proof',
                        path: selectedApp.proofOfPayment || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
                {selectedApp.transactionId && (
                  <li><span className="text-gray-600">Transaction ID:</span> {selectedApp.transactionId}</li>
                )}
                <li><span className="text-gray-600">Date Submitted:</span> {new Date(selectedApp.submittedAt).toLocaleDateString()}</li>
              </ul>
            </div>

            <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
          rows={4}
          value={rejectionComment}
          onChange={(e) => setRejectionComment(e.target.value)}
          placeholder="Enter reason for rejecting this payment..."
        />
      </div>
            
              <div className="flex justify-end gap-2 mt-6">
        <Button 
          variant="text" 
          size='sm'
          onClick={() =>{setSelectedApp(null); setActiveModal(null);}} 
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          variant="danger" 
          size='sm'
          onClick={() => {
            setIsProcessing(true);
            handleVerifyPayment('reject').finally(() => setIsProcessing(false));
          }}
          disabled={!rejectionComment || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Reject Payment'}
        </Button>
        <Button 
          size='sm'
          onClick={() => {
            setIsProcessing(true);
            handleVerifyPayment('approve').finally(() => setIsProcessing(false));
          }}
          disabled={rejectionComment.length > 0 || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Approve Payment'}
        </Button>
      </div>
          </div>
        </div>
      )}

      {/* Modal for issuing insurance */}
      {selectedApp && activeModal === 'issue' && selectedApp.status && selectedApp.status.toLowerCase() === ApplicationStatus.PAYMENT_VERIFIED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Issue Insurance</h3>
            <p className="text-gray-600 mb-4">Issue insurance certificate for {selectedApp.client?.fullName || selectedApp.fullName}&apos;s {selectedApp.insuranceCategory} insurance:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-blue-50">
              <p className="font-medium text-[var(--main-blue)]">Application Approved & Payment Verified</p>
              <p className="mt-2 text-sm text-gray-600">The application has been reviewed and the payment has been verified. You can now issue the insurance certificate.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                 {selectedApp.proofOfPayment && (
                  <><span className="text-gray-600">Payment Proof:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Payment Proof',
                        path: selectedApp.proofOfPayment || '/File_not_found.jpg'
                      })}
                    >
                      View Document
                    </button>
                  </>
                )}
                {selectedApp.amount && (
                  <div>
                    <p className="text-gray-600">Invoice Amount:</p>
                    <p className="font-medium">{selectedApp.amount} RWF</p>
                  </div>
                )}
                {selectedApp.transactionId && (
                  <div>
                    <p className="text-gray-600">Transaction ID:</p>
                    <p className="font-medium">{selectedApp.transactionId}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Certificate *</label>
              <input
                type="file"
                onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
                required
              />
              {insuranceFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: insuranceFile.name,
                    path: URL.createObjectURL(insuranceFile)
                  })}
                >
                  View: {insuranceFile.name}
                </button>
              )}
            </div>
            {/* Contract file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract (Optional)</label>
              <input
                type="file"
                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {contractFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: contractFile.name,
                    path: URL.createObjectURL(contractFile)
                  })}
                >
                  View: {contractFile.name}
                </button>
              )}
            </div>
            {/* Receipt file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
              <input
                type="file"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {receiptFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: receiptFile.name,
                    path: URL.createObjectURL(receiptFile)
                  })}
                >
                  View: {receiptFile.name}
                </button>
              )}
            </div>
            {/* EBM file (optional) */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">EBM (Optional)</label>
              <input
                type="file"
                onChange={(e) => setEbmFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-[var(--main-blue)] file:text-white
                  hover:file:bg-[var(--secondary-blue)]
                "
              />
              {ebmFile && (
                <button 
                  className="mt-2 text-sm text-[var(--main-blue)] hover:underline"
                  onClick={() => setViewingDocument({
                    name: ebmFile.name,
                    path: URL.createObjectURL(ebmFile)
                  })}
                >
                  View: {ebmFile.name}
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => {setSelectedApp(null); setActiveModal(null); setInsuranceFile(null); setContractFile(null); setReceiptFile(null); setEbmFile(null);}} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleIssueInsurance} disabled={!insuranceFile || isProcessing}>
                {isProcessing ? 'Issuing...' : 'Issue Insurance Certificate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing details */}
    {selectedApp && activeModal === 'details' && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Application Details</h3>
        <button onClick={() =>{setSelectedApp(null); setActiveModal(null);}} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
            <p className="font-semibold">{selectedApp.client?.fullName || selectedApp.fullName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.client?.email || selectedApp.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.client?.phoneNumber || selectedApp.phoneNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth) ? new Date(selectedApp.client?.dateOfBirth || selectedApp.dateOfBirth!).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {/* Address Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.client?.address || selectedApp.address || 'N/A'}</p>
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
              <p className="font-semibold">{new Date(selectedApp.insuranceEndAt).toLocaleDateString()}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Created By</p>
            <p className="font-semibold">
              {selectedApp.admin ? `Admin: ${selectedApp.admin.fullName}` : 
               selectedApp.agent ? `Agent: ${selectedApp.agent.fullName}` : 'Client'}
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
          {selectedApp.isCOMESA !== undefined && (
            <div>
              <p className="text-sm text-gray-500">COMESA Coverage</p>
              <p className="font-semibold">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Information (if applicable) */}
        {(selectedApp.insuranceCategory === 'Car Insurance' || selectedApp.insuranceCategory === 'MotorBike Insurance') && (
          <div className="space-y-2">
            {(selectedApp.vehicle?.vehicleType || selectedApp.vehicleType) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleType || selectedApp.vehicleType}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicle?.vehicleAge || selectedApp.vehicleAge}</p>
              </div>
            )}
            {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Use</p>
                <p className="font-semibold">
                  {(selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse) === 'Other' 
                    ? (selectedApp.vehicle?.otherVehicleUse || selectedApp.otherVehicleUse)
                    : (selectedApp.vehicle?.vehicleUse || selectedApp.vehicleUse)}
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
        
        {/* Commission Information (if available) */}
        {(selectedApp.companyCommission || selectedApp.agentCommission) && (
          <div className="space-y-2">
            {selectedApp.companyCommission && (
              <div>
                <p className="text-sm text-gray-500">Company Commission</p>
                <p className="font-semibold">{selectedApp.companyCommission.toLocaleString()} RWF</p>
              </div>
            )}
            {selectedApp.agent && selectedApp.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-semibold">{selectedApp.agentCommission.toLocaleString()} RWF</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Rejection Reason (if exists) */}
      {(selectedApp.rejectionReason) && (
        <div className="mt-4 bg-red-50 p-4 rounded-lg">
          <h4 className="font-medium text-red-700 mb-2">Rejection Reason</h4>
          <p className="text-red-600">{selectedApp.rejectionReason}</p>
        </div>
      )}
      {/* Reason For Payment rejection (if exists) */}
      {(selectedApp.reasonForPaymentRejection) && (
        <div className="mt-4 bg-red-50 p-4 rounded-lg">
          <h4 className="font-medium text-red-700 mb-2">Reason For Payment Rejection</h4>
          <p className="text-red-600">{selectedApp.reasonForPaymentRejection}</p>
        </div>
      )}
      
      {/* Documents Section */}
      <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4 mt-6">
        <h4 className="font-medium mb-2">Documents</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'National ID / Passport',
              path: selectedApp.client?.nationalID || selectedApp.nationalID || ''
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard || ''
            })}
          >
            <p className="text-sm font-medium">Yellow Card</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          
          {selectedApp.pastInsuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Past Insurance Certificate',
                path: selectedApp.pastInsuranceCertificate || ''
              })}
            >
              <p className="text-sm font-medium">Past Insurance</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          
          {selectedApp.proofOfPayment && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Proof of Payment',
                path: selectedApp.proofOfPayment || ''
              })}
            >
              <p className="text-sm font-medium">Proof of Payment</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          
          {selectedApp.invoice && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Quotation / Invoice',
                path: selectedApp.invoice || ''
              })}
            >
              <p className="text-sm font-medium">Quotation / Invoice</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.insuranceCertificate && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Insurance Certificate',
                path: selectedApp.insuranceCertificate || ''
              })}
            >
              <p className="text-sm font-medium">Insurance Certificate</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.contract && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Contract',
                path: selectedApp.contract || ''
              })}
            >
              <p className="text-sm font-medium">Contract</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.receipt && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'Receipt',
                path: selectedApp.receipt || ''
              })}
            >
              <p className="text-sm font-medium">Receipt</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
          {selectedApp.ebm && (
            <button 
              className="bg-white p-3 rounded border text-left hover:bg-gray-50"
              onClick={() => setViewingDocument({
                name: 'EBM',
                path: selectedApp.ebm || ''
              })}
            >
              <p className="text-sm font-medium">EBM</p>
              <p className="text-xs text-gray-500">View Document</p>
            </button>
          )}
        </div>
      </div>
      
      {/* Invoice & Payment Information (if available) */}
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
      
      <div className="flex justify-end">
        <Button variant="text" onClick={() =>{setSelectedApp(null); setActiveModal(null);}}>Close</Button>
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
}