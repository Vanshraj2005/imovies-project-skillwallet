import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className = '',
  icon = null,
  ...rest
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn btn-primary';
      case 'secondary':
        return 'btn btn-outline-secondary';
      case 'outline-primary':
        return 'btn btn-outline-primary';
      case 'success':
        return 'btn btn-success';
      case 'danger':
        return 'btn btn-danger';
      case 'light':
        return 'btn btn-light border';
      default:
        return 'btn btn-primary';
    }
  };

  const getSizeClass = () => {
    if (size === 'sm') return 'btn-sm';
    if (size === 'lg') return 'btn-lg';
    return '';
  };

  return (
    <button
      type={type}
      className={`${getVariantClass()} ${getSizeClass()} d-inline-flex align-items-center justify-content-center gap-2 fw-medium ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
