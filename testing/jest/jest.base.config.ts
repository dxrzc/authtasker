import { Config } from 'jest';

// BASE CONFIG USED BY ALL JEST CONFIGS

export const baseJestConfig: Config = {
    testEnvironment: 'jest-environment-node',
    rootDir: process.cwd(), // workidr
    preset: 'ts-jest',
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@test/tools/(.*)$': '<rootDir>/testing/tools/$1',
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/testing/tsconfig.json',
            },
        ],
    },
};
