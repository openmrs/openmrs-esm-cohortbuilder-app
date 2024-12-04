module.exports = {
  clearMocks: true,
  transform: {
    "^.+\\.tsx?$": "@swc/jest",
  },
  transformIgnorePatterns: ["/node_modules/(?!@openmrs)"],
  moduleNameMapper: {
    "\\.(s?css)$": "identity-obj-proxy",
    "@openmrs/esm-framework": "@openmrs/esm-framework/mock",
    "^dexie$": require.resolve("dexie"),
    "^lodash-es/(.*)$": "lodash/$1",
    "^lodash-es$": "lodash",
    "^uuid$": "<rootDir>/node_modules/uuid/dist/index.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setup-tests.ts"],
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
  testPathIgnorePatterns: ["<rootDir>/e2e"],
};
