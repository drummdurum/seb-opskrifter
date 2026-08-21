process.env.NODE_ENV = 'test';
process.env.PORT = '8081';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/opskrifter_e2e_test';
process.env.SESSION_SECRET = 'e2e-test-session-secret';
process.env.APP_BASE_URL = 'http://localhost:8081';

const mongoose = require('mongoose');
const app = require('../server');

async function start() {
  await app.locals.mongoConnectionPromise;
  await mongoose.connection.dropDatabase();

  const server = app.listen(8081, () => {
    console.log('E2E server running on http://localhost:8081');
  });

  async function shutdown() {
    server.close(async () => {
      await app.locals.sessionStore.close();
      await mongoose.disconnect();
      process.exit(0);
    });
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
