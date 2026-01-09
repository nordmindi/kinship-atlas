import { describe, it, expect } from 'vitest'
import { 
  validatePassword, 
  isValidEmail, 
  getPasswordRequirementsText,
  DEFAULT_PASSWORD_REQUIREMENTS 
} from '../passwordValidation'

describe('validatePassword', () => {
  describe('with default requirements', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('StrongPass123')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(['medium', 'strong']).toContain(result.strength)
    })

    it('should reject password shorter than minimum length', () => {
      const result = validatePassword('Pass1')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters.')
    })

    it('should reject password without uppercase letter', () => {
      const result = validatePassword('password123')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter.')
    })

    it('should reject password without lowercase letter', () => {
      const result = validatePassword('PASSWORD123')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter.')
    })

    it('should reject password without number', () => {
      const result = validatePassword('StrongPassword')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number.')
    })

    it('should report multiple errors for very weak password', () => {
      const result = validatePassword('weak')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.strength).toBe('weak')
    })

    it('should handle empty password', () => {
      const result = validatePassword('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('strength assessment', () => {
    it('should rate very short password as weak', () => {
      const result = validatePassword('a')
      expect(result.strength).toBe('weak')
    })

    it('should rate password meeting minimum requirements as medium', () => {
      const result = validatePassword('Password1')
      expect(result.isValid).toBe(true)
      expect(['weak', 'medium']).toContain(result.strength)
    })

    it('should rate long password with special chars as strong', () => {
      const result = validatePassword('VeryStrongPassword123!')
      expect(result.isValid).toBe(true)
      expect(result.strength).toBe('strong')
    })

    it('should give bonus for longer passwords', () => {
      const short = validatePassword('Passwo1!')
      const long = validatePassword('VeryLongPassword123!')
      
      // Longer password should have equal or higher strength
      const strengthOrder = { weak: 0, medium: 1, strong: 2 }
      expect(strengthOrder[long.strength]).toBeGreaterThanOrEqual(strengthOrder[short.strength])
    })
  })

  describe('with custom requirements', () => {
    it('should validate against custom minimum length', () => {
      const result = validatePassword('Pass1', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        minLength: 5,
      })
      
      expect(result.isValid).toBe(true)
    })

    it('should not require uppercase when disabled', () => {
      const result = validatePassword('password123', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireUppercase: false,
      })
      
      expect(result.errors).not.toContain('Password must contain at least one uppercase letter.')
    })

    it('should require special character when enabled', () => {
      const result = validatePassword('Password123', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireSpecialChar: true,
      })
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character.')
    })

    it('should accept password with special character when required', () => {
      const result = validatePassword('Password123!', {
        ...DEFAULT_PASSWORD_REQUIREMENTS,
        requireSpecialChar: true,
      })
      
      expect(result.isValid).toBe(true)
    })
  })
})

describe('isValidEmail', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
    expect(isValidEmail('user+tag@example.org')).toBe(true)
    expect(isValidEmail('a@b.co')).toBe(true)
  })

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('missing@domain')).toBe(false)
    expect(isValidEmail('@nodomain.com')).toBe(false)
    expect(isValidEmail('spaces in@email.com')).toBe(false)
    expect(isValidEmail('no@domain.')).toBe(false)
  })
})

describe('getPasswordRequirementsText', () => {
  it('should return requirements text with defaults', () => {
    const text = getPasswordRequirementsText()
    
    expect(text).toContain('at least 8 characters')
    expect(text).toContain('one uppercase letter')
    expect(text).toContain('one lowercase letter')
    expect(text).toContain('one number')
  })

  it('should include special character when required', () => {
    const text = getPasswordRequirementsText({
      ...DEFAULT_PASSWORD_REQUIREMENTS,
      requireSpecialChar: true,
    })
    
    expect(text).toContain('one special character')
  })

  it('should reflect custom minimum length', () => {
    const text = getPasswordRequirementsText({
      ...DEFAULT_PASSWORD_REQUIREMENTS,
      minLength: 12,
    })
    
    expect(text).toContain('at least 12 characters')
  })

  it('should omit requirements that are disabled', () => {
    const text = getPasswordRequirementsText({
      minLength: 6,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: false,
      requireSpecialChar: false,
    })
    
    expect(text).not.toContain('uppercase')
    expect(text).not.toContain('number')
    expect(text).toContain('lowercase')
  })
})
