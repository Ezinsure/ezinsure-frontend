'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Users, Briefcase, ArrowUpRight, Search, Eye, EyeOff, Mail, Calendar, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import type { TooltipProps } from 'recharts';
import { formatDateUTC } from '@/utils/date-formatter';

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

interface AgentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentEmail: string;
  token: string;
}

interface Application {
  _id: string;
  applicationNumber: string;
  status: string;
  insuranceCategory: string;
  insuranceType: string;
  insuranceDuration?: string;
  amount?: number;
  agentCommission?: number;
  submittedAt: string;
  client?: {
    _id: string;
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

const getFirstDayOfMonth = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = firstDay.getFullYear();
  const month = String(firstDay.getMonth() + 1).padStart(2, '0');
  const day = String(firstDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

export default function AgentDetailModal({ isOpen, onClose, agentId, agentName, agentEmail, token }: AgentDetailModalProps) {
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [insuranceDistribution, setInsuranceDistribution] = useState<InsuranceDistribution[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicationsLoading, setIsApplicationsLoading] = useState(false);
  const [showCommissionChart, setShowCommissionChart] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  // Date range for filtering
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  
  // Applications table pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch all agent data
  useEffect(() => {
    if (!isOpen || !agentId || !token) return;

    setIsLoading(true);

    const fetchRecentApplications = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getRecentAgentApplications?agentId=${agentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const mapped = (data.data || []).map((item: any) => ({
          _id: item._id || '',
          applicationNumber: item.applicationNumber || '',
          status: item.status,
          insuranceCategory: item.insuranceCategory,
          insuranceType: item.insuranceType,
          amount: item.amount,
          submittedAt: item.submittedAt || '',
          client: {
            _id: item.client?._id || '',
            fullName: item.client?.fullName || item.fullName,
            email: item.client?.email || '',
            phoneNumber: item.client?.phoneNumber || '',
            province: item.client?.province || '',
            district: item.client?.district || '',
          },
          vehicle: item.vehicle ? {
            plateNumber: item.vehicle.plateNumber || '',
          } : undefined,
        }));
        setRecentApplications(mapped);
      } catch (error) {
        console.error('Error fetching recent applications:', error);
        setRecentApplications([]);
      }
    };

    const fetchInsuranceDistribution = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getAgentInsuranceDistribution?agentId=${agentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const dist = data.data || [];
        const total = dist.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
        setInsuranceDistribution(
          dist.map((item: any) => ({
            name: item.category,
            value: item.count,
            color: INSURANCE_COLORS[item.category] || '#A3A3A3',
            percent: total > 0 ? Math.round((item.count / total) * 100) : 0,
          }))
        );
      } catch (error) {
        console.error('Error fetching insurance distribution:', error);
        setInsuranceDistribution([]);
      }
    };

    const fetchWeeklyStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getWeeklyAgentStats?agentId=${agentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        setWeeklyStats(data.data || []);
      } catch (error) {
        console.error('Error fetching weekly stats:', error);
        setWeeklyStats([]);
      }
    };

    const fetchMonthlyStats = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getMonthlyAgentStats?agentId=${agentId}`, {
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
      }
    };

    Promise.all([
      fetchRecentApplications(),
      fetchInsuranceDistribution(),
      fetchWeeklyStats(),
      fetchMonthlyStats()
    ]).finally(() => {
      setIsLoading(false);
    });
  }, [isOpen, agentId, token]);

  // Fetch all applications (same API as agent portal)
  useEffect(() => {
    if (!isOpen || !agentId || !token) return;

    const fetchAllApplications = async () => {
      setIsApplicationsLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/getApplicationsByAgent?agentId=${agentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch applications');
        }
        
        const data = await res.json();
        const sortedApplications = (data.data || []).sort((a: Application, b: Application) => {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });
        
        setAllApplications(sortedApplications);
      } catch (error) {
        console.error('Error fetching applications:', error);
        setAllApplications([]);
      } finally {
        setIsApplicationsLoading(false);
      }
    };

    fetchAllApplications();
  }, [isOpen, agentId, token]);

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

  const filteredApplications = recentApplications.filter((app: Application) => {
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

  // Filter all applications for table
  const filteredTableApplications = useMemo(() => {
    return allApplications.filter(app => {
      const clientName = app.client?.fullName || '';
      const clientEmail = app.client?.email || '';
      
      const matchesSearch = !searchTerm || 
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
      
      const matchesDateRange = (() => {
        if (!startDate && !endDate) return true;
        if (!app.submittedAt) return false;
        
        const appDate = new Date(app.submittedAt);
        const appDateOnly = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
        
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;
        
        if (start && end) {
          return appDateOnly >= start && appDateOnly <= end;
        } else if (start) {
          return appDateOnly >= start;
        } else if (end) {
          return appDateOnly <= end;
        }
        return true;
      })();
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [allApplications, searchTerm, selectedStatus, startDate, endDate]);

  const paginatedTableApplications = filteredTableApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTableApplications.length / itemsPerPage);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with smooth fade animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal with curtain-like slide-in animation */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="fixed inset-y-0 right-0 w-full sm:w-[90%] max-w-[90vw] bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
        {/* Compact Header */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {agentName.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold truncate">{agentName}</h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-blue-100">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{agentEmail}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Date Range Picker */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                max={endDate}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                max={getTodayDate()}
                className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading agent data...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Highlight Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {highlightCards.map((card) => (
                    <div key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.iconClasses}`}>
                          {card.icon}
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-300" />
                      </div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
                      <p className="text-xl font-semibold text-slate-900 mt-1">{card.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{card.caption}</p>
                    </div>
                  ))}
                </div>

                {/* Charts Section - Reduced height */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Monthly Performance */}
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Performance</p>
                        <h3 className="text-lg font-semibold text-slate-900 mt-1">Commission vs client growth</h3>
                      </div>
                      <button
                        onClick={() => setShowCommissionChart(!showCommissionChart)}
                        className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white"
                      >
                        {showCommissionChart ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showCommissionChart ? 'Hide commission' : 'Show commission'}
                      </button>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        {monthlyStats.length === 0 ? (
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
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              yAxisId="left"
                              stroke="#9CA3AF"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#9CA3AF"
                              fontSize={11}
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

                  {/* Insurance Distribution */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mix</p>
                      <h3 className="text-lg font-semibold text-slate-900 mt-1">Insurance distribution</h3>
                    </div>
                    <div className="h-48 mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        {insuranceDistribution.length === 0 || insuranceDistribution.every((d) => !d.value) ? (
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
                              innerRadius={40}
                              outerRadius={70}
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
                    <div className="mt-4">
                      {insuranceDistribution.length === 0 || insuranceDistribution.every((d) => !d.value) ? (
                        <div className="col-span-full flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">
                          <span>No distribution data available</span>
                          <span className="font-semibold text-slate-300">0%</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 text-sm">
                          {insuranceDistribution.map((type) => (
                            <div
                              key={type.name}
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: type.color }} />
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

                {/* Weekly Performance */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm mb-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">This week</p>
                  <h3 className="text-lg font-semibold text-slate-900 mt-1">Daily performance</h3>
                  <div className="h-56 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {weeklyStats.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
                          No weekly stats available.
                        </div>
                      ) : (
                        <BarChart data={weeklyStats}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis
                            dataKey="day"
                            stroke="#9CA3AF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#9CA3AF"
                            fontSize={11}
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

                {/* Applications Table */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Applications</h3>
                        <p className="text-sm text-gray-500 mt-1">All applications submitted by this agent</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:flex-none sm:w-64">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search applications..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <select
                          value={selectedStatus}
                          onChange={(e) => {
                            setSelectedStatus(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="all">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="application_approved">Application Approved</option>
                          <option value="waiting_for_user_action">Waiting for User Action</option>
                          <option value="invoice_sent">Invoice Sent</option>
                          <option value="review_payment">Review Payment</option>
                          <option value="payment_verified">Payment Verified</option>
                          <option value="insurance_issued">Insurance Issued</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {isApplicationsLoading ? (
                    <div className="p-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                      <p className="mt-4 text-gray-600">Loading applications...</p>
                    </div>
                  ) : filteredTableApplications.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="h-16 w-16 mx-auto text-gray-400" />
                      <p className="mt-4 text-gray-600">No applications found</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application #</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedTableApplications.map((app) => (
                              <tr key={app._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {app.applicationNumber}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{app.client?.fullName || 'N/A'}</div>
                                  <div className="text-xs text-gray-500">{app.client?.email || ''}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {app.insuranceCategory}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {app.insuranceType}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {(app.amount || 0).toLocaleString()} RWF
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {(app.agentCommission || 0).toLocaleString()} RWF
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {getStatusBadge(app.status)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                  {formatDateUTC(app.submittedAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredTableApplications.length)}</span> of{' '}
                            <span className="font-medium">{filteredTableApplications.length}</span> results
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-gray-700">
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
