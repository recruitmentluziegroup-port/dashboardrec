import React from 'react';

interface BerkasIdChipProps {
  id: string;
  className?: string;
}

// Mono file-number chip — the Luzie identity marker for APP-XXXXXXXX ids
export const BerkasIdChip: React.FC<BerkasIdChipProps> = ({ id, className = '' }) => {
  return (
    <span
      className={`inline-block font-mono text-[11px] font-bold bg-stone-100 text-editorial-navy border border-editorial-border px-2 py-0.5 rounded-md tracking-wide whitespace-nowrap ${className}`}
    >
      {id}
    </span>
  );
};
