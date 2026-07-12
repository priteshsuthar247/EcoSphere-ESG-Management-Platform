// src/lib/logger.ts
// Centralised logger using console with structured output.
// In production, swap to winston or pino as needed.

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    const entry = formatLog('info', message, meta);
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(entry));
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    const entry = formatLog('warn', message, meta);
    if (process.env.NODE_ENV !== 'test') {
      console.warn(JSON.stringify(entry));
    }
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    const entry = formatLog('error', message, meta);
    console.error(JSON.stringify(entry));
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      const entry = formatLog('debug', message, meta);
      console.debug(JSON.stringify(entry));
    }
  },
};

export default logger;
