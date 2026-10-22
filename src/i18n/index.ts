import enMessages from "./messages/en.json";

export type Messages = typeof enMessages;

/**
 * Access localized messages by dot-notation key.
 * Guarantees no user-facing string is hardcoded in component code.
 */
export function getMessage(path: string, params?: Record<string, string | number>): string {
  const parts = path.split(".");
  let current: unknown = enMessages;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path; // Fallback to key if missing
    }
  }

  if (typeof current !== "string") {
    return path;
  }

  if (!params) return current;

  return current.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

export function useTranslations(prefix?: string) {
  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return getMessage(fullKey, params);
  };
}

export default enMessages;
