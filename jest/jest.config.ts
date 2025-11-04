import { Config } from 'jest';

// BASE CONFIG USED BY ALL JEST CONFIGS

export const baseJestConfig: Config = {
    testEnvironment: 'jest-environment-node',
    rootDir: process.cwd(), // workidr
    preset: 'ts-jest',
    moduleNameMapper: {
        '^src/(.*)$': '<rootDir>/src/$1',
        '^@tests-utils/(.*)$': '<rootDir>/test/common-tests-utils/$1',
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/test/tsconfig.json',
            },
        ],
    },
};
