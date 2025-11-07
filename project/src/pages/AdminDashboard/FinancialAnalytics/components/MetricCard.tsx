import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  iconColor: string;
  textColor: string;
  sublabel?: ReactNode;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
  iconColor,
  textColor,
  sublabel
}: MetricCardProps) {
  return (
    <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} rounded-xl p-6 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${textColor} text-sm font-medium`}>{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sublabel && (
            <div className="flex items-center mt-2">
              {sublabel}
            </div>
          )}
        </div>
        <Icon size={32} className={iconColor} />
      </div>
    </div>
  );
}

