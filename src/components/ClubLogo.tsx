import React from 'react';

interface ClubLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtitleClassName?: string;
  customUrl?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 min-w-[28px]',
  sm: 'w-9 h-9 min-w-[36px]',
  md: 'w-11 h-11 min-w-[44px]',
  lg: 'w-16 h-16 min-w-[64px]',
  xl: 'w-24 h-24 min-w-[96px]',
  '2xl': 'w-32 h-32 min-w-[128px]',
};

export const ClubLogo: React.FC<ClubLogoProps> = ({
  size = 'md',
  className = '',
  showText = false,
  textClassName = 'text-white font-extrabold font-display',
  subtitleClassName = 'text-blue-300 font-medium text-xs',
  customUrl,
}) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const logoImage = (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-1 border border-blue-500/30 shadow-lg shadow-blue-950/60 ring-2 ring-orange-500/30 overflow-hidden flex-shrink-0 ${sizeClass} ${className}`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-radial from-orange-500/20 via-blue-600/10 to-transparent pointer-events-none" />

      {customUrl ? (
        <img
          src={customUrl}
          alt="Tennis Comunali Trissino Logo"
          className="w-full h-full object-contain relative z-10"
          onError={(e) => {
            // Fallback to svg if customUrl fails to load
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
      ) : (
        <img
          src="/logo.svg"
          alt="Tennis Comunali Trissino"
          className="w-full h-full object-contain relative z-10 drop-shadow-md"
        />
      )}
    </div>
  );

  if (!showText) {
    return logoImage;
  }

  return (
    <div className="flex items-center gap-3">
      {logoImage}
      <div className="flex flex-col">
        <span className={`text-base sm:text-lg tracking-tight leading-tight ${textClassName}`}>
          Tennis Comunali Trissino
        </span>
        <span className={`tracking-wide text-xs ${subtitleClassName}`}>
          Circolo Tennis • Vicenza
        </span>
      </div>
    </div>
  );
};
