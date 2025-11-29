require('dotenv').config();
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

// Global variable to track connection state
let isConnecting = false;
let connectionPromise = null;

const connectDB = async function () {
  // If already connected, return the connection
  if (mongoose.connection.readyState === 1) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  // If connection is in progress, return the existing promise
  if (isConnecting && connectionPromise) {
    console.log('🔄 Connection already in progress, waiting...');
    return connectionPromise;
  }

  const uri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/marketing-planner';

  const opts = {
    maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX || '5', 10), // Reduced for serverless
    minPoolSize: parseInt(process.env.DATABASE_POOL_MIN || '1', 10),
    serverSelectionTimeoutMS: 5000, // Reduced from 30s to 5s
    socketTimeoutMS: 30000,
    bufferCommands: true, // Keep this true for serverless
    bufferMaxEntries: 0, // Important for serverless
  };

  console.log('🔄 Connecting to MongoDB...');
  isConnecting = true;

  connectionPromise = mongoose
    .connect(uri, opts)
    .then((conn) => {
      console.log('✅ Connected to MongoDB successfully');
      isConnecting = false;
      return conn;
    })
    .catch((err) => {
      console.error('❌ MongoDB connection failed:', err);
      isConnecting = false;
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
};

// Enhanced connection handling with retries
const connectDBWithRetry = async (retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      return;
    } catch (err) {
      console.error(`Connection attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw err;
      }
    }
  }
};

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

// Vercel serverless handler
if (process.env.VERCEL || require.main !== module) {
  // For serverless, we need to ensure connection before handling requests
  let isDBReady = false;

  // Pre-warm the connection
  connectDBWithRetry()
    .then(() => {
      isDBReady = true;
      console.log('🚀 Database ready for serverless functions');
    })
    .catch((err) => {
      console.error('🔥 Database connection failed:', err);
    });

  // Export the app with connection middleware
  module.exports = async (req, res) => {
    // If DB isn't ready, wait for connection (with timeout)
    if (!isDBReady) {
      try {
        await Promise.race([
          connectDBWithRetry(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DB connection timeout')), 8000)
          ),
        ]);
        isDBReady = true;
      } catch (err) {
        console.error('Database connection failed during request:', err);
        return res.status(500).json({
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Service temporarily unavailable',
          },
        });
      }
    }

    return app(req, res);
  };
} else {
  start();
}
