// Input validation utilities for A-Cube SDK

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Email validation
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!email || email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'EMAIL_REQUIRED'
    });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        code: 'EMAIL_INVALID'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Password validation (A-Cube requirements)
 */
export const validatePassword = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: 'PASSWORD_REQUIRED'
    });
    return { isValid: false, errors };
  }
  
  // Minimum length
  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
      code: 'PASSWORD_TOO_SHORT'
    });
  }
  
  // Maximum length
  if (password.length > 40) {
    errors.push({
      field: 'password',
      message: 'Password must not exceed 40 characters',
      code: 'PASSWORD_TOO_LONG'
    });
  }
  
  // Must contain uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: 'PASSWORD_NO_UPPERCASE'
    });
  }
  
  // Must contain lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
      code: 'PASSWORD_NO_LOWERCASE'
    });
  }
  
  // Must contain digit
  if (!/[0-9]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one digit',
      code: 'PASSWORD_NO_DIGIT'
    });
  }
  
  // Must contain special character
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one special character (!@#$%^&*)',
      code: 'PASSWORD_NO_SPECIAL'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Italian fiscal ID validation (Partita IVA)
 */
export const validateFiscalId = (fiscalId: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!fiscalId || fiscalId.trim() === '') {
    errors.push({
      field: 'fiscal_id',
      message: 'Fiscal ID is required',
      code: 'FISCAL_ID_REQUIRED'
    });
  } else {
    // Must be exactly 11 digits
    const fiscalIdRegex = /^\d{11}$/;
    if (!fiscalIdRegex.test(fiscalId)) {
      errors.push({
        field: 'fiscal_id',
        message: 'Fiscal ID must be exactly 11 digits',
        code: 'FISCAL_ID_INVALID'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Italian postal code validation
 */
export const validateZipCode = (zipCode: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!zipCode || zipCode.trim() === '') {
    errors.push({
      field: 'zip_code',
      message: 'ZIP code is required',
      code: 'ZIP_CODE_REQUIRED'
    });
  } else {
    // Must be exactly 5 digits
    const zipCodeRegex = /^\d{5}$/;
    if (!zipCodeRegex.test(zipCode)) {
      errors.push({
        field: 'zip_code',
        message: 'ZIP code must be exactly 5 digits',
        code: 'ZIP_CODE_INVALID'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Italian province code validation
 */
export const validateProvinceCode = (province: string): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!province || province.trim() === '') {
    errors.push({
      field: 'province',
      message: 'Province code is required',
      code: 'PROVINCE_REQUIRED'
    });
  } else {
    // Must be exactly 2 letters
    const provinceRegex = /^[A-Z]{2}$/;
    if (!provinceRegex.test(province.toUpperCase())) {
      errors.push({
        field: 'province',
        message: 'Province code must be exactly 2 letters',
        code: 'PROVINCE_INVALID'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Address validation
 */
export const validateAddress = (address: {
  street_address: string;
  zip_code: string;
  city: string;
  province: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Street address
  if (!address.street_address || address.street_address.trim() === '') {
    errors.push({
      field: 'street_address',
      message: 'Street address is required',
      code: 'STREET_ADDRESS_REQUIRED'
    });
  }
  
  // City
  if (!address.city || address.city.trim() === '') {
    errors.push({
      field: 'city',
      message: 'City is required',
      code: 'CITY_REQUIRED'
    });
  }
  
  // ZIP code
  const zipValidation = validateZipCode(address.zip_code);
  errors.push(...zipValidation.errors);
  
  // Province
  const provinceValidation = validateProvinceCode(address.province);
  errors.push(...provinceValidation.errors);
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Receipt item validation
 */
export const validateReceiptItem = (item: {
  quantity: string;
  description: string;
  unit_price: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];
  
  // Quantity validation
  if (!item.quantity) {
    errors.push({
      field: 'quantity',
      message: 'Quantity is required',
      code: 'QUANTITY_REQUIRED'
    });
  } else {
    const quantityRegex = /^\d+\.\d{2}$/;
    if (!quantityRegex.test(item.quantity)) {
      errors.push({
        field: 'quantity',
        message: 'Quantity must be in format X.XX (e.g., 1.00, 2.50)',
        code: 'QUANTITY_INVALID_FORMAT'
      });
    }
  }
  
  // Description validation
  if (!item.description || item.description.trim() === '') {
    errors.push({
      field: 'description',
      message: 'Description is required',
      code: 'DESCRIPTION_REQUIRED'
    });
  } else if (item.description.length > 1000) {
    errors.push({
      field: 'description',
      message: 'Description must not exceed 1000 characters',
      code: 'DESCRIPTION_TOO_LONG'
    });
  }
  
  // Unit price validation
  if (!item.unit_price) {
    errors.push({
      field: 'unit_price',
      message: 'Unit price is required',
      code: 'UNIT_PRICE_REQUIRED'
    });
  } else {
    const priceRegex = /^\d+(\.\d{1,8})?$/;
    if (!priceRegex.test(item.unit_price)) {
      errors.push({
        field: 'unit_price',
        message: 'Unit price must be a valid decimal number with up to 8 decimal places',
        code: 'UNIT_PRICE_INVALID_FORMAT'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Money amount validation (for payments, discounts, etc.)
 */
export const validateMoneyAmount = (
  amount: string,
  fieldName: string,
  required: boolean = false
): ValidationResult => {
  const errors: ValidationError[] = [];
  
  if (!amount || amount.trim() === '') {
    if (required) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        code: `${fieldName.toUpperCase()}_REQUIRED`
      });
    }
  } else {
    const amountRegex = /^\d+(\.\d{2,8})?$/;
    if (!amountRegex.test(amount)) {
      errors.push({
        field: fieldName,
        message: `${fieldName} must be a valid decimal number with 2-8 decimal places`,
        code: `${fieldName.toUpperCase()}_INVALID_FORMAT`
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Combine multiple validation results
 */
export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors = results.flatMap(result => result.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Generic field validation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateRequired = (value: any, fieldName: string): ValidationResult => {
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      errors: [{
        field: fieldName,
        message: `${fieldName} is required`,
        code: `${fieldName.toUpperCase()}_REQUIRED`
      }]
    };
  }
  
  return { isValid: true, errors: [] };
};