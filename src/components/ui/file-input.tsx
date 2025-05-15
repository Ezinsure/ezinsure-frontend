"use client";

import React, { useState, useRef } from 'react';

interface FileInputProps {
  label: string;
  onChange: (file: File | null) => void;
  accept?: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const FileInput = ({
  label,
  onChange,
  accept = 'image/*,.pdf',
  name,
  error,
  required = false,
  className = '',
}: FileInputProps) => {
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onChange(file);
    } else {
      setFileName('');
      onChange(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onChange(file);
      
      // Update the file input element to match the dropped file
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium mb-1" htmlFor={name}>
        {label}
        {required && <span className="text-[var(--error-red)] ml-1">*</span>}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-[var(--main-blue)] bg-blue-50' : 
          error ? 'border-[var(--error-red)]' : 'border-gray-300 hover:border-[var(--main-blue)]'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
      >
        <input
          type="file"
          id={name}
          name={name}
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
        />
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="mt-2 text-sm text-gray-600">Drag and drop a file here, or click to select a file</p>
        <p className="mt-1 text-xs text-gray-500">
          {accept.replace('image/*', 'Images').replace('.pdf', ', PDF')}
        </p>
        {fileName && (
          <div className="mt-2 text-sm text-[var(--main-blue)] font-medium">
            Selected: {fileName}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-[var(--error-red)]">{error}</p>}
    </div>
  );
};