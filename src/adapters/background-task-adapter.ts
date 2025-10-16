export interface IBackgroundTaskAdapter {
    registerTask(taskName: string, task: () => Promise<void>): Promise<void>;
    unregisterTask(taskName: string): Promise<void>;
}