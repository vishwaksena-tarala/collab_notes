const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the MONGO_URI from environment variables.
 * Exits the process if the connection fails.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.log('🔄 Attempting to start in-memory MongoDB for local development...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();

      const conn = await mongoose.connect(mongoUri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
    } catch (memError) {
      console.error(`❌ In-Memory DB failed: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
