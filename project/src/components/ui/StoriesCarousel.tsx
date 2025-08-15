import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
  id: string;
  image: string;
  title: string;
  description?: string;
}

interface StoriesCarouselProps {
  stories: Story[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

const StoriesCarousel: React.FC<StoriesCarouselProps> = ({
  stories,
  autoPlay = true,
  autoPlayInterval = 4000,
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % stories.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [isPlaying, autoPlayInterval, stories.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % stories.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  if (!stories.length) return null;

  return (
    <div className={`relative group ${className}`}>
      {/* Main Image Container */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-slate-100 h-80 md:h-96 flex items-center justify-center">
        <img
          src={stories[currentIndex].image}
          alt={stories[currentIndex].title}
          className="max-h-full max-w-full object-contain bg-white p-4 rounded-2xl transition-transform duration-700 group-hover:scale-105 shadow-lg"
          style={{margin: 'auto'}}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://via.placeholder.com/600x400/05294E/ffffff?text=Image+Loading";
          }}
        />
        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 rounded-3xl via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex space-x-1">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              onClick={() => goToSlide(index)}
            >
              <div
                className={`h-full bg-white transition-all duration-300 ${
                  index === currentIndex ? 'w-full' : index < currentIndex ? 'w-full' : 'w-0'
                }`}
              ></div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/30"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/30"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="absolute bottom-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/30"
        >
          {isPlaying ? (
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          ) : (
            <div className="w-0 h-0 border-l-4 border-l-white border-y-2 border-y-transparent ml-0.5"></div>
          )}
        </button>

        {/* Story Info */}
        <div className="absolute bottom-4 left-4">
          <h4 className="text-white font-semibold text-sm mb-1">
            {stories[currentIndex].title}
          </h4>
          {stories[currentIndex].description && (
            <p className="text-white/80 text-xs">
              {stories[currentIndex].description}
            </p>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="flex space-x-2 mt-4 overflow-x-auto p-3 pb-2">
        {stories.map((story, index) => (
          <button
            key={story.id}
            onClick={() => goToSlide(index)}
            className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden transition-all duration-300 ${
              index === currentIndex 
                ? 'ring-2 ring-[#05294E] scale-105' 
                : 'hover:scale-105 opacity-70 hover:opacity-100'
            }`}
          >
            <img
              src={story.image}
              alt={story.title}
              className="w-full h-full object-cover"
            />
            {index === currentIndex && (
              <div className="absolute inset-0 bg-[#05294E]/20"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoriesCarousel;
