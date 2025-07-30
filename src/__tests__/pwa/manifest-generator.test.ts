/**
 * Manifest Generator Tests
 * Comprehensive testing for PWA manifest generation functionality
 * including manifest creation, localization, validation, and HTML meta tag generation
 */

import { ManifestGenerator, type PWAManifestConfig, type WebAppManifest } from '@/pwa/manifest-generator';

describe('ManifestGenerator', () => {
  let manifestGenerator: ManifestGenerator;

  afterEach(() => {
    // Clean up any resources if needed
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      manifestGenerator = new ManifestGenerator();
      
      expect(manifestGenerator).toBeDefined();
      
      const config = manifestGenerator.getConfig();
      expect(config.name).toBe('A-Cube E-Receipt');
      expect(config.shortName).toBe('A-Cube');
      expect(config.lang).toBe('it');
      expect(config.themeColor).toBe('#1976d2');
      expect(config.backgroundColor).toBe('#ffffff');
      expect(config.display).toBe('standalone');
      expect(config.orientation).toBe('portrait');
    });

    it('should initialize with custom configuration', () => {
      const customConfig: PWAManifestConfig = {
        name: 'Custom E-Receipt App',
        shortName: 'Custom',
        description: 'Custom description for testing',
        startUrl: '/custom',
        scope: '/custom',
        display: 'fullscreen',
        orientation: 'landscape',
        themeColor: '#ff5722',
        backgroundColor: '#f5f5f5',
        lang: 'en',
        categories: ['business', 'utilities'],
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      
      const config = manifestGenerator.getConfig();
      expect(config.name).toBe('Custom E-Receipt App');
      expect(config.shortName).toBe('Custom');
      expect(config.description).toBe('Custom description for testing');
      expect(config.startUrl).toBe('/custom');
      expect(config.scope).toBe('/custom');
      expect(config.display).toBe('fullscreen');
      expect(config.orientation).toBe('landscape');
      expect(config.themeColor).toBe('#ff5722');
      expect(config.backgroundColor).toBe('#f5f5f5');
      expect(config.lang).toBe('en');
      expect(config.categories).toEqual(['business', 'utilities']);
    });

    it('should merge custom configuration with defaults correctly', () => {
      const partialConfig: PWAManifestConfig = {
        name: 'Partial Config App',
        themeColor: '#9c27b0',
      };

      manifestGenerator = new ManifestGenerator(partialConfig);
      
      const config = manifestGenerator.getConfig();
      expect(config.name).toBe('Partial Config App');
      expect(config.shortName).toBe('A-Cube'); // Default value
      expect(config.themeColor).toBe('#9c27b0');
      expect(config.backgroundColor).toBe('#ffffff'); // Default value
      expect(config.lang).toBe('it'); // Default value
    });

    it('should handle empty configuration object', () => {
      manifestGenerator = new ManifestGenerator({});
      
      const config = manifestGenerator.getConfig();
      expect(config.name).toBe('A-Cube E-Receipt');
      expect(config.shortName).toBe('A-Cube');
    });
  });

  describe('Manifest Generation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate valid WebAppManifest object', () => {
      const manifest: WebAppManifest = manifestGenerator.generateManifest();
      
      expect(manifest).toBeDefined();
      expect(manifest.name).toBe('A-Cube E-Receipt');
      expect(manifest.short_name).toBe('A-Cube');
      expect(manifest.description).toBe('Gestione scontrini elettronici per il sistema fiscale italiano');
      expect(manifest.start_url).toBe('/');
      expect(manifest.scope).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.orientation).toBe('portrait');
      expect(manifest.theme_color).toBe('#1976d2');
      expect(manifest.background_color).toBe('#ffffff');
      expect(manifest.lang).toBe('it');
      expect(manifest.categories).toEqual(['business', 'finance', 'productivity']);
    });

    it('should include all default icons with correct properties', () => {
      const manifest: WebAppManifest = manifestGenerator.generateManifest();
      
      expect(manifest.icons).toBeDefined();
      expect(manifest.icons.length).toBeGreaterThan(0);

      // Check for specific icon sizes
      const icon192 = manifest.icons.find(icon => icon.sizes === '192x192');
      expect(icon192).toBeDefined();
      expect(icon192!.src).toBe('/icons/icon-192x192.png');
      expect(icon192!.type).toBe('image/png');
      expect(icon192!.purpose).toBe('any');

      const icon512 = manifest.icons.find(icon => icon.sizes === '512x512');
      expect(icon512).toBeDefined();
      expect(icon512!.src).toBe('/icons/icon-512x512.png');
      expect(icon512!.type).toBe('image/png');
      expect(icon512!.purpose).toBe('any');

      // Check for maskable icons
      const maskableIcon192 = manifest.icons.find(icon => 
        icon.sizes === '192x192' && icon.purpose === 'maskable'
      );
      expect(maskableIcon192).toBeDefined();
      expect(maskableIcon192!.src).toBe('/icons/maskable-icon-192x192.png');

      const maskableIcon512 = manifest.icons.find(icon => 
        icon.sizes === '512x512' && icon.purpose === 'maskable'
      );
      expect(maskableIcon512).toBeDefined();
      expect(maskableIcon512!.src).toBe('/icons/maskable-icon-512x512.png');
    });

    it('should include default screenshots with correct properties', () => {
      const manifest: WebAppManifest = manifestGenerator.generateManifest();
      
      expect(manifest.screenshots).toBeDefined();
      expect(manifest.screenshots!.length).toBe(2);

      const desktopScreenshot = manifest.screenshots!.find(screenshot => 
        screenshot.platform === 'wide'
      );
      expect(desktopScreenshot).toBeDefined();
      expect(desktopScreenshot!.src).toBe('/screenshots/desktop.png');
      expect(desktopScreenshot!.sizes).toBe('1280x720');
      expect(desktopScreenshot!.type).toBe('image/png');
      expect(desktopScreenshot!.label).toBe('Desktop view of A-Cube E-Receipt dashboard');

      const mobileScreenshot = manifest.screenshots!.find(screenshot => 
        screenshot.platform === 'narrow'
      );
      expect(mobileScreenshot).toBeDefined();
      expect(mobileScreenshot!.src).toBe('/screenshots/mobile.png');
      expect(mobileScreenshot!.sizes).toBe('750x1334');
      expect(mobileScreenshot!.type).toBe('image/png');
      expect(mobileScreenshot!.label).toBe('Mobile view of A-Cube E-Receipt');
    });

    it('should include default shortcuts with correct properties', () => {
      const manifest: WebAppManifest = manifestGenerator.generateManifest();
      
      expect(manifest.shortcuts).toBeDefined();
      expect(manifest.shortcuts!.length).toBe(4);

      const newReceiptShortcut = manifest.shortcuts!.find(shortcut => 
        shortcut.url === '/receipts/new'
      );
      expect(newReceiptShortcut).toBeDefined();
      expect(newReceiptShortcut!.name).toBe('Nuovo Scontrino');
      expect(newReceiptShortcut!.description).toBe('Crea un nuovo scontrino elettronico');
      expect(newReceiptShortcut!.icons).toBeDefined();
      expect(newReceiptShortcut!.icons!.length).toBe(1);
      expect(newReceiptShortcut!.icons![0]?.src).toBe('/icons/new-receipt-96x96.png');
      expect(newReceiptShortcut!.icons![0]?.sizes).toBe('96x96');

      const dashboardShortcut = manifest.shortcuts!.find(shortcut => 
        shortcut.url === '/dashboard'
      );
      expect(dashboardShortcut).toBeDefined();
      expect(dashboardShortcut!.name).toBe('Dashboard');
      expect(dashboardShortcut!.description).toBe('Visualizza il pannello di controllo');

      const historyShortcut = manifest.shortcuts!.find(shortcut => 
        shortcut.url === '/receipts/history'
      );
      expect(historyShortcut).toBeDefined();
      expect(historyShortcut!.name).toBe('Storico');
      expect(historyShortcut!.description).toBe('Consulta lo storico degli scontrini');

      const settingsShortcut = manifest.shortcuts!.find(shortcut => 
        shortcut.url === '/settings'
      );
      expect(settingsShortcut).toBeDefined();
      expect(settingsShortcut!.name).toBe('Impostazioni');
      expect(settingsShortcut!.description).toBe('Gestisci le impostazioni dell\'applicazione');
    });

    it('should handle custom icons correctly', () => {
      const customConfig: PWAManifestConfig = {
        icons: [
          {
            src: '/custom-icon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/custom-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.icons).toEqual([
        {
          src: '/custom-icon-48x48.png',
          sizes: '48x48',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/custom-icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable',
        },
      ]);
    });

    it('should handle custom screenshots correctly', () => {
      const customConfig: PWAManifestConfig = {
        screenshots: [
          {
            src: '/custom-screenshot.png',
            sizes: '1920x1080',
            type: 'image/png',
            platform: 'wide',
            label: 'Custom screenshot',
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.screenshots).toEqual([
        {
          src: '/custom-screenshot.png',
          sizes: '1920x1080',
          type: 'image/png',
          platform: 'wide',
          label: 'Custom screenshot',
        },
      ]);
    });

    it('should handle custom shortcuts correctly', () => {
      const customConfig: PWAManifestConfig = {
        shortcuts: [
          {
            name: 'Custom Action',
            url: '/custom',
            description: 'Custom action description',
            icons: [
              {
                src: '/custom-shortcut-icon.png',
                sizes: '96x96',
                type: 'image/png',
              },
            ],
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.shortcuts).toEqual([
        {
          name: 'Custom Action',
          url: '/custom',
          description: 'Custom action description',
          icons: [
            {
              src: '/custom-shortcut-icon.png',
              sizes: '96x96',
              type: 'image/png',
            },
          ],
        },
      ]);
    });
  });

  describe('JSON Generation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate valid JSON string', () => {
      const manifestJSON = manifestGenerator.generateManifestJSON();
      
      expect(typeof manifestJSON).toBe('string');
      expect(() => JSON.parse(manifestJSON)).not.toThrow();
      
      const parsedManifest = JSON.parse(manifestJSON);
      expect(parsedManifest.name).toBe('A-Cube E-Receipt');
      expect(parsedManifest.short_name).toBe('A-Cube');
      expect(parsedManifest.icons).toBeDefined();
      expect(Array.isArray(parsedManifest.icons)).toBe(true);
    });

    it('should generate pretty-printed JSON', () => {
      const manifestJSON = manifestGenerator.generateManifestJSON();
      
      // Check if JSON is formatted (contains indentation)
      expect(manifestJSON).toContain('  ');
      expect(manifestJSON).toContain('\n');
    });
  });

  describe('HTML Meta Tags Generation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate basic PWA meta tags', () => {
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<meta name="application-name" content="A-Cube E-Receipt">');
      expect(metaTags).toContain('<meta name="theme-color" content="#1976d2">');
      expect(metaTags).toContain('<meta name="description" content="Gestione scontrini elettronici per il sistema fiscale italiano">');
      expect(metaTags).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');
      expect(metaTags).toContain('<link rel="manifest" href="/manifest.json">');
    });

    it('should generate Apple-specific meta tags', () => {
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<meta name="apple-mobile-web-app-capable" content="yes">');
      expect(metaTags).toContain('<meta name="apple-mobile-web-app-title" content="A-Cube">');
      expect(metaTags).toContain('<meta name="apple-mobile-web-app-status-bar-style" content="default">');
    });

    it('should generate Apple touch icons', () => {
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">');
      expect(metaTags).toContain('<link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png">');
    });

    it('should generate Microsoft-specific meta tags', () => {
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<meta name="msapplication-TileColor" content="#1976d2">');
      expect(metaTags).toContain('<meta name="msapplication-TileImage" content="/icons/icon-144x144.png">');
    });

    it('should generate favicon link', () => {
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<link rel="icon"');
      expect(metaTags).toContain('type="image/png"');
    });

    it('should handle custom theme colors in meta tags', () => {
      const customConfig: PWAManifestConfig = {
        themeColor: '#e91e63',
        shortName: 'CustomApp',
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      const metaTags = manifestGenerator.generateHTMLMetaTags();
      
      expect(metaTags).toContain('<meta name="theme-color" content="#e91e63">');
      expect(metaTags).toContain('<meta name="apple-mobile-web-app-title" content="CustomApp">');
      expect(metaTags).toContain('<meta name="msapplication-TileColor" content="#e91e63">');
    });
  });

  describe('Service Worker Script Generation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate default service worker registration script', () => {
      const script = manifestGenerator.generateServiceWorkerScript();
      
      expect(script).toContain('<script>');
      expect(script).toContain('</script>');
      expect(script).toContain('serviceWorker');
      expect(script).toContain('navigator.serviceWorker.register(\'/sw.js\')');
      expect(script).toContain('window.addEventListener(\'load\'');
      expect(script).toContain('console.log(\'SW registered: \'');
      expect(script).toContain('console.log(\'SW registration failed: \'');
    });

    it('should generate service worker script with custom path', () => {
      const customPath = '/custom-service-worker.js';
      const script = manifestGenerator.generateServiceWorkerScript(customPath);
      
      expect(script).toContain(`navigator.serviceWorker.register('${customPath}')`);
    });

    it('should generate properly formatted script tag', () => {
      const script = manifestGenerator.generateServiceWorkerScript();
      
      // Should not have leading/trailing whitespace
      expect(script.trim()).toBe(script);
      // Should contain proper indentation
      expect(script).toContain('  if (\'serviceWorker\' in navigator)');
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should update configuration correctly', () => {
      const updates: Partial<PWAManifestConfig> = {
        name: 'Updated App Name',
        themeColor: '#4caf50',
        categories: ['updated', 'categories'],
      };

      manifestGenerator.updateConfig(updates);
      
      const config = manifestGenerator.getConfig();
      expect(config.name).toBe('Updated App Name');
      expect(config.themeColor).toBe('#4caf50');
      expect(config.categories).toEqual(['updated', 'categories']);
      expect(config.shortName).toBe('A-Cube'); // Should preserve existing values
    });

    it('should generate updated manifest after config update', () => {
      manifestGenerator.updateConfig({
        name: 'Updated Name',
        shortName: 'Updated',
      });

      const manifest = manifestGenerator.generateManifest();
      expect(manifest.name).toBe('Updated Name');
      expect(manifest.short_name).toBe('Updated');
    });
  });

  describe('Localization', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate English localized manifest', () => {
      const localizedManifest = manifestGenerator.generateLocalizedManifest('en');
      
      expect(localizedManifest.name).toBe('A-Cube E-Receipt');
      expect(localizedManifest.description).toBe('Electronic receipt management for Italian tax system');
      expect(localizedManifest.lang).toBe('en');
      
      expect(localizedManifest.shortcuts).toBeDefined();
      const newReceiptShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/new');
      expect(newReceiptShortcut!.name).toBe('New Receipt');
      expect(newReceiptShortcut!.description).toBe('Create a new electronic receipt');
      
      const dashboardShortcut = localizedManifest.shortcuts!.find(s => s.url === '/dashboard');
      expect(dashboardShortcut!.name).toBe('Dashboard');
      expect(dashboardShortcut!.description).toBe('View control panel');
      
      const historyShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/history');
      expect(historyShortcut!.name).toBe('History');
      expect(historyShortcut!.description).toBe('Browse receipt history');
      
      const settingsShortcut = localizedManifest.shortcuts!.find(s => s.url === '/settings');
      expect(settingsShortcut!.name).toBe('Settings');
      expect(settingsShortcut!.description).toBe('Manage application settings');
    });

    it('should generate German localized manifest', () => {
      const localizedManifest = manifestGenerator.generateLocalizedManifest('de');
      
      expect(localizedManifest.name).toBe('A-Cube E-Receipt');
      expect(localizedManifest.description).toBe('Elektronische Belegverwaltung für das italienische Steuersystem');
      expect(localizedManifest.lang).toBe('de');
      
      expect(localizedManifest.shortcuts).toBeDefined();
      const newReceiptShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/new');
      expect(newReceiptShortcut!.name).toBe('Neuer Beleg');
      expect(newReceiptShortcut!.description).toBe('Erstelle einen neuen elektronischen Beleg');
      
      const dashboardShortcut = localizedManifest.shortcuts!.find(s => s.url === '/dashboard');
      expect(dashboardShortcut!.name).toBe('Dashboard');
      expect(dashboardShortcut!.description).toBe('Kontrollpanel anzeigen');
      
      const historyShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/history');
      expect(historyShortcut!.name).toBe('Verlauf');
      expect(historyShortcut!.description).toBe('Belegverlauf durchsuchen');
      
      const settingsShortcut = localizedManifest.shortcuts!.find(s => s.url === '/settings');
      expect(settingsShortcut!.name).toBe('Einstellungen');
      expect(settingsShortcut!.description).toBe('Anwendungseinstellungen verwalten');
    });

    it('should generate French localized manifest', () => {
      const localizedManifest = manifestGenerator.generateLocalizedManifest('fr');
      
      expect(localizedManifest.name).toBe('A-Cube E-Receipt');
      expect(localizedManifest.description).toBe('Gestion des reçus électroniques pour le système fiscal italien');
      expect(localizedManifest.lang).toBe('fr');
      
      expect(localizedManifest.shortcuts).toBeDefined();
      const newReceiptShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/new');
      expect(newReceiptShortcut!.name).toBe('Nouveau Reçu');
      expect(newReceiptShortcut!.description).toBe('Créer un nouveau reçu électronique');
      
      const historyShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/history');
      expect(historyShortcut!.name).toBe('Historique');
      expect(historyShortcut!.description).toBe('Consulter l\'historique des reçus');
      
      const settingsShortcut = localizedManifest.shortcuts!.find(s => s.url === '/settings');
      expect(settingsShortcut!.name).toBe('Paramètres');
      expect(settingsShortcut!.description).toBe('Gérer les paramètres de l\'application');
    });

    it('should fallback to default locale for unsupported languages', () => {
      const localizedManifest = manifestGenerator.generateLocalizedManifest('unsupported');
      
      // Should use default Italian content
      expect(localizedManifest.description).toBe('Gestione scontrini elettronici per il sistema fiscale italiano');
      expect(localizedManifest.lang).toBe('it');
      
      const newReceiptShortcut = localizedManifest.shortcuts!.find(s => s.url === '/receipts/new');
      expect(newReceiptShortcut!.name).toBe('Nuovo Scontrino');
    });
  });

  describe('Manifest Validation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should validate a valid manifest as valid', () => {
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should validate manifest with missing name as invalid', () => {
      manifestGenerator.updateConfig({ name: '' });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Manifest name is required');
    });

    it('should validate manifest with missing short_name as invalid', () => {
      manifestGenerator.updateConfig({ shortName: '' });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Manifest short_name is required');
    });

    it('should validate manifest with missing start_url as invalid', () => {
      manifestGenerator.updateConfig({ startUrl: '' });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Manifest start_url is required');
    });

    it('should validate manifest with no icons as invalid', () => {
      manifestGenerator.updateConfig({ icons: [] });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one icon is required');
    });

    it('should validate manifest without required icon sizes', () => {
      manifestGenerator.updateConfig({
        icons: [
          {
            src: '/icon-48x48.png',
            sizes: '48x48',
            type: 'image/png',
          },
        ],
      });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Icons with sizes 192x192 and 512x512 are recommended');
    });

    it('should validate manifest with invalid display mode', () => {
      manifestGenerator.updateConfig({ display: 'invalid' as any });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid display mode: invalid');
    });

    it('should validate manifest with proper required icon sizes as valid', () => {
      manifestGenerator.updateConfig({
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should accumulate multiple validation errors', () => {
      manifestGenerator.updateConfig({
        name: '',
        shortName: '',
        startUrl: '',
        icons: [],
        display: 'invalid' as any,
      });
      
      const validation = manifestGenerator.validateManifest();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(3);
      expect(validation.errors).toContain('Manifest name is required');
      expect(validation.errors).toContain('Manifest short_name is required');
      expect(validation.errors).toContain('Manifest start_url is required');
      expect(validation.errors).toContain('At least one icon is required');
      expect(validation.errors).toContain('Invalid display mode: invalid');
    });
  });

  describe('Complete PWA Files Generation', () => {
    beforeEach(() => {
      manifestGenerator = new ManifestGenerator();
    });

    it('should generate complete PWA setup files', () => {
      const pwaFiles = manifestGenerator.generatePWAFiles();
      
      expect(pwaFiles.manifest).toBeDefined();
      expect(typeof pwaFiles.manifest).toBe('string');
      expect(() => JSON.parse(pwaFiles.manifest)).not.toThrow();
      
      expect(pwaFiles.html).toBeDefined();
      expect(typeof pwaFiles.html).toBe('string');
      expect(pwaFiles.html).toContain('<meta');
      expect(pwaFiles.html).toContain('<link');
      
      expect(pwaFiles.serviceWorkerScript).toBeDefined();
      expect(typeof pwaFiles.serviceWorkerScript).toBe('string');
      expect(pwaFiles.serviceWorkerScript).toContain('<script>');
      expect(pwaFiles.serviceWorkerScript).toContain('serviceWorker');
      
      expect(pwaFiles.validation).toBeDefined();
      expect(typeof pwaFiles.validation.isValid).toBe('boolean');
      expect(Array.isArray(pwaFiles.validation.errors)).toBe(true);
    });

    it('should generate consistent data across all file types', () => {
      const customConfig: PWAManifestConfig = {
        name: 'Test PWA App',
        shortName: 'TestApp',
        themeColor: '#00bcd4',
      };

      manifestGenerator = new ManifestGenerator(customConfig);
      const pwaFiles = manifestGenerator.generatePWAFiles();
      
      const manifest = JSON.parse(pwaFiles.manifest);
      expect(manifest.name).toBe('Test PWA App');
      expect(manifest.short_name).toBe('TestApp');
      expect(manifest.theme_color).toBe('#00bcd4');
      
      expect(pwaFiles.html).toContain('content="Test PWA App"');
      expect(pwaFiles.html).toContain('content="TestApp"');
      expect(pwaFiles.html).toContain('content="#00bcd4"');
      
      expect(pwaFiles.validation.isValid).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined configuration gracefully', () => {
      expect(() => {
        manifestGenerator = new ManifestGenerator(undefined as any);
      }).not.toThrow();
      
      expect(() => {
        manifestGenerator = new ManifestGenerator(null as any);
      }).not.toThrow();
    });

    it('should handle invalid icon configurations gracefully', () => {
      const invalidConfig: PWAManifestConfig = {
        icons: [
          {
            src: '',
            sizes: '',
            type: '',
          } as any,
        ],
      };

      manifestGenerator = new ManifestGenerator(invalidConfig);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.icons).toEqual([
        {
          src: '',
          sizes: '',
          type: 'image/png', // Should default type
        },
      ]);
    });

    it('should handle icons without optional purpose field', () => {
      const config: PWAManifestConfig = {
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
            type: 'image/png',
            // purpose field omitted
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(config);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.icons[0]).toEqual({
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        // purpose should not be included when undefined
      });
      if (manifest.icons[0]) {
        expect(manifest.icons[0].purpose).toBeUndefined();
      }
    });

    it('should handle shortcuts without optional fields gracefully', () => {
      const config: PWAManifestConfig = {
        shortcuts: [
          {
            name: 'Test Shortcut',
            url: '/test',
            // description and icons omitted
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(config);
      const manifest = manifestGenerator.generateManifest();
      
      expect(manifest.shortcuts![0]).toEqual({
        name: 'Test Shortcut',
        url: '/test',
      });
      // description and icons should not be included
      if (manifest.shortcuts![0]) {
        expect(manifest.shortcuts![0].description).toBeUndefined();
        expect(manifest.shortcuts![0].icons).toBeUndefined();
      }
    });

    it('should handle empty arrays for optional properties', () => {
      const config: PWAManifestConfig = {
        screenshots: [],
        shortcuts: [],
      };

      manifestGenerator = new ManifestGenerator(config);
      const manifest = manifestGenerator.generateManifest();
      
      expect('screenshots' in manifest).toBe(false);
      expect('shortcuts' in manifest).toBe(false);
    });

    it('should preserve custom properties in nested objects', () => {
      const config: PWAManifestConfig = {
        shortcuts: [
          {
            name: 'Test',
            url: '/test',
            description: 'Test description',
            icons: [
              {
                src: '/test-icon.png',
                sizes: '96x96',
                // type omitted - should not be added
              },
            ],
          },
        ],
      };

      manifestGenerator = new ManifestGenerator(config);
      const manifest = manifestGenerator.generateManifest();

      if (manifest.shortcuts && manifest.shortcuts[0]) {
        expect(manifest.shortcuts![0].icons![0]).toEqual({
          src: '/test-icon.png',
          sizes: '96x96',
        });
        if (manifest.shortcuts![0].icons![0]) {
          expect(manifest.shortcuts![0].icons![0].type).toBeUndefined();
        }
      }
    });
  });
});