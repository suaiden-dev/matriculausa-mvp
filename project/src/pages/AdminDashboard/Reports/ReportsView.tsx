import React from 'react';
import { useReportsData } from './hooks/useReportsData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#d0ed57'];

export default function ReportsView() {
  const {
    isLoading,
    isStale,
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

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      {/* Actions bar */}
      <div className="flex justify-between items-center">
        <div className="h-9 w-52 bg-slate-200 rounded-lg" />
        <div className="flex gap-3">
          <div className="h-9 w-32 bg-slate-200 rounded-lg" />
          <div className="h-9 w-36 bg-slate-200 rounded-lg" />
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <div className="h-4 w-16 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-3 w-56 bg-slate-100 rounded" />
            <div className="space-y-3 mt-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j}>
                  <div className="flex justify-between mb-1">
                    <div className="h-3 bg-slate-200 rounded" style={{ width: `${55 + j * 8}%` }} />
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-6 py-4 grid grid-cols-6 gap-4">
              <div className="h-3 bg-slate-200 rounded col-span-1" />
              <div className="h-3 bg-slate-100 rounded col-span-1" />
              <div className="h-3 bg-slate-100 rounded col-span-1" />
              <div className="h-3 bg-slate-200 rounded col-span-1" />
              <div className="h-3 bg-slate-100 rounded col-span-1" />
              <div className="h-3 bg-slate-100 rounded col-span-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (error) return <div className="p-8 text-center text-red-500">Failed to load reports.</div>;

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Matrícula USA';
    wb.created = new Date();

    const navyArgb = 'FF05294E';
    const styleHeader = (ws: ExcelJS.Worksheet) => {
      ws.getRow(1).height = 22;
      ws.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navyArgb } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
      });
    };

    // ---- Sheet 1: Students ----
    const wsAlunos = wb.addWorksheet('Students');
    wsAlunos.columns = [
      { header: 'Student', key: 'nome', width: 32 },
      { header: 'Email', key: 'email', width: 36 },
      { header: 'Partner / Agency', key: 'parceiro', width: 24 },
      { header: 'University', key: 'universidade', width: 28 },
      { header: 'Scholarship', key: 'bolsa', width: 28 },
      { header: 'Current Stage', key: 'estagio', width: 24 },
      { header: 'Enrollment Date', key: 'data', width: 16 },
      { header: 'Selection Fee Paid?', key: 'selFeePago', width: 18 },
      { header: 'App Fee Paid?', key: 'appFeePago', width: 14 },
      { header: 'App Fee (USD)', key: 'appFee', width: 15 },
      { header: 'Placement Fee Paid?', key: 'placFeePago', width: 18 },
      { header: 'Placement Fee (USD)', key: 'placFee', width: 18 },
      { header: 'Scholarship Fee Paid?', key: 'scholFeePago', width: 20 },
      { header: 'Scholarship Fee (USD)', key: 'scholFee', width: 20 },
      { header: 'Total Paid (USD)', key: 'totalPago', width: 16 },
      { header: 'Total Pending (USD)', key: 'totalPendente', width: 18 },
    ];
    styleHeader(wsAlunos);

    let sumAppFee = 0, sumPlacFee = 0, sumScholFee = 0, sumTotalPaid = 0, sumTotalPending = 0;

    filteredStudents.forEach(s => {
      const isMigma = (s as any).source === 'migma';
      const paidFees =
        (s.is_application_fee_paid ? (s.application_fee_amount || 0) : 0) +
        (s.is_placement_fee_paid ? (s.placement_fee_amount || 0) : 0) +
        (s.is_scholarship_fee_paid ? (s.scholarship_fee_amount || 0) : 0);
      let pending = 0;
      if (!s.is_application_fee_paid && s.application_fee_amount) pending += s.application_fee_amount;
      if (!isMigma && s.placement_fee_flow && !s.is_placement_fee_paid && s.placement_fee_amount) pending += s.placement_fee_amount;
      if (!isMigma && !s.placement_fee_flow && !s.is_scholarship_fee_paid && s.scholarship_fee_amount) pending += s.scholarship_fee_amount;

      sumAppFee += s.is_application_fee_paid ? (s.application_fee_amount || 0) : 0;
      sumPlacFee += s.is_placement_fee_paid ? (s.placement_fee_amount || 0) : 0;
      sumScholFee += s.is_scholarship_fee_paid ? (s.scholarship_fee_amount || 0) : 0;
      sumTotalPaid += paidFees;
      sumTotalPending += pending;

      wsAlunos.addRow({
        nome: s.student_name,
        email: s.student_email,
        parceiro: (s as any).source === 'migma' ? 'Migma' : (s.agency_name || 'Direct / No Agency'),
        universidade: s.university_name || 'N/A',
        bolsa: s.scholarship_title || 'N/A',
        estagio: s.currentStageLabel,
        data: s.applied_at ? new Date(s.applied_at) : null,
        selFeePago: s.has_paid_selection_process_fee ? 'Yes' : 'No',
        appFeePago: s.is_application_fee_paid ? 'Yes' : 'No',
        appFee: s.is_application_fee_paid ? (s.application_fee_amount || 0) : 0,
        placFeePago: isMigma ? 'Via Migma' : s.is_placement_fee_paid ? 'Yes' : 'No',
        placFee: s.is_placement_fee_paid ? (s.placement_fee_amount || 0) : 0,
        scholFeePago: isMigma ? 'Via Migma' : s.is_scholarship_fee_paid ? 'Yes' : 'No',
        scholFee: s.is_scholarship_fee_paid ? (s.scholarship_fee_amount || 0) : 0,
        totalPago: paidFees,
        totalPendente: pending,
      });
    });

    (['appFee', 'placFee', 'scholFee', 'totalPago', 'totalPendente'] as const).forEach(key => {
      wsAlunos.getColumn(key).numFmt = '"$"#,##0.00';
    });
    wsAlunos.getColumn('data').numFmt = 'dd/mm/yyyy';

    const totalRow = wsAlunos.addRow({
      nome: 'TOTAL', email: '', parceiro: '', universidade: '', bolsa: '', estagio: '',
      data: null, selFeePago: '', appFeePago: '',
      appFee: sumAppFee, placFeePago: '', placFee: sumPlacFee,
      scholFeePago: '', scholFee: sumScholFee,
      totalPago: sumTotalPaid, totalPendente: sumTotalPending,
    });
    totalRow.font = { bold: true };
    totalRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });

    // ---- Helper for distribution sheets ----
    const addDistSheet = (name: string, col1Label: string, rows: Array<{ label: string; qty: number; pct: number }>) => {
      const ws = wb.addWorksheet(name);
      ws.columns = [
        { header: col1Label, key: 'label', width: 36 },
        { header: '# Students', key: 'qty', width: 14 },
        { header: '% of Total', key: 'pct', width: 12 },
      ];
      styleHeader(ws);
      rows.forEach(r => ws.addRow({ label: r.label, qty: r.qty, pct: r.pct / 100 }));
      ws.getColumn('qty').alignment = { horizontal: 'center' };
      ws.getColumn('pct').numFmt = '0.0%';
      ws.getColumn('pct').alignment = { horizontal: 'center' };
    };

    addDistSheet('By Partner', 'Partner / Agency',
      partnerChart.map(p => ({ label: p.name, qty: p.value, pct: p.percentage ?? 0 })));

    addDistSheet('By Stage', 'Funnel Stage',
      stageChart.map(e => ({ label: e.name, qty: e.value, pct: e.percentage ?? 0 })));

    // ---- Sheet 4: By Scholarship ----
    const scholarshipRevenue = new Map<string, number>();
    filteredStudents.forEach(s => {
      if (s.scholarship_title && s.is_application_fee_paid) {
        scholarshipRevenue.set(s.scholarship_title, (scholarshipRevenue.get(s.scholarship_title) || 0) + (s.application_fee_amount || 0));
      }
    });
    const wsBolsas = wb.addWorksheet('By Scholarship');
    wsBolsas.columns = [
      { header: 'Scholarship', key: 'bolsa', width: 36 },
      { header: '# Students', key: 'qty', width: 14 },
      { header: '% of Total', key: 'pct', width: 12 },
      { header: 'App Fees Collected (USD)', key: 'receita', width: 24 },
    ];
    styleHeader(wsBolsas);
    scholarshipChart.forEach(b => {
      wsBolsas.addRow({ bolsa: b.name, qty: b.value, pct: (b.percentage ?? 0) / 100, receita: scholarshipRevenue.get(b.name) || 0 });
    });
    wsBolsas.getColumn('qty').alignment = { horizontal: 'center' };
    wsBolsas.getColumn('pct').numFmt = '0.0%';
    wsBolsas.getColumn('pct').alignment = { horizontal: 'center' };
    wsBolsas.getColumn('receita').numFmt = '"$"#,##0.00';

    addDistSheet('By University', 'University',
      universityChart.map(u => ({ label: u.name, qty: u.value, pct: u.percentage ?? 0 })));

    // ---- Download ----
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_MatriculaUSA_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const dateStr = format(new Date(), 'dd/MM/yyyy');

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 41, 78);
    doc.text('Matrícula USA Report', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${dateStr}  •  Total Students: ${totals.count}  •  App Fees: $${totals.applicationFees.toLocaleString('en-US')}  •  Placement Fees: $${totals.placementFees.toLocaleString('en-US')}`, 14, 26);

    // Main table — all students, no limit
    autoTable(doc, {
      startY: 32,
      head: [['Student', 'Partner', 'University', 'Current Stage', 'Fees Paid', 'Pending Fees']],
      body: filteredStudents.map(s => {
        const isMigmaPdf = (s as any).source === 'migma';
        const paidNames: string[] = [];
        if (s.has_paid_selection_process_fee) paidNames.push('Selection Fee');
        if (s.is_application_fee_paid) paidNames.push('App Fee');
        if (s.is_placement_fee_paid) paidNames.push('Placement Fee');
        if (s.is_scholarship_fee_paid) paidNames.push('Scholarship Fee');

        const pendingNames: string[] = [];
        if (!s.is_application_fee_paid) pendingNames.push('App Fee');
        if (!isMigmaPdf && s.placement_fee_flow && !s.is_placement_fee_paid) pendingNames.push('Placement Fee');
        if (!isMigmaPdf && !s.placement_fee_flow && !s.is_scholarship_fee_paid) pendingNames.push('Scholarship Fee');

        return [
          s.student_name || '—',
          isMigmaPdf ? 'Migma' : (s.agency_name || 'Direct'),
          s.university_name || '—',
          s.currentStageLabel || '—',
          paidNames.join(', ') || '—',
          pendingNames.join(', ') || '—',
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [5, 41, 78], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
        5: { cellWidth: 45 },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`Report_MatriculaUSA_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <button
          onClick={() => setFilters(f => ({ ...f, showTestUsers: !f.showTestUsers }))}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition ${
            filters.showTestUsers
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${filters.showTestUsers ? 'bg-amber-400' : 'bg-slate-300'}`}>
            <span className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${filters.showTestUsers ? 'translate-x-4' : 'translate-x-0'}`} />
          </span>
          {isStale ? 'Updating...' : filters.showTestUsers ? 'Test users visible' : 'Hide test users'}
        </button>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportPDF} className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center px-4 py-2 bg-[#05294E] text-white rounded-lg hover:bg-[#041d38] transition shadow-md">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.dateFrom}
              onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.dateTo}
              onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Partner (Agency)</label>
            <select
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.partner}
              onChange={e => setFilters(f => ({ ...f, partner: e.target.value }))}
            >
              <option value="all">All Partners</option>
              <option value="direct">Direct (No Agency)</option>
              {filterOptions.partners.map((p: any) => <option key={p} value={p}>{p === 'migma' ? 'Migma' : p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Funnel Stage</label>
            <select
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.stage}
              onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
            >
              <option value="all">All Stages</option>
              {filterOptions.stages.map((s: any) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">University</label>
            <select
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.university}
              onChange={e => setFilters(f => ({ ...f, university: e.target.value }))}
            >
              <option value="all">All</option>
              {filterOptions.universities.map((u: any) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Scholarship</label>
            <select
              className="w-full text-sm rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
              value={filters.scholarship}
              onChange={e => setFilters(f => ({ ...f, scholarship: e.target.value }))}
            >
              <option value="all">All</option>
              {filterOptions.scholarships.map((s: any) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Total Students</p>
          <p className="text-3xl font-bold text-slate-800">{totals.count}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">App Fees Paid</p>
          <p className="text-3xl font-bold text-green-600">${totals.applicationFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm font-medium text-slate-500">Placement Fees Paid</p>
          <p className="text-3xl font-bold text-blue-600">${totals.placementFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-1">Where are your students now?</h3>
          <p className="text-xs text-slate-400 mb-4">Distribution by Kanban column — see where the pipeline is concentrated</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {stageChart.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
            {stageChart.map((stage, index) => (
              <div key={stage.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate mr-2">{stage.name}</span>
                  <span className="text-sm font-bold text-slate-900 shrink-0">
                    {stage.value} <span className="text-xs font-normal text-slate-400">({(stage.percentage ?? 0).toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stage.percentage ?? 0}%`,
                      backgroundColor: `hsl(${215 - index * 18}, 70%, ${40 + index * 4}%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-1">Students by Partner / Agency</h3>
          <p className="text-xs text-slate-400 mb-4">Student origin ranking in the pipeline</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {partnerChart.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
            {partnerChart.map((partner, index) => (
              <div key={partner.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate mr-2">{partner.name}</span>
                  <span className="text-sm font-bold text-slate-900 shrink-0">
                    {partner.value} <span className="text-xs font-normal text-slate-400">({(partner.percentage ?? 0).toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${partner.percentage ?? 0}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scholarship Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-1">Top Scholarships Selected</h3>
          <p className="text-xs text-slate-400 mb-4">Most selected scholarships in the pipeline</p>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {scholarshipChart.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
            {scholarshipChart.slice(0, 15).map((item, index) => (
              <div key={`${item.name}-${index}`}>
                <div className="flex items-start justify-between mb-1 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 shrink-0">
                    {item.value} <span className="text-xs font-normal text-slate-400">({(item.percentage ?? 0).toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-blue-500"
                    style={{ width: `${item.percentage ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* University Chart */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-md font-bold text-slate-800 mb-1">Students by University</h3>
          <p className="text-xs text-slate-400 mb-4">Student distribution by partner institution</p>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {universityChart.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No data available</p>
            )}
            {universityChart.map((uni, index) => (
              <div key={uni.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 truncate mr-2">{uni.name}</span>
                  <span className="text-sm font-bold text-slate-900 shrink-0">
                    {uni.value} <span className="text-xs font-normal text-slate-400">({(uni.percentage ?? 0).toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${uni.percentage ?? 0}%`,
                      backgroundColor: `hsl(${152 + index * 25}, 60%, ${42 + index * 3}%)`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Student Details</h3>
          <span className="text-sm text-slate-500">Showing {filteredStudents.length} results</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Partner</th>
                <th className="px-6 py-3">University</th>
                <th className="px-6 py-3">Current Stage</th>
                <th className="px-6 py-3">Fees Paid</th>
                <th className="px-6 py-3">Pending Fees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const isMigmaRow = (student as any).source === 'migma';
                const paidNames: string[] = [];
                if (student.has_paid_selection_process_fee) paidNames.push('Selection Fee');
                if (student.is_application_fee_paid) paidNames.push('App Fee');
                if (student.is_placement_fee_paid) paidNames.push('Placement Fee');
                if (student.is_scholarship_fee_paid) paidNames.push('Scholarship Fee');

                const pendingNames: string[] = [];
                if (!student.is_application_fee_paid) pendingNames.push('App Fee');
                if (!isMigmaRow && student.placement_fee_flow && !student.is_placement_fee_paid) pendingNames.push('Placement Fee');
                if (!isMigmaRow && !student.placement_fee_flow && !student.is_scholarship_fee_paid) pendingNames.push('Scholarship Fee');

                return (
                  <tr key={student.user_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{student.student_name}</td>
                    <td className="px-6 py-4">{isMigmaRow ? 'Migma' : (student.agency_name || <span className="text-slate-400">Direct</span>)}</td>
                    <td className="px-6 py-4">{student.university_name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {student.currentStageLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {paidNames.length > 0
                        ? <div className="flex flex-wrap gap-1">{paidNames.map(n => <span key={n} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">{n}</span>)}</div>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {pendingNames.length > 0
                        ? <div className="flex flex-wrap gap-1">{pendingNames.map(n => <span key={n} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">{n}</span>)}</div>
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No students found with the current filters.
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
