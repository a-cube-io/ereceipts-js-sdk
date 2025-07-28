/**
 * PWA App Installer for A-Cube E-Receipt SDK
 * Handles Progressive Web App installation prompts and app lifecycle
 * 
 * Features:
 * - Smart install prompt timing
 * - Custom install UI components
 * - Install criteria checking
 * - A2HS (Add to Home Screen) support
 * - Installation analytics
 * - Multi-platform support
 */

import { EventEmitter } from 'eventemitter3';

/**
 * Install prompt criteria
 */
export interface InstallCriteria {
  /** Minimum user engagement time (ms) */
  minEngagementTime?: number;
  
  /** Minimum page views */
  minPageViews?: number;
  
  /** Minimum receipts created */
  minReceiptsCreated?: number;
  
  /** Days since first visit */
  daysSinceFirstVisit?: number;
  
  /** Require return visits */
  requireReturnVisit?: boolean;
  
  /** Custom criteria function */
  customCriteria?: () => boolean | Promise<boolean>;
}

/**
 * Install prompt configuration
 */
export interface AppInstallerConfig {
  /** Install criteria */
  criteria?: InstallCriteria;
  
  /** Auto-show prompt when criteria met */
  autoShow?: boolean;
  
  /** Delay before showing prompt (ms) */
  showDelay?: number;
  
  /** Max times to show prompt */
  maxPromptAttempts?: number;
  
  /** Days to wait after dismissal */
  dismissalCooldown?: number;
  
  /** Custom prompt UI */
  customPrompt?: {
    enabled?: boolean;
    title?: string;
    message?: string;
    installButtonText?: string;
    cancelButtonText?: string;
    icon?: string;
  };
  
  /** Installation tracking */
  analytics?: {
    enabled?: boolean;
    trackingId?: string;
    customEvents?: Record<string, any>;
  };
  
  /** Platform-specific settings */
  platforms?: {
    /** iOS Safari specific */
    ios?: {
      showIOSInstructions?: boolean;
      customInstructions?: string;
    };
    
    /** Android Chrome specific */
    android?: {
      enableWebAPK?: boolean;
      customIcon?: string;
    };
    
    /** Desktop specific */
    desktop?: {
      showDesktopPrompt?: boolean;
      position?: 'top' | 'bottom' | 'center';
    };
  };
}

/**
 * Installation events
 */
export interface AppInstallerEvents {
  'criteria:met': { criteria: InstallCriteria };
  'prompt:available': { prompt: BeforeInstallPromptEvent };
  'prompt:shown': { type: 'native' | 'custom' };
  'prompt:dismissed': { reason: 'user' | 'timeout' | 'error' };
  'install:started': { platform: string };
  'install:completed': { outcome: 'accepted' | 'dismissed'; platform: string };
  'install:failed': { error: Error; platform: string };
  'analytics:tracked': { event: string; data: any };
}

/**
 * User engagement tracking
 */
export interface EngagementData {
  firstVisit: number;
  lastVisit: number;
  totalTime: number;
  pageViews: number;
  receiptsCreated: number;
  returnVisits: number;
  promptsShown: number;
  lastPromptShown?: number;
  dismissed: boolean;
  installed: boolean;
}

/**
 * Platform detection
 */
interface PlatformInfo {
  name: 'ios' | 'android' | 'desktop' | 'unknown';
  browser: string;
  version: string;
  supportsNativePrompt: boolean;
  supportsWebAPK: boolean;
  isStandalone: boolean;
}

/**
 * Enhanced BeforeInstallPromptEvent interface
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DEFAULT_CONFIG: Required<AppInstallerConfig> = {
  criteria: {
    minEngagementTime: 2 * 60 * 1000, // 2 minutes
    minPageViews: 3,
    minReceiptsCreated: 1,
    daysSinceFirstVisit: 0,
    requireReturnVisit: false,
  },
  autoShow: true,
  showDelay: 5000, // 5 seconds
  maxPromptAttempts: 3,
  dismissalCooldown: 7, // 7 days
  customPrompt: {
    enabled: true,
    title: 'Installa A-Cube E-Receipt',
    message: 'Installa l\'app per accedere rapidamente ai tuoi scontrini elettronici',
    installButtonText: 'Installa',
    cancelButtonText: 'Non ora',
    icon: '/icons/install-icon.png',
  },
  analytics: {
    enabled: true,
    trackingId: '',
    customEvents: {},
  },
  platforms: {
    ios: {
      showIOSInstructions: true,
      customInstructions: 'Tocca il pulsante Condividi e seleziona "Aggiungi alla schermata Home"',
    },
    android: {
      enableWebAPK: true,
      customIcon: '/icons/android-install.png',
    },
    desktop: {
      showDesktopPrompt: true,
      position: 'bottom',
    },
  },
};

/**
 * PWA App Installer
 * Manages app installation prompts and user engagement tracking
 */
export class AppInstaller extends EventEmitter<AppInstallerEvents> {
  private config: Required<AppInstallerConfig>;
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private engagementData: EngagementData;
  private platformInfo: PlatformInfo;
  private isInitialized = false;
  private engagementTimer?: NodeJS.Timeout;
  private promptTimeout: NodeJS.Timeout | undefined = undefined;
  private customPromptElement: HTMLElement | undefined = undefined;

  constructor(config: AppInstallerConfig = {}) {
    super();
    this.config = this.mergeConfig(config);
    this.platformInfo = this.detectPlatform();
    this.engagementData = this.loadEngagementData();
    
    this.initialize();
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config: AppInstallerConfig): Required<AppInstallerConfig> {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      criteria: {
        ...DEFAULT_CONFIG.criteria,
        ...config.criteria,
      },
      customPrompt: {
        ...DEFAULT_CONFIG.customPrompt,
        ...config.customPrompt,
      },
      analytics: {
        ...DEFAULT_CONFIG.analytics,
        ...config.analytics,
      },
      platforms: {
        ios: {
          ...DEFAULT_CONFIG.platforms.ios,
          ...config.platforms?.ios,
        },
        android: {
          ...DEFAULT_CONFIG.platforms.android,
          ...config.platforms?.android,
        },
        desktop: {
          ...DEFAULT_CONFIG.platforms.desktop,
          ...config.platforms?.desktop,
        },
      },
    };
  }

  /**
   * Initialize the app installer
   */
  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Skip if already installed
    if (this.platformInfo.isStandalone || this.engagementData.installed) {
      return;
    }

    // Setup event listeners
    this.setupEventListeners();
    
    // Start engagement tracking
    this.startEngagementTracking();
    
    // Check criteria periodically
    this.startCriteriaChecking();
    
    this.isInitialized = true;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // BeforeInstallPrompt event
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event as BeforeInstallPromptEvent;
      this.emit('prompt:available', { prompt: this.installPrompt });
      
      if (this.config.autoShow) {
        this.checkCriteriaAndShow();
      }
    });

    // App installed event
    window.addEventListener('appinstalled', () => {
      this.handleAppInstalled('accepted');
    });

    // Page visibility for engagement tracking
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseEngagementTracking();
      } else {
        this.resumeEngagementTracking();
        this.updateEngagementData({ pageViews: this.engagementData.pageViews + 1 });
      }
    });

    // Beforeunload for saving engagement data
    window.addEventListener('beforeunload', () => {
      this.saveEngagementData();
    });
  }

  /**
   * Detect platform information
   */
  private detectPlatform(): PlatformInfo {
    const userAgent = navigator.userAgent;
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    let platform: PlatformInfo['name'] = 'unknown';
    let browser = 'unknown';
    let version = '';

    // iOS detection
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      platform = 'ios';
      browser = /Safari/.test(userAgent) ? 'safari' : 'other';
      const match = userAgent.match(/OS (\d+)_(\d+)/);
      version = match ? `${match[1]}.${match[2]}` : '';
    }
    // Android detection
    else if (/Android/.test(userAgent)) {
      platform = 'android';
      browser = /Chrome/.test(userAgent) ? 'chrome' : 'other';
      const match = userAgent.match(/Android (\d+\.\d+)/);
      version = match && match[1] ? match[1] : '';
    }
    // Desktop detection
    else {
      platform = 'desktop';
      if (/Chrome/.test(userAgent)) browser = 'chrome';
      else if (/Firefox/.test(userAgent)) browser = 'firefox';
      else if (/Safari/.test(userAgent)) browser = 'safari';
      else if (/Edge/.test(userAgent)) browser = 'edge';
    }

    return {
      name: platform,
      browser,
      version,
      supportsNativePrompt: platform === 'android' || platform === 'desktop',
      supportsWebAPK: platform === 'android' && browser === 'chrome',
      isStandalone,
    };
  }

  /**
   * Load engagement data from storage
   */
  private loadEngagementData(): EngagementData {
    try {
      const stored = localStorage.getItem('acube_install_engagement');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load engagement data:', error);
    }

    // Default engagement data
    const now = Date.now();
    return {
      firstVisit: now,
      lastVisit: now,
      totalTime: 0,
      pageViews: 1,
      receiptsCreated: 0,
      returnVisits: 0,
      promptsShown: 0,
      dismissed: false,
      installed: false,
    };
  }

  /**
   * Save engagement data to storage
   */
  private saveEngagementData(): void {
    try {
      localStorage.setItem('acube_install_engagement', JSON.stringify(this.engagementData));
    } catch (error) {
      console.warn('Failed to save engagement data:', error);
    }
  }

  /**
   * Update engagement data
   */
  private updateEngagementData(updates: Partial<EngagementData>): void {
    this.engagementData = { ...this.engagementData, ...updates };
    this.saveEngagementData();
  }

  /**
   * Start engagement tracking
   */
  private startEngagementTracking(): void {
    const now = Date.now();
    
    // Check if this is a return visit
    if (now - this.engagementData.lastVisit > 24 * 60 * 60 * 1000) {
      this.updateEngagementData({ 
        returnVisits: this.engagementData.returnVisits + 1,
        lastVisit: now,
      });
    }

    // Start timing
    this.engagementTimer = setInterval(() => {
      if (!document.hidden) {
        this.updateEngagementData({
          totalTime: this.engagementData.totalTime + 1000,
        });
      }
    }, 1000);
  }

  /**
   * Pause engagement tracking
   */
  private pauseEngagementTracking(): void {
    if (this.engagementTimer) {
      clearInterval(this.engagementTimer);
    }
  }

  /**
   * Resume engagement tracking
   */
  private resumeEngagementTracking(): void {
    if (!this.engagementTimer) {
      this.startEngagementTracking();
    }
  }

  /**
   * Start criteria checking
   */
  private startCriteriaChecking(): void {
    // Check immediately
    setTimeout(() => {
      this.checkCriteriaAndShow();
    }, this.config.showDelay);

    // Check periodically
    setInterval(() => {
      this.checkCriteriaAndShow();
    }, 30000); // Every 30 seconds
  }

  /**
   * Check if install criteria are met
   */
  async checkCriteria(): Promise<boolean> {
    const { criteria } = this.config;
    const { engagementData } = this;

    // Skip if already prompted too many times
    if (engagementData.promptsShown >= this.config.maxPromptAttempts) {
      return false;
    }

    // Skip if recently dismissed
    if (engagementData.lastPromptShown) {
      const daysSinceLastPrompt = (Date.now() - engagementData.lastPromptShown) / (24 * 60 * 60 * 1000);
      if (daysSinceLastPrompt < this.config.dismissalCooldown) {
        return false;
      }
    }

    // Check engagement time
    if (criteria.minEngagementTime && engagementData.totalTime < criteria.minEngagementTime) {
      return false;
    }

    // Check page views
    if (criteria.minPageViews && engagementData.pageViews < criteria.minPageViews) {
      return false;
    }

    // Check receipts created
    if (criteria.minReceiptsCreated && engagementData.receiptsCreated < criteria.minReceiptsCreated) {
      return false;
    }

    // Check days since first visit
    if (criteria.daysSinceFirstVisit) {
      const daysSinceFirst = (Date.now() - engagementData.firstVisit) / (24 * 60 * 60 * 1000);
      if (daysSinceFirst < criteria.daysSinceFirstVisit) {
        return false;
      }
    }

    // Check return visit requirement
    if (criteria.requireReturnVisit && engagementData.returnVisits === 0) {
      return false;
    }

    // Check custom criteria
    if (criteria.customCriteria) {
      const customResult = await criteria.customCriteria();
      if (!customResult) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check criteria and show prompt if met
   */
  private async checkCriteriaAndShow(): Promise<void> {
    if (!this.installPrompt && !this.config.customPrompt.enabled) {
      return;
    }

    try {
      const criteriaMet = await this.checkCriteria();
      
      if (criteriaMet) {
        this.emit('criteria:met', { criteria: this.config.criteria });
        
        if (this.platformInfo.supportsNativePrompt && this.installPrompt) {
          await this.showNativePrompt();
        } else if (this.config.customPrompt.enabled) {
          await this.showCustomPrompt();
        }
      }
    } catch (error) {
      console.error('Error checking install criteria:', error);
    }
  }

  /**
   * Show native install prompt
   */
  async showNativePrompt(): Promise<void> {
    if (!this.installPrompt) {
      throw new Error('Native install prompt not available');
    }

    try {
      this.updateEngagementData({
        promptsShown: this.engagementData.promptsShown + 1,
        lastPromptShown: Date.now(),
      });

      this.emit('prompt:shown', { type: 'native' });
      this.trackAnalytics('install_prompt_shown', { type: 'native' });

      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;

      this.emit('install:completed', {
        outcome: choiceResult.outcome,
        platform: choiceResult.platform,
      });

      this.trackAnalytics('install_prompt_result', {
        outcome: choiceResult.outcome,
        platform: choiceResult.platform,
      });

      if (choiceResult.outcome === 'accepted') {
        this.handleAppInstalled('accepted');
      } else {
        this.handlePromptDismissed('user');
      }

      this.installPrompt = null;
    } catch (error) {
      this.emit('install:failed', { 
        error: error as Error, 
        platform: this.platformInfo.name 
      });
      this.trackAnalytics('install_prompt_error', { error: (error as Error).message });
    }
  }

  /**
   * Show custom install prompt
   */
  async showCustomPrompt(): Promise<void> {
    if (this.customPromptElement) {
      return; // Already showing
    }

    try {
      this.updateEngagementData({
        promptsShown: this.engagementData.promptsShown + 1,
        lastPromptShown: Date.now(),
      });

      this.emit('prompt:shown', { type: 'custom' });
      this.trackAnalytics('install_prompt_shown', { type: 'custom' });

      // Create custom prompt UI
      this.customPromptElement = this.createCustomPromptUI();
      document.body.appendChild(this.customPromptElement);

      // Auto-dismiss after timeout
      this.promptTimeout = setTimeout(() => {
        this.hideCustomPrompt();
        this.handlePromptDismissed('timeout');
      }, 30000); // 30 seconds

    } catch (error) {
      this.emit('install:failed', { 
        error: error as Error, 
        platform: this.platformInfo.name 
      });
    }
  }

  /**
   * Create custom prompt UI
   */
  private createCustomPromptUI(): HTMLElement {
    const { customPrompt, platforms } = this.config;
    
    // Main container
    const container = document.createElement('div');
    container.className = 'acube-install-prompt';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      padding: 20px;
      max-width: 360px;
      width: calc(100% - 40px);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation keyframes
    if (!document.getElementById('acube-install-styles')) {
      const style = document.createElement('style');
      style.id = 'acube-install-styles';
      style.textContent = `
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .acube-install-prompt button {
          border: none;
          border-radius: 6px;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .acube-install-prompt button:hover {
          transform: translateY(-1px);
        }
      `;
      document.head.appendChild(style);
    }

    // Icon
    if (customPrompt.icon) {
      const icon = document.createElement('img');
      icon.src = customPrompt.icon;
      icon.style.cssText = 'width: 48px; height: 48px; border-radius: 8px; margin-bottom: 12px;';
      container.appendChild(icon);
    }

    // Title
    const title = document.createElement('h3');
    title.textContent = customPrompt.title || 'Installa App';
    title.style.cssText = 'margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;';
    container.appendChild(title);

    // Message
    const message = document.createElement('p');
    let messageText = customPrompt.message || 'Installa l\'app per un accesso più veloce';
    
    // Platform-specific messages
    if (this.platformInfo.name === 'ios' && platforms.ios?.showIOSInstructions) {
      messageText = platforms.ios?.customInstructions || messageText;
    }
    
    message.textContent = messageText;
    message.style.cssText = 'margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.4;';
    container.appendChild(message);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';

    // Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = customPrompt.cancelButtonText || 'Non ora';
    cancelButton.style.cssText = 'background: #f5f5f5; color: #666;';
    cancelButton.onclick = () => {
      this.hideCustomPrompt();
      this.handlePromptDismissed('user');
    };
    buttonsContainer.appendChild(cancelButton);

    // Install button
    const installButton = document.createElement('button');
    installButton.textContent = customPrompt.installButtonText || 'Installa';
    installButton.style.cssText = 'background: #1976d2; color: white;';
    installButton.onclick = () => {
      this.hideCustomPrompt();
      this.handleCustomInstall();
    };
    buttonsContainer.appendChild(installButton);

    container.appendChild(buttonsContainer);

    return container;
  }

  /**
   * Hide custom prompt
   */
  private hideCustomPrompt(): void {
    if (this.customPromptElement) {
      this.customPromptElement.remove();
      this.customPromptElement = undefined;
    }
    
    if (this.promptTimeout) {
      clearTimeout(this.promptTimeout);
      this.promptTimeout = undefined;
    }
  }

  /**
   * Handle custom install button click
   */
  private async handleCustomInstall(): Promise<void> {
    if (this.installPrompt) {
      // Use native prompt if available
      await this.showNativePrompt();
    } else {
      // Show platform-specific instructions
      this.showInstallInstructions();
    }
  }

  /**
   * Show platform-specific install instructions
   */
  private showInstallInstructions(): void {
    let instructions = '';
    
    switch (this.platformInfo.name) {
      case 'ios':
        instructions = this.config.platforms.ios?.customInstructions ||
          'Tocca il pulsante Condividi (⬆️) e seleziona "Aggiungi alla schermata Home"';
        break;
      case 'android':
        instructions = 'Apri il menu del browser e seleziona "Aggiungi alla schermata Home"';
        break;
      case 'desktop':
        instructions = 'Cerca l\'icona di installazione nella barra degli indirizzi del browser';
        break;
      default:
        instructions = 'Controlla le opzioni del tuo browser per installare questa app';
    }

    // Show instructions in a simple alert or modal
    alert(instructions);
    
    this.emit('install:started', { platform: this.platformInfo.name });
    this.trackAnalytics('install_instructions_shown', { 
      platform: this.platformInfo.name,
      instructions 
    });
  }

  /**
   * Handle app installed
   */
  private handleAppInstalled(outcome: 'accepted' | 'dismissed'): void {
    this.updateEngagementData({ installed: true });
    
    this.emit('install:completed', { 
      outcome, 
      platform: this.platformInfo.name 
    });
    
    this.trackAnalytics('app_installed', { 
      platform: this.platformInfo.name,
      outcome 
    });
  }

  /**
   * Handle prompt dismissed
   */
  private handlePromptDismissed(reason: 'user' | 'timeout' | 'error'): void {
    this.updateEngagementData({ dismissed: true });
    
    this.emit('prompt:dismissed', { reason });
    this.trackAnalytics('install_prompt_dismissed', { reason });
  }

  /**
   * Track analytics event
   */
  private trackAnalytics(event: string, data: any): void {
    if (!this.config.analytics.enabled) {
      return;
    }

    const analyticsData = {
      ...data,
      timestamp: new Date().toISOString(),
      platform: this.platformInfo.name,
      browser: this.platformInfo.browser,
      engagement: this.engagementData,
      ...this.config.analytics.customEvents,
    };

    this.emit('analytics:tracked', { event, data: analyticsData });

    // Send to analytics service (implement based on your analytics provider)
    if (typeof gtag !== 'undefined') {
      gtag('event', event, analyticsData);
    }
  }

  /**
   * Record receipt created (for engagement tracking)
   */
  recordReceiptCreated(): void {
    this.updateEngagementData({
      receiptsCreated: this.engagementData.receiptsCreated + 1,
    });
  }

  /**
   * Manually trigger install prompt
   */
  async showInstallPrompt(): Promise<void> {
    if (this.platformInfo.supportsNativePrompt && this.installPrompt) {
      await this.showNativePrompt();
    } else if (this.config.customPrompt.enabled) {
      await this.showCustomPrompt();
    } else {
      this.showInstallInstructions();
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return !this.platformInfo.isStandalone && 
           !this.engagementData.installed &&
           (!!this.installPrompt || !!this.config.customPrompt?.enabled);
  }

  /**
   * Get engagement statistics
   */
  getEngagementStats(): EngagementData {
    return { ...this.engagementData };
  }

  /**
   * Get platform information
   */
  getPlatformInfo(): PlatformInfo {
    return { ...this.platformInfo };
  }

  /**
   * Reset engagement data (for testing)
   */
  resetEngagement(): void {
    const now = Date.now();
    this.engagementData = {
      firstVisit: now,
      lastVisit: now,
      totalTime: 0,
      pageViews: 1,
      receiptsCreated: 0,
      returnVisits: 0,
      promptsShown: 0,
      dismissed: false,
      installed: false,
    };
    this.saveEngagementData();
  }

  /**
   * Destroy the app installer
   */
  destroy(): void {
    if (this.engagementTimer) {
      clearInterval(this.engagementTimer);
    }
    
    if (this.promptTimeout) {
      clearTimeout(this.promptTimeout);
    }
    
    this.hideCustomPrompt();
    this.saveEngagementData();
    this.removeAllListeners();
  }
}

// Global gtag declaration for TypeScript
declare const gtag: any;