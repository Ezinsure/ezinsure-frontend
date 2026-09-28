export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: string) => boolean | string;
};

export type ValidationRules = {
  [key: string]: ValidationRule;
};

export type ValidationErrors = {
  [key: string]: string;
};

export const validateForm = (
  values: { [key: string]: string | File | null },
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  for (const fieldName in rules) {
    const value = values[fieldName];
    const rule = rules[fieldName];
    const stringValue = value === null || value instanceof File ? '' : String(value);

    // Required validation
    // For file fields, check if value is a File, or if it's a string (prefilled document), or if corresponding documentUrl exists
    let isValid = false;
    if (rule.required) {
      if (value instanceof File) {
        isValid = true;
      } else if (typeof value === 'string' && value.trim() !== '') {
        isValid = true;
      } else if (value === null || (typeof value === 'string' && value.trim() === '')) {
        // Check for corresponding documentUrl for file fields
        const documentUrlField = fieldName === 'nationalID' ? 'identificationDocumentUrl' :
                                 fieldName === 'yellowCard' ? 'yellowCardUrl' :
                                 fieldName === 'pastInsuranceCertificate' ? 'pastInsuranceCertificateUrl' : null;
        if (documentUrlField && values[documentUrlField] && typeof values[documentUrlField] === 'string' && (values[documentUrlField] as string).trim() !== '') {
          isValid = true;
        }
      }
      if (!isValid) {
        errors[fieldName] = 'This field is required';
        continue; // Skip other validations if field is required but empty
      }
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    // File validation
    if (value instanceof File) {
      // You can add specific file validation here if needed
      continue;
    }

    // For string values
    if (typeof value === 'string') {
      // Min length validation
      if (rule.minLength !== undefined && stringValue.length < rule.minLength) {
        errors[fieldName] = `Minimum length is ${rule.minLength} characters`;
        continue;
      }

      // Max length validation
      if (rule.maxLength !== undefined && stringValue.length > rule.maxLength) {
        errors[fieldName] = `Maximum length is ${rule.maxLength} characters`;
        continue;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(stringValue)) {
        errors[fieldName] = 'Invalid format';
        continue;
      }

      // Custom validation
      if (rule.validate) {
        const validateResult = rule.validate(stringValue);
        if (typeof validateResult === 'string') {
          errors[fieldName] = validateResult;
        } else if (validateResult === false) {
          errors[fieldName] = 'Invalid value';
        }
      }
    }
  }

  return errors;
};

// Predefined validation patterns
export const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
 phone: /^250\d{9}$/,
  numbers: /^\d+$/,
  noSpecialChars: /^[a-zA-Z0-9\s]+$/,
  zipCode: /^\d{5}(-\d{4})?$/,
};

// Helper to check if form has errors
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};