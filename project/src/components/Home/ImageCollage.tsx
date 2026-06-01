import React from 'react';

interface ImageCollageProps {
  mainImage: string;
  secondaryImage: string;
  mainAlt?: string;
  secondaryAlt?: string;
  className?: string;
}

const ImageCollage: React.FC<ImageCollageProps> = ({
  mainImage,
  secondaryImage,
  mainAlt = '',
  secondaryAlt = '',
  className = '',
}) => {
  return (
    <div
      className={`relative w-full ${className}`}
      style={{ aspectRatio: '1 / 1.1' }}
    >
      {/* Dotted texture (bottom-right corner) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(15, 23, 42, 0.18) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          backgroundPosition: 'right bottom',
          WebkitMaskImage:
            'radial-gradient(ellipse at bottom right, #000 0%, #000 35%, transparent 70%)',
          maskImage:
            'radial-gradient(ellipse at bottom right, #000 0%, #000 35%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Single red decorative shape — centered horizontally & vertically, BEHIND both images */}
      <div
        aria-hidden="true"
        className="absolute bg-[#D0151C] rounded-[28px]"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '52%',
          height: '52%',
          zIndex: 1,
        }}
      />

      {/* Main image — TOP-RIGHT */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{
          top: '4%',
          right: '4%',
          width: '58%',
          height: '58%',
          border: '6px solid #FFFFFF',
          borderRadius: '32px',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)',
          zIndex: 3,
        }}
      >
        <img
          src={mainImage}
          alt={mainAlt}
          loading="lazy"
          className="w-full h-full object-cover block"
        />
      </div>

      {/* Secondary image — BOTTOM-LEFT, same size as main, overlapping the red shape */}
      <div
        className="absolute overflow-hidden bg-white"
        style={{
          bottom: '4%',
          left: '4%',
          width: '58%',
          height: '58%',
          border: '6px solid #FFFFFF',
          borderRadius: '32px',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)',
          zIndex: 2,
        }}
      >
        <img
          src={secondaryImage}
          alt={secondaryAlt}
          loading="lazy"
          className="w-full h-full object-cover block"
        />
      </div>
    </div>
  );
};

export default ImageCollage;
