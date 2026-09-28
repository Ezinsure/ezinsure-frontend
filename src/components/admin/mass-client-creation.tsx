'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { Upload, FileSpreadsheet, FileText, X, CheckCircle2, AlertCircle, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  total?: number;
  successful?: number;
  skipped?: number;
  failed?: number;
  details?: {
    successful?: Array<{ clientId: string }>;
    skipped?: Array<{ row: number; reason: string }>;
    failed?: Array<{ row: number; reason: string }>;
  };
}

export const MassClientCreation = () => {
  const { token } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];

  const allowedExtensions = ['.xlsx', '.xls', '.csv'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
      };
    }

    // Check MIME type (if available)
    if (file.type && !allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.',
      };
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB. Please upload a smaller file.',
      };
    }

    return { valid: true };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setUploadResult(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file', 'error');
      setSelectedFile(null);
      setUploadResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file', 'error');
      setSelectedFile(null);
      setUploadResult(null);
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);

    // Update the file input element
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    if (!token) {
      showToast('Authentication required', 'error');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/massClientCreation`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload file and create clients');
      }

      // Parse the response data
      const result: UploadResult = {
        success: true,
        message: data.message || 'Clients created successfully',
        total: data.total,
        successful: data.successful,
        skipped: data.skipped,
        failed: data.failed,
        details: data.details || undefined,
      };

      setUploadResult(result);

      // Show appropriate toast message
      if (data.successful > 0) {
        showToast(
          `Successfully created ${data.successful} client${data.successful !== 1 ? 's' : ''}${data.skipped > 0 ? `, ${data.skipped} skipped` : ''}${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
          'success'
        );
      } else {
        showToast(data.message || 'No clients were created', 'info');
      }
      
      // Reset form after successful upload (only if all succeeded)
      if (data.failed === 0 && data.skipped === 0) {
        setTimeout(() => {
          handleRemoveFile();
        }, 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      setUploadResult({
        success: false,
        message: errorMessage,
      });
      showToast(errorMessage, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    const extension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === '.csv') {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
  };

  return (
    <>
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Upload className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Mass Client Creation</h3>
            <p className="text-sm text-gray-600">Upload an Excel or CSV file to create multiple clients at once</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Data File <span className="text-red-500">*</span>
            </label>
            
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center justify-center">
                  <div className="p-3 bg-gray-100 rounded-full mb-3">
                    <Upload className="h-6 w-6 text-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    Excel (.xlsx, .xls) or CSV (.csv) files only
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Maximum file size: 10MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  required
                />
              </div>
            ) : (
              <div className="border-2 border-blue-300 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getFileIcon()}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(selectedFile.size)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Result */}
          {uploadResult && (
            <div
              className={`p-5 rounded-lg border ${
                uploadResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3 mb-4">
                {uploadResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      uploadResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {uploadResult.message}
                  </p>
                </div>
              </div>

              {/* Statistics */}
              {uploadResult.success && uploadResult.total !== undefined && (
                <div className="mt-4 space-y-3">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <p className="text-xs text-gray-600">Total</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{uploadResult.total || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-gray-600">Successful</p>
                      </div>
                      <p className="text-lg font-bold text-green-700">{uploadResult.successful || 0}</p>
                    </div>
                    {uploadResult.skipped !== undefined && uploadResult.skipped > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-yellow-200">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <p className="text-xs text-gray-600">Skipped</p>
                        </div>
                        <p className="text-lg font-bold text-yellow-700">{uploadResult.skipped}</p>
                      </div>
                    )}
                    {uploadResult.failed !== undefined && uploadResult.failed > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-red-200">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <p className="text-xs text-gray-600">Failed</p>
                        </div>
                        <p className="text-lg font-bold text-red-700">{uploadResult.failed}</p>
                      </div>
                    )}
                  </div>

                  {/* Detailed Results */}
                  {uploadResult.details && (
                    <div className="space-y-3 mt-4">
                      {/* Skipped Clients */}
                      {uploadResult.details.skipped && uploadResult.details.skipped.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-700" />
                            <p className="text-sm font-semibold text-yellow-900">
                              Skipped ({uploadResult.details.skipped.length})
                            </p>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {uploadResult.details.skipped.map((item, index) => (
                              <div key={index} className="text-xs text-yellow-800 bg-white rounded p-2">
                                <span className="font-medium">Row {item.row}:</span> {item.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Failed Clients */}
                      {uploadResult.details.failed && uploadResult.details.failed.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-700" />
                            <p className="text-sm font-semibold text-red-900">
                              Failed ({uploadResult.details.failed.length})
                            </p>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {uploadResult.details.failed.map((item, index) => (
                              <div key={index} className="text-xs text-red-800 bg-white rounded p-2">
                                <span className="font-medium">Row {item.row}:</span> {item.reason}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Successful Clients Info */}
                      {uploadResult.details.successful && uploadResult.details.successful.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-700" />
                            <p className="text-sm font-semibold text-green-900">
                              Successfully Created ({uploadResult.details.successful.length})
                            </p>
                          </div>
                          <p className="text-xs text-green-800">
                            {uploadResult.details.successful.length} client{uploadResult.details.successful.length !== 1 ? 's' : ''} created successfully.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Format Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-900 mb-2">File Format Requirements:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>File must be in Excel (.xlsx, .xls) or CSV (.csv) format</li>
              <li>Maximum file size: 10MB</li>
              <li>Ensure your file contains the required client data columns</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Create Clients
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
      <ToastContainer />
    </>
  );
};

