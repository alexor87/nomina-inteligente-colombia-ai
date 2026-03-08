/**
 * Logger utility - only emits in development mode
 * Replaces direct console.log calls to prevent sensitive data exposure in production
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors always log (needed for debugging in production)
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
  /** Group logs (dev only) */
  group: (label: string) => {
    if (isDev) console.group(label);
  },
  groupEnd: () => {
    if (isDev) console.groupEnd();
  },
};
