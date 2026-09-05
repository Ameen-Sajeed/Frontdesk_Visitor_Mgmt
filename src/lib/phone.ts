import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Creates a consistent search key while retaining the exact value the receptionist entered.
 * The initial deployment defaults local numbers to the UAE; international numbers retain
 * their explicitly supplied country code.
 */
export function normalizePhoneForLookup(phone: string) {
  const trimmed = phone.trim();
  const parsed = parsePhoneNumberFromString(trimmed, "AE");
  // Keep the database key numeric so it remains compatible with the original
  // phone-lookup backfill, while still using libphonenumber to normalize UAE
  // local numbers (for example, 050… and +971 50… become the same key).
  if (parsed?.isValid()) return parsed.number.replace(/\D/g, "");
  return trimmed.replace(/[^\d]/g, "");
}
