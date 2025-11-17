import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false
}) => {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1rem',
    borderRadius: rounded ? '0.5rem' : undefined
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 ${className}`}
      style={style}
    />
  );
};

export const DocumentListSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton width="3rem" height="3rem" rounded />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="1.5rem" />
            <Skeleton width="40%" height="1rem" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton width="2.5rem" height="2.5rem" rounded />
          <div className="flex-1 space-y-2">
            <Skeleton width="30%" height="1rem" />
            <Skeleton width="80%" height="3rem" rounded />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 border rounded-lg">
            <Skeleton width="40%" height="1.5rem" />
            <Skeleton width="60%" height="2rem" className="mt-4" />
          </div>
        ))}
      </div>
      <div className="p-6 border rounded-lg">
        <Skeleton width="50%" height="2rem" />
        <Skeleton width="100%" height="20rem" className="mt-4" />
      </div>
    </div>
  );
};

export const KnowledgeBaseSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Skeleton width="20rem" height="3rem" />
        <Skeleton width="5rem" height="3rem" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton width="80%" height="1.5rem" />
            <Skeleton width="60%" height="1rem" className="mt-2" />
            <Skeleton width="100%" height="8rem" className="mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton width="40%" height="3rem" />
        <Skeleton width="60%" height="1.5rem" className="mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 border rounded-lg">
            <Skeleton width="50%" height="1rem" />
            <Skeleton width="70%" height="2rem" className="mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-6 border rounded-lg">
          <Skeleton width="80%" height="1.5rem" />
          <Skeleton width="100%" height="15rem" className="mt-4" />
        </div>
        <div className="p-6 border rounded-lg">
          <Skeleton width="80%" height="1.5rem" />
          <Skeleton width="100%" height="15rem" className="mt-4" />
        </div>
      </div>
    </div>
  );
};

export const StudyPlannerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-center">
        <Skeleton width="12rem" height="3rem" />
        <Skeleton width="8rem" height="3rem" />
        <Skeleton width="8rem" height="3rem" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <div key={day} className="p-4 border rounded-lg">
            <Skeleton width="50%" height="1rem" className="mx-auto" />
            <div className="space-y-2 mt-4">
              {[1, 2, 3].map((slot) => (
                <Skeleton key={slot} width="100%" height="4rem" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4
}) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height="1.5rem" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="100%" height="2.5rem" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border rounded-lg">
          <Skeleton width="60%" height="1.5rem" />
          <Skeleton width="80%" height="1rem" className="mt-2" />
          <Skeleton width="100%" height="10rem" className="mt-4" />
        </div>
      ))}
    </div>
  );
};