import React from 'react';
import { GraduationCap, DollarSign, Users, BarChart3 } from 'lucide-react';

interface StatsCardsProps {
  filteredStudents: any[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ filteredStudents }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const totalRevenue = filteredStudents.reduce((sum, student) => sum + (student.total_paid || 0), 0);
  const avgRevenuePerStudent = filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Students</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{filteredStudents.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Active Sellers</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {new Set(filteredStudents.map(s => s.referred_by_seller_id).filter(Boolean)).size}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Avg. Revenue/Student</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">
              {formatCurrency(avgRevenuePerStudent)}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
