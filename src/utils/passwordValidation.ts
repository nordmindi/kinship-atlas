/**
 * Password validation utilities
 * 
 * These validation rules match what's enforced on the client-side in Auth.tsx
 * and can be reused in other places that need password validation.
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

/** Default password requirements */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false, // Optional but improves strength
};

/**
 * Validates a password against the specified requirements.
 * 
 * @param password - The password to validate
 * @param requirements - Optional custom requirements (defaults to DEFAULT_PASSWORD_REQUIREMENTS)
 * @returns Validation result with errors and strength assessment
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  let strengthScore = 0;

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters.`);
  } else {
    strengthScore += 1;
    // Bonus for longer passwords
    if (password.length >= 12) strengthScore += 1;
    if (password.length >= 16) strengthScore += 1;
  }

  // Check for uppercase letter
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  } else if (/[A-Z]/.test(password)) {
    strengthScore += 1;
  }

  // Check for lowercase letter
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  } else if (/[a-z]/.test(password)) {
    strengthScore += 1;
  }

  // Check for number
  if (requirements.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number.');
  } else if (/\d/.test(password)) {
    strengthScore += 1;
  }

  // Check for special character (optional but improves strength)
  if (requirements.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  } else if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strengthScore += 2;
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong';
  if (strengthScore <= 2) {
    strength = 'weak';
  } else if (strengthScore <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Validates an email address format.
 * 
 * @param email - The email to validate
 * @returns true if the email is valid
 */
export function isValidEmail(email: string): boolean {
  // Simple but effective email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Returns the password requirements as a human-readable string.
 */
export function getPasswordRequirementsText(
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): string {
  const parts: string[] = [];
  
  parts.push(`at least ${requirements.minLength} characters`);
  
  if (requirements.requireUppercase) {
    parts.push('one uppercase letter');
  }
  
  if (requirements.requireLowercase) {
    parts.push('one lowercase letter');
  }
  
  if (requirements.requireNumber) {
    parts.push('one number');
  }
  
  if (requirements.requireSpecialChar) {
    parts.push('one special character');
  }
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  const lastPart = parts.pop();
  return `${parts.join(', ')}, and ${lastPart}`;
}
