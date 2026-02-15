"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Eye, X } from 'lucide-react';

interface FileInputProps {
  label: string;
  onChange: (file: File | null) => void;
  accept?: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
  currentFile?: string; // Add this new prop
  documentUrl?: string; // URL to existing document (for viewing)
  onViewDocument?: (url: string, name: string) => void; // Callback to view document
  resetTrigger?: number; // Add reset trigger prop
}

export const FileInput = ({
  label,
  onChange,
  accept = 'image/*,.pdf',
  name,
  error,
  required = false,
  className = '',
  currentFile, // Destructure the new prop
  documentUrl, // URL to existing document
  onViewDocument, // Callback to view document
  resetTrigger, // Destructure the reset trigger prop
}: FileInputProps) => {
  const [fileName, setFileName] = useState<string>(currentFile || '');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update fileName when currentFile or documentUrl changes
  useEffect(() => {
    if (currentFile) {
      setFileName(currentFile);
    } else if (documentUrl) {
      // Extract filename from URL
      const urlParts = documentUrl.split('/');
      setFileName(urlParts[urlParts.length - 1] || 'Existing document');
    } else {
      // Clear filename when documentUrl is cleared
      setFileName('');
    }
  }, [currentFile, documentUrl]);

  // Reset file input when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      setFileName('');
      onChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resetTrigger]); // Removed onChange from dependencies to prevent infinite loop

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setFileName(file.name);
      onChange(file);
    } else {
      setFileName(currentFile || ''); // Revert to currentFile if available
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

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName('');
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Clear documentUrl if it exists (by calling onChange with null, which should trigger parent to clear URL)
    // Note: The parent component should handle clearing documentUrl when file is cleared
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
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="text-sm text-[var(--main-blue)] font-medium">
              {fileName.includes('/') ? fileName.split('/').pop() : fileName}
            </span>
            {documentUrl && onViewDocument && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDocument(documentUrl, fileName);
                }}
                className="text-blue-600 hover:text-blue-800 p-1"
                aria-label="View document"
                title="View document"
              >
                <Eye className="h-4 w-4" />
              </button>
            )}
            <button 
              type="button"
              onClick={handleClearFile}
              className="text-gray-500 hover:text-red-500"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-[var(--error-red)]">{error}</p>}
    </div>
  );
};