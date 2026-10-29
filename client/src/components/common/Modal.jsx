import React, { useEffect } from 'react';
import Button from './Button';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  primaryActionLabel = null,
  onPrimaryAction = null,
  secondaryActionLabel = 'Cancel',
  isPrimaryLoading = false,
  size = 'md', // sm, md, lg
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getMaxWidth = () => {
    if (size === 'sm') return '400px';
    if (size === 'lg') return '800px';
    return '540px';
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: getMaxWidth() }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content shadow border-0">
          <div className="modal-header border-bottom py-3">
            <h6 className="modal-title fw-bold text-dark">{title}</h6>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>
          <div className="modal-body p-4">{children}</div>
          <div className="modal-footer border-top bg-light py-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {secondaryActionLabel}
            </Button>
            {primaryActionLabel && onPrimaryAction && (
              <Button
                variant="primary"
                size="sm"
                loading={isPrimaryLoading}
                onClick={onPrimaryAction}
              >
                {primaryActionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
