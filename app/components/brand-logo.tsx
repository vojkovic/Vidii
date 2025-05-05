import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  const textSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-2xl'
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizes[size]} rounded-full overflow-hidden`}>
        <img src="/favicon.svg" alt="Vidii" className="w-full h-full object-cover" />
      </div>
      
      {showText && (
        <h1 className={`font-bold ${textSizes[size]} text-white`}>
          Vidii
        </h1>
      )}
    </div>
  );
} 