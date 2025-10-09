import React, { useState, useRef, useEffect } from 'react';
import { getDisplayFilename, getTooltipFilename, shouldNormalize } from '../utils/filenameNormalizer';

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showTooltip?: boolean;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  breakWords?: boolean;
  isFilename?: boolean;
  documentType?: string;
}

const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  maxLength = 100,
  className = '',
  showTooltip = true,
  tooltipPosition = 'top',
  breakWords = false,
  isFilename = false,
  documentType
}) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltipState, setShowTooltipState] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      setIsTruncated(element.scrollWidth > element.clientWidth || text.length > maxLength);
    }
  }, [text, maxLength]);

  // Normalizar nome de arquivo se necessário
  const displayText = isFilename ? getDisplayFilename(text, documentType) : text;
  const tooltipText = isFilename ? getTooltipFilename(text) : text;
  const truncatedText = displayText.length > maxLength ? displayText.substring(0, maxLength) + '...' : displayText;

  const tooltipClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block w-full">
      <div
        ref={textRef}
        className={`${className} ${isTruncated && showTooltip ? 'cursor-help' : ''}`}
        onMouseEnter={() => isTruncated && showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        style={{
          wordBreak: breakWords ? 'break-all' : 'break-word',
          overflowWrap: 'break-word',
          hyphens: 'auto'
        }}
      >
        {truncatedText}
      </div>
      
      {isTruncated && showTooltip && showTooltipState && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal max-w-xs ${tooltipClasses[tooltipPosition]}`}
          style={{ wordBreak: 'break-word' }}
        >
          {tooltipText}
          <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            tooltipPosition === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
            tooltipPosition === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
            tooltipPosition === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
            'right-full top-1/2 -translate-y-1/2 -mr-1'
          }`} />
        </div>
      )}
    </div>
  );
};

export default TruncatedText;
