/**
 * Canonical Phone Normalization Engine — PILIN Methodology (Section 15)
 * Converts arbitrary input formats into standard canonical representation '628XXXXXXXXX'.
 * Examples:
 *  - "08123456789"        => "628123456789"
 *  - "+62 812 3456 789"   => "628123456789"
 *  - "628123456789"       => "628123456789"
 *  - "0812-3456-789"      => "628123456789"
 */
export function normalizePhoneNumber(phoneInput?: string | null): string {
  if (!phoneInput) return "";

  // 1. Remove all non-digit characters
  let digits = phoneInput.replace(/\D/g, "");

  if (!digits) return "";

  // 2. Handle leading "08..." => "628..."
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  
  // 3. Handle numbers starting directly with "8..." => "628..."
  else if (digits.startsWith("8")) {
    digits = "62" + digits;
  }

  return digits;
}

/**
 * Validates if the normalized phone number meets standard Indonesian mobile length (10-14 digits starting with 628)
 */
export function isValidIndonesianPhone(normalizedPhone: string): boolean {
  if (!normalizedPhone) return false;
  return /^628\d{7,11}$/.test(normalizedPhone);
}
