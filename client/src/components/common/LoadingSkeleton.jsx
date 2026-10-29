import React from 'react';

export const SkeletonBox = ({ width = '100%', height = '20px', className = '' }) => (
  <div
    className={`skeleton-box ${className}`}
    style={{ width, height }}
    aria-hidden="true"
  />
);

export const MovieCardSkeleton = () => (
  <div className="im-card p-2 h-100 d-flex flex-column">
    <SkeletonBox height="280px" className="mb-3 rounded" />
    <SkeletonBox height="18px" width="75%" className="mb-2" />
    <SkeletonBox height="14px" width="50%" className="mb-3" />
    <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
      <SkeletonBox height="24px" width="30%" />
      <SkeletonBox height="32px" width="45%" className="rounded" />
    </div>
  </div>
);

export const DetailBannerSkeleton = () => (
  <div className="bg-white border rounded p-4 mb-4">
    <div className="row g-4">
      <div className="col-md-3">
        <SkeletonBox height="360px" className="rounded" />
      </div>
      <div className="col-md-9 d-flex flex-column justify-content-center">
        <SkeletonBox height="32px" width="60%" className="mb-2" />
        <SkeletonBox height="16px" width="40%" className="mb-3" />
        <SkeletonBox height="80px" width="100%" className="mb-4" />
        <div className="d-flex gap-3">
          <SkeletonBox height="42px" width="160px" className="rounded" />
          <SkeletonBox height="42px" width="120px" className="rounded" />
        </div>
      </div>
    </div>
  </div>
);

const LoadingSkeleton = ({ count = 4, type = 'card' }) => {
  if (type === 'banner') {
    return <DetailBannerSkeleton />;
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
      {Array.from({ length: count }).map((_, index) => (
        <div className="col" key={index}>
          <MovieCardSkeleton />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
