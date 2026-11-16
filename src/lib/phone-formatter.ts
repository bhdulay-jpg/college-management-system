/**
 * Format Philippine phone number to: +63 XXX XXX XXXX
 * Handles various input formats and removes non-numeric characters
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters except +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // Remove + if not at the start
  cleaned = cleaned.replace(/(?!^)\+/g, '');
  
  // If starts with 0, replace with +63
  if (cleaned.startsWith('0')) {
    cleaned = '+63' + cleaned.substring(1);
  }
  
  // If doesn't start with +, add +63
  if (!cleaned.startsWith('+')) {
    cleaned = '+63' + cleaned;
  }
  
  // Ensure it starts with +63
  if (!cleaned.startsWith('+63')) {
    cleaned = '+63' + cleaned.replace(/^\+/, '');
  }
  
  // Remove +63 prefix for formatting
  const withoutPrefix = cleaned.substring(3);
  
  // Format: +63 XXX XXX XXXX (Philippine format)
  // Max length: 10 digits after +63
  const digits = withoutPrefix.substring(0, 10);
  
  if (digits.length === 0) {
    return '+63 ';
  } else if (digits.length <= 3) {
    return `+63 ${digits}`;
  } else if (digits.length <= 6) {
    return `+63 ${digits.substring(0, 3)} ${digits.substring(3)}`;
  } else {
    return `+63 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
}

/**
 * Validate Philippine phone number
 * Valid format: +63 XXX XXX XXXX (10 digits after +63)
 */
export function isValidPhoneNumber(value: string): boolean {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Should have exactly 12 digits (63 + 10 digits)
  // or 11 digits if starting with 0
  return cleaned.length === 12 || (cleaned.startsWith('0') && cleaned.length === 11);
}

/**
 * Get clean phone number (numbers only with +63 prefix)
 */
export function getCleanPhoneNumber(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    return '+63' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+63')) {
    return '+63' + cleaned.replace(/^\+/, '');
  }
  return cleaned;
}
