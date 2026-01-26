import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import alias from '@rollup/plugin-alias';
import dts from 'rollup-plugin-dts';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const aliasEntries = {
  entries: [
    { find: '@', replacement: path.resolve(__dirname, 'src') }
  ]
};

const external = [
    'axios',
    'react-native',
    '@react-native-async-storage/async-storage',
    '@react-native-community/netinfo',
    'expo-secure-store',
    'expo-sqlite',
    'react-native-keychain',
    'react-native-sqlite-storage',
    'zod',
    '@a-cube-io/expo-mutual-tls',
    'expo-network'
];

const nodeExternals = [
    'https',
    'fs',
    'fs/promises'
];

const createBaseConfig = (includeNodeExternals = true) => ({
    input: 'src/index.ts',
    external: id => {
        const allExternals = includeNodeExternals ? [...external, ...nodeExternals] : external;
        return allExternals.some(dep => id.startsWith(dep));
    },
    plugins: [
        alias(aliasEntries),
        json(),
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
    ],
});

export default [
    {
        ...createBaseConfig(true),
        output: {
            file: 'dist/index.esm.js',
            format: 'es',
            sourcemap: true,
            inlineDynamicImports: true,
        },
        plugins: [
            ...createBaseConfig(true).plugins,
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
            }),
        ],
    },
    {
        ...createBaseConfig(true),
        output: {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
            inlineDynamicImports: true,
        },
        plugins: [
            ...createBaseConfig(true).plugins,
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
            }),
        ],
    },
    {
        ...createBaseConfig(false),
        output: {
            file: 'dist/index.native.js',
            format: 'es',
            sourcemap: true,
            inlineDynamicImports: true,
        },
        plugins: [
            replace({
                preventAssignment: true,
                delimiters: ['', ''],
                values: {
                    "require('../../platforms/node/mtls')": "({ NodeMTLSAdapter: null })",
                    "require('node:https')": "null",
                    "require('node:fs/promises')": "null",
                    "require('node:fs')": "({ existsSync: () => false })",
                }
            }),
            ...createBaseConfig(false).plugins,
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
            }),
        ],
    },
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.d.ts',
            format: 'es',
        },
        external: [...external, ...nodeExternals],
        plugins: [
            alias(aliasEntries),
            dts(),
        ],
    },
];
