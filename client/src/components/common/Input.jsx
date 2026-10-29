import React from 'react';

const Input = ({
  label,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  error = null,
  helperText = null,
  required = false,
  disabled = false,
  icon = null,
  className = '',
  ...rest
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="form-label fw-medium text-secondary small mb-1">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      <div className="input-group">
        {icon && <span className="input-group-text bg-white border-end-0 text-muted">{icon}</span>}
        <input
          id={inputId}
          type={type}
          className={`form-control ${icon ? 'border-start-0' : ''} ${error ? 'is-invalid' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          {...rest}
        />
        {error && <div className="invalid-feedback d-block">{error}</div>}
      </div>
      {helperText && !error && (
        <div className="form-text text-muted small mt-1">{helperText}</div>
      )}
    </div>
  );
};

export default Input;
