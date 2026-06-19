import type { ZodSchema, ZodError } from 'zod';
import { ApiException } from './response';

/** Parses the request JSON body and validates it against a Zod schema. */
export async function parseBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ApiException('BAD_REQUEST', 'Request body must be valid JSON.');
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiException('VALIDATION_ERROR', 'Invalid request body.', zodErrorDetails(result.error));
  }
  return result.data;
}

/** Validates query params (already parsed into a plain object) against a schema. */
export function parseQuery<T>(searchParams: URLSearchParams, schema: ZodSchema<T>): T {
  const obj: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) obj[key] = value;

  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ApiException('VALIDATION_ERROR', 'Invalid query parameters.', zodErrorDetails(result.error));
  }
  return result.data;
}

function zodErrorDetails(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_root';
    details[key] = details[key] ?? [];
    details[key].push(issue.message);
  }
  return details;
}
