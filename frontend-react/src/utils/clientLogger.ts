type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

const CLIENT_LOG_ENDPOINT = '/api/client-log';
// Vite exposes env vars via import.meta.env and only passes through keys prefixed with VITE_
// Fail loudly if the env is missing to avoid silently masking misconfiguration.
const verboseEnabled = (import.meta.env.VITE_VERBOSE_LOGGING ?? 'true') !== 'false';

const consoleMap: Record<ClientLogLevel, (...args: unknown[]) => void> = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function sendToBackend(level: ClientLogLevel, message: string, context?: Record<string, unknown>) {
  if (!verboseEnabled) return;
  const payload = {
    level,
    message,
    context: {
      ...(context || {}),
      timestamp: new Date().toISOString(),
      source: 'frontend',
    },
  };
  const json = JSON.stringify(payload);
  try {
    if (navigator?.sendBeacon) {
      const blob = new Blob([json], { type: 'application/json' });
      navigator.sendBeacon(CLIENT_LOG_ENDPOINT, blob);
      return;
    }
    void fetch(CLIENT_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
      keepalive: true,
    });
  } catch (err) {
    console.debug('[BTR FE] failed to forward log', err);
  }
}

export function logClientEvent(level: ClientLogLevel, message: string, context?: Record<string, unknown>) {
  if (!verboseEnabled) return;
  const logFn = consoleMap[level] || console.info;
  logFn(`[BTR FE][${level}] ${message}`, context ?? '');
  sendToBackend(level, message, context);
}
