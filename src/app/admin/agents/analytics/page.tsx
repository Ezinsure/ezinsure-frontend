'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/ui/main-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { useApiClient } from '@/utils/apiClient';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Search, 
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye
} from 'lucide-react';
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Line } from 'recharts';
import AgentDetailModal from '@/components/ui/admin/agent-detail-modal';

// Helper functions for dates
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

// Interfaces
interface AgentAnalytics {
  _id: string;
  agentId: string;
  agentFullName?: string;
  name: string;
  email: string;
  phoneNumber: string;
  province?: string;
  district?: string;
  sector?: string;
  status?: string;
  totalCommission: number;
  totalApplications: number;
  averageCommission: number;
  totalRevenue: number; // Total amount from applications
  createdAt?: string;
  bankName?: string;
  bankAccountNumber?: string;
}

// API Response Interfaces
interface TopAgentPerformance {
  totalCommission: number;
  numberOfApplications: number;
  agentId: string;
  fullName: string;
}

interface AgentAnalyticsResponse {
  _id: null;
  totalCommissionEarned: number;
  totalAmountEarned: number;
  numberOfApplications: number;
  averageCommissionPerApplication: number;
}

interface AgentDetail {
  fullName: string;
  email: string;
  status: string;
  province: string;
  district: string;
  numberOfApplications: number;
  totalCommission: number;
  totalAmount: number;
  averageCommission: number;
  agentId: string;
}

interface Application {
  _id: string;
  agent?: {
    _id: string;
    fullName: string;
  } | null;
  agentCommission?: number;
  amount?: number;
  submittedAt: string;
  status: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }: PaginationProps) => {
  const getVisiblePages = () => {
    const maxVisiblePages = 7;
    const pages: (number | string)[] = [];
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(totalPages - 1, currentPage + 2);
      
      // Adjust if we're near the start
      if (currentPage <= 4) {
        startPage = 2;
        endPage = Math.min(6, totalPages - 1);
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - 3) {
        startPage = Math.max(2, totalPages - 5);
        endPage = totalPages - 1;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
      {/* Items per page selector and info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Show:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">per page</span>
        </div>
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
          <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
          {/* First page button */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <span className="sr-only">First page</span>
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          
          {/* Previous page button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <span className="sr-only">Previous</span>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          
          {/* Page numbers */}
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300"
                >
                  ...
                </span>
              );
            }
            
            const pageNum = page as number;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold transition-colors ${
                  pageNum === currentPage
                    ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          {/* Next page button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <span className="sr-only">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          
          {/* Last page button */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <span className="sr-only">Last page</span>
            <ChevronsRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
};

type SortField = 'name' | 'totalCommission' | 'totalApplications' | 'averageCommission' | 'totalRevenue' | 'province';
type SortDirection = 'asc' | 'desc';

interface AgentUserApi {
  _id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  province?: string;
  district?: string;
  sector?: string;
  status?: string;
  bankName?: string;
  bankAccountNumber?: string;
  role?: string;
  createdAt?: string;
}

export default function AgentAnalyticsPage() {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const { apiFetch } = useApiClient();
  
  // Date range state
  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  
  // Data state
  const [agents, setAgents] = useState<AgentAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyCommissionData, setWeeklyCommissionData] = useState<{
    weekStart: string;
    weekEnd: string;
    data: Array<{ totalCommission: number; day: string }>;
  } | null>(null);
  
  // API data state
  const [topAgentsPerformance, setTopAgentsPerformance] = useState<TopAgentPerformance[]>([]);
  const [overallAnalytics, setOverallAnalytics] = useState<AgentAnalyticsResponse | null>(null);
  const [allAgentsDetails, setAllAgentsDetails] = useState<AgentDetail[]>([]);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Sort state
  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Agent detail modal state
  const [selectedAgent, setSelectedAgent] = useState<AgentAnalytics | null>(null);

  // TODO: Set to false when APIs are ready
  const USE_DUMMY_DATA = false; // Now using real APIs

  // Generate dummy data based on date range
  const generateDummyData = useCallback((start: string, end: string): AgentAnalytics[] => {
    const provinces = ['Kigali', 'Northern Province', 'Southern Province', 'Eastern Province', 'Western Province'];
    const districts = ['Nyarugenge', 'Gasabo', 'Kicukiro', 'Musanze', 'Huye', 'Rusizi', 'Nyagatare', 'Rubavu'];
    const statuses: ('ACTIVE' | 'PENDING' | 'DEACTIVATED')[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING', 'DEACTIVATED'];
    
    const dummyAgents: AgentAnalytics[] = [];
    const agentNames = [
      'Jean Baptiste Nkurunziza',
      'Marie Claire Mukamana',
      'Paul Kagame',
      'Aline Umutoni',
      'Eric Nshimiyimana',
      'Grace Uwimana',
      'David Nkurikiye',
      'Sarah Mutesi',
      'Peter Habimana',
      'Alice Mukamana',
      'John Nkurunziza',
      'Rose Uwineza',
      'Emmanuel Nsabimana',
      'Chantal Mukamana',
      'Felix Nkurunziza',
      'Esther Uwimana',
      'Joseph Nkurikiye',
      'Angela Mutesi',
      'Robert Habimana',
      'Patricia Mukamana',
      'Charles Nkurunziza',
      'Juliette Uwineza',
      'Daniel Nsabimana',
      'Claudine Mukamana',
      'Samuel Nkurunziza'
    ];

    // Calculate days in date range for realistic data variation
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const multiplier = Math.max(1, daysDiff / 30); // Scale based on date range

    agentNames.forEach((name, index) => {
      const province = provinces[index % provinces.length];
      const district = districts[index % districts.length];
      const status = statuses[index % statuses.length];
      
      // Generate realistic metrics with some variation
      const baseApplications = Math.floor(5 + (Math.random() * 20 * multiplier));
      const baseCommission = baseApplications * (15000 + Math.random() * 25000);
      const totalApplications = baseApplications;
      const totalCommission = Math.round(baseCommission);
      const averageCommission = totalApplications > 0 ? totalCommission / totalApplications : 0;
      const totalRevenue = Math.round(totalCommission * (2.5 + Math.random() * 1.5));

      dummyAgents.push({
        _id: `agent_${index + 1}`,
        agentId: `AG${String(index + 1).padStart(4, '0')}`,
        agentFullName: name,
        name: name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@ezinsure.rw`,
        phoneNumber: `+250${78 + (index % 10)}${String(Math.floor(Math.random() * 1000000)).padStart(7, '0')}`,
        province: province,
        district: district,
        sector: `Sector ${index % 5 + 1}`,
        status: status,
        totalCommission: totalCommission,
        totalApplications: totalApplications,
        averageCommission: averageCommission,
        totalRevenue: totalRevenue,
        createdAt: new Date(2024, 0, index + 1).toISOString(),
        bankName: ['BK', 'Equity Bank', 'Bank of Kigali', 'I&M Bank', 'GT Bank'][index % 5],
        bankAccountNumber: `${String(Math.floor(Math.random() * 1000000000)).padStart(10, '0')}`
      });
    });

    // Sort by total commission descending
    return dummyAgents.sort((a, b) => b.totalCommission - a.totalCommission);
  }, []); // No dependencies - function is stable

  // Fetch weekly commission data
  const fetchWeeklyCommission = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await apiFetch('/getWeeklyAgentsCommission', {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weekly commission data');
      }

      const data = await response.json();
      setWeeklyCommissionData(data);
    } catch (error) {
      console.error('Error fetching weekly commission data:', error);
      // Don't show toast for this as it's not critical
    }
  }, [apiFetch, token]);

  // Fetch the three analytics APIs and store data
  const fetchAnalyticsAPIs = useCallback(async () => {
    if (!token) return;
    
    try {
      // Fetch all three APIs in parallel for better performance
      const [agentAnalyticsResponse, topAgentsResponse, allAgentsDetailsResponse] = await Promise.all([
        apiFetch(`/getAgentAnalytics?startDate=${startDate}&endDate=${endDate}`, {
          method: 'GET',
        }),
        apiFetch(`/getTopAgentsPerfomance?startDate=${startDate}&endDate=${endDate}`, {
          method: 'GET',
        }),
        apiFetch(`/getAllAgentsDetails?startDate=${startDate}&endDate=${endDate}`, {
          method: 'GET',
        })
      ]);

      // Process getAgentAnalytics
      if (agentAnalyticsResponse.ok) {
        const agentAnalyticsData = await agentAnalyticsResponse.json();
        setOverallAnalytics(agentAnalyticsData);
      } else {
        console.error('Failed to fetch getAgentAnalytics:', agentAnalyticsResponse.status);
      }

      // Process getTopAgentsPerfomance
      if (topAgentsResponse.ok) {
        const topAgentsData = await topAgentsResponse.json();
        setTopAgentsPerformance(topAgentsData);
      } else {
        console.error('Failed to fetch getTopAgentsPerfomance:', topAgentsResponse.status);
      }

      // Process getAllAgentsDetails
      if (allAgentsDetailsResponse.ok) {
        const allAgentsDetailsData = await allAgentsDetailsResponse.json();
        setAllAgentsDetails(allAgentsDetailsData);
        
        // Transform API data to match AgentAnalytics interface
        const transformedAgents: AgentAnalytics[] = allAgentsDetailsData.map((agent: AgentDetail) => ({
          _id: agent.agentId,
          agentId: agent.agentId,
          agentFullName: agent.fullName,
          name: agent.fullName,
          email: agent.email,
          phoneNumber: '', // Not provided by API
          province: agent.province,
          district: agent.district,
          sector: '', // Not provided by API
          status: agent.status,
          totalCommission: agent.totalCommission,
          totalApplications: agent.numberOfApplications,
          averageCommission: agent.averageCommission,
          totalRevenue: agent.totalAmount,
        }));
        
        setAgents(transformedAgents);
      } else {
        console.error('Failed to fetch getAllAgentsDetails:', allAgentsDetailsResponse.status);
      }
    } catch (error) {
      console.error('Error fetching analytics APIs:', error);
      showToast('Failed to load analytics data', 'error');
    }
  }, [apiFetch, token, startDate, endDate, showToast]);

  // Fetch agents data
  const fetchAgentsData = useCallback(async () => {
    if (!token && !USE_DUMMY_DATA) return;
    
    try {
      if (USE_DUMMY_DATA) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        // Use dummy data - pass dates as parameters
        const dummyData = generateDummyData(startDate, endDate);
        setAgents(dummyData);
      } else {
        // Real APIs are now handled by fetchAnalyticsAPIs
        // This function is kept for backward compatibility but won't fetch if USE_DUMMY_DATA is false
        // The actual data comes from getAllAgentsDetails in fetchAnalyticsAPIs
        return; // Early return - data comes from fetchAnalyticsAPIs
        // TODO: Replace with actual API calls when ready
        // Fetch all applications to calculate agent metrics
        const applicationsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/getAllApplications`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!applicationsResponse.ok) {
          throw new Error('Failed to fetch applications');
        }

        const applicationsData = await applicationsResponse.json();
        let applications: Application[] = applicationsData.data || [];

        // Filter applications by date range
        if (startDate && endDate) {
          applications = applications.filter(app => {
            if (!app.submittedAt) return false;
            
            const appDate = new Date(app.submittedAt);
            const appDateOnly = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            
            return appDateOnly >= start && appDateOnly <= end;
          });
        }

        // Fetch all users with AGENT role
        const usersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/users`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!usersResponse.ok) {
          throw new Error('Failed to fetch users');
        }

      const usersData = await usersResponse.json();
      const rawUsers = (usersData.data || []) as AgentUserApi[];
      const agentUsers = rawUsers.filter((user) => user.role === 'AGENT');

      // Calculate metrics for each agent
      const agentMetrics: AgentAnalytics[] = agentUsers.map((user) => {
          const agentApplications = applications.filter(
            (app) => app.agent?._id === user._id || app.agent?.fullName === user.fullName
          );

          const totalCommission = agentApplications.reduce(
            (sum, app) => sum + (app.agentCommission || 0),
            0
          );

          const totalRevenue = agentApplications.reduce(
            (sum, app) => sum + (app.amount || 0),
            0
          );

          const totalApplications = agentApplications.length;
          const averageCommission = totalApplications > 0 ? totalCommission / totalApplications : 0;

          return {
            _id: user._id,
            agentId: user._id,
            agentFullName: user.fullName,
            name: user.fullName,
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            province: user.province || '',
            district: user.district || '',
            sector: user.sector || '',
            status: user.status || 'ACTIVE',
            totalCommission,
            totalApplications,
            averageCommission,
            totalRevenue,
            createdAt: user.createdAt,
            bankName: user.bankName || '',
            bankAccountNumber: user.bankAccountNumber || ''
          };
        });

        setAgents(agentMetrics);
      }
    } catch (error) {
      console.error('Error fetching agent analytics:', error);
      showToast('Failed to load agent analytics data', 'error');
      // Fallback to dummy data on error if needed
      if (USE_DUMMY_DATA) {
        const dummyData = generateDummyData(startDate, endDate);
        setAgents(dummyData);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, startDate, endDate, generateDummyData, USE_DUMMY_DATA]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        await Promise.all([
          fetchAgentsData(),
          fetchWeeklyCommission(),
          fetchAnalyticsAPIs()
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, token]);

  // Get unique provinces for filter
  const uniqueProvinces = useMemo(() => {
    const provinces = new Set(agents.map(agent => agent.province).filter(Boolean));
    return Array.from(provinces).sort();
  }, [agents]);

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    const filtered = agents.filter(agent => {
      const matchesSearch = 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.phoneNumber.includes(searchQuery) ||
        (agent.agentId && agent.agentId.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesProvince = provinceFilter === 'all' || agent.province === provinceFilter;
      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      
      return matchesSearch && matchesProvince && matchesStatus;
    });

    // Sort
    const normalizeValue = (value: string | number | undefined, field: SortField): string | number => {
      if (field === 'name' || field === 'province') {
        if (typeof value === 'string') {
          return value.toLowerCase();
        }
        return '';
      }

      if (typeof value === 'number') {
        return value;
      }

      return 0;
    };

    filtered.sort((a, b) => {
      const aValue = normalizeValue(a[sortField] as string | number | undefined, sortField);
      const bValue = normalizeValue(b[sortField] as string | number | undefined, sortField);
      
      if (aValue === bValue) return 0;

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [agents, searchQuery, provinceFilter, statusFilter, sortField, sortDirection]);

  // Paginated agents
  const paginatedAgents = filteredAndSortedAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Summary statistics - use API data if available, otherwise calculate from filtered agents
  const summaryStats = useMemo(() => {
    if (overallAnalytics) {
      // Use data from getAgentAnalytics API
      return {
        totalAgents: allAgentsDetails.length,
        totalCommission: overallAnalytics.totalCommissionEarned,
        totalApplications: overallAnalytics.numberOfApplications,
        averageCommission: overallAnalytics.averageCommissionPerApplication,
        totalRevenue: overallAnalytics.totalAmountEarned
      };
    }
    
    // Fallback to calculated stats from filtered agents
    const totalAgents = filteredAndSortedAgents.length;
    const totalCommission = filteredAndSortedAgents.reduce((sum, agent) => sum + agent.totalCommission, 0);
    const totalApplications = filteredAndSortedAgents.reduce((sum, agent) => sum + agent.totalApplications, 0);
    const averageCommission = totalAgents > 0 ? totalCommission / totalAgents : 0;
    const totalRevenue = filteredAndSortedAgents.reduce((sum, agent) => sum + agent.totalRevenue, 0);

    return {
      totalAgents,
      totalCommission,
      totalApplications,
      averageCommission,
      totalRevenue
    };
  }, [overallAnalytics, allAgentsDetails.length, filteredAndSortedAgents]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Chart data for top agents - use API data if available, otherwise use filtered agents
  const topAgentsChartData = useMemo(() => {
    if (topAgentsPerformance.length > 0) {
      // Use data from getTopAgentsPerfomance API
      return topAgentsPerformance.map((agent, index) => ({
        name: agent.fullName.length > 12 ? agent.fullName.substring(0, 12) + '...' : agent.fullName,
        commission: agent.totalCommission,
        applications: agent.numberOfApplications,
        revenue: 0, // Not provided by API
        rank: index + 1
      }));
    }
    
    // Fallback to filtered agents data
    return filteredAndSortedAgents
      .slice(0, 10)
      .map((agent, index) => ({
        name: agent.name.length > 12 ? agent.name.substring(0, 12) + '...' : agent.name,
        commission: agent.totalCommission,
        applications: agent.totalApplications,
        revenue: agent.totalRevenue,
        rank: index + 1
      }));
  }, [topAgentsPerformance, filteredAndSortedAgents]);

  // Performance trend data from API
  const performanceTrendData = useMemo(() => {
    if (weeklyCommissionData && weeklyCommissionData.data) {
      // Map API data to chart format
      return weeklyCommissionData.data.map((item) => ({
        day: item.day,
        commission: item.totalCommission,
        applications: 0 // API doesn't provide applications, keeping for compatibility
      }));
    }
    // Fallback to dummy data if API data not available
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalCommission = summaryStats.totalCommission;
    return days.map((day) => ({
      day,
      commission: Math.round(totalCommission * (0.1 + Math.random() * 0.15)),
      applications: Math.round(summaryStats.totalApplications * (0.1 + Math.random() * 0.15))
    }));
  }, [weeklyCommissionData, summaryStats]);

  // Chart data for province distribution
  const provinceChartData = useMemo(() => {
    const provinceMap = new Map<string, { commission: number; agents: number }>();
    
    filteredAndSortedAgents.forEach(agent => {
      const province = agent.province || 'Unknown';
      const existing = provinceMap.get(province) || { commission: 0, agents: 0 };
      provinceMap.set(province, {
        commission: existing.commission + agent.totalCommission,
        agents: existing.agents + 1
      });
    });

    return Array.from(provinceMap.entries()).map(([province, data]) => ({
      name: province,
      commission: data.commission,
      agents: data.agents
    }));
  }, [filteredAndSortedAgents]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Agent Name', 'Email', 'Phone', 'Province', 'Total Commission (RWF)', 'Total Applications', 'Average Commission (RWF)', 'Total Revenue (RWF)'];
    const rows = filteredAndSortedAgents.map(agent => [
      agent.name,
      agent.email,
      agent.phoneNumber,
      agent.province || 'N/A',
      agent.totalCommission.toLocaleString(),
      agent.totalApplications.toString(),
      agent.averageCommission.toFixed(2),
      agent.totalRevenue.toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agent-analytics-${startDate}-to-${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="absolute top-0 left-0 w-full h-[11vh] overflow-hidden z-0  bg-gradient-to-br from-[#0A2540] to-[#126BB3]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Agent Analytics</h1>
                <p className="mt-1 text-xs text-gray-500">
                  Performance metrics and commission tracking
                </p>
              </div>
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs w-full sm:w-auto justify-center sm:justify-start"
              >
                <Download className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-medium text-gray-700">Date Range</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 w-16">From:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  max={endDate}
                  className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 w-16">To:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  max={getTodayDate()}
                  className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {/* Total Agents Card */}
            <div className="group relative bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl shadow-sm border border-blue-100/50 p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/20 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wider mb-1.5">Total Agents</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-12 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalAgents).toLocaleString()
                    )}
                  </p>
                  <p className="text-[10px] text-blue-600">Active performers</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Total Commission Card */}
            <div className="group relative bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 rounded-xl shadow-sm border border-emerald-100/50 p-5 hover:shadow-lg hover:border-emerald-200 transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider mb-1.5">Total Commission</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalCommission).toLocaleString() + ' RWF'
                    )}
                  </p>
                  <p className="text-[10px] text-emerald-600">Commission earned</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Total Applications Card */}
            <div className="group relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-sm border border-indigo-100/50 p-5 hover:shadow-lg hover:border-indigo-200 transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-200/20 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-indigo-700 uppercase tracking-wider mb-1.5">Applications</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-12 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalApplications).toLocaleString()
                    )}
                  </p>
                  <p className="text-[10px] text-indigo-600">Processed</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <FileText className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Average Commission Card */}
            <div className="group relative bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-xl shadow-sm border border-amber-100/50 p-5 hover:shadow-lg hover:border-amber-200 transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/20 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wider mb-1.5">Avg Commission</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-14 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.averageCommission).toLocaleString() + ' RWF'
                    )}
                  </p>
                  <p className="text-[10px] text-amber-600">Per agent</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </div>

            {/* Total Revenue Card */}
            <div className="group relative bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 rounded-xl shadow-sm border border-rose-100/50 p-5 hover:shadow-lg hover:border-rose-200 transition-all duration-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/20 rounded-full -mr-12 -mt-12"></div>
              <div className="relative flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-rose-700 uppercase tracking-wider mb-1.5">Total Revenue</p>
                  <p className="text-lg font-semibold text-gray-900 mb-0.5">
                    {isLoading ? (
                      <span className="inline-block w-16 h-5 bg-gray-200 rounded animate-pulse"></span>
                    ) : (
                      Math.round(summaryStats.totalRevenue).toLocaleString() + ' RWF'
                    )}
                  </p>
                  <p className="text-[10px] text-rose-600">Generated</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                  <Activity className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section - Creative Layout */}
          {!isLoading && filteredAndSortedAgents.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Top Agents Performance - Composed Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                    Top Agents Performance
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={topAgentsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      angle={-35}
                      textAnchor="end"
                      height={75}
                      tick={{ fontSize: 8, fill: '#64748b' }}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      width={45}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 9, fill: '#94a3b8' }}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'commission') return [`${value.toLocaleString()} RWF`, 'Commission'];
                        if (name === 'applications') return [value, 'Applications'];
                        return [value, name];
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: '4px', fontSize: '11px', color: '#334155' }}
                    />
                    <Bar 
                      yAxisId="left"
                      dataKey="commission" 
                      fill="#64748b" 
                      name="Commission"
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="applications" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      dot={{ fill: '#94a3b8', r: 3 }}
                      name="Applications"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Performance Trend */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                    Weekly Trend
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceTrendData} margin={{ top: 10, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="day"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        fontSize: '11px'
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} RWF`, 'Commission']}
                      labelStyle={{ fontWeight: 600, marginBottom: '4px', fontSize: '11px', color: '#334155' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="commission" 
                      stroke="#64748b" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCommission)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Province Distribution - Compact View */}
              <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <PieChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
                    Regional Distribution
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {provinceChartData
                    .sort((a, b) => b.commission - a.commission)
                    .map((province) => {
                      const total = provinceChartData.reduce((sum, p) => sum + p.commission, 0);
                      const percent = ((province.commission / total) * 100).toFixed(1);
                      return (
                        <div key={province.name} className="flex flex-col items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs font-medium text-slate-700 mb-2 text-center">{province.name}</div>
                          <div className="text-lg font-semibold text-gray-900 mb-1">
                            {percent}%
                          </div>
                          <div className="text-[10px] text-slate-600 text-center">
                            {province.commission.toLocaleString()} RWF
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {province.agents} {province.agents === 1 ? 'agent' : 'agents'}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Filters and Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-6">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-7 h-8 w-full text-xs border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 px-2.5"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={provinceFilter}
                  onChange={(e) => {
                    setProvinceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 sm:flex-none min-w-[120px] px-2.5 py-1 h-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                >
                  <option value="all">All Provinces</option>
                  {uniqueProvinces.map(province => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 sm:flex-none min-w-[120px] px-2.5 py-1 h-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Agents Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading agent analytics...</p>
              </div>
            ) : filteredAndSortedAgents.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-16 w-16 mx-auto text-gray-400" />
                <p className="mt-4 text-gray-600">No agents found matching your criteria</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-2">
                            Agent Name
                            <SortIcon field="name" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('totalApplications')}>
                          <div className="flex items-center gap-2">
                            Applications
                            <SortIcon field="totalApplications" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('totalCommission')}>
                          <div className="flex items-center gap-2">
                            Total Commission
                            <SortIcon field="totalCommission" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('averageCommission')}>
                          <div className="flex items-center gap-2">
                            Avg Commission
                            <SortIcon field="averageCommission" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                            onClick={() => handleSort('totalRevenue')}>
                          <div className="flex items-center gap-2">
                            Total Revenue
                            <SortIcon field="totalRevenue" />
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedAgents.map((agent) => (
                        <tr key={agent._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                            <div className="text-sm text-gray-500">{agent.email}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{agent.phoneNumber}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{agent.province || 'N/A'}</div>
                            {agent.district && (
                              <div className="text-sm text-gray-500">{agent.district}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.totalApplications}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {agent.totalCommission.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.averageCommission.toFixed(2)} RWF
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {agent.totalRevenue.toLocaleString()} RWF
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              agent.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800'
                                : agent.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {agent.status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 h-7 px-2.5 text-xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                              onClick={() => setSelectedAgent(agent)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">View</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredAndSortedAgents.length / itemsPerPage)}
                  totalItems={filteredAndSortedAgents.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          isOpen={!!selectedAgent}
          onClose={() => setSelectedAgent(null)}
          agentId={selectedAgent.agentId || selectedAgent._id}
          agentName={selectedAgent.name}
          agentEmail={selectedAgent.email}
          token={token || ''}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
      )}
      
      <ToastContainer />
    </MainLayout>
  );
}


