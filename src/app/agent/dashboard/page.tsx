"use client"

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, DollarSign, Calendar, Download, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/ui/main-layout';
import type { TooltipProps } from 'recharts';


const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('this_month');
  const [showCommissionChart, setShowCommissionChart] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  const mockData = {
    commissionData: [
      { month: 'Jan', commission: 45000, clients: 12 },
      { month: 'Feb', commission: 52000, clients: 15 },
      { month: 'Mar', commission: 48000, clients: 14 },
      { month: 'Apr', commission: 61000, clients: 18 },
      { month: 'May', commission: 58000, clients: 16 },
      { month: 'Jun', commission: 67000, clients: 20 },
    ],
    weeklyData: [
      { day: 'Mon', commission: 8500, clients: 3 },
      { day: 'Tue', commission: 12000, clients: 4 },
      { day: 'Wed', commission: 9500, clients: 2 },
      { day: 'Thu', commission: 15500, clients: 5 },
      { day: 'Fri', commission: 11000, clients: 4 },
      { day: 'Sat', commission: 7500, clients: 2 },
      { day: 'Sun', commission: 4500, clients: 1 },
    ],
    insuranceTypes: [
      { name: 'Car Insurance', value: 35, color: '#3B82F6' },
      { name: 'Health Insurance', value: 25, color: '#10B981' },
      { name: 'Travel Insurance', value: 20, color: '#F59E0B' },
      { name: 'Building Insurance', value: 12, color: '#EF4444' },
      { name: 'SME Insurance', value: 8, color: '#8B5CF6' },
    ],
    recentApplications: [
      { id: 'AG007', client: 'Alice Johnson', type: 'Car', amount: '5,000 RWF', status: 'completed', time: '2 hours ago' },
      { id: 'AG008', client: 'Bob Wilson', type: 'Health', amount: '4,000 RWF', status: 'pending', time: '4 hours ago' },
      { id: 'AG009', client: 'Carol Brown', type: 'Travel', amount: '2,500 RWF', status: 'approved', time: '6 hours ago' },
      { id: 'AG010', client: 'David Lee', type: 'Building', amount: '12,000 RWF', status: 'completed', time: '1 day ago' },
    ]
  };

  const statsCards = [
    {
      title: 'Today',
      commission: '24,500 RWF',
      clients: 7,
      growth: '+12%',
      icon: <Calendar className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'This Week',
      commission: '168,500 RWF',
      clients: 21,
      growth: '+8%',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'This Month',
      commission: '658,000 RWF',
      clients: 89,
      growth: '+15%',
      icon: <DollarSign className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    },
    {
      title: 'This Year',
      commission: '6,890,000 RWF',
      clients: 892,
      growth: '+23%',
      icon: <Users className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 500);
  }, []);


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

  if (isLoading) {
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
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_year">This Year</option>
              </select>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <div className={card.textColor}>{card.icon}</div>
                </div>
                <span className="text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-1 rounded-full">
                  {card.growth}
                </span>
              </div>
              
              <h3 className="text-gray-500 text-sm font-medium mb-1">{card.title}</h3>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{card.commission}</p>
                <p className="text-gray-600 text-sm">{card.clients} clients</p>
              </div>
            </div>
          ))}
        </div>

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
                <AreaChart data={mockData.commissionData}>
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
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insurance Types Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Insurance Distribution</h3>
            <p className="text-gray-600 text-sm mb-6">By policy type</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockData.insuranceTypes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {mockData.insuranceTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    labelStyle={{ color: '#374151' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 mt-4">
              {mockData.insuranceTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="text-sm text-gray-600">{type.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{type.value}%</span>
                </div>
              ))}
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
                <BarChart data={mockData.weeklyData}>
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
              {mockData.recentApplications.map((app, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {app.client.split(' ').map(n => n[0]).join('')}
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
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
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