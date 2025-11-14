import React, { useEffect, useState } from 'react';

interface FlipCardTimerProps {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const FlipCardTimer: React.FC<FlipCardTimerProps> = ({ 
  days, 
  hours, 
  minutes, 
  seconds, 
  isExpired = false,
  size = 'small'
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isExpired) {
    return (
      <div className="text-red-600 font-bold text-sm md:text-base">
        Expired
      </div>
    );
  }

  // Tamanhos baseados no prop size
  const sizeConfig = {
    small: {
      height: 40,
      width: 28,
      fontSize: 18,
      gap: 4
    },
    medium: {
      height: 60,
      width: 42,
      fontSize: 28,
      gap: 6
    },
    large: {
      height: 80,
      width: 56,
      fontSize: 36,
      gap: 8
    }
  };

  const config = sizeConfig[size];

  // Função para criar um flip card de número
  const FlipCard = ({ value, label }: { value: number; label: string }) => {
    const tens = Math.floor(value / 10);
    const ones = value % 10;

    return (
      <div className="flex flex-col items-center" style={{ gap: config.gap }}>
        <div className="flex items-center justify-center" style={{ gap: 2 }}>
          {/* Dezenas */}
          <div 
            className="flip-num-container"
            data-size={size}
            style={{
              height: config.height,
              width: config.width,
            }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`flip-num flip-num-${i}`}
                data-num={i}
                data-num-next={i === 9 ? 0 : i + 1}
                style={{
                  display: tens === i ? 'block' : 'none',
                }}
              />
            ))}
          </div>
          
          {/* Unidades */}
          <div 
            className="flip-num-container"
            data-size={size}
            style={{
              height: config.height,
              width: config.width,
            }}
          >
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`flip-num flip-num-${i}`}
                data-num={i}
                data-num-next={i === 9 ? 0 : i + 1}
                style={{
                  display: ones === i ? 'block' : 'none',
                }}
              />
            ))}
          </div>
        </div>
        <span className="text-[10px] text-gray-600 mt-1 uppercase font-medium">{label}</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .flip-num-container {
          position: relative;
          perspective: 1000px;
          border-radius: 8px;
          box-shadow: 3px 3px 6px rgba(42, 42, 42, 0.15), -3px -3px 6px rgba(255, 255, 255, 0.5);
          background: #e0e0e0;
          overflow: hidden;
        }

        .flip-num-container::before {
          content: "";
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 1px;
          background: #d2d2d2;
          z-index: 1000;
          transform: translateY(-1px);
        }

        .flip-num {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }

        .flip-num::before,
        .flip-num::after {
          backface-visibility: hidden;
          color: #333;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 50%;
          left: 0;
          overflow: hidden;
          position: absolute;
          text-align: center;
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.08);
          width: 100%;
          font-weight: bold;
        }
        
        .flip-num-container[data-size="small"] .flip-num::before,
        .flip-num-container[data-size="small"] .flip-num::after {
          font-size: 18px;
        }
        
        .flip-num-container[data-size="medium"] .flip-num::before,
        .flip-num-container[data-size="medium"] .flip-num::after {
          font-size: 28px;
        }
        
        .flip-num-container[data-size="large"] .flip-num::before,
        .flip-num-container[data-size="large"] .flip-num::after {
          font-size: 36px;
        }

        .flip-num::before {
          background: #e0e0e0;
          border-radius: 8px 8px 0 0;
          content: attr(data-num);
          line-height: 1.38;
          top: 0;
          z-index: 1;
        }

        .flip-num::after {
          background: #e0e0e0;
          border-bottom: 1px solid #d2d2d2;
          border-radius: 0 0 8px 8px;
          content: attr(data-num-next);
          height: calc(50% - 1px);
          line-height: 0;
          top: 50%;
          transform: rotateX(180deg);
        }
      `}</style>
      
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <FlipCard value={days} label="days" />
        <span className="text-gray-400 text-sm font-bold">:</span>
        <FlipCard value={hours} label="hours" />
        <span className="text-gray-400 text-sm font-bold">:</span>
        <FlipCard value={minutes} label="min" />
        <span className="text-gray-400 text-sm font-bold">:</span>
        <FlipCard value={seconds} label="sec" />
      </div>
    </>
  );
};

export default FlipCardTimer;
