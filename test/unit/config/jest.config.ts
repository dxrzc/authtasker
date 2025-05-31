import type { Config } from 'jest';

const config: Config = {
    rootDir: process.cwd(), // workidr

    // mocks
    resetMocks: false,
    clearMocks: true,
    restoreMocks: true,

    // coverage
    collectCoverage: true,
    collectCoverageFrom: ['!<rootDir>/test/unit/**'],
    coverageDirectory: '<rootDir>/coverage/unit',
    coverageProvider: 'v8',

    // test files
    roots: ['<rootDir>/test/unit/tests'],

    // alias
    moduleNameMapper: {
        '^@root/(.*)$': '<rootDir>/src/$1'
    },

    preset: 'ts-jest',
    testEnvironment: 'jest-environment-node',
};

export default config;
