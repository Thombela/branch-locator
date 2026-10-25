import type { z } from 'zod';
import { env } from '@/config/env';
import { apiErrorBodySchema } from './schemas';

export type ApiErrorKind = 'http' | 'network' | 'timeout' | 'contract';

export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly code?: string,
    /** Field errors from a 422, keyed by request path. */
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }

  /** Only server, network and timeout failures are worth retrying. */
  get isRetryable(): boolean {
    if (this.kind === 'contract') return false;
    if (this.kind === 'http') {
      return this.status === undefined || this.status >= 500 || this.status === 429;
    }
    return true;
  }
}

const timeoutError = () => new ApiError('The request took too long. Please try again.', 'timeout');

function httpMessage(status: number): string {
  if (status === 404) return 'We couldn’t find what you were looking for.';
  if (status >= 500) return 'Something went wrong on our side. Please try again.';
  return 'We couldn’t complete that request. Please try again.';
}

export type QueryValue = string | number | boolean | null | undefined;

export function buildUrl(
  path: string,
  query: Record<string, QueryValue> = {},
  baseUrl = env.apiBaseUrl,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return `${baseUrl}${path}${search ? `?${search}` : ''}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT';
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Sends a JSON request and validates the response against `schema`. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  { method = 'GET', query, body, signal, timeoutMs = env.requestTimeoutMs }: RequestOptions = {},
): Promise<z.infer<S>> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: combined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw timeoutError();
    throw new ApiError(
      'We couldn’t reach the server. Check your connection and try again.',
      'network',
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  // A cancel or timeout can also land while the body is still downloading.
  if (signal?.aborted) throw signal.reason;
  if (timeout.aborted) throw timeoutError();

  if (!response.ok) {
    const parsedError = apiErrorBodySchema.safeParse(payload);
    const detail = parsedError.success ? parsedError.data.error : undefined;
    throw new ApiError(
      detail?.message ?? httpMessage(response.status),
      'http',
      response.status,
      detail?.code,
      detail?.fields,
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.error(`Contract violation for ${method} ${path}`, parsed.error.issues);
    throw new ApiError(
      'We received an unexpected response. Please try again later.',
      'contract',
      response.status,
    );
  }
  return parsed.data;
}

export function apiGet<S extends z.ZodType>(
  path: string,
  schema: S,
  options: Omit<RequestOptions, 'method' | 'body'> = {},
): Promise<z.infer<S>> {
  return apiRequest(path, schema, options);
}

/** A message for any thrown value that is safe to show a customer. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong on our side. Please try again.';
}
