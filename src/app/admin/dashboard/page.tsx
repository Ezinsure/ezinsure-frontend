"use client"

import React, { useState, useEffect } from 'react';
import { Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { TrendingUp, Users, DollarSign, Download, Search, UserCheck, Target, Award, Activity, Briefcase, Shield, Globe, ArrowUpRight, ArrowDownRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { MainLayout } from '@/components/ui/main-layout';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import type { Application as TrackApplication } from "../../track/page";

// Define types for the data
interface Application {
  id: string;
  client: string;
  type: string;
  amount: string;
  status: string;
  time: string;
  region: string;
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
  revenue?: number;
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

const fetchApplicationsThisMonth = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/countApplicationsThisMonth`, {
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

const fetchCoveredProvinces = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/countCoveredProvinces`, {
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
    console.error('Error fetching covered provinces:', error);
    return 0;
  }
};

const fetchTotalCommission = async (token: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getTotalCompanyCommissionThisMonth`, {
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
    console.error('Error fetching total commission:', error);
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

const INSURANCE_COLORS: Record<string, string> = {
  'Car Insurance': '#3B82F6',
  'Health Insurance': '#10B981',
  'Travel Insurance': '#F59E0B',
  'Building Insurance': '#EF4444',
  'Fire Insurance': '#8B5CF6',
  'MotorBike Insurance': '#6366F1',
};

const AdminDashboard = () => {
  const { token } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('all');
  const [showProfitChart, setShowProfitChart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for stats cards data
  const [statsData, setStatsData] = useState({
    activeAgents: 0,
    applications: 0,
    coveredProvinces: 0,
    totalCommission: 0,
    loading: {
      activeAgents: true,
      applications: true,
      coveredProvinces: true,
      totalCommission: true
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

  // Fetch stats data on component mount
  useEffect(() => {
    const fetchStatsData = async () => {
      if (!token) {
        console.error('No token available');
        return;
      }

      try {
        const [activeAgents, applications, coveredProvinces, totalCommission] = await Promise.all([
          fetchActiveAgentsCount(token),
          fetchApplicationsThisMonth(token),
          fetchCoveredProvinces(token),
          fetchTotalCommission(token)
        ]);

        setStatsData({
          activeAgents: activeAgents || 0,
          applications: applications || 0,
          coveredProvinces: coveredProvinces || 0,
          totalCommission: totalCommission || 0,
          loading: {
            activeAgents: false,
            applications: false,
            coveredProvinces: false,
            totalCommission: false
          }
        });
      } catch (error) {
        console.error('Error fetching stats data:', error);
        // Set default values on error
        setStatsData(prev => ({
          ...prev,
          loading: {
            activeAgents: false,
            applications: false,
            coveredProvinces: false,
            totalCommission: false
          }
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatsData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchRecentApplications(token).then((apps: TrackApplication[] = []) => {
      const mapped: Application[] = apps.map((app) => ({
        id: app.applicationNumber || app._id,
        client: app.fullName,
        type: app.insuranceCategory,
        amount: app.amount ? app.amount.toString() : '-',
        status: app.status,
        time: app.submittedAt ? new Date(app.submittedAt).toLocaleString() : '',
        region: app.province || '',
      }));
      setRecentApplications(mapped);
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
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getTopAgents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setTopAgents(data.data || []))
      .catch(() => setTopAgents([]))
      .finally(() => setIsTopAgentsLoading(false));
  }, [token]);

  // Fetch Regional Performance
  useEffect(() => {
    if (!token) return;
    setIsRegionalPerformanceLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRegionalPerformance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setRegionalPerformance(data.data || []))
      .catch(() => setRegionalPerformance([]))
      .finally(() => setIsRegionalPerformanceLoading(false));
  }, [token]);

  // Fetch average commission and total agents
  useEffect(() => {
    if (!token) return;
    setIsAvgCommissionLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyAverageAgentCommission`, {
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
  }, [token]);

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
      .then(data => setTotalClients(data.data ?? 0))
      .catch(() => setTotalClients(0))
      .finally(() => setIsTotalClientsLoading(false));
  }, [token]);

  // Fetch Revenue Analytics
  useEffect(() => {
    if (!token) return;
    setIsRevenueLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRevenueAnalytics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setRevenueData(data.data || []);
      })
      .catch(() => setRevenueData([]))
      .finally(() => setIsRevenueLoading(false));
  }, [token]);

  useEffect(() => {
    setIsDailyMetricsLoading(true);
    setTimeout(() => {
      setDailyMetrics([]); // Set to [] or real data
      setIsDailyMetricsLoading(false);
    }, 1000);
  }, []);

  const statsCards = [
    {
      title: 'Total Revenue',
      value: statsData.loading.totalCommission ? '' : `${(statsData.totalCommission || 0).toLocaleString()} RWF`,
      change: '+23.5%',
      changeType: 'increase',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      subtitle: 'This month',
      loading: statsData.loading.totalCommission
    },
    {
      title: 'Active Agents',
      value: statsData.loading.activeAgents ? '' : (statsData.activeAgents || 0).toLocaleString(),
      change: '+12.3%',
      changeType: 'increase',
      icon: <UserCheck className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Currently active',
      loading: statsData.loading.activeAgents
    },
    {
      title: 'Total Clients',
      value: isTotalClientsLoading ? '' : (totalClients ?? 0).toLocaleString(),
      change: '+18.7%',
      changeType: 'increase',
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: 'Registered clients',
      loading: isTotalClientsLoading
    },
    {
      title: 'Applications',
      value: statsData.loading.applications ? '' : (statsData.applications || 0).toLocaleString(),
      change: '+8.2%',
      changeType: 'increase',
      icon: <Briefcase className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      subtitle: 'This month',
      loading: statsData.loading.applications
    },
    {
      title: 'Conversion Rate',
      value: '92.4%',
      change: '+2.1%',
      changeType: 'increase',
      icon: <Target className="w-6 h-6" />,
      color: 'from-rose-500 to-rose-600',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-600',
      subtitle: 'Application to policy'
    },
    {
      title: 'Avg Commission',
      value: isAvgCommissionLoading ? '' : `${(averageCommission ?? 0).toLocaleString()} RWF`,
      change: '',
      changeType: 'neutral',
      icon: <Award className="w-6 h-6" />,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      subtitle: isAvgCommissionLoading ? 'Loading...' : `Per agent/month • ${totalAgents ?? 0} agents`,
      loading: isAvgCommissionLoading
    },
    {
      title: 'Policy Claims',
      value: '156',
      change: '-3.2%',
      changeType: 'decrease',
      icon: <Shield className="w-6 h-6" />,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      subtitle: 'Active claims'
    },
    {
      title: 'Coverage Areas',
      value: statsData.loading.coveredProvinces ? '' : (statsData.coveredProvinces || 0),
      change: '0%',
      changeType: 'neutral',
      icon: <Globe className="w-6 h-6" />,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      subtitle: 'Provinces covered',
      loading: statsData.loading.coveredProvinces
    }
  ];


  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);


const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-gray-200">
        <p className="text-gray-700 font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              {entry.dataKey === 'revenue' ? 
                `Revenue: ${entry.value?.toLocaleString()} RWF` : 
                entry.dataKey === 'conversion' ?
                `Conversion: ${entry.value}%` :
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
    const matchesSearch =
      app.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedInsuranceType === 'all' ||
      (selectedInsuranceType === 'car' && app.type.toLowerCase().includes('car')) ||
      (selectedInsuranceType === 'health' && app.type.toLowerCase().includes('health')) ||
      (selectedInsuranceType === 'travel' && app.type.toLowerCase().includes('travel')) ||
      (selectedInsuranceType === 'building' && app.type.toLowerCase().includes('building')) ||
      (selectedInsuranceType === 'fire' && app.type.toLowerCase().includes('fire')) ||
      (selectedInsuranceType === 'motorbike' && app.type.toLowerCase().includes('motorbike'));
    return matchesSearch && matchesType;
  });

  // Add getStatusBadge helper for status styling
  const getStatusBadge = (status: string) => {
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
         <div className="absolute top-0 left-0 w-full h-[10vh] overflow-hidden z-0 bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        
      {/* Header Section */}
      <div className="mt-10 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 shadow-xl">
        <div className=" max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="text-white">
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-blue-100 text-lg">Comprehensive overview of your insurance platform</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                </select>
                
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">All Regions</option>
                  <option value="kigali">Kigali</option>
                  <option value="northern">Northern Province</option>
                  <option value="southern">Southern Province</option>
                  <option value="eastern">Eastern Province</option>
                  <option value="western">Western Province</option>
                </select>
              </div>
              
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur text-white rounded-lg hover:bg-white/30 transition-all border border-white/30">
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold">
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
        className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 group relative overflow-hidden"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        {card.loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        
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

        {/* Main Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Revenue & Performance Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Revenue Analytics</h3>
                <p className="text-gray-600">Monthly performance trends and metrics</p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProfitChart(!showProfitChart)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showProfitChart ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showProfitChart ? 'Hide Revenue' : 'Show Revenue'}
                </button>
                <select className="px-3 py-2 text-sm border rounded-lg">
                  <option>Last 6 months</option>
                  <option>Last year</option>
                  <option>All time</option>
                </select>
              </div>
            </div>

            <div className="h-96">
              {isRevenueLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full h-80 bg-gray-300 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-lg font-semibold">Loading revenue analytics...</span>
                  </div>
                </div>
              ) : (!revenueData || revenueData.length === 0 || revenueData.every(d => !d.revenue && !d.applications && !d.conversion)) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-lg">
                  <div className="w-full h-64 opacity-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={[{ month: '' }]}> {/* Dummy empty graph */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  No revenue analytics data to display.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
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
                    
                    {showProfitChart && (
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        fill="url(#revenueGradient)"
                        name="Revenue"
                      />
                    )}
                    
                    <Bar 
                      dataKey="applications" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]}
                      name="Applications"
                    />
                    
                    <Line 
                      type="monotone" 
                      dataKey="conversion" 
                      stroke="#F59E0B" 
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                      name="Conversion Rate"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Insurance Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Insurance Types</h3>
            <p className="text-gray-600 text-sm mb-6">Revenue distribution by policy type</p>
            
            <div className="h-64 mb-6">
              {isInsuranceDistributionLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-center animate-pulse">
                  <div className="w-32 h-32 bg-gray-300 rounded-full animate-pulse flex items-center justify-center"></div>
                  <div className="mt-6 w-2/3 h-4 bg-gray-200 rounded mb-2" />
                  <div className="w-1/2 h-4 bg-gray-200 rounded" />
                </div>
              ) : insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ name: 'No Data', value: 1 }]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      <Cell fill="#E5E7EB" />
                    </Pie>
                    <Tooltip 
                      formatter={() => ['No data available', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={insuranceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
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
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="space-y-3">
              {insuranceDistribution.length === 0 || insuranceDistribution.every(d => !d.value) ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gray-300" />
                    <div>
                      <span className="text-sm font-medium text-gray-500">No data available</span>
                      <p className="text-xs text-gray-400">No insurance distribution data</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-400">0%</span>
                </div>
              ) : (
                insuranceDistribution.map((type, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{type.name}</span>
                        <p className="text-xs text-gray-500">{type.value.toLocaleString()} applications</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{type.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Regional Performance & Daily Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Regional Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Regional Performance</h3>
            <p className="text-gray-600 text-sm mb-6">Performance by province</p>
            <div className="space-y-4">
              {isRegionalPerformanceLoading ? (
                // Skeleton loader for regional performance
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="p-4 bg-gray-200 rounded-2xl animate-pulse flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-1/3" />
                      <div className="h-3 bg-gray-300 rounded w-1/4" />
                      <div className="h-2 bg-gray-300 rounded w-full mt-2" />
                    </div>
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                  </div>
                ))
              ) : (
                (() => {
                  const maxCommission = Math.max(...regionalPerformance.map(r => r.totalCommission || 0), 1);
                  return regionalPerformance.map((region, index) => {
                    const percent = Math.round(((region.totalCommission || 0) / maxCommission) * 100);
                    const initials = region.province.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                    return (
                      <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {initials}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-semibold text-gray-900">{region.province}</h4>
                            <span className="text-xs text-gray-500">{region.agents} agent(s) • {region.clients} client(s)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold text-gray-900">{(region.totalCommission || 0).toLocaleString()} RWF</p>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          </div>

          {/* Daily Metrics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Daily Performance</h3>
            <p className="text-gray-600 text-sm mb-6">This week&apos;s daily breakdown</p>
            
            <div className="h-80">
              {isDailyMetricsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full h-64 bg-gray-300 rounded-2xl animate-pulse flex items-center justify-center">
                    <span className="text-gray-400 text-lg font-semibold">Loading daily metrics...</span>
                  </div>
                </div>
              ) : (!dailyMetrics || dailyMetrics.length === 0 || dailyMetrics.every(d => !d.revenue && !d.applications)) ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-lg">
                  <div className="w-full h-48 opacity-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{ day: '' }]}> {/* Dummy empty graph */}
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  No daily performance data to display.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyMetrics}> 
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
                    {/* No Bar if no data */}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Top Agents & Recent Applications */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Top Performing Agents */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Top Agents</h3>
                <p className="text-gray-600 text-sm">Best performing agents this month</p>
              </div>
              <Link href="/applications" >
                <p className="text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors">View All</p>
              </Link>
            </div>
            <div className="space-y-4">
              {isTopAgentsLoading ? (
                // Skeleton loader for top agents
                Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-200 rounded-2xl animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full" />
                      <div>
                        <div className="h-4 bg-gray-300 rounded w-24 mb-2" />
                        <div className="h-3 bg-gray-300 rounded w-16" />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-300 rounded w-16 mb-1" />
                      <div className="h-3 bg-gray-300 rounded w-20" />
                    </div>
                  </div>
                ))
              ): topAgents.length === 0 ? (
                <div className="text-center text-gray-500 my-[30%]">No top agents data available</div>
              ) : (
                topAgents.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {agent.fullName.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{agent.fullName}</p>
                        <p className="text-sm text-gray-600">{agent.province} • {agent.clients} client(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{(agent.totalCommission || 0).toLocaleString()} RWF</p>
                      <p className="text-sm text-gray-600">Commission: {(agent.totalCommission || 0).toLocaleString()} RWF</p>
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
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredApplications.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No matching applications found for the selected filter or search in the top 5.</div>
              ) : (
                filteredApplications.map((app, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {app.client.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{app.client}</p>
                        <p className="text-sm text-gray-600">{app.type} • {app.time}</p>
                        <p className="text-xs text-gray-500">{app.region}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{app.amount}</p>
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-600">Comprehensive insights and performance metrics</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['overview', 'agents', 'clients', 'revenue', 'regions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Activity className="w-8 h-8 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Platform Health</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Uptime</span>
                    <span className="text-sm font-semibold text-gray-900">99.9%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Response Time</span>
                    <span className="text-sm font-semibold text-gray-900">245ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate</span>
                    <span className="text-sm font-semibold text-gray-900">0.1%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900">Growth Metrics</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Growth</span>
                    <span className="text-sm font-semibold text-emerald-600">+23.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">User Acquisition</span>
                    <span className="text-sm font-semibold text-emerald-600">+18.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Revenue Growth</span>
                    <span className="text-sm font-semibold text-emerald-600">+15.8%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-8 h-8 text-purple-600" />
                  <h4 className="font-semibold text-gray-900">User Engagement</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <span className="text-sm font-semibold text-gray-900">8,456</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Session Duration</span>
                    <span className="text-sm font-semibold text-gray-900">12m 34s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bounce Rate</span>
                    <span className="text-sm font-semibold text-gray-900">15.2%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-8 h-8 text-amber-600" />
                  <h4 className="font-semibold text-gray-900">Risk Assessment</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Risk Score</span>
                    <span className="text-sm font-semibold text-emerald-600">Low</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Claims Ratio</span>
                    <span className="text-sm font-semibold text-gray-900">3.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fraud Detection</span>
                    <span className="text-sm font-semibold text-gray-900">0.05%</span>
                  </div>
                </div>
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
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                <UserCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Agent Management</h3>
                <p className="text-blue-100">Manage and onboard new agents</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Add New Agent
              </button>
              <button className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors border border-blue-400">
                View All Agents
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-8 text-white">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">System Analytics</h3>
                <p className="text-emerald-100">Deep dive into platform metrics</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
                Generate Report
              </button>
              <button className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-400 transition-colors border border-emerald-400">
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