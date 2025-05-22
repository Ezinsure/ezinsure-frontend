"use client"

import React, { useState, useEffect } from 'react';
import { Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { TrendingUp, Users, DollarSign, Download, Search, UserCheck, Target, Award, Activity, Briefcase, Shield, Globe, ArrowUpRight, ArrowDownRight, Eye, EyeOff, RefreshCw } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { MainLayout } from '@/components/ui/main-layout';


const AdminDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState('all');
  const [showProfitChart, setShowProfitChart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for admin dashboard
  const mockData = {
    revenueData: [
      { month: 'Jan', revenue: 2450000, agents: 45, clients: 342, applications: 289, conversion: 84.5 },
      { month: 'Feb', revenue: 2890000, agents: 52, clients: 398, applications: 356, conversion: 89.3 },
      { month: 'Mar', revenue: 3120000, agents: 48, clients: 445, applications: 402, conversion: 90.3 },
      { month: 'Apr', revenue: 3680000, agents: 61, clients: 523, applications: 478, conversion: 91.4 },
      { month: 'May', revenue: 4250000, agents: 68, clients: 612, applications: 567, conversion: 92.6 },
      { month: 'Jun', revenue: 4890000, agents: 75, clients: 698, applications: 645, conversion: 92.4 },
    ],
    dailyMetrics: [
      { day: 'Mon', revenue: 145000, applications: 23, agents: 8, clients: 34 },
      { day: 'Tue', revenue: 189000, applications: 31, agents: 12, clients: 45 },
      { day: 'Wed', revenue: 167000, applications: 28, agents: 9, clients: 38 },
      { day: 'Thu', revenue: 234000, applications: 42, agents: 15, clients: 58 },
      { day: 'Fri', revenue: 198000, applications: 35, agents: 11, clients: 49 },
      { day: 'Sat', revenue: 123000, applications: 18, agents: 6, clients: 28 },
      { day: 'Sun', revenue: 89000, applications: 12, agents: 4, clients: 19 },
    ],
    insuranceDistribution: [
      { name: 'Car Insurance', value: 42, revenue: 1850000, color: '#3B82F6' },
      { name: 'Health Insurance', value: 28, revenue: 1450000, color: '#10B981' },
      { name: 'Travel Insurance', value: 15, revenue: 680000, color: '#F59E0B' },
      { name: 'Building Insurance', value: 10, revenue: 520000, color: '#EF4444' },
      { name: 'Fire Insurance', value: 5, revenue: 390000, color: '#8B5CF6' },
    ],
    regionData: [
      { region: 'Kigali', agents: 45, clients: 342, revenue: 1850000, growth: 23.5 },
      { region: 'Northern Province', agents: 28, clients: 198, revenue: 980000, growth: 18.2 },
      { region: 'Southern Province', agents: 32, clients: 245, revenue: 1250000, growth: 15.8 },
      { region: 'Eastern Province', agents: 25, clients: 167, revenue: 890000, growth: 21.3 },
      { region: 'Western Province', agents: 22, clients: 145, revenue: 720000, growth: 19.7 },
    ],
    topAgents: [
      { id: 'AG001', name: 'Jean Uwimana', clients: 45, revenue: 285000, commission: 28500, status: 'active', region: 'Kigali' },
      { id: 'AG002', name: 'Marie Mukamana', clients: 38, revenue: 242000, commission: 24200, status: 'active', region: 'Southern Province' },
      { id: 'AG003', name: 'Paul Nshimiyimana', clients: 35, revenue: 198000, commission: 19800, status: 'active', region: 'Northern Province' },
      { id: 'AG004', name: 'Grace Uwizeyimana', clients: 32, revenue: 185000, commission: 18500, status: 'active', region: 'Eastern Province' },
      { id: 'AG005', name: 'David Habimana', clients: 29, revenue: 167000, commission: 16700, status: 'active', region: 'Western Province' },
    ],
    recentApplications: [
      { id: 'APP001', client: 'Alice Mukamana', agent: 'Jean Uwimana', type: 'Car', amount: '125,000 RWF', status: 'approved', time: '2 hours ago', region: 'Kigali' },
      { id: 'APP002', client: 'Bob Nshimiyimana', agent: 'Marie Mukamana', type: 'Health', amount: '89,000 RWF', status: 'pending', time: '4 hours ago', region: 'Southern Province' },
      { id: 'APP003', client: 'Carol Uwimana', agent: 'Paul Nshimiyimana', type: 'Travel', amount: '45,000 RWF', status: 'approved', time: '6 hours ago', region: 'Northern Province' },
      { id: 'APP004', client: 'David Habimana', agent: 'Grace Uwizeyimana', type: 'Building', amount: '245,000 RWF', status: 'completed', time: '1 day ago', region: 'Eastern Province' },
      { id: 'APP005', client: 'Eva Mukamana', agent: 'David Habimana', type: 'Fire', amount: '189,000 RWF', status: 'review', time: '1 day ago', region: 'Western Province' },
    ]
  };

  const statsCards = [
    {
      title: 'Total Revenue',
      value: '24,890,000 RWF',
      change: '+23.5%',
      changeType: 'increase',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      subtitle: 'This month'
    },
    {
      title: 'Active Agents',
      value: '342',
      change: '+12.3%',
      changeType: 'increase',
      icon: <UserCheck className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Currently active'
    },
    {
      title: 'Total Clients',
      value: '12,450',
      change: '+18.7%',
      changeType: 'increase',
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      subtitle: 'Registered clients'
    },
    {
      title: 'Applications',
      value: '2,847',
      change: '+8.2%',
      changeType: 'increase',
      icon: <Briefcase className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      subtitle: 'This month'
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
      value: '21,500 RWF',
      change: '+5.8%',
      changeType: 'increase',
      icon: <Award className="w-6 h-6" />,
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      subtitle: 'Per agent/month'
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
      value: '5',
      change: '0%',
      changeType: 'neutral',
      icon: <Globe className="w-6 h-6" />,
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      subtitle: 'Provinces covered'
    }
  ];

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 800);
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

  const filteredApplications = mockData.recentApplications.filter(app =>
    app.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 group"
              style={{ animationDelay: `${index * 50}ms` }}
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
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockData.revenueData}>
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
            </div>
          </div>

          {/* Insurance Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Insurance Types</h3>
            <p className="text-gray-600 text-sm mb-6">Revenue distribution by policy type</p>
            
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockData.insuranceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockData.insuranceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}%`,
                      `${props.payload.revenue.toLocaleString()} RWF`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-3">
              {mockData.insuranceDistribution.map((type, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{type.name}</span>
                      <p className="text-xs text-gray-500">{type.revenue.toLocaleString()} RWF</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{type.value}%</span>
                </div>
              ))}
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
              {mockData.regionData.map((region, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{region.region}</h4>
                      <p className="text-sm text-gray-600">{region.agents} agents • {region.clients} clients</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{region.revenue.toLocaleString()} RWF</p>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        +{region.growth}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${region.growth * 2}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Metrics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Daily Performance</h3>
            <p className="text-gray-600 text-sm mb-6">This week&apos;s daily breakdown</p>
            
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData.dailyMetrics}>
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
                    dataKey="revenue" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                  <Bar 
                    dataKey="applications" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
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
              <button className="text-blue-600 text-sm font-semibold hover:text-blue-700 transition-colors">
                View All
              </button>
            </div>
            
            <div className="space-y-4">
              {mockData.topAgents.map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-sm text-gray-600">{agent.region} • {agent.clients} clients</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{agent.revenue.toLocaleString()} RWF</p>
                    <p className="text-sm text-gray-600">Commission: {agent.commission.toLocaleString()} RWF</p>
                  </div>
                </div>
              ))}
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
                </select>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredApplications.map((app, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {app.client.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{app.client}</p>
                      <p className="text-sm text-gray-600">{app.type} • {app.agent} • {app.time}</p>
                      <p className="text-xs text-gray-500">{app.region}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{app.amount}</p>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      app.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      app.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'review' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
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
                <LineChart data={mockData.revenueData}>
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
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={4}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2 }}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="agents" 
                    stroke="#10B981" 
                    strokeWidth={4}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: '#10B981', strokeWidth: 2 }}
                    name="Active Agents"
                  />
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