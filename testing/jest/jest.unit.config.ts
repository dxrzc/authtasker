import type { Config } from 'jest';
import { baseJestConfig } from './jest.base.config';

const config: Config = {
    ...baseJestConfig,
    maxWorkers: '50%',

    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage/unit',
    coverageProvider: 'v8',

    roots: ['<rootDir>/testing/suites/unit/specs'],

    moduleNameMapper: {
        ...baseJestConfig.moduleNameMapper,
        '^@unit/(.*)$': '<rootDir>/testing/suites/unit/$1',
    },
};

export default config;
