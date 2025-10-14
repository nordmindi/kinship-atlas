
/**
 * Calculates age from birthdate, optionally to a death date
 */
export function calculateAge(birthDate: string, deathDate?: string): number | null {
  try {
    const birth = new Date(birthDate);
    const end = deathDate ? new Date(deathDate) : new Date();
    
    let age = end.getFullYear() - birth.getFullYear();
    const monthDiff = end.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error("Error calculating age:", error);
    return null;
  }
}

/**
 * Formats a date string into a readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

/**
 * Returns year range (birth-death) for a person
 */
export function getYearRange(birthDate?: string, deathDate?: string): string {
  if (!birthDate) return 'Unknown';
  
  const birthYear = new Date(birthDate).getFullYear();
  const deathYear = deathDate ? new Date(deathDate).getFullYear() : null;
  
  return deathYear ? `${birthYear} - ${deathYear}` : `b. ${birthYear}`;
}
