import React from 'react';

interface PencilLoaderProps {
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Componente reutilizável de animação de busca (lupa) para análise de documentos
 * Substitui a animação de spinner padrão por uma animação mais visual e atrativa
 * Cores azuis alinhadas com o tema do site
 */
export const PencilLoader: React.FC<PencilLoaderProps> = ({ 
  title = 'Analisando seus documentos...',
  description = 'Isso pode levar até 40 segundos. Por favor, não feche esta janela.',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="loader">
        <div className="loaderMiniContainer">
          <div className="barContainer">
            <span className="bar" />
            <span className="bar bar2" />
          </div>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 101 114" 
            className="svgIcon"
          >
            <circle 
              strokeWidth={7} 
              stroke="rgb(37, 99, 235)" 
              transform="rotate(36.0692 46.1726 46.1727)" 
              r="29.5497" 
              cy="46.1727" 
              cx="46.1726"
              fill="rgba(37, 99, 235, 0.238)"
            />
            <line 
              strokeWidth={7} 
              stroke="rgb(37, 99, 235)" 
              y2="111.784" 
              x2="97.7088" 
              y1="67.7837" 
              x1="61.7089"
            />
          </svg>
        </div>
      </div>
      <div className="mt-6 text-center">
        <div className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
          {title}
        </div>
        <div className="text-slate-500 text-center text-xs sm:text-sm px-2">
          {description}
        </div>
      </div>
      <style>{`
        .loader {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .loaderMiniContainer {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 130px;
          height: fit-content;
        }
        .barContainer {
          width: 100%;
          height: fit-content;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          gap: 10px;
          background-position: left;
        }
        .bar {
          width: 100%;
          height: 8px;
          background: linear-gradient(
            to right,
            rgb(59, 130, 246),
            rgb(147, 197, 253),
            rgb(59, 130, 246)
          );
          background-size: 200% 100%;
          border-radius: 10px;
          animation: bar ease-in-out 3s infinite alternate-reverse;
        }
        @keyframes bar {
          0% {
            background-position: left;
          }
          100% {
            background-position: right;
          }
        }
        .bar2 {
          width: 50%;
        }
        .svgIcon {
          position: absolute;
          left: -25px;
          margin-top: 18px;
          z-index: 2;
          width: 70%;
          animation: search ease-in-out 3s infinite alternate-reverse;
        }
        @keyframes search {
          0% {
            transform: translateX(0%) rotate(70deg);
          }
          100% {
            transform: translateX(100px) rotate(10deg);
          }
        }
        .svgIcon circle,
        .svgIcon line {
          stroke: rgb(37, 99, 235);
        }
        .svgIcon circle {
          fill: rgba(37, 99, 235, 0.238);
        }
      `}</style>
    </div>
  );
};

export default PencilLoader;
