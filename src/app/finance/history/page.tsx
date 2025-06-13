// app/finance/history/page.tsx
"use client"

import React, { useState } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Search, Filter } from 'lucide-react';

const PaymentHistory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2023');
  const [showDetails, setShowDetails] = useState<string | null>(null);

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

  const handleExport = (monthYear: string) => {
    // In a real app, this would trigger an export API call
    alert(`Exporting data for ${monthYear}...`);
  };

  const toggleDetails = (id: string) => {
    setShowDetails(showDetails === id ? null : id);
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History</h1>
            <p className="text-gray-600">Past months commission payments to agents</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors text-sm">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
              {filteredHistory.map((payment) => (
                <React.Fragment key={payment.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.monthYear}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {(payment.totalAmount / 1000000).toFixed(2)}M RWF
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.agentsPaid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleDetails(payment.id)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        {showDetails === payment.id ? 'Hide Details' : 'View Details'}
                      </button>
                      <button
                        onClick={() => handleExport(payment.monthYear)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                  
                  {showDetails === payment.id && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 bg-gray-50">
                        <div className="bg-white rounded-lg shadow-sm p-4">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Details - {payment.monthYear}</h4>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent ID</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</th>
                                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {payment.details.map((agent) => (
                                <tr key={agent.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{agent.id}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{agent.name}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{agent.region}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{agent.clients}</td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                                    {agent.amount.toLocaleString()} RWF
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to <span className="font-medium">2</span> of{' '}
            <span className="font-medium">2</span> payments
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PaymentHistory;