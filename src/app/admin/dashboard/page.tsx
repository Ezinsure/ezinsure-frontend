"use client"

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Download, Search, UserCheck, Award, Activity, Briefcase, Shield, ArrowUpRight, ArrowDownRight, Eye, EyeOff, RefreshCw, Receipt } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { MainLayout } from '@/components/ui/main-layout';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { getAgentAnalyticsPath } from '@/shared/routing/motor-paths';
import { formatDateUTC, formatDateRange as formatDateRangeUtil, formatTime } from '@/utils/date-formatter';
import {
  EMPTY_MONTHLY_COMMISSION_SUMMARY,
  fetchMonthlyCommissionSummary,
  getSonarwaBillingTotal,
  type MonthlyCommissionSummary,
} from '@/utils/monthly-commission-summary';

// Define types for the data
interface Application {
  _id: string;
  applicationNumber: string;
  status: string;
  insuranceCategory: string;
  insuranceType: string;
  amount?: number;
  submittedAt: string;
  agent: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  admin: {
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
  vehicle: {
    id: string;
    plateNumber: string;
  };
}
interface InsuranceDistribution {
  name: string;
  value: number;
  color: string;
  percent: number;
}

// Define types for API data
interface InsuranceDistributionAPI {
  category: string;
  count: number;
}

// Define interfaces for revenue and daily metrics
interface RevenueAnalyticsAPIResponse {
  month: string;
  totalRevenue?: number;
  totalApplications?: number;
  totalAgents?: number;
  conversionRate?: number;
}

interface RevenueDataPoint {
  month: string;
  revenue?: number;
  agents?: number;
  clients?: number;
  applications?: number;
  conversion?: number;
}

interface DailyMetric {
  day: string;
  companyCommission?: number;
  applications?: number;
  agents?: number;
  clients?: number;
}

// Add interfaces for top agents and regional performance
interface TopAgent {
  _id: string;
  totalCommission: number;
  clients: number;
  agentId: string;
  agentFullName?: string;
  fullName: string;
  province: string;
}

interface RegionalPerformance {
  province: string;
  totalCommission: number;
  agents: number;
  clients: number;
}

// API service functions
const fetchActiveAgentsCount = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getActiveAgentsCount`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || 0;
  } catch (error) {
    console.error('Error fetching active agents count:', error);
    return 0;
  }
};

const fetchApplicationsThisMonth = async (token: string, startDate: string, endDate: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/countApplicationsThisMonth?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || 0;
  } catch (error) {
    console.error('Error fetching applications count:', error);
    return 0;
  }
};

const fetchRecentApplications = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRecentApplications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching recent applications:', error);
    return [];
  }
};

const fetchInsuranceDistribution = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getInsuranceDistribution`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching insurance distribution:', error);
    return [];
  }
};

// Unified color palette - professional blue/gray tones
const INSURANCE_COLORS: Record<string, string> = {
  'Car Insurance': '#2563EB',
  'Health Insurance': '#059669',
  'Travel Insurance': '#D97706',
  'Building Insurance': '#DC2626',
  'Fire Insurance': '#7C3AED',
  'MotorBike Insurance': '#6366F1',
};

// Chart color scheme - unified blue tones
const CHART_COLORS = {
  primary: '#2563EB',
  secondary: '#64748B',
  accent: '#0EA5E9',
  muted: '#94A3B8',
};

// Helper function to get first day of current month
const getFirstDayOfMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// Helper function to get today's date
const getTodayDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const agentAnalyticsPath = getAgentAnalyticsPath(user?.role ?? 'ADMIN');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('all');
  const [showProfitChart, setShowProfitChart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Admin fees state
  const [adminFeesStartDate, setAdminFeesStartDate] = useState<string>(getFirstDayOfMonth());
  const [adminFeesEndDate, setAdminFeesEndDate] = useState<string>(getTodayDate());
  const [commissionSummary, setCommissionSummary] = useState<MonthlyCommissionSummary>(
    EMPTY_MONTHLY_COMMISSION_SUMMARY,
  );
  const [isCommissionSummaryLoading, setIsCommissionSummaryLoading] = useState<boolean>(true);
  
  // State for stats cards data
  const [statsData, setStatsData] = useState({
    activeAgents: 0,
    applications: 0,
    loading: {
      activeAgents: true,
      applications: true,
    }
  });

  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [insuranceDistribution, setInsuranceDistribution] = useState<InsuranceDistribution[]>([]);
  const [isInsuranceDistributionLoading, setIsInsuranceDistributionLoading] = useState(true);

  // Remove mockData and add state for topAgents and regionalPerformance
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [regionalPerformance, setRegionalPerformance] = useState<RegionalPerformance[]>([]);
  const [isTopAgentsLoading, setIsTopAgentsLoading] = useState(true);
  const [isRegionalPerformanceLoading, setIsRegionalPerformanceLoading] = useState(true);

  // State for average commission and total agents
  const [averageCommission, setAverageCommission] = useState<number | null>(null);
  const [totalAgents, setTotalAgents] = useState<number | null>(null);
  const [isAvgCommissionLoading, setIsAvgCommissionLoading] = useState(true);

  // State for total clients
  const [totalClients, setTotalClients] = useState<number | null>(null);
  const [isTotalClientsLoading, setIsTotalClientsLoading] = useState(true);

  // Add state for revenue and daily metrics loading and data
  const [isRevenueLoading, setIsRevenueLoading] = useState(true);
  const [isDailyMetricsLoading, setIsDailyMetricsLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]); // Placeholder, replace with real API data if available
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]); // Placeholder, replace with real API data if available
  
  // Daily metrics date state (single date)
  const [dailyMetricsDate, setDailyMetricsDate] = useState<string>(getTodayDate());

  // Fetch stats data on component mount
  useEffect(() => {
    const fetchStatsData = async () => {
      if (!token) {
        console.error('No token available');
        return;
      }

      try {
        setIsCommissionSummaryLoading(true);
        const [activeAgents, applications, summary] = await Promise.all([
          fetchActiveAgentsCount(token),
          fetchApplicationsThisMonth(token, adminFeesStartDate, adminFeesEndDate),
          fetchMonthlyCommissionSummary(token, adminFeesStartDate, adminFeesEndDate),
        ]);

        setCommissionSummary(summary);
        setStatsData({
          activeAgents: activeAgents || 0,
          applications: applications || 0,
          loading: {
            activeAgents: false,
            applications: false,
          }
        });
      } catch (error) {
        console.error('Error fetching stats data:', error);
        setCommissionSummary(EMPTY_MONTHLY_COMMISSION_SUMMARY);
        setStatsData(prev => ({
          ...prev,
          loading: {
            activeAgents: false,
            applications: false,
          }
        }));
      } finally {
        setIsCommissionSummaryLoading(false);
        setIsLoading(false);
      }
    };

    fetchStatsData();
  }, [token, adminFeesStartDate, adminFeesEndDate]);

  useEffect(() => {
    if (!token) return;
    fetchRecentApplications(token).then((apps: Application[] = []) => {
      setRecentApplications(apps);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setIsInsuranceDistributionLoading(true);
    fetchInsuranceDistribution(token).then((dist: InsuranceDistributionAPI[]) => {
      // Calculate total for percentage
      const total = dist.reduce((sum, item) => sum + (item.count || 0), 0);
      const mapped = dist.map((item) => ({
        name: item.category,
        value: item.count,
        color: INSURANCE_COLORS[item.category] || '#A3A3A3',
        percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
      }));
      setInsuranceDistribution(mapped);
      setIsInsuranceDistributionLoading(false);
    });
  }, [token]);

  // Fetch Top Agents
  useEffect(() => {
    if (!token) return;
    setIsTopAgentsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getTopAgents?startDate=${adminFeesStartDate}&endDate=${adminFeesEndDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setTopAgents(data.data || []);
      })
      .catch(() => setTopAgents([]))
      .finally(() => setIsTopAgentsLoading(false));
  }, [token, adminFeesStartDate, adminFeesEndDate]);

  // Fetch Regional Performance
  useEffect(() => {
    if (!token) return;
    setIsRegionalPerformanceLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRegionalPerformance?startDate=${adminFeesStartDate}&endDate=${adminFeesEndDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setRegionalPerformance(data.data || []);
      })
      .catch(() => setRegionalPerformance([]))
      .finally(() => setIsRegionalPerformanceLoading(false));
  }, [token, adminFeesStartDate, adminFeesEndDate]);

  // Fetch average commission and total agents
  useEffect(() => {
    if (!token) return;
    setIsAvgCommissionLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyAverageAgentCommission?startDate=${adminFeesStartDate}&endDate=${adminFeesEndDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setAverageCommission(data.data?.averageCommission ?? 0);
        setTotalAgents(data.data?.totalAgents ?? 0);
      })
      .catch(() => {
        setAverageCommission(0);
        setTotalAgents(0);
      })
      .finally(() => setIsAvgCommissionLoading(false));
  }, [token, adminFeesStartDate, adminFeesEndDate]);

  // Fetch total clients
  useEffect(() => {
    if (!token) return;
    setIsTotalClientsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getTotalClients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setTotalClients(data.data ?? 0);
      })
      .catch(() => setTotalClients(0))
      .finally(() => setIsTotalClientsLoading(false));
  }, [token]);

  // Fetch Revenue Analytics
  useEffect(() => {
    if (!token) return;
    setIsRevenueLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRevenueAnalytics?startDate=${adminFeesStartDate}&endDate=${adminFeesEndDate}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        // Transform the data to match the chart's expected structure
        const transformedData = (data.data || []).map((item: RevenueAnalyticsAPIResponse) => ({
          month: item.month,
          revenue: item.totalRevenue || 0,
          applications: item.totalApplications || 0,
          agents: item.totalAgents || 0,
          conversion: item.conversionRate || 0
        }));
        setRevenueData(transformedData);
      })
      .catch((error) => {
        console.error('Error fetching revenue analytics:', error);
        setRevenueData([]);
      })
      .finally(() => setIsRevenueLoading(false));
  }, [token, adminFeesStartDate, adminFeesEndDate]);

  // Fetch Daily Metrics
  useEffect(() => {
    if (!token) return;
    
    const fetchDailyMetrics = async () => {
      setIsDailyMetricsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/getDailyPerformanceMetrics?date=${dailyMetricsDate}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setDailyMetrics(result.data || []);
      } catch (error) {
        console.error('Error fetching daily metrics:', error);
        setDailyMetrics([]);
      } finally {
      setIsDailyMetricsLoading(false);
      }
    };
    
    fetchDailyMetrics();
  }, [token, dailyMetricsDate]);

  const sonarwaBillingTotal = getSonarwaBillingTotal(commissionSummary);

  // Format date range for display (using UTC to avoid timezone issues)
  const formatDateRange = formatDateRangeUtil;

  const formatProvinceLabel = (value: string): string => {
    if (!value) return '';
    return value.length > 12 ? `${value.slice(0, 12)}…` : value;
  };

  const statsCards = [
    {
      title: 'SONARWA Billing',
      value: isCommissionSummaryLoading ? '' : `${sonarwaBillingTotal.toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral' as const,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: formatDateRange(adminFeesStartDate, adminFeesEndDate),
      breakdown: isCommissionSummaryLoading
        ? undefined
        : [
            { label: 'Company commission', value: commissionSummary.totalCompanyCommission },
            { label: 'Agent commission', value: commissionSummary.totalAgentCommission },
            { label: 'Admin fees', value: commissionSummary.administrationFees },
          ],
      loading: isCommissionSummaryLoading,
    },
    {
      title: 'Company Commission',
      value: isCommissionSummaryLoading
        ? ''
        : `${commissionSummary.totalCompanyCommission.toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral' as const,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-slate-600 to-slate-700',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      subtitle: 'Company share',
      loading: isCommissionSummaryLoading,
    },
    {
      title: 'Agent Commission',
      value: isCommissionSummaryLoading
        ? ''
        : `${commissionSummary.totalAgentCommission.toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral' as const,
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Agent share',
      loading: isCommissionSummaryLoading,
    },
    {
      title: 'Admin Fees',
      value: isCommissionSummaryLoading
        ? ''
        : `${commissionSummary.administrationFees.toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral' as const,
      icon: <Receipt className="w-5 h-5" />,
      color: 'from-slate-500 to-slate-600',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      subtitle: 'Administration fees',
      loading: isCommissionSummaryLoading,
    },
    {
      title: 'Applications',
      value: statsData.loading.applications ? '' : (statsData.applications || 0).toLocaleString(),
      change: '+8.2%',
      changeType: 'increase',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'This month',
      loading: statsData.loading.applications
    },
    {
      title: 'Active Agents',
      value: statsData.loading.activeAgents ? '' : (statsData.activeAgents || 0).toLocaleString(),
      change: '+12.3%',
      changeType: 'increase',
      icon: <UserCheck className="w-5 h-5" />,
      color: 'from-slate-600 to-slate-700',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      subtitle: 'Currently active',
      loading: statsData.loading.activeAgents
    },
    {
      title: 'Total Clients',
      value: isTotalClientsLoading ? '' : (totalClients ?? 0).toLocaleString(),
      change: '+18.7%',
      changeType: 'increase',
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Registered clients',
      loading: isTotalClientsLoading
    },
    {
      title: 'Avg Commission',
      value: isAvgCommissionLoading ? '' : `${(averageCommission ?? 0).toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral',
      icon: <Award className="w-5 h-5" />,
      color: 'from-slate-500 to-slate-600',
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
      subtitle: isAvgCommissionLoading ? 'Loading...' : `Per agent/month • ${totalAgents ?? 0} agents`,
      loading: isAvgCommissionLoading
    },
  ];

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="text-gray-900 font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.dataKey === 'revenue' ? 
                `Revenue: ${entry.value?.toLocaleString()} RWF` : 
                entry.dataKey === 'applications' ?
                `Applications: ${entry.value?.toLocaleString()}` :
                `${entry.name || entry.dataKey}: ${entry.value}`
              }
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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

  // Add getStatusBadge helper for status styling
  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[9px] font-medium">Unknown</span>;
    }
    
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-medium">Pending</span>;
      case 'application_approved':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-medium">Application Approved</span>;
      case 'waiting_for_user_action':
        return <span className="px-1 rounded-full bg-orange-100 text-orange-700 text-[9px] font-medium">Waiting for User Action</span>;
      case 'invoice_sent':
        return <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[9px] font-medium">Invoice Sent</span>;
      case 'review_payment':
        return <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[9px] font-medium">Review Payment</span>;
      case 'payment_verified':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[9px] font-medium">Payment Verified</span>;
      case 'insurance_issued':
        return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-medium">Insurance Issued</span>;
      case 'cancelled':
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[9px] font-medium">Cancelled</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-[9px] font-medium">{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Admin Dashboard</h2>
          <p className="text-gray-600">Fetching the latest analytics...</p>
        </div>
      </div>
    );
  }

  return (
      <MainLayout containerClass="p-0" fullWidth>
    <div className="container mx-auto px-4 py-8">

      {/* Header Section */}
      <section className="mt-4 lg:mt-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Executive Overview</p>
                <h1 className="text-3xl font-semibold text-slate-900 mt-1">Admin Dashboard</h1>
                <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                  Monitor key insurance metrics, regional performance, and application progress in real time.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">From</div>
                <input
                  id="admin-fees-start-date"
                  type="date"
                  value={adminFeesStartDate}
                  onChange={(e) => setAdminFeesStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">To</div>
                <input
                  id="admin-fees-end-date"
                  type="date"
                  value={adminFeesEndDate}
                  onChange={(e) => setAdminFeesEndDate(e.target.value)}
                  max={getTodayDate()}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {statsCards.map((card, index) => (
      <div 
        key={index} 
        className="bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 group relative overflow-hidden"
      >
        {card.loading ? (
          <div className="space-y-3">
            <div className="h-4 w-14 rounded bg-slate-100 animate-pulse" />
            <div className="h-6 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${card.bgColor} transition-colors`}>
                <div className={card.textColor}>{card.icon}</div>
              </div>
              {card.change && (
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                  card.changeType === 'increase' ? 'text-emerald-600 bg-emerald-50' :
                  card.changeType === 'decrease' ? 'text-red-600 bg-red-50' :
                  'text-gray-500 bg-gray-50'
                }`}>
                  {card.changeType === 'increase' ? <ArrowUpRight className="w-3 h-3" /> :
                   card.changeType === 'decrease' ? <ArrowDownRight className="w-3 h-3" /> : null}
                  {card.change}
                </div>
              )}
            </div>
            
            <h3 className="text-gray-500 text-xs font-medium mb-1.5">{card.title}</h3>
            <div className="space-y-0.5">
              <p className="text-xl font-semibold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.subtitle}</p>
              {'breakdown' in card && card.breakdown && card.breakdown.length > 0 && (
                <dl className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                  {card.breakdown.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-[11px]">
                      <dt className="text-gray-500">{row.label}</dt>
                      <dd className="font-medium text-gray-700">{row.value.toLocaleString()} RWF</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </>
        )}
      </div>
    ))}
  </div>

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Revenue & Performance Chart */}
          <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Revenue Analytics</h3>
                <p className="text-gray-500 text-xs">Monthly performance trends</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProfitChart(!showProfitChart)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-gray-700"
                >
                  {showProfitChart ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showProfitChart ? 'Hide Revenue' : 'Show Revenue'}
                </button>
              </div>
            </div>

            <div className="h-[360px]">
              {isRevenueLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm font-medium">Loading revenue analytics...</span>
                  </div>
                </div>
              ) : (!revenueData || revenueData.length === 0 || revenueData.every(d => !d.revenue && !d.applications)) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Activity className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No revenue analytics data to display</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke={CHART_COLORS.secondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke={CHART_COLORS.secondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke={CHART_COLORS.muted}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.muted }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {showProfitChart && (
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        yAxisId="left"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2.5}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: CHART_COLORS.primary }}
                        activeDot={{ r: 5 }}
                        name="Revenue"
                        fill="url(#revenueGradient)"
                      />
                    )}
                    
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      yAxisId="right"
                      stroke={CHART_COLORS.accent} 
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.accent, strokeWidth: 2, r: 3 }}
                      strokeDasharray="4 4"
                      name="Applications"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Insurance Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Insurance Types</h3>
            <p className="text-gray-500 text-xs mb-4">Distribution by policy type</p>
            
            <div className="h-48 mb-4">
              {isInsuranceDistributionLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center animate-pulse">
                  <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                </div>
              ) : insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <Activity className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-medium">No distribution data yet</p>
                  <p className="text-xs text-slate-400">Once applications are captured, you&apos;ll see the breakdown here.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insuranceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {insuranceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} applications`,
                        `${(props.payload.percent || 0)}%`
                      ]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                <div className="col-span-full flex items-center justify-between p-2 bg-gray-50 rounded-md text-xs text-gray-500">
                  <span>No data available</span>
                  <span className="font-semibold text-gray-400">0%</span>
                </div>
              ) : (
                insuranceDistribution.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: type.color }}
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-gray-900 block truncate">{type.name}</span>
                        <span className="text-xs text-gray-500">
                          {(type.value || 0).toLocaleString()} apps • <span className="text-gray-900 font-semibold">{type.percent}%</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Regional Performance & Daily Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Regional Performance */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Regional Performance</h3>
            <p className="text-gray-500 text-xs mb-4">Performance by province</p>
            <div className="h-[400px]">
              {isRegionalPerformanceLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm font-medium">Loading regional data...</span>
                  </div>
                </div>
              ) : regionalPerformance.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-gray-400">No regional data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={regionalPerformance.sort((a, b) => (b.totalCommission || 0) - (a.totalCommission || 0))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={true} vertical={false} />
                    <XAxis 
                      type="category"
                      dataKey="province"
                      stroke={CHART_COLORS.secondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tickFormatter={formatProvinceLabel}
                    />
                    <YAxis 
                      type="number"
                      stroke={CHART_COLORS.secondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                              <p className="text-gray-900 font-semibold text-sm mb-2">{payload[0].payload.province}</p>
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
                                <span className="text-sm text-gray-700">
                                  Commission: {(payload[0].value as number)?.toLocaleString()} RWF
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="totalCommission" 
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {!isRegionalPerformanceLoading && regionalPerformance.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {regionalPerformance.slice(0, 4).map((region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-gray-600 truncate">{region.province}</span>
                      <span className="text-gray-900 font-medium ml-2">
                        {(region.totalCommission || 0).toLocaleString()} RWF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Metrics */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Daily Performance</h3>
                <p className="text-gray-500 text-xs">Track daily metrics and trends</p>
              </div>
              
              {/* Date Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600">Date:</label>
                <input
                  type="date"
                  value={dailyMetricsDate}
                  onChange={(e) => setDailyMetricsDate(e.target.value)}
                  max={getTodayDate()}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {dailyMetricsDate !== getTodayDate() && (
                  <button
                    onClick={() => setDailyMetricsDate(getTodayDate())}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
            
            <div className="h-[400px]">
              {isDailyMetricsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full h-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-sm font-medium">Loading daily metrics...</span>
                  </div>
                </div>
              ) : (!dailyMetrics || dailyMetrics.length === 0) ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 mb-2">No daily performance data available</p>
                    <p className="text-xs text-gray-300">Try selecting a different date</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <p className="text-[10px] font-medium text-blue-900">Total Applications</p>
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {dailyMetrics.reduce((sum, d) => sum + (d.applications || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-green-600"></div>
                        <p className="text-[10px] font-medium text-green-900">Company Commission</p>
                      </div>
                      <p className="text-lg font-bold text-green-900">
                        {(dailyMetrics.reduce((sum, d) => sum + (d.companyCommission || 0), 0) / 1000).toFixed(1)}K
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <p className="text-[10px] font-medium text-purple-900">Active Agents</p>
                      </div>
                      <p className="text-lg font-bold text-purple-900">
                        {dailyMetrics.reduce((sum, d) => sum + (d.agents || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                        <p className="text-[10px] font-medium text-orange-900">New Clients</p>
                      </div>
                      <p className="text-lg font-bold text-orange-900">
                        {dailyMetrics.reduce((sum, d) => sum + (d.clients || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Chart */}
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dailyMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}> 
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke={CHART_COLORS.secondary}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                    />
                    <YAxis 
                      stroke={CHART_COLORS.secondary}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: CHART_COLORS.secondary }}
                    />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          fontSize: '11px'
                        }}
                        labelStyle={{ fontSize: '11px', fontWeight: '600', marginBottom: '4px' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'companyCommission') return [`${(value / 1000).toFixed(1)}K RWF`, 'Company Commission'];
                          if (name === 'applications') return [value, 'Applications'];
                          if (name === 'agents') return [value, 'Active Agents'];
                          if (name === 'clients') return [value, 'New Clients'];
                          return [value, name];
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                        formatter={(value) => {
                          if (value === 'applications') return 'Applications';
                          if (value === 'companyCommission') return 'Company Commission (K)';
                          if (value === 'agents') return 'Active Agents';
                          if (value === 'clients') return 'New Clients';
                          return value;
                        }}
                      />
                      <Bar 
                        dataKey="applications" 
                        fill="#3B82F6"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar 
                        dataKey="companyCommission" 
                        fill="#10B981"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar 
                        dataKey="agents" 
                        fill="#8B5CF6"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar 
                        dataKey="clients" 
                        fill="#F59E0B"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                </ResponsiveContainer>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top Agents & Recent Applications */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Top Performing Agents */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Top Agents</h3>
                <p className="text-xs text-slate-500">Highest earning agents this month</p>
              </div>
              <Link href="/applications" >
                <p className="text-blue-600 text-xs font-semibold hover:text-blue-500 transition-colors">View All</p>
              </Link>
            </div>
            <div className="space-y-3">
              {isTopAgentsLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-100 p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-slate-200 rounded" />
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))
              ) : topAgents.length === 0 ? (
                <div className="text-center text-slate-500 py-12 text-sm">No top agents data available</div>
              ) : (
                topAgents.map((agent, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 p-4 bg-white hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center">
                            {agent?.fullName ? agent.fullName.split(' ').map((n: string) => n[0]).join('') : 'N/A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{agent?.fullName || 'Unknown Agent'}</p>
                            <p className="text-xs text-slate-500">{agent?.province || 'N/A'}</p>
                          </div>
                        </div>
                      <span className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-100 rounded-full px-3 py-1">
                        Rank #{index + 1}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-500">
                      <div>
                        <p className="uppercase tracking-wide text-[10px] text-slate-400">Commission</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {(agent.totalCommission || 0).toLocaleString()} RWF
                        </p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide text-[10px] text-slate-400">Clients</p>
                        <p className="text-sm font-semibold text-slate-900">{agent.clients ?? 0}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide text-[10px] text-slate-400">Province</p>
                        <p className="text-sm font-semibold text-slate-900">{agent.province}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
            
            <div className="max-h-[420px] overflow-y-auto">
              {filteredApplications.length === 0 ? (
                <div className="text-center text-slate-500 py-8 text-sm">No matching applications found for the selected filter or search.</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[720px] divide-y divide-slate-100">
                    <div className="grid grid-cols-[2.4fr_1.4fr_1.1fr_1fr_1.2fr] gap-3 px-2 pb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <span>Client</span>
                      <span>Insurance</span>
                      <span>Amount</span>
                      <span>Status</span>
                      <span>Submitted</span>
                    </div>
                    {filteredApplications.map((app, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[2.4fr_1.4fr_1.1fr_1fr_1.2fr] gap-3 items-center px-2 py-3 hover:bg-slate-50 transition-colors text-sm text-slate-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-900/80 text-white text-sm font-semibold flex items-center justify-center">
                            {app.client?.fullName ? app.client.fullName.split(' ').map((n: string) => n[0]).join('') : 'N/A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{app.client?.fullName || 'Unknown Client'}</p>
                            <p className="text-xs text-slate-500">{app.applicationNumber}</p>
                          </div>
                        </div>
                        <div className="text-xs">
                          <p className="font-medium text-slate-900">{app.insuranceCategory}</p>
                          <p className="text-slate-500">{app.insuranceType}</p>
                        </div>
                        <div className="font-semibold text-slate-900">
                          {(app.amount || 0).toLocaleString()} RWF
                        </div>
                        <div className="whitespace-nowrap">{getStatusBadge(app.status)}</div>
                        <div className="text-xs text-slate-500">
                          {formatDateUTC(app.submittedAt)}<br />
                          <span className="text-[11px]">{formatTime(app.submittedAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Advanced Analytics</p>
              <h3 className="text-2xl font-semibold text-slate-900 mt-1">Comprehensive insights and performance metrics</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {['overview', 'agents', 'clients', 'revenue', 'regions'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all border ${
                      isActive
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50/70">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Platform Health</p>
                    <h4 className="text-lg font-semibold text-slate-900">Infrastructure</h4>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Uptime</dt>
                    <dd className="font-semibold text-slate-900">99.9%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Response Time</dt>
                    <dd className="font-semibold text-slate-900">245ms</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Error Rate</dt>
                    <dd className="font-semibold text-slate-900">0.1%</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-emerald-50/60">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-600/70">Growth Metrics</p>
                    <h4 className="text-lg font-semibold text-slate-900">Pipeline</h4>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Monthly Growth</dt>
                    <dd className="font-semibold text-emerald-700">+23.5%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>User Acquisition</dt>
                    <dd className="font-semibold text-emerald-700">+18.2%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Revenue Growth</dt>
                    <dd className="font-semibold text-emerald-700">+15.8%</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-purple-50/70">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-purple-500/70">User Engagement</p>
                    <h4 className="text-lg font-semibold text-slate-900">Experience</h4>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-purple-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Active Users</dt>
                    <dd className="font-semibold text-slate-900">8,456</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Session Duration</dt>
                    <dd className="font-semibold text-slate-900">12m 34s</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Bounce Rate</dt>
                    <dd className="font-semibold text-slate-900">15.2%</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5 bg-amber-50/70">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-amber-500/70">Risk Assessment</p>
                    <h4 className="text-lg font-semibold text-slate-900">Compliance</h4>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-amber-600">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <dl className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Risk Score</dt>
                    <dd className="font-semibold text-emerald-700">Low</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Claims Ratio</dt>
                    <dd className="font-semibold text-slate-900">3.2%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Fraud Detection</dt>
                    <dd className="font-semibold text-slate-900">0.05%</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'revenue' && (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                {/* TODO: Replace [] with real revenue data from API */}
                <LineChart data={[]}> 
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
                  {/* No Line if no data */}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-7 text-white shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Agents</p>
                <h3 className="text-2xl font-semibold">Agent Management</h3>
                <p className="text-sm text-slate-200 mt-2">Manage and onboard new agents with precision workflows.</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="rounded-xl border border-white/30 bg-white text-slate-900 font-semibold py-3 hover:bg-slate-50 transition-colors">
                Add New Agent
              </button>
              <Link href={agentAnalyticsPath}>
                <button className="w-full rounded-xl border border-white/30 bg-transparent text-white font-semibold py-3 hover:bg-white/10 transition-colors">
                View All Agents
              </button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-7 text-white shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">Operations</p>
                <h3 className="text-2xl font-semibold">System Analytics</h3>
                <p className="text-sm text-emerald-100 mt-2">Deep dive into platform KPIs and performance indicators.</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="rounded-xl border border-white/30 bg-white text-emerald-900 font-semibold py-3 hover:bg-emerald-50 transition-colors">
                Generate Report
              </button>
              <button className="rounded-xl border border-white/30 bg-transparent text-white font-semibold py-3 hover:bg-white/10 transition-colors">
                View Analytics
              </button>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold mb-2">Platform Overview</h3>
            <p className="text-gray-300">Real-time statistics and performance indicators</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">99.9%</div>
              <div className="text-gray-300 text-sm">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">245ms</div>
              <div className="text-gray-300 text-sm">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">24/7</div>
              <div className="text-gray-300 text-sm">Support Available</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-amber-400 mb-2">5★</div>
              <div className="text-gray-300 text-sm">Customer Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </MainLayout>
  );
};

export default AdminDashboard;