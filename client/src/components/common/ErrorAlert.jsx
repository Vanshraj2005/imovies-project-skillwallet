import React from 'react';
import Button from './Button';

const ErrorAlert = ({
  message = 'An unexpected error occurred while loading content.',
  onRetry = null,
  className = '',
}) => {
  return (
    <div className={`alert alert-danger d-flex align-items-center justify-content-between p-3 ${className}`} role="alert">
      <div className="d-flex align-items-center gap-2">
        <i className="bi bi-exclamation-triangle-fill fs-5 text-danger" />
        <span className="small fw-medium">{message}</span>
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorAlert;
