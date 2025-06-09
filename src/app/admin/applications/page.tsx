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
  fullName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  address: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration: string;
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
  reasonForPaymentRejection?: string;
  vehicleType?: string;
  vehicleAge?: string;
  province?: string;
  district?: string;
  sector?: string;
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
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
  const itemsPerPage = 10;

  // Fetch applications from API
useEffect(() => {
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
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
      setApplications(sortedApplications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      showToast('Failed to load applications', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (token) {
    fetchApplications();
  }
}, [token]);

  // Filter applications based on search query and tab
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || app.status.toLowerCase() === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Send invoice to client
 const handleSendInvoice = async () => {
  if (!selectedApp || !invoiceMessage || !invoiceAmount) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  setIsProcessing(true);
  try {
    const formData = new FormData();
    formData.append('paymentInstructions', invoiceMessage);
    formData.append('amount', invoiceAmount); // Add amount to form data
    if (invoiceFile) {
      formData.append('invoice', invoiceFile);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/sendInvoice/${selectedApp._id}`,
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

    const updatedApplications = applications.map(app => {
      if (app._id === selectedApp._id) {
        return {
          ...app,
          status: ApplicationStatus.INVOICE_SENT,
          invoiceAmount: invoiceAmount // Update the amount in local state
        };
      }
      return app;
    });
    
    setApplications(updatedApplications);
    showToast(`Invoice sent to ${selectedApp.fullName}`, 'success');
    setInvoiceMessage('');
    setInvoiceAmount('');
    setInvoiceFile(null);
    setSelectedApp(null);
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

    const updatedApplications = applications.map(app => {
      if (app._id === selectedApp._id) {
        return {
          ...app,
          status: action === 'approve' 
            ? ApplicationStatus.PAYMENT_VERIFIED 
            : ApplicationStatus.WAITING_FOR_USER_ACTION,
          ...(action === 'reject' && { reasonForPaymentRejection: rejectionComment })
        };
      }
      return app;
    });
    
    setApplications(updatedApplications);
    showToast(
      action === 'approve' 
        ? `Payment from ${selectedApp.fullName} verified` 
        : `Payment from ${selectedApp.fullName} rejected`,
      action === 'approve' ? 'success' : 'error'
    );
    setRejectionComment('');
    setSelectedApp(null);
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
    
    setIsProcessing(true);
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

      const updatedApplications = applications.map(app => {
        if (app._id === selectedApp._id) {
          return {
            ...app,
            status: ApplicationStatus.WAITING_FOR_USER_ACTION,
            rejectionReason: rejectionComment
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(
        action === 'application' 
          ? `Application from ${selectedApp.fullName} rejected` 
          : `Payment from ${selectedApp.fullName} rejected`, 
        'error'
      );
      setRejectionComment('');
      setSelectedApp(null);
    } catch (error) {
      console.error('Error rejecting:', error);
      showToast(error instanceof Error ? error.message : 'Failed to reject', 'error');
    } finally {
      setIsProcessing(false);
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

      const updatedApplications = applications.map(app => {
        if (app._id === selectedApp._id) {
          return {
            ...app,
            status: ApplicationStatus.INSURANCE_ISSUED
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(`Insurance issued to ${selectedApp.fullName}`, 'success');
      setInsuranceFile(null);
      setSelectedApp(null);
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
    
    setIsProcessing(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/approveApplication/${selectedApp._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve application');
      }

      const updatedApplications = applications.map(app => {
        if (app._id === selectedApp._id) {
          return {
            ...app,
            status: ApplicationStatus.APPLICATION_APPROVED
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(`Application from ${selectedApp.fullName} approved`, 'success');
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving application:', error);
      showToast(error instanceof Error ? error.message : 'Failed to approve application', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get status badge based on application status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending</span>;
      case ApplicationStatus.APPLICATION_APPROVED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Application Approved</span>;
      case ApplicationStatus.WAITING_FOR_USER_ACTION:
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium">Waiting for User Action</span>;
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case ApplicationStatus.REVIEW_PAYMENT:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Review Payment</span>;
      case ApplicationStatus.PAYMENT_VERIFIED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Payment Verified</span>;
      case ApplicationStatus.INSURANCE_ISSUED:
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Insurance Issued</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">Unknown</span>;
    }
  };

  // Get action buttons based on application status
  const getActionButtons = (app: Application) => {
    switch (app.status.toLowerCase()) {
      case ApplicationStatus.PENDING:
        return (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
            }}
          >
            Review
          </Button>
        );
      
      case ApplicationStatus.APPLICATION_APPROVED:
        return (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
              setInvoiceMessage(`Please make your payment to one of the following:\nBank: Kigali Bank\nAccount: 1234567890\nOr via MOMO: 0782123456`);
            }}
          >
            Send Invoice
          </Button>
        );
      
      case ApplicationStatus.REVIEW_PAYMENT:
        return (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
            }}
          >
            Verify Payment
          </Button>
        );
      
      case ApplicationStatus.PAYMENT_VERIFIED:
        return (
          <Button 
            size="xs" 
            onClick={() => {
              setSelectedApp(app);
            }}
          >
            Issue Insurance
          </Button>
        );
      
      default:
        return (
          <Button 
            size="xs" 
            variant="text" 
            onClick={() => {
              setSelectedApp(app);
            }}
          >
            View Details
          </Button>
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
          <h1 className="text-3xl font-bold mb-2 fade-in">Manage Insurance Applications</h1>
          <p className="text-gray-600 slide-up">Review and process client insurance applications</p>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm slide-in-right">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/3">
              <Input
                label=""
                name="search"
                placeholder="Search by name, email or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
              />
            </div>
            
            <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2">
              <Button
                size="xs"
                variant={activeTab === 'all' ? 'primary' : 'text'}
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.PENDING ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.PENDING)}
              >
                Pending
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.PAYMENT_VERIFIED ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.PAYMENT_VERIFIED)}
              >
                Payment Verified
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.APPLICATION_APPROVED ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.APPLICATION_APPROVED)}
              >
                Application Approved
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.INVOICE_SENT ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.INVOICE_SENT)}
              >
                Invoice Sent
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.REVIEW_PAYMENT ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.REVIEW_PAYMENT)}
              >
                Review Payment
              </Button>
              <Button
                size="xs"
                variant={activeTab === ApplicationStatus.WAITING_FOR_USER_ACTION ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.WAITING_FOR_USER_ACTION)}
              >
                Waiting for User
              </Button>
            </div>
          </div>
        </div>

        {/* Applications table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden fade-in">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[var(--mid-gray)] border-t-[var(--main-blue)]"></div>
              <p className="mt-4 text-gray-600">Loading applications...</p>
            </div>
          ) : paginatedApplications.length === 0 ? (
            <div className="p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
               <thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance Type</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
  </tr>
</thead>
                <tbody className="divide-y divide-gray-200">
                 {paginatedApplications.map((app, index) => (
  <tr key={app._id} className="hover:bg-gray-50 transition-colors ">
    <td className="px-4 py-4 text-xs whitespace-nowrap font-medium text-[var(--main-blue)]">
      #{(currentPage - 1) * itemsPerPage + index + 1}
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="flex items-center">
        <div>
          <div className="text-xs font-medium text-gray-900">{app.fullName}</div>
          <div className="text-xs text-gray-500">{app.email}</div>
        </div>
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900 capitalize">{app.insuranceType.replace('_', ' ')}</div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.amount ? `${app.amount.toLocaleString()} RWF` : 'N/A'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : 'N/A'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap text-gray-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      {getStatusBadge(app.status)}
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap font-medium">
      <div className="flex space-x-2">
        {getActionButtons(app)}
      </div>
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

   {/* Modal for reviewing pending application */}
{selectedApp && selectedApp.status.toLowerCase() === ApplicationStatus.PENDING && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Review Application</h3>
        <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
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
            <p className="font-semibold">{selectedApp.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.phoneNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{new Date(selectedApp.dateOfBirth).toLocaleDateString()}</p>
          </div>
        </div>
        
        {/* Address Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.address}</p>
          </div>
          {selectedApp.province && (
            <div>
              <p className="text-sm text-gray-500">Province</p>
              <p className="font-semibold">{selectedApp.province}</p>
            </div>
          )}
          {selectedApp.district && (
            <div>
              <p className="text-sm text-gray-500">District</p>
              <p className="font-semibold">{selectedApp.district}</p>
            </div>
          )}
          {selectedApp.sector && (
            <div>
              <p className="text-sm text-gray-500">Sector</p>
              <p className="font-semibold">{selectedApp.sector}</p>
            </div>
          )}
        </div>
        
        {/* Insurance Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Insurance Category</p>
            <p className="font-semibold">{selectedApp.insuranceCategory}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Insurance Type</p>
            <p className="font-semibold">{selectedApp.insuranceType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-semibold">{selectedApp.insuranceDuration}</p>
          </div>
          {selectedApp.amount && (
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Info (if applicable) */}
        {(selectedApp.vehicleType || selectedApp.vehicleAge) && (
          <div className="space-y-4">
            {selectedApp.vehicleType && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicleType}</p>
              </div>
            )}
            {selectedApp.vehicleAge && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicleAge}</p>
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
              path: selectedApp.nationalID
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard
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
          onClick={() => setSelectedApp(null)} 
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={() => {
            setIsProcessing(true);
            handleReject('application').finally(() => setIsProcessing(false));
          }}
          disabled={!rejectionComment || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Reject Application'}
        </Button>
        <Button 
          onClick={() => {
            setIsProcessing(true);
            handleApproveApplication().finally(() => setIsProcessing(false));
          }}
          disabled={rejectionComment.length > 0 || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Approve Application'}
        </Button>
      </div>
    </div>
  </div>
)}

      {/* Modal for sending invoice */}
      {selectedApp && selectedApp.status.toLowerCase() === ApplicationStatus.APPLICATION_APPROVED && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
      <h3 className="text-lg font-semibold mb-4">Send Invoice to {selectedApp.fullName}</h3>
      <p className="text-gray-600 mb-4">Enter the invoice details for {selectedApp.insuranceType} insurance:</p>
      
      {/* Add Amount field */}
     <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (RWF) *</label>
        <input
          type="number"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
          value={invoiceAmount || selectedApp.amount || ''}
          onChange={(e) => setInvoiceAmount(e.target.value)}
          placeholder="Enter amount"
          required
        />
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Instructions *</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
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
        <Button variant="text" onClick={() => setSelectedApp(null)} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSendInvoice} disabled={isProcessing || !invoiceMessage || !invoiceAmount}>
          {isProcessing ? 'Sending...' : 'Send Invoice'}
        </Button>
      </div>
    </div>
  </div>
)}

      {/* Modal for verifying payment */}
      {selectedApp && selectedApp.status.toLowerCase() === ApplicationStatus.REVIEW_PAYMENT && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Verify Payment</h3>
        <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
            <p className="text-gray-600 mb-4">Review payment proof for {selectedApp.fullName}&apos;s application:</p>
            
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
          onClick={() => setSelectedApp(null)} 
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

      {/* Modal for rejecting payment */}
      {selectedApp && selectedApp.status.toLowerCase() === ApplicationStatus.WAITING_FOR_USER_ACTION && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Reject Payment</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejecting this payment:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p className="font-medium">Payment Details:</p>
              <ul className="mt-2 space-y-1 text-sm">
                {selectedApp.invoiceId && (
                  <li><span className="text-gray-600">Invoice ID:</span> {selectedApp.invoiceId}</li>
                )}
                {selectedApp.invoiceAmount && (
                  <li><span className="text-gray-600">Amount Expected:</span> {selectedApp.invoiceAmount} RWF</li>
                )}
                {selectedApp.transactionId && (
                  <li><span className="text-gray-600">Transaction ID:</span> {selectedApp.transactionId}</li>
                )}
                {selectedApp.proofOfPayment && (
                  <li><span className="text-gray-600">Payment Proof:</span> 
                    <button 
                      className="text-[var(--main-blue)] hover:underline ml-1"
                      onClick={() => setViewingDocument({
                        name: 'Payment Proof',
                        path: selectedApp.proofOfPayment || ''
                      })}
                    >
                      View Document
                    </button>
                  </li>
                )}
              </ul>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--main-blue)] focus:border-[var(--main-blue)] sm:text-sm"
                rows={4}
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Enter reason for rejecting this payment..."
                required
              />
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="text" 
                onClick={() => setSelectedApp({...selectedApp, status: ApplicationStatus.REVIEW_PAYMENT})}
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button 
                variant="danger" 
                onClick={() => handleReject('payment')} 
                disabled={!rejectionComment || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for issuing insurance */}
      {selectedApp && selectedApp.status.toLowerCase() === ApplicationStatus.PAYMENT_VERIFIED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Issue Insurance</h3>
            <p className="text-gray-600 mb-4">Issue insurance certificate for {selectedApp.fullName}&apos;s {selectedApp.insuranceType} insurance:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-blue-50">
              <p className="font-medium text-[var(--main-blue)]">Application Approved & Payment Verified</p>
              <p className="mt-2 text-sm text-gray-600">The application has been reviewed and the payment has been verified. You can now issue the insurance certificate.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
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
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => setSelectedApp(null)} disabled={isProcessing}>
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
    {selectedApp && ![
  ApplicationStatus.PENDING, 
  ApplicationStatus.APPLICATION_APPROVED, 
  ApplicationStatus.REVIEW_PAYMENT, 
  ApplicationStatus.PAYMENT_VERIFIED
].includes(selectedApp.status.toLowerCase() as ApplicationStatus) && (
  <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
    <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl mx-4 fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Application Details</h3>
        <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">
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
            <p className="font-semibold">{selectedApp.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-semibold">{selectedApp.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-semibold">{selectedApp.phoneNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date of Birth</p>
            <p className="font-semibold">{new Date(selectedApp.dateOfBirth).toLocaleDateString()}</p>
          </div>
        </div>
        
        {/* Address Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="font-semibold">{selectedApp.address}</p>
          </div>
          {selectedApp.province && (
            <div>
              <p className="text-sm text-gray-500">Province</p>
              <p className="font-semibold">{selectedApp.province}</p>
            </div>
          )}
          {selectedApp.district && (
            <div>
              <p className="text-sm text-gray-500">District</p>
              <p className="font-semibold">{selectedApp.district}</p>
            </div>
          )}
          {selectedApp.sector && (
            <div>
              <p className="text-sm text-gray-500">Sector</p>
              <p className="font-semibold">{selectedApp.sector}</p>
            </div>
          )}
        </div>
        
        {/* Insurance Information */}
        <div className="space-y-2">
          <div>
            <p className="text-sm text-gray-500">Insurance Category</p>
            <p className="font-semibold">{selectedApp.insuranceCategory}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Insurance Type</p>
            <p className="font-semibold">{selectedApp.insuranceType}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-semibold">{selectedApp.insuranceDuration}</p>
          </div>
          {selectedApp.amount && (
            <div>
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-semibold">{selectedApp.amount.toLocaleString()} RWF</p>
            </div>
          )}
        </div>
        
        {/* Vehicle Information (if applicable) */}
        {(selectedApp.insuranceCategory === 'Car Insurance' || selectedApp.insuranceCategory === 'Motorbike Insurance') && (
          <div className="space-y-2">
            {selectedApp.vehicleType && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-semibold">{selectedApp.vehicleType}</p>
              </div>
            )}
            {selectedApp.vehicleAge && (
              <div>
                <p className="text-sm text-gray-500">Vehicle Year</p>
                <p className="font-semibold">{selectedApp.vehicleAge}</p>
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
            {selectedApp.agentId && (selectedApp.agentCommission && (
              <div>
                <p className="text-sm text-gray-500">Agent Commission</p>
                <p className="font-semibold">{selectedApp.agentCommission.toLocaleString()} RWF</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Rejection Reason (if exists) */}
      {selectedApp.rejectionReason && (
        <div className="mt-4 bg-red-50 p-4 rounded-lg">
          <h4 className="font-medium text-red-700 mb-2">Rejection Reason</h4>
          <p className="text-red-600">{selectedApp.rejectionReason}</p>
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
              path: selectedApp.nationalID
            })}
          >
            <p className="text-sm font-medium">National ID / Passport</p>
            <p className="text-xs text-gray-500">View Document</p>
          </button>
          
          <button 
            className="bg-white p-3 rounded border text-left hover:bg-gray-50"
            onClick={() => setViewingDocument({
              name: 'Yellow Card',
              path: selectedApp.yellowCard
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
          {selectedApp.invoice && (
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
        <Button variant="text" onClick={() => setSelectedApp(null)}>Close</Button>
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