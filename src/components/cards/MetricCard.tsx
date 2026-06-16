import React from 'react';
import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  highlight?: boolean;
}

export function MetricCard({ label, value, delta, highlight = false }: MetricCardProps) {
  const hasDelta = delta !== undefined;
  const isPositive = (delta ?? 0) >= 0;

  return (
    <div
      className={clsx(
        'rounded-evino p-5 border transition-all duration-200 hover:shadow-sm',
        highlight
          ? 'bg-evino-red-50 border-evino-red-100 hover:border-evino-red-200'
          : 'bg-white border-evino-gray-200 hover:border-evino-gray-300'
      )}
    >
      <p className="text-xs font-semibold text-evino-gray-500 uppercase tracking-wide">
        {label}
      </p>
      
      <p
        className={clsx(
          'font-display text-3xl font-bold tabular-nums mt-2 tracking-tight',
          highlight ? 'text-evino-red' : 'text-evino-ink'
        )}
      >
        {value}
      </p>

      {hasDelta && (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={clsx(
              'text-xs font-semibold flex items-center gap-0.5 tabular-nums',
              isPositive ? 'text-success' : 'text-danger'
            )}
          >
            {isPositive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
          <span className="text-xs text-evino-gray-400">vs. período anterior</span>
        </div>
      )}
    </div>
  );
}
