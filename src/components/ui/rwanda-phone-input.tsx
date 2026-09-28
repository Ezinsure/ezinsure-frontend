'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RwandaPhoneInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  resetTrigger?: number; // Add reset trigger prop
}

export const RwandaPhoneInput = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  resetTrigger = 0,
}: RwandaPhoneInputProps) => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const [isValid, setIsValid] = useState(false);
  const isInitialized = useRef(false);

  // Reset component when resetTrigger changes
  useEffect(() => {
    setPhoneDigits('');
    setValidationMessage('');
    setIsValid(false);
    isInitialized.current = false;
  }, [resetTrigger]);

  // Initialize from existing value only once
  useEffect(() => {
    if (value && !isInitialized.current) {
      // Only initialize if the value starts with 250 or +250
      if (value.startsWith('250') || value.startsWith('+250')) {
        // Remove +250 or 250 prefix if present
        const cleanValue = value.replace(/^(\+?250)?/, '');
        setPhoneDigits(cleanValue);
      }
      // If value doesn't start with 250/+250, don't initialize (let user enter fresh)
      isInitialized.current = true;
    }
  }, [value]);

  // Update parent component when phoneDigits change
  useEffect(() => {
    if (phoneDigits.length === 9) {
      // Send without the + prefix as requested
      onChange(`250${phoneDigits}`);
    } else if (phoneDigits.length === 0) {
      onChange('');
    }
  }, [phoneDigits]);

  // Validation logic
  useEffect(() => {
    validatePhoneNumber();
  }, [phoneDigits]);

  const validatePhoneNumber = () => {
    if (!phoneDigits) {
      setValidationMessage('');
      setIsValid(false);
      return;
    }

    if (phoneDigits.length === 0) {
      setValidationMessage('Please enter the phone number');
      setIsValid(false);
      return;
    }

    if (phoneDigits.length < 9) {
      setValidationMessage(`Please enter ${9 - phoneDigits.length} more digits`);
      setIsValid(false);
      return;
    }

    if (phoneDigits.length > 9) {
      setValidationMessage('Phone number should be exactly 9 digits');
      setIsValid(false);
      return;
    }

    // Check first digit
    if (phoneDigits[0] !== '7') {
      setValidationMessage('First digit must be 7');
      setIsValid(false);
      return;
    }

    // Check second digit
    const secondDigit = phoneDigits[1];
    if (!['2', '3', '8', '9'].includes(secondDigit)) {
      setValidationMessage('Second digit must be 2, 3, 8, or 9');
      setIsValid(false);
      return;
    }

    // Check if all digits are numbers
    if (!/^\d+$/.test(phoneDigits)) {
      setValidationMessage('Phone number should only contain digits');
      setIsValid(false);
      return;
    }

    // All validations passed
    setValidationMessage('Valid Rwandan phone number');
    setIsValid(true);
  };

  const handlePhoneDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Only allow digits and max 9 characters
    if (/^\d*$/.test(input) && input.length <= 9) {
      setPhoneDigits(input);
    }
  };

  // Allow user to clear and edit the field
  const handleFocus = () => {
    // Allow editing even when field is full
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow backspace, delete, arrow keys, etc.
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key.startsWith('Arrow')) {
      return;
    }
    // Allow digits
    if (/^\d$/.test(e.key)) {
      return;
    }
    // Prevent other characters
    e.preventDefault();
  };

  const getValidationIcon = () => {
    if (error) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (phoneDigits) {
      if (isValid) {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      } else {
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      }
    }
    return <Phone className="w-4 h-4 text-gray-400" />;
  };

  const getValidationMessageColor = () => {
    if (error) return 'text-red-600';
    if (isValid) return 'text-green-600';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="flex items-center space-x-2">
        {/* Country code prefix */}
        <div className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-l-lg text-gray-600 font-medium">
          +250
        </div>
        
        {/* Phone digits input */}
        <input
          type="text"
          name={name}
          placeholder="712345678"
          value={phoneDigits}
          onChange={handlePhoneDigitsChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          maxLength={9}
          className={`flex-1 py-2 px-3 border-t border-b border-r border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error 
              ? 'border-red-300 bg-red-50' 
              : isValid && phoneDigits.length === 9
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 bg-white hover:border-gray-400'
          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        />
        
        {/* Validation icon */}
        <div className="flex items-center justify-center w-8 h-8">
          {getValidationIcon()}
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 flex items-start gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
      
      {/* Validation message */}
      {validationMessage && !error && (
        <div className={`text-sm flex items-start gap-2 ${getValidationMessageColor()}`}>
          {isValid ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span className="break-words">{validationMessage}</span>
        </div>
      )}
      
      {/* Help text */}
      <div className="text-xs text-gray-500">
        Format: +250 712345678 (First digit: 7, Second digit: 2, 3, 8, or 9)
      </div>
    </div>
  );
};
