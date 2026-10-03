import React from 'react';

interface ModernAppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ModernAppLogo: React.FC<ModernAppLogoProps> = ({ size = 'md', className = '' }) => {
  const dims = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  
  return (
    <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/70 dark:ring-stone-800 shrink-0 select-none overflow-hidden transition-transform ${dims} ${className}`}>
      {/* Specular glass reflection */}
      <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/20 rounded-full blur-sm pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/25 pointer-events-none" />

      <svg 
        viewBox="0 0 36 36" 
        className="w-[68%] h-[68%] fill-none stroke-current drop-shadow-md"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {/* Sleek layered notebook */}
        <rect 
          x="6" 
          y="5" 
          width="23" 
          height="26" 
          rx="4" 
          className="fill-white/15 stroke-white" 
          strokeWidth="2.2" 
        />
        {/* Textured spiral / spine */}
        <line x1="12" y1="5" x2="12" y2="31" strokeWidth="1.8" strokeDasharray="1.5 2.5" className="stroke-blue-200" />
        
        {/* Neat ruled lines */}
        <line x1="16" y1="11" x2="24" y2="11" strokeWidth="2" className="stroke-white" />
        <line x1="16" y1="16" x2="22" y2="16" strokeWidth="2" className="stroke-white/80" />
        
        {/* Modern Stylus Pen floating tip */}
        <path 
          d="M17 25l7-7 2.5 2.5-7 7-3.5 1 1-3.5z" 
          className="fill-amber-400 stroke-amber-200" 
          strokeWidth="1.2" 
        />
        <circle cx="26.5" cy="20.5" r="1" className="fill-white stroke-none" />
      </svg>
    </div>
  );
};
