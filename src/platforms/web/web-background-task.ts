import {IBackgroundTaskAdapter} from "../../adapters";

export class WebBackgroundTask implements IBackgroundTaskAdapter {
    async registerTask(taskName: string, _task: () => Promise<void>): Promise<void> {
        console.warn(`Background tasks are not supported on web. Task "${taskName}" will not be registered.`);
        throw new Error('Background tasks are not supported on web.');
    }

    async unregisterTask(taskName: string): Promise<void> {
        console.warn(`Background tasks are not supported on web. Task "${taskName}" cannot be unregistered because it was never registered.`);
        throw new Error('Background tasks are not supported on web.');
    }
}