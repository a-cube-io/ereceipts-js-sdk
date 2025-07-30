/**
 * React Native Background Processor
 * Handles background tasks, sync operations, and app lifecycle management
 * with intelligent scheduling and resource management
 *
 * Features:
 * - Background task scheduling and execution
 * - App state-aware processing
 * - Battery and performance optimization
 * - Push notification triggers
 * - Sync queue management
 * - Resource usage monitoring
 */

import { EventEmitter } from 'eventemitter3';

// Platform detection
const isReactNative = typeof navigator !== 'undefined' &&
  ((navigator as any).product === 'ReactNative' || (global as any).__REACT_NATIVE__);

/**
 * Background task types
 */
export type BackgroundTaskType =
  | 'sync'
  | 'upload'
  | 'cleanup'
  | 'analytics'
  | 'cache_warmup'
  | 'notification'
  | 'custom';

/**
 * Task priority levels
 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Background task definition
 */
export interface BackgroundTask {
  id: string;
  type: BackgroundTaskType;
  priority: TaskPriority;
  data: any;
  executionTime?: number; // Specific time to execute
  delay?: number; // Delay from now in ms
  interval?: number; // For recurring tasks
  maxRetries?: number;
  retryCount?: number;
  createdAt: number;
  maxExecutionTime?: number; // Max time allowed for execution
  requiredNetworkType?: 'any' | 'wifi' | 'cellular';
  requiresCharging?: boolean;
  requiresDeviceIdle?: boolean;
}

/**
 * Task execution result
 */
export interface TaskResult {
  success: boolean;
  data?: any;
  error?: Error;
  executionTime: number;
  retryAfter?: number; // Suggest retry delay in ms
}

/**
 * App state types
 */
export type AppState = 'active' | 'background' | 'inactive';

/**
 * Battery state
 */
export interface BatteryState {
  level: number; // 0-1
  isCharging: boolean;
  isLowPowerMode?: boolean;
}

/**
 * Background processor configuration
 */
export interface BackgroundProcessorConfig {
  /** Maximum concurrent background tasks */
  maxConcurrentTasks?: number;

  /** Default task timeout in ms */
  defaultTaskTimeout?: number;

  /** Enable battery optimization */
  enableBatteryOptimization?: boolean;

  /** Minimum battery level for non-critical tasks */
  minBatteryLevel?: number;

  /** Enable app state management */
  enableAppStateManagement?: boolean;

  /** Maximum background execution time in ms */
  maxBackgroundTime?: number;

  /** Enable task persistence */
  enableTaskPersistence?: boolean;

  /** Storage key for task persistence */
  persistenceKey?: string;

  /** Enable resource monitoring */
  enableResourceMonitoring?: boolean;

  /** CPU usage threshold for throttling */
  cpuThrottleThreshold?: number;

  /** Memory usage threshold for throttling */
  memoryThrottleThreshold?: number;
}

/**
 * Background processor events
 */
interface BackgroundProcessorEvents {
  'task:scheduled': { task: BackgroundTask };
  'task:started': { task: BackgroundTask };
  'task:completed': { task: BackgroundTask; result: TaskResult };
  'task:failed': { task: BackgroundTask; error: Error };
  'task:retry': { task: BackgroundTask; attempt: number };
  'queue:empty': {};
  'queue:full': { queueSize: number };
  'app:background': { remainingTime?: number };
  'app:foreground': {};
  'battery:low': { level: number };
  'battery:charging': { isCharging: boolean };
  'resource:throttle': { reason: 'cpu' | 'memory' | 'battery' };
  'resource:resume': { reason: string };
}

/**
 * Task executor function type
 */
export type TaskExecutor = (task: BackgroundTask, signal: AbortSignal) => Promise<TaskResult>;

const DEFAULT_CONFIG: Required<BackgroundProcessorConfig> = {
  maxConcurrentTasks: 3,
  defaultTaskTimeout: 30000, // 30 seconds
  enableBatteryOptimization: true,
  minBatteryLevel: 0.15, // 15%
  enableAppStateManagement: true,
  maxBackgroundTime: 30000, // 30 seconds (iOS limit)
  enableTaskPersistence: true,
  persistenceKey: 'acube_background_tasks',
  enableResourceMonitoring: true,
  cpuThrottleThreshold: 80, // 80%
  memoryThrottleThreshold: 80, // 80%
};

/**
 * React Native Background Processor
 */
export class BackgroundProcessor extends EventEmitter<BackgroundProcessorEvents> {
  private config: Required<BackgroundProcessorConfig>;

  private taskQueue: BackgroundTask[] = [];

  private activeTasks = new Map<string, { task: BackgroundTask; controller: AbortController }>();

  private taskExecutors = new Map<BackgroundTaskType, TaskExecutor>();

  private isInitialized = false;

  private isPaused = false;

  // React Native modules
  private AppState: any;

  private BackgroundTask: any;

  private AsyncStorage: any;

  // State tracking
  private currentAppState: AppState = 'active';

  private batteryState: BatteryState = { level: 1, isCharging: false };

  private backgroundTaskId: number | undefined;

  private resourceMonitorTimer?: NodeJS.Timeout;

  // Performance tracking
  private executionStats = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
    totalExecutionTime: 0,
  };

  constructor(config: BackgroundProcessorConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized || !isReactNative) {return;}

    try {
      // Import React Native modules
      const RNModules = await import('react-native');
      this.AppState = RNModules.AppState;
      // BackgroundTask is not available in React Native
      // this.BackgroundTask = RNModules.BackgroundTask;
      // PushNotificationIOS deprecated
      // this._PushNotificationIOS = RNModules.PushNotificationIOS;

      const AsyncStorageModule = await import('@react-native-async-storage/async-storage');
      this.AsyncStorage = AsyncStorageModule.default;

      // Setup listeners
      if (this.config.enableAppStateManagement) {
        this.setupAppStateListener();
      }

      if (this.config.enableBatteryOptimization) {
        this.setupBatteryMonitoring();
      }

      if (this.config.enableResourceMonitoring) {
        this.startResourceMonitoring();
      }

      // Load persisted tasks
      if (this.config.enableTaskPersistence) {
        await this.loadPersistedTasks();
      }

      // Register default task executors
      this.registerDefaultExecutors();

      this.isInitialized = true;
      console.log('BackgroundProcessor initialized');
    } catch (error) {
      console.warn('Failed to initialize BackgroundProcessor:', error);
    }
  }

  private setupAppStateListener(): void {
    if (!this.AppState) {return;}

    this.AppState.addEventListener('change', (nextAppState: AppState) => {
      const previousAppState = this.currentAppState;
      this.currentAppState = nextAppState;

      if (previousAppState === 'active' && nextAppState === 'background') {
        this.handleAppBackground();
      } else if (previousAppState === 'background' && nextAppState === 'active') {
        this.handleAppForeground();
      }
    });
  }

  private async setupBatteryMonitoring(): Promise<void> {
    try {
      // Try to import battery monitoring
      const DeviceInfo = await import('react-native-device-info');

      // Initial battery state
      const batteryLevel = await DeviceInfo.default.getBatteryLevel();
      const isCharging = (await DeviceInfo.default.getPowerState()).batteryState === 'charging';
      const isPowerSaveMode = (await DeviceInfo.default.getPowerState()).lowPowerMode;

      this.batteryState = {
        level: batteryLevel,
        isCharging,
        isLowPowerMode: !!isPowerSaveMode,
      };

      // Monitor battery changes
      setInterval(async () => {
        const newLevel = await DeviceInfo.default.getBatteryLevel();
        const newCharging = (await DeviceInfo.default.getPowerState()).batteryState === 'charging';
        const newPowerSave = (await DeviceInfo.default.getPowerState()).lowPowerMode;

        const previousCharging = this.batteryState.isCharging;
        const previousLevel = this.batteryState.level;

        this.batteryState = {
          level: newLevel,
          isCharging: newCharging,
          isLowPowerMode: !!newPowerSave,
        };

        // Emit events
        if (newCharging !== previousCharging) {
          this.emit('battery:charging', { isCharging: newCharging });
        }

        if (newLevel < this.config.minBatteryLevel && previousLevel >= this.config.minBatteryLevel) {
          this.emit('battery:low', { level: newLevel });
          this.pauseNonCriticalTasks();
        }
      }, 30000); // Check every 30 seconds
    } catch (error) {
      console.warn('Battery monitoring not available:', error);
    }
  }

  private startResourceMonitoring(): void {
    this.resourceMonitorTimer = setInterval(async () => {
      try {
        // Monitor memory usage (simplified)
        const memoryInfo = await this.getMemoryInfo();
        const cpuUsage = await this.getCPUUsage();

        if (memoryInfo.usage > this.config.memoryThrottleThreshold) {
          this.emit('resource:throttle', { reason: 'memory' });
          this.throttleExecution();
        } else if (cpuUsage > this.config.cpuThrottleThreshold) {
          this.emit('resource:throttle', { reason: 'cpu' });
          this.throttleExecution();
        } else if (this.isPaused) {
          this.emit('resource:resume', { reason: 'resources_available' });
          this.resumeExecution();
        }
      } catch (error) {
        console.warn('Resource monitoring failed:', error);
      }
    }, 10000) as unknown as NodeJS.Timeout; // Check every 10 seconds
  }

  private async getMemoryInfo(): Promise<{ usage: number; total: number }> {
    // This would use a proper memory monitoring library in production
    return { usage: 50, total: 100 }; // Placeholder
  }

  private async getCPUUsage(): Promise<number> {
    // This would use a proper CPU monitoring library in production
    return 30; // Placeholder
  }

  private handleAppBackground(): void {
    console.log('App went to background');

    // Start background task to extend execution time
    if (this.BackgroundTask && this.taskQueue.length > 0) {
      this.backgroundTaskId = this.BackgroundTask.start({
        taskName: 'ACubeBackgroundSync',
        taskDescriptor: 'Syncing e-receipt data',
      });

      // Set a timer for when background time runs out
      setTimeout(() => {
        this.handleBackgroundTimeExpired();
      }, this.config.maxBackgroundTime);
    }

    this.emit('app:background', { remainingTime: this.config.maxBackgroundTime });

    // Process critical tasks immediately
    this.processCriticalTasks();
  }

  private handleAppForeground(): void {
    console.log('App came to foreground');

    // End background task
    if (this.backgroundTaskId && this.BackgroundTask) {
      this.BackgroundTask.finish(this.backgroundTaskId);
      this.backgroundTaskId = undefined;
    }

    this.emit('app:foreground', {});

    // Resume normal processing
    this.resumeExecution();
    this.processQueue();
  }

  private handleBackgroundTimeExpired(): void {
    console.log('Background time expired, pausing non-critical tasks');

    // Cancel non-critical tasks
    for (const [taskId, { task, controller }] of this.activeTasks) {
      if (task.priority !== 'critical') {
        controller.abort();
        this.activeTasks.delete(taskId);
      }
    }

    // End background task
    if (this.backgroundTaskId && this.BackgroundTask) {
      this.BackgroundTask.finish(this.backgroundTaskId);
      this.backgroundTaskId = undefined;
    }
  }

  private async processCriticalTasks(): Promise<void> {
    const criticalTasks = this.taskQueue.filter(task => task.priority === 'critical');

    for (const task of criticalTasks) {
      if (this.activeTasks.size < this.config.maxConcurrentTasks) {
        await this.executeTask(task);
      }
    }
  }

  private pauseNonCriticalTasks(): void {
    this.isPaused = true;

    // Cancel non-critical running tasks
    for (const [taskId, { task, controller }] of this.activeTasks) {
      if (task.priority !== 'critical') {
        controller.abort();
        this.activeTasks.delete(taskId);
        // Re-queue the task
        this.taskQueue.unshift(task);
      }
    }
  }

  private throttleExecution(): void {
    this.isPaused = true;
    console.log('Throttling background execution due to resource constraints');
  }

  private resumeExecution(): void {
    if (this.isPaused) {
      this.isPaused = false;
      console.log('Resuming background execution');
      this.processQueue();
    }
  }

  private registerDefaultExecutors(): void {
    // Sync task executor
    this.registerExecutor('sync', async (_task: BackgroundTask, signal: AbortSignal) => {
      const startTime = Date.now();

      try {
        // Simulate sync operation
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, Math.random() * 2000 + 1000);

          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Task aborted'));
          });
        });

        return {
          success: true,
          data: { syncedItems: Math.floor(Math.random() * 10) + 1 },
          executionTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
        };
      }
    });

    // Cleanup task executor
    this.registerExecutor('cleanup', async (_task: BackgroundTask, signal: AbortSignal) => {
      const startTime = Date.now();

      try {
        // Simulate cleanup operation
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 500);

          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Task aborted'));
          });
        });

        return {
          success: true,
          data: { cleanedItems: Math.floor(Math.random() * 5) + 1 },
          executionTime: Date.now() - startTime,
        };
      } catch (error) {
        return {
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
        };
      }
    });
  }

  /**
   * Register a task executor
   */
  registerExecutor(type: BackgroundTaskType, executor: TaskExecutor): void {
    this.taskExecutors.set(type, executor);
  }

  /**
   * Schedule a new background task
   */
  async scheduleTask(task: Omit<BackgroundTask, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const fullTask: BackgroundTask = {
      ...task,
      id: this.generateTaskId(),
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: task.maxRetries || 3,
    };

    this.taskQueue.push(fullTask);
    this.sortTaskQueue();

    this.emit('task:scheduled', { task: fullTask });

    // Persist task if enabled
    if (this.config.enableTaskPersistence) {
      await this.persistTasks();
    }

    // Process queue if not paused
    if (!this.isPaused) {
      this.processQueue();
    }

    return fullTask.id;
  }

  /**
   * Cancel a scheduled task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    // Remove from queue
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
      await this.persistTasks();
      return true;
    }

    // Cancel if running
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.controller.abort();
      this.activeTasks.delete(taskId);
      return true;
    }

    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): 'queued' | 'running' | 'completed' | 'not_found' {
    if (this.taskQueue.some(task => task.id === taskId)) {
      return 'queued';
    }

    if (this.activeTasks.has(taskId)) {
      return 'running';
    }

    return 'not_found';
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      queued: this.taskQueue.length,
      running: this.activeTasks.size,
      isPaused: this.isPaused,
      currentAppState: this.currentAppState,
      batteryLevel: this.batteryState.level,
      isCharging: this.batteryState.isCharging,
      ...this.executionStats,
    };
  }

  private sortTaskQueue(): void {
    // Sort by priority, then by execution time/delay
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      // If same priority, sort by execution time
      const aTime = a.executionTime || (a.createdAt + (a.delay || 0));
      const bTime = b.executionTime || (b.createdAt + (b.delay || 0));

      return aTime - bTime; // Earlier time first
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isPaused || this.taskQueue.length === 0) {return;}

    const now = Date.now();

    while (
      this.taskQueue.length > 0 &&
      this.activeTasks.size < this.config.maxConcurrentTasks &&
      !this.isPaused
    ) {
      const task = this.taskQueue[0];
      if (!task) {break;}

      // Check if task is ready to execute
      const executionTime = task.executionTime || (task.createdAt + (task.delay || 0));
      if (executionTime > now) {
        break; // Wait for the right time
      }

      // Check execution conditions
      if (!this.canExecuteTask(task)) {
        break;
      }

      // Remove from queue and execute
      this.taskQueue.shift();
      await this.executeTask(task);
    }

    // Schedule next processing if there are more tasks
    if (this.taskQueue.length > 0) {
      const nextTask = this.taskQueue[0];
      if (nextTask) {
        const nextExecutionTime = nextTask.executionTime || (nextTask.createdAt + (nextTask.delay || 0));
        const delay = Math.max(0, nextExecutionTime - now);

        setTimeout(() => this.processQueue(), delay);
      }
    } else {
      this.emit('queue:empty', {});
    }
  }

  private canExecuteTask(task: BackgroundTask): boolean {
    // Check battery level for non-critical tasks
    if (
      this.config.enableBatteryOptimization &&
      task.priority !== 'critical' &&
      this.batteryState.level < this.config.minBatteryLevel &&
      !this.batteryState.isCharging
    ) {
      return false;
    }

    // Check network requirements (would need ConnectivityManager integration)
    // This is a placeholder for network checks

    // Check if device should be idle (placeholder)
    if (task.requiresDeviceIdle && this.currentAppState === 'active') {
      return false;
    }

    return true;
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const executor = this.taskExecutors.get(task.type);
    if (!executor) {
      console.warn(`No executor found for task type: ${task.type}`);
      return;
    }

    const controller = new AbortController();
    this.activeTasks.set(task.id, { task, controller });

    this.emit('task:started', { task });

    // Set timeout
    const timeout = setTimeout(() => {
      controller.abort();
    }, task.maxExecutionTime || this.config.defaultTaskTimeout);

    try {
      const result = await executor(task, controller.signal);
      clearTimeout(timeout);

      this.handleTaskResult(task, result);
    } catch (error) {
      clearTimeout(timeout);
      this.handleTaskError(task, error as Error);
    } finally {
      this.activeTasks.delete(task.id);
      await this.persistTasks();
    }
  }

  private handleTaskResult(task: BackgroundTask, result: TaskResult): void {
    this.executionStats.totalTasks++;
    this.executionStats.totalExecutionTime += result.executionTime;
    this.executionStats.avgExecutionTime =
      this.executionStats.totalExecutionTime / this.executionStats.totalTasks;

    if (result.success) {
      this.executionStats.successfulTasks++;
      this.emit('task:completed', { task, result });
    } else {
      this.handleTaskError(task, result.error || new Error('Task failed'));
    }
  }

  private async handleTaskError(task: BackgroundTask, error: Error): Promise<void> {
    this.executionStats.failedTasks++;

    const retryCount = task.retryCount || 0;
    if (retryCount < (task.maxRetries || 3)) {
      // Retry the task
      const retryTask: BackgroundTask = {
        ...task,
        retryCount: retryCount + 1,
        delay: 2**retryCount * 1000, // Exponential backoff
      };

      this.taskQueue.unshift(retryTask);
      this.emit('task:retry', { task: retryTask, attempt: retryCount + 1 });

      // Process queue after a delay
      setTimeout(() => this.processQueue(), 1000);
    } else {
      // Task failed permanently
      this.emit('task:failed', { task, error });
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private async persistTasks(): Promise<void> {
    if (!this.AsyncStorage) {return;}

    try {
      const tasksToSave = this.taskQueue.filter(task =>
        // Only persist tasks that should survive app restarts
        task.type === 'sync' || task.priority === 'critical',
      );

      await this.AsyncStorage.setItem(
        this.config.persistenceKey,
        JSON.stringify(tasksToSave),
      );
    } catch (error) {
      console.warn('Failed to persist tasks:', error);
    }
  }

  private async loadPersistedTasks(): Promise<void> {
    if (!this.AsyncStorage) {return;}

    try {
      const persistedTasks = await this.AsyncStorage.getItem(this.config.persistenceKey);
      if (persistedTasks) {
        const tasks: BackgroundTask[] = JSON.parse(persistedTasks);
        this.taskQueue.push(...tasks);
        this.sortTaskQueue();

        // Clear persisted tasks
        await this.AsyncStorage.removeItem(this.config.persistenceKey);
      }
    } catch (error) {
      console.warn('Failed to load persisted tasks:', error);
    }
  }

  /**
   * Force process all critical tasks immediately
   */
  async processCriticalTasksImmediately(): Promise<void> {
    const criticalTasks = this.taskQueue.filter(task => task.priority === 'critical');

    for (const task of criticalTasks) {
      await this.executeTask(task);
      this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
    }

    await this.persistTasks();
  }

  /**
   * Pause all background processing
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume background processing
   */
  resume(): void {
    this.isPaused = false;
    this.processQueue();
  }

  /**
   * Clear all queued tasks
   */
  async clearQueue(): Promise<void> {
    this.taskQueue = [];
    await this.persistTasks();
  }

  /**
   * Destroy the background processor
   */
  destroy(): void {
    // Cancel all active tasks
    for (const [, { controller }] of this.activeTasks) {
      controller.abort();
    }
    this.activeTasks.clear();

    // Clear timers
    if (this.resourceMonitorTimer) {
      clearInterval(this.resourceMonitorTimer);
    }

    // End background task if running
    if (this.backgroundTaskId && this.BackgroundTask) {
      this.BackgroundTask.finish(this.backgroundTaskId);
    }

    this.removeAllListeners();
  }
}
