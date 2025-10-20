"use client";

import React from 'react';

interface RubiksCubeProps {
  size?: number; // pixel size of the cube container
  className?: string;
  lineColor?: string; // CSS color for grid lines
  lineOpacity?: number; // 0..1 opacity for lines
}

// Simple CSS 3D 4x4 Rubik's cube approximation using div faces and CSS transforms
// No external dependencies. Animated rotation for subtle motion.
export function RubiksCube({ size = 96, className = '', lineColor = '#94a3b8', lineOpacity = 0.6 }: RubiksCubeProps) {
  const faceSize = size;
  const square = Math.max(6, Math.floor(faceSize / 4) - 2);

  const Face = ({ className: faceClass }: { className: string }) => (
    <div className={`absolute grid grid-cols-4 grid-rows-4 gap-[2px] ${faceClass}`} style={{ width: faceSize, height: faceSize }}>
      {Array.from({ length: 16 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2px]"
          style={{
            background: 'transparent',
            border: `1px solid ${lineColor}`,
            opacity: lineOpacity,
            width: square,
            height: square,
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{ width: faceSize, height: faceSize, perspective: 600 }}
      aria-hidden
    >
      <div className="cube-3d-container">
        <Face className="cube-face cube-face--front" />
        <Face className="cube-face cube-face--back" />
        <Face className="cube-face cube-face--left" />
        <Face className="cube-face cube-face--right" />
        <Face className="cube-face cube-face--top" />
        <Face className="cube-face cube-face--bottom" />
      </div>

      <style jsx>{`
        .cube-3d-container {
          position: relative;
          width: ${faceSize}px;
          height: ${faceSize}px;
          transform-style: preserve-3d;
          animation: cube-rotate 14s linear infinite;
          will-change: transform;
        }

        .cube-face {
          backface-visibility: hidden;
        }

        /* Translate each face by half the cube size along its normal vector */
        .cube-face--front { transform: translateZ(${faceSize / 2}px); }
        .cube-face--back { transform: rotateY(180deg) translateZ(${faceSize / 2}px); }
        .cube-face--left { transform: rotateY(-90deg) translateZ(${faceSize / 2}px); }
        .cube-face--right { transform: rotateY(90deg) translateZ(${faceSize / 2}px); }
        .cube-face--top { transform: rotateX(90deg) translateZ(${faceSize / 2}px); }
        .cube-face--bottom { transform: rotateX(-90deg) translateZ(${faceSize / 2}px); }

        @keyframes cube-rotate {
          0% { transform: rotateX(-18deg) rotateY(0deg); }
          50% { transform: rotateX(18deg) rotateY(180deg); }
          100% { transform: rotateX(-18deg) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}

export default RubiksCube;


