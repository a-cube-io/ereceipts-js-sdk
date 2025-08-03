import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const external = [
  'axios', 
  'react', 
  'react-native',
  '@react-native-async-storage/async-storage',
  '@react-native-community/netinfo',
  'expo-secure-store',
  'react-native-keychain'
];

const baseConfig = {
  input: 'src/index.ts',
  external: id => external.some(dep => id.startsWith(dep)),
  plugins: [
    json(),
    resolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
};

export default [
  // Browser ESM build
  {
    ...baseConfig,
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // CommonJS build for Node/React Native
  {
    ...baseConfig,
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      inlineDynamicImports: true,
    },
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // React Native specific build
  {
    ...baseConfig,
    output: {
      file: 'dist/index.native.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // React components ESM build
  {
    ...baseConfig,
    input: 'src/react/index.ts',
    external: [...external, './index', '../index'],
    output: {
      file: 'dist/react.esm.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // React components CJS build
  {
    ...baseConfig,
    input: 'src/react/index.ts',
    external: [...external, './index', '../index'],
    output: {
      file: 'dist/react.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      inlineDynamicImports: true,
    },
    plugins: [
      ...baseConfig.plugins,
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
      }),
    ],
  },
  // TypeScript declarations
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    external,
    plugins: [dts()],
  },
  // React TypeScript declarations
  {
    input: 'src/react/index.ts',
    output: {
      file: 'dist/react.d.ts',
      format: 'es',
    },
    external: [...external, './index', '../index'],
    plugins: [dts()],
  },
];