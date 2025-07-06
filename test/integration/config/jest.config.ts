import type { Config } from 'jest';

const config: Config = {
    rootDir: process.cwd(), // workidr
    
    // setup
    setupFilesAfterEnv: ["<rootDir>/test/integration/config/setup/setupAfterEnv.ts"],
    
    // coverage
    collectCoverage: true,
    collectCoverageFrom: [
        '<rootDir>/src/**/*.ts',
        '!<rootDir>/test/integration/**'
    ],
    coverageDirectory: "<rootDir>/coverage/integration",
    coverageProvider: "v8",
    
    // test files
    roots: ["<rootDir>/test/integration/tests"],
    
    // aliases
    moduleNameMapper: {
        "^@root/(.*)$": "<rootDir>/src/$1",
        "^@logic/(.*)$": "<rootDir>/src/common/logic/$1",
        "^@integration/(.*)$": "<rootDir>/test/integration/$1",
        "^ioredis$": "ioredis-mock",
        "^nodemailer$": "<rootDir>/test/integration/config/setup/mocks/nodemailer.ts"
    },
    
    preset: "ts-jest",
    testEnvironment: "jest-environment-node",    
    
    maxWorkers: '50%',
};

export default config;
