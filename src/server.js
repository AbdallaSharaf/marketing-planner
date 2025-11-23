require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;


const connectDB = async function connectDB() {
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
      // Remove bufferCommands: false - let mongoose buffer commands
    };

    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(uri, opts);
    console.log('✅ Connected to MongoDB successfully');
    return conn;
};


// When running on Vercel (serverless) we should export the Express app
// as the handler instead of starting a long-lived listener. When run
// locally (node src/server.js or npm run dev) we connect the DB and
// start the server as usual.
function start() {
  try {
    connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

// If Vercel sets the VERCEL env var (or if this file is required as a
// module) export the app for the serverless platform. Otherwise start
// a local server (development / production container).
if (process.env.VERCEL || require.main !== module) {
  // Ensure DB is connected for serverless invocations. connectDB is
  // idempotent and will reuse an existing connection if present.
  connectDB().catch((err) => console.error('DB connection error:', err));
  module.exports = app;
} else {
  start();
}
