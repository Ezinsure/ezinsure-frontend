"use client";

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
  download?: string;
  target?: string;
  rel?: string;
}

export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className = '',
  icon,
  as = 'button',
  href,
  download,
  target,
  rel,
  ...props
}: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  const baseClasses =
    'rounded-lg font-medium transition-all duration-200 flex items-center justify-center cursor-pointer';
  
  const variantClasses = {
    primary: 'bg-[var(--main-blue)] hover:bg-[var(--secondary-blue)] text-white shadow-sm',
    secondary: 'bg-[var(--accent-orange)] hover:bg-[var(--light-orange)] text-white shadow-sm',
    outline: 'border-2 border-[var(--main-blue)] text-[var(--main-blue)] hover:bg-[#E6F0F8]',
    text: 'text-[var(--main-blue)] hover:bg-[#E6F0F8]',
    danger: 'bg-[var(--error-red)] hover:bg-[#C62828] text-white shadow-sm'
  };
  
  const sizeClasses = {
    xs: 'text-xs px-3 py-1.5',
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const widthClass = fullWidth ? 'w-full' : '';
  
  const allClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${widthClass} ${className}`;

  if (as === 'a' && href) {
    return (
      <a
        href={href}
        download={download}
        target={target}
        rel={rel}
        className={allClasses}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={allClasses}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};