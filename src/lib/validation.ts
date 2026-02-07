/**
 * Form validation utilities
 */

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type FieldValidator<T> = (value: T) => ValidationResult;

// Common validators
export const validators = {
  required: (fieldName: string): FieldValidator<string | undefined | null> => (value) => {
    if (!value || value.trim() === "") {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true };
  },

  email: (): FieldValidator<string> => (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, error: "Please enter a valid email address" };
    }
    return { valid: true };
  },

  minLength: (min: number, fieldName: string): FieldValidator<string> => (value) => {
    if (value.length < min) {
      return { valid: false, error: `${fieldName} must be at least ${min} characters` };
    }
    return { valid: true };
  },

  maxLength: (max: number, fieldName: string): FieldValidator<string> => (value) => {
    if (value.length > max) {
      return { valid: false, error: `${fieldName} must be at most ${max} characters` };
    }
    return { valid: true };
  },

  phone: (): FieldValidator<string> => (value) => {
    // NZ phone number format
    const phoneRegex = /^(\+64|0)[\d\s-]{7,12}$/;
    if (!phoneRegex.test(value.replace(/\s/g, ""))) {
      return { valid: false, error: "Please enter a valid NZ phone number" };
    }
    return { valid: true };
  },

  url: (): FieldValidator<string> => (value) => {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: "Please enter a valid URL" };
    }
  },

  positiveNumber: (fieldName: string): FieldValidator<number> => (value) => {
    if (value <= 0 || isNaN(value)) {
      return { valid: false, error: `${fieldName} must be a positive number` };
    }
    return { valid: true };
  },

  dateNotInFuture: (fieldName: string): FieldValidator<Date | string> => (value) => {
    const date = typeof value === "string" ? new Date(value) : value;
    if (date > new Date()) {
      return { valid: false, error: `${fieldName} cannot be in the future` };
    }
    return { valid: true };
  },

  nzPostcode: (): FieldValidator<string> => (value) => {
    const postcodeRegex = /^\d{4}$/;
    if (!postcodeRegex.test(value)) {
      return { valid: false, error: "Please enter a valid 4-digit NZ postcode" };
    }
    return { valid: true };
  },
};

// Combine multiple validators
export function combineValidators<T>(
  ...validatorFns: FieldValidator<T>[]
): FieldValidator<T> {
  return (value: T) => {
    for (const validate of validatorFns) {
      const result = validate(value);
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  };
}

// Validate an entire form object
export function validateForm<T extends Record<string, unknown>>(
  data: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Partial<Record<keyof T, FieldValidator<any>>>
): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let valid = true;

  for (const [field, validator] of Object.entries(schema)) {
    if (validator) {
      const result = (validator as FieldValidator<unknown>)(data[field as keyof T]);
      if (!result.valid) {
        valid = false;
        errors[field as keyof T] = result.error;
      }
    }
  }

  return { valid, errors };
}

// Sanitization utilities
export const sanitize = {
  trim: (value: string): string => value.trim(),

  stripHtml: (value: string): string =>
    value.replace(/<[^>]*>/g, ""),

  escapeHtml: (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;"),

  normalizeWhitespace: (value: string): string =>
    value.replace(/\s+/g, " ").trim(),

  toSlug: (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
};

// File validation
export const fileValidators = {
  maxSize: (maxBytes: number): FieldValidator<File> => (file) => {
    if (file.size > maxBytes) {
      const maxMB = Math.round(maxBytes / 1024 / 1024);
      return { valid: false, error: `File size must be less than ${maxMB}MB` };
    }
    return { valid: true };
  },

  allowedTypes: (types: string[]): FieldValidator<File> => (file) => {
    if (!types.includes(file.type)) {
      return { valid: false, error: `File type must be one of: ${types.join(", ")}` };
    }
    return { valid: true };
  },

  isImage: (): FieldValidator<File> => (file) => {
    if (!file.type.startsWith("image/")) {
      return { valid: false, error: "File must be an image" };
    }
    return { valid: true };
  },
};
