import React from 'react';

/** The scales beneath the title: brass, geometric, cut from one sheet. */
export const Scales: React.FC<{ width: number; color: string }> = ({ width, color }) => {
  const h = width * 0.62;
  return (
    <svg width={width} height={h} viewBox="0 0 200 124" aria-hidden>
      <rect x="96" y="8" width="8" height="96" fill={color} />
      <rect x="70" y="104" width="60" height="10" rx="2" fill={color} />
      <rect x="20" y="22" width="160" height="7" rx="3" fill={color} />
      <circle cx="100" cy="16" r="9" fill={color} />
      <path d="M38 29 L26 70 M38 29 L50 70" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M162 29 L150 70 M162 29 L174 70" stroke={color} strokeWidth="2.5" fill="none" />
      <path d="M14 70 Q38 92 62 70 Z" fill={color} />
      <path d="M138 70 Q162 92 186 70 Z" fill={color} />
    </svg>
  );
};
