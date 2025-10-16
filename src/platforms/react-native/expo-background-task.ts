import { IBackgroundTaskAdapter } from "../../adapters";
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';


export class ExpoBackgroundTaskAdapter implements IBackgroundTaskAdapter {
  private backgroundTask: typeof BackgroundTask | null = null;
  private taskManager: typeof TaskManager | null = null;
  
  constructor() {
    this.init()
    .then(() => {
      console.log('[EXPO-BG-TASK] initialized');
    })
    .catch(err => {
      console.error('[EXPO-BG-TASK] initialization failed:', err);
    });
  }

  private async init() {
    try {
      // Try to require BackgroundTask - avoid dynamic import for Metro compatibility
      const BackgroundTaskModule = require('expo-background-task');
      this.backgroundTask = BackgroundTaskModule.default || BackgroundTaskModule;
      console.log('[EXPO-BG-TASK] initialized');

      const TaskManagerModule = require('expo-task-manager');
      this.taskManager = TaskManagerModule.default || TaskManagerModule;
      console.log('[EXPO-BG-TASK] initialized');
    } catch {
      // Fallback to legacy BackgroundTask if available
      try {
        const ReactNative = require('react-native');
        this.backgroundTask = ReactNative.BackgroundTask;
        console.log('[EXPO-BG-TASK] initialized');

        const TaskManagerModule = require('react-native-background-task');
        this.taskManager = TaskManagerModule.default || TaskManagerModule;
        console.log('[EXPO-BG-TASK] initialized');
      } catch {
        throw new Error('BackgroundTask not available. Please install expo-background-task');
      }
    }
  }
  
  
  async registerTask(taskName: string, task: () => Promise<void>, options?: { minimumInterval?: number }): Promise<void> {
    if (!this.taskManager) {
      await this.init();
    }

    if (!this.taskManager!.isTaskDefined(taskName)) {
    this.taskManager!.defineTask(taskName, async () => {
      try {
        await task();
        return this.backgroundTask!.BackgroundTaskResult.Success;
      } catch (error) {
        console.error('[EXPO-BG-TASK] Error:', error);
        return this.backgroundTask!.BackgroundTaskResult.Failed;
      }
    });
  }
    await this.backgroundTask!.registerTaskAsync(taskName, options || { minimumInterval: 900 }); // Default 15 min
  }

  async unregisterTask(taskName: string): Promise<void> {
    if (!this.backgroundTask) {
      await this.init();
    }
    await this.backgroundTask!.unregisterTaskAsync(taskName);
  }

  async getStatus(): Promise<{ available: boolean; status?: string }> {
    if (!this.backgroundTask) {
      await this.init();
    }
    const status = await this.backgroundTask!.getStatusAsync();
    return { available: status === this.backgroundTask!.BackgroundTaskStatus.Available, status: this.backgroundTask!.BackgroundTaskStatus[status] };
  }
}