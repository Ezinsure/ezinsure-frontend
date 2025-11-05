"use client"

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, EyeOff, Search } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/ui/main-layout';
import type { TooltipProps } from 'recharts';
import { useAuth } from '@/context/AuthContext';


const Dashboard = () => {
  const { user, token } = useAuth();
  const [showCommissionChart, setShowCommissionChart] = useState(true);
  // Remove global isLoading state
  // const [isLoading, setIsLoading] = useState(true);

  // INSURANCE_COLORS mapping (copied from admin dashboard)
  const INSURANCE_COLORS: Record<string, string> = {
    'Car Insurance': '#3B82F6',
    'Health Insurance': '#10B981',
    'Travel Insurance': '#F59E0B',
    'Building Insurance': '#EF4444',
    'Fire Insurance Coverage': '#8B5CF6',
    'MotorBike Insurance': '#6366F1',
  };

  // getStatusBadge helper (copied from admin dashboard)
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-medium">Pending</span>;
      case 'application_approved':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-medium">Application Approved</span>;
      case 'waiting_for_user_action':
        return <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[9px] font-medium">Waiting for User Action</span>;
      case 'invoice_sent':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-medium">Invoice Sent</span>;
      case 'review_payment':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[9px] font-medium">Review Payment</span>;
      case 'payment_verified':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-medium">Payment Verified</span>;
      case 'insurance_issued':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-medium">Insurance Issued</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[9px] font-medium">{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>;
    }
  };

  // Define types for the data
  interface Application {
    _id: string;
    applicationNumber: string;
    status: string;
    insuranceCategory: string;
    insuranceType: string;
    amount?: number;
    submittedAt: string;
    agent?: {
      id: string;
      fullName: string;
      email: string;
    } | null;
    admin?: {
      id: string;
      fullName: string;
      email: string;
    };
    client: {
      id: string;
      fullName: string;
      email: string;
      phoneNumber: string;
      province: string;
      district: string;
    };
    vehicle?: {
      id: string;
      plateNumber: string;
    };
  }
  interface RecentApplicationAPI {
    _id: string;
    applicationNumber: string;
    fullName: string;
    insuranceCategory: string;
    insuranceType: string;
    amount?: number;
    status: string;
    submittedAt?: string;
    client?: {
      fullName: string;
      email: string;
      phoneNumber: string;
      province: string;
      district: string;
    };
    vehicle?: {
      plateNumber?: string;
    };
  }
  interface InsuranceDistribution {
    name: string;
    value: number;
    color: string;
    percent: number;
  }
  interface WeeklyStat {
    day: string;
    clients: number;
    commission: number;
  }
  interface MonthlyStat {
    month: string;
    clients: number;
    commission: number;
  }

  // Define types for API data
  interface InsuranceDistributionAPI {
    category: string;
    count: number;
  }

  // Add state for fetched data
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [insuranceDistribution, setInsuranceDistribution] = useState<InsuranceDistribution[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [isInsuranceDistributionLoading, setIsInsuranceDistributionLoading] = useState(true);
  const [isRecentApplicationsLoading, setIsRecentApplicationsLoading] = useState(true);
  const [isWeeklyStatsLoading, setIsWeeklyStatsLoading] = useState(true);
  const [isMonthlyStatsLoading, setIsMonthlyStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('all');

  // Fetch data on mount
  useEffect(() => {
    if (!user?._id || !token) return;

    // Fetch recent applications
    const fetchRecentApplications = async () => {
      setIsRecentApplicationsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRecentAgentApplications?agentId=${user._id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("Recent: ", data)
        // Map API data to the expected structure for the dashboard
        const mapped = (data.data || []).map((item: RecentApplicationAPI) => ({
          _id: item._id || '',
          applicationNumber: item.applicationNumber || '',
          status: item.status,
          insuranceCategory: item.insuranceCategory,
          insuranceType: item.insuranceType,
          amount: item.amount,
          submittedAt: item.submittedAt || '',
          agent: null,
          admin: undefined,
          client: {
            id: '',
            fullName: item.client?.fullName || item.fullName,
            email: item.client?.email || '',
            phoneNumber: item.client?.phoneNumber || '',
            province: item.client?.province || '',
            district: item.client?.district || '',
          },
          vehicle: item.vehicle ? {
            id: '',
            plateNumber: item.vehicle.plateNumber || '',
          } : undefined,
        }));
        setRecentApplications(mapped);
      } catch (error) {
        console.error('Error fetching recent applications:', error);
        setRecentApplications([]);
      } finally {
        setIsRecentApplicationsLoading(false);
      }
    };

    // Fetch insurance distribution
    const fetchInsuranceDistribution = async () => {
      setIsInsuranceDistributionLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAgentInsuranceDistribution?agentId=${user._id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const dist: InsuranceDistributionAPI[] = data.data || [];
        const total = dist.reduce((sum, item) => sum + (item.count || 0), 0);
        setInsuranceDistribution(
          dist.map((item) => ({
            name: item.category,
            value: item.count,
            color: INSURANCE_COLORS[item.category] || '#A3A3A3',
            percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
          }))
        );
      } catch (error) {
        console.error('Error fetching insurance distribution:', error);
        setInsuranceDistribution([]);
      } finally {
        setIsInsuranceDistributionLoading(false);
      }
    };

    // Fetch weekly stats
    const fetchWeeklyStats = async () => {
      setIsWeeklyStatsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getWeeklyAgentStats?agentId=${user._id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("Data for week: ", data)
        setWeeklyStats(data.data || []);
      } catch (error) {
        console.error('Error fetching weekly stats:', error);
        setWeeklyStats([]);
      } finally {
        setIsWeeklyStatsLoading(false);
      }
    };

    // Fetch monthly stats
    const fetchMonthlyStats = async () => {
      setIsMonthlyStatsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyAgentStats?agentId=${user._id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setMonthlyStats(data.data || []);
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
        setMonthlyStats([]);
      } finally {
        setIsMonthlyStatsLoading(false);
      }
    };

    fetchRecentApplications();
    fetchInsuranceDistribution();
    fetchWeeklyStats();
    fetchMonthlyStats();
  }, [user?._id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add a combined loading state
  const isAnyLoading = isWeeklyStatsLoading || isMonthlyStatsLoading || isRecentApplicationsLoading || isInsuranceDistributionLoading;

  // Filter for recent applications based on search and type
  const filteredApplications = recentApplications.filter((app: Application) => {
    const matchesSearch =
      app.client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.insuranceCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.insuranceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedInsuranceType === 'all' ||
      (selectedInsuranceType === 'car' && app.insuranceCategory.toLowerCase().includes('car')) ||
      (selectedInsuranceType === 'health' && app.insuranceCategory.toLowerCase().includes('health')) ||
      (selectedInsuranceType === 'travel' && app.insuranceCategory.toLowerCase().includes('travel')) ||
      (selectedInsuranceType === 'building' && app.insuranceCategory.toLowerCase().includes('building')) ||
      (selectedInsuranceType === 'fire' && app.insuranceCategory.toLowerCase().includes('fire')) ||
      (selectedInsuranceType === 'motorbike' && app.insuranceCategory.toLowerCase().includes('motorbike'));
    return matchesSearch && matchesType;
  });


const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200">
        <p className="text-gray-600 text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">
              {entry.dataKey === 'commission' ? 
                `${entry.value?.toLocaleString()} RWF` : 
                `${entry.value} clients`
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

  // Replace the global isLoading check with isAnyLoading
  if (isAnyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout containerClass="p-0" fullWidth>
    <div className="container mx-auto px-4 py-8">
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        
      {/* Header Section */}
      <div className="bg-white mt-12 shadow-sm ">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your business.</p>
            </div>
            
            
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {/* Remove statsConfig, statsData, and related stats cards rendering */}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Performance Overview</h3>
                <p className="text-gray-600 text-sm">Commission and client trends over time</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCommissionChart(!showCommissionChart)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showCommissionChart ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showCommissionChart ? 'Hide Commission' : 'Show Commission'}
                </button>
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {isMonthlyStatsLoading ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="w-full h-full flex flex-col items-center justify-center animate-pulse">
                      <div className="w-1/2 h-10 bg-gray-300 rounded mb-6" />
                      <div className="w-full h-80 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <AreaChart data={monthlyStats}>
                    <defs>
                      <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="clientsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {showCommissionChart && (
                      <Area 
                        type="monotone" 
                        dataKey="commission" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        fill="url(#commissionGradient)"
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                      />
                    )}
                    
                    <Area 
                      type="monotone" 
                      dataKey="clients" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      fill="url(#clientsGradient)"
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insurance Types Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Insurance Distribution</h3>
            <p className="text-gray-600 text-sm mb-6">By policy type</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {isInsuranceDistributionLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-full h-full flex flex-col items-center justify-center animate-pulse">
                      <div className="w-1/2 h-10 bg-gray-300 rounded mb-6" />
                      <div className="w-40 h-40 bg-gray-200 rounded-full mb-4" />
                      <div className="w-2/3 h-6 bg-gray-200 rounded mb-2" />
                      <div className="w-1/2 h-6 bg-gray-200 rounded" />
                    </div>
                  </div>
                ) : insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                  <PieChart>
                    <Pie
                      data={[{ name: 'No Data', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#E5E7EB" />
                    </Pie>
                    <Tooltip 
                      formatter={() => ['No data available', '']}
                    />
                  </PieChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={insuranceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {insuranceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Percentage']}
                      labelStyle={{ color: '#374151' }}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 mt-4">
              {insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                    <span className="text-sm text-gray-500">No data available</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-400">0%</span>
                </div>
              ) : (
                insuranceDistribution.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-sm text-gray-600">{type.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{type.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Weekly Performance & Recent Applications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Weekly Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Weekly Performance</h3>
            <p className="text-gray-600 text-sm mb-6">Daily breakdown of this week</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {isWeeklyStatsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="w-full h-full flex flex-col items-center justify-center animate-pulse">
                      <div className="w-1/2 h-10 bg-gray-300 rounded mb-6" />
                      <div className="w-full h-72 bg-gray-200 rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="commission" 
                      fill="#3B82F6" 
                      radius={[4, 4, 0, 0]}
                      name="Commission"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Recent Applications</h3>
                <p className="text-gray-600 text-sm">Latest policy applications</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <select 
                  value={selectedInsuranceType}
                  onChange={(e) => setSelectedInsuranceType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="car">Car Insurance</option>
                  <option value="health">Health Insurance</option>
                  <option value="travel">Travel Insurance</option>
                  <option value="building">Building Insurance</option>
                  <option value="fire">Fire Insurance</option>
                  <option value="motorbike">MotorBike Insurance</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {isRecentApplicationsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="p-4 bg-gray-100 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-300 rounded-full" />
                          <div>
                            <div className="w-32 h-4 bg-gray-300 rounded mb-2" />
                            <div className="w-24 h-3 bg-gray-200 rounded" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-20 h-4 bg-gray-300 rounded mb-2" />
                          <div className="w-16 h-3 bg-gray-200 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No matching applications found for the selected filter or search.</div>
              ) : (
                filteredApplications.map((app, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {app.client.fullName.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{app.client.fullName}</p>
                          <p className="text-sm text-gray-600">{app.applicationNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{(app.amount || 0).toLocaleString()} RWF</p>
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600"><span className="font-medium">Insurance:</span> {app.insuranceCategory}</p>
                        <p className="text-gray-600"><span className="font-medium">Type:</span> {app.insuranceType}</p>
                        <p className="text-gray-600"><span className="font-medium">Location:</span> {app.client.province}, {app.client.district}</p>
                      </div>
                      <div>
                        <p className="text-gray-600"><span className="font-medium">Phone:</span> {app.client.phoneNumber}</p>
                        <p className="text-gray-600"><span className="font-medium">Submitted:</span> {new Date(app.submittedAt).toLocaleString()}</p>
                        {app.vehicle?.plateNumber && (
                          <p className="text-gray-600"><span className="font-medium">Plate:</span> {app.vehicle.plateNumber}</p>
                        )}
                      </div>
                    </div>
                    
                    {app.admin && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">Admin</span>
                            <span className="text-gray-600">{app.admin.fullName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white mt-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready to grow your business?</h3>
              <p className="text-blue-100">Start a new application or invite more clients to maximize your earnings.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href='/agent/apply' className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                New Application
              </Link>
              <Link href='/agent/apply' className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors border border-blue-400">
                Invite Clients
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
};

export default Dashboard;