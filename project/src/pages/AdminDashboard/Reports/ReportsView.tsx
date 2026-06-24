import React from 'react';
import { useReportsData } from './hooks/useReportsData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, FileText, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#d0ed57'];

export default function ReportsView() {
  const {
    isLoading,
    error,
    filters,
    setFilters,
    filteredStudents,
    stageChart,
    partnerChart,
    scholarshipChart,
    universityChart,
    totals,
    filterOptions
  } = useReportsData();

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading reports data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load reports.</div>;

  const handleExportExcel = () => {
    const dataToExport = filteredStudents.map(s => ({
      'Aluno': s.student_name,
      'Email': s.student_email,
      'Parceiro/Agência': s.agency_name || 'Direct / Sem Agência',
      'Universidade': s.university_name || 'N/A',
      'Bolsa': s.scholarship_title || 'N/A',
      'Estágio Atual': s.currentStageLabel,
      'Data de Inscrição': s.applied_at ? format(new Date(s.applied_at), 'dd/MM/yyyy') : 'N/A',
      'App Fee Pago?': s.is_application_fee_paid ? 'Sim' : 'Não',
      'App Fee (USD)': s.application_fee_amount || 0,
      'Placement Fee Pago?': s.is_placement_fee_paid ? 'Sim' : 'Não',
      'Placement Fee (USD)': s.placement_fee_amount || 0,
      'Scholarship Fee Pago?': s.is_scholarship_fee_paid ? 'Sim' : 'Não',
      'Scholarship Fee (USD)': s.scholarship_fee_amount || 0,
      'Taxas Pendentes (Estimativa USD)': (() => {
        let pending = 0;
        if (!s.is_application_fee_paid && s.application_fee_amount) pending += s.application_fee_amount;
        if (s.placement_fee_flow && !s.is_placement_fee_paid && s.placement_fee_amount) pending += s.placement_fee_amount;
        if (!s.placement_fee_flow && !s.is_scholarship_fee_paid && s.scholarship_fee_amount) pending += s.scholarship_fee_amount;
        return pending;
      })()
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatorio_Alunos");
    XLSX.writeFile(wb, `Relatorio_MatriculaUSA_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.text('Relatório Matrícula USA', 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Total de Alunos: ${totals.count}`, 14, 32);
    
    let y = 45;
    doc.setFontSize(10);
    doc.text('Aluno', 14, y);
    doc.text('Parceiro', 70, y);
    doc.text('Estágio', 130, y);
    doc.text('Universidade', 200, y);
    
    y += 5;
    doc.line(14, y, 280, y);
    y += 7;

    filteredStudents.slice(0, 50).forEach((s, idx) => { // Limit to 50 for simple PDF
      if (y > 190) {
        doc.addPage();
        y = 20;
      }
      doc.text((s.student_name || '').substring(0, 25), 14, y);
      doc.text((s.agency_name || 'Direct').substring(0, 25), 70, y);
      doc.text((s.currentStageLabel || '').substring(0, 30), 130, y);
      doc.text((s.university_name || '').substring(0, 30), 200, y);
      y += 8;
    });

    if (filteredStudents.length > 50) {
      doc.text('... e mais registros. (Exporte para Excel para ver todos)', 14, y + 10);
    }

    doc.save(`Relatorio_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-end gap-4">
        <div className="flex flex-wrap gap-3">
          <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </button>
          <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
            <FileText className="w-4 h-4 mr-2" />
            Exportar PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041d38] transition shadow-md">
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data De</label>
            <input 
              type="date" 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Até</label>
            <input 
              type="date" 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Parceiro (Agência)</label>
            <select 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.partner}
              onChange={e => setFilters(f => ({ ...f, partner: e.target.value }))}
            >
              <option value="all">Todos os Parceiros</option>
              <option value="direct">Direct (Sem Agência)</option>
              {filterOptions.partners.map((p: any) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Estágio do Funil</label>
            <select 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.stage}
              onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
            >
              <option value="all">Todos os Estágios</option>
              {filterOptions.stages.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Universidade</label>
            <select 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.university}
              onChange={e => setFilters(f => ({ ...f, university: e.target.value }))}
            >
              <option value="all">Todas</option>
              {filterOptions.universities.map((u: any) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Bolsa</label>
            <select 
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.scholarship}
              onChange={e => setFilters(f => ({ ...f, scholarship: e.target.value }))}
            >
              <option value="all">Todas</option>
              {filterOptions.scholarships.map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total de Alunos</p>
          <p className="text-3xl font-bold text-slate-800">{totals.count}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">App Fees Pagos (USD)</p>
          <p className="text-3xl font-bold text-green-600">${totals.applicationFees}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Placement Fees Pagos</p>
          <p className="text-3xl font-bold text-blue-600">${totals.placementFees}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Scholarship Fees Pagos</p>
          <p className="text-3xl font-bold text-purple-600">${totals.scholarshipFees}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-6">Alunos por Estágio do Funil (%)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChart} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value: number, name: string, props: any) => [`${value} Alunos (${props.payload.percentage.toFixed(1)}%)`, 'Total']} />
                <Bar dataKey="value" fill="#05294E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Partner Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-6">Alunos por Parceiro/Agência</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partnerChart}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {partnerChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => [`${value} Alunos`, 'Total']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scholarship Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-6">Top Bolsas Escolhidas</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scholarshipChart.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <RechartsTooltip formatter={(value: number) => [`${value} Alunos`, 'Total']} />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* University Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-6">Alunos por Universidade</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={universityChart.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <RechartsTooltip formatter={(value: number) => [`${value} Alunos`, 'Total']} />
                <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Detalhes dos Alunos</h3>
          <span className="text-sm text-slate-500">Mostrando {filteredStudents.length} resultados</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Aluno</th>
                <th className="px-6 py-3">Parceiro</th>
                <th className="px-6 py-3">Universidade</th>
                <th className="px-6 py-3">Estágio Atual</th>
                <th className="px-6 py-3 text-center">Taxas Pagas (USD)</th>
                <th className="px-6 py-3 text-center">Taxas Pendentes (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const paidFees = 
                  (student.is_application_fee_paid ? (student.application_fee_amount || 0) : 0) +
                  (student.is_placement_fee_paid ? (student.placement_fee_amount || 0) : 0) +
                  (student.is_scholarship_fee_paid ? (student.scholarship_fee_amount || 0) : 0);
                  
                return (
                  <tr key={student.user_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.student_name}</td>
                    <td className="px-6 py-4">{student.agency_name || <span className="text-slate-400">Direct</span>}</td>
                    <td className="px-6 py-4">{student.university_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.currentStageLabel}
                      </span>
                    </td>
                  <td className="px-6 py-4 text-center font-semibold text-green-600">
                      ${paidFees}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-red-500">
                      ${(() => {
                        let pending = 0;
                        if (!student.is_application_fee_paid && student.application_fee_amount) pending += student.application_fee_amount;
                        if (student.placement_fee_flow && !student.is_placement_fee_paid && student.placement_fee_amount) pending += student.placement_fee_amount;
                        if (!student.placement_fee_flow && !student.is_scholarship_fee_paid && student.scholarship_fee_amount) pending += student.scholarship_fee_amount;
                        return pending;
                      })()}
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Nenhum aluno encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
