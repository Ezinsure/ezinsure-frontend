"use client"

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, EyeOff } from 'lucide-react';
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
    id: string;
    client: string;
    type: string;
    amount: string;
    status: string;
    time: string;
  }
  interface RecentApplicationAPI {
    fullName: string;
    insuranceCategory: string;
    amount?: number;
    status: string;
    submittedAt?: string;
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
          client: item.fullName,
          type: item.insuranceCategory,
          amount: item.amount ? `${Number(item.amount).toLocaleString()} RWF` : 'N/A',
          status: item.status,
          time: item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : '',
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Recent Applications</h3>
                <p className="text-gray-600 text-sm">Latest client submissions</p>
              </div>
              <Link href='/agent/applications' className="text-blue-600 text-sm font-medium hover:text-blue-700">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {isRecentApplicationsLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 bg-gray-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-300 rounded-full" />
                        <div>
                          <div className="w-32 h-5 bg-gray-300 rounded mb-2" />
                          <div className="w-24 h-4 bg-gray-200 rounded" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-20 h-5 bg-gray-300 rounded mb-2" />
                        <div className="w-16 h-4 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentApplications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No recent applications found.</p>
                </div>
              ) : (
                recentApplications.map((app, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {typeof app.client === 'string' && app.client.trim()
                            ? app.client.split(' ').map((n: string) => n[0]).join('')
                            : '--'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{app.client}</p>
                        <p className="text-sm text-gray-500">{app.type} Insurance • {app.time}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{app.amount}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        app.status === 'completed' ? 'bg-green-100 text-green-700' :
                        app.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {getStatusBadge(app.status)}
                      </span>
                    </div>
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