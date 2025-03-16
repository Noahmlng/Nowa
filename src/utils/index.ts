/**
 * Utils Index
 * 
 * This file exports common utility functions for the application.
 */

/**
 * Generate a unique ID
 * @returns A unique ID string
 */
export function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Format a date for display
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Calculate the similarity between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns A number between 0 and 1 representing similarity
 */
export function stringSimilarity(str1: string, str2: string): number {
  // Simple implementation of Levenshtein distance
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const maxLen = Math.max(len1, len2);
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  
  return 1 - distance / maxLen;
}

/**
 * Calculate the Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The Levenshtein distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  return track[str2.length][str1.length];
} 