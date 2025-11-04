import type { Config } from 'jest';
import { baseJestConfig } from './jest.base.config';

const integrationSuitePath = '<rootDir>/testing/suites/integration';

const config: Config = {
    ...baseJestConfig,
    maxWorkers: 3,
    
    setupFilesAfterEnv: [`${integrationSuitePath}/setup/setup-after-env.ts`],

    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.ts', `!${integrationSuitePath}/**`],
    coverageDirectory: '<rootDir>/coverage/integration',
    coverageProvider: 'v8',

    roots: [`${integrationSuitePath}/specs`],

    moduleNameMapper: {
        ...baseJestConfig.moduleNameMapper,
        '^@integration/(.*)$': `${integrationSuitePath}/$1`,
        '^ioredis$': 'ioredis-mock',
        '^nodemailer$': `${integrationSuitePath}/mocks/nodemailer.ts`,
    },
};

export default config;
