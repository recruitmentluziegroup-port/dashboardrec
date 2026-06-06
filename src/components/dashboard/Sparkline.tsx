import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  showFill?: boolean;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color,
  height = 24,
  showFill = true,
  className = '',
}) => {
  const padding = 2;

  const { linePath, fillPath, gradientId, hasData } = useMemo(() => {
    const safeData = data && data.length > 0 ? data : [0];
    const max = Math.max(...safeData, 1);
    const min = Math.min(...safeData, 0);
    const range = max - min || 1;
    const width = 100;
    const usableHeight = height - padding * 2;
    const step = safeData.length > 1 ? width / (safeData.length - 1) : 0;

    const points = safeData.map((v, i) => {
      const x = i * step;
      const y = padding + usableHeight - ((v - min) / range) * usableHeight;
      return [x, y] as const;
    });

    let line = '';
    points.forEach(([x, y], i) => {
      if (i === 0) line += `M ${x} ${y}`;
      else line += ` L ${x} ${y}`;
    });

    let fill = line;
    if (points.length > 0) {
      const last = points[points.length - 1];
      const first = points[0];
      fill += ` L ${last[0]} ${height} L ${first[0]} ${height} Z`;
    }

    const id = `sparkline-grad-${Math.random().toString(36).slice(2, 9)}`;

    return { linePath: line, fillPath: fill, gradientId: id, hasData: data && data.length > 0 };
  }, [data, height]);

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {showFill && hasData && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
