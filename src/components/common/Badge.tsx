import React from 'react';

export type BadgeVariant = 'safe' | 'warning' | 'critical' | 'neutral' | 'blue' | 'yellow' | 'green' | 'coral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    safe: 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]',
    warning: 'bg-[#FEF9E7] text-[#B7791F] border-[#FCEEC0]',
    critical: 'bg-[#FDF2F0] text-[#D9381E] border-[#FADBD8]',
    neutral: 'bg-[#F4F3EE] text-[#5A5E65] border-[#E8E7E2]',
    blue: 'bg-[#EBF5FF] text-[#0066CC] border-[#CCE5FF]',
    yellow: 'bg-[#FEF9E7] text-[#975A16] border-[#FCEEC0]',
    green: 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]',
    coral: 'bg-[#FDF2F0] text-[#D9381E] border-[#FADBD8]'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
