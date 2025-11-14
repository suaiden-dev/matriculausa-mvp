import React from 'react';

export interface RefreshButtonProps {
  onClick?: () => void | Promise<void>;
  isRefreshing?: boolean;
  disabled?: boolean;
  className?: string;
  title?: string;
}

const RefreshButtonBase: React.FC<RefreshButtonProps> = ({
  onClick,
  isRefreshing = false,
  disabled = false,
  className,
  title = 'Refresh',
}) => {
  const handleClick = () => {
    if (disabled || isRefreshing || !onClick) return;
    
    const result = onClick();
    // Se retornar uma Promise, tratar erros
    if (result instanceof Promise) {
      result.catch(console.error);
    }
  };

  const isInteractive = !disabled && !isRefreshing;

  return (
    <div className={className}>
      <style>{`
        @keyframes refresh-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .refresh-button-svg-spinning {
          animation: refresh-spin 1s linear infinite;
        }
      `}</style>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isRefreshing}
        title={title}
        className={`
          group relative w-[150px] h-10 cursor-pointer flex items-center
          border-2 border-gray-300
          bg-gray-100 rounded-lg overflow-hidden
          transition-all duration-300
          ${isInteractive ? 'hover:bg-gray-200' : ''}
          ${disabled || isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            transform transition-all duration-300 font-medium text-gray-700
            ${isRefreshing ? 'text-transparent' : 'translate-x-[30px]'}
            ${isInteractive ? 'group-hover:text-transparent' : ''}
          `}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </span>
        <span
          className={`
            absolute h-full w-[39px] bg-gray-100
            flex items-center justify-center
            transition-all duration-300
            ${isRefreshing ? 'w-[148px] translate-x-0' : 'translate-x-[109px]'}
            ${isInteractive ? 'group-hover:w-[148px] group-hover:translate-x-0' : ''}
          `}
        >
          <svg
            className={`
              w-5 fill-gray-700
              ${isRefreshing ? 'refresh-button-svg-spinning' : ''}
            `}
            height={48}
            viewBox="0 0 48 48"
            width={48}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M35.3 12.7c-2.89-2.9-6.88-4.7-11.3-4.7-8.84 0-15.98 7.16-15.98 16s7.14 16 15.98 16c7.45 0 13.69-5.1 15.46-12h-4.16c-1.65 4.66-6.07 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.31 0 6.28 1.38 8.45 3.55l-6.45 6.45h14v-14l-4.7 4.7z" />
            <path d="M0 0h48v48h-48z" fill="none" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export const RefreshButton = React.memo(RefreshButtonBase);
export default RefreshButton;

