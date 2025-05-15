"use client";

import React, { useState } from 'react';

interface InputProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  name,
  error,
  required = false,
  disabled = false,
  icon,
  className = '',
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium mb-1" htmlFor={name}>
        {label}
        {required && <span className="text-[var(--error-red)] ml-1">*</span>}
      </label>
      <div className={`relative rounded-lg border transition-colors ${
        error ? 'border-[var(--error-red)]' : 
        isFocused ? 'border-[var(--main-blue)]' : 'border-gray-300'
      }`}>
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={name}
          name={name}
          className={`w-full py-2 px-3 rounded-lg focus:outline-none bg-white ${
            icon ? 'pl-10' : ''
          } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
      {error && <p className="mt-1 text-sm text-[var(--error-red)]">{error}</p>}
    </div>
  );
};