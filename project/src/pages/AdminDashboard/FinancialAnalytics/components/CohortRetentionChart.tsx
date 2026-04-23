import { Users } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import type { CohortRetentionData } from '../data/types';

export interface CohortRetentionChartProps {
  data: CohortRetentionData[];
}

// Fluxo atual (sempre exibido)
const CURRENT_STAGES = [
  { key: 'application' as const,   label: 'Application',  color: '#6366F1' },
  { key: 'ds160_package' as const, label: 'DS-160',       color: '#14B8A6' },
  { key: 'i539_package' as const,  label: 'I-539',        color: '#06B6D4' },
  { key: 'placement' as const,     label: 'Placement',    color: '#10B981' },
];

// Legado (exibido apenas se ao menos um cohort tiver dados > 0)
const LEGACY_STAGES = [
  { key: 'i20_control' as const,  label: 'I-20 Ctrl',    color: '#F59E0B' },
  { key: 'scholarship' as const,  label: 'Scholarship',  color: '#8B5CF6' },
  { key: 'reinstatement' as const,label: 'Reinstatement',color: '#EF4444' },
];

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function heatColor(percentage: number): string {
  if (percentage === 0) return 'bg-gray-100 text-gray-400';
  if (percentage < 20)  return 'bg-red-100 text-red-700';
  if (percentage < 40)  return 'bg-orange-100 text-orange-700';
  if (percentage < 60)  return 'bg-yellow-100 text-yellow-700';
  if (percentage < 80)  return 'bg-emerald-100 text-emerald-700';
  return 'bg-green-200 text-green-800';
}

export function CohortRetentionChart({ data }: CohortRetentionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-sm text-gray-400">Nenhum dado de cohort disponível. É necessário haver pagamentos de Processo Seletivo para gerar cohorts.</p>
      </div>
    );
  }

  // Verificar se algum cohort tem dados legados para decidir exibir as colunas
  const hasLegacyData = data.some(row =>
    row.i20_control > 0 || row.scholarship > 0 || row.reinstatement > 0
  );

  const visibleLegacyStages = hasLegacyData ? LEGACY_STAGES : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-500" />
          Cohort Retention Funnel
          <InfoTooltip text="Cada linha é um cohort: alunos que pagaram o Processo Seletivo naquele mês. As colunas mostram quantos % desse grupo avançou para cada etapa seguinte. Colunas legadas (I-20, Scholarship) aparecem apenas quando há dados históricos." />
        </h2>
        <div className="flex items-center gap-2">
          {hasLegacyData && (
            <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              inclui dados legados
            </span>
          )}
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            Últimos {data.length} meses
          </span>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" />{'< 20%'}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 inline-block" />20–40%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" />40–60%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-100 inline-block" />60–80%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" />{'> 80%'}</span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 py-2 pr-4 whitespace-nowrap">Cohort</th>

              {/* Tamanho do cohort */}
              <th className="text-center text-xs font-semibold text-gray-500 py-2 px-3 whitespace-nowrap">
                <span className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  Selection Paid
                </span>
              </th>

              {/* Fluxo atual */}
              {CURRENT_STAGES.map(s => (
                <th key={s.key} className="text-center text-xs font-semibold text-gray-500 py-2 px-3 whitespace-nowrap">
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                </th>
              ))}

              {/* Separador legado */}
              {visibleLegacyStages.length > 0 && (
                <th className="py-2 px-1">
                  <div className="w-px h-5 bg-gray-200 mx-auto" />
                </th>
              )}

              {/* Legado */}
              {visibleLegacyStages.map(s => (
                <th key={s.key} className="text-center text-xs font-semibold text-amber-500 py-2 px-3 whitespace-nowrap">
                  <span className="flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                </th>
              ))}
            </tr>

            {/* Sub-header para indicar fluxo */}
            <tr className="border-b border-gray-100">
              <td />
              <td />
              <td colSpan={CURRENT_STAGES.length} className="text-center text-[10px] text-indigo-400 pb-1 px-1">
                ── fluxo atual ──
              </td>
              {visibleLegacyStages.length > 0 && <td />}
              {visibleLegacyStages.length > 0 && (
                <td colSpan={visibleLegacyStages.length} className="text-center text-[10px] text-amber-400 pb-1 px-1">
                  ── legado ──
                </td>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.cohortMonth} className="hover:bg-gray-50 transition-colors">
                {/* Mês do cohort */}
                <td className="py-2.5 pr-4 font-medium text-gray-700 whitespace-nowrap text-xs">{row.cohortMonth}</td>

                {/* Tamanho */}
                <td className="py-2.5 px-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700">
                    {row.cohortSize}
                  </span>
                </td>

                {/* Fluxo atual */}
                {CURRENT_STAGES.map(s => {
                  const val = row[s.key];
                  const p = pct(val, row.cohortSize);
                  return (
                    <td key={s.key} className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold min-w-[52px] ${heatColor(p)}`}
                        title={`${val} alunos (${p}%)`}
                      >
                        {val > 0 ? `${val} (${p}%)` : '—'}
                      </span>
                    </td>
                  );
                })}

                {/* Separador */}
                {visibleLegacyStages.length > 0 && <td className="px-1"><div className="w-px h-5 bg-gray-200 mx-auto" /></td>}

                {/* Legado */}
                {visibleLegacyStages.map(s => {
                  const val = row[s.key];
                  const p = pct(val, row.cohortSize);
                  return (
                    <td key={s.key} className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold min-w-[52px] ${val > 0 ? heatColor(p) : 'bg-gray-50 text-gray-300'}`}
                        title={`${val} alunos (${p}%)`}
                      >
                        {val > 0 ? `${val} (${p}%)` : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Linha de média geral */}
          {(() => {
            const totalCohortSize = data.reduce((s, r) => s + r.cohortSize, 0);
            const allStages = [...CURRENT_STAGES, ...visibleLegacyStages];
            return (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td className="py-2.5 pr-4 text-xs font-bold text-gray-600 whitespace-nowrap">Avg. Rate</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
                      {Math.round(totalCohortSize / data.length)}
                    </span>
                  </td>
                  {allStages.map((s, i) => {
                    if (i === CURRENT_STAGES.length && visibleLegacyStages.length > 0) return null;
                    const totalVal = data.reduce((sum, r) => sum + (r[s.key] as number), 0);
                    const avgPct = totalCohortSize > 0 ? Math.round((totalVal / totalCohortSize) * 100) : 0;
                    return (
                      <td key={s.key} className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold min-w-[52px] ${heatColor(avgPct)}`}>
                          {avgPct}%
                        </span>
                      </td>
                    );
                  })}
                  {visibleLegacyStages.length > 0 && <td />}
                  {visibleLegacyStages.map(s => {
                    const totalVal = data.reduce((sum, r) => sum + (r[s.key] as number), 0);
                    const avgPct = totalCohortSize > 0 ? Math.round((totalVal / totalCohortSize) * 100) : 0;
                    return (
                      <td key={s.key} className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold min-w-[52px] ${avgPct > 0 ? heatColor(avgPct) : 'bg-gray-50 text-gray-300'}`}>
                          {avgPct > 0 ? `${avgPct}%` : '—'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {/* Rodapé */}
      <p className="text-[11px] text-gray-400 mt-4">
        * Cohorts recentes podem ter taxas baixas por os alunos ainda estarem no processo. DS-160 e I-539 são mutuamente exclusivos. Dados históricos completos independente do filtro de período.
      </p>
    </div>
  );
}
