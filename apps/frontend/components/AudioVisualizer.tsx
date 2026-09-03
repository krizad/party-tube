'use client';

import React from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const bars = [16, 28, 45, 20, 35, 50, 24, 40, 18, 30, 48, 22];

  return (
    <div className="flex items-end gap-1 h-8 px-2">
      {bars.map((height, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full bg-gradient-to-t from-party-neonPurple to-party-neonPink transition-all duration-300 ${
            isPlaying ? 'animate-equalizer' : 'opacity-40'
          }`}
          style={{
            height: isPlaying ? `${height}px` : '4px',
            animationDelay: `${(i % 5) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};
