import logger, { Logger, ScopedLogger, LogLevel, type LogEntry } from '../../utils/logger';

// Mock console methods to avoid test output noise
const originalConsole = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  log: console.log,
  debug: console.debug,
};

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    // Create a fresh logger instance for each test
    testLogger = new Logger();
    
    // Set log level to INFO to ensure consistent behavior
    testLogger.setLevel(LogLevel.INFO);
    
    // Mock console methods
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
    console.log = originalConsole.log;
  });

  describe('Log Levels', () => {
    it('should log error messages', () => {
      testLogger.error('Test error message', { error: 'details' }, 'TEST');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] Test error message'),
        { error: 'details' }
      );
    });

    it('should log warning messages', () => {
      testLogger.warn('Test warning message', { warning: 'details' }, 'TEST');

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] Test warning message'),
        { warning: 'details' }
      );
    });

    it('should log info messages', () => {
      testLogger.info('Test info message', { info: 'details' }, 'TEST');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] Test info message'),
        { info: 'details' }
      );
    });

    it('should log debug messages when debug level is set', () => {
      testLogger.setLevel(LogLevel.DEBUG);
      // eslint-disable-next-line testing-library/no-debugging-utils
      testLogger.debug('Test debug message', { debug: 'details' }, 'TEST');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[TEST] Test debug message'),
        { debug: 'details' }
      );
    });

    it('should respect log level filtering', () => {
      testLogger.setLevel(LogLevel.WARN);

      // eslint-disable-next-line testing-library/no-debugging-utils
      testLogger.debug('Debug message'); // Should not log
      testLogger.info('Info message');   // Should not log
      testLogger.warn('Warning message'); // Should log
      testLogger.error('Error message'); // Should log

      expect(console.log).not.toHaveBeenCalled(); // debug
      expect(console.info).not.toHaveBeenCalled(); // info
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning message'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error message'),
        ''
      );
    });

    it('should handle messages without data', () => {
      testLogger.info('Simple message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Simple message'),
        ''
      );
    });

    it('should handle messages without source', () => {
      testLogger.info('Message without source');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message without source'),
        ''
      );
    });
  });

  describe('Console Output Control', () => {
    it('should disable console output when setConsoleOutput(false)', () => {
      testLogger.setConsoleOutput(false);
      testLogger.info('This should not appear in console');

      expect(console.info).not.toHaveBeenCalled();
    });

    it('should re-enable console output when setConsoleOutput(true)', () => {
      testLogger.setConsoleOutput(false);
      testLogger.setConsoleOutput(true);
      testLogger.info('This should appear in console');

      expect(console.info).toHaveBeenCalled();
    });
  });

  describe('Log History', () => {
    it('should store logs in history', () => {
      testLogger.info('Test message', { data: 'test' }, 'TEST');

      const history = testLogger.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Test message');
      expect(history[0].data).toEqual({ data: 'test' });
      expect(history[0].source).toBe('TEST');
      expect(history[0].level).toBe(LogLevel.INFO);
    });

    it('should filter history by log level', () => {
      testLogger.setLevel(LogLevel.DEBUG);
      // eslint-disable-next-line testing-library/no-debugging-utils
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');

      const errorHistory = testLogger.getHistory(LogLevel.ERROR);
      expect(errorHistory).toHaveLength(1);
      expect(errorHistory[0].message).toBe('Error message');

      const infoHistory = testLogger.getHistory(LogLevel.INFO);
      expect(infoHistory).toHaveLength(1);
      expect(infoHistory[0].message).toBe('Info message');
    });

    it('should limit history size', () => {
      testLogger.setMaxHistorySize(3);

      testLogger.info('Message 1');
      testLogger.info('Message 2');
      testLogger.info('Message 3');
      testLogger.info('Message 4'); // Should remove Message 1

      const history = testLogger.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].message).toBe('Message 2');
      expect(history[1].message).toBe('Message 3');
      expect(history[2].message).toBe('Message 4');
    });

    it('should clear history', () => {
      testLogger.info('Test message');
      expect(testLogger.getHistory()).toHaveLength(1);

      testLogger.clearHistory();
      expect(testLogger.getHistory()).toHaveLength(0);
    });
  });

  describe('Listeners', () => {
    it('should notify listeners when logs are created', () => {
      const listener = jest.fn();
      const unsubscribe = testLogger.addListener(listener);

      testLogger.info('Test message', { data: 'test' }, 'TEST');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test message',
          data: { data: 'test' },
          source: 'TEST',
          level: LogLevel.INFO,
        })
      );

      unsubscribe();
    });

    it('should allow removing listeners', () => {
      const listener = jest.fn();
      testLogger.addListener(listener);
      testLogger.removeListener(listener);

      testLogger.info('Test message');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      testLogger.addListener(errorListener);
      testLogger.addListener(normalListener);

      // Should not throw and should still call other listeners
      expect(() => {
        testLogger.info('Test message');
      }).not.toThrow();

      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('API-specific Logging', () => {
    it('should log API requests', () => {
      testLogger.setLevel(LogLevel.DEBUG); // API requests use debug level
      testLogger.apiRequest('/api/test', 'POST', { data: 'test' });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Request: POST /api/test'),
        { data: 'test' }
      );
    });

    it('should log API responses with appropriate levels', () => {
      testLogger.setLevel(LogLevel.DEBUG); // 200 responses use debug level
      testLogger.apiResponse('/api/test', 200, { success: true });
      testLogger.apiResponse('/api/test', 404, { error: 'Not found' });
      testLogger.apiResponse('/api/test', 500, { error: 'Server error' });

      // 200 should be debug level
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Response: 200 /api/test'),
        { success: true }
      );

      // 404 and 500 should be error level
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Response: 404 /api/test'),
        { error: 'Not found' }
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Response: 500 /api/test'),
        { error: 'Server error' }
      );
    });

    it('should log API errors', () => {
      const error = new Error('Network error');
      testLogger.apiError('/api/test', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Error: /api/test'),
        error
      );
    });
  });

  describe('Authentication Logging', () => {
    it('should log authentication success', () => {
      testLogger.authSuccess('login', { userId: '123' });

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] Authentication successful: login'),
        { userId: '123' }
      );
    });

    it('should log authentication failure', () => {
      const error = new Error('Invalid credentials');
      testLogger.authFailure('login', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] Authentication failed: login'),
        error
      );
    });
  });

  describe('Storage Logging', () => {
    it('should log storage operations', () => {
      testLogger.setLevel(LogLevel.DEBUG); // Storage operations use debug level
      testLogger.storageSet('test-key', true);
      testLogger.storageGet('test-key', true);
      testLogger.storageError('get', 'test-key', new Error('Storage error'));

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[STORAGE] Storage set: test-key (secure: true)'),
        ''
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[STORAGE] Storage get: test-key (found: true)'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[STORAGE] Storage get error: test-key'),
        expect.any(Error)
      );
    });
  });

  describe('Network Logging', () => {
    it('should log network state changes', () => {
      testLogger.networkStateChange(true, 'wifi');
      testLogger.networkStateChange(false);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[NETWORK] Network state changed: connected'),
        { connectionType: 'wifi' }
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[NETWORK] Network state changed: disconnected'),
        { connectionType: undefined }
      );
    });

    it('should log retry attempts', () => {
      testLogger.retryAttempt(1, 3, 1000);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[RETRY] Retry attempt 1/3 in 1000ms'),
        ''
      );
    });
  });

  describe('Export Logs', () => {
    it('should export logs in readable format', () => {
      testLogger.info('Test message', { data: 'test' }, 'TEST');
      testLogger.error('Error message', { error: 'details' }, 'ERROR');

      const exported = testLogger.exportLogs();

      expect(exported).toContain('INFO [TEST]: Test message {"data":"test"}');
      expect(exported).toContain('ERROR [ERROR]: Error message {"error":"details"}');
    });

    it('should handle logs without data in export', () => {
      testLogger.info('Simple message');

      const exported = testLogger.exportLogs();

      expect(exported).toContain('INFO: Simple message');
      expect(exported).not.toContain('undefined');
    });
  });

  describe('Scoped Logger', () => {
    it('should create scoped logger with source', () => {
      const scopedLogger = testLogger.createScope('CUSTOM_SCOPE');
      scopedLogger.info('Scoped message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[CUSTOM_SCOPE] Scoped message'),
        ''
      );
    });

    it('should support all logging methods in scoped logger', () => {
      const scopedLogger = testLogger.createScope('SCOPE');

      scopedLogger.error('Error message');
      scopedLogger.warn('Warning message');
      scopedLogger.info('Info message');
      testLogger.setLevel(LogLevel.DEBUG); // Enable debug for scoped logger
      // eslint-disable-next-line testing-library/no-debugging-utils
      scopedLogger.debug('Debug message');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[SCOPE] Error message'),
        ''
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SCOPE] Warning message'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[SCOPE] Info message'),
        ''
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[SCOPE] Debug message'),
        ''
      );
    });

    it('should support API-specific methods in scoped logger', () => {
      const scopedLogger = testLogger.createScope('SCOPE');
      testLogger.setLevel(LogLevel.DEBUG); // Enable debug for API methods

      scopedLogger.apiRequest('/api/test', 'GET');
      scopedLogger.apiResponse('/api/test', 200);
      scopedLogger.apiError('/api/test', new Error('Error'));

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Request: GET /api/test'),
        ''
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Response: 200 /api/test'),
        ''
      );
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] API Error: /api/test'),
        expect.any(Error)
      );
    });
  });

  describe('Global Logger Instance', () => {
    it('should provide global logger instance', () => {
      logger.setLevel(LogLevel.INFO); // Ensure consistent level
      logger.info('Global message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Global message'),
        ''
      );
    });

    it('should provide scoped loggers', () => {
      const { apiLogger, authLogger, storageLogger, networkLogger, uiLogger } = require('../../utils/logger');

      apiLogger.info('API message');
      authLogger.info('Auth message');
      storageLogger.info('Storage message');
      networkLogger.info('Network message');
      uiLogger.info('UI message');

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[API] API message'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH] Auth message'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[STORAGE] Storage message'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[NETWORK] Network message'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('[UI] UI message'),
        ''
      );
    });
  });

  describe('Convenience Functions', () => {
    it('should provide convenience logging functions', () => {
      const { logError, logWarn, logInfo, logDebug } = require('../../utils/logger');

      logError('Error via convenience function');
      logWarn('Warning via convenience function');
      logInfo('Info via convenience function');
      logger.setLevel(LogLevel.DEBUG); // Enable debug for convenience function
      logDebug('Debug via convenience function');

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error via convenience function'),
        ''
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Warning via convenience function'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Info via convenience function'),
        ''
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Debug via convenience function'),
        ''
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined data gracefully', () => {
      testLogger.info('Message with null data', null);
      testLogger.info('Message with undefined data', undefined);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message with null data'),
        ''
      );
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message with undefined data'),
        ''
      );
    });

    it('should handle circular references in data', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      testLogger.info('Message with circular data', circularObj);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('Message with circular data'),
        circularObj
      );
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      testLogger.info(longMessage);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(longMessage),
        ''
      );
    });

    it('should handle special characters in messages', () => {
      const specialMessage = 'Message with special chars: ñáéíóú-中文-日本語';
      testLogger.info(specialMessage);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining(specialMessage),
        ''
      );
    });
  });
}); 