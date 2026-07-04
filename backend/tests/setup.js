const { connectTestDb, closeTestDb, clearTestDb } = require('../src/config/testDb');

// Increase default timeout to 30s to allow mongodb-memory-server binary downloads/startup if needed
jest.setTimeout(30000);

beforeAll(async () => {
  await connectTestDb();
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await closeTestDb();
});
