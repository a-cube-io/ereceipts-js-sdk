import { PlatformAdapters } from "../adapters";
import {ReceiptInput, ReceiptOutput} from "../core";


export type OfflineDataItem = {
    id: string;
    data: ReceiptInput;
}

/**
 * Offline master class
 * Manages offline capabilities and synchronization
 */
export class OfflineMaster {
    private static OFFLINE_MODE_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds
    private static KEY_OFFLINE_DATA = 'acube_offline_data';

    // synchronization properties
    private static MAX_SYNC_RETRIES = 3;
    private isSynchronizing: boolean = false;
    private syncRetryCount: Map<string, number> = new Map();

    // here I set lastSuccessSentReceiptAt when I send receipt to server successfully
    private lastSuccessSentReceiptAt: number = 0;

    // here if I check nectwork status, and I am offline, I set immediately lastFailedSentReceiptAt
    private lastFailedSentReceiptAt?: number;

    // romaning time to go in Emergency mode (if I am offline longer than 1 hour, I go to Emergency mode)
    private romaningTimeToGoInEmergencyMode?: number;

    // toogle this Emergency mode when romaning time is over (greater than 1 hour)
    private isEmergencyMode: boolean = false;

    // toogle this Offline mode when I am offline (network is down) or lastFailedSentReceiptAt is set.
    private isOfflineBeforeEmergencyMode: boolean = false;

    private listOfflineData: OfflineDataItem[] = [];

    /**
     * Constructor
     * @param adapters Platform adapters for storage, network monitoring, etc.
     * @param syncFunction
     */
    constructor(
        private adapters: PlatformAdapters,
        private syncFunction: (data: ReceiptInput) => Promise<ReceiptOutput>
    ) {
        void this.initialize();
    }

    private async initialize() {
        await this.loadData();
        this.beginOfflineOrEmergencyModeProcess()
        // Subscribe to network status changes
        this.adapters.networkMonitor.onStatusChange((online) => {
            if (online) {
                this.successSendReceipt()
                if (!this.isSynchronizing && this.listOfflineData.length > 0){
                    console.log('[OFFLINE-MASTER] Synchronizing data in offline mode', this.listOfflineData);
                    this.syncOfflineData();
                }
            } else {
                this.beginOfflineOrEmergencyModeProcess();
            }
        });
    }

    async loadData() {
        const data = await this.adapters.secureStorage.get(OfflineMaster.KEY_OFFLINE_DATA);
        if (data) {
            this.listOfflineData = JSON.parse(data);
            console.log('[OFFLINE-MASTER] LIST Data loaded from offline mode', this.listOfflineData);
        }
    }

    successSendReceipt() {
        this.lastSuccessSentReceiptAt = Date.now();
        this.lastFailedSentReceiptAt = undefined;
        this.romaningTimeToGoInEmergencyMode = undefined;
        this.isEmergencyMode = false;
        this.isOfflineBeforeEmergencyMode = false;
        console.log('[OFFLINE-MASTER] Receipt sent successfully', {
            lastSuccessSentReceiptAt: this.lastSuccessSentReceiptAt,
            lastFailedSentReceiptAt: this.lastFailedSentReceiptAt,
            romaningTimeToGoInEmergencyMode: this.romaningTimeToGoInEmergencyMode,
            isEmergencyMode: this.isEmergencyMode,
            isOfflineMode: this.isOfflineBeforeEmergencyMode,
        });
    }

    beginOfflineOrEmergencyModeProcess() {
        if (this.adapters.networkMonitor.isOnline()) {
            this.successSendReceipt()
        }

        this.setOfflineOrEmergencyMode();
    }

    setOfflineOrEmergencyMode() {
        const now = Date.now();
        this.lastFailedSentReceiptAt = now;
        this.romaningTimeToGoInEmergencyMode = OfflineMaster.OFFLINE_MODE_TIMEOUT - (now - this.lastSuccessSentReceiptAt - (this.lastFailedSentReceiptAt || 0));
        this.romaningTimeToGoInEmergencyMode = Math.max(
            0,
            this.romaningTimeToGoInEmergencyMode
        )
        this.isEmergencyMode = this.romaningTimeToGoInEmergencyMode > 0;
        this.isOfflineBeforeEmergencyMode = !this.isEmergencyMode && !this.adapters.networkMonitor.isOnline();
        console.log('[OFFLINE-MASTER] Offline or Emergency mode is set', {
            lastSuccessSentReceiptAt: this.lastSuccessSentReceiptAt,
            lastFailedSentReceiptAt: this.lastFailedSentReceiptAt,
            romaningTimeToGoInEmergencyMode: this.romaningTimeToGoInEmergencyMode,
            isEmergencyMode: this.isEmergencyMode,
            isOfflineMode: this.isOfflineBeforeEmergencyMode,
        });
    }

    private async syncOfflineData() {
        if (this.isSynchronizing || this.listOfflineData.length === 0) return;

        this.isSynchronizing = true;
        console.log('[OFFLINE-MASTER] Syncing', this.listOfflineData.length, 'items');

        const remainingData: OfflineDataItem[] = [];
        for (const item of this.listOfflineData) {
            try {
                await this.syncFunction(item.data);
                this.syncRetryCount.delete(item.id);
            } catch (error) {
                console.error('[OFFLINE-MASTER] Sync failed:', error);
                remainingData.push(item);
                this.handleSyncError(item);
            }
        }

        this.listOfflineData = remainingData;
        await this.adapters.secureStorage.set(OfflineMaster.KEY_OFFLINE_DATA, JSON.stringify(this.listOfflineData));
        this.isSynchronizing = false;
    }

    private handleSyncError(item: OfflineDataItem) {
        const id = item.id || 'unknown';
        const count = this.syncRetryCount.get(id) || 0;
        if (count < OfflineMaster.MAX_SYNC_RETRIES) {
            this.syncRetryCount.set(id, count + 1);
            setTimeout(() => this.syncOfflineData(), Math.pow(2, count) * 1000);
        }
    }

    async saveData(data: ReceiptInput){
        if (this.isOfflineBeforeEmergencyMode){
            console.log('[OFFLINE-MASTER] Data saved in offline mode', data);
            // create id for data and save it in listOfflineData
            const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            this.listOfflineData.push({
                id: id,
                data: data,
            });
            console.log('[OFFLINE-MASTER] LIST Data saved in offline mode', this.listOfflineData);
            await this.adapters.secureStorage.set(OfflineMaster.KEY_OFFLINE_DATA, JSON.stringify(this.listOfflineData));
            console.log('SAVE DATA SUCCESSFULLY');
        }
    }

    getOfflineData(): ReceiptInput[]{
        return this.listOfflineData.map(item => item.data);
    }
}