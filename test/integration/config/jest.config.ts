import type { Config } from 'jest';

const config: Config = {
    rootDir: "../",  // integration folder
    collectCoverage: true,
    coverageDirectory: "<rootDir>/../../coverage/integration",
    coverageProvider: "v8",
    moduleNameMapper: {
        "^@root/(.*)$": "<rootDir>/../../src/$1",  
        "^@integration/(.*)$": "<rootDir>/$1",  
        "^ioredis$": "ioredis-mock",      
        "^nodemailer$": "<rootDir>/config/setup/mocks/nodemailer.ts"
    },
    setupFilesAfterEnv: ["<rootDir>/config/setup/setupAfterEnv.ts"],
    preset: "ts-jest",
    roots: ["<rootDir>/tests"],
    testEnvironment: "jest-environment-node",    
};

export default config;
