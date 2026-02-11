'use client';

import { Button } from './button';
import { useState, useEffect, useRef } from 'react';

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
  const [isPdf, setIsPdf] = useState(false);
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check file type
    if (!documentPath) {
      setError(true);
      setLoading(false);
      return;
    }

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const pdfExtensions = ['.pdf'];
    
    const isImg = imageExtensions.some(ext => documentPath.toLowerCase().endsWith(ext));
    const isPdfFile = pdfExtensions.some(ext => documentPath.toLowerCase().endsWith(ext));
    
    setIsImage(isImg);
    setIsPdf(isPdfFile);
    setLoading(true);
    setError(false);
    setUseEmbedFallback(false);

    // Set a timeout for loading - if it takes too long, consider it failed
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading && isPdfFile) {
        setUseEmbedFallback(true);
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [documentPath]);

  const handleLoad = () => {
    setLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
  };

  const handleError = () => {
    setError(true);
    setLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // For PDFs, try the embed fallback
    if (isPdf && !useEmbedFallback) {
      setUseEmbedFallback(true);
      setError(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Fetch the file
      const response = await fetch(documentPath);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to simple link approach
      const link = document.createElement('a');
      link.href = documentPath;
      link.download = documentName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    window.open(documentPath, '_blank');
  };

  const renderPdfViewer = () => {
    if (error && !useEmbedFallback) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600 mb-4">Could not load PDF document</p>
          <div className="flex gap-2">
            <Button onClick={openInNewTab} variant="outline">
              Open in New Tab
            </Button>
            <Button onClick={handleDownload}>
              Download PDF
            </Button>
          </div>
        </div>
      );
    }

    if (useEmbedFallback) {
      return (
        <div className="h-full flex flex-col">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-sm text-yellow-800">
              PDF preview may not be available in this browser. You can download the file or open it in a new tab.
            </p>
          </div>
          <embed
            src={documentPath}
            type="application/pdf"
            className="flex-1 w-full"
            onLoad={handleLoad}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={openInNewTab} variant="outline">
              Open in New Tab
            </Button>
            <Button onClick={handleDownload}>
              Download PDF
            </Button>
          </div>
        </div>
      );
    }

    return (
      <iframe 
        ref={iframeRef}
        src={documentPath}
        className={`w-full h-full ${loading ? 'hidden' : 'block'}`}
        title={documentName}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
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
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p>Loading document...</p>
              </div>
            </div>
          )}
          
          {error && !isPdf ? (
            <div className="h-full flex flex-col items-center justify-center">
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
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
          ) : isPdf ? (
            renderPdfViewer()
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
        
        {!isPdf && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleDownload}>
              Download
            </Button>
          </div>
        )}
        
        {isPdf && !useEmbedFallback && !error && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="text" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" onClick={openInNewTab}>
              Open in New Tab
            </Button>
            <Button onClick={handleDownload}>
              Download
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};