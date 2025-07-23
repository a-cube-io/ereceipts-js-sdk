import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry point
  entry: ['src/index.ts'],
  
  // Output formats
  format: ['esm', 'cjs'],
  
  // Output directory
  outDir: 'dist',
  
  // Code splitting
  splitting: true,
  
  // Source maps
  sourcemap: true,
  
  // Clean output directory
  clean: true,
  
  // Generate declaration files
  dts: true,
  
  // Minification (disabled for better debugging)
  minify: false,
  
  // External dependencies (not bundled)
  // Keep axios external for React Native compatibility 
  // (axios includes Node.js modules that aren't available in RN/Expo)
  external: [
    'react',
    'react-native',
    'react-dom',
    '@react-native-async-storage/async-storage',
    'react-native-keychain',
    '@react-native-community/netinfo',
    'axios' // Keep axios external to avoid Node.js module bundling
  ],
  
  // Target environment
  target: 'es2020',
  
  // Tree shaking
  treeshake: true,
  
  // Keep names for better debugging
  keepNames: true,
  
  // Skip node_modules bundling (except noExternal)
  bundle: true,
  
  // Platform specific options - use browser to avoid Node.js modules
  platform: 'browser',
  
  // Banner for generated files
  banner: {
    js: '/* A-Cube SDK - Professional TypeScript SDK for Italian e-receipt system */',
  },
  
  // TypeScript config
  tsconfig: './tsconfig.json',
  
  // ESBuild options
  esbuildOptions: (options) => {
    // Ensure proper JSX handling
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
    
    // React Native specific options
    options.define = {
      ...options.define,
      '__DEV__': '"development"',
      'global': 'globalThis'
    };
    
    // Resolve extensions
    options.resolveExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    
    // React Native/Expo compatibility: prevent Node.js module resolution
    options.conditions = ['react-native', 'browser', 'module', 'import'];
  },
  
  // Output filename customization
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.js' : '.cjs',
    dts: format === 'esm' ? '.d.ts' : '.d.cts'
  }),
  
  // No Node.js shims for React Native compatibility
  shims: false,
  
  // Skip type checking (rely on separate tsc command)
  skipNodeModulesBundle: true,
  
  // Watch mode options (for development)
  watch: process.env.NODE_ENV === 'development',
  
  // Metafile for bundle analysis
  metafile: true,
  
  // Entry names and chunking handled automatically by tsup
  
  // Define global constants
  define: {
    'process.env.SDK_VERSION': JSON.stringify('1.0.0'),
    'process.env.SDK_NAME': JSON.stringify('@a-cube-io/ereceipts-js-sdk')
  }
});