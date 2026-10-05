import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-[#D5D3CB] bg-[#FDFCF9]/60">
      <div className="w-12 h-12 rounded-xl bg-[#F4F3EE] flex items-center justify-center text-[#5A5E65] mb-3.5 border border-[#E8E7E2]">
        {icon}
      </div>
      <h4 className="text-base font-semibold text-[#1E2022] tracking-tight">{title}</h4>
      <p className="text-xs sm:text-sm text-[#5A5E65] max-w-sm mt-1 mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} leftIcon={actionIcon}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
