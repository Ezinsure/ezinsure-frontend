'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';
import { Bell, FileSpreadsheet, X, CheckCircle2, AlertCircle, Send, Users, CheckCircle, XCircle } from 'lucide-react';

interface SendResult {
  success: boolean;
  message: string;
  sent?: number;
  skipped?: number;
  totalRows?: number;
}

export const SendDueNotifications = () => {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFileTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];

  const allowedExtensions = ['.xlsx', '.xls'];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls).',
      };
    }

    // Check MIME type (if available)
    if (file.type && !allowedFileTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls).',
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
      setSendResult(null);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid file', 'error');
      setSelectedFile(null);
      setSendResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setSelectedFile(file);
    setSendResult(null);
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
      setSendResult(null);
      return;
    }

    setSelectedFile(file);
    setSendResult(null);

    // Update the file input element
    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setSendResult(null);
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

    setIsSending(true);
    setSendResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/sendDueNotifications`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send due notifications');
      }

      // Parse the response data
      const result: SendResult = {
        success: true,
        message: data.message || 'Due notifications sent successfully',
        sent: data.sent,
        skipped: data.skipped,
        totalRows: data.totalRows,
      };

      setSendResult(result);

      // Show appropriate toast message
      if (data.sent > 0) {
        showToast(
          `Successfully sent ${data.sent} notification${data.sent !== 1 ? 's' : ''}${data.skipped > 0 ? `, ${data.skipped} skipped` : ''}`,
          'success'
        );
      } else {
        showToast(data.message || 'No notifications were sent', 'info');
      }
      
      // Reset form after successful send (only if all succeeded)
      if (data.skipped === 0) {
        setTimeout(() => {
          handleRemoveFile();
          setSendResult(null);
        }, 5000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send notifications';
      setSendResult({
        success: false,
        message: errorMessage,
      });
      showToast(errorMessage, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / 1024 / 1024).toFixed(2);
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Bell className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Send Due Notifications</h3>
          <p className="text-sm text-gray-600">Upload an Excel file to notify users with due applications</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Applications File <span className="text-red-500">*</span>
          </label>
          
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center">
                <div className="p-3 bg-gray-100 rounded-full mb-3">
                  <FileSpreadsheet className="h-6 w-6 text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Excel files (.xlsx, .xls) only
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                required
              />
            </div>
          ) : (
            <div className="border-2 border-purple-300 bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
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

        {/* Send Result */}
        {sendResult && (
          <div
            className={`p-5 rounded-lg border ${
              sendResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3 mb-4">
              {sendResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    sendResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {sendResult.message}
                </p>
              </div>
            </div>

            {/* Statistics */}
            {sendResult.success && sendResult.totalRows !== undefined && (
              <div className="mt-4 space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <p className="text-xs text-gray-600">Total</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{sendResult.totalRows || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-xs text-gray-600">Sent</p>
                    </div>
                    <p className="text-lg font-bold text-green-700">{sendResult.sent || 0}</p>
                  </div>
                  {sendResult.skipped !== undefined && sendResult.skipped > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-yellow-200">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-4 w-4 text-yellow-600" />
                        <p className="text-xs text-gray-600">Skipped</p>
                      </div>
                      <p className="text-lg font-bold text-yellow-700">{sendResult.skipped}</p>
                    </div>
                  )}
                </div>

                {/* Success Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-700" />
                    <p className="text-sm font-semibold text-green-900">
                      Notification Summary
                    </p>
                  </div>
                  <p className="text-xs text-green-800">
                    {sendResult.sent} SMS notification{sendResult.sent !== 1 ? 's' : ''} sent successfully
                    {sendResult.skipped !== undefined && sendResult.skipped > 0 && ` • ${sendResult.skipped} skipped`}
                    {' '} out of {sendResult.totalRows} total row{sendResult.totalRows !== 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Format Info */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-xs font-medium text-purple-900 mb-2">File Requirements:</p>
          <ul className="text-xs text-purple-800 space-y-1 list-disc list-inside">
            <li>File must be in Excel format (.xlsx or .xls)</li>
            <li>Maximum file size: 10MB</li>
            <li>File should contain applications with due dates</li>
            <li>Notifications will be sent via SMS to affected users</li>
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!selectedFile || isSending}
          >
            {isSending ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
                Sending Notifications...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Due Notifications
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

