// app/finance/history/page.tsx
"use client"

import React, { useState } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Search, Download, RefreshCw } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface PaymentDetails {
  monthYear: string;
  data: Array<{
    id: string;
    name: string;
    region: string;
    clients: number;
    amount: number;
  }>;
}

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [showDetails, setShowDetails] = useState<PaymentDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data for payment history
  const paymentHistory = [
    { 
      id: 'PY001', 
      monthYear: 'June 2023', 
      totalAmount: 12450000, 
      agentsPaid: 342,
      details: [
        { id: 'AG001', name: 'Jean Uwimana', region: 'Kigali', clients: 45, amount: 285000 },
        { id: 'AG002', name: 'Marie Mukamana', region: 'Southern Province', clients: 38, amount: 242000 },
        { id: 'AG003', name: 'Paul Nshimiyimana', region: 'Northern Province', clients: 35, amount: 198000 },
        { id: 'AG004', name: 'Grace Uwizeyimana', region: 'Eastern Province', clients: 32, amount: 185000 },
        { id: 'AG005', name: 'David Habimana', region: 'Western Province', clients: 29, amount: 167000 },
      ]
    },
    { 
      id: 'PY002', 
      monthYear: 'May 2023', 
      totalAmount: 11850000, 
      agentsPaid: 325,
      details: [
        { id: 'AG001', name: 'Jean Uwimana', region: 'Kigali', clients: 42, amount: 265000 },
        { id: 'AG002', name: 'Marie Mukamana', region: 'Southern Province', clients: 36, amount: 232000 },
        { id: 'AG003', name: 'Paul Nshimiyimana', region: 'Northern Province', clients: 32, amount: 188000 },
        { id: 'AG004', name: 'Grace Uwizeyimana', region: 'Eastern Province', clients: 30, amount: 175000 },
        { id: 'AG005', name: 'David Habimana', region: 'Western Province', clients: 27, amount: 157000 },
      ]
    },
    // Add more months as needed
  ];

  const filteredHistory = paymentHistory.filter(item =>
    item.monthYear.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = (monthYear: string) => {
    const payment = paymentHistory.find(item => item.monthYear === monthYear);
    if (!payment) return;

    const headers = ['Agent ID', 'Name', 'Region', 'Clients', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...payment.details.map(agent => [
        agent.id,
        `"${agent.name}"`,
        `"${agent.region}"`,
        agent.clients,
        agent.amount
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
  };

  const toggleDetails = (payment: typeof paymentHistory[0]) => {
    setShowDetails(showDetails?.monthYear === payment.monthYear ? null : {
      monthYear: payment.monthYear,
      data: payment.details
    });
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
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
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
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">First</span>
                «
              </button>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
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
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className="sr-only">Next</span>
                ›
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-all border border-white/30"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                  <button 
                    onClick={() => handleExport('all')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Export
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
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month/Year</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agents Paid</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.monthYear}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {(payment.totalAmount / 1000000).toFixed(2)}M RWF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.agentsPaid}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleDetails(payment)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleExport(payment.monthYear)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Export
                        </button>
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
          </div>
        </div>
      </div>

      {/* Payment Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Payment Details</h3>
                <button 
                  onClick={() => setShowDetails(null)}
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
                  <p className="font-semibold text-gray-900">{showDetails.monthYear}</p>
                  <p className="text-gray-900 mt-1">
                    Total Paid: {showDetails.data.reduce((sum, agent) => sum + agent.amount, 0).toLocaleString()} RWF
                  </p>
                </div>
                <button 
                  onClick={() => handleExport(showDetails.monthYear)}
                  className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export This Data
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {showDetails.data.map((agent, index) => (
                      <tr key={agent.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.region}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.clients}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                          {agent.amount.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(null)}
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