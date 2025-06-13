/**
 * @returns {Promise<import('jest').Config>}
 */
module.exports = {
  clearMocks: true,
  transform: {
    '^.+\\.m?[jt]sx?$': ['@swc/jest'],
  },
  transformIgnorePatterns: ['/node_modules/(?!@openmrs|.+\\.pnp\\.[^\\/]+$)'],
  moduleNameMapper: {
    '\\.(s?css)$': 'identity-obj-proxy',
    '@openmrs/esm-framework': '@openmrs/esm-framework/mock',
    '^dexie$': require.resolve('dexie'),
    '^lodash-es/(.*)$': 'lodash/$1',
    '^lodash-es$': 'lodash',
    '^uuid$': '<rootDir>/node_modules/uuid/dist/index.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tools/setup-tests.ts'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  testPathIgnorePatterns: ['<rootDir>/e2e'],
};
