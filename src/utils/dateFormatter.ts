/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a given date string (such as YYYY-MM-DD) to Brazilian Day/Month/Year format.
 * Safe for undefined/null/empty strings.
 * 
 * @param dateStr Date input format string
 * @returns Date string formatted as DD/MM/YYYY
 */
export function formatToBrazilianDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  
  // 1. If it's already in DD/MM/YYYY format, keep it as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // 2. Map standard YYYY-MM-DD format directly
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  
  // 3. Fallback to standard javascript auto-parsing
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (_) {
    // Ignore error and return string as is
  }
  
  return dateStr;
}
