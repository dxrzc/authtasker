import type { Config } from 'jest';

const config: Config = {
    rootDir: "../", // unit folder    
    clearMocks: true,
    restoreMocks: true,
    resetMocks: true,
    collectCoverage: true,
    coverageDirectory: "<rootDir>/../../coverage/unit",
    coverageProvider: "v8",    
    moduleNameMapper: {
        "^@root/(.*)$": "<rootDir>/../../src/$1"
    },
    preset: 'ts-jest',
    // test files
    roots: ["<rootDir>/tests"],
    testEnvironment: "jest-environment-node",
};

export default config;
