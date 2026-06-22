import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SlideData {
  title: string;
  button?: string;
  src: string;
}

interface CarouselProps {
  slides: SlideData[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
}

interface SlidePosition {
  x: string;
  scale: number;
  z: number;
  rotateY: number;
  opacity: number;
  zIndex: number;
}

const positions: Record<string, SlidePosition> = {
  left: { x: '-42%', scale: 0.78, z: -120, rotateY: 20, opacity: 0.55, zIndex: 1 },
  center: { x: '0%', scale: 1, z: 0, rotateY: 0, opacity: 1, zIndex: 10 },
  right: { x: '42%', scale: 0.78, z: -120, rotateY: -20, opacity: 0.55, zIndex: 1 },
  hiddenLeft: { x: '-80%', scale: 0.5, z: -300, rotateY: 30, opacity: 0, zIndex: 0 },
  hiddenRight: { x: '80%', scale: 0.5, z: -300, rotateY: -30, opacity: 0, zIndex: 0 },
};

const Carousel: React.FC<CarouselProps> = ({
  slides,
  autoPlay = true,
  autoPlayInterval = 5000,
  showControls = true,
}) => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    setResetKey((k) => k + 1);
  }, []);

  const goNext = useCallback(() => {
    next();
    setResetKey((k) => k + 1);
  }, [next]);

  const goPrev = useCallback(() => {
    prev();
    setResetKey((k) => k + 1);
  }, [prev]);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    setPaused(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) {
      goNext();
    } else if (diff < -threshold) {
      goPrev();
    }
    setPaused(false);
  }, [goNext, goPrev]);

  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
    setPaused(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    touchEndX.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) {
      goNext();
    } else if (diff < -threshold) {
      goPrev();
    }
    setPaused(false);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!autoPlay || paused) return;
    const timer = setInterval(next, autoPlayInterval);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlayInterval, next, paused, resetKey]);

  const getPosition = (index: number): SlidePosition => {
    const diff = (index - current + slides.length) % slides.length;
    if (diff === 0) return positions.center;
    if (diff === 1) return positions.right;
    if (diff === slides.length - 1) return positions.left;
    if (diff <= slides.length / 2) return positions.hiddenRight;
    return positions.hiddenLeft;
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div
        className="relative h-[380px] sm:h-[380px] md:h-[460px] lg:h-[520px] touch-pan-y cursor-grab active:cursor-grabbing select-none"
        style={{ perspective: '1200px' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {slides.map((slide, i) => {
          const pos = getPosition(i);
          const isCenter = pos === positions.center;

          return (
            <motion.div
              key={i}
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                x: pos.x,
                scale: pos.scale,
                z: pos.z,
                rotateY: pos.rotateY,
                opacity: pos.opacity,
                zIndex: pos.zIndex,
              }}
              transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div
                className={`relative h-full overflow-hidden shadow-lg ${
                  isCenter
                    ? 'w-[88%] sm:w-[70%] md:w-[60%] rounded-3xl shadow-2xl shadow-black/30 group'
                    : 'w-[82%] sm:w-[65%] md:w-[55%] rounded-2xl'
                }`}
                onMouseEnter={() => isCenter && setPaused(true)}
                onMouseLeave={() => isCenter && setPaused(false)}
              >
                <img
                  src={slide.src}
                  alt={slide.title}
                  className={`w-full h-full object-cover ${
                    isCenter ? 'transition-transform duration-700 group-hover:scale-105' : ''
                  }`}
                  loading="lazy"
                  style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
                />
                <div
                  className={`absolute inset-0 ${
                    isCenter
                      ? 'bg-gradient-to-t from-black/70 via-black/10 to-transparent'
                      : 'bg-black/40'
                  }`}
                />
                {isCenter && (
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                    <motion.h3
                      key={`title-${current}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      className="text-white font-black text-lg sm:text-2xl md:text-3xl drop-shadow-lg"
                    >
                      {slide.title}
                    </motion.h3>
                    {slide.button && (
                      <motion.span
                        key={`btn-${current}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="inline-block mt-2 sm:mt-3 text-white/80 text-xs sm:text-sm font-semibold tracking-wide"
                      >
                        {slide.button}
                      </motion.span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Navigation controls */}
      <div className={`flex items-center justify-center gap-4 mt-6${showControls ? '' : ' hidden'}`}>
        <button
          onClick={goPrev}
          className="hidden sm:flex w-10 h-10 rounded-full bg-[#05294E]/10 hover:bg-[#05294E]/20 items-center justify-center text-[#05294E] transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 h-2.5 bg-[#05294E]'
                  : 'w-2.5 h-2.5 bg-[#05294E]/20 hover:bg-[#05294E]/40'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goNext}
          className="hidden sm:flex w-10 h-10 rounded-full bg-[#05294E]/10 hover:bg-[#05294E]/20 items-center justify-center text-[#05294E] transition-colors"
          aria-label="Próximo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Carousel;
