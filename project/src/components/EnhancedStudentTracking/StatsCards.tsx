import React from 'react';
import { GraduationCap, DollarSign, Users, BarChart3, UserCheck, UserX } from 'lucide-react';

interface StatsCardsProps {
  filteredStudents: any[];
  allStudents: any[]; // Todos os estudantes para calcular registrados sem pagamento
}

const StatsCards: React.FC<StatsCardsProps> = ({ filteredStudents, allStudents }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Separar estudantes que pagaram vs apenas registrados
  const paidStudents = filteredStudents.filter(s => s.has_paid_selection_process_fee);
  const registeredOnlyStudents = allStudents.filter(s => !s.has_paid_selection_process_fee);

  const totalRevenue = paidStudents.reduce((sum, student) => {
    const adjusted = Number((student as any).total_paid_adjusted);
    if (!isNaN(adjusted)) return sum + adjusted;
    return sum + (Number((student as any).total_paid) || 0);
  }, 0);
  const avgRevenuePerStudent = paidStudents.length > 0 ? totalRevenue / paidStudents.length : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Estudantes que pagaram */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Paid Students</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{paidStudents.length}</p>
            <p className="text-xs text-slate-500 mt-1">At least Selection Process paid</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <UserCheck className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Estudantes apenas registrados */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Registered Only</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{registeredOnlyStudents.length}</p>
            <p className="text-xs text-slate-500 mt-1">Not paid yet</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <UserX className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Total Revenue */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-slate-500 mt-1">From paid students</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Active Sellers */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Active Sellers</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {new Set(allStudents.map(s => s.referred_by_seller_id).filter(Boolean)).size}
            </p>
            <p className="text-xs text-slate-500 mt-1">With referrals</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Avg Revenue per Paid Student */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Avg. Revenue</p>
            <p className="text-3xl font-bold text-teal-600 mt-1">
              {formatCurrency(avgRevenuePerStudent)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Per paid student</p>
          </div>
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-teal-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
