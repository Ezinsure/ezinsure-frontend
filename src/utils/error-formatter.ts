/**
 * Formats error messages to be more user-friendly
 * @param error - The error message or Error object
 * @returns A user-friendly error message
 */
export const formatErrorMessage = (error: unknown): string => {
  let errorMessage = 'An unexpected error occurred. Please try again.';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  // Check for duplicate email error (MongoDB E11000 error)
  if (
    errorMessage.includes('E11000') ||
    errorMessage.includes('duplicate key error') ||
    errorMessage.includes('dup key')
  ) {
    // Try to extract the email from various error message formats
    // Pattern 1: email: "value" or email: 'value'
    // Pattern 2: email: value (no quotes)
    // Pattern 3: { email: "value" } or { email: 'value' }
    let emailMatch = errorMessage.match(/email[:\s]*["']([^"']+)["']/i);
    if (!emailMatch) {
      emailMatch = errorMessage.match(/email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    }
    if (!emailMatch) {
      emailMatch = errorMessage.match(/["']([^"']*@[^"']*)["']/);
    }

    const email = emailMatch ? emailMatch[1] : null;

    if (email && email.includes('@')) {
      return `This email address (${email}) is already registered with another client. Please use a different email address or contact support if you believe this is an error.`;
    } else {
      return 'This email address is already registered with another client. Please use a different email address or contact support if you believe this is an error.';
    }
  }

  // Check for other common duplicate key errors
  if (errorMessage.includes('duplicate') && errorMessage.includes('key')) {
    return 'A record with this information already exists. Please check your input and try again.';
  }

  return errorMessage;
};

