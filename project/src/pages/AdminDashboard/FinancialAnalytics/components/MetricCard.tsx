import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  textColor: string;
  sublabel?: ReactNode;
  info?: string;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconColor,
  textColor,
  sublabel,
  info,
}: MetricCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-xl p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className={`${textColor} text-sm font-medium`}>{label}</p>
            {info && <InfoTooltip text={info} variant="dark" />}
          </div>
          <p className="text-2xl font-bold">{value}</p>
          {sublabel && (
            <div className="flex items-center mt-2">
              {sublabel}
            </div>
          )}
        </div>
        <Icon size={32} className={`${iconColor} shrink-0 ml-3`} />
      </div>
    </div>
  );
}
