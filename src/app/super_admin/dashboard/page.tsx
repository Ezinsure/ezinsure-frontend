"use client"

import React, { useState, useEffect } from 'react';
import { Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { TrendingUp, Users, DollarSign, Download, UserCheck, Activity, ArrowUpRight, ArrowDownRight, Settings, Database, Server, Key } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { MainLayout } from '@/components/ui/main-layout';

const SuperAdminDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for super admin dashboard
  const mockData = {
    revenueData: [
      { month: 'Jan', revenue: 2450000, agents: 45, clients: 342, applications: 289, conversion: 84.5 },
      { month: 'Feb', revenue: 2890000, agents: 52, clients: 398, applications: 356, conversion: 89.3 },
      { month: 'Mar', revenue: 3120000, agents: 48, clients: 445, applications: 402, conversion: 90.3 },
      { month: 'Apr', revenue: 3680000, agents: 61, clients: 523, applications: 478, conversion: 91.4 },
      { month: 'May', revenue: 4250000, agents: 68, clients: 612, applications: 567, conversion: 92.6 },
      { month: 'Jun', revenue: 4890000, agents: 75, clients: 698, applications: 645, conversion: 92.4 },
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
      title: 'System Health',
      value: '99.9%',
      change: '0%',
      changeType: 'neutral',
      icon: <Server className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      subtitle: 'Uptime'
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
      title: 'Active Agents',
      value: '342',
      change: '+12.3%',
      changeType: 'increase',
      icon: <UserCheck className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      subtitle: 'Currently active'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Super Admin Dashboard</h2>
          <p className="text-gray-600">Initializing system overview...</p>
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
                <h1 className="text-4xl font-bold mb-2">Super Admin Dashboard</h1>
                <p className="text-blue-100 text-lg">System-wide overview and controls</p>
              </div>
              
              <div className="flex gap-4">
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-blue-300 rounded-lg bg-white/90 backdrop-blur text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="this_month">This Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                </select>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
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
                  <p className="text-gray-600">Monthly performance trends</p>
                </div>
                
                <select className="px-3 py-2 text-sm border rounded-lg">
                  <option>Last 6 months</option>
                  <option>Last year</option>
                </select>
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
                    
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      fill="url(#revenueGradient)"
                      name="Revenue"
                    />
                    
                    <Line 
                      type="monotone" 
                      dataKey="agents" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      name="Active Agents"
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

          {/* Regional Performance */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
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

          {/* System Controls Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">System Controls</h3>
                <p className="text-gray-600">Critical system administration functions</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {['overview', 'settings', 'security', 'backup'].map((tab) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-blue-600" />
                    Authentication Settings
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Require 2FA for all admin accounts</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Password Rotation</p>
                        <p className="text-sm text-gray-600">Require password change every 90 days</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Session Timeout</p>
                        <p className="text-sm text-gray-600">30 minutes of inactivity</p>
                      </div>
                      <select className="px-3 py-2 text-sm border rounded-lg">
                        <option>15 minutes</option>
                        <option selected>30 minutes</option>
                        <option>1 hour</option>
                        <option>2 hours</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    Database Backup
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Last Backup</p>
                        <p className="text-sm text-gray-600">June 12, 2023 at 2:30 AM</p>
                      </div>
                      <span className="text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        Successful
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Backup Frequency</p>
                        <p className="text-sm text-gray-600">Daily at 2:00 AM</p>
                      </div>
                      <select className="px-3 py-2 text-sm border rounded-lg">
                        <option>Daily</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Storage Location</p>
                        <p className="text-sm text-gray-600">AWS S3 (us-east-1)</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Change Location
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* System Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Settings className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">System Configuration</h3>
                  <p className="text-blue-100">Manage platform settings and configurations</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                  System Settings
                </button>
                <button className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors border border-blue-400">
                  API Management
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">Data Management</h3>
                  <p className="text-emerald-100">Backup, restore and manage system data</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors">
                  Backup Now
                </button>
                <button className="flex-1 px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-400 transition-colors border border-emerald-400">
                  Restore Data
                </button>
              </div>
            </div>
          </div>

          {/* Footer Stats */}
          <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 rounded-2xl p-8 text-white">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-2">System Overview</h3>
              <p className="text-gray-300">Real-time system statistics and performance indicators</p>
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

export default SuperAdminDashboard;