const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node scripts/start-e2e-server.js',
    url: 'http://localhost:8081/register',
    reuseExistingServer: false,
    timeout: 30_000
  }
});
