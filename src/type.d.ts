import '@react-native-community/netinfo';

// Estendi l’interfaccia esistente di NetInfoState
declare module '@react-native-community/netinfo' {
    export interface NetInfoState {
        // Queste proprietà potrebbero già esistere, ma se non lo fanno le aggiungi
        details?: {
            cellularGeneration?: string;
            ssid?: string;
            isConnectionExpensive?: boolean;
            // altre proprietà che usi
        };
    }
}