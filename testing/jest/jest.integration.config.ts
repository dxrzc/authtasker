import type { Config } from 'jest';
import { baseJestConfig } from './jest.base.config';

const integrationSuitePath = '<rootDir>/testing/suites/integration';

const config: Config = {
    ...baseJestConfig,
    maxWorkers: 3,

    setupFilesAfterEnv: [
        `${integrationSuitePath}/setup/after-env/set-environment.ts`,
        `${integrationSuitePath}/setup/after-env/set-databases.ts`,
        `${integrationSuitePath}/setup/after-env/set-app.ts`,
        `${integrationSuitePath}/setup/after-env/set-agent.ts`,
    ],

    collectCoverage: true,
    collectCoverageFrom: ['<rootDir>/src/**/*.ts', `!${integrationSuitePath}/**`],
    coverageDirectory: '<rootDir>/coverage/integration',
    coverageProvider: 'v8',

    roots: [`${integrationSuitePath}/specs`],

    moduleNameMapper: {
        ...baseJestConfig.moduleNameMapper,
        '^@integration/(.*)$': `${integrationSuitePath}/$1`,
        '^ioredis$': 'ioredis-mock',
        '^nodemailer$': `${integrationSuitePath}/mocks/nodemailer.mock.ts`,
    },

    restoreMocks: true,
};

export default config;
