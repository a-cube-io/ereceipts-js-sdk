import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI build with shebang
  {
    entry: {
      cli: 'src/cli.ts',
    },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: true,
    splitting: false,
    dts: true,
    sourcemap: true,
    minify: false,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
    external: [
      'keytar', // Native dependency
      'react-native',
      '@react-native-async-storage/async-storage',
      'react-native-device-info',
    ],
    esbuildOptions(options) {
      options.platform = 'node';
    },
  },
  // Main SDK build without shebang
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    target: 'node18',
    outDir: 'dist',
    clean: false,
    splitting: false,
    dts: true,
    sourcemap: true,
    minify: false,
    shims: true,
    external: [
      'keytar', // Native dependency
      'react-native',
      '@react-native-async-storage/async-storage',
      'react-native-device-info',
    ],
    esbuildOptions(options) {
      options.platform = 'node';
    },
  },
]);