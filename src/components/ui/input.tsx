"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

type InputSize = 'default' | 'compact';

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
  min?: string;
  max?: string;
  maxLength?: number;
  size?: InputSize;
  hideLabel?: boolean;
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
  min,
  max,
  maxLength,
  size = 'default',
  hideLabel = false,
}: InputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputSize = size;

  const sizeStyles: Record<InputSize, { wrapper: string; label: string; border: string; input: string }> = {
    default: {
      wrapper: 'mb-4',
      label: 'block text-sm font-medium text-gray-700 mb-2',
      border: 'rounded-lg border-2',
      input: 'w-full py-3 px-3 rounded-lg text-base',
    },
    compact: {
      wrapper: 'mb-2',
      label: 'block text-xs font-semibold text-gray-600 tracking-wide mb-1',
      border: 'rounded-md border',
      input: 'w-full py-2 px-2.5 rounded-md text-sm',
    },
  };

  const { wrapper, label: labelClass, border, input: inputClass } = sizeStyles[inputSize];

  return (
    <div className={`${wrapper} ${className}`}>
      {!hideLabel && (
        <label className={labelClass} htmlFor={name}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className={`relative ${border} transition-all duration-200 ${
        error ? 'border-red-300 bg-red-50' : 
        isFocused ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
      } ${disabled ? 'bg-gray-50 border-gray-200' : ''}`}>
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          id={name}
          name={name}
          className={`${inputClass} focus:outline-none transition-colors duration-200 ${
            icon ? 'pl-10' : ''
          } ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'text-gray-900 placeholder-gray-500'}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          min={min}
          max={max}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600 flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}
    </div>
  );
};