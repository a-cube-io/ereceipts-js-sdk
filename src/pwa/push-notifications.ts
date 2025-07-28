/**
 * Push Notifications Manager for A-Cube E-Receipt SDK
 * Handles PWA push notifications with Italian e-receipt specific messaging
 * 
 * Features:
 * - VAPID key management
 * - Subscription handling
 * - Receipt-specific notifications
 * - Fiscal compliance alerts
 * - Multi-language support
 * - Notification actions
 */

import { EventEmitter } from 'eventemitter3';

/**
 * Notification types for e-receipts
 */
export type NotificationType = 
  | 'receipt_created'
  | 'receipt_synced'
  | 'receipt_void'
  | 'fiscal_alert'
  | 'lottery_win'
  | 'sync_completed'
  | 'sync_failed'
  | 'offline_reminder'
  | 'app_update';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

/**
 * Push notification configuration
 */
export interface PushNotificationConfig {
  /** VAPID public key for push service */
  vapidPublicKey: string;
  
  /** Service worker registration */
  serviceWorkerRegistration?: ServiceWorkerRegistration;
  
  /** Default notification options */
  defaultOptions?: {
    /** Notification icon */
    icon?: string;
    
    /** Notification badge */
    badge?: string;
    
    /** Vibration pattern */
    vibrate?: number[];
    
    /** Silent notifications */
    silent?: boolean;
    
    /** Require interaction */
    requireInteraction?: boolean;
    
    /** Notification tag for grouping */
    tag?: string;
  };
  
  /** Language for notifications */
  language?: 'it' | 'en' | 'de' | 'fr';
  
  /** Enable automatic subscription */
  autoSubscribe?: boolean;
  
  /** Notification server endpoint */
  serverEndpoint?: string;
}

/**
 * Push subscription info
 */
export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    receiptId?: string | undefined;
    amount?: string | undefined;
    merchantName?: string | undefined;
    timestamp?: string | undefined;
    actionUrl?: string | undefined;
    priority?: NotificationPriority | undefined;
    [key: string]: any;
  };
  options?: NotificationOptions;
}

/**
 * Push notification events
 */
export interface PushNotificationEvents {
  'subscription:created': { subscription: PushSubscriptionInfo };
  'subscription:updated': { subscription: PushSubscriptionInfo };
  'subscription:deleted': { reason: string };
  'permission:granted': { permission: NotificationPermission };
  'permission:denied': { permission: NotificationPermission };
  'notification:shown': { notification: NotificationPayload };
  'notification:clicked': { action: string; data: any };
  'notification:closed': { notification: NotificationPayload };
  'error': { error: Error; context: string };
}

/**
 * Notification templates by language
 */
const NOTIFICATION_TEMPLATES: Record<string, Record<NotificationType, { title: string; body: string }>> = {
  it: {
    receipt_created: {
      title: 'Nuovo Scontrino',
      body: 'Scontrino di €{amount} creato presso {merchantName}',
    },
    receipt_synced: {
      title: 'Scontrino Sincronizzato',
      body: 'Il tuo scontrino è stato trasmesso con successo',
    },
    receipt_void: {
      title: 'Scontrino Annullato',
      body: 'Scontrino #{receiptId} annullato',
    },
    fiscal_alert: {
      title: '⚠️ Avviso Fiscale',
      body: 'Azione richiesta per conformità fiscale',
    },
    lottery_win: {
      title: '🎉 Hai Vinto!',
      body: 'Il tuo scontrino ha vinto alla lotteria!',
    },
    sync_completed: {
      title: 'Sincronizzazione Completata',
      body: '{count} scontrini sincronizzati con successo',
    },
    sync_failed: {
      title: 'Sincronizzazione Fallita',
      body: 'Impossibile sincronizzare {count} scontrini',
    },
    offline_reminder: {
      title: 'Modalità Offline',
      body: 'Hai {count} scontrini in attesa di sincronizzazione',
    },
    app_update: {
      title: 'Aggiornamento Disponibile',
      body: 'Una nuova versione dell\'app è disponibile',
    },
  },
  en: {
    receipt_created: {
      title: 'New Receipt',
      body: 'Receipt for €{amount} created at {merchantName}',
    },
    receipt_synced: {
      title: 'Receipt Synced',
      body: 'Your receipt has been successfully transmitted',
    },
    receipt_void: {
      title: 'Receipt Voided',
      body: 'Receipt #{receiptId} has been voided',
    },
    fiscal_alert: {
      title: '⚠️ Fiscal Alert',
      body: 'Action required for fiscal compliance',
    },
    lottery_win: {
      title: '🎉 You Won!',
      body: 'Your receipt won in the lottery!',
    },
    sync_completed: {
      title: 'Sync Completed',
      body: '{count} receipts synced successfully',
    },
    sync_failed: {
      title: 'Sync Failed',
      body: 'Unable to sync {count} receipts',
    },
    offline_reminder: {
      title: 'Offline Mode',
      body: 'You have {count} receipts waiting to sync',
    },
    app_update: {
      title: 'Update Available',
      body: 'A new version of the app is available',
    },
  },
  de: {
    receipt_created: {
      title: 'Neuer Beleg',
      body: 'Beleg über €{amount} erstellt bei {merchantName}',
    },
    receipt_synced: {
      title: 'Beleg Synchronisiert',
      body: 'Ihr Beleg wurde erfolgreich übertragen',
    },
    receipt_void: {
      title: 'Beleg Storniert',
      body: 'Beleg #{receiptId} wurde storniert',
    },
    fiscal_alert: {
      title: '⚠️ Steuerwarnung',
      body: 'Aktion für Steuerkonformität erforderlich',
    },
    lottery_win: {
      title: '🎉 Sie haben gewonnen!',
      body: 'Ihr Beleg hat in der Lotterie gewonnen!',
    },
    sync_completed: {
      title: 'Synchronisation Abgeschlossen',
      body: '{count} Belege erfolgreich synchronisiert',
    },
    sync_failed: {
      title: 'Synchronisation Fehlgeschlagen',
      body: '{count} Belege konnten nicht synchronisiert werden',
    },
    offline_reminder: {
      title: 'Offline-Modus',
      body: 'Sie haben {count} Belege zur Synchronisation',
    },
    app_update: {
      title: 'Update Verfügbar',
      body: 'Eine neue Version der App ist verfügbar',
    },
  },
  fr: {
    receipt_created: {
      title: 'Nouveau Reçu',
      body: 'Reçu de €{amount} créé chez {merchantName}',
    },
    receipt_synced: {
      title: 'Reçu Synchronisé',
      body: 'Votre reçu a été transmis avec succès',
    },
    receipt_void: {
      title: 'Reçu Annulé',
      body: 'Reçu #{receiptId} a été annulé',
    },
    fiscal_alert: {
      title: '⚠️ Alerte Fiscale',
      body: 'Action requise pour la conformité fiscale',
    },
    lottery_win: {
      title: '🎉 Vous avez gagné!',
      body: 'Votre reçu a gagné à la loterie!',
    },
    sync_completed: {
      title: 'Synchronisation Terminée',
      body: '{count} reçus synchronisés avec succès',
    },
    sync_failed: {
      title: 'Échec de Synchronisation',
      body: 'Impossible de synchroniser {count} reçus',
    },
    offline_reminder: {
      title: 'Mode Hors Ligne',
      body: 'Vous avez {count} reçus en attente de synchronisation',
    },
    app_update: {
      title: 'Mise à Jour Disponible',
      body: 'Une nouvelle version de l\'application est disponible',
    },
  },
};

const DEFAULT_CONFIG: Partial<PushNotificationConfig> = {
  defaultOptions: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    silent: false,
    requireInteraction: false,
  },
  language: 'it',
  autoSubscribe: false,
  serverEndpoint: '/api/push/subscribe',
};

/**
 * Push Notifications Manager
 * Handles PWA push notifications for e-receipt updates
 */
export class PushNotificationManager extends EventEmitter<PushNotificationEvents> {
  private config: Required<PushNotificationConfig>;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean;
  private permission: NotificationPermission = 'default';

  constructor(config: PushNotificationConfig) {
    super();
    
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultOptions: {
        ...DEFAULT_CONFIG.defaultOptions,
        ...config.defaultOptions,
      },
    } as Required<PushNotificationConfig>;
    
    this.isSupported = this.checkSupport();
    
    if (this.isSupported) {
      this.permission = Notification.permission;
      this.initialize();
    }
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Initialize push notifications
   */
  private async initialize(): Promise<void> {
    try {
      // Get service worker registration
      if (this.config.serviceWorkerRegistration) {
        this.registration = this.config.serviceWorkerRegistration;
      } else {
        this.registration = await navigator.serviceWorker.ready;
      }
      
      // Check existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        this.emit('subscription:created', { 
          subscription: this.extractSubscriptionInfo(this.subscription) 
        });
      }
      
      // Auto-subscribe if configured
      if (this.config.autoSubscribe && !this.subscription && this.permission === 'default') {
        await this.subscribe();
      }
    } catch (error) {
      this.emit('error', { 
        error: error as Error, 
        context: 'initialization' 
      });
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Push notifications are not supported');
    }
    
    try {
      this.permission = await Notification.requestPermission();
      
      if (this.permission === 'granted') {
        this.emit('permission:granted', { permission: this.permission });
      } else {
        this.emit('permission:denied', { permission: this.permission });
      }
      
      return this.permission;
    } catch (error) {
      this.emit('error', { 
        error: error as Error, 
        context: 'permission_request' 
      });
      throw error;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionInfo | null> {
    if (!this.isSupported || !this.registration) {
      throw new Error('Push notifications not initialized');
    }
    
    // Check permission
    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return null;
      }
    }
    
    try {
      // Subscribe to push service
      const applicationServerKey = this.urlBase64ToUint8Array(this.config.vapidPublicKey);
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array(applicationServerKey),
      });
      
      const subscriptionInfo = this.extractSubscriptionInfo(this.subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscriptionInfo);
      
      this.emit('subscription:created', { subscription: subscriptionInfo });
      
      return subscriptionInfo;
    } catch (error) {
      this.emit('error', { 
        error: error as Error, 
        context: 'subscription' 
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (!this.subscription) {
      return;
    }
    
    try {
      await this.subscription.unsubscribe();
      
      // Remove subscription from server
      await this.removeSubscriptionFromServer();
      
      this.subscription = null;
      this.emit('subscription:deleted', { reason: 'user_unsubscribed' });
    } catch (error) {
      this.emit('error', { 
        error: error as Error, 
        context: 'unsubscription' 
      });
      throw error;
    }
  }

  /**
   * Show a notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!this.isSupported || this.permission !== 'granted') {
      throw new Error('Cannot show notification: permission not granted');
    }
    
    try {
      const { title, body, options } = this.prepareNotification(payload);
      
      if (this.registration) {
        // Use service worker to show notification
        await this.registration.showNotification(title, {
          ...this.config.defaultOptions,
          ...options,
          body,
          data: payload.data,
          tag: payload.type,
        });
      } else {
        // Fallback to Notification API
        const notification = new Notification(title, {
          ...this.config.defaultOptions,
          ...options,
          body,
          data: payload.data,
          tag: payload.type,
        });
        
        // Handle notification events
        notification.onclick = () => {
          this.emit('notification:clicked', { 
            action: 'default', 
            data: payload.data || {} 
          });
          notification.close();
        };
        
        notification.onclose = () => {
          this.emit('notification:closed', { notification: payload });
        };
      }
      
      this.emit('notification:shown', { notification: payload });
    } catch (error) {
      this.emit('error', { 
        error: error as Error, 
        context: 'show_notification' 
      });
      throw error;
    }
  }

  /**
   * Show receipt created notification
   */
  async notifyReceiptCreated(receipt: {
    id: string;
    amount: string;
    merchantName: string;
    timestamp?: string;
  }): Promise<void> {
    await this.showNotification({
      type: 'receipt_created',
      title: '',
      body: '',
      data: {
        receiptId: receipt.id,
        amount: receipt.amount,
        merchantName: receipt.merchantName,
        timestamp: receipt.timestamp || new Date().toISOString(),
        actionUrl: `/receipts/${receipt.id}`,
        priority: 'normal',
      },
    });
  }

  /**
   * Show fiscal alert notification
   */
  async notifyFiscalAlert(data: {
    message: string;
    receiptId?: string;
    urgency?: 'high' | 'critical';
  }): Promise<void> {
    await this.showNotification({
      type: 'fiscal_alert',
      title: '',
      body: data.message,
      data: {
        receiptId: data.receiptId,
        actionUrl: data.receiptId ? `/receipts/${data.receiptId}` : '/fiscal-alerts',
        priority: data.urgency === 'critical' ? 'urgent' : 'high',
      },
      options: {
        requireInteraction: true,
      },
    });
  }

  /**
   * Show lottery win notification
   */
  async notifyLotteryWin(data: {
    receiptId: string;
    prizeAmount?: string;
    claimCode?: string;
  }): Promise<void> {
    await this.showNotification({
      type: 'lottery_win',
      title: '',
      body: '',
      data: {
        receiptId: data.receiptId,
        prizeAmount: data.prizeAmount,
        claimCode: data.claimCode,
        actionUrl: `/lottery/claim/${data.receiptId}`,
        priority: 'urgent',
      },
      options: {
        requireInteraction: true,
        icon: '/icons/lottery-win.png',
      },
    });
  }

  /**
   * Show sync status notification
   */
  async notifySyncStatus(status: 'completed' | 'failed', count: number): Promise<void> {
    const type = status === 'completed' ? 'sync_completed' : 'sync_failed';
    
    await this.showNotification({
      type,
      title: '',
      body: '',
      data: {
        count: count.toString(),
        timestamp: new Date().toISOString(),
        actionUrl: '/sync-status',
        priority: status === 'failed' ? 'high' : 'normal',
      },
    });
  }

  /**
   * Show offline reminder notification
   */
  async notifyOfflineReminder(pendingCount: number): Promise<void> {
    if (pendingCount === 0) return;
    
    await this.showNotification({
      type: 'offline_reminder',
      title: '',
      body: '',
      data: {
        count: pendingCount.toString(),
        actionUrl: '/offline-queue',
        priority: pendingCount > 10 ? 'high' : 'normal',
      },
    });
  }

  /**
   * Prepare notification with localization
   */
  private prepareNotification(payload: NotificationPayload): {
    title: string;
    body: string;
    options?: NotificationOptions;
  } {
    const templates = NOTIFICATION_TEMPLATES[this.config.language] || NOTIFICATION_TEMPLATES.it;
    const template = templates?.[payload.type] || { title: 'Notification', body: 'New notification' };
    
    // Replace placeholders in template
    let title = payload.title || template.title;
    let body = payload.body || template.body;
    
    if (payload.data) {
      Object.entries(payload.data).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        title = title.replace(placeholder, String(value));
        body = body.replace(placeholder, String(value));
      });
    }
    
    // Add actions based on notification type
    const actions: Array<{ action: string; title: string }> = [];
    
    switch (payload.type) {
      case 'receipt_created':
      case 'receipt_synced':
        actions.push(
          { action: 'view', title: this.getActionTitle('view') },
          { action: 'dismiss', title: this.getActionTitle('dismiss') }
        );
        break;
        
      case 'fiscal_alert':
        actions.push(
          { action: 'resolve', title: this.getActionTitle('resolve') },
          { action: 'later', title: this.getActionTitle('later') }
        );
        break;
        
      case 'lottery_win':
        actions.push(
          { action: 'claim', title: this.getActionTitle('claim') },
          { action: 'share', title: this.getActionTitle('share') }
        );
        break;
        
      case 'sync_failed':
        actions.push(
          { action: 'retry', title: this.getActionTitle('retry') },
          { action: 'details', title: this.getActionTitle('details') }
        );
        break;
        
      case 'app_update':
        actions.push(
          { action: 'update', title: this.getActionTitle('update') },
          { action: 'later', title: this.getActionTitle('later') }
        );
        break;
    }
    
    return {
      title,
      body,
      options: {
        ...payload.options,
        ...(actions.length > 0 && { actions }),
      } as NotificationOptions,
    };
  }

  /**
   * Get localized action title
   */
  private getActionTitle(action: string): string {
    const actionTitles: Record<string, Record<string, string>> = {
      it: {
        view: 'Visualizza',
        dismiss: 'Ignora',
        resolve: 'Risolvi',
        later: 'Più tardi',
        claim: 'Riscuoti',
        share: 'Condividi',
        retry: 'Riprova',
        details: 'Dettagli',
        update: 'Aggiorna',
      },
      en: {
        view: 'View',
        dismiss: 'Dismiss',
        resolve: 'Resolve',
        later: 'Later',
        claim: 'Claim',
        share: 'Share',
        retry: 'Retry',
        details: 'Details',
        update: 'Update',
      },
      de: {
        view: 'Anzeigen',
        dismiss: 'Verwerfen',
        resolve: 'Lösen',
        later: 'Später',
        claim: 'Einlösen',
        share: 'Teilen',
        retry: 'Wiederholen',
        details: 'Details',
        update: 'Aktualisieren',
      },
      fr: {
        view: 'Voir',
        dismiss: 'Ignorer',
        resolve: 'Résoudre',
        later: 'Plus tard',
        claim: 'Réclamer',
        share: 'Partager',
        retry: 'Réessayer',
        details: 'Détails',
        update: 'Mettre à jour',
      },
    };
    
    const titles = actionTitles[this.config.language] || actionTitles.it;
    return titles?.[action] || action;
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Extract subscription info from PushSubscription
   */
  private extractSubscriptionInfo(subscription: PushSubscription): PushSubscriptionInfo {
    const key = subscription.getKey('p256dh');
    const token = subscription.getKey('auth');
    
    if (!key || !token) {
      throw new Error('Unable to get subscription keys');
    }
    
    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(token))),
      },
      expirationTime: subscription.expirationTime,
    };
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscriptionInfo): Promise<void> {
    // This would be implemented to send the subscription to your server
    try {
      const response = await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          language: this.config.language,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      // Don't throw - allow local functionality to continue
    }
  }

  /**
   * Remove subscription from server
   */
  private async removeSubscriptionFromServer(): Promise<void> {
    // This would be implemented to remove the subscription from your server
    try {
      if (this.subscription) {
        await fetch(this.config.serverEndpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: this.subscription.endpoint,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      // Don't throw - allow local functionality to continue
    }
  }

  /**
   * Get current permission status
   */
  getPermission(): NotificationPermission {
    return this.permission;
  }

  /**
   * Check if notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if subscribed to push notifications
   */
  isSubscribed(): boolean {
    return this.subscription !== null;
  }

  /**
   * Get current subscription
   */
  getSubscription(): PushSubscriptionInfo | null {
    if (!this.subscription) {
      return null;
    }
    
    return this.extractSubscriptionInfo(this.subscription);
  }

  /**
   * Set notification language
   */
  setLanguage(language: 'it' | 'en' | 'de' | 'fr'): void {
    this.config.language = language;
  }

  /**
   * Destroy the push notification manager
   */
  async destroy(): Promise<void> {
    this.removeAllListeners();
    this.registration = null;
    this.subscription = null;
  }
}