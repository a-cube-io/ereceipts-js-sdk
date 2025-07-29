/**
 * Key Rotation Manager for A-Cube SDK
 * Provides automated key rotation, versioning, and lifecycle management
 */

import { AdvancedEncryption } from './encryption';
import { DigitalSignatureManager } from './signatures';

export interface KeyRotationConfig {
  rotationInterval: number; // milliseconds
  gracePeriod: number; // milliseconds to keep old keys
  autoRotate: boolean;
  rotationTriggers: {
    timeBasedRotation: boolean;
    usageBasedRotation: boolean;
    compromiseDetection: boolean;
    maxUsageCount?: number;
  };
  notification: {
    beforeRotation: number; // milliseconds before rotation
    afterRotation: boolean;
    onFailure: boolean;
  };
  backup: {
    enabled: boolean;
    encryptBackups: boolean;
    retentionPeriod: number; // milliseconds
  };
}

export interface KeyVersion {
  keyId: string;
  version: number;
  algorithm: string;
  createdAt: number;
  rotatedAt?: number;
  expiresAt: number;
  status: 'active' | 'deprecated' | 'revoked' | 'expired';
  usageCount: number;
  lastUsed?: number;
  rotationReason?: 'scheduled' | 'usage_limit' | 'compromise' | 'manual';
  metadata: {
    purpose: string;
    environment: string;
    creator: string;
  };
}

export interface RotationEvent {
  id: string;
  timestamp: number;
  type: 'rotation_scheduled' | 'rotation_started' | 'rotation_completed' | 'rotation_failed';
  keyId: string;
  oldVersion?: number;
  newVersion?: number;
  reason: string;
  details: Record<string, any>;
}

export interface KeyBackup {
  backupId: string;
  keyId: string;
  version: number;
  createdAt: number;
  expiresAt: number;
  encryptedKeyData: string;
  algorithm: string;
  checksum: string;
}

export class KeyRotationManager {
  private encryption: AdvancedEncryption;
  private signatures: DigitalSignatureManager;
  private config: KeyRotationConfig;
  private keyVersions = new Map<string, KeyVersion[]>();
  private rotationSchedule = new Map<string, NodeJS.Timeout>();
  private rotationEvents: RotationEvent[] = [];
  private keyBackups = new Map<string, KeyBackup[]>();
  private eventListeners = new Map<string, Array<(event: RotationEvent) => void>>();

  constructor(
    encryption: AdvancedEncryption,
    signatures: DigitalSignatureManager,
    config?: Partial<KeyRotationConfig>
  ) {
    this.encryption = encryption;
    this.signatures = signatures;
    this.config = {
      rotationInterval: 30 * 24 * 60 * 60 * 1000, // 30 days
      gracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoRotate: true,
      rotationTriggers: {
        timeBasedRotation: true,
        usageBasedRotation: true,
        compromiseDetection: true,
        maxUsageCount: 10000,
      },
      notification: {
        beforeRotation: 24 * 60 * 60 * 1000, // 24 hours
        afterRotation: true,
        onFailure: true,
      },
      backup: {
        enabled: true,
        encryptBackups: true,
        retentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
      },
      ...config,
    };

    this.initializeRotationScheduler();
  }

  /**
   * Register a key for rotation management
   */
  async registerKey(
    keyId: string,
    algorithm: string,
    purpose: string,
    environment: string = 'production'
  ): Promise<void> {
    const now = Date.now();
    const keyVersion: KeyVersion = {
      keyId,
      version: 1,
      algorithm,
      createdAt: now,
      expiresAt: now + this.config.rotationInterval,
      status: 'active',
      usageCount: 0,
      metadata: {
        purpose,
        environment,
        creator: 'system',
      },
    };

    const versions = this.keyVersions.get(keyId) || [];
    versions.push(keyVersion);
    this.keyVersions.set(keyId, versions);

    // Schedule automatic rotation if enabled
    if (this.config.autoRotate && this.config.rotationTriggers.timeBasedRotation) {
      this.scheduleRotation(keyId, this.config.rotationInterval);
    }

    // Create backup if enabled
    if (this.config.backup.enabled) {
      await this.createKeyBackup(keyId, keyVersion);
    }

    this.emitEvent({
      id: this.generateEventId(),
      timestamp: now,
      type: 'rotation_scheduled',
      keyId,
      newVersion: 1,
      reason: 'initial_registration',
      details: { purpose, environment, algorithm },
    });
  }

  /**
   * Manually rotate a key
   */
  async rotateKey(keyId: string, reason: string = 'manual'): Promise<string> {
    const versions = this.keyVersions.get(keyId);
    if (!versions || versions.length === 0) {
      throw new Error(`Key not found for rotation: ${keyId}`);
    }

    const currentVersion = this.getCurrentVersion(keyId);
    if (!currentVersion) {
      throw new Error(`No active version found for key: ${keyId}`);
    }

    this.emitEvent({
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'rotation_started',
      keyId,
      oldVersion: currentVersion.version,
      reason,
      details: { triggerType: 'manual' },
    });

    try {
      // Generate new key
      let newKeyId: string;
      if (currentVersion.algorithm.includes('AES') || currentVersion.algorithm.includes('symmetric')) {
        newKeyId = await this.encryption.generateSymmetricKey();
      } else {
        newKeyId = await this.signatures.generateSigningKeyPair();
      }

      // Create new version
      const now = Date.now();
      const newVersion: KeyVersion = {
        keyId: newKeyId,
        version: currentVersion.version + 1,
        algorithm: currentVersion.algorithm,
        createdAt: now,
        expiresAt: now + this.config.rotationInterval,
        status: 'active',
        usageCount: 0,
        rotationReason: reason as any,
        metadata: currentVersion.metadata,
      };

      // Update current version status
      currentVersion.status = 'deprecated';
      currentVersion.rotatedAt = now;

      // Add new version
      versions.push(newVersion);
      this.keyVersions.set(keyId, versions);

      // Create backup of new key
      if (this.config.backup.enabled) {
        await this.createKeyBackup(newKeyId, newVersion);
      }

      // Schedule cleanup of old key after grace period
      setTimeout(() => {
        this.expireKeyVersion(keyId, currentVersion.version);
      }, this.config.gracePeriod);

      // Reschedule next rotation
      if (this.config.autoRotate && this.config.rotationTriggers.timeBasedRotation) {
        this.scheduleRotation(keyId, this.config.rotationInterval);
      }

      this.emitEvent({
        id: this.generateEventId(),
        timestamp: now,
        type: 'rotation_completed',
        keyId,
        oldVersion: currentVersion.version,
        newVersion: newVersion.version,
        reason,
        details: { 
          newKeyId,
          gracePeriodEnd: now + this.config.gracePeriod,
        },
      });

      return newKeyId;
    } catch (error) {
      this.emitEvent({
        id: this.generateEventId(),
        timestamp: Date.now(),
        type: 'rotation_failed',
        keyId,
        oldVersion: currentVersion.version,
        reason,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  }

  /**
   * Get current active key version
   */
  getCurrentVersion(keyId: string): KeyVersion | undefined {
    const versions = this.keyVersions.get(keyId);
    if (!versions) return undefined;

    return versions.find(v => v.status === 'active');
  }

  /**
   * Get all versions of a key
   */
  getKeyVersions(keyId: string): KeyVersion[] {
    return this.keyVersions.get(keyId) || [];
  }

  /**
   * Get key by version number
   */
  getKeyVersion(keyId: string, version: number): KeyVersion | undefined {
    const versions = this.keyVersions.get(keyId);
    if (!versions) return undefined;

    return versions.find(v => v.version === version);
  }

  /**
   * Record key usage
   */
  recordKeyUsage(keyId: string): void {
    const currentVersion = this.getCurrentVersion(keyId);
    if (!currentVersion) return;

    currentVersion.usageCount++;
    currentVersion.lastUsed = Date.now();

    // Check if usage limit reached
    if (
      this.config.rotationTriggers.usageBasedRotation &&
      this.config.rotationTriggers.maxUsageCount &&
      currentVersion.usageCount >= this.config.rotationTriggers.maxUsageCount
    ) {
      this.rotateKey(keyId, 'usage_limit').catch(error => {
        console.error(`Failed to rotate key ${keyId} due to usage limit:`, error);
      });
    }
  }

  /**
   * Mark key as compromised and immediately rotate
   */
  async markKeyCompromised(keyId: string, details?: Record<string, any>): Promise<string> {
    const currentVersion = this.getCurrentVersion(keyId);
    if (!currentVersion) {
      throw new Error(`Key not found: ${keyId}`);
    }

    // Immediately revoke current key
    currentVersion.status = 'revoked';
    currentVersion.rotatedAt = Date.now();

    // Rotate to new key
    const newKeyId = await this.rotateKey(keyId, 'compromise');

    const eventData: any = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type: 'rotation_completed',
      keyId,
      oldVersion: currentVersion.version,
      reason: 'compromise_detected',
      details: details || {},
    };
    
    const newVersion = this.getCurrentVersion(keyId)?.version;
    if (newVersion !== undefined) {
      eventData.newVersion = newVersion;
    }
    
    this.emitEvent(eventData);

    return newKeyId;
  }

  /**
   * Schedule key rotation notification
   */
  scheduleRotationNotification(keyId: string, callback: () => void): void {
    const currentVersion = this.getCurrentVersion(keyId);
    if (!currentVersion) return;

    const notificationTime = currentVersion.expiresAt - this.config.notification.beforeRotation;
    const delay = notificationTime - Date.now();

    if (delay > 0) {
      setTimeout(callback, delay);
    }
  }

  /**
   * Get rotation history
   */
  getRotationHistory(keyId?: string): RotationEvent[] {
    if (keyId) {
      return this.rotationEvents.filter(e => e.keyId === keyId);
    }
    return [...this.rotationEvents];
  }

  /**
   * Get keys approaching expiration
   */
  getKeysApproachingExpiration(threshold: number = 24 * 60 * 60 * 1000): KeyVersion[] {
    const now = Date.now();
    const approaching: KeyVersion[] = [];

    for (const versions of this.keyVersions.values()) {
      const current = versions.find(v => v.status === 'active');
      if (current && (current.expiresAt - now) <= threshold) {
        approaching.push(current);
      }
    }

    return approaching;
  }

  /**
   * Get expired keys
   */
  getExpiredKeys(): KeyVersion[] {
    const now = Date.now();
    const expired: KeyVersion[] = [];

    for (const versions of this.keyVersions.values()) {
      expired.push(...versions.filter(v => v.expiresAt <= now && v.status !== 'expired'));
    }

    return expired;
  }

  /**
   * Create key backup
   */
  private async createKeyBackup(keyId: string, version: KeyVersion): Promise<void> {
    if (!this.config.backup.enabled) return;

    try {
      // Export the key
      const keyData = await this.encryption.exportKey(keyId);
      
      // Encrypt backup if configured
      let encryptedKeyData: string;
      if (this.config.backup.encryptBackups) {
        // Use a master backup key (simplified - in production, use proper key management)
        const backupKeyId = await this.encryption.generateSymmetricKey();
        const encrypted = await this.encryption.encryptSymmetric(
          JSON.stringify(keyData), 
          backupKeyId
        );
        encryptedKeyData = AdvancedEncryption.encryptedDataToJSON(encrypted);
      } else {
        encryptedKeyData = JSON.stringify(keyData);
      }

      // Calculate checksum
      const encoder = new TextEncoder();
      const data = encoder.encode(encryptedKeyData);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const checksum = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const backup: KeyBackup = {
        backupId: this.generateBackupId(),
        keyId,
        version: version.version,
        createdAt: Date.now(),
        expiresAt: Date.now() + this.config.backup.retentionPeriod,
        encryptedKeyData,
        algorithm: version.algorithm,
        checksum,
      };

      const backups = this.keyBackups.get(keyId) || [];
      backups.push(backup);
      this.keyBackups.set(keyId, backups);

    } catch (error) {
      console.error(`Failed to create backup for key ${keyId}:`, error);
    }
  }

  /**
   * Restore key from backup
   */
  async restoreKeyFromBackup(keyId: string, version: number): Promise<string> {
    const backups = this.keyBackups.get(keyId);
    if (!backups) {
      throw new Error(`No backups found for key: ${keyId}`);
    }

    const backup = backups.find(b => b.version === version);
    if (!backup) {
      throw new Error(`Backup not found for key ${keyId} version ${version}`);
    }

    // Verify checksum
    const encoder = new TextEncoder();
    const data = encoder.encode(backup.encryptedKeyData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const checksum = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (checksum !== backup.checksum) {
      throw new Error('Backup integrity check failed');
    }

    // Decrypt and restore key
    let keyData: any;
    if (this.config.backup.encryptBackups) {
      // Simplified - in production, properly manage backup encryption keys
      const encrypted = AdvancedEncryption.encryptedDataFromJSON(backup.encryptedKeyData);
      const decrypted = await this.encryption.decryptSymmetric(encrypted);
      keyData = JSON.parse(new TextDecoder().decode(decrypted));
    } else {
      keyData = JSON.parse(backup.encryptedKeyData);
    }

    // Import the restored key
    const restoredKeyId = await this.encryption.importKey(
      keyData,
      backup.algorithm,
      undefined,
      ['encrypt', 'decrypt']
    );

    return restoredKeyId;
  }

  /**
   * Clean up expired backups
   */
  cleanupExpiredBackups(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [keyId, backups] of this.keyBackups.entries()) {
      const validBackups = backups.filter(backup => {
        if (backup.expiresAt <= now) {
          cleanedCount++;
          return false;
        }
        return true;
      });

      if (validBackups.length !== backups.length) {
        this.keyBackups.set(keyId, validBackups);
      }
    }

    return cleanedCount;
  }

  /**
   * Add event listener
   */
  addEventListener(type: string, listener: (event: RotationEvent) => void): void {
    const listeners = this.eventListeners.get(type) || [];
    listeners.push(listener);
    this.eventListeners.set(type, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(type: string, listener: (event: RotationEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get rotation statistics
   */
  getRotationStatistics(): {
    totalKeys: number;
    activeKeys: number;
    deprecatedKeys: number;
    revokedKeys: number;
    expiredKeys: number;
    totalRotations: number;
    averageKeyAge: number;
    upcomingRotations: number;
  } {
    let totalKeys = 0;
    let activeKeys = 0;
    let deprecatedKeys = 0;
    let revokedKeys = 0;
    let expiredKeys = 0;
    let totalAge = 0;

    const now = Date.now();

    for (const versions of this.keyVersions.values()) {
      for (const version of versions) {
        totalKeys++;
        switch (version.status) {
          case 'active':
            activeKeys++;
            break;
          case 'deprecated':
            deprecatedKeys++;
            break;
          case 'revoked':
            revokedKeys++;
            break;
          case 'expired':
            expiredKeys++;
            break;
        }
        totalAge += now - version.createdAt;
      }
    }

    const totalRotations = this.rotationEvents.filter(e => e.type === 'rotation_completed').length;
    const averageKeyAge = totalKeys > 0 ? totalAge / totalKeys : 0;
    const upcomingRotations = this.getKeysApproachingExpiration().length;

    return {
      totalKeys,
      activeKeys,
      deprecatedKeys,
      revokedKeys,
      expiredKeys,
      totalRotations,
      averageKeyAge,
      upcomingRotations,
    };
  }

  private scheduleRotation(keyId: string, delay: number): void {
    // Clear existing schedule
    const existingTimeout = this.rotationSchedule.get(keyId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new rotation
    const timeout = setTimeout(async () => {
      try {
        await this.rotateKey(keyId, 'scheduled');
      } catch (error) {
        console.error(`Scheduled rotation failed for key ${keyId}:`, error);
      }
    }, delay) as unknown as NodeJS.Timeout;

    this.rotationSchedule.set(keyId, timeout);
  }

  private expireKeyVersion(keyId: string, version: number): void {
    const versions = this.keyVersions.get(keyId);
    if (!versions) return;

    const keyVersion = versions.find(v => v.version === version);
    if (keyVersion && keyVersion.status === 'deprecated') {
      keyVersion.status = 'expired';
    }
  }

  private initializeRotationScheduler(): void {
    // Set up periodic cleanup of expired keys
    setInterval(() => {
      this.cleanupExpiredBackups();
      
      // Mark expired keys
      const expiredKeys = this.getExpiredKeys();
      for (const key of expiredKeys) {
        key.status = 'expired';
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private emitEvent(event: RotationEvent): void {
    this.rotationEvents.push(event);
    
    // Keep only last 1000 events
    if (this.rotationEvents.length > 1000) {
      this.rotationEvents = this.rotationEvents.slice(-1000);
    }

    // Emit to listeners
    const listeners = this.eventListeners.get(event.type) || [];
    const allListeners = this.eventListeners.get('*') || [];
    
    [...listeners, ...allListeners].forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in rotation event listener:', error);
      }
    });
  }

  private generateEventId(): string {
    return `rot_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateBackupId(): string {
    return `bak_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}