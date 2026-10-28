import { describe, it, expect, vi } from 'vitest';
import { createResponseInterceptor } from '../interceptors/responseInterceptor';
import { createRequestInterceptor } from '../interceptors/requestInterceptor';

describe('API Interceptors Resilience', () => {
  it('responseInterceptor handles error without throwing ReferenceError for status', async () => {
    const api = vi.fn();
    const [_, errorHandler] = createResponseInterceptor({
      api,
      dispatchUnauthorized: vi.fn(),
      refreshAccessToken: vi.fn(),
      ensureCsrfToken: vi.fn(),
      hasLocalAuthMarker: () => false,
      getAccessToken: () => null,
      setCsrfTokenState: vi.fn(),
    });

    const mockError = {
      config: { url: '/api/v1/auth/request-otp', method: 'post' },
      response: {
        status: 400,
        data: {
          success: false,
          message:
            'Mobile phone login is currently disabled by store settings. Please log in using your email address.',
        },
      },
    };

    await expect(errorHandler(mockError)).rejects.toMatchObject({
      response: {
        status: 400,
        data: {
          message: expect.stringContaining('Mobile phone login is currently disabled'),
        },
      },
    });
  });

  it('requestInterceptor classifies /auth/request-otp as auth lifecycle request', async () => {
    const interceptor = createRequestInterceptor({
      getAccessToken: () => null,
      hasLocalAuthMarker: () => false,
      refreshAccessToken: vi.fn(),
      ensureCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
      getRefreshPromise: () => null,
    });

    const config = {
      url: '/auth/request-otp',
      method: 'post',
      headers: {},
    };

    const result = await interceptor(config);
    expect(result.headers['X-CSRF-Token']).toBe('mock-csrf-token');
    // Does not reject for unauthenticated protected route
    expect(result.url).toBe('/auth/request-otp');
  });
});
