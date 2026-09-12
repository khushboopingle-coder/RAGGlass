import React from 'react';
import { downsampleVector } from '../utils/vectorMath';

export const VectorSparkline = ({
  vector,
  similarity = 1.0,
  globalMin = -0.2,
  globalMax = 0.2,
  width = 120,
  height = 24
}) => {
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    return (
      <span className="text-slate-400 font-mono text-[11px]">—</span>
    );
  }

  // Downsample 384 dimensions into 24 bins (averaging ~16 dims per point)
  const points = downsampleVector(vector, 24);

  // Global Y-axis normalization across all table sparklines
  const range = globalMax - globalMin || 1;

  const svgPoints = points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      // Clamped normalized Y coordinate
      const normalizedY = (val - globalMin) / range;
      const clampedY = Math.max(0, Math.min(1, normalizedY));
      const y = height - clampedY * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Color stroke based on similarity score
  let strokeColor = '#64748b'; // Slate gray for low similarity
  if (similarity >= 0.75) {
    strokeColor = '#10b981'; // Emerald green for high similarity
  } else if (similarity >= 0.50) {
    strokeColor = '#6366f1'; // Indigo blue for moderate similarity
  }

  return (
    <svg width={width} height={height} className="overflow-visible inline-block">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={svgPoints}
      />
    </svg>
  );
};
