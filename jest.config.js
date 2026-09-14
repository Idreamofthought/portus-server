export default {
  testEnvironment: "node",
  testMatch: ["**/test/integration/**/*.spec.js"],
  testTimeout: 15000,
  maxWorkers: 1,
  globalSetup: "<rootDir>/test/integration/global-setup.js",
  globalTeardown: "<rootDir>/test/integration/global-teardown.js"
};
