import type { Config } from 'jest';

const config: Config = {
    rootDir: process.cwd(), // workidr

    // setup
    setupFilesAfterEnv: ['<rootDir>/test/unit/config/setup/setupAfterEnv.ts'],

    // mocks    
    resetMocks: false,
    clearMocks: true,
    restoreMocks: true,

    // coverage
    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/test/unit/**'
    ],
    coverageDirectory: '<rootDir>/coverage/unit',
    coverageProvider: 'v8',

    // test files
    roots: ['<rootDir>/test/unit/tests'],

    // alias
    moduleNameMapper: {
        '^@root/(.*)$': '<rootDir>/src/$1',
        "^@unit/(.*)$": "<rootDir>/test/unit/$1",
        "^@logic/(.*)$": "<rootDir>/src/common/logic/$1",
    },

    preset: 'ts-jest',
    testEnvironment: 'jest-environment-node',

    maxWorkers: '50%',
};

export default config;
