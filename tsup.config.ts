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
  external: [
    'react',
    'react-native',
    'react-dom',
    '@react-native-async-storage/async-storage',
    'react-native-keychain',
    '@react-native-community/netinfo'
  ],
  
  // Bundle axios as it's a direct dependency
  noExternal: ['axios'],
  
  // Target environment
  target: 'es2020',
  
  // Tree shaking
  treeshake: true,
  
  // Keep names for better debugging
  keepNames: true,
  
  // Skip node_modules bundling (except noExternal)
  bundle: true,
  
  // Platform specific options
  platform: 'neutral',
  
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
  },
  
  // Output filename customization
  outExtension: ({ format }) => ({
    js: format === 'esm' ? '.js' : '.cjs',
    dts: format === 'esm' ? '.d.ts' : '.d.cts'
  }),
  
  // Shims for Node.js globals in browser
  shims: true,
  
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
    'process.env.SDK_NAME': JSON.stringify('@acube/e-receipt')
  }
});