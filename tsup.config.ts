import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
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
  ],
  esbuildOptions(options) {
    options.platform = 'node';
  },
});