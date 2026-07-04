const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('../utils/logger');

let mongoServer;

/**
 * Connects to a dynamically instantiated in-memory MongoDB server.
 * This guarantees that tests run in total isolation and never touch real Atlas data.
 */
const connectTestDb = async () => {
  // Prevent double-initialization
  if (mongoServer) return;

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Establish mongoose connection to the isolated memory instance
  await mongoose.connect(uri);
  logger.info('🔌 Connected successfully to in-memory test database.');
};

/**
 * Disconnects mongoose and tears down the in-memory MongoDB instance.
 */
const closeTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
  logger.info('🔌 Disconnected and stopped in-memory test database.');
};

/**
 * Wipes all documents from all collections to preserve isolation across test suites.
 */
const clearTestDb = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  connectTestDb,
  closeTestDb,
  clearTestDb
};
