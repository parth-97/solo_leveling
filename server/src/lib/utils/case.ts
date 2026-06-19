/**
 * Recursively converts object keys from snake_case (Postgres/Supabase
 * convention) to camelCase (frontend TypeScript convention), matching
 * the field names in src/types/shared.ts of the Vite app.
 *
 * Arrays are mapped element-wise. Non-plain-object values (Date, null,
 * primitives) pass through unchanged.
 */
export function toCamel<T = unknown>(input: unknown): T {
  if (Array.isArray(input)) {
    return input.map((item) => toCamel(item)) as unknown as T;
  }
  if (input !== null && typeof input === 'object' && input.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
      out[camelKey] = toCamel(value);
    }
    return out as T;
  }
  return input as T;
}

/** Converts a single camelCase key to snake_case (for building update payloads). */
export function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Shallow camelCase -> snake_case for object keys (e.g. building DB update payloads). */
export function toSnakeShallow(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    out[toSnakeKey(key)] = value;
  }
  return out;
}
