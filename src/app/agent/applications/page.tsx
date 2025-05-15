'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

interface Application {
  id: string;
  clientName: string;
  phone: string;
  insuranceType: string;
  status: string;
  dateSubmitted: string;
  commission: string;
  documents: {
    nationalId: string;
    yellowCard: string;
  };
  payment?: {
    invoiceId?: string;
    amount?: string;
    proof?: string;
  };
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AgentApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const itemsPerPage = 10;

  // Mock data for demo purposes
  useEffect(() => {
    setTimeout(() => {
      const mockData: Application[] = [
        {
          id: 'AG001',
          clientName: 'John Doe',
          phone: '+250782123456',
          insuranceType: 'car',
          status: 'pending',
          dateSubmitted: '2025-05-01',
          commission: '5,000 RWF',
          documents: {
            nationalId: 'ID_001.pdf',
            yellowCard: 'YC_001.pdf',
          },
        },
        {
          id: 'AG002',
          clientName: 'Jane Smith',
          phone: '+250782123457',
          insuranceType: 'motorbike',
          status: 'approved',
          dateSubmitted: '2025-05-02',
          commission: '3,000 RWF',
          documents: {
            nationalId: 'ID_002.pdf',
            yellowCard: 'YC_002.pdf',
          },
        },
        {
          id: 'AG003',
          clientName: 'Robert Katz',
          phone: '+250782123458',
          insuranceType: 'building',
          status: 'invoice_sent',
          dateSubmitted: '2025-05-03',
          commission: '12,000 RWF',
          documents: {
            nationalId: 'ID_003.pdf',
            yellowCard: 'YC_003.pdf',
          },
          payment: {
            invoiceId: 'INV_001',
            amount: '120,000 RWF',
          },
        },
        {
          id: 'AG004',
          clientName: 'Maria Garcia',
          phone: '+250782123459',
          insuranceType: 'travel',
          status: 'payment_submitted',
          dateSubmitted: '2025-05-04',
          commission: '2,500 RWF',
          documents: {
            nationalId: 'ID_004.pdf',
            yellowCard: 'YC_004.pdf',
          },
          payment: {
            invoiceId: 'INV_002',
            amount: '25,000 RWF',
            proof: 'PAY_001.pdf',
          },
        },
        {
          id: 'AG005',
          clientName: 'David Chen',
          phone: '+250782123460',
          insuranceType: 'health',
          status: 'payment_verified',
          dateSubmitted: '2025-05-05',
          commission: '4,000 RWF',
          documents: {
            nationalId: 'ID_005.pdf',
            yellowCard: 'YC_005.pdf',
          },
          payment: {
            invoiceId: 'INV_003',
            amount: '40,000 RWF',
            proof: 'PAY_002.pdf',
          },
        },
        {
          id: 'AG006',
          clientName: 'Sophie Kim',
          phone: '+250782123461',
          insuranceType: 'sme',
          status: 'completed',
          dateSubmitted: '2025-05-06',
          commission: '15,000 RWF',
          documents: {
            nationalId: 'ID_006.pdf',
            yellowCard: 'YC_006.pdf',
          },
          payment: {
            invoiceId: 'INV_004',
            amount: '150,000 RWF',
            proof: 'PAY_003.pdf',
          },
        },
      ];
      setApplications(mockData);
      setIsLoading(false);
    }, 1500);
  }, []);

  const filteredApplications = applications.filter(
    (app) =>
      (app.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (activeTab === 'all' || app.status === activeTab)
  );

  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSubmitPayment = () => {
    if (!selectedApp || !paymentProof) return;

    setIsLoading(true);
    setTimeout(() => {
      const updatedApplications = applications.map((app) => {
        if (app.id === selectedApp.id) {
          return {
            ...app,
            status: 'payment_submitted',
            payment: {
              ...app.payment,
              proof: paymentProof.name,
            },
          };
        }
        return app;
      });

      setApplications(updatedApplications);
      showToast('Payment proof submitted successfully!', 'success');
      setSelectedApp(null);
      setPaymentProof(null);
      setIsLoading(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Approved
          </span>
        );
      case 'invoice_sent':
        return (
          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
            Invoice Sent
          </span>
        );
      case 'payment_submitted':
        return (
          <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
            Payment Submitted
          </span>
        );
      case 'payment_verified':
        return (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
            Payment Verified
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            Unknown
          </span>
        );
    }
  };

  const getActionButton = (app: Application) => {
    switch (app.status) {
      case 'invoice_sent':
        return (
          <Button size="sm" onClick={() => setSelectedApp(app)}>
            Submit Payment
          </Button>
        );
      case 'completed':
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedApp(app)}
          >
            View Certificate
          </Button>
        );
      default:
        return (
          <Button size="sm" variant="text" onClick={() => setSelectedApp(app)}>
            View Details
          </Button>
        );
    }
  };

  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
  }: PaginationProps) => {
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

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
              Showing
              <span className="font-medium p-2">{(currentPage - 1) * 10 + 1}</span>{' '}
              to
              <span className="font-medium p-2">
                {Math.min(currentPage * 10, paginatedApplications.length)}
              </span>
              of
              <span className="font-medium p-2">
                {filteredApplications.length}
              </span>{' '}
              results
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px "
              aria-label="Pagination"
            >
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <span className="sr-only">First</span>«
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Previous</span>‹
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
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Next</span>›
              </Button>
              <Button
                variant="text"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-r-md"
              >
                <span className="sr-only">Last</span>»
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
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="mb-8 mt-16">
          <h1 className="text-3xl font-bold mb-2 fade-in">
            Client Applications
          </h1>
          <p className="text-gray-600 slide-up">
            Track and manage applications for your clients
          </p>
        </div>

        {/* Search and filter section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm slide-in-right">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="w-full md:w-1/3">
              <Input
                label=""
                name="search"
                placeholder="Search by client name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                variant={activeTab === 'pending' ? 'primary' : 'text'}
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'approved' ? 'primary' : 'text'}
                onClick={() => setActiveTab('approved')}
              >
                Approved
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'invoice_sent' ? 'primary' : 'text'}
                onClick={() => setActiveTab('invoice_sent')}
              >
                Invoice Sent
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'payment_submitted' ? 'primary' : 'text'}
                onClick={() => setActiveTab('payment_submitted')}
              >
                Payment Submitted
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'completed' ? 'primary' : 'text'}
                onClick={() => setActiveTab('completed')}
              >
                Completed
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insurance Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-[var(--main-blue)]">
                        #{app.id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {app.clientName}
                        </div>
                        <div className="text-sm text-gray-500">{app.phone}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {app.insuranceType.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {app.dateSubmitted}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {getActionButton(app)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(
                  filteredApplications.length / itemsPerPage
                )}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal for submitting payment */}
      {selectedApp && selectedApp.status === 'invoice_sent' && (
        <div className="fixed inset-0 bg-gray-600/50 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 fade-in">
            <h3 className="text-lg font-semibold mb-4">
              Submit Payment Proof for {selectedApp.clientName}
            </h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <p className="font-medium">Invoice Details:</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="text-gray-600">Invoice ID:</span>{' '}
                    {selectedApp.payment?.invoiceId}
                  </p>
                  <p>
                    <span className="text-gray-600">Amount:</span>{' '}
                    {selectedApp.payment?.amount}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Upload Payment Proof
                </label>
                <input
                  type="file"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[var(--main-blue)] file:text-white
                    hover:file:bg-[var(--secondary-blue)]
                  "
                />
                {paymentProof && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {paymentProof.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="text"
                  onClick={() => {
                    setSelectedApp(null);
                    setPaymentProof(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  disabled={!paymentProof || isLoading}
                >
                  {isLoading ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing details */}
      {selectedApp && selectedApp.status !== 'invoice_sent' && (
        <div className="fixed inset-0 bg-gray-600/50 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 fade-in h-[90vh] overflow-y-auto ">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Application Details</h3>
              <button
                onClick={() => setSelectedApp(null)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Application ID</p>
                  <p className="font-semibold">#{selectedApp.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Client Name</p>
                  <p className="font-semibold">{selectedApp.clientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold">{selectedApp.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Insurance Type</p>
                  <p className="font-semibold capitalize">
                    {selectedApp.insuranceType.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Date Submitted</p>
                  <p className="font-semibold">{selectedApp.dateSubmitted}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div className="mt-1">
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commission</p>
                  <p className="font-semibold text-[var(--accent-orange)]">
                    {selectedApp.commission}
                  </p>
                </div>
              </div>
            </div>

            {selectedApp.payment && (
              <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invoice ID</p>
                    <p className="font-medium">
                      {selectedApp.payment.invoiceId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium">{selectedApp.payment.amount}</p>
                  </div>
                  {selectedApp.payment.proof && (
                    <div>
                      <p className="text-sm text-gray-500">Payment Proof</p>
                      <p className="font-medium">{selectedApp.payment.proof}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">National ID</p>
                  <p className="text-xs text-gray-500">
                    {selectedApp.documents.nationalId}
                  </p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm font-medium">Yellow Card</p>
                  <p className="text-xs text-gray-500">
                    {selectedApp.documents.yellowCard}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="text" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </MainLayout>
  );
}