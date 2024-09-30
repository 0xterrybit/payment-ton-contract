import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    testMatch: ['<rootDir>/tests/**/payment_with_dex.spec.ts'],
    testTimeout: 100000,
    detectOpenHandles: false // 忽略打开句柄错误
};

export default config;
