import type { Config } from 'jest';

const config: Config = {
    rootDir: "./../", // root    
    collectCoverage: true,
    coverageDirectory: "./coverage/integration",
    coverageProvider: "v8",
    moduleNameMapper: {
        "^@root/(.*)$": "<rootDir>/src/$1",  
        "^@integration/(.*)$": "<rootDir>/test/integration/$1",  
        "^ioredis$": "ioredis-mock",      
        "^nodemailer$": "<rootDir>/test/integration/config/setup/__mocks__/nodemailer.ts"
    },
    setupFilesAfterEnv: ["<rootDir>/test/integration/config/setup/setupAfterEnv.ts"],
    preset: "ts-jest",
    // test files
    roots: ["<rootDir>/test/integration/tests/temp"],
    testEnvironment: "jest-environment-node",    
};

export default config;
