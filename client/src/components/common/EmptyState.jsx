import React from 'react';
import Button from './Button';

const EmptyState = ({
  icon = 'bi-camera-reels',
  title = 'No items found',
  description = 'We couldn\'t find any results matching your search criteria.',
  actionLabel = null,
  onAction = null,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-5 px-3 bg-white border rounded ${className}`}
      role="status"
    >
      <div className="mb-3 text-muted">
        <i className={`bi ${icon} fs-1`} />
      </div>
      <h5 className="fw-semibold text-dark mb-1">{title}</h5>
      <p className="text-secondary small mb-4 mx-auto" style={{ maxWidth: '420px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline-primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
