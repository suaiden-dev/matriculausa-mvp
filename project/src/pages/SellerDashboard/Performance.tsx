import React from 'react';
import { TrendingUp, Users, DollarSign, Calendar, Award, Target } from 'lucide-react';

interface PerformanceProps {
  stats: any;
  sellerProfile: any;
  students: any[];
}

const Performance: React.FC<PerformanceProps> = ({ stats, sellerProfile, students }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Simulated monthly data for charts
  const monthlyData = [
    { month: 'Jan', students: 2, revenue: 3000 },
    { month: 'Feb', students: 1, revenue: 1500 },
    { month: 'Mar', students: 4, revenue: 6000 },
    { month: 'Apr', students: 3, revenue: 4500 },
    { month: 'May', students: 5, revenue: 7500 },
    { month: 'Jun', students: stats.monthlyStudents, revenue: stats.totalRevenue * 0.3 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance & Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your performance as a seller
        </p>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Students</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-green-600 font-medium">+{stats.monthlyStudents}</span>
            <span className="text-slate-600 ml-1">this month</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">
              Average: {formatCurrency(stats.totalRevenue / stats.totalStudents || 0)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{stats.conversionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">Excellent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Ranking</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">#3</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-600">Among all sellers</span>
          </div>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">Monthly Performance</h3>
          <Calendar className="h-5 w-5 text-slate-400" />
        </div>
        
        <div className="space-y-4">
          {monthlyData.map((data, index) => (
            <div key={data.month} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 text-sm text-slate-600 font-medium">{data.month}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-3 min-w-[200px]">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((data.students / 5) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-right min-w-[120px]">
                <div className="text-sm font-medium text-slate-900">{data.students} students</div>
                <div className="text-xs text-slate-500">{formatCurrency(data.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Goals and Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Goals */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Monthly Goals</h3>
            <Target className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Students</span>
                <span className="text-sm text-slate-600">{stats.monthlyStudents}/10</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((stats.monthlyStudents / 10) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Revenue</span>
                <span className="text-sm text-slate-600">{formatCurrency(stats.totalRevenue * 0.3)}/$15,000</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(((stats.totalRevenue * 0.3) / 15000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Conversion Rate</span>
                <span className="text-sm text-slate-600">{stats.conversionRate}%/90%</span>
              </div>
              <div className="bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((stats.conversionRate / 90) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Achievements</h3>
            <Award className="h-5 w-5 text-slate-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">First Referral</h4>
                <p className="text-sm text-slate-600">You made your first referral!</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">5 Students</h4>
                <p className="text-sm text-slate-600">Reached the 5 students mark!</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">$10K in Revenue</h4>
                <p className="text-sm text-slate-600">Generated over $10,000!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gradient-to-r from-red-50 to-blue-50 rounded-xl border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">🎯 Strength</h4>
            <p className="text-sm text-slate-600">
              Your {stats.conversionRate}% conversion rate is above the 75% average
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">📈 Opportunity</h4>
            <p className="text-sm text-slate-600">
              Share more on social media to increase your reach
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">⭐ Recommendation</h4>
            <p className="text-sm text-slate-600">
              Use referral tools to optimize your sharing
            </p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-slate-900 mb-2">🚀 Next Level</h4>
            <p className="text-sm text-slate-600">
              Only {10 - stats.monthlyStudents} students left for your monthly goal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Performance;
