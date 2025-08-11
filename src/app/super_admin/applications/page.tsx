'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { DocumentViewer } from '@/components/ui/document-viewer';
import { useAuth } from '@/context/AuthContext';

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
  reasonForPaymentRejection?: string;
  vehicleType?: string;
  vehicleAge?: string;
  province?: string;
  district?: string;
  sector?: string;
  deviceInfo?: {
    deviceType: string;
    os: string;
    browser: string;
    ipAddress: string;
    userAgent: string;
    city: string;
    country: string;
    regionName: string;
  };
  locationInfo?: {
    latitude: string;
    longitude: string;
    city: string;
    region: string;
    country: string;
  };
  createdAt: string;
  contract?: string;
  receipt?: string;
  ebm?: string;
  insuranceEndAt?: string;
  otp?: string;
  otpExpires?: string;
}

export default function SuperAdminApplicationsPage() {
  const { showToast, ToastContainer } = useToast();
  const { token } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingDocument, setViewingDocument] = useState<{
    name: string;
    path: string;
  } | null>(null);
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

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getApplications`, {
          headers: {
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

  // Filter applications based on search query, status, and date range
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || app.status.toLowerCase() === selectedStatus;
    
    const matchesDateRange = (() => {
      if (!startDate && !endDate) return true;
      
      const appDate = new Date(app.submittedAt);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && end) {
        return appDate >= start && appDate <= end;
      } else if (start) {
        return appDate >= start;
      } else if (end) {
        return appDate <= end;
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
        doc.text(`Status Filter: ${selectedStatus.replace('_', ' ')}`, 14, filterY);
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
      
      // Prepare table data with text truncation for better fit
      const tableData = filteredApplications.map((app, index) => [
        (index + 1).toString(),
        app.fullName.length > 28 ? app.fullName.substring(0, 28) + '...' : app.fullName,
        app.email.length > 32 ? app.email.substring(0, 32) + '...' : app.email,
        app.insuranceCategory.length > 22 ? app.insuranceCategory.substring(0, 22) + '...' : app.insuranceCategory,
        app.insuranceType.length > 22 ? app.insuranceType.substring(0, 22) + '...' : app.insuranceType,
        (app.agentFullName || 'Client').length > 22 ? (app.agentFullName || 'Client').substring(0, 22) + '...' : (app.agentFullName || 'Client'),
        app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF',
        app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF',
        app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF',
        new Date(app.submittedAt).toLocaleDateString(),
        app.status.replace('_', ' ').toUpperCase()
      ]);
      
      // Add table
      autoTable.default(doc, {
        head: [
          ['#', 'Client Name', 'Email', 'Category', 'Type', 'Performed By', 'Amount', 'Company Comm.', 'Agent Comm.', 'Date', 'Status']
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
          fillColor: [10, 37, 64], // Dark blue header
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
          4: { cellWidth: 25, halign: 'left' }, // Type
          5: { cellWidth: 25, halign: 'left' }, // Agent
          6: { cellWidth: 25, halign: 'right' }, // Amount
          7: { cellWidth: 25, halign: 'right' }, // Company Comm
          8: { cellWidth: 25, halign: 'right' }, // Agent Comm
          9: { cellWidth: 20, halign: 'center' }, // Date
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
          <h1 className="text-3xl font-bold mb-2 fade-in">Insurance Applications</h1>
          <p className="text-gray-600 slide-up">View all client insurance applications</p>
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
              {selectedStatus !== 'all' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">Status: {selectedStatus.replace('_', ' ')}</span>}
              {(startDate || endDate) && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Date Range: {startDate || 'beginning'} - {endDate || 'now'}</span>}
            </div>
            <div className="flex gap-2">
              {filteredApplications.length > 0 && (
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
                <span className="ml-2 text-gray-500">• Status: {selectedStatus.replace('_', ' ')}</span>
              )}
              {(startDate || endDate) && (
                <span className="ml-2 text-gray-500">• Date Range: {startDate || 'beginning'} - {endDate || 'now'}</span>
              )}
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
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance Category</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insurance End Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Commission</th>
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Commission</th>
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
          <div className="text-xs text-gray-500">{app.email ? app.email : 'Empty'}</div>
        </div>
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900 capitalize">{app.insuranceCategory}</div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.insuranceEndAt ? new Date(app.insuranceEndAt).toLocaleDateString() : 'N/A'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.agentFullName || 'Client'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.amount ? `${app.amount.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.companyCommission ? `${app.companyCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      <div className="text-xs text-gray-900">
        {app.agentCommission ? `${app.agentCommission.toLocaleString()} RWF` : '0 RWF'}
      </div>
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap text-gray-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
    <td className="px-4 py-4 text-xs whitespace-nowrap">
      {getStatusBadge(app.status)}
    </td>
    <td className="px-4 py-4 text-xs whitespace-nowrap font-medium">
      <div className="flex space-x-2">
        <Button 
          size="xs" 
          variant="text"
          onClick={() => {
            setSelectedApp(app);
          }}
        >
          View Details
        </Button>
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

      {/* Modal for viewing details */}
      {selectedApp && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50">
          <div className="max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl p-8 w-full max-w-4xl mx-4 fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="bg-[var(--light-gray)] p-6 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Application ID</p>
                  <p className="font-semibold text-lg">#{selectedApp.applicationNumber}</p>
                </div>
                <div>
                  {getStatusBadge(selectedApp.status)}
                </div>
              </div>
            </div>
            
            {/* Enhanced Application Details Section */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Full Name</p>
                    <p className="font-medium text-gray-900">{selectedApp.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{selectedApp.email ? selectedApp.email : 'Empty'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Phone</p>
                    <p className="font-medium text-gray-900">{selectedApp.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                    <p className="font-medium text-gray-900">{new Date(selectedApp.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              {/* Address Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <p className="font-medium text-gray-900">{selectedApp.address}</p>
                  </div>
                  {selectedApp.province && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Province</p>
                      <p className="font-medium text-gray-900">{selectedApp.province}</p>
                    </div>
                  )}
                  {selectedApp.district && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">District</p>
                      <p className="font-medium text-gray-900">{selectedApp.district}</p>
                    </div>
                  )}
                  {selectedApp.sector && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Sector</p>
                      <p className="font-medium text-gray-900">{selectedApp.sector}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Insurance Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Insurance Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Insurance Category</p>
                    <p className="font-medium text-gray-900">{selectedApp.insuranceCategory}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Insurance Type</p>
                    <p className="font-medium text-gray-900">{selectedApp.insuranceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Duration</p>
                    <p className="font-medium text-gray-900">{selectedApp.insuranceDuration}</p>
                  </div>
                  {selectedApp.insuranceEndAt && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Insurance End Date</p>
                      <p className="font-medium text-gray-900">{new Date(selectedApp.insuranceEndAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Agent</p>
                    <p className="font-medium text-gray-900">{selectedApp.agentFullName || 'Client'}</p>
                  </div>
                  {selectedApp.amount && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Amount</p>
                      <p className="font-medium text-gray-900">{selectedApp.amount.toLocaleString()} RWF</p>
                    </div>
                  )}
                  {selectedApp.insuranceProvider && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Insurance Provider</p>
                      <p className="font-medium text-gray-900">{selectedApp.insuranceProvider}</p>
                    </div>
                  )}
                  {selectedApp.isCOMESA !== undefined && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">COMESA Coverage</p>
                      <p className="font-medium text-gray-900">{selectedApp.isCOMESA ? 'Yes' : 'No'}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vehicle Information (if applicable) */}
              {(selectedApp.insuranceCategory === 'Car Insurance' || selectedApp.insuranceCategory === 'MotorBike Insurance') && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Vehicle Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedApp.vehicleType && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Vehicle Type</p>
                        <p className="font-medium text-gray-900">{selectedApp.vehicleType}</p>
                      </div>
                    )}
                    {selectedApp.vehicleAge && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Vehicle Year</p>
                        <p className="font-medium text-gray-900">{selectedApp.vehicleAge}</p>
                      </div>
                    )}
                    {selectedApp.vehicleUse && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Vehicle Use</p>
                        <p className="font-medium text-gray-900">
                          {selectedApp.vehicleUse === 'Other' 
                            ? selectedApp.otherVehicleUse 
                            : selectedApp.vehicleUse}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Commission Information (if available) */}
              {(selectedApp.companyCommission || selectedApp.agentCommission) && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4">Commission Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedApp.companyCommission && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Company Commission</p>
                        <p className="font-medium text-gray-900">{selectedApp.companyCommission.toLocaleString()} RWF</p>
                      </div>
                    )}
                    {selectedApp.agentId && selectedApp.agentCommission && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Agent Commission</p>
                        <p className="font-medium text-gray-900">{selectedApp.agentCommission.toLocaleString()} RWF</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Device Information (always show) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Device Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Device Type</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.deviceType || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Operating System</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.os || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Browser</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.browser || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">IP Address</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.ipAddress || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">User Agent</p>
                    <p className="font-medium text-gray-900 break-all">{selectedApp.deviceInfo?.userAgent || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">City</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.city || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Country</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.country || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Region</p>
                    <p className="font-medium text-gray-900">{selectedApp.deviceInfo?.regionName || 'Unknown'}</p>
                  </div>
                </div>
              </div>
              
              {/* Location Information (always show) */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Location Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">City</p>
                    <p className="font-medium text-gray-900">{selectedApp.locationInfo?.city || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Region</p>
                    <p className="font-medium text-gray-900">{selectedApp.locationInfo?.region || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Country</p>
                    <p className="font-medium text-gray-900">{selectedApp.locationInfo?.country || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Coordinates</p>
                    <p className="font-medium text-gray-900">
                      {(selectedApp.locationInfo?.latitude && selectedApp.locationInfo?.longitude)
                        ? `${selectedApp.locationInfo.latitude}, ${selectedApp.locationInfo.longitude}`
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rejection Reason (if exists) */}
            {(selectedApp.rejectionReason) && (
              <div className="mt-6 bg-red-50 p-6 rounded-lg border border-red-100">
                <h4 className="font-medium text-red-700 mb-2">Rejection Reason</h4>
                <p className="text-red-600">{selectedApp.rejectionReason}</p>
              </div>
            )}
            
            {/* Reason For Payment rejection (if exists) */}
            {(selectedApp.reasonForPaymentRejection) && (
              <div className="mt-6 bg-red-50 p-6 rounded-lg border border-red-100">
                <h4 className="font-medium text-red-700 mb-2">Reason For Payment Rejection</h4>
                <p className="text-red-600">{selectedApp.reasonForPaymentRejection}</p>
              </div>
            )}
            
            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Submitted At</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedApp.submittedAt).toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Created At</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedApp.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {/* Documents Section */}
            <div className="bg-[var(--light-gray)] p-6 rounded-lg mt-6">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setViewingDocument({
                    name: 'National ID / Passport',
                    path: selectedApp.nationalID
                  })}
                >
                  <p className="text-sm font-medium text-gray-900">National ID / Passport</p>
                  <p className="text-xs text-gray-500 mt-1">View Document</p>
                </button>
                
                <button 
                  className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setViewingDocument({
                    name: 'Yellow Card',
                    path: selectedApp.yellowCard
                  })}
                >
                  <p className="text-sm font-medium text-gray-900">Yellow Card</p>
                  <p className="text-xs text-gray-500 mt-1">View Document</p>
                </button>
                
                {selectedApp.pastInsuranceCertificate && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Past Insurance Certificate',
                      path: selectedApp.pastInsuranceCertificate || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Past Insurance</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                
                {selectedApp.proofOfPayment && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Proof of Payment',
                      path: selectedApp.proofOfPayment || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Proof of Payment</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                
                {selectedApp.invoice && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Quotation / Invoice',
                      path: selectedApp.invoice || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Quotation / Invoice</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                
                {selectedApp.insuranceCertificate && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Insurance Certificate',
                      path: selectedApp.insuranceCertificate || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Insurance Certificate</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                {selectedApp.contract && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Contract',
                      path: selectedApp.contract || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Contract</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                {selectedApp.receipt && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'Receipt',
                      path: selectedApp.receipt || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">Receipt</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
                {selectedApp.ebm && (
                  <button 
                    className="bg-white p-4 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setViewingDocument({
                      name: 'EBM',
                      path: selectedApp.ebm || ''
                    })}
                  >
                    <p className="text-sm font-medium text-gray-900">EBM</p>
                    <p className="text-xs text-gray-500 mt-1">View Document</p>
                  </button>
                )}
              </div>
            </div>
            
            {/* Invoice & Payment Information (if available) */}
            {selectedApp.invoice && (
              <div className="bg-[var(--light-gray)] p-6 rounded-lg mt-6">
                <h4 className="text-base font-semibold text-gray-900 mb-4">Invoice & Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedApp.amount && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Amount</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedApp.amount} RWF</p>
                    </div>
                  )}
                  {selectedApp.paymentInstructions && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Payment Instructions</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedApp.paymentInstructions}</p>
                    </div>
                  )}
                  {selectedApp.transactionId && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">Transaction ID</p>
                      <p className="text-sm text-gray-500 mt-1">{selectedApp.transactionId}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
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

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}