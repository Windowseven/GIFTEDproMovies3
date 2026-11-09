import { ApiError } from './types';

const API_BASE_URL = '/api/v1';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      let message = 'An unexpected error occurred';
      let errorName = response.statusText || 'Error';
      let retryAfter: number | undefined;

      const retryAfterHeader = response.headers.get('retry-after');
      if (retryAfterHeader) {
        const parsed = parseInt(retryAfterHeader, 10);
        if (!isNaN(parsed)) retryAfter = parsed;
      }

      if (typeof data === 'object' && data !== null) {
        const errRecord = data as Record<string, unknown>;
        const nestedError = errRecord.error;
        if (typeof nestedError === 'object' && nestedError !== null) {
          const nested = nestedError as Record<string, unknown>;
          if (typeof nested.message === 'string' && nested.message.length > 0) {
            message = nested.message;
          }
          if (typeof nested.code === 'string' && nested.code.length > 0) {
            errorName = nested.code;
          }
        } else if (typeof nestedError === 'string' && nestedError.length > 0) {
          errorName = nestedError;
        }

        if (typeof errRecord.message === 'string' && errRecord.message.length > 0) {
          message = errRecord.message;
        }
      } else if (typeof data === 'string' && data.length > 0) {
        message = data;
      }

      throw new ApiError(response.status, errorName, message, retryAfter);
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      'success' in data &&
      (data as Record<string, unknown>).success === true &&
      'data' in data
    ) {
      return (data as Record<string, unknown>).data as T;
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, 'NetworkError', message);
  }
}
