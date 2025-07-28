/**
 * PWA Manifest Generator for A-Cube E-Receipt SDK
 * Generates Progressive Web App manifest.json files with Italian e-receipt specific configuration
 * 
 * Features:
 * - Dynamic manifest generation
 * - Italian localization support
 * - E-receipt specific shortcuts and categories
 * - Theme customization
 * - Icon generation support
 */

/**
 * PWA Manifest configuration
 */
export interface PWAManifestConfig {
  /** App name */
  name?: string;
  
  /** Short app name for home screen */
  shortName?: string;
  
  /** App description */
  description?: string;
  
  /** App start URL */
  startUrl?: string;
  
  /** App scope */
  scope?: string;
  
  /** Display mode */
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  
  /** Orientation preference */
  orientation?: 'any' | 'natural' | 'landscape' | 'portrait';
  
  /** Theme color */
  themeColor?: string;
  
  /** Background color */
  backgroundColor?: string;
  
  /** App language */
  lang?: string;
  
  /** App categories */
  categories?: string[];
  
  /** Screenshots for app stores */
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    platform?: 'narrow' | 'wide';
    label?: string;
  }>;
  
  /** App shortcuts */
  shortcuts?: Array<{
    name: string;
    url: string;
    description?: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type?: string;
    }>;
  }>;
  
  /** Custom icons */
  icons?: Array<{
    src: string;
    sizes: string;
    type?: string;
    purpose?: 'any' | 'maskable' | 'monochrome';
  }>;
}

/**
 * Web App Manifest interface
 */
export interface WebAppManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  background_color: string;
  lang: string;
  categories: string[];
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    platform?: string;
    label?: string;
  }>;
  shortcuts?: Array<{
    name: string;
    url: string;
    description?: string;
    icons?: Array<{
      src: string;
      sizes: string;
      type?: string;
    }>;
  }>;
  prefer_related_applications?: boolean;
  related_applications?: Array<{
    platform: string;
    url: string;
    id?: string;
  }>;
}

/**
 * Default manifest configuration for Italian e-receipt apps
 */
const DEFAULT_MANIFEST_CONFIG: Required<PWAManifestConfig> = {
  name: 'A-Cube E-Receipt',
  shortName: 'A-Cube',
  description: 'Gestione scontrini elettronici per il sistema fiscale italiano',
  startUrl: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  themeColor: '#1976d2',
  backgroundColor: '#ffffff',
  lang: 'it',
  categories: ['business', 'finance', 'productivity'],
  icons: [
    {
      src: '/icons/icon-72x72.png',
      sizes: '72x72',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-96x96.png',
      sizes: '96x96',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-128x128.png',
      sizes: '128x128',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-144x144.png',
      sizes: '144x144',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-152x152.png',
      sizes: '152x152',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-384x384.png',
      sizes: '384x384',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/icons/maskable-icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: '/icons/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  screenshots: [
    {
      src: '/screenshots/desktop.png',
      sizes: '1280x720',
      type: 'image/png',
      platform: 'wide',
      label: 'Desktop view of A-Cube E-Receipt dashboard',
    },
    {
      src: '/screenshots/mobile.png',
      sizes: '750x1334',
      type: 'image/png',
      platform: 'narrow',
      label: 'Mobile view of A-Cube E-Receipt',
    },
  ],
  shortcuts: [
    {
      name: 'Nuovo Scontrino',
      url: '/receipts/new',
      description: 'Crea un nuovo scontrino elettronico',
      icons: [
        {
          src: '/icons/new-receipt-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Dashboard',
      url: '/dashboard',
      description: 'Visualizza il pannello di controllo',
      icons: [
        {
          src: '/icons/dashboard-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Storico',
      url: '/receipts/history',
      description: 'Consulta lo storico degli scontrini',
      icons: [
        {
          src: '/icons/history-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
    {
      name: 'Impostazioni',
      url: '/settings',
      description: 'Gestisci le impostazioni dell\'applicazione',
      icons: [
        {
          src: '/icons/settings-96x96.png',
          sizes: '96x96',
          type: 'image/png',
        },
      ],
    },
  ],
};

/**
 * PWA Manifest Generator
 * Creates and manages Progressive Web App manifest files
 */
export class ManifestGenerator {
  private config: Required<PWAManifestConfig>;

  constructor(config: PWAManifestConfig = {}) {
    this.config = { ...DEFAULT_MANIFEST_CONFIG, ...config };
  }

  /**
   * Generate web app manifest
   */
  generateManifest(): WebAppManifest {
    const manifest: WebAppManifest = {
      name: this.config.name,
      short_name: this.config.shortName,
      description: this.config.description,
      start_url: this.config.startUrl,
      scope: this.config.scope,
      display: this.config.display,
      orientation: this.config.orientation,
      theme_color: this.config.themeColor,
      background_color: this.config.backgroundColor,
      lang: this.config.lang,
      categories: this.config.categories,
      icons: this.config.icons.map(icon => ({
        src: icon.src,
        sizes: icon.sizes,
        type: icon.type || 'image/png',
        ...(icon.purpose && { purpose: icon.purpose }),
      })),
    };

    // Add optional properties
    if (this.config.screenshots && this.config.screenshots.length > 0) {
      manifest.screenshots = this.config.screenshots.map(screenshot => ({
        src: screenshot.src,
        sizes: screenshot.sizes,
        type: screenshot.type,
        ...(screenshot.platform && { platform: screenshot.platform }),
        ...(screenshot.label && { label: screenshot.label }),
      }));
    }

    if (this.config.shortcuts && this.config.shortcuts.length > 0) {
      manifest.shortcuts = this.config.shortcuts.map(shortcut => ({
        name: shortcut.name,
        url: shortcut.url,
        ...(shortcut.description && { description: shortcut.description }),
        ...(shortcut.icons && { icons: shortcut.icons.map(icon => ({
          src: icon.src,
          sizes: icon.sizes,
          ...(icon.type && { type: icon.type }),
        })) }),
      }));
    }

    return manifest;
  }

  /**
   * Generate manifest as JSON string
   */
  generateManifestJSON(): string {
    return JSON.stringify(this.generateManifest(), null, 2);
  }

  /**
   * Generate HTML meta tags for PWA
   */
  generateHTMLMetaTags(): string {
    const manifest = this.generateManifest();
    const tags: string[] = [];

    // Basic PWA meta tags
    tags.push(`<meta name="application-name" content="${manifest.name}">`);
    tags.push(`<meta name="theme-color" content="${manifest.theme_color}">`);
    tags.push(`<meta name="description" content="${manifest.description}">`);

    // Viewport
    tags.push('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');

    // Manifest link
    tags.push('<link rel="manifest" href="/manifest.json">');

    // Apple-specific meta tags
    tags.push('<meta name="apple-mobile-web-app-capable" content="yes">');
    tags.push(`<meta name="apple-mobile-web-app-title" content="${manifest.short_name}">`);
    tags.push('<meta name="apple-mobile-web-app-status-bar-style" content="default">');

    // Apple touch icons
    const appleIcons = manifest.icons.filter(icon => 
      ['152x152', '180x180', '192x192'].includes(icon.sizes)
    );
    
    appleIcons.forEach(icon => {
      tags.push(`<link rel="apple-touch-icon" sizes="${icon.sizes}" href="${icon.src}">`);
    });

    // Favicon
    const favicon = manifest.icons.find(icon => icon.sizes === '32x32') || manifest.icons[0];
    if (favicon) {
      tags.push(`<link rel="icon" type="${favicon.type}" href="${favicon.src}">`);
    }

    // Microsoft-specific
    tags.push(`<meta name="msapplication-TileColor" content="${manifest.theme_color}">`);
    const msIcon = manifest.icons.find(icon => icon.sizes === '144x144');
    if (msIcon) {
      tags.push(`<meta name="msapplication-TileImage" content="${msIcon.src}">`);
    }

    return tags.join('\n');
  }

  /**
   * Generate service worker registration script
   */
  generateServiceWorkerScript(serviceWorkerPath: string = '/sw.js'): string {
    return `
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('${serviceWorkerPath}')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
</script>`.trim();
  }

  /**
   * Update manifest configuration
   */
  updateConfig(updates: Partial<PWAManifestConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<PWAManifestConfig> {
    return { ...this.config };
  }

  /**
   * Generate localized manifest for different languages
   */
  generateLocalizedManifest(locale: string): WebAppManifest {
    const localizedConfig = this.getLocalizedConfig(locale);
    const generator = new ManifestGenerator(localizedConfig);
    return generator.generateManifest();
  }

  /**
   * Get localized configuration
   */
  private getLocalizedConfig(locale: string): PWAManifestConfig {
    const localizations: Record<string, Partial<PWAManifestConfig>> = {
      'en': {
        name: 'A-Cube E-Receipt',
        shortName: 'A-Cube',
        description: 'Electronic receipt management for Italian tax system',
        lang: 'en',
        shortcuts: [
          {
            name: 'New Receipt',
            url: '/receipts/new',
            description: 'Create a new electronic receipt',
          },
          {
            name: 'Dashboard',
            url: '/dashboard',
            description: 'View control panel',
          },
          {
            name: 'History',
            url: '/receipts/history',
            description: 'Browse receipt history',
          },
          {
            name: 'Settings',
            url: '/settings',
            description: 'Manage application settings',
          },
        ],
      },
      'de': {
        name: 'A-Cube E-Receipt',
        shortName: 'A-Cube',
        description: 'Elektronische Belegverwaltung für das italienische Steuersystem',
        lang: 'de',
        shortcuts: [
          {
            name: 'Neuer Beleg',
            url: '/receipts/new',
            description: 'Erstelle einen neuen elektronischen Beleg',
          },
          {
            name: 'Dashboard',
            url: '/dashboard',
            description: 'Kontrollpanel anzeigen',
          },
          {
            name: 'Verlauf',
            url: '/receipts/history',
            description: 'Belegverlauf durchsuchen',
          },
          {
            name: 'Einstellungen',
            url: '/settings',
            description: 'Anwendungseinstellungen verwalten',
          },
        ],
      },
      'fr': {
        name: 'A-Cube E-Receipt',
        shortName: 'A-Cube',
        description: 'Gestion des reçus électroniques pour le système fiscal italien',
        lang: 'fr',
        shortcuts: [
          {
            name: 'Nouveau Reçu',
            url: '/receipts/new',
            description: 'Créer un nouveau reçu électronique',
          },
          {
            name: 'Tableau de Bord',
            url: '/dashboard',
            description: 'Afficher le panneau de contrôle',
          },
          {
            name: 'Historique',
            url: '/receipts/history',
            description: 'Consulter l\'historique des reçus',
          },
          {
            name: 'Paramètres',
            url: '/settings',
            description: 'Gérer les paramètres de l\'application',
          },
        ],
      },
    };

    const localization = localizations[locale] || {};
    return { ...this.config, ...localization };
  }

  /**
   * Validate manifest configuration
   */
  validateManifest(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const manifest = this.generateManifest();

    // Required fields validation
    if (!manifest.name || manifest.name.length === 0) {
      errors.push('Manifest name is required');
    }

    if (!manifest.short_name || manifest.short_name.length === 0) {
      errors.push('Manifest short_name is required');
    }

    if (!manifest.start_url || manifest.start_url.length === 0) {
      errors.push('Manifest start_url is required');
    }

    // Icons validation
    if (!manifest.icons || manifest.icons.length === 0) {
      errors.push('At least one icon is required');
    } else {
      const hasRequiredSizes = manifest.icons.some(icon => 
        ['192x192', '512x512'].includes(icon.sizes)
      );
      if (!hasRequiredSizes) {
        errors.push('Icons with sizes 192x192 and 512x512 are recommended');
      }
    }

    // Display mode validation
    const validDisplayModes = ['standalone', 'fullscreen', 'minimal-ui', 'browser'];
    if (!validDisplayModes.includes(manifest.display)) {
      errors.push(`Invalid display mode: ${manifest.display}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate complete PWA setup files
   */
  generatePWAFiles(): { 
    manifest: string; 
    html: string; 
    serviceWorkerScript: string;
    validation: { isValid: boolean; errors: string[] };
  } {
    return {
      manifest: this.generateManifestJSON(),
      html: this.generateHTMLMetaTags(),
      serviceWorkerScript: this.generateServiceWorkerScript(),
      validation: this.validateManifest(),
    };
  }
}