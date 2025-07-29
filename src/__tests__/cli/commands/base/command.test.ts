/**
 * Base Command Tests
 * Tests for base command functionality
 */

import { BaseCommand } from '../../../../cli/commands/base/command.js';
import type { BaseCommandOptions } from '../../../../cli/types.js';

// Mock process.exit to prevent tests from actually exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

// Mock the SDK cleanup
jest.mock('../../../../cli/utils/sdk.js', () => ({
  cleanupSDK: jest.fn().mockResolvedValue(undefined),
}));

// Create a test command class
class TestCommand extends BaseCommand {
  protected commandName = 'test';
  public executeCommandCalled = false;
  public shouldThrow = false;

  protected async executeCommand(_options: BaseCommandOptions): Promise<void> {
    this.executeCommandCalled = true;
    if (this.shouldThrow) {
      throw new Error('Test error');
    }
  }
}

describe('BaseCommand', () => {
  let testCommand: TestCommand;

  beforeEach(() => {
    testCommand = new TestCommand();
  });

  afterEach(() => {
    mockExit.mockClear();
  });

  describe('run', () => {
    it('should execute command successfully', async () => {
      const options: BaseCommandOptions = {};
      
      await testCommand.run(options);
      
      expect(testCommand.executeCommandCalled).toBe(true);
    });

    it('should handle errors and re-throw them', async () => {
      const options: BaseCommandOptions = {};
      testCommand.shouldThrow = true;
      
      await expect(testCommand.run(options)).rejects.toThrow('Test error');
      expect(testCommand.executeCommandCalled).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute command and exit with success', async () => {
      const options: BaseCommandOptions = {};
      
      await expect(testCommand.execute(options)).rejects.toThrow('process.exit called');
      expect(testCommand.executeCommandCalled).toBe(true);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should handle errors and exit with error code', async () => {
      const options: BaseCommandOptions = {};
      testCommand.shouldThrow = true;
      
      await expect(testCommand.execute(options)).rejects.toThrow('process.exit called');
      expect(testCommand.executeCommandCalled).toBe(true);
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('validateOptions', () => {
    it('should have default validation that does nothing', () => {
      const options: BaseCommandOptions = {};
      
      expect(() => {
        (testCommand as any).validateOptions(options);
      }).not.toThrow();
    });
  });
});