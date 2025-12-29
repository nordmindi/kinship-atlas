import { describe, it, expect } from 'vitest'
import { calculateAge, getYearRange } from '../dateUtils'

describe('dateUtils', () => {
  describe('calculateAge', () => {
    it('should calculate age correctly for living person', () => {
      const birthDate = '1990-01-01'
      const result = calculateAge(birthDate)
      
      // Age should be approximately 34 (as of 2024)
      expect(result).toBeGreaterThan(30)
      expect(result).toBeLessThan(40)
    })

    it('should calculate age at death for deceased person', () => {
      const birthDate = '1950-01-01'
      const deathDate = '2020-01-01'
      const result = calculateAge(birthDate, deathDate)
      
      expect(result).toBe(70)
    })

    it('should return NaN for invalid birth date', () => {
      const result = calculateAge('invalid-date')
      expect(result).toBeNaN()
    })

    it('should return NaN for invalid death date', () => {
      const result = calculateAge('1990-01-01', 'invalid-date')
      expect(result).toBeNaN()
    })

    it('should return negative age for death date before birth date', () => {
      const result = calculateAge('1990-01-01', '1980-01-01')
      expect(result).toBe(-10)
    })

    it('should handle edge case of same birth and death date', () => {
      const result = calculateAge('1990-01-01', '1990-01-01')
      expect(result).toBe(0)
    })
  })

  describe('getYearRange', () => {
    it('should return birth year for living person', () => {
      const result = getYearRange('1990-01-01')
      expect(result).toBe('b. 1990')
    })

    it('should return birth-death range for deceased person', () => {
      const result = getYearRange('1950-01-01', '2020-01-01')
      expect(result).toBe('1950 - 2020')
    })

    it('should return "Unknown" for no birth date', () => {
      const result = getYearRange()
      expect(result).toBe('Unknown')
    })

    it('should return birth year only for no death date', () => {
      const result = getYearRange('1990-01-01')
      expect(result).toBe('b. 1990')
    })

    it('should handle invalid dates gracefully', () => {
      const result = getYearRange('invalid-date')
      expect(result).toBe('b. NaN')
    })
  })
})
