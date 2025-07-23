// Cross-platform logging utility with different levels and debugging support

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

class Logger {
  private level: LogLevel = LogLevel.INFO;
  private enableConsoleOutput: boolean = true;
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private logHistory: LogEntry[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    // Set debug level in development
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      this.level = LogLevel.DEBUG;
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setConsoleOutput(enabled: boolean): void {
    this.enableConsoleOutput = enabled;
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;
    this.trimHistory();
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      source,
    };
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.enableConsoleOutput) return;

    const prefix = `[${entry.timestamp}] ${entry.source ? `[${entry.source}]` : ''}`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        console.log(message, entry.data || '');
        break;
    }
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    this.trimHistory();
  }

  private trimHistory(): void {
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        console.error('Logger listener error:', error);
      }
    });
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, data, source);
    
    this.logToConsole(entry);
    this.addToHistory(entry);
    this.notifyListeners(entry);
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  // API-specific logging methods
  apiRequest(url: string, method: string, data?: any): void {
    this.debug(`API Request: ${method.toUpperCase()} ${url}`, data, 'API');
  }

  apiResponse(url: string, status: number, data?: any): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.DEBUG;
    this.log(level, `API Response: ${status} ${url}`, data, 'API');
  }

  apiError(url: string, error: any): void {
    this.error(`API Error: ${url}`, error, 'API');
  }

  // Authentication logging
  authSuccess(method: string, userInfo?: any): void {
    this.info(`Authentication successful: ${method}`, userInfo, 'AUTH');
  }

  authFailure(method: string, error: any): void {
    this.error(`Authentication failed: ${method}`, error, 'AUTH');
  }

  // Storage logging
  storageSet(key: string, isSecure: boolean = false): void {
    this.debug(`Storage set: ${key} (secure: ${isSecure})`, undefined, 'STORAGE');
  }

  storageGet(key: string, found: boolean): void {
    this.debug(`Storage get: ${key} (found: ${found})`, undefined, 'STORAGE');
  }

  storageError(operation: string, key: string, error: any): void {
    this.error(`Storage ${operation} error: ${key}`, error, 'STORAGE');
  }

  // Network logging
  networkStateChange(isConnected: boolean, connectionType?: string): void {
    this.info(
      `Network state changed: ${isConnected ? 'connected' : 'disconnected'}`,
      { connectionType },
      'NETWORK'
    );
  }

  retryAttempt(attempt: number, maxAttempts: number, delay: number): void {
    this.warn(
      `Retry attempt ${attempt}/${maxAttempts} in ${delay}ms`,
      undefined,
      'RETRY'
    );
  }

  // Utility methods
  addListener(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  removeListener(listener: (entry: LogEntry) => void): void {
    this.listeners.delete(listener);
  }

  getHistory(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logHistory.filter(entry => entry.level === level);
    }
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  // Export logs (useful for debugging)
  exportLogs(): string {
    return this.logHistory
      .map(entry => {
        const levelName = LogLevel[entry.level];
        const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
        const sourceStr = entry.source ? ` [${entry.source}]` : '';
        return `${entry.timestamp} ${levelName}${sourceStr}: ${entry.message}${dataStr}`;
      })
      .join('\n');
  }

  // Create a scoped logger for specific components
  createScope(source: string): ScopedLogger {
    return new ScopedLogger(this, source);
  }
}

class ScopedLogger {
  constructor(private logger: Logger, private source: string) {}

  error(message: string, data?: any): void {
    this.logger.error(message, data, this.source);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(message, data, this.source);
  }

  info(message: string, data?: any): void {
    this.logger.info(message, data, this.source);
  }

  debug(message: string, data?: any): void {
    this.logger.debug(message, data, this.source);
  }

  // API-specific logging methods
  apiRequest(url: string, method: string, data?: any): void {
    this.logger.apiRequest(url, method, data);
  }

  apiResponse(url: string, status: number, data?: any): void {
    this.logger.apiResponse(url, status, data);
  }

  apiError(url: string, error: any): void {
    this.logger.apiError(url, error);
  }

  // Authentication logging
  authSuccess(method: string, userInfo?: any): void {
    this.logger.authSuccess(method, userInfo);
  }

  authFailure(method: string, error: any): void {
    this.logger.authFailure(method, error);
  }

  // Storage logging
  storageSet(key: string, isSecure: boolean = false): void {
    this.logger.storageSet(key, isSecure);
  }

  storageGet(key: string, found: boolean): void {
    this.logger.storageGet(key, found);
  }

  storageError(operation: string, key: string, error: any): void {
    this.logger.storageError(operation, key, error);
  }

  // Network logging
  networkStateChange(isConnected: boolean, connectionType?: string): void {
    this.logger.networkStateChange(isConnected, connectionType);
  }

  retryAttempt(attempt: number, maxAttempts: number, delay: number): void {
    this.logger.retryAttempt(attempt, maxAttempts, delay);
  }
}

// Global logger instance
const logger = new Logger();

// Export logger and convenience functions
export default logger;
export { Logger, ScopedLogger };

// Convenience exports for common logging operations
export const logError = (message: string, data?: any, source?: string) => 
  logger.error(message, data, source);
export const logWarn = (message: string, data?: any, source?: string) => 
  logger.warn(message, data, source);
export const logInfo = (message: string, data?: any, source?: string) => 
  logger.info(message, data, source);
export const logDebug = (message: string, data?: any, source?: string) => 
  logger.debug(message, data, source);

// Create scoped loggers for different parts of the SDK
export const apiLogger = logger.createScope('API');
export const authLogger = logger.createScope('AUTH');
export const storageLogger = logger.createScope('STORAGE');
export const networkLogger = logger.createScope('NETWORK');
export const uiLogger = logger.createScope('UI');