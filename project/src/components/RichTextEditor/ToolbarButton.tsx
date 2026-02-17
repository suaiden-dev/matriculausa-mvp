import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ToolbarButtonProps {
    icon: LucideIcon;
    title: string;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    icon: Icon,
    title,
    onClick,
    active = false,
    disabled = false,
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`
        p-2 rounded-lg transition-all flex items-center justify-center
        ${active
                    ? 'bg-blue-100 text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
};

export default ToolbarButton;
