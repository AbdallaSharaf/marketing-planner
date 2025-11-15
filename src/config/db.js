const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    const uri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/marketing-planner';

    // Reuse existing connection
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Using existing MongoDB connection');
      return mongoose.connection;
    }

    const opts = {
      maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
      minPoolSize: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      serverSelectionTimeoutMS: 30000, // Increase to 30 seconds
      socketTimeoutMS: 45000, // Increase socket timeout
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering
    };

    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(uri, opts);
    console.log('✅ Connected to MongoDB successfully');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error; // Re-throw to handle in the calling code
  }
};
