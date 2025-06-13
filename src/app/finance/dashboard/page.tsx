// app/finance/dashboard/page.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Search, Download, RefreshCw, Calendar, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { MainLayout } from '@/components/ui/main-layout';

interface AgentCommission {
  _id: string;
  agentId: string;
  name: string;
  totalCommission: number;
  phoneNumber: string;
  email: string;
  bankName: string;
  bankAccountNumber: string;
  paid?: boolean;
  paymentDate?: string;
}

interface PaymentHistory {
  year: string;
  month: string;
  totalCommissionForMonth: string;
  data: AgentCommission[];
  paid?: boolean;
}

interface CurrentMonthData {
  month: string;
  data: AgentCommission[];
}

const FinanceDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // const [dateRange, setDateRange] = useState({
  //   start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  //   end: new Date()
  // });
  const [showPaymentDetails, setShowPaymentDetails] = useState<{month: string, year: string, data: AgentCommission[]} | null>(null);
  const [currentMonthData, setCurrentMonthData] = useState<CurrentMonthData>({
    month: new Date().toLocaleString('default', { month: 'long' }),
    data: []
  });
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);

  // Calculate current month's total commission
  const currentMonthTotal = currentMonthData.data.reduce((sum, agent) => sum + agent.totalCommission, 0);
  const currentMonthPaidAgents = currentMonthData.data.filter(agent => agent.paid).length;
  const currentMonthPendingAgents = currentMonthData.data.filter(agent => !agent.paid).length;
  const avgCommission = currentMonthData.data.length > 0 ? currentMonthTotal / currentMonthData.data.length : 0;

  // Fetch current month's data
  useEffect(() => {
    const fetchCurrentMonthData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllAgentsMonthlyCommissions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        setCurrentMonthData({
          month: new Date().toLocaleString('default', { month: 'long' }),
          data: data.data.map((agent: AgentCommission) => {
            return ({
              ...agent,
              paid: false // Initially set all agents as unpaid
            });
          })
        });
        
        // For now, using mock data for history
        setPaymentHistory([
          {
            year: "2025",
            month: "May",
            totalCommissionForMonth: "11850000",
            data: [],
            paid: true
          },
          {
            year: "2025",
            month: "April",
            totalCommissionForMonth: "10520000",
            data: [],
            paid: true
          },
          {
            year: "2025",
            month: "March",
            totalCommissionForMonth: "9850000",
            data: [],
            paid: true
          }
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentMonthData();
  }, []);

  const statsCards = [
    {
      title: 'Total Commission',
      value: `${(currentMonthTotal / 1000000).toFixed(2)}M RWF`,
      change: '+0%',
      changeType: 'increase',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      subtitle: 'Current month'
    },
    {
      title: 'Agents Paid',
      value: currentMonthPaidAgents,
      change: '+0%',
      changeType: 'increase',
      icon: <Users className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'This month'
    },
    {
      title: 'Pending Payments',
      value: currentMonthPendingAgents,
      change: '+0%',
      changeType: 'increase',
      icon: <Users className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      subtitle: 'Awaiting processing'
    },
    {
      title: 'Avg Commission',
      value: `${avgCommission.toLocaleString()} RWF`,
      change: '+0%',
      changeType: 'increase',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: 'Per agent'
    }
  ];

  const filteredAgents = currentMonthData.data.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.agentId.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleExportPayments = () => {
    // Export current month's data as CSV
    const headers = ['Agent ID', 'Name', 'Phone', 'Email', 'Bank Name', 'Account Number', 'Commission'];
    const csvContent = [
      headers.join(','),
      ...currentMonthData.data.map(agent => [
        agent.agentId,
        `"${agent.name}"`,
        agent.phoneNumber,
        agent.email,
        agent.bankName,
        agent.bankAccountNumber,
        agent.totalCommission
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${new Date().getFullYear()}_${new Date().toLocaleString('default', { month: 'long' })}_ezinsure_monthly_commissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHistoryPayments = (month: string, year: string) => {
    // Find the history item to export
    const historyItem = paymentHistory.find(item => item.month === month && item.year === year);
    if (!historyItem) return;

    const headers = ['Agent ID', 'Name', 'Phone', 'Email', 'Bank Name', 'Account Number', 'Commission'];
    const csvContent = [
      headers.join(','),
      ...historyItem.data.map(agent => [
        agent.agentId,
        `"${agent.name}"`,
        agent.phoneNumber,
        agent.email,
        agent.bankName,
        agent.bankAccountNumber,
        agent.totalCommission
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${year}_${month}_ezinsure_monthly_commissions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const markAsPaid = async (month?: string, year?: string) => {
    if (month && year) {
      // Mark a historical month as paid
      setPaymentHistory(paymentHistory.map(item => 
        item.month === month && item.year === year ? {...item, paid: true} : item
      ));
    } else {
      // Mark current month as paid
      setCurrentMonthData({
        ...currentMonthData,
        data: currentMonthData.data.map(agent => ({
          ...agent,
          paid: true,
          paymentDate: new Date().toISOString().split('T')[0]
        }))
      });
      
      // Add to payment history
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      const currentYear = new Date().getFullYear().toString();
      
      setPaymentHistory([{
        year: currentYear,
        month: currentMonth,
        totalCommissionForMonth: currentMonthTotal.toString(),
        data: [...currentMonthData.data],
        paid: true
      }, ...paymentHistory]);
    }
  };

  const viewPaymentDetails = (month: string, year: string) => {
    const historyItem = paymentHistory.find(item => item.month === month && item.year === year);
    if (historyItem) {
      setShowPaymentDetails({
        month,
        year,
        data: historyItem.data
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Finance Dashboard</h2>
          <p className="text-gray-600">Fetching commission data...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout containerClass="p-0" fullWidth>
      <div className="container mx-auto px-4 py-8">
        <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        
        {/* Header Section */}
        <div className="mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">Finance Dashboard</h1>
                <p className="text-blue-100 text-lg">Commission tracking and payment processing</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
                    className="px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                  
                  <button className="flex items-center gap-2 px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 hover:bg-white transition-colors">
                    <Calendar className="w-4 h-4" />
                    Select Date Range
                  </button>
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
                    onClick={handleExportPayments}
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((card, index) => (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform`}>
                    <div className={card.textColor}>{card.icon}</div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${
                    card.changeType === 'increase' ? 'text-emerald-600 bg-emerald-50' :
                    card.changeType === 'decrease' ? 'text-red-600 bg-red-50' :
                    'text-gray-600 bg-gray-50'
                  }`}>
                    {card.changeType === 'increase' ? <ArrowUpRight className="w-3 h-3" /> :
                    card.changeType === 'decrease' ? <ArrowDownRight className="w-3 h-3" /> : null}
                    {card.change}
                  </div>
                </div>
                
                <h3 className="text-gray-500 text-sm font-medium mb-1">{card.title}</h3>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-gray-600 text-sm">{card.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Commissions Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Agent Commissions</h3>
                <p className="text-gray-600">Current month commission details</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <button 
                  onClick={() => markAsPaid()}
                  disabled={currentMonthPendingAgents === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                    currentMonthPendingAgents === 0 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Mark as Paid
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {filteredAgents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 text-gray-400">
                    <Users className="w-full h-full" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No agents found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {searchTerm ? 'No agents match your search criteria.' : 'No agents have been added for this month.'}
                  </p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAgents.map((agent) => (
                      <tr key={agent._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.phoneNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.bankName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.bankAccountNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {agent.totalCommission.toLocaleString()} RWF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            agent.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {agent.paid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredAgents.length}</span> of{' '}
                <span className="font-medium">{currentMonthData.data.length}</span> agents
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

          {/* Payment History Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Payment History</h3>
                <p className="text-gray-600">Past months commission payments</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {paymentHistory.length === 0 ? (
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agents Count</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentHistory.map((payment) => (
                      <tr key={`${payment.year}-${payment.month}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{payment.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {(parseInt(payment.totalCommissionForMonth) / 1000000).toFixed(2)}M RWF
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{payment.data.length}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {payment.paid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => viewPaymentDetails(payment.month, payment.year)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View
                          </button>
                          <button
                            onClick={() => exportHistoryPayments(payment.month, payment.year)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Export
                          </button>
                          {!payment.paid && (
                            <button
                              onClick={() => markAsPaid(payment.month, payment.year)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark as Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
              
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600">Showing payment details for</p>
                    <p className="font-semibold text-gray-900">{showPaymentDetails.month} {showPaymentDetails.year}</p>
                    <p className="text-gray-900 mt-1">
                      Total Paid: {(showPaymentDetails.data.reduce((sum, agent) => sum + agent.totalCommission, 0) / 1000000).toFixed(2)}M RWF
                    </p>
                  </div>
                  <button 
                    onClick={() => exportHistoryPayments(showPaymentDetails.month, showPaymentDetails.year)}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export This Data
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {showPaymentDetails.data.map((agent) => (
                      <tr key={agent._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.agentId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.phoneNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.bankName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.bankAccountNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {agent.totalCommission.toLocaleString()} RWF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

export default FinanceDashboard;