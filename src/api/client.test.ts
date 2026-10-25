import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '@/test/server';
import { ApiError, apiGet, apiRequest, buildUrl, describeError } from './client';

describe('buildUrl', () => {
  it('drops empty values and encodes the rest', () => {
    expect(
      buildUrl('/x', { a: 'b c', empty: '', none: undefined, nil: null, n: 0 }, 'https://api.test'),
    ).toBe('https://api.test/x?a=b+c&n=0');
  });

  it('leaves the path alone when there is no query', () => {
    expect(buildUrl('/x', {}, '')).toBe('/x');
  });
});

describe('apiRequest', () => {
  it('sends JSON and returns the validated response', async () => {
    server.use(
      http.post('*/echo', async ({ request }) =>
        HttpResponse.json({
          received: (await request.json()) as unknown,
          type: request.headers.get('content-type'),
        }),
      ),
    );
    const result = await apiRequest(
      '/echo',
      z.object({ received: z.unknown(), type: z.string() }),
      { method: 'POST', body: { a: 1 } },
    );
    expect(result).toEqual({ received: { a: 1 }, type: 'application/json' });
  });

  it('keeps field errors from a 422', async () => {
    server.use(
      http.post('*/validate', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Check your details.',
              fields: { 'personalInfo.age': 'Too young' },
            },
          },
          { status: 422 },
        ),
      ),
    );
    const error = await apiRequest('/validate', z.object({}), { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Check your details.',
      fields: { 'personalInfo.age': 'Too young' },
      isRetryable: false,
    });
  });
});

describe('apiGet', () => {
  it('retries server errors and explains them without a status code', async () => {
    server.use(http.get('*/boom', () => new HttpResponse('Bad gateway', { status: 503 })));
    const error = await apiGet('/boom', z.object({})).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'http', status: 503, isRetryable: true });
    expect(describeError(error)).toBe('Something went wrong on our side. Please try again.');
  });

  it('does not retry a missing resource', async () => {
    server.use(http.get('*/missing', () => new HttpResponse(null, { status: 404 })));
    const error = await apiGet('/missing', z.object({})).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'http', status: 404, isRetryable: false });
    expect(describeError(error)).toBe('We couldn’t find what you were looking for.');
  });

  it('rejects responses that break the contract', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.get('*/drift', () => HttpResponse.json({ total: 'lots' })));
    const error = await apiGet('/drift', z.object({ total: z.number() })).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'contract', isRetryable: false });
  });

  it('reports network failures in plain language', async () => {
    server.use(http.get('*/offline', () => HttpResponse.error()));
    const error = await apiGet('/offline', z.object({})).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'network', isRetryable: true });
    expect(describeError(error)).toMatch(/couldn’t reach the server/);
    expect(describeError(new Error('x'))).toMatch(/Something went wrong/);
  });
});
