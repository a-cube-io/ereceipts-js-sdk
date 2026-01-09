import pc from 'picocolors';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogColors {
  prefix: (s: string) => string;
  message: (s: string) => string;
  data: (s: string) => string;
}

const levelColors: Record<LogLevel, LogColors> = {
  debug: {
    prefix: pc.gray,
    message: pc.gray,
    data: pc.dim,
  },
  info: {
    prefix: pc.cyan,
    message: pc.white,
    data: pc.dim,
  },
  warn: {
    prefix: pc.yellow,
    message: pc.yellow,
    data: pc.dim,
  },
  error: {
    prefix: pc.red,
    message: pc.red,
    data: pc.dim,
  },
};

const levelIcons: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️ ',
  warn: '⚠️ ',
  error: '❌',
};

/**
 * Format data for pretty display in logs
 */
function formatData(data: unknown, level: LogLevel): string {
  if (data === undefined || data === null) {
    return String(data);
  }

  // For primitive types, just return as string
  if (typeof data !== 'object') {
    return String(data);
  }

  // For Error objects, format nicely
  if (data instanceof Error) {
    return `${data.name}: ${data.message}${data.stack ? `\n${pc.dim(data.stack)}` : ''}`;
  }

  try {
    // Apply level-specific coloring
    const colors = levelColors[level];
    return colors.data(JSON.stringify(data, null, 2));
  } catch {
    // Fallback to JSON.stringify if pretty-format fails
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}

class Logger {
  private enabled = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  debug(prefix: string, message: string, data?: unknown): void {
    if (!this.enabled) return;
    this.log('debug', prefix, message, data);
  }

  info(prefix: string, message: string, data?: unknown): void {
    if (!this.enabled) return;
    this.log('info', prefix, message, data);
  }

  warn(prefix: string, message: string, data?: unknown): void {
    this.log('warn', prefix, message, data);
  }

  error(prefix: string, message: string, data?: unknown): void {
    this.log('error', prefix, message, data);
  }

  private log(level: LogLevel, prefix: string, message: string, data?: unknown): void {
    const colors = levelColors[level];
    const icon = levelIcons[level];
    const isoTime = new Date().toISOString().split('T')[1] ?? '';
    const timestamp = pc.dim(isoTime.slice(0, 12));
    const formattedPrefix = colors.prefix(`[${prefix}]`);
    const formattedMessage = colors.message(message);

    const consoleMethod =
      level === 'debug'
        ? console.debug
        : level === 'info'
          ? console.info
          : level === 'warn'
            ? console.warn
            : console.error;

    const header = `${timestamp} ${icon} ${formattedPrefix} ${formattedMessage}`;

    if (data !== undefined) {
      const formattedData = formatData(data, level);
      // Check if data is an object (multi-line) or primitive (single-line)
      const isMultiLine = typeof data === 'object' && data !== null;
      if (isMultiLine) {
        consoleMethod(`${header}\n${formattedData}`);
      } else {
        consoleMethod(`${header}`, formattedData);
      }
    } else {
      consoleMethod(header);
    }
  }
}

export const logger = new Logger();

export function createPrefixedLogger(prefix: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(prefix, message, data),
    info: (message: string, data?: unknown) => logger.info(prefix, message, data),
    warn: (message: string, data?: unknown) => logger.warn(prefix, message, data),
    error: (message: string, data?: unknown) => logger.error(prefix, message, data),
  };
}
