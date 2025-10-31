import React from 'react';
import { Download } from 'lucide-react';

type ExportButtonProps = {
  onExport: () => void;
  disabled?: boolean;
};

const ExportButtonBase: React.FC<ExportButtonProps> = ({ onExport, disabled }) => {
  return (
    <button
      onClick={onExport}
      disabled={disabled}
      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
    >
      <Download size={16} />
      Export CSV
    </button>
  );
};

export const ExportButton = React.memo(ExportButtonBase);
export default ExportButton;

import React from 'react';

export interface ExportButtonProps {
	loading?: boolean;
	onExport: () => Promise<void> | void;
}

export function ExportButton(_props: ExportButtonProps) {
	return null;
}

export default ExportButton;


