import { ReactNode } from 'react';
import { InfoTooltip } from './InfoTooltip';

export interface MetricCardProps {
  label: string;
  value: string | number;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  sublabel?: ReactNode;
  info?: string;
}

export function MetricCard({
  label,
  value,
  gradientFrom,
  gradientTo,
  textColor,
  sublabel,
  info,
}: MetricCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl p-8 text-white flex flex-col items-center text-center shadow-md transition-transform hover:scale-[1.02]`}>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <p className={`${textColor} text-sm font-semibold uppercase tracking-wider`}>{label}</p>
        {info && <InfoTooltip text={info} variant="dark" />}
      </div>
      <p className="text-4xl font-bold mb-3 tracking-tight">{value}</p>
      {sublabel && (
        <div className="flex items-center justify-center bg-black/10 px-3 py-1 rounded-full">
          {sublabel}
        </div>
      )}
    </div>
  );
}
