'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

// Application statuses
enum ApplicationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  INVOICE_SENT = 'invoice_sent',
  PAYMENT_SUBMITTED = 'payment_submitted',
  PAYMENT_VERIFIED = 'payment_verified',
  INSURANCE_ISSUED = 'insurance_issued'
}

// Application interface
interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  insuranceType: string;
  status: ApplicationStatus;
  dateSubmitted: string;
  nationalId: string;
  yellowCard: string;
  additionalDocument?: string;
  paymentProof?: string;
  invoiceId?: string;
  insuranceId?: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function ManageApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ApplicationStatus | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

  // Mock data for demo purposes
  useEffect(() => {
    // Simulating API fetch
    setTimeout(() => {
      const mockData: Application[] = [
        {
          id: '001',
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '+250782123456',
          insuranceType: 'car',
          status: ApplicationStatus.PENDING,
          dateSubmitted: '2025-05-01',
          nationalId: 'ID_001.pdf',
          yellowCard: 'YC_001.pdf',
        },
        {
          id: '002',
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+250782123457',
          insuranceType: 'motorbike',
          status: ApplicationStatus.APPROVED,
          dateSubmitted: '2025-05-02',
          nationalId: 'ID_002.pdf',
          yellowCard: 'YC_002.pdf',
          additionalDocument: 'ADD_002.pdf',
        },
        {
          id: '003',
          fullName: 'Robert Katz',
          email: 'robert@example.com',
          phone: '+250782123458',
          insuranceType: 'building',
          status: ApplicationStatus.INVOICE_SENT,
          dateSubmitted: '2025-05-03',
          nationalId: 'ID_003.pdf',
          yellowCard: 'YC_003.pdf',
          invoiceId: 'INV_001',
        },
        {
          id: '004',
          fullName: 'Maria Garcia',
          email: 'maria@example.com',
          phone: '+250782123459',
          insuranceType: 'travel',
          status: ApplicationStatus.PAYMENT_SUBMITTED,
          dateSubmitted: '2025-05-04',
          nationalId: 'ID_004.pdf',
          yellowCard: 'YC_004.pdf',
          invoiceId: 'INV_002',
          paymentProof: 'PAY_001.pdf',
        },
        {
          id: '005',
          fullName: 'David Chen',
          email: 'david@example.com',
          phone: '+250782123460',
          insuranceType: 'health',
          status: ApplicationStatus.PAYMENT_VERIFIED,
          dateSubmitted: '2025-05-05',
          nationalId: 'ID_005.pdf',
          yellowCard: 'YC_005.pdf',
          invoiceId: 'INV_003',
          paymentProof: 'PAY_002.pdf',
        },
        {
          id: '006',
          fullName: 'Sophie Kim',
          email: 'sophie@example.com',
          phone: '+250782123461',
          insuranceType: 'sme',
          status: ApplicationStatus.INSURANCE_ISSUED,
          dateSubmitted: '2025-05-06',
          nationalId: 'ID_006.pdf',
          yellowCard: 'YC_006.pdf',
          invoiceId: 'INV_004',
          paymentProof: 'PAY_003.pdf',
          insuranceId: 'INS_001',
        },
        {
          id: '007',
          fullName: 'Michael Johnson',
          email: 'michael@example.com',
          phone: '+250782123462',
          insuranceType: 'car',
          status: ApplicationStatus.REJECTED,
          dateSubmitted: '2025-05-07',
          nationalId: 'ID_007.pdf',
          yellowCard: 'YC_007.pdf',
        },
      ];
      setApplications(mockData);
      setIsLoading(false);
    }, 1500);
  }, []);

  // Filter applications based on search query and tab
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = activeTab === 'all' || app.status === activeTab;
    
    return matchesSearch && matchesTab;
  });

  const paginatedApplications = filteredApplications.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
);

  // Send invoice to client
  const handleSendInvoice = () => {
    if (!selectedApp) return;
    if (!invoiceAmount || isNaN(parseFloat(invoiceAmount))) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setIsSending(true);
    // Simulate API call
    setTimeout(() => {
      const updatedApplications = applications.map(app => {
        if (app.id === selectedApp.id) {
          return {
            ...app,
            status: ApplicationStatus.INVOICE_SENT,
            invoiceId: `INV_${Math.floor(Math.random() * 1000)}`,
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(`Invoice sent to ${selectedApp.fullName}`, 'success');
      setInvoiceAmount('');
      setIsSending(false);
      setSelectedApp(null);
    }, 1500);
  };

  // Verify client payment
  const handleVerifyPayment = () => {
    if (!selectedApp) return;
    
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      const updatedApplications = applications.map(app => {
        if (app.id === selectedApp.id) {
          return {
            ...app,
            status: ApplicationStatus.PAYMENT_VERIFIED,
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(`Payment from ${selectedApp.fullName} verified`, 'success');
      setIsUpdating(false);
      setSelectedApp(null);
    }, 1500);
  };

  // Issue insurance to client
  const handleIssueInsurance = () => {
    if (!selectedApp) return;
    
    setIsUpdating(true);
    // Simulate API call
    setTimeout(() => {
      const updatedApplications = applications.map(app => {
        if (app.id === selectedApp.id) {
          return {
            ...app,
            status: ApplicationStatus.INSURANCE_ISSUED,
            insuranceId: `INS_${Math.floor(Math.random() * 1000)}`,
          };
        }
        return app;
      });
      
      setApplications(updatedApplications);
      showToast(`Insurance issued to ${selectedApp.fullName}`, 'success');
      setIsUpdating(false);
      setSelectedApp(null);
    }, 1500);
  };

  // Get status badge based on application status
  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.PENDING:
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Pending</span>;
      case ApplicationStatus.APPROVED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Approved</span>;
      case ApplicationStatus.REJECTED:
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Rejected</span>;
      case ApplicationStatus.INVOICE_SENT:
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">Invoice Sent</span>;
      case ApplicationStatus.PAYMENT_SUBMITTED:
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">Payment Submitted</span>;
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
    switch (app.status) {
      case ApplicationStatus.PENDING:
        return (
          <>
            <Button 
              size="sm" 
              onClick={() => {
                // Update application status to approved
                const updatedApplications = applications.map(a => {
                  if (a.id === app.id) {
                    return { ...a, status: ApplicationStatus.APPROVED };
                  }
                  return a;
                });
                setApplications(updatedApplications);
                showToast(`Application from ${app.fullName} approved`, 'success');
              }}
            >
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="danger" 
              onClick={() => {
                // Update application status to rejected
                const updatedApplications = applications.map(a => {
                  if (a.id === app.id) {
                    return { ...a, status: ApplicationStatus.REJECTED };
                  }
                  return a;
                });
                setApplications(updatedApplications);
                showToast(`Application from ${app.fullName} rejected`, 'error');
              }}
            >
              Reject
            </Button>
          </>
        );
      
      case ApplicationStatus.APPROVED:
        return (
          <Button 
            size="sm" 
            onClick={() => {
              setSelectedApp(app);
            }}
          >
            Send Invoice
          </Button>
        );
      
      case ApplicationStatus.PAYMENT_SUBMITTED:
        return (
          <Button 
            size="sm" 
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
            size="sm" 
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
            size="sm" 
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
            <span className="font-medium">{Math.min(currentPage * 10, paginatedApplications.length)}</span> of{' '}
            <span className="font-medium">{paginatedApplications.length}</span> results
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
                size="sm"
                variant={activeTab === 'all' ? 'primary' : 'text'}
                onClick={() => setActiveTab('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={activeTab === ApplicationStatus.PENDING ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.PENDING)}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={activeTab === ApplicationStatus.APPROVED ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.APPROVED)}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={activeTab === ApplicationStatus.INVOICE_SENT ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.INVOICE_SENT)}
              >
                Invoice Sent
              </Button>
              <Button
                size="sm"
                variant={activeTab === ApplicationStatus.PAYMENT_SUBMITTED ? 'primary' : 'text'}
                onClick={() => setActiveTab(ApplicationStatus.PAYMENT_SUBMITTED)}
              >
                Payment Submitted
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">#{app.id}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                            <div className="text-sm text-gray-500">{app.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{app.insuranceType.replace('_', ' ')}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{app.dateSubmitted}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
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

      {/* Modal for sending invoice */}
      {selectedApp && selectedApp.status === ApplicationStatus.APPROVED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Send Invoice to {selectedApp.fullName}</h3>
            <p className="text-gray-600 mb-4">Enter the invoice amount for {selectedApp.insuranceType} insurance:</p>
            
            <Input
              label="Invoice Amount (RWF)"
              name="invoiceAmount"
              placeholder="e.g., 50000"
              value={invoiceAmount}
              onChange={(e) => setInvoiceAmount(e.target.value)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              }
            />
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => setSelectedApp(null)}>Cancel</Button>
              <Button onClick={handleSendInvoice} disabled={isSending}>
                {isSending ? 'Sending...' : 'Send Invoice'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for verifying payment */}
      {selectedApp && selectedApp.status === ApplicationStatus.PAYMENT_SUBMITTED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Verify Payment</h3>
            <p className="text-gray-600 mb-4">Review payment proof for {selectedApp.fullName}&apos;s application:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <p className="font-medium">Payment Details:</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li><span className="text-gray-600">Invoice ID:</span> {selectedApp.invoiceId}</li>
                <li><span className="text-gray-600">Payment Proof:</span> {selectedApp.paymentProof}</li>
                <li><span className="text-gray-600">Date Submitted:</span> {selectedApp.dateSubmitted}</li>
              </ul>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => setSelectedApp(null)}>Cancel</Button>
              <Button onClick={handleVerifyPayment} disabled={isUpdating}>
                {isUpdating ? 'Verifying...' : 'Verify Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for issuing insurance */}
      {selectedApp && selectedApp.status === ApplicationStatus.PAYMENT_VERIFIED && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">Issue Insurance</h3>
            <p className="text-gray-600 mb-4">Issue insurance certificate for {selectedApp.fullName}&apos;s {selectedApp.insuranceType} insurance:</p>
            
            <div className="border rounded-lg p-4 mb-4 bg-blue-50">
              <p className="font-medium text-[var(--main-blue)]">Application Approved & Payment Verified</p>
              <p className="mt-2 text-sm text-gray-600">The application has been reviewed and the payment has been verified. You can now issue the insurance certificate.</p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="text" onClick={() => setSelectedApp(null)}>Cancel</Button>
              <Button onClick={handleIssueInsurance} disabled={isUpdating}>
                {isUpdating ? 'Issuing...' : 'Issue Insurance Certificate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing details */}
      {selectedApp && ![ApplicationStatus.APPROVED, ApplicationStatus.PAYMENT_SUBMITTED, ApplicationStatus.PAYMENT_VERIFIED].includes(selectedApp.status) && (
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
                  <p className="font-semibold">#{selectedApp.id}</p>
                </div>
                <div>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Client Name</p>
                <p className="font-semibold">{selectedApp.fullName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Insurance Type</p>
                <p className="font-semibold capitalize">{selectedApp.insuranceType.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-semibold">{selectedApp.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-semibold">{selectedApp.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Submitted</p>
                <p className="font-semibold">{selectedApp.dateSubmitted}</p>
              </div>
              {selectedApp.insuranceId && (
                <div>
                  <p className="text-sm text-gray-500">Insurance ID</p>
                  <p className="font-semibold">{selectedApp.insuranceId}</p>
                </div>
              )}
            </div>
            
            <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">National ID</p>
                  <p className="text-xs text-gray-500">{selectedApp.nationalId}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Yellow Card</p>
                  <p className="text-xs text-gray-500">{selectedApp.yellowCard}</p>
                </div>
                {selectedApp.additionalDocument && (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium">Additional Document</p>
                    <p className="text-xs text-gray-500">{selectedApp.additionalDocument}</p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedApp.invoiceId && (
              <div className="bg-[var(--light-gray)] p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2">Invoice & Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm font-medium">Invoice ID</p>
                    <p className="text-xs text-gray-500">{selectedApp.invoiceId}</p>
                  </div>
                  {selectedApp.paymentProof && (
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm font-medium">Payment Proof</p>
                      <p className="text-xs text-gray-500">{selectedApp.paymentProof}</p>
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

      <ToastContainer />
    </MainLayout>
  );
}