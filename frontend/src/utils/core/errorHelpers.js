const HUMAN_ERROR_MAP = {
  'Network Error': 'Check your internet connection.',
  timeout: 'Request timed out. Please retry.',
  ECONNREFUSED: 'Server unreachable. Try again shortly.',
  401: 'Session expired. Please sign in.',
  403: 'Access denied.',
  404: 'Item not found.',
  429: 'Please wait a moment.',
  500: 'Server busy. Try again shortly.',
  502: 'Server waking up. Try again shortly.',
  503: 'Server busy. Try again shortly.',
  504: 'Server timed out. Please retry.',
  'duplicate key': 'Already in use.',
  'invalid token': 'Session expired. Please sign in.',
  'jwt expired': 'Session expired. Please sign in.',
};

/**
 * Extracts the most meaningful error message from any error object.
 * Priority order:
 *   1. Backend API response message (err.response.data.message)
 *   2. Normalized API error message (err.normalized.message)
 *   3. Native error message (err.message)
 *   4. Provided fallback string
 *
 * @param {unknown} err - The caught error object
 * @param {string} [fallback='Something went wrong. Please try again.'] - Fallback message
 * @returns {string} The best available human-readable error message
 */
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;

  // Function to check if a string contains technical jargon or code
  const isTechnical = (str) => {
    if (!str || typeof str !== 'string') return false;

    // Check for common technical indicators
    const technicalPatterns = [
      /<html/i,
      /<body/i,
      /<!DOCTYPE/i,
      /<script/i, // HTML content
      /Unexpected token/i,
      /JSON at position/i, // JSON parsing errors
      /ECONNREFUSED/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i, // Network errors
      /TypeError:/i,
      /ReferenceError:/i,
      /SyntaxError:/i, // JS errors
      /SQL syntax/i,
      /database/i,
      /MongoError/i,
      /Cast to ObjectId/i, // DB errors
      /stack trace/i,
      /at Array\./i,
      /at Object\./i, // Stack traces
      /failed to fetch/i, // Fetch generic error
      /Request failed with status code/i, // Axios generic error
      /E11000 duplicate key error/i, // MongoDB dup error
      /AxiosError/i,
      /Network Error/i,
    ];

    // If it's suspiciously long, it might be a stack trace or HTML dump
    if (str.length > 150) return true;

    return technicalPatterns.some((pattern) => pattern.test(str));
  };

  let candidate = null;

  // 1. Backend structured API error response
  const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
  if (serverMsg && typeof serverMsg === 'string') {
    candidate = serverMsg;
  }

  // 2. Normalized error from Axios interceptor
  if (!candidate && err?.normalized?.message && typeof err.normalized.message === 'string') {
    candidate = err.normalized.message;
  }

  // 3. Native JS error message
  if (!candidate && err?.message && typeof err.message === 'string') {
    candidate = err.message;
  }

  // Map candidate against human readable messages
  if (candidate) {
    const candidateLower = candidate.toLowerCase();
    for (const [key, value] of Object.entries(HUMAN_ERROR_MAP)) {
      if (candidateLower.includes(key.toLowerCase())) {
        return value;
      }
    }

    // Check status codes if present in candidate string
    const statusMatch = candidate.match(/status code (\d{3})/i);
    if (statusMatch && HUMAN_ERROR_MAP[statusMatch[1]]) {
      return HUMAN_ERROR_MAP[statusMatch[1]];
    }
  }

  // Verify candidate is not technical
  if (candidate && !isTechnical(candidate)) {
    return candidate;
  }

  return fallback;
};

import toast from 'react-hot-toast';

const recentToastCalls = new Map();

const isToastThrottled = (msg, id) => {
  if (id) return false;
  const key =
    typeof msg === 'string'
      ? msg.trim()
      : typeof msg === 'object' && msg?.props?.children
        ? String(msg.props.children).trim()
        : '';
  if (!key) return false;
  const now = Date.now();
  const lastTime = recentToastCalls.get(key);
  if (lastTime && now - lastTime < 2500) {
    return true; // Duplicate call suppressed
  }
  recentToastCalls.set(key, now);
  if (recentToastCalls.size > 50) {
    for (const [k, t] of recentToastCalls.entries()) {
      if (now - t > 10000) recentToastCalls.delete(k);
    }
  }
  return false;
};

export const patchToastError = () => {
  const originalError = toast.error;
  const originalSuccess = toast.success;

  toast.error = (msg, options = {}) => {
    let sanitizedMsg = msg;

    // If msg is an Error or AxiosError object
    if (typeof msg === 'object' && msg !== null && !msg.$$typeof) {
      sanitizedMsg = getErrorMessage(msg, 'An unexpected error occurred.');
    }
    // If it's a string, sanitize it using our logic
    else if (typeof msg === 'string') {
      sanitizedMsg = getErrorMessage({ message: msg }, 'An unexpected error occurred.');
    }

    if (isToastThrottled(sanitizedMsg, options?.id)) {
      return options?.id || '';
    }

    return originalError(sanitizedMsg, options);
  };

  toast.success = (msg, options = {}) => {
    if (isToastThrottled(msg, options?.id)) {
      return options?.id || '';
    }
    return originalSuccess(msg, options);
  };
};
