import type { Config } from 'jest';
import { baseJestConfig } from './jest.config';

const config: Config = {
    ...baseJestConfig,
    maxWorkers: '50%',

    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage/unit',
    coverageProvider: 'v8',

    roots: ['<rootDir>/test/unit'],

    moduleNameMapper: {
        ...baseJestConfig.moduleNameMapper,
        '^@unit/(.*)$': '<rootDir>/test/unit/$1',
    },
};

export default config;
