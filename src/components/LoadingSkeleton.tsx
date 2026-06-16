import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-evino-cream/60 rounded-evino ${className}`} />
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-6 border-b border-evino-gray-200">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function MetricCardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-evino-gray-200 rounded-evino p-5 space-y-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino p-5 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-[300px] w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white border border-evino-gray-200 rounded-evino overflow-hidden">
      <div className="p-4 bg-evino-cream border-b border-evino-gray-200 flex justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-evino-gray-100 last:border-0">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-evino" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
