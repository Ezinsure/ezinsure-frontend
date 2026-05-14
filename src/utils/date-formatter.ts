/**
 * Date formatting utilities
 * These functions handle timezone issues by working with UTC dates
 * to prevent date shifting when displaying dates stored in the database
 */

/**
 * Formats a date string to numeric display format without timezone conversion
 * Extracts the date part in UTC to avoid timezone-related date shifts
 * 
 * @param dateString - ISO date string from database (e.g., "2026-04-11T23:59:59.999+00:00")
 * @returns Formatted date string (DD/MM/YYYY) or fallback value
 */
export const formatDateUTC = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Use UTC methods to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${day}/${month}/${year}`;
  } catch {
    return 'Date Error';
  }
};

/**
 * Formats a date string to text format without timezone conversion
 * 
 * @param dateString - ISO date string from database
 * @param format - Output format: 'short' (Apr 11, 2026) or 'long' (April 11, 2026)
 * @returns Formatted date string or fallback value
 */
export const formatDateText = (
  dateString: string | undefined | null,
  format: 'short' | 'long' = 'short'
): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    // Use UTC methods to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    // Create month names array
    const monthNames = format === 'short'
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return `${monthNames[month]} ${day}, ${year}`;
  } catch {
    return 'Date Error';
  }
};


/**
 * Formats a date string for Excel export (YYYY-MM-DD)
 * 
 * @param dateString - ISO date string from database
 * @returns Formatted date string (YYYY-MM-DD) or 'N/A'
 */
export const formatDateForExcel = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    // Use UTC methods to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return 'N/A';
  }
};

/**
 * Formats a date range for display (text format for better readability)
 * 
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Formatted date range string
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = formatDateText(startDate, 'short');
  const end = formatDateText(endDate, 'short');
  return `${start} - ${end}`;
};

/**
 * Formats time from a date string (works with local timezone for time display)
 * 
 * @param dateString - ISO date string
 * @returns Formatted time string (HH:MM AM/PM)
 */
export const formatTime = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Time Error';
  }
};

/**
 * Formats a date and time together
 * 
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
export const formatDateTime = (dateString: string | undefined | null): string => {
  const date = formatDateUTC(dateString);
  const time = formatTime(dateString);
  
  if (date === 'N/A' || date === 'Invalid Date') return date;
  if (time === 'N/A' || time === 'Invalid Time') return date;
  
  return `${date} ${time}`;
};

