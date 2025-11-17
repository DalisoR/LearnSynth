import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}

// Card skeleton with multiple elements
export function SkeletonCard({
  showImage = true,
  showTitle = true,
  showDescription = true,
  showButton = false,
  lines = 3
}: {
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showButton?: boolean;
  lines?: number;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {showImage && (
        <Skeleton className="h-48 w-full rounded-lg" />
      )}
      {showTitle && (
        <Skeleton className="h-8 w-3/4 rounded" />
      )}
      {showDescription && (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                'h-4 rounded',
                i === lines - 1 ? 'w-2/3' : 'w-full'
              )}
            />
          ))}
        </div>
      )}
      {showButton && (
        <Skeleton className="h-10 w-24 rounded-lg" />
      )}
    </div>
  );
}

// Document card skeleton for KB overview
export function SkeletonDocumentCard() {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Thumbnail */}
      <Skeleton className="h-48 w-full" />
      {/* Content */}
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4 rounded" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
        </div>
        <div className="flex gap-2 pt-3">
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

// Knowledge base card skeleton
export function SkeletonKBCard() {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-1/2 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// List item skeleton
export function SkeletonListItem({
  showAvatar = false,
  showIcon = false
}: {
  showAvatar?: boolean;
  showIcon?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      {showAvatar && (
        <Skeleton className="h-12 w-12 rounded-full" />
      )}
      {showIcon && (
        <Skeleton className="h-12 w-12 rounded-lg" />
      )}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-1/3 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  );
}

// Stats card skeleton
export function SkeletonStatsCard() {
  return (
    <div className="border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-16 rounded" />
        </div>
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
    </div>
  );
}

// Search result skeleton
export function SkeletonSearchResult() {
  return (
    <div className="p-4 space-y-3 border-b">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-1/3 rounded" />
        <Skeleton className="h-5 w-16 rounded" />
      </div>
      <Skeleton className="h-16 w-full rounded" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  );
}

// Table skeleton
export function SkeletonTable({
  rows = 5,
  columns = 4
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 p-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-6 flex-1 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                'h-6 rounded',
                colIndex === 0 ? 'w-1/4' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
export function SkeletonChart() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3 rounded" />
      <div className="grid grid-cols-7 gap-2 items-end h-48">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-t"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Loading spinner with text
export function LoadingSpinner({
  size = 'md',
  text
}: {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-16 h-16'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={cn(
          'border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Full page loading skeleton
export function LoadingPage({
  title = 'Loading...'
}: {
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-96 rounded" />
            <Skeleton className="h-6 w-64 rounded" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonStatsCard key={i} />
          ))}
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonKBCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export { Skeleton };
