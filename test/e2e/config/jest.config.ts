import type { Config } from 'jest';

const config: Config = {
    rootDir: process.cwd(), // workidr

    // setup
    setupFilesAfterEnv: ['<rootDir>/test/e2e/config/setup/setupAfterEnv.ts'],
    globalSetup: '<rootDir>/test/e2e/config/setup/global-setup.ts',
    globalTeardown: '<rootDir>/test/e2e/config/setup/global-teardown.ts',

    // coverage
    collectCoverage: false,
    coverageProvider: 'v8',
    coverageDirectory: '<rootDir>/coverage/e2e',
    collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/test/e2e/**'],

    // aliases
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@e2e/(.*)$': '<rootDir>/test/e2e/$1',
    },

    // test files
    roots: ['<rootDir>/test/e2e/tests'],

    preset: 'ts-jest',
    testEnvironment: 'jest-environment-node',
    testTimeout: 15000,
};

export default config;
