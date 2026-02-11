'use client';

import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  minStartDate?: string; // Minimum date for start date input
  maxStartDate?: string; // Maximum date for start date input
  minEndDate?: string; // Minimum date for end date input
  maxEndDate?: string; // Maximum date for end date input
  className?: string;
}

// Helper function to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  minStartDate,
  maxStartDate,
  minEndDate,
  maxEndDate,
  className = '',
}: DateRangePickerProps) {
  // Calculate effective min/max for start date
  // Start date cannot be after end date (if end date exists)
  const effectiveMaxStartDate = maxStartDate 
    ? (endDate && endDate < maxStartDate ? endDate : maxStartDate)
    : endDate || undefined;

  // Calculate effective min/max for end date
  // End date cannot be before start date (if start date exists)
  const effectiveMinEndDate = minEndDate 
    ? (startDate && startDate > minEndDate ? startDate : minEndDate)
    : startDate || undefined;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-4 w-4 text-gray-500" />
        <h2 className="text-sm font-medium text-gray-700">Date Range</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 w-16">FROM:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              onStartDateChange(e.target.value);
            }}
            min={minStartDate}
            max={effectiveMaxStartDate}
            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 w-16">TO:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              onEndDateChange(e.target.value);
            }}
            min={effectiveMinEndDate}
            max={maxEndDate}
            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

