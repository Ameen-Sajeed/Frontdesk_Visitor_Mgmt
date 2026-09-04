import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Creates a consistent search key while retaining the exact value the receptionist entered.
 * The initial deployment defaults local numbers to the UAE; international numbers retain
 * their explicitly supplied country code.
 */
export function normalizePhoneForLookup(phone: string) {
  const trimmed = phone.trim();
  const parsed = parsePhoneNumberFromString(trimmed, "AE");
  if (parsed?.isValid()) return parsed.number;
  return trimmed.replace(/[^\d]/g, "");
}
