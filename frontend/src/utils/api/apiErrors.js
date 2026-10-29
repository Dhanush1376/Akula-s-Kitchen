import axios from 'axios';

/**
 * Normalizes Axios and network errors into a stable shape for UI and logging.
 */
export const normalizeApiError = (error) => {
  if (!error) {
    return {
      code: 'UNKNOWN',
      status: 0,
      message: 'An unexpected error occurred.',
      isNetwork: true,
      isTimeout: false,
      isRetryable: true,
      raw: null,
    };
  }

  if (error.code === 'ERR_OFFLINE' || error.code === 'ERR_OFFLINE_QUEUED') {
    return {
      code: error.code,
      status: 0,
      message: error.message || 'You appear to be offline.',
      isNetwork: true,
      isTimeout: false,
      isRetryable: true,
      raw: error,
    };
  }

  if (error.code === 'ERR_NO_SESSION') {
    return {
      code: 'NO_SESSION',
      status: 401,
      message: 'Please sign in to continue.',
      isNetwork: false,
      isTimeout: false,
      isRetryable: false,
      raw: error,
    };
  }

  const isTimeout =
    error.code === 'ECONNABORTED' ||
    error.code === 'ETIMEDOUT' ||
    /timeout/i.test(error.message || '');

  const status = error.response?.status || 0;
  const serverMessage =
    error.response?.data?.message || error.response?.data?.error || error.message;

  const retryableStatuses = new Set([0, 408, 429, 500, 502, 503, 504]);
  const isRetryable = retryableStatuses.has(status) || isTimeout || !error.response;

  let message = serverMessage || 'Something went wrong. Please try again.';
  if (isTimeout) {
    message = 'Request timed out. Please retry.';
  } else if (!error.response) {
    message = 'Cannot connect. Check your internet.';
  } else if (status === 401) {
    message = serverMessage || 'Session expired. Please sign in.';
  } else if (status === 403) {
    message = serverMessage || 'Access denied.';
  } else if (status === 404) {
    message = serverMessage || 'Item not found.';
  } else if (status === 429) {
    message = serverMessage || 'Too many attempts. Please wait.';
  } else if (status === 502) {
    const isGenericGateway =
      !serverMessage ||
      /bad gateway|status code 502/i.test(serverMessage) ||
      typeof error.response?.data === 'string';
    message = isGenericGateway ? 'Server waking up. Try again shortly.' : serverMessage;
  } else if (status === 503) {
    message = serverMessage || 'Server busy. Please try again shortly.';
  }

  return {
    code: error.code || `HTTP_${status || 'NETWORK'}`,
    status,
    message,
    isNetwork: !error.response,
    isTimeout,
    isRetryable,
    raw: error,
  };
};

export const isAxiosError = (error) => axios.isAxiosError(error);
