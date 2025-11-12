const mongoose = require('mongoose');

module.exports = async function connectDB() {
  const uri =
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    'mongodb://localhost:27017/marketing-planner';
  // Reuse existing connection in serverless environments to avoid
  // creating new connections on every invocation (Vercel, Lambda, etc.).
  if (mongoose.connection && mongoose.connection.readyState) {
    console.log('Using existing MongoDB connection');
    return mongoose.connection;
  }

  const opts = {
    maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    minPoolSize: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  };

  const conn = await mongoose.connect(uri, opts);
  console.log('Connected to MongoDB');
  return conn;
};
