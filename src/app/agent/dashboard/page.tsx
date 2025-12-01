"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, EyeOff, Search, Users, Briefcase, DollarSign, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/ui/main-layout';
import type { TooltipProps } from 'recharts';
import { useAuth } from '@/context/AuthContext';

const INSURANCE_COLORS: Record<string, string> = {
  'Car Insurance': '#2563EB',
  'Health Insurance': '#059669',
  'Travel Insurance': '#D97706',
  'Building Insurance': '#DC2626',
  'Fire Insurance Coverage': '#7C3AED',
  'MotorBike Insurance': '#6366F1',
};

const CHART_COLORS = {
  primary: '#2563EB',
  secondary: '#0EA5E9',
  accent: '#059669',
  muted: '#94A3B8',
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const [showCommissionChart, setShowCommissionChart] = useState(true);
  // Remove global isLoading state
  // const [isLoading, setIsLoading] = useState(true);

  // getStatusBadge helper (copied from admin dashboard)
  const getStatusBadge = (status: string) => {
    const badgeBase = 'px-2 py-1 whitespace-nowrap rounded-full text-[9px] font-medium';
    switch (status?.toLowerCase()) {
      case 'pending':
        return <span className={`${badgeBase} bg-blue-100 text-blue-700`}>Pending</span>;
      case 'application_approved':
        return <span className={`${badgeBase} bg-green-100 text-green-700`}>Application Approved</span>;
      case 'waiting_for_user_action':
        return <span className={`${badgeBase} bg-orange-100 text-orange-700`}>Waiting for User Action</span>;
      case 'invoice_sent':
        return <span className={`${badgeBase} bg-indigo-100 text-indigo-700`}>Invoice Sent</span>;
      case 'review_payment':
        return <span className={`${badgeBase} bg-purple-100 text-purple-700`}>Review Payment</span>;
      case 'payment_verified':
        return <span className={`${badgeBase} bg-green-100 text-green-700`}>Payment Verified</span>;
      case 'insurance_issued':
        return <span className={`${badgeBase} bg-emerald-100 text-emerald-700`}>Insurance Issued</span>;
      default:
        return <span className={`${badgeBase} bg-gray-100 text-gray-700`}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>;
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
    } | null;
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

  const highlightStats = useMemo(() => {
    const totalCommission = monthlyStats.reduce((sum, stat) => sum + (stat.commission || 0), 0);
    const totalClients = monthlyStats.reduce((sum, stat) => sum + (stat.clients || 0), 0);
    const pipelineApplications = recentApplications.length;
    const insuranceMix = insuranceDistribution.reduce((sum, type) => sum + (type.value || 0), 0);
    return {
      totalCommission,
      totalClients,
      pipelineApplications,
      insuranceMix
    };
  }, [monthlyStats, recentApplications, insuranceDistribution]);

  const formatCurrency = (value: number) => `${value.toLocaleString()} RWF`;
  const formatNumber = (value: number) => value.toLocaleString();

  const highlightCards = [
    {
      key: 'commission',
      title: 'Total Commission',
      value: formatCurrency(highlightStats.totalCommission),
      caption: 'Aggregated across reported months',
      icon: <DollarSign className="w-4 h-4" />,
      iconClasses: 'bg-blue-50 text-blue-600'
    },
    {
      key: 'clients',
      title: 'Clients Served',
      value: formatNumber(highlightStats.totalClients),
      caption: 'From monthly performance data',
      icon: <Users className="w-4 h-4" />,
      iconClasses: 'bg-emerald-50 text-emerald-600'
    },
    {
      key: 'applications',
      title: 'Active Applications',
      value: formatNumber(highlightStats.pipelineApplications),
      caption: 'Recent applications under management',
      icon: <Briefcase className="w-4 h-4" />,
      iconClasses: 'bg-indigo-50 text-indigo-600'
    },
    {
      key: 'policies',
      title: 'Policies in Portfolio',
      value: formatNumber(highlightStats.insuranceMix),
      caption: 'Distribution across insurance lines',
      icon: <ArrowUpRight className="w-4 h-4" />,
      iconClasses: 'bg-slate-100 text-slate-600'
    }
  ];

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
    // Filter out applications with null client
    if (!app.client || !app.client.fullName) return false;
    
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
      <div className="min-h-screen bg-slate-50">
        <div className="relative isolate">
          <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            <div className="bg-white/90 backdrop-blur rounded-3xl border border-white/50 shadow-xl p-8 mb-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Agent Intelligence</p>
                  <h1 className="text-3xl font-semibold text-slate-900 mt-2">Welcome back, {user?.fullName || 'Agent'}.</h1>
                  <p className="text-slate-500 mt-2">Stay on top of your applications, clients, and earnings in one place.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/agent/apply"
                    className="px-5 py-2.5 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300"
                  >
                    New Application
                  </Link>
                  <Link
                    href="/agent/applications"
                    className="px-5 py-2.5 rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    View Pipeline
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              {highlightCards.map((card) => (
                <div key={card.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${card.iconClasses}`}>
                      {card.icon}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
                  <p className="text-2xl font-semibold text-slate-900 mt-1">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.caption}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Performance</p>
                    <h3 className="text-xl font-semibold text-slate-900 mt-1">Commission vs client growth</h3>
                    <p className="text-slate-500 text-sm">Monitor monthly progress by cohort</p>
                  </div>
                  <button
                    onClick={() => setShowCommissionChart(!showCommissionChart)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                  >
                    {showCommissionChart ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showCommissionChart ? 'Hide commission line' : 'Show commission line'}
                  </button>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {isMonthlyStatsLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="w-full animate-pulse">
                          <div className="h-6 w-40 rounded bg-slate-100 mb-4" />
                          <div className="h-64 rounded-2xl bg-slate-100" />
                        </div>
                      </div>
                    ) : monthlyStats.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                        No monthly data available.
                      </div>
                    ) : (
                      <LineChart data={monthlyStats}>
                        <defs>
                          <linearGradient id="agentCommissionLine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
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
                          yAxisId="left"
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {showCommissionChart && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="commission"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          />
                        )}
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="clients"
                          stroke={CHART_COLORS.accent}
                          strokeWidth={3}
                          strokeDasharray="4 4"
                          dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mix</p>
                    <h3 className="text-xl font-semibold text-slate-900 mt-1">Insurance distribution</h3>
                    <p className="text-slate-500 text-sm">Share by coverage type</p>
                  </div>
                </div>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    {isInsuranceDistributionLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="w-full animate-pulse">
                          <div className="mx-auto mb-4 h-10 w-32 rounded bg-slate-100" />
                          <div className="mx-auto h-48 w-48 rounded-full bg-slate-100" />
                        </div>
                      </div>
                    ) : insuranceDistribution.length === 0 || insuranceDistribution.every((d) => !d.value) ? (
                      <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                        <div className="mb-2 h-12 w-12 rounded-full border border-dashed border-slate-200" />
                        No distribution data yet.
                      </div>
                    ) : (
                      <PieChart>
                        <Pie
                          data={insuranceDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="#fff"
                        >
                          {insuranceDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, _name: string, entry) => [
                            `${Number(value || 0).toLocaleString()} apps`,
                            entry?.payload?.name || 'Insurance'
                          ]}
                        />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div className="mt-6">
                  {insuranceDistribution.length === 0 || insuranceDistribution.every((d) => !d.value) ? (
                    <div className="col-span-full flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                      <span>No distribution data available</span>
                      <span className="font-semibold text-slate-300">0%</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {insuranceDistribution.map((type) => (
                        <div
                          key={type.name}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">{type.name}</p>
                              <p className="text-xs text-slate-500">
                                {(type.value || 0).toLocaleString()} apps •{' '}
                                <span className="font-semibold text-slate-900">{type.percent}%</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">This week</p>
                <h3 className="text-xl font-semibold text-slate-900 mt-1">Daily performance</h3>
                <p className="text-slate-500 text-sm mb-4">Commissions posted throughout the week</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {isWeeklyStatsLoading ? (
                      <div className="flex h-full items-center justify-center">
                        <div className="w-full animate-pulse">
                          <div className="h-6 w-32 rounded bg-slate-100 mb-4" />
                          <div className="h-64 rounded-2xl bg-slate-100" />
                        </div>
                      </div>
                    ) : weeklyStats.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                        No weekly stats available.
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
                        <Bar dataKey="commission" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} name="Commission" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pipeline</p>
                    <h3 className="text-xl font-semibold text-slate-900 mt-1">Recent applications</h3>
                    <p className="text-slate-500 text-sm">Stay close to the latest activity</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search applications"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <select
                      value={selectedInsuranceType}
                      onChange={(e) => setSelectedInsuranceType(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                <div
                  className="mt-2 space-y-3 overflow-y-auto pr-1 snap-y snap-mandatory"
                  style={{ maxHeight: '16.5rem' }}
                >
                  {isRecentApplicationsLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, idx) => (
                        <div key={idx} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="mb-3 flex justify-between">
                            <div className="h-10 w-32 rounded bg-slate-100" />
                            <div className="h-4 w-20 rounded bg-slate-100" />
                          </div>
                          <div className="h-3 w-full rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : filteredApplications.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                      No matching applications for the current filters.
                    </div>
                  ) : (
                    filteredApplications.map((app) => (
                      <div
                        key={app._id}
                        className="snap-start rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-100 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white">
                              {app.client?.fullName
                                ? app.client.fullName.split(' ').map((n: string) => n[0]).join('')
                                : 'N/A'}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{app.client?.fullName || 'Unknown Client'}</p>
                              <p className="text-xs text-slate-500">{app.applicationNumber}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {(app.amount || 0).toLocaleString()} RWF
                            </p>
                            {getStatusBadge(app.status)}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                          <p>
                            <span className="text-slate-500">Insurance:</span> {app.insuranceCategory}
                          </p>
                          <p>
                            <span className="text-slate-500">Type:</span> {app.insuranceType}
                          </p>
                          <p>
                            <span className="text-slate-500">Location:</span> {app.client?.province || 'N/A'}, {app.client?.district || 'N/A'}
                          </p>
                          <p>
                            <span className="text-slate-500">Phone:</span> {app.client?.phoneNumber || 'N/A'}
                          </p>
                          <p className="sm:col-span-2">
                            <span className="text-slate-500">Submitted:</span>{' '}
                            {new Date(app.submittedAt).toLocaleString()}
                          </p>
                          {app.vehicle?.plateNumber && (
                            <p className="sm:col-span-2">
                              <span className="text-slate-500">Plate:</span> {app.vehicle.plateNumber}
                            </p>
                          )}
                        </div>
                        {app.admin && (
                          <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                            Assigned admin: <span className="font-medium text-slate-900">{app.admin?.fullName || 'Unknown'}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="rounded-2xl bg-white/20 p-3 backdrop-blur">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">Pipeline Accelerator</h3>
                    <p className="text-sm text-blue-100">Launch new applications in seconds.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/agent/apply"
                    className="flex-1 min-w-[140px] rounded-xl bg-white px-5 py-3 text-center font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    Start Application
                  </Link>
                  <Link
                    href="/agent/applications"
                    className="flex-1 min-w-[140px] rounded-xl border border-white/40 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
                  >
                    Manage Pipeline
                  </Link>
                </div>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 p-8 text-white shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <div className="rounded-2xl bg-white/15 p-3 backdrop-blur">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">Client Engagement</h3>
                    <p className="text-sm text-emerald-100">Invite and nurture your best leads.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/agent/apply"
                    className="flex-1 min-w-[140px] rounded-xl bg-white px-5 py-3 text-center font-semibold text-emerald-600 hover:bg-emerald-50"
                  >
                    Invite Client
                  </Link>
                  <Link
                    href="/agent/profile"
                    className="flex-1 min-w-[140px] rounded-xl border border-white/40 px-5 py-3 text-center font-semibold text-white hover:bg-white/10"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;