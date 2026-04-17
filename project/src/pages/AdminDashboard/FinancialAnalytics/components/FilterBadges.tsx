import { X } from 'lucide-react';

export interface FilterBadge {
  label: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'teal';
}

const COLOR_MAP: Record<FilterBadge['color'], string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  teal:   'bg-teal-50 text-teal-700 border-teal-200',
};

export interface FilterBadgesProps {
  badges: FilterBadge[];
}

/**
 * Exibe os filtros ativos como chips dentro dos cards de gráficos.
 * Não renderiza nada se não houver filtros ativos.
 */
export function FilterBadges({ badges }: FilterBadgesProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2 pb-3 border-b border-gray-100">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
        <X className="w-2.5 h-2.5" />
        Filters
      </span>
      {badges.map((badge, i) => (
        <span
          key={i}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${COLOR_MAP[badge.color]}`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
