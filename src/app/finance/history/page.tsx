// app/finance/history/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Search, Download, RefreshCw, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}


interface PaymentHistory {
  month: string;
  year: number;
  totalAmount: number;
  agentsPaid: number;
  isPaid: boolean;
  totalCommissionForMonth?: string;
  data?: Array<{
    agentId: string;
    agentFullName?: string;
    name: string;
    region: string;
    clients: number;
    amount: string;
  }>;
}

interface PaymentHistoryDetails {
  month: string;
  year: number;
  totalPaid: string;
  data: Array<{
    _id: string;
    name: string;
    agentId: string;
    agentFullName?: string;
    email: string;
    bankName: string;
    bankAccountNumber: string;
    phoneNumber: string;
    totalCommission: string;
  }>;
}

interface PaymentDetailsModal {
  month: string;
  year: string;
  data: Array<{
    _id: string;
    agentId: string;
    agentFullName?: string;
    name: string;
    phoneNumber: string;
    email: string;
    bankName: string;
    bankAccountNumber: string;
    totalCommission: number;
    paid: boolean;
  }>;
  isLoading: boolean;
}

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  // const [showDetails, setShowDetails] = useState<PaymentDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const itemsPerPage = 10;
  const { token } = useAuth();
  const [showPaymentDetails, setShowPaymentDetails] = useState<PaymentDetailsModal | null>(null);
  const [markingAsPaid, setMarkingAsPaid] = useState<{month: string | number, year: number} | null>(null);

  const fetchPaymentHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllCommissionSummaries?year=${selectedYear}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch payment history');
      
      const data = await response.json();
      setPaymentHistory(
        (data.results || []).map((item: PaymentHistory) => ({
          ...item,
          isPaid: item.isPaid || false
        }))
      );
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedYear]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  const filteredHistory = paymentHistory.filter(item =>
    `${item.month} ${item.year}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = async (monthYear: string) => {
    try {
      const [month, year] = monthYear.split(' ');
      const monthNumber = new Date(`${month} 1, ${year}`).getMonth() + 1;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyCommissionHistoryDetails?month=${monthNumber}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch payment details');
      
      const data = await response.json();
      
      const headers = ['Agent ID', 'Agent Name', 'Phone', 'Email', 'Bank Name', 'Account Number', 'Commission'];
      const csvContent = [
        headers.join(','),
        ...data.data.map((agent: PaymentHistoryDetails['data'][0]) => [
          agent.agentId,
          `"${agent.agentFullName || agent.name}"`,
          agent.phoneNumber || '',
          agent.email || '',
          agent.bankName || '',
          agent.bankAccountNumber || '',
          agent.totalCommission
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${monthYear.replace(' ', '_')}_ezinsure_payment_details.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting payment details:', error);
    }
  };

  const markAsPaid = async (month: string | number, year: number) => {
    let monthNumber;
    
    // Check if trying to mark current month as paid
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Improved month conversion logic
    if (typeof month === 'string') {
      // Handle month names like "January", "February", etc.
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
      if (monthIndex !== -1) {
        monthNumber = monthIndex + 1;
      } else {
        // Try to parse as number
        monthNumber = parseInt(month);
        if (isNaN(monthNumber)) {
          console.error('Invalid month format:', month);
          setMarkingAsPaid(null);
          return;
        }
      }
    } else {
      monthNumber = Number(month);
      if (isNaN(monthNumber)) {
        console.error('Invalid month number:', month);
        setMarkingAsPaid(null);
        return;
      }
    }
    
    // Check if trying to mark current month as paid
    if (monthNumber === currentMonth && year === currentYear) {
      alert('Cannot mark current month as paid. You can only mark past months as paid.');
      return;
    }
    
    // Set loading state after validation
    setMarkingAsPaid({ month, year });
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/markAsPaid?month=${monthNumber}&year=${year}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to mark payment as paid' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Refresh the data
      await fetchPaymentHistory();
      
      // Show success message (you can add a toast system here)
      alert(`Successfully marked ${month} ${year} as paid!`);
      
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      // Show error message to user
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to mark payment as paid'}`);
    } finally {
      setMarkingAsPaid(null);
    }
  };

  const viewPaymentDetails = async (month: string, year: number) => {
    try {
      // Show modal immediately with loading state
      setShowPaymentDetails({
        month,
        year: year.toString(),
        data: [],
        isLoading: true
      });
      
      // Convert month name to number if needed
      const monthNumber = new Date(`${month} 1, ${year}`).getMonth() + 1;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyCommissionHistoryDetails?month=${monthNumber}&year=${year}`, 
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch payment details');
      
      const data: PaymentHistoryDetails = await response.json();
      
      // Convert the data to match what the modal expects
      const formattedData = data.data.map(agent => ({
        _id: agent._id,
        agentId: agent.agentId,
        agentFullName: agent.agentFullName || agent.name,
        name: agent.name,
        phoneNumber: agent.phoneNumber || '',
        email: agent.email || '',
        bankName: agent.bankName || '',
        bankAccountNumber: agent.bankAccountNumber || '',
        totalCommission: typeof agent.totalCommission === 'string' 
          ? parseFloat(agent.totalCommission.replace(/[^0-9.-]+/g,"")) 
          : typeof agent.totalCommission === 'number' 
            ? agent.totalCommission 
            : 0,
        paid: true
      }));
      
      setShowPaymentDetails({
        month: data.month,
        year: data.year.toString(),
        data: formattedData,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching payment details:', error);
      setShowPaymentDetails(null);
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
      <div className="flex items-center justify-between mt-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
        
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredHistory.length)}</span> of{' '}
              <span className="font-medium">{filteredHistory.length}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="sr-only">First</span>
                «
              </button>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="sr-only">Previous</span>
                ‹
              </button>
              
              {startPage > 1 && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              {pages.map(page => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-pointer ${
                    currentPage === page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              {endPage < totalPages && (
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                  ...
                </span>
              )}
              
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="sr-only">Next</span>
                ›
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <span className="sr-only">Last</span>
                »
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        
        {/* Header Section */}
        <div className="mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">Payment History</h1>
                <p className="text-blue-100 text-lg">Past months commission payments to agents</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {[2025, 2024, 2023, 2022, 2021].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={fetchPaymentHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-all border border-white/30 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading payment history...</p>
                </div>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 text-gray-400">
                  <Calendar className="w-full h-full" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No payment history</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Payment history will appear here once payments are marked as paid.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Year</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Month</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Agents Count</th>
            <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedHistory.map((payment) => (
                        <tr key={`${payment.year}-${payment.month}`} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-[10px] font-medium text-gray-900">{payment.year}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-[10px] font-medium text-gray-900">{payment.month}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-900 font-semibold">
                            {payment.totalAmount.toLocaleString()} RWF
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{payment.agentsPaid}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-[9px] leading-5 font-semibold rounded-full ${
                              payment.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {payment.isPaid ? 'Paid' : 'Pending'}
                          </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-medium">
                            <button
                              onClick={() => viewPaymentDetails(payment.month, payment.year)}
                              className="text-blue-600 hover:text-blue-900 cursor-pointer"
                            >
                              View
                            </button>
                            {!payment.isPaid && (
                              markingAsPaid && markingAsPaid.month === payment.month && markingAsPaid.year === payment.year ? (
                                <span className="inline-block w-6 h-6 align-middle">
                                  <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-green-200 border-t-green-600"></span>
                                </span>
                              ) : (
                                <button
                                  onClick={() => markAsPaid(payment.month, payment.year)}
                                  className="ml-2 text-green-600 hover:text-green-900 cursor-pointer"
                                >
                                  Mark as Paid
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredHistory.length / itemsPerPage)}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showPaymentDetails && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Payment Details</h3>
                <button 
                  onClick={() => setShowPaymentDetails(null)}
                  className="text-gray-400 cursor-pointer hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-gray-600">Showing payment details for</p>
                  <p className="font-semibold text-gray-900">{showPaymentDetails.month} {showPaymentDetails.year}</p>
                  <p className="text-gray-900 mt-1">
                    Total Paid: {showPaymentDetails.data.reduce((sum, agent) => sum + agent.totalCommission, 0).toLocaleString()} RWF
                  </p>
                </div>
                <button 
                  onClick={() => handleExport(`${showPaymentDetails.month} ${showPaymentDetails.year}`)}
                  className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export This Data
                </button>
              </div>
              
              <div className="overflow-x-auto">
                {showPaymentDetails.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                      <p className="text-gray-600">Loading payment details...</p>
                    </div>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Bank Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
                        <th scope="col" className="px-6 py-3 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {showPaymentDetails.data.map((agent, index) => (
                        <tr key={agent._id} className="hover:bg-gray-50">
                                                  <td className="px-6 py-4 whitespace-nowrap text-[10px] font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{agent.agentFullName || agent.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{agent.phoneNumber || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{agent.bankName || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-500">{agent.bankAccountNumber || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-gray-900 font-semibold text-right">
                          {agent.totalCommission.toLocaleString()} RWF
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowPaymentDetails(null)}
                  className="px-4 py-2 border cursor-pointer border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PaymentHistory;