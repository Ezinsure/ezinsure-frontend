
'use client';

import { Button } from './button';

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
        
        <div className="flex-1 border rounded-lg overflow-hidden">
          <iframe 
            src={documentPath}
            className="w-full h-full"
            title={documentName}
          />
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