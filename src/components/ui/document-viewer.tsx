'use client';

import { Button } from './button';
import { useState, useEffect } from 'react';

interface DocumentViewerProps {
  documentName: string;
  documentPath: string;
  onClose: () => void;
}

export const DocumentViewer = ({ 
  documentName, 
  documentPath, 
  onClose 
}: DocumentViewerProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isImage, setIsImage] = useState(false);

  useEffect(() => {
    // Check if the document is an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    setIsImage(imageExtensions.some(ext => documentPath.toLowerCase().endsWith(ext)));
    setLoading(true);
    setError(false);
  }, [documentPath]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Viewing: {documentName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 border rounded-lg overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p>Loading document...</p>
            </div>
          )}
          
          {error ? (
            <div className="h-full flex flex-col items-center justify-center">
              <img 
                src="/test_document.pdf" 
                alt="File not found" 
                className="max-h-48"
              />
              <p className="mt-4">Could not load document</p>
            </div>
          ) : isImage ? (
            <img
              src={documentPath}
              alt={documentName}
              className={`w-full h-full object-contain ${loading ? 'hidden' : 'block'}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <iframe 
              src={documentPath}
              className={`w-full h-full ${loading ? 'hidden' : 'block'}`}
              title={documentName}
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </div>
        
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
          <Button 
            as="a"
            href={documentPath}
            download={documentName}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};