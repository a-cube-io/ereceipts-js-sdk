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
  // Main SDK build for Node.js
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
  // React Native build
  {
    entry: {
      'index.react-native': 'src/index.react-native.ts',
    },
    format: ['esm'],
    target: 'es2020',
    outDir: 'dist',
    clean: false,
    splitting: false,
    dts: true,
    sourcemap: true,
    minify: false,
    shims: false,
    external: [
      'react',
      'react-native',
      '@react-native-async-storage/async-storage',
      '@react-native-community/netinfo',
      'react-native-device-info',
      'react-native-keychain',
      'react-native-performance',
      'react-native-background-task',
      // Exclude Node.js specific dependencies
      'fs',
      'path',
      'os',
      'child_process',
      'crypto',
      'http',
      'https',
      'net',
      'tls',
      'url',
      'stream',
      'buffer',
      'keytar',
      'boxen',
      'chalk',
      'cli-table3',
      'commander',
      'conf',
      'dotenv',
      'execa',
      'express',
      'fs-extra',
      'globby',
      'inquirer',
      'ngrok',
      'open',
      'ora',
      'update-notifier',
      'ws',
    ],
    esbuildOptions(options) {
      options.platform = 'neutral';
      options.mainFields = ['react-native', 'browser', 'module', 'main'];
      options.resolveExtensions = ['.native.tsx', '.native.ts', '.native.jsx', '.native.js', '.tsx', '.ts', '.jsx', '.js', '.json'];
    },
  },
]);