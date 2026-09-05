import React from 'react';
import type { ModStatus } from '@/types/database';
import { getStatusConfig, cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ModStatus;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showDescription = false,
  className,
}: StatusBadgeProps) {
  const config = getStatusConfig(status);

  const icons = {
    allowed: CheckCircle2,
    restricted: AlertTriangle,
    blocked: XCircle,
    unknown: HelpCircle,
  };
  const Icon = icons[status] || HelpCircle;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        role="status"
        aria-label={`Status: ${config.label}`}
        className={cn(
          'inline-flex items-center rounded border tracking-wide uppercase select-none',
          config.badgeClass,
          sizeClasses[size],
          className
        )}
      >
        <Icon className={cn(iconSizes[size], 'shrink-0')} aria-hidden="true" />
        <span>{config.label}</span>
      </span>
      {showDescription && (
        <span className="text-xs text-zinc-400 max-w-xs">{config.description}</span>
      )}
    </div>
  );
}
