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
    'expo-sqlite',
    'react-native-keychain',
    'react-native-sqlite-storage',
    'zod',
    '@a-cube-io/expo-mutual-tls'
];

// Node.js specific externals (only for Node.js/web builds, not React Native)
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
        json(),
        resolve({
            browser: true,
            preferBuiltins: false,
        }),
        commonjs(),
    ],
});

export default [
    // Browser ESM build (includes Node.js externals)
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
    // CommonJS build for Node.js (includes Node.js externals)
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
    // React Native specific build (excludes Node.js externals)
    {
        ...createBaseConfig(false),
        output: {
            file: 'dist/index.native.js',
            format: 'es',
            sourcemap: true,
            inlineDynamicImports: true,
        },
        plugins: [
            ...createBaseConfig(false).plugins,
            typescript({
                tsconfig: './tsconfig.json',
                declaration: false,
            }),
        ],
    },
    // React components ESM build (includes Node.js externals)
    {
        ...createBaseConfig(true),
        input: 'src/react/index.ts',
        external: id => {
            const allExternals = [...external, ...nodeExternals, './index', '../index'];
            return allExternals.some(dep => id.startsWith(dep));
        },
        output: {
            file: 'dist/react.esm.js',
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
    // React components CJS build (includes Node.js externals)
    {
        ...createBaseConfig(true),
        input: 'src/react/index.ts',
        external: id => {
            const allExternals = [...external, ...nodeExternals, './index', '../index'];
            return allExternals.some(dep => id.startsWith(dep));
        },
        output: {
            file: 'dist/react.cjs.js',
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
    // TypeScript declarations
    {
        input: 'src/index.ts',
        output: {
            file: 'dist/index.d.ts',
            format: 'es',
        },
        external: [...external, ...nodeExternals],
        plugins: [dts()],
    },
    // React TypeScript declarations
    {
        input: 'src/react/index.ts',
        output: {
            file: 'dist/react.d.ts',
            format: 'es',
        },
        external: [...external, ...nodeExternals, './index', '../index'],
        plugins: [dts()],
    },
];