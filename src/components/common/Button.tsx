import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[#1E2022] text-[#FCFBF8] hover:bg-[#33373B] active:bg-[#000000] border-transparent shadow-xs',
    secondary: 'bg-[#F4F3EE] text-[#1E2022] hover:bg-[#EAE8DF] active:bg-[#DFDCD2] border-[#E8E7E2]',
    outline: 'bg-white text-[#1E2022] border-[#E8E7E2] hover:bg-[#F9F8F5] active:bg-[#F2F0E8]',
    ghost: 'bg-transparent text-[#5A5E65] hover:text-[#1E2022] hover:bg-[#F4F3EE] border-transparent',
    danger: 'bg-[#FFF1F0] text-[#D9381E] hover:bg-[#FFE4E1] active:bg-[#FCD2CD] border-[#FADBD8]',
    accent: 'bg-[#F4C430] text-[#1E2022] hover:bg-[#E5B520] font-semibold border-transparent shadow-xs'
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 h-8',
    md: 'text-sm px-4 py-2 rounded-md gap-2 h-9.5',
    lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5 h-11'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border select-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
