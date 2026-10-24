export type Salutation = 'Bapak' | 'Ibu' | 'Kak';

export const SALUTATION_OPTIONS: { label: string; value: Salutation }[] = [
  { label: 'Bapak', value: 'Bapak' },
  { label: 'Ibu', value: 'Ibu' },
  { label: 'Kak', value: 'Kak' },
];

/**
 * Extracts and canonicalizes existing salutation from a customer name,
 * or returns null if no salutation is detected.
 */
export function extractSalutation(name: string): { salutation: Salutation | null; cleanName: string } {
  if (!name) return { salutation: null, cleanName: '' };
  const trimmed = name.trim();

  // Match Indonesian honorific prefixes: Bapak, Pak, Bpk, Ibu, Bu, Kak, Ka, Kakak (case-insensitive)
  const regex = /^(bapak|bpk\.?|pak\.?|ibu\.?|bu\.?|kakak\.?|kak\.?|ka\.?)\s+/i;
  const match = trimmed.match(regex);

  if (match) {
    const raw = match[1].toLowerCase();
    const clean = trimmed.replace(regex, '').trim();
    if (raw.startsWith('bap') || raw.startsWith('pak') || raw.startsWith('bpk')) {
      return { salutation: 'Bapak', cleanName: clean };
    }
    if (raw.startsWith('ib') || raw.startsWith('bu')) {
      return { salutation: 'Ibu', cleanName: clean };
    }
    if (raw.startsWith('ka')) {
      return { salutation: 'Kak', cleanName: clean };
    }
  }

  return { salutation: null, cleanName: trimmed };
}

/**
 * Formats a customer name to always have a formal honorific: 'Bapak', 'Ibu', or 'Kak'.
 * Defaults to 'Kak' if no salutation is detected or preferred.
 */
export function formatCustomerName(rawName: string, preferredSalutation: Salutation = 'Kak'): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  const { salutation, cleanName } = extractSalutation(trimmed);
  const finalSalutation = salutation || preferredSalutation;

  return cleanName ? `${finalSalutation} ${cleanName}` : finalSalutation;
}
