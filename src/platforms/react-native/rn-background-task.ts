import BackgroundTask from 'react-native-background-task';
import {IBackgroundTaskAdapter} from "../../adapters";

export class RNBackgroundTaskAdapter implements IBackgroundTaskAdapter {
  private backgroundTask: typeof BackgroundTask | null = null;

  constructor() {
    this.init()
    .then(() => {
      console.log('[RN-BG-TASK] initialized');
    })
    .catch(err => {
      console.error('[RN-BG-TASK] initialization failed:', err);
    });
  }
  
  private async init() {
    try {
      // Try to require BackgroundTask - avoid dynamic import for Metro compatibility
      const BackgroundTaskModule = require('react-native-background-task');
      this.backgroundTask = BackgroundTaskModule.default || BackgroundTaskModule;
      console.log('[RN-BG-TASK] initialized');
    } catch {
      // Fallback to legacy BackgroundTask if available
      try {
        const ReactNative = require('react-native');
        this.backgroundTask = ReactNative.BackgroundTask;
        console.log('[RN-BG-TASK] initialized');
      } catch {
        throw new Error('BackgroundTask not available. Please install react-native-background-task');
      }
    }
  }
  
  
  
  async registerTask(taskName: string, task: () => Promise<void>, options?: { period?: number }): Promise<void> {
    if (!this.backgroundTask) {
      await this.init();
    }
    this.backgroundTask!.define(taskName, async () => {
      try {
        await task();
        this.backgroundTask!.finish();
      } catch (error) {
        console.error('[RN-BG-TASK] Error:', error);
        this.backgroundTask!.finish();
      }
    });
    this.backgroundTask!.schedule(options || { period: 900 });
  }
  
  async unregisterTask(_taskName: string): Promise<void> {
    if (!this.backgroundTask) {
      await this.init();
    }
    this.backgroundTask!.cancel();
  }
}