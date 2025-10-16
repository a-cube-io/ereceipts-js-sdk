import {IBackgroundTaskAdapter} from "../../adapters";
import {WebBackgroundTask} from "../../platforms/web/web-background-task";
import {RNBackgroundTaskAdapter} from "../../platforms/react-native/rn-background-task";
import {NodeBackgroundTask} from "../../platforms/node/node-background-task";

/**
 * Load-platform-specific Background Task
 */
export function loadBackgroundTask(platform: string): IBackgroundTaskAdapter {
    switch (platform) {
        case 'web':
            return loadWebBackgroundTask();
        case 'react-native':
            return loadReactNativeBackgroundTask();
        case 'node':
            return loadNodeBackgroundTask();
        default:
            return loadMemoryBackgroundTask();
    }
}

/**
 * Load web network monitor (navigator.onLine-based)
 */
function loadWebBackgroundTask(): IBackgroundTaskAdapter {
    return new WebBackgroundTask();
}

/**
 * Load React Native network monitor (NetInfo-based)
 */
function loadReactNativeBackgroundTask(): IBackgroundTaskAdapter {
    return new RNBackgroundTaskAdapter();
}

/**
 * Load Node.js network monitor (DNS-based connectivity check)
 */
function loadNodeBackgroundTask(): IBackgroundTaskAdapter {
    return new NodeBackgroundTask();
}

/**
 * Load memory network monitor (fallback)
 */
function loadMemoryBackgroundTask(): IBackgroundTaskAdapter {
    return new NodeBackgroundTask();
}