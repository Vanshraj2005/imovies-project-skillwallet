import React from 'react';

const Badge = ({ variant = 'neutral', children, className = '', icon = null }) => {
  const variantClass = `im-badge-${variant}`;

  return (
    <span className={`im-badge ${variantClass} ${className}`}>
      {icon && <span className="me-1">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
